import turf = require('turf')

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


// This uses simple math, and doesnt account for crossing the 180 longitude.
export class BoundingBox implements Geo.IBoundingBox {
    left: number
    right: number
    top: number
    bottom: number
    constructor(obj: Geo.IBoundingBox | Geo.LatLongPt | Geo.LatLongPt[], query_distance?: number) {
        var initFromIBoundingBox = (bbox: Geo.IBoundingBox): void => {
            this.left   = bbox.left
            this.bottom = bbox.bottom
            this.right  = bbox.right
            this.top    = bbox.top
        }
        var initFromLatLongPt = (pt: Geo.LatLongPt): void => {
            this.left   = pt.lng
            this.bottom = pt.lat
            this.right  = pt.lng
            this.top    = pt.lat
        }
        if ((<Geo.IBoundingBox>obj).left != null) {
            // assume IBoundingBox
            initFromIBoundingBox(<Geo.IBoundingBox>obj)
        } else if ((<Geo.LatLongPt>obj).lat != null) {
            // assume single Geo.LatLongPt
            initFromLatLongPt(<Geo.LatLongPt>obj)
        } else if (Array.isArray(obj) && (obj.length > 0) && obj[0].lat) {
            // assume Geo.LatLongPt[]
            initFromLatLongPt((<Geo.LatLongPt[]>obj)[0])
            this.extend(<Geo.LatLongPt[]>obj)
        } else {
            throw new Error('invalid BoundingBox.constructor')
        }
        if ((query_distance != null) && (query_distance > 0)) {
            this.extend(query_distance)
        }
    }
    extend(obj: Geo.IBoundingBox | Geo.LatLongPt | Geo.LatLongPt[] | number) {
        var extendFromIBoundingBox = (bbox: Geo.IBoundingBox): void => {
            this.left   = Math.min(this.left, bbox.left)
            this.bottom = Math.min(this.bottom, bbox.bottom)
            this.right  = Math.max(this.right, bbox.right)
            this.top    = Math.max(this.top, bbox.top)
        }
        var extendFromLatLongPt = (point: Geo.LatLongPt): void => {
            this.left   = Math.min(this.left, point.lng)
            this.bottom = Math.min(this.bottom, point.lat)
            this.right  = Math.max(this.right, point.lng)
            this.top    = Math.max(this.top, point.lat)
        }
        var extendByMeters = (meters: number): void => {
            var findLatitudeFarthestFromEquator = (): number => {
                return Math.max(Math.abs(this.bottom), Math.abs(this.top))
            }
            var delta_lat = metersToLatitudeDistance(meters, findLatitudeFarthestFromEquator())
            var delta_lng = metersToLongitudeDistance(meters)
            this.top    += delta_lng
            this.bottom -= delta_lng
            this.left   -= delta_lat
            this.right  += delta_lat
        }
        if ((<Geo.IBoundingBox>obj).left != null) {
            extendFromIBoundingBox(<Geo.IBoundingBox>obj)
        } else if ((<Geo.LatLongPt>obj).lat != null) {
            extendFromLatLongPt(<Geo.LatLongPt>obj)
        } else if (Array.isArray(obj) && (obj.length > 0) && obj[0].lat) {
            let points: Geo.LatLongPt[] = <Geo.LatLongPt[]>obj
            points.forEach((pt) => {extendFromLatLongPt(pt)})
        } else if (typeof obj === 'number') {
            extendByMeters(<number>obj)
        } else {
            throw new Error('invalid BoundingBox.extend argument')
        }
    }
    // TODO: requires line segment math
    // TODO: intersects(pts: Geo.LatLongPt[]): boolean
    intersects(obj: Geo.IBoundingBox  | Geo.LatLongPt, query_distance?: number): boolean {
        var intersectsIBoundingBox = (bbox: Geo.IBoundingBox, query_distance?: number): boolean => {
            if ((query_distance != null) && (query_distance > 0)) {
                bbox = new BoundingBox(bbox, query_distance)
            }
            let overlaps_longitude = ((bbox.right >= this.left) && (bbox.left <= this.right))
            if (!overlaps_longitude) {
                return false
            }
            let overlaps_latitude = ((bbox.bottom <= this.top) && (bbox.top >= this.bottom))
            return overlaps_latitude
        }
        var intersectsLatLongPt = (pt: Geo.LatLongPt, query_distance?: number): boolean => {
            if ((query_distance != null) && (query_distance > 0)) {
                var bbox = new BoundingBox(pt, query_distance)
                return this.intersects(bbox)
            }
            let overlaps_longitude = ((pt.lng >= this.left) && (pt.lng <= this.right))
            if (!overlaps_longitude) {
                return false
            }
            let overlaps_latitude = ((pt.lat <= this.top) && (pt.lat >= this.bottom))
            return overlaps_latitude
        }
        if ((<Geo.IBoundingBox>obj).left != null) {
            return intersectsIBoundingBox(<Geo.IBoundingBox>obj, query_distance)
        } else if ((<Geo.LatLongPt>obj).lat != null) {
            return intersectsLatLongPt(<Geo.LatLongPt>obj, query_distance)
        } else {
            throw new Error('unsupported type')
        }
    }
}



