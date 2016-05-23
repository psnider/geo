"use strict";
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
// This uses simple math, and doesnt account for crossing the 180 longitude.
var BoundingBox = (function () {
    function BoundingBox(obj, query_distance) {
        var _this = this;
        var initFromIBoundingBox = function (bbox) {
            _this.left = bbox.left;
            _this.bottom = bbox.bottom;
            _this.right = bbox.right;
            _this.top = bbox.top;
        };
        var initFromLatLongPt = function (pt) {
            _this.left = pt.lng;
            _this.bottom = pt.lat;
            _this.right = pt.lng;
            _this.top = pt.lat;
        };
        if (obj.left != null) {
            // assume IBoundingBox
            initFromIBoundingBox(obj);
        }
        else if (obj.lat != null) {
            // assume single Geo.LatLongPt
            initFromLatLongPt(obj);
        }
        else if (Array.isArray(obj) && (obj.length > 0) && obj[0].lat) {
            // assume Geo.LatLongPt[]
            initFromLatLongPt(obj[0]);
            this.extend(obj);
        }
        else {
            throw new Error('invalid BoundingBox.constructor');
        }
        if ((query_distance != null) && (query_distance > 0)) {
            this.extend(query_distance);
        }
    }
    BoundingBox.prototype.extend = function (obj) {
        var _this = this;
        var extendFromIBoundingBox = function (bbox) {
            _this.left = Math.min(_this.left, bbox.left);
            _this.bottom = Math.min(_this.bottom, bbox.bottom);
            _this.right = Math.max(_this.right, bbox.right);
            _this.top = Math.max(_this.top, bbox.top);
        };
        var extendFromLatLongPt = function (point) {
            _this.left = Math.min(_this.left, point.lng);
            _this.bottom = Math.min(_this.bottom, point.lat);
            _this.right = Math.max(_this.right, point.lng);
            _this.top = Math.max(_this.top, point.lat);
        };
        var extendByMeters = function (meters) {
            var findLatitudeFarthestFromEquator = function () {
                return Math.max(Math.abs(_this.bottom), Math.abs(_this.top));
            };
            var delta_lat = metersToLatitudeDistance(meters, findLatitudeFarthestFromEquator());
            var delta_lng = metersToLongitudeDistance(meters);
            _this.top += delta_lng;
            _this.bottom -= delta_lng;
            _this.left -= delta_lat;
            _this.right += delta_lat;
        };
        if (obj.left != null) {
            extendFromIBoundingBox(obj);
        }
        else if (obj.lat != null) {
            extendFromLatLongPt(obj);
        }
        else if (Array.isArray(obj) && (obj.length > 0) && obj[0].lat) {
            var points = obj;
            points.forEach(function (pt) { extendFromLatLongPt(pt); });
        }
        else if (typeof obj === 'number') {
            extendByMeters(obj);
        }
        else {
            throw new Error('invalid BoundingBox.extend argument');
        }
    };
    // TODO: requires line segment math
    // TODO: intersects(pts: Geo.LatLongPt[]): boolean
    BoundingBox.prototype.intersects = function (obj, query_distance) {
        var _this = this;
        var intersectsIBoundingBox = function (bbox, query_distance) {
            if ((query_distance != null) && (query_distance > 0)) {
                bbox = new BoundingBox(bbox, query_distance);
            }
            var overlaps_longitude = ((bbox.right >= _this.left) && (bbox.left <= _this.right));
            if (!overlaps_longitude) {
                return false;
            }
            var overlaps_latitude = ((bbox.bottom <= _this.top) && (bbox.top >= _this.bottom));
            return overlaps_latitude;
        };
        var intersectsLatLongPt = function (pt, query_distance) {
            if ((query_distance != null) && (query_distance > 0)) {
                var bbox = new BoundingBox(pt, query_distance);
                return _this.intersects(bbox);
            }
            var overlaps_longitude = ((pt.lng >= _this.left) && (pt.lng <= _this.right));
            if (!overlaps_longitude) {
                return false;
            }
            var overlaps_latitude = ((pt.lat <= _this.top) && (pt.lat >= _this.bottom));
            return overlaps_latitude;
        };
        if (obj.left != null) {
            return intersectsIBoundingBox(obj, query_distance);
        }
        else if (obj.lat != null) {
            return intersectsLatLongPt(obj, query_distance);
        }
        else {
            throw new Error('unsupported type');
        }
    };
    return BoundingBox;
}());
exports.BoundingBox = BoundingBox;
function mergeBoundingBoxes(a, b) {
    return {
        left: Math.min(a.left, b.left),
        bottom: Math.min(a.bottom, b.bottom),
        right: Math.max(a.right, b.right),
        top: Math.max(a.top, b.top)
    };
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
        var left = path[start].lng;
        var right = left;
        var top_1 = path[start].lat;
        var bottom = top_1;
        for (var i = start + 1; i <= end + 1; ++i) {
            var pt = path[i];
            if (pt.lng < left)
                left = pt.lng;
            if (pt.lng > right)
                right = pt.lng;
            if (pt.lat > top_1)
                top_1 = pt.lat;
            if (pt.lat < bottom)
                bottom = pt.lat;
        }
        var index = {
            bbox: { left: left, right: right, top: top_1, bottom: bottom },
            start: start, end: end
        };
    }
    return index;
}
exports.createSpatialIndexForPath = createSpatialIndexForPath;
function findPathSegmentsFromPointInIndex(index, query_pt, query_distance) {
    var bbox = new BoundingBox(index.bbox, query_distance);
    if (bbox.intersects(query_pt)) {
        if (index.head || index.tail) {
            if (index.head) {
                var segments = findPathSegmentsFromPointInIndex(index.head, query_pt, query_distance);
            }
            if (index.tail) {
                var tail_segments = findPathSegmentsFromPointInIndex(index.tail, query_pt, query_distance);
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
function findCloseSegments(path, base_index, query_pt, query_distance) {
    var coordinates = [];
    path.forEach(function (pt) {
        coordinates.push([pt.lng, pt.lat]);
    });
    var geo_path = turf.lineString(coordinates);
    var geo_query_pt = turf.point([query_pt.lng, query_pt.lat]);
    var pt_on_road = turf.pointOnLine(geo_path, geo_query_pt);
    var close_segments = [];
    var distance_to_path = turf.distance(geo_query_pt, pt_on_road);
    if ((query_distance == null) || (pt_on_road.properties.dist <= query_distance)) {
        var close_segment = {
            index: base_index + pt_on_road.properties.index,
            distance_to_path: distance_to_path,
            pt_on_segment: { lat: pt_on_road.geometry.coordinates[1], lng: pt_on_road.geometry.coordinates[0] }
        };
        close_segments.push(close_segment);
    }
    return close_segments;
}
function findCloseSegmentsNearPoint(path, index, query_pt, query_distance) {
    var all_close_segments = [];
    var path_segments = findPathSegmentsFromPointInIndex(index, query_pt, query_distance);
    if (path_segments) {
        path_segments.forEach(function (path_segment) {
            var segment = path.slice(path_segment.start, path_segment.end + 2);
            var close_segments = findCloseSegments(segment, path_segment.start, query_pt, query_distance);
            all_close_segments = all_close_segments.concat(close_segments);
        });
    }
    return all_close_segments;
}
exports.findCloseSegmentsNearPoint = findCloseSegmentsNearPoint;
