/*
 * Copyright (c) 2007-2014 Kaazing Corporation. All rights reserved.
 * 
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//-------------------------------------------------------------------------
// Various declarations to system-level stuff that don't fit into our 
// objects as defined.
//-------------------------------------------------------------------------
window.onerror = function(msg, url, linenumber) {
    alert('Error message: '+msg+'\nURL: '+url+'\nLine Number: '+linenumber)
    return false;
}


// Addition to the HTML5 canvas context to allow us to do dashed lines
var CP = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
if (CP && CP.lineTo) {
    CP.dashedLine = function(x,y,x2,y2,dashArray){
        if (!dashArray) dashArray=[10,5];
        if (dashLength==0) dashLength = 0.001; // Hack for Safari
        var dashCount = dashArray.length;
        this.moveTo(x, y);
        var dx = (x2-x), dy = (y2-y);
        var slope = dy/dx;
        var distRemaining = Math.sqrt( dx*dx + dy*dy );
        var dashIndex=0, draw=true;
        while (distRemaining>=0.1){
            var dashLength = dashArray[dashIndex++%dashCount];
            if (dashLength > distRemaining) dashLength = distRemaining;
            var xStep = Math.sqrt( dashLength*dashLength / (1 + slope*slope) );
            if (dx<0) xStep = -xStep;
            x += xStep
            y += slope*xStep;
            this[draw ? 'lineTo' : 'moveTo'](x,y);
            distRemaining -= dashLength;
            draw = !draw;
        }
    }
}

var BYTES_IN_KIB = 1024;
var BYTES_IN_MIB = 1048576;
var BYTES_IN_GIB = 1073741824;


//-------------------------------------------------------
// A little utility to allow sprintf-style formatting
// Args are {0}, {1}, etc.
// Call as str.format(arg1, arg2, ...)
//-------------------------------------------------------
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
            ;
        });
    };
}

//-------------------------------------------------------
// Trivial prototype for 'a string starts with X'.
// Returns true or false
// NOT IN IE9. Introduce in JS 1.8.6
//-------------------------------------------------------
if (!String.prototype.startsWith)
{
    String.prototype.startsWith=function(str) {
        return (this.indexOf(str, 0) === 0);
    }
}

//-------------------------------------------------------
// Trivial prototype for 'a string ends with X'.
// Returns true or false
// NOT IN IE9. Introduce in JS 1.8.6
//-------------------------------------------------------
if (!String.prototype.endsWith)
{
    String.prototype.endsWith=function(str) {
        return (this.lastIndexOf(str) === (this.length - str.length));
    }
}

//-------------------------------------------------------
// Return true if the string consists entirely of digits
//-------------------------------------------------------
String.prototype.isDigits=function() {
    return (/\D/.test(this) === false);
}

//-------------------------------------------------------
// Support 'trim' functionality
//-------------------------------------------------------
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g,"");
    }
}

if (!String.prototype.ltrim) {
    String.prototype.ltrim = function() {
        return this.replace(/^\s+/g,"");
    }
}

if (!String.prototype.rtrim) {
    String.prototype.rtrim = function() {
        return this.replace(/\s+$/g,"");
    }
}

//-------------------------------------------------------
// Get a mouse event into a constant format.
//-------------------------------------------------------
function fixupMouse( event ) {

    event = event || window.event;

    var e = { event: event,
              target: event.target ? event.target : event.srcElement,
              which: event.which ? event.which :
              event.button === 1 ? 1 :
              event.button === 2 ? 3 : 
              event.button === 4 ? 2 : 1,
              x: event.x ? event.x : event.clientX,
              y: event.y ? event.y : event.clientY
            };
    return e;
}

/**
 * Convert a number of bytes into a display string that looks
 * a little more reasonable (e.g. B, KB, MB, GB).
 * The incoming value is actual bytes as an integer.
 * 'places' indicates the number of places after the
 * decimal point, not the overall precision.
 */
function cvtBytes(bytes, units, places) {
    if (units === "B") {
        // for bytes, places is irrelevant
        return bytes + " B";
    } else if (units === "KB") {
        return (bytes / 1024.0).toFixed(places) + " KB";
    } else if (units === "MB") {
        return (bytes / 1048576.0).toFixed(places) + " MB";
    } else if (units === "GB") {
        return (bytes / 1073741824.0).toFixed(places) + " GB";
    } else {
        return bytes + " (?)";  // unknown or empty units, don't convert
    }
}

/**
 * A function used by several items (see Gateway.metadata)
 * to convert a number of bytes into a more nicely-formatted
 * string (e.g. 2.342 (MB)
 */
function bytesDisplayFn(bytes) {
    return cvtBytes(bytes, "MB", 2); 
};

/**
 * A function used by several items (see Gateway.metadata)
 * to convert a service status number into a more nicely-formatted
 * string
 */
function statusDisplayFn(status) {
    var statusVals = ["Unknown", "Running", "Stopped", "Stop Requested", 
                      "Restart Requested", "Start Requested"];
    if (status < 1 || status > 5) {
        status = 0;
    }
    return statusVals[status];
};

/**
 * for now the logged-in session data is rather long and nasty,
 * so we're going to 'format' it to basically nothing
 */
function loggedInSessionDataDisplayFn(val) {
   return "[Coming later...]";
}

/**
 * Convert a number of ticks (1/100 seconds) to days 
 * DD:HH:MM:SS.xx.  We know the value is >= 0.
 */
