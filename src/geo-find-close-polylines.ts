import * as turf from 'turf'
//import * as gfcp from './geo-find-close-polylines'
import Geo = require('./geo-find-close-polylines')


declare namespace GFCP {

    type LatLongPt = GeoJSON.Feature<GeoJSON.Point>
    type Path = GeoJSON.Feature<GeoJSON.LineString>
    // A bounding box (from turf.js) as an array in WSEN order (west, south, east, north)
    type IBoundingBox = Array<number>


    // TODO: convert this to a segment feature
    interface CloseSegment {
        segment_index: number
        distance_to_path: number
        pt_on_segment: LatLongPt
    }


    interface PathSegments {
        // segment index into path of start of this indexed section
        start: number
        // segment index into path of end of this indexed section
        end: number
    }


    interface SpatialIndexOnPath extends PathSegments {
        bbox: IBoundingBox
        // an index on the leading portion of this subpath
        // head and tail must be used together
        head?: SpatialIndexOnPath
        // an index on the trailing portion of this subpath
        tail?: SpatialIndexOnPath
    }

}




export const METERS_PER_DEGREE_AT_EQUATOR = 111111


export function radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI)
}


export function degreeToRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
}


export function metersToLatitudeDistance(meters: number, latitude: number) {
    let meters_per_degree = METERS_PER_DEGREE_AT_EQUATOR * Math.cos(degreeToRadians(latitude))
    return (meters / meters_per_degree)
}


export function metersToLongitudeDistance(meters: number) {
    return (meters / METERS_PER_DEGREE_AT_EQUATOR)
}


export function latitudeDistanceToMeters(latitude_distance: number, latitude: number) {
    let meters_per_degree = METERS_PER_DEGREE_AT_EQUATOR * Math.cos(degreeToRadians(latitude))
    return (meters_per_degree * latitude_distance)
}


export function longitudeDistanceToMeters(longitude_distance: number) {
    return (METERS_PER_DEGREE_AT_EQUATOR * longitude_distance)
}


function isIBoundingBox(obj: any) {
    return (Array.isArray(obj) && (obj.length === 4) && (typeof obj[0] === 'number'))
}


function isLatLongPt(obj: any) {
    return (((<GFCP.LatLongPt>obj).geometry) && ((<GFCP.LatLongPt>obj).geometry.type == 'Point'))
}


function isPosition(obj: any) {
    return (Array.isArray(obj) && (obj.length === 2) && (typeof obj[0] === 'number'))
}


function isArrayOfPositions(obj: any) {
    if (Array.isArray(obj) && Array.isArray(obj[0])) {
        var position: GeoJSON.Position = obj[0]
        return ((position.length === 2) && (typeof position[0] === 'number'))
    } else {
        return false
    }
}