export function mergeBoundingBoxes(a: Geo.IBoundingBox, b: Geo.IBoundingBox): Geo.IBoundingBox {
    return {
        left:   Math.min(a.left, b.left),
        bottom: Math.min(a.bottom, b.bottom),
        right:  Math.max(a.right, b.right),
        top:    Math.max(a.top, b.top)
    }
}


export function createSpatialIndexForPath(path: Geo.Path, max_unindexed_length?: number, start?: number, end?: number): Geo.SpatialIndexOnPath {
    if (max_unindexed_length == null) max_unindexed_length = 32
    if (start == null) {
        start = 0
        end = path.length - 2
    }
    if ((end - start) >= max_unindexed_length) {
        let mid = Math.floor((start + end) / 2)
        let head = createSpatialIndexForPath(path, max_unindexed_length, start, mid)
        let tail = createSpatialIndexForPath(path, max_unindexed_length, mid + 1, end)
        var index: Geo.SpatialIndexOnPath = {
            bbox: mergeBoundingBoxes(head.bbox, tail.bbox),
            start, end,
            head, tail
        }
    } else {
        let left = path[start].lng
        let right = left
        let top = path[start].lat
        let bottom = top
        for (let i = start + 1; i <= end + 1; ++i) {
            let pt = path[i]
            if (pt.lng < left) left = pt.lng
            if (pt.lng > right) right = pt.lng
            if (pt.lat > top) top = pt.lat
            if (pt.lat < bottom) bottom = pt.lat
        }
        var index: Geo.SpatialIndexOnPath = {
            bbox: {left, right, top, bottom},
            start, end
        }
    }
    return index
}


export function findPathSegmentsFromPointInIndex(index: Geo.SpatialIndexOnPath, query_pt: Geo.LatLongPt, query_distance?: number): Geo.PathSegments[] {
    var bbox = new BoundingBox(index.bbox, query_distance)
    if (bbox.intersects(query_pt)) {
        if (index.head || index.tail) {
            if (index.head) {
                var segments = findPathSegmentsFromPointInIndex(index.head, query_pt, query_distance)
            }
            if (index.tail) {
                var tail_segments = findPathSegmentsFromPointInIndex(index.tail, query_pt, query_distance)
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


function findCloseSegments(path: Geo.Path, base_index: number, query_pt: Geo.LatLongPt, query_distance: number): Geo.CloseSegment[] {
    var coordinates = []
    path.forEach((pt) => {
        coordinates.push([pt.lng, pt.lat])
    })
    var geo_path = turf.lineString(coordinates)
    var geo_query_pt = turf.point([query_pt.lng, query_pt.lat])
    var pt_on_road = turf.pointOnLine(geo_path, geo_query_pt)
    var close_segments = []
    var distance_to_path = turf.distance(geo_query_pt, pt_on_road)
    if ((query_distance == null) || (pt_on_road.properties.dist <= query_distance)) {
        var close_segment: Geo.CloseSegment = {
            index: base_index + pt_on_road.properties.index,
            distance_to_path,
            pt_on_segment: {lat: pt_on_road.geometry.coordinates[1], lng: pt_on_road.geometry.coordinates[0]}
        }
        close_segments.push(close_segment)
    }
    return close_segments
}


export function findCloseSegmentsNearPoint(path: Geo.Path, index: Geo.SpatialIndexOnPath, query_pt: Geo.LatLongPt, query_distance: number): Geo.CloseSegment[] {
    var all_close_segments = []
    var path_segments = findPathSegmentsFromPointInIndex(index, query_pt, query_distance)
    if (path_segments) {
        path_segments.forEach((path_segment) => {
            var segment = path.slice(path_segment.start, path_segment.end + 2)
            var close_segments = findCloseSegments(segment, path_segment.start, query_pt, query_distance)
            all_close_segments = all_close_segments.concat(close_segments)
        })
    }
    return all_close_segments
}
