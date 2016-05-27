"use strict";
var CHAI = require('chai');
var expect = CHAI.expect;
var turf = require('turf');
var geo = require('./geo-find-close-polylines');
describe('geo', function () {
    describe('conversion', function () {
        var LAT_DISTANCE_TO_METERS = {
            equator: {
                '1': geo.METERS_PER_DEGREE_AT_EQUATOR,
                '0.5': geo.METERS_PER_DEGREE_AT_EQUATOR / 2,
            },
            '60-degrees': {
                '1': geo.METERS_PER_DEGREE_AT_EQUATOR / 2,
                '0.5': (geo.METERS_PER_DEGREE_AT_EQUATOR / 2) / 2,
            }
        };
        describe('metersToLatitudeDistance', function () {
            it('should work at the equator', function () {
                var lat_distance = geo.metersToLatitudeDistance(LAT_DISTANCE_TO_METERS['equator']['0.5'], 0);
                expect(lat_distance).to.be.closeTo(0.5, 0.00001);
            });
            it('should work at 60 degrees', function () {
                var lat_distance = geo.metersToLatitudeDistance(LAT_DISTANCE_TO_METERS['60-degrees']['0.5'], 60);
                expect(lat_distance).to.be.closeTo(0.5, 0.00001);
            });
        });
        describe('latitudeDistanceToMeters', function () {
            it('should work at the equator', function () {
                var meters = geo.latitudeDistanceToMeters(0.5, 0);
                expect(meters).to.be.closeTo(LAT_DISTANCE_TO_METERS['equator']['0.5'], 1);
            });
            it('should work at 60 degrees', function () {
                var meters = geo.latitudeDistanceToMeters(0.5, 60);
                expect(meters).to.be.closeTo(LAT_DISTANCE_TO_METERS['60-degrees']['0.5'], 1);
            });
        });
    });
    describe('mergeBoundingBoxes', function () {
        it('should merge box contained in box', function () {
            var contained = [-1, 1, 1, 1];
            var container = [-2, -2, 2, 2];
            var merged = geo.mergeBoundingBoxes(contained, container);
            var expected = [-2, -2, 2, 2];
            expect(merged).to.deep.equal(expected);
        });
        it('should merge boxes that overlap', function () {
            var a = [-2, -2, 2, 2];
            var b = [1, 1, 3, 3];
            var merged = geo.mergeBoundingBoxes(a, b);
            var expected = [-2, -2, 3, 3];
            expect(merged).to.deep.equal(expected);
        });
        it('should merge boxes that dont overlap', function () {
            var a = [-2, -2, -1, -1];
            var b = [1, 1, 2, 2];
            var merged = geo.mergeBoundingBoxes(a, b);
            var expected = [-2, -2, 2, 2];
            expect(merged).to.deep.equal(expected);
        });
    });
    describe('createSpatialIndexForPath', function () {
        var pts = [
            [0, 0],
            [1, 0],
            [2, 0],
            [3, 1],
            [4, 1]
        ];
        it('should not create a sub-index for a line that is shorter than the max_unindexed_length', function () {
            var index = geo.createSpatialIndexForPath(pts);
            var expected = { bbox: [0, 0, 4, 1], start: 0, end: 3 };
            expect(index).to.deep.equal(expected);
        });
        it('should create a sub-index for a line that is longer than the max_unindexed_length', function () {
            var index = geo.createSpatialIndexForPath(pts, 2);
            var expected = { bbox: [0, 0, 4, 1], start: 0, end: 3 };
            var head = { bbox: [0, 0, 2, 0], start: 0, end: 1 };
            var tail = { bbox: [2, 0, 4, 1], start: 2, end: 3 };
            expected.head = head;
            expected.tail = tail;
            expect(index).to.deep.equal(expected);
        });
    });
    describe('intersects', function () {
        describe('when query_distance isn\'t specified', function () {
            it('should be true for a point inside the bounds', function () {
                var bbox = new geo.BoundingBox([-10, -10, 10, 10]);
                expect(bbox.intersects([5, 5])).to.be.true;
            });
        });
        describe('when query_distance is specified', function () {
            it('should be true for a point just outside the bounds', function () {
                var bbox = new geo.BoundingBox([-10, -10, 10, 10]);
                expect(bbox.intersects([-10.001, 0], 150)).to.be.true;
            });
        });
    });
    describe('findPathSegmentsFromPointInIndex', function () {
        // two same size areas, head is upper left, tail is lower right
        var INDEX = {
            bbox: [-10, -10, 10, 10],
            start: 0, end: 100,
            head: {
                bbox: [-10, 0, 0, 10],
                start: 0, end: 50,
            },
            tail: {
                bbox: [0, -10, 10, 0],
                start: 51, end: 100,
            }
        };
        describe('when query_distance isn\'t specified', function () {
            it('should return null, when there are no matches', function () {
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [0, 11]);
                expect(match).to.be.null;
            });
            it('should return one match, when the only match is in the head', function () {
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [-5, 5]);
                expect(match).to.deep.equal([{ start: 0, end: 50 }]);
            });
            it('should return one match, when the only match is in the tail', function () {
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [5, -5]);
                expect(match).to.deep.equal([{ start: 51, end: 100 }]);
            });
        });
        describe('when query_distance is specified', function () {
            it('should return one match, when the only match just outside the head, but within the query_distance', function () {
                // the query_pt is left of the top-left point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [-10.001, 10.001], 150);
                expect(match).to.deep.equal([{ start: 0, end: 50 }]);
            });
            it('should return null, when the only match just outside the head, but outside the query_distance', function () {
                // the query_pt is left of the top-left point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [-10.001, 10.001], 80);
                expect(match).to.be.null;
            });
            it('should return one match, when the only match just outside the tail, but within the query_distance', function () {
                // the query_pt is right of the bottom-right point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [10.001, 0], 120);
                expect(match).to.deep.equal([{ start: 51, end: 100 }]);
            });
            it('should return null, when the only match just outside the head, but outside the query_distance', function () {
                // the query_pt is right of the bottom-right point
                var match = geo.findPathSegmentsFromPointInIndex(INDEX, [10.001, 0], 80);
                expect(match).to.be.null;
            });
        });
    });
    describe('findCloseSegments', function () {
        var line = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [0, 0],
                    [1, 0]
                ]
            },
            properties: {}
        };
        it('should return segments when pt is closer than distance', function () {
            var query_pt = turf.point([0.5, 0.001]);
            var close_segments = geo.test.findCloseSegments(line, 0, query_pt, 112);
            expect(close_segments).to.have.lengthOf(1);
        });
        it('should not return segments when pt is farther than distance', function () {
            var query_pt = turf.point([0.5, 0.001]);
            var close_segments = geo.test.findCloseSegments(line, 0, query_pt, 110);
            expect(close_segments).to.have.lengthOf(0);
        });
    });
    describe('findCloseSegmentsNearPoint', function () {
        var line = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [0, 0],
                    [1, 0],
                    [2, 0]
                ]
            },
            properties: {}
        };
        var INDEX = {
            bbox: [0, 0, 2, 0],
            start: 0, end: 1,
            head: {
                bbox: [0, 0, 1, 0],
                start: 0, end: 0,
            },
            tail: {
                bbox: [1, 0, 2, 0],
                start: 1, end: 1,
            }
        };
        it('should not return segments when pt is farther than distance', function () {
            var segments = geo.findCloseSegmentsNearPoint(line, INDEX, [1, 0.001], 80);
            expect(segments).to.have.lengthOf(0);
        });
        it('should return a segment when pt is closer than distance', function () {
            var segments = geo.findCloseSegmentsNearPoint(line, INDEX, [0.5, 0.001], 120);
            expect(segments).to.have.lengthOf(1);
            expect(segments[0].segment_index).to.equal(0);
            expect(segments[0].distance_to_path).to.be.closeTo(111, 0.5);
        });
        it('should return 2 segments when pt is close to 2 segments', function () {
            var segments = geo.findCloseSegmentsNearPoint(line, INDEX, [1, 0.001], 120);
            expect(segments).to.have.lengthOf(2);
            expect(segments[0].segment_index).to.equal(0);
            expect(segments[1].segment_index).to.equal(1);
        });
    });
});