function ticksToDays(totalTicks) {
    // because we only have "real" numbers, the best way to
    // get an integer on division is to remove the modulus, then divide
    var numTicks = totalTicks % 100; 

    var seconds = Math.floor((totalTicks - numTicks) / 100);  // total secs, without ticks
    var days = Math.floor(seconds / 86400);
    seconds = seconds - (days * 86400);  // seconds remaining
    var hours = Math.floor(seconds / 3600);
    seconds = seconds - (hours * 3600);
    var minutes = Math.floor(seconds / 60);
    seconds = seconds - (minutes * 60);

    var val = (days === 0 ? "00" : "" + days) + ":";
    if (hours < 10) {
        val += "0";
    }
    val += hours;
    val += ":";

    if (minutes < 10) {
        val += "0";
    }
    val += minutes;
    val += ":";
    
    if (seconds < 10) {
        val += "0";
    }
    val += seconds;
    val += ".";

    if (numTicks < 10) {
        val += "0";
    }
    val += numTicks;

    return val;
};

/**
 * Given an OID string (e.g. '1.3.6.1.2.1.29197.xxx.yyy', encode it in BER format 
 * for passing to the SNMP functions to send it over.  
 * We get responses with the full string (1.3.6. etc), so we need values that
 * we can compare with that.
 */
function encodeOID(oidStr) {
    if (oidStr.charAt(0) === '.') {
        oidStr = oidStr.substring(1);
    }

    var oidParts = oidStr.split(".");
    var result = [];

    // by SNMP convention the first two numbers of the
    // OID are combined into a single value (these are
    // always 1.3, but we'll calculate anyway.
    var val = parseInt(oidParts[0], 10);
    var val2 = parseInt(oidParts[1], 10);

    result.push((40 * val) + val2);
    var currPos = result.length;  // index of next insert

    for (var i = 2; i < oidParts.length; i++) {
        val = parseInt(oidParts[i], 10);
        // convert the individual value to the BER encoding of 7 bits
        // per byte with bit 8 indicating "more coming".
        // Since the high-order bits need to go first in our
        // resulting array, for simplicity we'll pull them off
        // into a secondary array first, 7 bits at a time.
        if (val === 0) {
            result.push(0);
            continue;
        } 

        var nums = [];
        while (val > 0) {
            nums.push(val & 0x7F);
            val = val >>> 7;  // shift with zero insert
        }

        for (var j = nums.length - 1; j >= 0; j--) {
            if (j > 0) {
                result.push(nums[j] | 128);  // set high bit
            } else {
                result.push(nums[j]);
            }
        }
    }

    return result;
};

/**
 * Given an array of OID strings, encode all of them and return
 * a new array with them in the same order.
 */
function encodeOIDList(oidList) {
    var numOIDs = oidList.length;
    var results = [];
    for (var i = 0; i < numOIDs; i++) {
        results.push(encodeOID(oidList[i]));
    }
    return results;
}

/**
 * Trivial function to do (as close as we can in Javascript) the
 * same thing that Swing's invokeLater() method does (i.e. queue
 * something for later execution, generally so we can give up the
 * thread of execution for something else to run.)
 * @param fn - the function to execute.
 */
function invokeLater(fn, delayMS, repeatIntervalMS) {
    if (!delayMS) {
        delayMS = 0;
    }

    var t;

    if (repeatIntervalMS && repeatIntervalMS > 0) {
        t = window.setInterval(fn, repeatIntervalMS);
    } else {
        t = window.setTimeout(fn, delayMS);
    }

    return t;
}

/**
 * Return the size of the window viewport.
 * Works on IE6+ and all later standard browsers.
 */
function viewport()
{
    var e = window, a = 'inner';

    if (!('innerWidth' in window)) {
        a = 'client';
        e = document.documentElement || document.body;
    }

    return { width : e[a+'Width' ], height : e[a+'Height'] };
}

/**
 * In YUI stuff, given a node ID selector and a new value, remove any children of the
 * node and replace them with a new text node
 */
function replaceTextValue(nodeSelector, val) {
    var valStr = (val === undefined || val === null ? "" : val);
//    var textNode = document.createTextNode(val);
    Y.one(nodeSelector).set('text', valStr);
}

/**
 * Quick utility generally used for formatting time hours minutes and seconds
 */
function addZero(val) {
    if (val < 10) {
        return "0" + val;
    } else {
        return val;
    }
}

/**
 * Reworking of 'typeof' operator to fix issues with null (which returns 'object',
 * not 'null') and an array (which returns 'object', not 'array'.)
 * See javascript.crockford.com/remedial.html.
 */
function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (Object.prototype.toString.call(value) === '[object Array]') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}

/**
 * Returns true if 'o' is an object containing no enumerable members
 * See javascript.crockford.com/remedial.html.
 */
function isEmptyObject(o) {
    var i, v;
    if (typeOf(o) === 'object') {
        for (i in o) {
            v = o[i];
            if (v !== undefined && typeOf(v) !== 'function') {
                return false;
            }
        }
    }
    return true;
}

/**
 * Utility function to check for 'empty' or non-useful values.
 * Note that 0 is not considered "empty" (in contrast to normal JS tests)
 */
function isEmptyValue(value) {
    return (value === undefined || 
            value === null || 
            value === "" || 
            (typeOf(value) === "array" && value.length === 0) ||
            (typeOf(value) === "object" && isEmptyObject(value)));
}

function isEmpty(value) {
    return (value === undefined || 
            value === null || 
            value === "");
}

/**
 * Given a Javascript date, formats it to something we can use
 */
function formatDateTime(dateObj) {
    return addZero(dateObj.getMonth() + 1) + "/" + 
        addZero(dateObj.getDate()) + "/" +
        addZero(dateObj.getYear() - 100) + " " +        // Year is from 1900 as year 0, we want 2 digits.
        addZero(dateObj.getHours()) + ":" + 
        addZero(dateObj.getMinutes()) + ":" + 
        addZero(dateObj.getSeconds());
}

