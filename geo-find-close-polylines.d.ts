import "./typings/geojson/geojson.d.ts"


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



export const METERS_PER_DEGREE_AT_EQUATOR: number
export function radiansToDegrees(radians: number): number
export function degreeToRadians(degrees: number): number
export function metersToLatitudeDistance(meters: number, latitude: number)
export function metersToLongitudeDistance(meters: number)
export function latitudeDistanceToMeters(latitude_distance: number, latitude: number)
export function longitudeDistanceToMeters(longitude_distance: number)

export class BoundingBox {
    bbox: IBoundingBox
    constructor(bbox: BoundingBox | IBoundingBox, query_distance?: number)
    constructor(point: LatLongPt | Position, query_distance?: number)
    constructor(points: GeoJSON.Position[], query_distance?: number)
    extend(bbox: BoundingBox | IBoundingBox)
    extend(point: LatLongPt | Position)
    extend(points: GeoJSON.Position[])
    extend(distance_m: number)
    intersects(bbox: BoundingBox | IBoundingBox, query_distance?: number): boolean
    intersects(point: LatLongPt | GeoJSON.Position, query_distance?: number): boolean
}

export function mergeBoundingBoxes(a: IBoundingBox, b: IBoundingBox): IBoundingBox


// @param path: The path to index. Normally, this is the only argument.
// @param  max_unindexed_length: The maximum number of segments to remain unindexed.
//     Defaults to 32.
// @param start: The index of the first segment to index.
//     A segment N is bounded by points N and N+1
// @param end: The index of the last segment to index.
// @return: The spatial index for this path.
export function createSpatialIndexForPath(path: GeoJSON.Position[], max_unindexed_length?: number, start?: number, end?: number): SpatialIndexOnPath

// @param index: The spatial index to search.
// @param query_pt: The point to search for.
// @param query_distance: The distance within which to search for the point.
// @return: Indexes to the segments from the index that match the query.
export function findPathSegmentsFromPointInIndex(index: SpatialIndexOnPath, query_pt: LatLongPt | GeoJSON.Position, query_distance?: number): PathSegments[]

// @param path: The path to index. Normally, this is the only argument.
// @param query_pt: The point near which to find path segments.
// @param distance_m: The distance in meters within which the query point must lie of the segments.
// @return: An array of the segments that match the query.
export function findCloseSegmentsNearPoint(path: Path, index: SpatialIndexOnPath, query_pt: LatLongPt | GeoJSON.Position, distance_m?: number): CloseSegment[]


export var test: {
    findCloseSegments: (path: Path, base_index: number, query_pt: LatLongPt, query_distance: number) => CloseSegment[]
}
