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

"use strict";

/**
 * The following is actually a script from www.quirksmode.org/js/detect.html.
 * They explicitly give instructions there to copy the script into your code.
 */
var BrowserDetect = {
    init: function () {
	this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
	this.version = this.searchVersion(navigator.userAgent)
	    || this.searchVersion(navigator.appVersion)
	    || "an unknown version";
	this.OS = this.searchString(this.dataOS) || "an unknown OS";

        // works for Android, iOS, though according to 
        // http://webmasters.stackexchange.com/questions/47615/what-is-the-default-web-browser-on-android
        // the 'mobile' is only used on phones, tablets do not have it.
        this.mobile = (navigator.userAgent.toLowerCase().indexOf('mobile') >= 0);
    },

    searchString: function (data) {
	for (var i=0;i<data.length;i++)	{
	    var dataString = data[i].string;
	    var dataProp = data[i].prop;
	    this.versionSearchString = data[i].versionSearch || data[i].identity;
	    if (dataString) {
		if (dataString.indexOf(data[i].subString) != -1) {
		    return data[i].identity;
                }
	    }
	    else if (dataProp) {
		return data[i].identity;
            }
	}
    },

    searchVersion: function (dataString) {
	var index = dataString.indexOf(this.versionSearchString);
	if (index == -1) return;
	return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    },

    dataBrowser: [
	{
	    string: navigator.userAgent,
	    subString: "Chrome",
	    identity: "Chrome"
	},
	{
	    string: navigator.userAgent,
	    subString: "CriOS",  // Chrome on iOS/iPad
	    identity: "Chrome"
	},
	{ 	
            string: navigator.userAgent,
	    subString: "OmniWeb",
	    versionSearch: "OmniWeb/",
	    identity: "OmniWeb"
	},
	{
	    string: navigator.vendor,
	    subString: "Apple",
	    identity: "Safari",
	    versionSearch: "Version"
	},
	{
	    string: navigator.vendor,
	    subString: "Google",
	    identity: "Safari",
	    versionSearch: "Version"
	},
	{
	    prop: window.opera,
	    identity: "Opera",
	    versionSearch: "Version"
	},
	{
	    string: navigator.vendor,
	    subString: "iCab",
	    identity: "iCab"
	},
	{
	    string: navigator.vendor,
	    subString: "KDE",
	    identity: "Konqueror"
	},
	{
	    string: navigator.userAgent,
	    subString: "Firefox",
	    identity: "Firefox"
	},
	{
	    string: navigator.vendor,
	    subString: "Camino",
	    identity: "Camino"
	},
	{   // for newer Netscapes (6+)
	    string: navigator.userAgent,
	    subString: "Netscape",
	    identity: "Netscape"
	},
	{   // IE before 11
	    string: navigator.userAgent,
	    subString: "MSIE",
	    identity: "Explorer",
	    versionSearch: "MSIE"
	},
	{   // IE 11 or later (actually also earlier, when the
            // userAgent string is changed by the F12 tools),
            // though I think the version string is 11 or later only.
	    string: navigator.userAgent,
	    subString: "Trident/",
	    identity: "Explorer",
	    versionSearch: "rv"
	},
	{
	    string: navigator.userAgent,
	    subString: "Gecko",
	    identity: "Mozilla",
	    versionSearch: "rv"
	},
	{   // for older Netscapes (4-)
	    string: navigator.userAgent,
	    subString: "Mozilla",
	    identity: "Netscape",
	    versionSearch: "Mozilla"
	}

    ],

    dataOS : [
	{
	    string: navigator.platform,
	    subString: "Win",
	    identity: "Windows"
	},
	{
	    string: navigator.platform,
	    subString: "Mac",
	    identity: "Mac"
	},
	{
	    string: navigator.userAgent,
	    subString: "Android",  // also includes 'Linux;' but it's really android
	    identity: "Android"
  	},
	{
	    string: navigator.platform,
	    subString: "iPad",
	    identity: "iPad"
  	},
	{
	    string: navigator.platform,
	    subString: "iPhone",
	    identity: "iPhone"
  	},
	{
	    string: navigator.platform,
	    subString: "iPod",
	    identity: "iPod"
  	},
	{
            // Put Linux last because various others like Android run on top of it.
	    string: navigator.platform,
	    subString: "Linux",
	    identity: "Linux"
	}
    ]
};
BrowserDetect.init();

      
/**
 * The following is our own function to use the result of BrowserDetect
 * and our own table of minimum browser version and type to decide if
 * we have a sufficient browser or not.
 *
 * Returns an object with the following fields:
 *   browser: the browser type that was found
 *   version: the browser version that was found
 *   supported: true if we support the given browser and version, false otherwise
 *   minSupported: the minimum version of the given browser that we support, if any.
 *                 If we do not support the browser at all, this is -1.
 *                 If we do support the browser at some version, but there is no 
 *                   minimum version, this is 0.
 */
function checkBrowserVersion() {

    // The valid browsers and minimum versions that we support.
    // Browsers that are not in the list are not supported at all.
    // Supported browsers with no minimum are 0.

    var supportedVersions = 
        { Explorer: {Windows: '9'},
          Chrome:  {Windows: '26',
                    Mac: '26',
                    Linux: '26',
                    Android: '26',  // Android 4
                    iPad: '26'},
          Firefox: {Windows: '22',
                    Mac: '22',
                    Android: '15',
                    Linux: '22'},
          Safari: {Mac: '6',
                   Linux: '22'}
        };

    var returnVal = {OS: BrowserDetect.OS,
                     browser: BrowserDetect.browser,
                     version: BrowserDetect.version,
                     supported: false,
                     minSupported: -1};

    var supportedVersion = supportedVersions[returnVal.browser];

    if (supportedVersion) {
        var minVersion = supportedVersion[returnVal.OS];

        if (minVersion) {
            returnVal.minSupported = minVersion;

            // The value is a string. It may have dots, like Mozilla.
            // Split it into an array of numbers
            minVersion = minVersion.split('\.');
            var version = ("" + returnVal.version).split('\.');

            var len = Math.min(minVersion.length, version.length);
            var realVal, minVal;  // individual part of the real version or min version

            for (var j = 0; j < len; j++) {
                realVal = version[j];
                minVal = minVersion[j];

                if (!isNaN(parseFloat(realVal)) && isFinite(realVal)) {
                    // numeric
                    realVal = parseInt(realVal);
                    minVal = parseInt(minVal);
                }

                if (realVal < minVal) {
                    break; // fail
                } else if (realVal > minVal) {
                    returnVal.supported = true;
                    break;
                } else if (j == len - 1) {
                    // if minVersion is shorter or equal (we're going to remove
                    // any trailing zeroes), it means that the minVersion
                    // the incoming version is greater, so should match.
                    if (minVersion.length <= version.length) {
                        returnVal.supported = true;
                        break;
                    }
                }
            }
        }
    }

    return returnVal;
}

// Finally, do the actual call and bail from the site if it fails
var browserInfo = checkBrowserVersion();

if (!browserInfo.supported) {
    window.location = "unsupported_browser.html?browser=" + browserInfo.browser + 
        "&os=" + browserInfo.OS + "&version=" + browserInfo.version + "&min=" + browserInfo.minSupported;
}