function removeAllChildren(selector) {
    var obj = Y.one(selector);
    if (obj) {
        obj.get('childNodes').remove();
    }
}

function isEmpty(val) {
    return (val === undefined || val === null || val.length === 0);
}

function compareNumbers(n1, n2, desc, nullDefault) {
    if ((n1 === null || n1 === undefined) && nullDefault !== undefined) {
        n1 = nullDefault;
    }
    if ((n2 === null || n2 === undefined) && nullDefault !== undefined) {
        n2 = nullDefault;
    }

    return (desc ? n2 - n1 : n1 - n2);
}

// Compare two strings, where if one is undefined/null/empty it is 
// 'behind' or 'higher than' the other, so that ascending order
// sort puts nulls at the bottom
function compareStrings(s1, s2) {
    if (isEmpty(s1)) {
        return isEmpty(s2) ? 0 : 1;
    } else if (isEmpty(s2)) {
        return -1;
    } else if (s1 < s2) {
        return -1;
    } else {
        return s1 === s2 ? 0 : 1;
    }
}

function formatUptime(uptime) {
    var days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    var timeLeft = (uptime - (1000 * 60 * 60 * 24 * days));
    var hours = Math.floor(timeLeft / (1000 * 60 * 60));

    timeLeft = timeLeft - (1000 * 60 * 60 * hours);
    var minutes = Math.floor(timeLeft / (1000 * 60));

    timeLeft = timeLeft - (1000 * 60 * minutes);
    var seconds = Math.floor(timeLeft / 1000);

    var uptimeStr = "";

    // If uptime < 10 seconds, just show n. + ms. Otherwise,
    // round off ms.
    if (uptime < 10000) {
        uptimeStr = (uptime / 1000).toFixed(3);
    } else {
        if (days > 0) {
            uptimeStr = uptimeStr + days + ":";
        }

        if (uptimeStr.length > 0) {
            uptimeStr = uptimeStr + addZero(hours) + ":";
        } else if (hours > 0) {
            uptimeStr = uptimeStr + hours + ":";
        }

        if (uptimeStr.length > 0) {
            uptimeStr = uptimeStr + addZero(minutes) + ":";
        } else if (minutes > 0) {
            uptimeStr = uptimeStr + minutes + ":";
        }

        if (uptimeStr.length > 0) {
            uptimeStr = uptimeStr + addZero(seconds);
        } else if (seconds > 0) {
            uptimeStr = uptimeStr + seconds;
        }
    }

    return uptimeStr;
}

/**
 * Given a model object, run up the targets hierarchy, dumping out the objects
 * above (assuming there is only one, but we'll list as many as given.
 */
function dumpEventTargets(obj) {
    if (!obj) {
        return;
    }

    return;  // XXX remove this later for debug stuff

    var targets = obj.getTargets();
    if (obj.name === undefined) {
        CC.console.debug("For " + obj.constructor.name + ", no targets");
    } else if (!targets || targets.length === 0) {
        CC.console.debug("For " + obj.name + ", 0 targets");
    } else {
        CC.console.debug("For " + obj.name + ", " + targets.length + " targets");
        targets.forEach(function(target) {
            CC.console.debug("  " + (target.name === undefined ? target.constructor.name : target.name));
        });
        dumpEventTargets(targets[0]);
    }
}

function dumpNotificationData(notificationData) {
    CC.console.debug("#### Notification data:");
    for (var k in notificationData) {
        if (notificationData.hasOwnProperty(k)) {
            CC.console.debug("Key: " + k + ", Value: " + notificationData[k]);
        }
    }
}

/**
 * Given a YUI object and attribute name, dump the attribute value,
 * expanding the contents. The offset is optional, indicating how
 * far to indent the output
 */
function dumpAttr(obj, attrName, offset) {
    if (offset === null || offset === undefined) {
        offset = 0;
    }

    dumpValue(attrName, obj.get(attrName), offset);
}

function dumpValue(attrName, value, offset) {
    var type = typeOf(value);

    if (type === 'object') {
        dumpObject(attrName, value, offset);
    } else if (type === 'array') {
        dumpArray(attrName, value, offset);
    } else {
        dumpScalar(attrName, value, offset);
    } 
}

function dumpObject(attrName, obj, offset) {
    CC.console.debug(genSpaces(offset) + attrName + ":");
    if (obj) {
        for (var propName in obj) {
            if (obj.hasOwnProperty(propName)) {
                var propVal = obj[propName];
                dumpValue(propName, propVal, offset + 2);
            }
        }
    } else {
        CC.console.debug(genSpaces(offset+2) + "NULL");
    }
}

function dumpArray(attrName, arr, offset) {
    CC.console.debug(genSpaces(offset) + attrName + ":");
    if (arr) {
        CC.console.debug(genSpaces(offset + 2) + "[");
        for (var i = 0; i < arr.length; i++) {
            dumpValue(i + ": ", arr[i], offset + 4);
        }
        CC.console.debug(genSpaces(offset + 2) + "]");
    } else {
        CC.console.debug("    NULL");
    }
}

function dumpScalar(attrName, scalar, offset) {
    CC.console.debug(genSpaces(offset) + attrName + ": " + scalar);
}

function genSpaces(numSpaces) {
    var spaces = "";
    for (var i = 0; i < numSpaces; i++) {
        spaces += " ";
    }
    return spaces;
}

/**
 * Given a JS object, gather all local property names into
 * an array and sort them in ascending order, then return
 * the sorted array.
 */
function getSortedKeys(obj) {
    var keys = [];
    for (var name in obj) {
        if (obj.hasOwnProperty(name)) {
            keys.push(name);
        }
    }
    keys.sort();
    return keys;
}

/**
 * Similar to parseStringifiedArray and Map, but for strings that
 * are JSON objects. We want the same null/empty comparison here.
 */
