# geo
Some simple functions for earth's surface geometry.

I couldn't find these functions in Google Maps libraries, nor in turf.
So here they are:
- mergeBoundingBoxes  
parameters: (a: Geo.IBoundingBox, b: Geo.IBoundingBox)  
returns: Geo.IBoundingBox
- createSpatialIndexForPath  
parameters: (path: Geo.Path, max_unindexed_length?: number, start?: number, end?: number)  
returns: Geo.SpatialIndexOnPath
- findPathSegmentsFromPointInIndex  
parameters: (index: Geo.SpatialIndexOnPath, query_pt: Geo.LatLongPt, query_distance?: number)  
returns: Geo.PathSegments[]
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
