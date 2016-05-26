# geo-find-close-polylines
## Summary
geo-find-close-polylines quickly finds the closest line segments of a polyline on the earth's surface, using a simple spatial index.  
This uses GeoJSON and the *turf* computational geometry library.


## Main Functions
I couldn't find these functions in Google Maps libraries, or in *turf*.  
So here they are. Note that lengths are in meters.
- mergeBoundingBoxes  
Merges two *turf* bounding boxes.
parameters: (a: Geo.IBoundingBox, b: Geo.IBoundingBox)  
returns: Geo.IBoundingBox
- createSpatialIndexForPath  
parameters: (path: GeoJSON.Position[], max_unindexed_length?: number, start_segment_index?: number, end_segment_index?: number)  
returns: Geo.SpatialIndexOnPath  
- findCloseSegmentsNearPoint  
parameters: (path: GeoJSON.Feature \<GeoJSON.LineString>, index: Geo.SpatialIndexOnPath, query_pt: GeoJSON.Feature \<GeoJSON.Point> | GeoJSON.Position, distance_m?: number)  
returns: Geo.CloseSegment[]

## Details

See [geo-find-close-polylines.d.ts](https://github.com/psnider/geo-find-close-polylines/blob/master/geo-find-close-polylines.d.ts) for the detailed declarations.

## Examples

Create a spatial index, and use it to find points on a polyline.
```
geo = require('geo-find-close-polylines')
var pts = [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1]]
var line = {
    type: 'Feature',
    geometry: {type: 'LineString',coordinates: pts},
    properties: {}
}
// normally, you don't need to specify the max_unindexed_length, but this is a short polyline
// and a short max_unindexed_length demonstrates the decomposition of the spatial index
var index = geo.createSpatialIndexForPath(pts, 2)
var close_segments = geo.findCloseSegmentsNearPoint(line, index, [1.5, 0.001], 120)
// close_segments[0].segment_index == 1
// close_segments[0].distance_to_path == 111.22983322959864
// close_segments[0].pt_on_segment.geometry.coordinates == [1.5000000000000002, 0]
```

For other examples, see the [tests](https://github.com/psnider/geo-find-close-polylines/blob/master/geo-find-close-polylines.tests.ts)

## Setup for Build
```
npm install
typings install
```

## Build
Build the software:  
```
npm run build
```

## Test
Run the tests:  
```
npm run test
```

## Problems?
Please report them as issues on the GitHub repo.
