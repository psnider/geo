declare namespace Geo {

    interface LatLongPt {
        lat: number
        lng: number
    }


    interface IBoundingBox {
        left: number
        bottom: number
        right: number
        top: number
    }


    type Path = LatLongPt[]


    interface CloseSegment {
        index: number
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


declare module 'geo' {

    const METERS_PER_DEGREE_AT_EQUATOR: number
    function radiansToDegrees(radians: number): number
    function degreeToRadians(degrees: number): number
    function metersToLatitudeDistance(meters: number, latitude: number)
    function metersToLongitudeDistance(meters: number)
    function latitudeDistanceToMeters(latitude_distance: number, latitude: number)
    function longitudeDistanceToMeters(longitude_distance: number)

    class BoundingBox implements Geo.IBoundingBox {
        left: number
        right: number
        top: number
        bottom: number
        constructor(bbox: Geo.IBoundingBox)
        constructor(point: Geo.LatLongPt)
        constructor(points: Geo.LatLongPt[])
        extend(bbox: Geo.IBoundingBox)
        extend(point: Geo.LatLongPt)
        extend(points: Geo.LatLongPt[])
        extend(distance_m: number)
        intersects(bbox: BoundingBox): boolean
        intersects(point: Geo.LatLongPt): boolean
        intersects(points: Geo.LatLongPt[]): boolean
    }

    function mergeBoundingBoxes(a: Geo.IBoundingBox, b: Geo.IBoundingBox): Geo.IBoundingBox


    // @param path: The path to index. Normally, this is the only argument.
    // @param  max_unindexed_length: The maximum number of segments to remain unindexed.
    //     Defaults to 32.
    // @param start: The index of the first segment to index.
    //     A segment N is bounded by points N and N+1
    // @param end: The index of the last segment to index.
    // @return: The spatial index for this path.
    function createSpatialIndexForPath(path: Geo.Path, max_unindexed_length?: number, start?: number, end?: number): Geo.SpatialIndexOnPath

    // @param index: The spatial index to search.
    // @param query_pt: The point to search for.
    // @param query_distance: The distance within which to search for the point.
    // @return: Indexes to the segments from the index that match the query.
    function findPathSegmentsFromPointInIndex(index: Geo.SpatialIndexOnPath, query_pt: Geo.LatLongPt, query_distance?: number): Geo.PathSegments[]

    // @param path: The path to index. Normally, this is the only argument.
    // @param query_pt: The point near which to find path segments.
    // @param distance_m: The distance in meters within which the query point must lie of the segments.
    // @return: An array of the segments that match the query.
    function findCloseSegmentsNearPoint(path: Geo.Path, index: Geo.SpatialIndexOnPath, query_pt: Geo.LatLongPt, distance_m?: number): Geo.CloseSegment[]

}
