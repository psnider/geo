# geo-find-close-polylines
Quickly find the closest line segments of a polyline on the earth's surface

- Create a spatial index for a polyline on the earth's surface.  
- Find line segments of a polyline that are close to a query point.


I couldn't find these functions in Google Maps libraries, nor in turf.
So here they are:
- mergeBoundingBoxes  
Merge two bounding boxes.
parameters: (a: Geo.IBoundingBox, b: Geo.IBoundingBox)  
returns: Geo.IBoundingBox
- createSpatialIndexForPath  
parameters: (path: Geo.Path, max_unindexed_length?: number, start?: number, end?: number)  
returns: Geo.SpatialIndexOnPath
- findCloseSegmentsNearPoint  
parameters: (path: Geo.Path, index: Geo.SpatialIndexOnPath, query_pt: Geo.LatLongPt, distance_m?: number)  
returns: Geo.CloseSegment[]

See [geo.d.ts](geo.d.ts) for the detailed declarations.

## Examples
See the [tests](geo.tests.ts)

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
