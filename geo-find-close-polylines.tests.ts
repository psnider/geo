import CHAI                 = require('chai')
const  expect               = CHAI.expect

import geo                  = require('./geo-find-close-polylines')




describe('geo', function() {

    describe('conversion', function() {

        const LAT_DISTANCE_TO_METERS: {[lat: string]: {[lat_distance: string]: number}} = {
            equator: {
                '1':   geo.METERS_PER_DEGREE_AT_EQUATOR,
                '0.5': geo.METERS_PER_DEGREE_AT_EQUATOR / 2,
            },
            '60-degrees': {
                '1':   geo.METERS_PER_DEGREE_AT_EQUATOR / 2,
                '0.5': (geo.METERS_PER_DEGREE_AT_EQUATOR / 2) / 2,
            }
        }


        describe('metersToLatitudeDistance', function() {

            it('should work at the equator', function() {
                var lat_distance = geo.metersToLatitudeDistance(LAT_DISTANCE_TO_METERS['equator']['0.5'], 0)
                expect(lat_distance).to.be.closeTo(0.5, 0.00001)
            })


            it('should work at 60 degrees', function() {
                var lat_distance = geo.metersToLatitudeDistance(LAT_DISTANCE_TO_METERS['60-degrees']['0.5'], 60)
                expect(lat_distance).to.be.closeTo(0.5, 0.00001)
            })

        })


        describe('latitudeDistanceToMeters', function() {

            it('should work at the equator', function() {
                var meters = geo.latitudeDistanceToMeters(0.5, 0)
                expect(meters).to.be.closeTo(LAT_DISTANCE_TO_METERS['equator']['0.5'], 1)
            })


            it('should work at 60 degrees', function() {
                var meters = geo.latitudeDistanceToMeters(0.5, 60)
                expect(meters).to.be.closeTo(LAT_DISTANCE_TO_METERS['60-degrees']['0.5'], 1)
            })

        })

    })


    describe('mergeBoundingBoxes', function() {

        it('should merge box contained in box', function() {
            var contained: Geo.IBoundingBox = {left: -1, right: 1, top: 1, bottom: 1}
            var container: Geo.IBoundingBox = {left: -2, right: 2, top: 2, bottom: -2}
            var merged = geo.mergeBoundingBoxes(contained, container)
            var expected: Geo.IBoundingBox = {left: -2, right: 2, top: 2, bottom: -2}
            expect(merged).to.deep.equal(expected)
        })


        it('should merge boxes that overlap', function() {
            var a: Geo.IBoundingBox = {left: -2, right: 2, top: 2, bottom: -2}
            var b: Geo.IBoundingBox = {left: 1, right: 3, top: 3, bottom: 1}
            var merged = geo.mergeBoundingBoxes(a, b)
            var expected: Geo.IBoundingBox = {left: -2, right: 3, top: 3, bottom: -2}
            expect(merged).to.deep.equal(expected)
        })


        it('should merge boxes that dont overlap', function() {
            var a: Geo.IBoundingBox = {left: -2, right: -1, top: -1, bottom: -2}
            var b: Geo.IBoundingBox = {left: 1, right: 2, top: 2, bottom: 1}
            var merged = geo.mergeBoundingBoxes(a, b)
            var expected: Geo.IBoundingBox = {left: -2, right: 2, top: 2, bottom: -2}
            expect(merged).to.deep.equal(expected)
        })

    })


    describe('createSpatialIndexForPath', function() {

        var pts = [
            {lat: 0, lng: 0},
            {lat: 0, lng: 1},
            {lat: 0, lng: 2},
            {lat: 1, lng: 3},
            {lat: 1, lng: 4}
        ]


        it('should not create a sub-index for a line that is shorter than the max_unindexed_length', function() {
            var index: Geo.SpatialIndexOnPath = geo.createSpatialIndexForPath(pts)
            var expected = {bbox: {left: 0, right: 4, top: 1, bottom: 0}, start: 0, end: 3}
            expect(index).to.deep.equal(expected)
        })


        it('should create a sub-index for a line that is longer than the max_unindexed_length', function() {
            var index: Geo.SpatialIndexOnPath = geo.createSpatialIndexForPath(pts, 2)
            var expected: Geo.SpatialIndexOnPath = {bbox: {left: 0, right: 4, top: 1, bottom: 0}, start: 0, end: 3}
            var head = {bbox: {left: 0, right: 2, top: 0, bottom: 0}, start: 0, end: 1}
            var tail = {bbox: {left: 2, right: 4, top: 1, bottom: 0}, start: 2, end: 3}
            expected.head = head
            expected.tail = tail
            expect(index).to.deep.equal(expected)
        })

    })

    describe('intersects', function() {

        describe('when query_distance isn\'t specified', function() {

            it('should be true for a point inside the bounds', function() {
                var bbox = new geo.BoundingBox({left: -10, right: 10, top: 10, bottom: -10})
                expect(bbox.intersects({lat: 5, lng: 5})).to.be.true
            })

        })


        describe('when query_distance is specified', function() {

            it('should be true for a point just outside the bounds', function() {
                var bbox = new geo.BoundingBox({left: -10, right: 10, top: 10, bottom: -10})
                expect(bbox.intersects({lat: 0, lng: -10.001}, 150)).to.be.true
            })

        })

    })


    describe('findPathSegmentsFromPointInIndex', function() {

        // two same size areas, head is upper left, tail is lower right
        const INDEX: Geo.SpatialIndexOnPath = {
            bbox: {left: -10, bottom: -10, right: 10, top: 10},
            start: 0, end: 100,
            head: {
                bbox: {left: -10, bottom: 0, right: 0, top: 10},
                start: 0, end: 50,
            },
            tail: {
                bbox: {left: 0, bottom: -10, right: 10, top: 0},
                start: 51, end: 100,
            }
        }

        describe('when query_distance isn\'t specified', function() {

            it('should return null, when there are no matches', function() {
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: 11, lng: 0})
                expect(match).to.be.null
            })


            it('should return one match, when the only match is in the head', function() {
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: 5, lng: -5})
                expect(match).to.deep.equal([{start: 0, end: 50}])
            })


            it('should return one match, when the only match is in the tail', function() {
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: -5, lng: 5})
                expect(match).to.deep.equal([{start: 51, end: 100}])
            })

        })


        describe('when query_distance is specified', function() {

            it('should return one match, when the only match just outside the head, but within the query_distance', function() {
                // the query_pt is left of the top-left point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: 10.001, lng: -10.001}, 150)
                expect(match).to.deep.equal([{start: 0, end: 50}])
            })


            it('should return null, when the only match just outside the head, but outside the query_distance', function() {
                // the query_pt is left of the top-left point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: 10.001, lng: -10.001}, 80)
                expect(match).to.be.null
            })


            it('should return one match, when the only match just outside the tail, but within the query_distance', function() {
                // the query_pt is right of the bottom-right point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: 0, lng: 10.001}, 120)
                expect(match).to.deep.equal([{start: 51, end: 100}])
            })

            it('should return null, when the only match just outside the head, but outside the query_distance', function() {
                // the query_pt is right of the bottom-right point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, {lat: 0, lng: 10.001}, 80)
                expect(match).to.be.null
            })

        })

    })



    describe('findCloseSegmentsNearPoint', function() {

        var line = [
            {lat: 0, lng: 0},
            {lat: 0, lng: 1},
            {lat: 0, lng: 2}
        ]

        const INDEX: Geo.SpatialIndexOnPath = {
            bbox: {left: 0, bottom: 0, right: 2, top: 0},
            start: 0, end: 1,
            head: {
                bbox: {left: 0, bottom: 0, right: 1, top: 0},
                start: 0, end: 0,
            },
            tail: {
                bbox: {left: 1, bottom: 0, right: 2, top: 0},
                start: 1, end: 1,
            }
        }



        it('should not return segments when pt is farther than distance', function() {
            let segments = geo.findCloseSegmentsNearPoint(line, INDEX, {lat: 0.001, lng: 1}, 80)
            expect(segments).to.have.lengthOf(0)
        })


        it('should return a segment when pt is closer than distance', function() {
            let segments = geo.findCloseSegmentsNearPoint(line, INDEX, {lat: 0.001, lng: 0.5}, 120)
            expect(segments).to.have.lengthOf(1)
            expect(segments[0].index).to.equal(0)
        })


        it('should return 2 segments when pt is close to 2 segments', function() {
            let segments = geo.findCloseSegmentsNearPoint(line, INDEX, {lat: 0.001, lng: 1}, 120)
            expect(segments).to.have.lengthOf(2)
            expect(segments[0].index).to.equal(0)
            expect(segments[1].index).to.equal(1)
        })

    })


})