function parseJSON(val) {
    if (val === null || val === undefined) {
        val === null;
    } else if (val === "" || val === "{}") {
        val = {}; // empty object
    } else {
        val = JSON.parse(val);
    }

    return val;
}

/**
 * Function to compare numbers that may be coming from a YUI model object.
 * We'll allow for undefined/null/"" to be NOT considered equal.
 */
function equalModelNumbers(s1, s2) {
    if (s1 === undefined) {
        return (s2 === undefined);
    } else if (s1 === null) {
        return (s2 === null);
    } else {
        var value = (s1 === s2);
        return value;
    }
}

/**
 * Function to compare strings that may be coming from a YUI model object.
 * For some reason zero-length strings don't compare equal.
 * We'll allow for undefined/null/"" to be NOT considered equal.
 */
function equalModelStrings(s1, s2) {
    if (s1 === undefined) {
        return (s2 === undefined);
    } else if (s1 === null) {
        return (s2 === null);
    } else if (s1.length === 0) {
        return (s2.length === 0);
    } else {
        var value = (s1 === s2);
        return value;
    }
}

/**
 * Function to compare arrays that may be coming from a YUI model object.
 * We'll allow for undefined/null to be NOT considered equal.
 * 
 */
function equalModelArrays(a1, a2) {
    if (a1 === undefined) {
        return (a2 === undefined);
    } else if (a1 === null) {
        return (a2 === null);
    } else {
        var value = equalArrays(a1, a2);  // see Array.equals() above
        return value;
    }
}

function equalModelObjects(o1, o2) {
    if (o1 === undefined) {
        return (o2 === undefined);
    } else if (o1 === null) {
        return (o2 === null);
    } else {
        var value = equalObjects(o1, o2);  // see Object.equals() above
        return value;
    }
}

/**
 * XXX TEMPORARY replacement for the function 'Object.prototype.equals'
 * defined above. This is going to make the same assumptions as that one,
 * namely that the first object is defined, the second may not be.
 * GO BACK TO USING THE RIGHT ONE ASAP!
 */
function equalObjects(o1, o2) {
    if (!o2) {
        return false;
    }

    var p;
    for(p in o1) {
        if (typeof(o2[p]) === 'undefined') {
            return false;
        }
    }

    for(p in o1) {
        if (o1[p]) {
            switch(typeof(o1[p])) {
            case 'object':
                if (!equalObjects(o1[p], o2[p])) { 
                    return false; 
                } 
                break;
            case 'function':
                if (typeof(o2[p]) === 'undefined' ||
                    (p != 'equals' && o1[p].toString() != o2[p].toString())) {
                    return false;
                }
                break;
            default:
                if (o1[p] != o2[p]) { 
                    return false; 
                }
            }
        } else {
            if (o2[p]) {
                return false;
            }
        }
    }

    for(p in o2) {
        if(typeof(o1[p]) === 'undefined') {return false;}
    }

    return true;
}


/**
 * XXX TEMPORARY replacement for the function 'Array.prototype.equals'
 * defined above. This is going to make the same assumptions as that one,
 * namely that the first array is defined and is an array, the second 
 * may not be.
 * GO BACK TO USING THE RIGHT ONE ASAP!
 */