// This uses simple math, and doesnt account for crossing the 180 longitude.
export class BoundingBox {
    bbox: GFCP.IBoundingBox
    constructor(obj: BoundingBox | GFCP.IBoundingBox | GFCP.LatLongPt | Position | GeoJSON.Position[], query_distance?: number) {
        var initFromIBoundingBox = (bbox: GFCP.IBoundingBox): void => {
            this.bbox = [].concat(bbox)
        }
        var initFromPosition = (position: GeoJSON.Position): void => {
            var lng = position[0]
            var lat = position[1]
            this.bbox = [lng, lat, lng, lat]
        }
        if (obj instanceof BoundingBox) {
            initFromIBoundingBox((<BoundingBox>obj).bbox)
        } else if (isIBoundingBox(obj)) {
            initFromIBoundingBox(<GFCP.IBoundingBox>obj)
        } else if (isLatLongPt(obj)) {
            initFromPosition((<GFCP.LatLongPt>obj).geometry.coordinates)
        } else if (isPosition(obj)) {
            initFromPosition(<GeoJSON.Position>obj)
        } else if (isArrayOfPositions(obj)) {
            var positions = <GeoJSON.Position[]>obj
            initFromPosition(positions[0])
            this.extend(positions)
        } else {
            throw new Error('invalid BoundingBox.constructor')
        }
        if ((query_distance != null) && (query_distance > 0)) {
            this.extend(query_distance)
        }
    }
    left(): number {return this.bbox[0]}
    bottom(): number {return this.bbox[1]}
    right(): number {return this.bbox[2]}
    top(): number {return this.bbox[3]}
    extend(obj: BoundingBox | GFCP.IBoundingBox | GFCP.LatLongPt | Position | GeoJSON.Position[] | number) {
        var extendFromIBoundingBox = (bbox: GFCP.IBoundingBox): void => {
            this.bbox[0] = Math.min(this.bbox[0], bbox[0])
            this.bbox[1] = Math.min(this.bbox[1], bbox[1])
            this.bbox[2] = Math.max(this.bbox[2], bbox[2])
            this.bbox[3] = Math.max(this.bbox[3], bbox[3])
        }
        var extendFromPosition = (position: GeoJSON.Position): void => {
            var lng = position[0]
            var lat = position[1]
            this.bbox[0] = Math.min(this.bbox[0], lng)
            this.bbox[1] = Math.min(this.bbox[1], lat)
            this.bbox[2] = Math.max(this.bbox[2], lng)
            this.bbox[3] = Math.max(this.bbox[3], lat)
        }
        var extendByMeters = (meters: number): void => {
            var findLatitudeFarthestFromEquator = (): number => {
                return Math.max(Math.abs(this.bbox[1]), Math.abs(this.bbox[3]))
            }
            var delta_lat = metersToLatitudeDistance(meters, findLatitudeFarthestFromEquator())
            var delta_lng = metersToLongitudeDistance(meters)
            this.bbox[0] -= delta_lat
            this.bbox[1] -= delta_lng
            this.bbox[2] += delta_lat
            this.bbox[3] += delta_lng
        }
        if (obj instanceof BoundingBox) {
            extendFromIBoundingBox((<BoundingBox>obj).bbox)
        } else if (isIBoundingBox(obj)) {
            extendFromIBoundingBox(<GFCP.IBoundingBox>obj)
        } else if (isLatLongPt(obj)) {
            extendFromPosition((<GFCP.LatLongPt>obj).geometry.coordinates)
        } else if (isPosition(obj)) {
            extendFromPosition(<GeoJSON.Position>obj)
        } else if (isArrayOfPositions(obj)) {
            let positions = <GeoJSON.Position[]>obj
            positions.forEach((position) => {extendFromPosition(position)})
        } else if (typeof obj === 'number') {
            extendByMeters(<number>obj)
        } else {
            throw new Error('invalid BoundingBox.extend argument')
        }
    }
    // TODO: requires line segment math
    // TODO: intersects(pts: GFCP.LatLongPt[]): boolean
    intersects(obj: BoundingBox | GFCP.IBoundingBox | GFCP.LatLongPt | GeoJSON.Position, query_distance?: number): boolean {
        var intersectsIBoundingBox = (bbox: GFCP.IBoundingBox, query_distance?: number): boolean => {
            function shouldExtend(query_distance) {return ((query_distance != null) && (query_distance > 0))}
            var main = shouldExtend(query_distance) ? new BoundingBox(this, query_distance) : this
            let overlaps_longitude = ((bbox[2] >= this.left()) && (bbox[0] <= this.right()))
            if (!overlaps_longitude) {
                return false
            }
            let overlaps_latitude = ((bbox[1] <= this.top()) && (bbox[3] >= this.bottom()))
            return overlaps_latitude
        }
        var intersectsPosition = (pt: GeoJSON.Position, query_distance?: number): boolean => {
            if ((query_distance != null) && (query_distance > 0)) {
                var bbox = new BoundingBox(pt, query_distance)
                return this.intersects(bbox)
            }
            let overlaps_longitude = ((pt[0] >= this.left()) && (pt[0] <= this.right()))
            if (!overlaps_longitude) {
                return false
            }
            let overlaps_latitude = ((pt[1] <= this.top()) && (pt[1] >= this.bottom()))
            return overlaps_latitude
        }
        if (obj instanceof BoundingBox) {
            return intersectsIBoundingBox((<BoundingBox>obj).bbox, query_distance)
        } else if (isIBoundingBox(obj)) {
            return intersectsIBoundingBox(<GFCP.IBoundingBox>obj, query_distance)
        } else if (isLatLongPt(obj)) {
            return intersectsPosition((<GFCP.LatLongPt>obj).geometry.coordinates, query_distance)
        } else if (isPosition(obj)) {
            return intersectsPosition(<GeoJSON.Position>obj, query_distance)
        } else {
            throw new Error('unsupported type')
        }
    }
}



