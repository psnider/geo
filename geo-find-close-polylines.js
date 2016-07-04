"use strict";
/// <reference path="../types.d.ts"/>
var turf = require('turf');
exports.METERS_PER_DEGREE_AT_EQUATOR = 111111;
function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}
exports.radiansToDegrees = radiansToDegrees;
function degreeToRadians(degrees) {
    return degrees * (Math.PI / 180);
}
exports.degreeToRadians = degreeToRadians;
function metersToLatitudeDistance(meters, latitude) {
    var meters_per_degree = exports.METERS_PER_DEGREE_AT_EQUATOR * Math.cos(degreeToRadians(latitude));
    return (meters / meters_per_degree);
}
exports.metersToLatitudeDistance = metersToLatitudeDistance;
function metersToLongitudeDistance(meters) {
    return (meters / exports.METERS_PER_DEGREE_AT_EQUATOR);
}
exports.metersToLongitudeDistance = metersToLongitudeDistance;
function latitudeDistanceToMeters(latitude_distance, latitude) {
    var meters_per_degree = exports.METERS_PER_DEGREE_AT_EQUATOR * Math.cos(degreeToRadians(latitude));
    return (meters_per_degree * latitude_distance);
}
exports.latitudeDistanceToMeters = latitudeDistanceToMeters;
function longitudeDistanceToMeters(longitude_distance) {
    return (exports.METERS_PER_DEGREE_AT_EQUATOR * longitude_distance);
}
exports.longitudeDistanceToMeters = longitudeDistanceToMeters;
function isIBoundingBox(obj) {
    return (Array.isArray(obj) && (obj.length === 4) && (typeof obj[0] === 'number'));
}
function isLatLongPt(obj) {
    return ((obj.geometry) && (obj.geometry.type == 'Point'));
}
function isPosition(obj) {
    return (Array.isArray(obj) && (obj.length === 2) && (typeof obj[0] === 'number'));
}
function isArrayOfPositions(obj) {
    if (Array.isArray(obj) && Array.isArray(obj[0])) {
        var position = obj[0];
        return ((position.length === 2) && (typeof position[0] === 'number'));
    }
    else {
        return false;
    }
}
// This uses simple math, and doesnt account for crossing the 180 longitude.
var BoundingBox = (function () {
    function BoundingBox(obj, query_distance) {
        var _this = this;
        var initFromIBoundingBox = function (bbox) {
            _this.bbox = [].concat(bbox);
        };
        var initFromPosition = function (position) {
            var lng = position[0];
            var lat = position[1];
            _this.bbox = [lng, lat, lng, lat];
        };
        if (obj instanceof BoundingBox) {
            initFromIBoundingBox(obj.bbox);
        }
        else if (isIBoundingBox(obj)) {
            initFromIBoundingBox(obj);
        }
        else if (isLatLongPt(obj)) {
            initFromPosition(obj.geometry.coordinates);
        }
        else if (isPosition(obj)) {
            initFromPosition(obj);
        }
        else if (isArrayOfPositions(obj)) {
            var positions = obj;
            initFromPosition(positions[0]);
            this.extend(positions);
        }
        else {
            throw new Error('invalid BoundingBox.constructor');
        }
        if ((query_distance != null) && (query_distance > 0)) {
            this.extend(query_distance);
        }
    }
    BoundingBox.prototype.left = function () { return this.bbox[0]; };
    BoundingBox.prototype.bottom = function () { return this.bbox[1]; };
    BoundingBox.prototype.right = function () { return this.bbox[2]; };
    BoundingBox.prototype.top = function () { return this.bbox[3]; };
    BoundingBox.prototype.extend = function (obj) {
        var _this = this;
        var extendFromIBoundingBox = function (bbox) {
            _this.bbox[0] = Math.min(_this.bbox[0], bbox[0]);
            _this.bbox[1] = Math.min(_this.bbox[1], bbox[1]);
            _this.bbox[2] = Math.max(_this.bbox[2], bbox[2]);
            _this.bbox[3] = Math.max(_this.bbox[3], bbox[3]);
        };
        var extendFromPosition = function (position) {
            var lng = position[0];
            var lat = position[1];
            _this.bbox[0] = Math.min(_this.bbox[0], lng);
            _this.bbox[1] = Math.min(_this.bbox[1], lat);
            _this.bbox[2] = Math.max(_this.bbox[2], lng);
            _this.bbox[3] = Math.max(_this.bbox[3], lat);
        };
        var extendByMeters = function (meters) {
            var findLatitudeFarthestFromEquator = function () {
                return Math.max(Math.abs(_this.bbox[1]), Math.abs(_this.bbox[3]));
            };
            var delta_lat = metersToLatitudeDistance(meters, findLatitudeFarthestFromEquator());
            var delta_lng = metersToLongitudeDistance(meters);
            _this.bbox[0] -= delta_lat;
            _this.bbox[1] -= delta_lng;
            _this.bbox[2] += delta_lat;
            _this.bbox[3] += delta_lng;
        };
        if (obj instanceof BoundingBox) {
            extendFromIBoundingBox(obj.bbox);
        }
        else if (isIBoundingBox(obj)) {
            extendFromIBoundingBox(obj);
        }
        else if (isLatLongPt(obj)) {
            extendFromPosition(obj.geometry.coordinates);
        }
        else if (isPosition(obj)) {
            extendFromPosition(obj);
        }
        else if (isArrayOfPositions(obj)) {
            var positions = obj;
            positions.forEach(function (position) { extendFromPosition(position); });
        }
        else if (typeof obj === 'number') {
            extendByMeters(obj);
        }
        else {
            throw new Error('invalid BoundingBox.extend argument');
        }
    };
    // TODO: requires line segment math
    // TODO: intersects(pts: GFCP.LatLongPt[]): boolean
    BoundingBox.prototype.intersects = function (obj, query_distance) {
        var _this = this;
        var intersectsIBoundingBox = function (bbox, query_distance) {
            function shouldExtend(query_distance) { return ((query_distance != null) && (query_distance > 0)); }
            var main = shouldExtend(query_distance) ? new BoundingBox(_this, query_distance) : _this;
            var overlaps_longitude = ((bbox[2] >= _this.left()) && (bbox[0] <= _this.right()));
            if (!overlaps_longitude) {
                return false;
            }
            var overlaps_latitude = ((bbox[1] <= _this.top()) && (bbox[3] >= _this.bottom()));
            return overlaps_latitude;
        };
        var intersectsPosition = function (pt, query_distance) {
            if ((query_distance != null) && (query_distance > 0)) {
                var bbox = new BoundingBox(pt, query_distance);
                return _this.intersects(bbox);
            }
            var overlaps_longitude = ((pt[0] >= _this.left()) && (pt[0] <= _this.right()));
            if (!overlaps_longitude) {
                return false;
            }
            var overlaps_latitude = ((pt[1] <= _this.top()) && (pt[1] >= _this.bottom()));
            return overlaps_latitude;
        };
        if (obj instanceof BoundingBox) {
            return intersectsIBoundingBox(obj.bbox, query_distance);
        }
        else if (isIBoundingBox(obj)) {
            return intersectsIBoundingBox(obj, query_distance);
        }
        else if (isLatLongPt(obj)) {
            return intersectsPosition(obj.geometry.coordinates, query_distance);
        }
        else if (isPosition(obj)) {
            return intersectsPosition(obj, query_distance);
        }
        else {
            throw new Error('unsupported type');
        }
    };
    return BoundingBox;
}());
exports.BoundingBox = BoundingBox;
function mergeBoundingBoxes(a, b) {
    return [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[2]),
        Math.max(a[3], b[3])
    ];
}
exports.mergeBoundingBoxes = mergeBoundingBoxes;
function createSpatialIndexForPath(path, max_unindexed_length, start, end) {
    if (max_unindexed_length == null)
        max_unindexed_length = 32;
    if (start == null) {
        start = 0;
        end = path.length - 2;
    }
    if ((end - start) >= max_unindexed_length) {
        var mid = Math.floor((start + end) / 2);
        var head = createSpatialIndexForPath(path, max_unindexed_length, start, mid);
        var tail = createSpatialIndexForPath(path, max_unindexed_length, mid + 1, end);
        var index = {
            bbox: mergeBoundingBoxes(head.bbox, tail.bbox),
            start: start, end: end,
            head: head, tail: tail
        };
    }
    else {
        var left = path[start][0];
        var bottom = path[start][1];
        var right = left;
        var top_1 = bottom;
        for (var i = start + 1; i <= end + 1; ++i) {
            var pt = path[i];
            if (pt[0] < left)
                left = pt[0];
            if (pt[0] > right)
                right = pt[0];
            if (pt[1] > top_1)
                top_1 = pt[1];
            if (pt[1] < bottom)
                bottom = pt[1];
        }
        var index = {
            bbox: [left, bottom, right, top_1],
            start: start, end: end
        };
    }
    return index;
}
exports.createSpatialIndexForPath = createSpatialIndexForPath;
function findPathSegmentsFromPointInIndex(index, query_pt, query_distance) {
    var bbox = new BoundingBox(index.bbox, query_distance);
    var feature = Array.isArray(query_pt) ? turf.point(query_pt) : query_pt;
    if (bbox.intersects(feature)) {
        if (index.head || index.tail) {
            if (index.head) {
                var segments = findPathSegmentsFromPointInIndex(index.head, feature, query_distance);
            }
            if (index.tail) {
                var tail_segments = findPathSegmentsFromPointInIndex(index.tail, feature, query_distance);
                if (tail_segments) {
                    if (segments) {
                        segments = segments.concat(tail_segments);
                    }
                    else {
                        segments = tail_segments;
                    }
                }
            }
            return segments;
        }
        else {
            return [{ start: index.start, end: index.end }];
        }
    }
    else {
        return null;
    }
}
exports.findPathSegmentsFromPointInIndex = findPathSegmentsFromPointInIndex;
// @param base_index: The index of this segment as part of an associated set of polylines.
function findCloseSegments(path, base_index, query_pt, query_distance) {
    var pt_on_road = turf.pointOnLine(path, query_pt);
    var close_segments = [];
    var distance_to_path = turf.distance(query_pt, pt_on_road) * 1000;
    if ((query_distance == null) || (distance_to_path <= query_distance)) {
        var close_segment = {
            segment_index: base_index + pt_on_road.properties.index,
            distance_to_path: distance_to_path,
            pt_on_segment: pt_on_road
        };
        close_segments.push(close_segment);
    }
    return close_segments;
}
function findCloseSegmentsNearPoint(path, index, query_pt, query_distance) {
    var all_close_segments = [];
    var feature = Array.isArray(query_pt) ? turf.point(query_pt) : query_pt;
    var path_segments = findPathSegmentsFromPointInIndex(index, feature, query_distance);
    if (path_segments) {
        path_segments.forEach(function (path_segment) {
            var coordinates = path.geometry.coordinates.slice(path_segment.start, path_segment.end + 2);
            var segment = turf.lineString(coordinates);
            var close_segments = findCloseSegments(segment, path_segment.start, feature, query_distance);
            all_close_segments = all_close_segments.concat(close_segments);
        });
    }
    return all_close_segments;
}
exports.findCloseSegmentsNearPoint = findCloseSegmentsNearPoint;
exports.test = {
    findCloseSegments: findCloseSegments
};
