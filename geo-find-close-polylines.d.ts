/// <reference path="./typings/geojson/geojson.d.ts"/>



export const METERS_PER_DEGREE_AT_EQUATOR: number
export function radiansToDegrees(radians: number): number
export function degreeToRadians(degrees: number): number
export function metersToLatitudeDistance(meters: number, latitude: number)
export function metersToLongitudeDistance(meters: number)
export function latitudeDistanceToMeters(latitude_distance: number, latitude: number)
export function longitudeDistanceToMeters(longitude_distance: number)

export class BoundingBox {
    bbox: GFCP.IBoundingBox
    constructor(bbox: BoundingBox | GFCP.IBoundingBox, query_distance?: number)
    constructor(point: GFCP.LatLongPt | Position, query_distance?: number)
    constructor(points: GeoJSON.Position[], query_distance?: number)
    extend(bbox: BoundingBox | GFCP.IBoundingBox)
    extend(point: GFCP.LatLongPt | Position)
    extend(points: GeoJSON.Position[])
    extend(distance_m: number)
    intersects(bbox: BoundingBox | GFCP.IBoundingBox, query_distance?: number): boolean
    intersects(point: GFCP.LatLongPt | GeoJSON.Position, query_distance?: number): boolean
}

export function mergeBoundingBoxes(a: GFCP.IBoundingBox, b: GFCP.IBoundingBox): GFCP.IBoundingBox


// @param path: The path to index. Normally, this is the only argument.
// @param  max_unindexed_length: The maximum number of segments to remain unindexed.
//     Defaults to 32.
// @param start: The index of the first segment to index.
//     A segment N is bounded by points N and N+1
// @param end: The index of the last segment to index.
// @return: The spatial index for this path.
export function createSpatialIndexForPath(path: GeoJSON.Position[], max_unindexed_length?: number, start?: number, end?: number): GFCP.SpatialIndexOnPath

// @param index: The spatial index to search.
// @param query_pt: The point to search for.
// @param query_distance: The distance within which to search for the point.
// @return: Indexes to the segments from the index that match the query.
export function findPathSegmentsFromPointInIndex(index: GFCP.SpatialIndexOnPath, query_pt: GFCP.LatLongPt | GeoJSON.Position, query_distance?: number): GFCP.PathSegments[]

// @param path: The path to index. Normally, this is the only argument.
// @param query_pt: The point near which to find path segments.
// @param distance_m: The distance in meters within which the query point must lie of the segments.
// @return: An array of the segments that match the query.
export function findCloseSegmentsNearPoint(path: GFCP.Path, index: GFCP.SpatialIndexOnPath, query_pt: GFCP.LatLongPt | GeoJSON.Position, distance_m?: number): GFCP.CloseSegment[]


export var test: {
    findCloseSegments: (path: GFCP.Path, base_index: number, query_pt: GFCP.LatLongPt, query_distance: number) => GFCP.CloseSegment[]
}
