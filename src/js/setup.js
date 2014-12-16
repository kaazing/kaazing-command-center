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

// The Command Center 'namespace'
var CC = {};

var Y = null;  // YUI

CC.PRODUCT_NAME = 'Kaazing Command Center';
CC.COMPANY_WEBSITE_URL = 'http://www.kaazing.com';
CC.HEADER_LOGO_IMAGE_URL = "../images/header-logo.png";
CC.FOOTER_LOGO_IMAGE_URL = "../images/footer-logo.png";
CC.LOGIN_LOGO_IMAGE_URL = '../images/about-logo.png';
CC.ABOUT_LOGO_IMAGE_URL = '../images/about-logo.png';
CC.UPDATE_LOGO_IMAGE_URL = '../images/about-logo.png';
CC.COPYRIGHT_NOTICE = 'Copyright &copy; 2013-2014 Kaazing Corporation. All rights reserved.';

// Create an object with functions that mimic the window.console object made  
// available by tools like Firebug or the "Dev Tools" add-on in IE8+  
CC.dummyConsole = {  
    assert : function(){},  
    log : function(){},  
    debug : function(){},  
    info : function(){},
    warn : function(){},  
    error : function(){},  
    dir : function(){} 
};  

// Turns out IE9+ has a console object, but with only some functions and 
// not others. We'll make our own object out of this.
// NOTE: (At least for Chrome, presumably others) the console functions are
// native methods expecting to run in the context of the 'window' object when
// they are called. so we must provide the right 
// function
CC.fullConsole = {
    assert : (window.console && console.assert ? function(msg) { console.assert(msg);} : function(){}),  
    dir :    (window.console && console.dir ? function(msg) { console.dir(msg);}    : function(){}),
    log :    (window.console && console.log ? function(msg) { console.log(msg);}    : function(){}),  
    debug :  (window.console && console.debug ? function(msg) { console.debug(msg);}  : this.log),
    info :   (window.console && console.info ? function(msg) { console.info(msg);}   : this.log),
    warn :   (window.console && console.warn ? function(msg) { console.warn(msg);}   : this.log),
    error :  (window.console && console.error ? function(msg) { console.error(msg);}  : this.log)
};

  
// Throughout our app we'll make console/logging calls by using the CC.console  
// object. Example: CC.console.debug("blerg!"). By default, the CC.console  
// object should use the "dummy" console that doesn't do anything, but we'll use 
// a variation of the window one if it is there.
CC.console = CC.dummyConsole;
  
// This function can be used to switch the CC.console variable to use functions
// from the real window.console object.
CC.enableConsoleOutput = function(enable) {  
    CC.console = (enable ? CC.fullConsole : CC.dummyConsole);
};  

CC.enableConsoleOutput(false);

CC.brand = function(config) {
    function copyProp(configPropName, ccPropName) {
        if (config.hasOwnProperty(configPropName)) {
            CC[ccPropName] = config[configPropName];
        }
    }

    if (config) {
        copyProp('productName', 'PRODUCT_NAME');
        copyProp('companyWebsiteUrl', 'COMPANY_WEBSITE_URL');
        copyProp('headerLogoImageUrl', 'HEADER_LOGO_IMAGE_URL');
        copyProp('footerLogoImageUrl', 'FOOTER_LOGO_IMAGE_URL');
        copyProp('loginLogoImageUrl', 'LOGIN_LOGO_IMAGE_URL');
        copyProp('aboutLogoImageUrl', 'ABOUT_LOGO_IMAGE_URL');
        copyProp('updateLogoImageUrl', 'UPDATE_LOGO_IMAGE_URL');
        copyProp('copyrightNotice', 'COPYRIGHT_NOTICE');
    }
}