function equalArrays(a1, a2) {
    if (typeOf(a1) !== 'array') {
        return false;
    }

    if (typeOf(a2) !== 'array') {
        return false;
    }

    if (a1.length != a2.length) {
        return false;
    }

    for (var i = 0; i < a2.length; i++) {
        // use 'equalObjects' to compare objects, if they
        // are both objects
        var item1 = a1[i];
        var item2 = a2[i];

        if (typeOf(item1) === 'array') {
            if (typeOf(item2) !== 'array') {
                return false;
            } else if (!equalArrays(item1, item2)) {
                return false;
            }
        } else if (typeOf(item1) === 'object') {
            if (typeOf(item2) !== 'object') {
                return false;
            } else if (!equalObjects(item1, item2)) {
                return false;
            }
        } else if (a1[i] !== a2[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Given an array and a comparison function, applies the comparison function
 * to the members of the array, in order, until one returns 'true'.
 * Returns that item. If none is found, returns null.
 */
function findFirst(arr, comparisonFn) {
    var arrLen = arr.length;
    for (var i = 0; i < arrLen; i++) {
        if (comparisonFn(arr[i])) {
            return arr[i];
        }
    }

    return null;
}

/**
 * Calculates the outer height for the given DOM element, including the 
 * contributions of padding, border, and margin.
 * 
 * @param el - the element of which to calculate the outer height
 */
function calculateElementOuterHeight(yuiNode) {
    var height = 0;
    var attributeHeight = 0;
    var attributes = [
        'height', 
        'border-top-width', 
        'border-bottom-width', 
        'padding-top', 
        'padding-bottom', 
        'margin-top', 
        'margin-bottom'
    ];

    for (var i = 0; i < attributes.length; i++) {

        // for most browsers, getStyle() will get us a value for the attribute 
        // that is parse-able into a number
        attributeHeight = parseInt(YAHOO.util.Dom.getStyle(el, attributes[i]), 10);

        // if the browser returns something that is not parse-able, like "auto", 
        // try getComputedStyle(); should get us what we need
        if (isNaN(attributeHeight)) {
            attributeHeight = parseInt(YAHOO.util.Dom.getComputedStyle(el, attributes[i]), 10);
        }

        // if we have an actual numeric value now, add it to the height, 
        // otherwise ignore it
        if (!isNaN(attributeHeight)) {
            height += attributeHeight;
        }
    }

    return isNaN(height) ? 0 : height;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * XXX TEMPORARY replacement for the function 'Array.prototype.remove()'
 * defined above. This is going to make the same assumptions as that one,
 * namely that the first array is defined and is an array.
 * GO BACK TO USING THE RIGHT ONE ASAP!
 */
function arrayRemove(arr, elt) {
    var index = arr.indexOf(elt);
    if (index >= 0) {
        arr.splice(index, 1);
    }

    return null;
}

function arrayMax(array) {
    return Math.max.apply(Math, array);
}

function arrayMin(array) {
    return Math.min.apply(Math, array);
}

/**
 * For table display, check a supposed number value. If null or
 * undefined, return the empty string. If okay, return the number as is.
 */
function formatNumber(num) {
    return (num === undefined || num === null ? "" : num);
}

function formatNumberToLocale(num) {
    if (num === undefined || num === null || num === "") {
        return "";
    } 

    if (typeOf(num) === 'string') {
        num = parseFloat(num);
    }

    var val = num.toLocaleString();
    return val;
}

/**
 * For table display, check a supposed float value. If null or
 * undefined, return the empty string. If okay, return the number
 * to a particular number of decimal places. If places is not set,
 * don't format it.
 */
function formatFloat(num, places) {
    if (num === undefined || num === null) {
        return "";
    } else if (places !== undefined) {
        return parseFloat(num).toFixed(places);
    } else {
        return num;
    }
}


/**
 * Convert a regular number to a units string. For example,
 * if x = 1000, the value is "thousands". If x = 1000000,
 * the value = "millions", etc.
 */
function numberUnits(val) {
    val = Math.abs(val);

    if (val < 1000) {
        return "";
    } else if (val < Math.pow(10,6)) {
        return "thousands";
    } else if (val < Math.pow(10,9)) {
        return "millions";
    } else if (val < Math.pow(10,12)) {
        return "billions";
    } else if (val < Math.pow(10,15)) {
        return "trillions";
    } else {
        return "gazillions";
    }
}

function numberRateUnits(val) {
    var val = numberUnits(val);
    return (val == "" ? "#/second" : val + "/second");
}

function byteUnits(val) {
    val = Math.abs(val);

    if (val < Math.pow(2, 10)) {
        return "";
    } else if (val < Math.pow(2, 20)) {
        return "KiB";
    } else if (val < Math.pow(2, 30)) {
        return "MiB";
    } else if (val < Math.pow(2, 40)) {
        return "GiB";
    } else if (val < Math.pow(2, 50)) {
        return "TiB";
    } else if (val < Math.pow(2, 60)) {
        return "PiB";
    }
}

function byteRateUnits(val) {
    var val = byteUnits(val);
    return (val == "" ? "B/second" : val + "/second");
}

/**
 * Convert a memory size in bytes to a string using the 
 * most appropriate units (or the specified units if
 * given.
 * @param sizeInBytes the memory size in bytes to be converted
 * @param units the units to conver to (optional). Valid values
 * are 'KiB', 'MiB', 'GiB'. If not specified, the closest
 * appropriate value will be used.
 */
function memorySizeString(sizeInBytes, units) {
    if (sizeInBytes === null || sizeInBytes === undefined) {
        return "";
    }

    if (!units) {
        if (sizeInBytes < BYTES_IN_KIB) {
            units = "B";
        } else if (sizeInBytes < BYTES_IN_MIB) {
            units = "KiB";
        } else if (sizeInBytes < BYTES_IN_GIB) {
            units = "MiB";
        } else {
            units = "GiB";
        }
    } 

    var value;

    switch (units) {
    case "KiB":
        value = sizeInBytes / BYTES_IN_KIB;
        break;
    case "MiB":
        value = sizeInBytes / BYTES_IN_MIB;
        break;
    case "GiB":
        value = sizeInBytes / BYTES_IN_GIB;
        break;
    default: 
        units = "B";
        value = sizeInBytes;
    }

    if (units !== "B") {
        value = value.toFixed(2);
    }

    return "" + value + " " + units;
}

/**
 * Convert a memory throughput value (bytes/second) to a string using the 
 * most appropriate units (or the specified units if
 * given.
 */
function memoryThroughputString(throughputInBytesPerSec, units) {
    return memorySizeString(throughputInBytesPerSec, units) + "/s";
}

// Various utilities for fiddling with the DOM
function createTABLE(parent, tableClass) {
    return createNode(parent, 'TABLE', tableClass);
}

function createTHEAD(table, theadClass) {
    return createNode(table, 'THEAD', theadClass);
}

function createTR(table, rowClass) {
    return createNode(table, 'TR', rowClass);
}

function createTD(parent, tdClass) {
    return createNode(parent, 'TD', tdClass);
}

function createTH(parent, thClass) {
    return createNode(parent, 'TH', thClass);
}

function createDIV(parent, divClass) {
    return createNode(parent, 'DIV', divClass);
}

function createH(parent, level) {
    return createNode(parent, 'H' + level);
}

function createSELECT(parent, selectClass) {
    return createNode(parent, 'SELECT', selectClass);
}

/**
 * Create an option in a selector. 
 * NOTE: the 'label' value should be regular text. It
 * Will be escaped as necessary.
 */
function createOPTION(parent, optionClass, label, value) {
    var option = createNode(parent, 'OPTION', optionClass);

    // 'falsey' values are allowed for labels and values, so 
    // we have to specifically compare only for undefined or null here
    if (label !== undefined && label !== null) {
        option.setHTML(Y.Escape.html(label));
    }
    if (value !== undefined && value !== null) {
        option.set('value', value)
    }
    return option;
}

function createLINK(parent, href, linkClass) {
    var link = createNode(parent, 'A', linkClass);
    if (href) {
        link.set('href', href);
    }
    return link;
}

function createIMG(parent, imageSrc, imgClass) {
    var img = createNode(parent, 'IMG', imgClass);
    if (imageSrc) {
        img.set('src', imageSrc);
    }
    return img;
}

function createSPAN(parent, text, spanClass) {
    var span = createNode(parent, 'SPAN', spanClass);
    if (text) {
        span.set('text', text);
    }
    return span;
}

function createLI(parent, liClass) {
    return createNode(parent, 'LI', liClass);
}

function createUL(parent, ulClass) {
    return createNode(parent, 'UL', ulClass);
}

function createINPUT(parent, inputType, inputClass) {
    var input = createNode(parent, 'INPUT', inputClass);
    if (inputType) {
        input.set('type', inputType);
    }
    return input;
}

function createBUTTON(parent, label, buttonClass) {
    var button = createNode(parent, 'BUTTON', buttonClass);
    if (label) {
        button.setHTML(label);
    }
    return button;
}

function createLABEL(parent, text, labelClass) {
    var label = createNode(parent, 'LABEL', labelClass);
    if (text !== undefined && text !== null) {
        label.setHTML(Y.Escape.html(text));
    }
    return label;
}

function createCANVAS(parent, canvasClass) {
    return createNode(parent, 'CANVAS', canvasClass);
}

function createNode(parent, nodeType, nodeClass) {
    var node = parent.create('<' + nodeType + '>');
    if (nodeClass) {
        node.addClass(nodeClass);
    }
    parent.append(node);
    return node;
}

/**
 * Compare two JS Date objects to see if they refer to the same day.
 * The following is gross
 */
function sameDate(d1, d2) {
    return (d1.toDateString() == d2.toDateString());
}

/**
 * Get the current time and truncate it to the seconds, then return
 * that value in MS.
 */
function roundToSeconds(dateMS) {
    return Math.round(dateMS / 1000);
}

/**
 * Format a date in the same style we show in the Gateway log, using
 * local time. An example  '12 Jun 2013 17:19:31 GMT-0700 (PDT)'
 */     
function formatCommandCenterDate(dateObj) {
    var result = "" + 
        dateObj.getDate() + " " +
        CC.Constants.MONTHS[dateObj.getMonth()].substring(0,3) + " " +
        dateObj.getFullYear() + " " + 
        addZero(dateObj.getHours()) + ":" + 
        addZero(dateObj.getMinutes()) + ":" + 
        addZero(dateObj.getSeconds()) + " " +
        "GMT";
    // get the timezone offset from GMT in minutes ( == yours - GMT, which 
    // means the value for Pacific time is POSITIVE).
    var tzOffset = dateObj.getTimezoneOffset();
    if (tzOffset == 0) {
        result += "+0000";
    } else {
        // Switch the sign so we show the value the way everybody expects.
        result += (tzOffset > 0 ? '-' : '+');
        tzOffset = Math.abs(tzOffset);
        result += addZero(Math.floor(tzOffset / 60));
        result += addZero(tzOffset % 60);
    }

    return result;
}

//==================================================
// Some 'summary' functions for the dashboard charts.
// Each function is passed an array of data objects (for the
// various data lines in the chart) and the attribute name
// from the chart definition. They must return a string.
// They can assume the data objects are whatever they need.
//==================================================

/**
 * Return a string of HTML that will be added to the chart footer 
 * to show the most recent total (as of the latest data point)
 * of all the data items.
 *
 * @param dataItemVals an object containing a property/valueArray pair
 * for each dataItem.
 * Each value array consists of [time, val] entries. For example, each
 * dataItemVal might be an array of values for 'totalCurrentSessions'
 * for the given gatewayModel.
 * @valuesMultiplier the valuesMultiplier for the given data items, so
 * we can correctly report totals with multipliers > 1.
 * @lastVisibleTime we want to show the total as of the last time the
 * user SEES, not at which data exists. This lets the user pan around
 * and see the total at each time he's interested in.
 */
function totalSummaryFn(dataItemVals, valuesMultiplier, lastVisibleTime) {
    var total = 0, val, i, j;

    if (dataItemVals) {
        for (var key in dataItemVals) {
            if (dataItemVals.hasOwnProperty(key)) {
                var valArray = dataItemVals[key];

                if (valArray.length > 0) {
                    // we need to find the last item at the last visible time, as 
                    // we want to report the total as of then, NOT as of the last
                    // data item or lastDisplayableTime.
                    for (j = valArray.length - 1; j >= 0; j--) {
                        if (valArray[j][0] < lastVisibleTime) {
                            break;
                        }
                    }

                    if (j >= 0) {
                        val = valArray[j][1] / valuesMultiplier;
                        total += val;
                    }
                }
            }
        }
    }

    return '<div class="summaryLabel">Total: </div>' + 
        '<div class="summaryValue">' + total + '<div>';
}

/**
 * Return a string of HTML that will be added to the chart footer 
 * to show the most recent min, max and average value (as of the 
 * latest data point) of all the data items.
 *
 * @param dataItemVals an object containing a property/valueArray pair
 * for each dataItem.
 * Each value array consists of [time, val] entries. For example, each
 * dataItemVal might be an array of values for 'totalCurrentSessions'
 * for the given gatewayModel.
 * @param valuesMultiplier the values are real, not adjusted for the
 * chart's display valuesMultiplier. Given that we expect the summary
 * info to show in the display units, each data value is divided here
 * by the valuesMultiplier.
 * @lastVisibleTime we want to show the total as of the last time the
 * user SEES, not at which data exists. This lets the user pan around
 * and see the total at each time he's interested in.
 */
function minMaxAverageSummaryFn(dataItemVals, valuesMultiplier, lastVisibleTime) {
    var first = true;
    var total = 0;
    var min = 0;
    var max = 0;
    var avg = 0;
    var numDataItems = 0;

    if (dataItemVals) {
        for (var key in dataItemVals) {
            if (dataItemVals.hasOwnProperty(key)) {
                numDataItems++;
                var valArray = dataItemVals[key];

                if (valArray.length > 0) {
                    // we need to find the last item at the last visible time, as 
                    // we want to report the total as of then, NOT as of the last
                    // data item or lastDisplayableTime.
                    for (j = valArray.length - 1; j >= 0; j--) {
                        if (valArray[j][0] < lastVisibleTime) {
                            break;
                        }
                    }

                    if (j >= 0) {
                        val = valArray[j][1] / valuesMultiplier;

                        if (first) {
                            min = val;
                            max = val;
                            first = false;
                        } else {
                            min = Math.min(min, val);
                            max = Math.max(max, val);
                        }

                        total += val;
                    }
                }
            }
        }

        if (numDataItems > 0) {
            avg = total / numDataItems;
        }
    }

    return '<div class="summaryLabel">Min: </div>' + 
        '<div class="summaryValue">' + min.toFixed(2) + '</div>' + 
        '<div class="summaryLabel">&nbsp;&nbsp;&nbsp;&nbsp;Max: </div>' + 
        '<div class="summaryValue">' + max.toFixed(2) + '</div>' + 
        '<div class="summaryLabel">&nbsp;&nbsp;&nbsp;&nbsp;Average: </div>' + 
        '<div class="summaryValue">' + avg.toFixed(2) + '</div>';
}

/**
 * Similar to minMaxAverageSummaryFn, but for the case where each of
 * the dataItems has not a single array of values (line CPU average), but
 * multiple arrays of values (like CPU 'all', which has an array for each CPU/core,
 * or NIC 'all', which has an array for each NIC).
 * 
 * Return a string of HTML that will be added to the chart footer 
 * to show the most recent min, max and average value (as of the 
 * latest data point) of all the data items.
 *
 * @param dataItemVals an object containing a property/valueArray pair
 * for each dataItem.
 * Each value array consists of [time, val] entries. For example, each
 * dataItemVal might be an array of values for 'totalCurrentSessions'
 * for the given gatewayModel.
 * @param valuesMultiplier the values are real, not adjusted for the
 * chart's display valuesMultiplier. Given that we expect the summary
 * info to show in the display units, each data value is divided here
 * by the valuesMultiplier.
 * @lastVisibleTime we want to show the total as of the last time the
 * user SEES, not at which data exists. This lets the user pan around
 * and see the total at each time he's interested in.
 */
function minMaxAverageMultipleSummaryFn(dataItemVals, valuesMultiplier, lastVisibleTime) {
    var first = true;
    var total = 0;
    var min = 0;
    var max = 0;
    var avg = 0;
    var numDataItems = 0;

    if (dataItemVals) {
        for (var key in dataItemVals) {
            if (dataItemVals.hasOwnProperty(key)) {
                numDataItems++;

                var itemValArray = dataItemVals[key];
                
                // itemValArray is the array of multiple items, each of which is
                // an array of values. Just go through all of all of them.
                if (itemValArray.length > 0) {
                    var dataItemTotal = 0;

                    for (var i = 0; i < itemValArray.length; i++) {
                        valArray = itemValArray[i];  // values for, e.g., a given core.

                        if (valArray.length > 0) {
                            // we need to find the last item at the last visible time, as 
                            // we want to report the total as of then, NOT as of the last
                            // data item or lastDisplayableTime.
                            for (j = valArray.length - 1; j >= 0; j--) {
                                if (valArray[j][0] < lastVisibleTime) {
                                    break;
                                }
                            }

                            if (j >= 0) {
                                val = valArray[j][1] / valuesMultiplier;

                                if (first) {
                                    min = val;
                                    max = val;
                                    first = false;
                                } else {
                                    min = Math.min(min, val);
                                    max = Math.max(max, val);
                                }

                                dataItemTotal += val;
                            }
                        }
                    }

                    // compute the average across all the items (e.g. cores) in this dataItemVal
                    avg += (dataItemTotal / itemValArray.length);  
                }
            }
        }

        // 'avg' at this point has the total of the averages across all dataItemVals.
        // Divide by that number to get the real average.
        if (numDataItems > 0) {
            avg = avg / numDataItems;
        }
    }

    return '<div class="summaryLabel">Min: </div>' + 
        '<div class="summaryValue">' + min.toFixed(2) + '</div>' + 
        '<div class="summaryLabel">&nbsp;&nbsp;&nbsp;&nbsp;Max: </div>' + 
        '<div class="summaryValue">' + max.toFixed(2) + '</div>' + 
        '<div class="summaryLabel">&nbsp;&nbsp;&nbsp;&nbsp;Average: </div>' + 
        '<div class="summaryValue">' + avg.toFixed(2) + '</div>';
}

/**
 * Given an array of existing [time, value] pairs from a chart, insert a new pair into the
 * array at the right location. The issue is to put the pair into the right slot, since 
 * we cannot generally assume that notifications will always show up in time order.
 * We'll try to optimize by starting at the end, though, because generally
 * they DO come in time order.
 */
function insertChartValue(values, newTime, newValue) {
    var inserted = false;
    var i = values.length - 1;
    while (!inserted && i >= 0) {
        var oldTime = values[i][0];
        if (newTime > oldTime) {
            values.splice(i + 1, 0, [newTime, newValue]);
            inserted = true;
        } else if (newTime == oldTime) {
            inserted = true; // bail--we're not going to overwrite
        } else {
            i--;
        }
    }

    if (!inserted) {
        values.splice(0, 0, [newTime, newValue]); 
    }
}

//=====================================================
// Utility functions for accessing ModelLists (generally 
// as part of drawing charts.
//=====================================================

/**
 * General function for toggling a checkbox through its 'indeterminate' 
 * state (i.e., to support a tri-state checkbox).
 */
function toggleCheckbox(cb) {
    if (cb.readOnly) {
        cb.checked = cb.readOnly = false;
    } else if (!cb.checked) {
        cb.readOnly = cb.indeterminate = true;
    }
}

/**
 * My own function to return a state (0 = off, 1 = on, -1 = "indeterminate")
 */
function checkboxState(cb) {
    if (cb.indeterminate) {
        return -1;
    } else {
        return (cb.checked ? 1 : 0)
    }
}

/**
 * Set the checkbox to visually reflect one of the states.
 */
function setCheckboxState(cb, state) {
    cb.checked = (state == 1);
    cb.indeterminate = cb.readOnly = (state == -1);
}

/**
 * Given some version info from a gateway config, compute an array of 
 * strings for display [title, version, build].
 * is empty, returns null.
 */
function computeDisplayVersionInfo(versionInfo) {
    if (versionInfo) {
        // the productBuild is major.minor.patch.build. Separate build from the others
        var productBuild = versionInfo.productBuild;
        var dotPos = productBuild.indexOf('.');
        dotPos = productBuild.indexOf('.', dotPos + 1);  // 2nd dot
        dotPos = productBuild.indexOf('.', dotPos + 1);  // 3rd dot

        return [versionInfo.productTitle, 
                productBuild.substring(0, dotPos),
                productBuild.substring(dotPos + 1)];
    } else {
        return null;
    }
}

//===============================================================
// Some functions for doing range/domain translation and scaling
// for the dashboard charts.
//===============================================================

/**
 * Convert an X domain value (datetime, in MS) to a range value (pixels)
 */
function scaleX(domainValue, xDomain, xRange) {
    return (domainValue - xDomain[0])/(xDomain[1] - xDomain[0]) * (xRange[1] - xRange[0]);
}

/**
 * Convert an X range value (pixels) to a domain value (MS)
 */
function invertX(rangeValue, xDomain, xRange) {
    return (rangeValue - xRange[0])/(xRange[1] - xRange[0]) * (xDomain[1] - xDomain[0]);
}

/**
 * Convert a Y domain value to a range value (pixels). Note that we have
 * to adjust our domain value according to the current valuesMultiplier,
 * which is not something we do with the X values, since those are time values.
 */
function scaleY(domainValue, yDomain, valuesMultiplier, yRange) {
    return (domainValue/valuesMultiplier - yDomain[0])/(yDomain[1] - yDomain[0]) * (yRange[1] - yRange[0]);
}

/**
 * Convert a Y range value (pixels) to a domain value (whatever)
 */
function invertY(rangeValue, yDomain, yRange) {
    return (rangeValue - yRange[0])/(yRange[1] - yRange[0]) * (yDomain[1] - yDomain[0]);
}

/**
 * For debugging, a utility to take a list of [time,value] pairs and 
 * return the max value from the items in the list.
 */
function maxDataItemValue(timeValueList) {
    if (!timeValueList || timeValueList.length == 0) {
        return null;
    }

    var maxVal = timeValueList[0][1];
    for (var i = 1; i < timeValueList.length; i++) {
        var item = timeValueList[i];
        if (item[1] > maxVal) {
            maxVal = item[1];
        }
    }

    return maxVal;
}

/**
 * Format a date/time value for a table entry (including the date only if is not today)
 * Called from various DataTable cell formatter functions.
 * @param o the record passed to the cell formatter.
 * @param attrName the attribute of the record that contains the time value.
 */
function formatTableTime(o, attrName) {
    var time = o.record.get(attrName);
    if (!time) {
        return '';
    }

    var d = new Date(time);
    var now = new Date();
    return (sameDate(d, now) 
            ? d.toLocaleTimeString()
            : (d.toLocaleDateString() + '<BR>' + d.toLocaleTimeString()));
}

/**
 * Show and center a panel. This is to get around a YUI 3.11.0 bug.
 * Turns out that if you drag the panel, it "centers" back to where it
 * was dragged. Not sure why, but probably some offset elsewhere in 
 * the panel state.
 */
function centerPanel(panel) {
    var viewportRegion = Y.DOM.viewportRegion();
    var contentBox = panel.get('contentBox');
    // we need to show the panel before moving it in case the
    // width or height are defined as 'auto'. Once shown, we
    // can get the real values and move to the center.
    panel.show();
    var width = parseInt(contentBox.getStyle('width'));
    var height = parseInt(contentBox.getStyle('height'));
    panel.set('xy', 
             [viewportRegion.left + (viewportRegion.width/2) - (width/2),
              viewportRegion.top + (viewportRegion.height/2) - (height/2)]);
}

/**
 * If a value is null or undefined return a default value, else the original value
 */
function cvtUndefOrNull(value, defaultVal) {
    return (value === undefined || value === null ? defaultVal : value);
}

function checkForTouch() {
    if (! touchSupported()) {
        document.documentElement.className += " no-touch";
    }
}

function touchSupported() {
    return (('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch) ? true : false); 
}

/**
 * Dynamically load a script by creating a <script> node and appending it to the document.
 * From the High Performance Javascript book.
 */
function loadScript(url, callback) {
    var script = document.createElement('script');
    script.type = 'text/javascript';

    if (script.readyState) {
        // IE
        script.onreadystatechange = function() {
            if (script.readyState === 'loaded' || script.readyState === 'complete') {
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {
        // everybody else
        script.onload = function() {
            callback();
        }
    }

    // attach to the head. IE has issues if you attach to the body
    // before it is completely loaded, so, just to be safe...
    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
}
