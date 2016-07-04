/// <reference path="./typings/geojson/geojson.d.ts"/>

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