export function mergeBoundingBoxes(a: GFCP.IBoundingBox, b: GFCP.IBoundingBox): GFCP.IBoundingBox {
    return [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[2]),
        Math.max(a[3], b[3])
    ]
}


export function createSpatialIndexForPath(path: GeoJSON.Position[], max_unindexed_length?: number, start?: number, end?: number): GFCP.SpatialIndexOnPath {
    if (max_unindexed_length == null) max_unindexed_length = 32
    if (start == null) {
        start = 0
        end = path.length - 2
    }
    if ((end - start) >= max_unindexed_length) {
        let mid = Math.floor((start + end) / 2)
        let head = createSpatialIndexForPath(path, max_unindexed_length, start, mid)
        let tail = createSpatialIndexForPath(path, max_unindexed_length, mid + 1, end)
        var index: GFCP.SpatialIndexOnPath = {
            bbox: mergeBoundingBoxes(head.bbox, tail.bbox),
            start, end,
            head, tail
        }
    } else {
        let left = path[start][0]
        let bottom = path[start][1]
        let right = left
        let top = bottom
        for (let i = start + 1; i <= end + 1; ++i) {
            let pt = path[i]
            if (pt[0] < left) left = pt[0]
            if (pt[0] > right) right = pt[0]
            if (pt[1] > top) top = pt[1]
            if (pt[1] < bottom) bottom = pt[1]
        }
        var index: GFCP.SpatialIndexOnPath = {
            bbox: [left, bottom, right, top],
            start, end
        }
    }
    return index
}


export function findPathSegmentsFromPointInIndex(index: GFCP.SpatialIndexOnPath, query_pt: GFCP.LatLongPt | GeoJSON.Position, query_distance?: number): GFCP.PathSegments[] {
    var bbox = new BoundingBox(index.bbox, query_distance)
    var feature = Array.isArray(query_pt) ? turf.point(query_pt) : query_pt
    if (bbox.intersects(feature)) {
        if (index.head || index.tail) {
            if (index.head) {
                var segments = findPathSegmentsFromPointInIndex(index.head, feature, query_distance)
            }
            if (index.tail) {
                var tail_segments = findPathSegmentsFromPointInIndex(index.tail, feature, query_distance)
                if (tail_segments) {
                    if (segments) {
                        segments = segments.concat(tail_segments)
                    } else {
                        segments = tail_segments
                    }
                }
            }
            return segments
        } else {
            return [{start: index.start, end: index.end}]
        }
    } else {
        return null
    }
}


// @param base_index: The index of this segment as part of an associated set of polylines.
function findCloseSegments(path: GFCP.Path, base_index: number, query_pt: GFCP.LatLongPt, query_distance: number): GFCP.CloseSegment[] {
    var pt_on_road = turf.pointOnLine(path, query_pt)
    var close_segments = []
    var distance_to_path = turf.distance(query_pt, pt_on_road) * 1000
    if ((query_distance == null) || (distance_to_path <= query_distance)) {
        var close_segment: GFCP.CloseSegment = {
            segment_index: base_index + pt_on_road.properties.index,
            distance_to_path,
            pt_on_segment: pt_on_road
        }
        close_segments.push(close_segment)
    }
    return close_segments
}


export function findCloseSegmentsNearPoint(path: GFCP.Path, index: GFCP.SpatialIndexOnPath, query_pt: GFCP.LatLongPt | GeoJSON.Position, query_distance: number): GFCP.CloseSegment[] {
    var all_close_segments = []
    var feature = Array.isArray(query_pt) ? turf.point(query_pt) : query_pt
    var path_segments = findPathSegmentsFromPointInIndex(index, feature, query_distance)
    if (path_segments) {
        path_segments.forEach((path_segment) => {
            var coordinates = path.geometry.coordinates.slice(path_segment.start, path_segment.end + 2)
            var segment = turf.lineString(coordinates)
            var close_segments = findCloseSegments(segment, path_segment.start, feature, query_distance)
            all_close_segments = all_close_segments.concat(close_segments)
        })
    }
    return all_close_segments
}


export var test = {
    findCloseSegments
}
