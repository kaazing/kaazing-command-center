/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";
//-------------------------------------------------------------------------
// A set of functions that will be linked in from the INSIDE of SVG
// documents that are created in the Command Center.
//
// They are NOT to be used OUTSIDE an SVG document, as they do things
// like refer to document.documentElement, which is <html> for a regular
// HTML document, and the SVG root node for SVG.
//-------------------------------------------------------------------------

// A variation on an implementation of getScreenBBox by Antoine Quint
// http://the.fuchsia-design.com/2006/12/getting-svg-elements-full-bounding-box.html
//
// NOTE: this doesn't work unless the code is INSIDE an SVG document, because
// the createPoint reference to 'document.documentElement' refers to the root
// document, which for HTML is the HTML node, not the SVG root node.
/**
 * Return the bounding box for an SVG element (not a group) in screen coordinates.
 */
function getScreenBBox(element) {
    var svg = element.ownerSVGElement;

    // macro to create an SVGPoint object
    function createPoint (x, y) {
        var point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        return point;
    }

    // get the complete transformation matrix
    var matrix = element.getScreenCTM();
    // get the bounding box of the target element
    var box = element.getBBox();

    // create an array of SVGPoints for each corner
    // of the bounding box and update their location
    // with the transform matrix
    var corners = [];
    var point = createPoint(box.x, box.y);
    corners.push( point.matrixTransform(matrix) );
    point.x = box.x + box.width;
    point.y = box.y;
    corners.push( point.matrixTransform(matrix) );
    point.x = box.x + box.width;
    point.y = box.y + box.height;
    corners.push( point.matrixTransform(matrix) );
    point.x = box.x;
    point.y = box.y + box.height;
    corners.push( point.matrixTransform(matrix) );
    var max = createPoint(corners[0].x, corners[0].y);
    var min = createPoint(corners[0].x, corners[0].y);

    // identify the new corner coordinates of the
    // fully transformed bounding box
    for (var i = 1; i < corners.length; i++) {
        var x = corners[i].x;
        var y = corners[i].y;
        if (x < min.x) {
            min.x = x;
        }
        else if (x > max.x) {
            max.x = x;
        }
        if (y < min.y) {
            min.y = y;
        }
        else if (y > max.y) {
            max.y = y;
        }
    }
    
    var bbox = {x: min.x, y:min.y, width:(max.x - min.x), height:(max.y - min.y)};
    return bbox;
}

/**
 * Compute the screen bounding box for an element (can be anything including 'svg').
 */
function computeSVGBoundingBox(element) {
    var bbox;

    if (element.nodeName === "svg" || element.nodeName === "g") {
        var children = element.childNodes;

        var xMin=Infinity, xMax=-Infinity, yMin=Infinity, yMax=-Infinity;

        if (children && children.length > 0) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];

                bbox = computeSVGBoundingBox(child);

                xMin = Math.min(xMin, bbox.x);
                xMax = Math.max(xMax, bbox.x + bbox.width);
                yMin = Math.min(yMin, bbox.y);
                yMax = Math.max(yMax, bbox.y + bbox.height);
            }
        } else {
            xMin = 0;
            yMin = 0;
            xMax = 0;
            yMax = 0;
        }

        bbox = {x: xMin, y: yMin, width: (xMax - xMin), height: (yMax - yMin)};
    } else if (element.getScreenBBox) {
        bbox = element.getScreenBBox();
    } else {
        bbox = getScreenBBox(element);
    }

    return bbox;
}
