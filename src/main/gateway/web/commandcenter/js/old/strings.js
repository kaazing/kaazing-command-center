/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

/**
 * The strings used within the Command Center UI. The YUI internationalization support
 * can handle either JSON format (as here) or a Yahoo resource bundle (.pres)
 * format. Since we don't use 'Shifter' or directly product YUI modules ourselves,
 * see http://yuilibrary.com/yui/docs/intl/ section 'Packaging Resources' for
 * details
 */
function setupStrings() {
    setupStringsDefault();
}

function setupStringsDefault() {
    // English
    YUI.add("lang/strings", 
            function(Y) {
                Y.Intl.add(
                    "strings",     // associated module
                    "",            // root bundle (for us, same as US English)

                    // key-value pairs for this module and language
                    {
                        APP_TITLE: 'Command Center'
                    }
                );
            }, 
            "3.10.1");
}