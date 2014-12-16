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

var menuTimeout = 500;
var menuCloseTimer = 0;
var menuOpenSubmenu = 0;

// open hidden layer
function mopen(subMenuNode) {	
    // cancel close timer
    mcancelclosetime();

    // close old layer
    if (menuOpenSubmenu) {
        //CC.console.log('hiding previously-open submenu');
        menuOpenSubmenu.style.visibility = 'hidden';
    }

    // get new layer and show it
    menuOpenSubmenu = subMenuNode;
    //CC.console.log('showing submenu');
    menuOpenSubmenu.style.visibility = 'visible';
}

// close showed layer
function mclose() {
    //CC.console.log("start mclose");
    if (menuOpenSubmenu) {
        //CC.console.log('hiding previously-open submenu');
        menuOpenSubmenu.style.visibility = 'hidden';
    }
}

// go close timer
function mclosetime() {
    menuCloseTimer = window.setTimeout(
        function() {
            //CC.console.log('hitting mclosetime timer');
            mclose();
        }, 
        menuTimeout);
}

// cancel close timer
function mcancelclosetime() {
    if (menuCloseTimer) {
	window.clearTimeout(menuCloseTimer);
	menuCloseTimer = null;
    }
}

function foo() {
    //CC.console.log('foo');
    return false;
}

/**
 * Menu item. The root menu item doesn't show its label (doesn't need one)
 */
function MenuItem (label, clickFn) {
    this.parent = null;
    this.label = label;
    this.children = null;  // null child is a leaf
    this.icon = null;
    this.clickFn = (clickFn ? clickFn : null);   // for leaf nodes, the function for on-click
    this.submenu = null;  // the UL node object created to hold the children
    this.link = null;     // the A node object created to hold the link
}

/* Initialize the MenuItem prototype */
(function() {

    var $proto = MenuItem.prototype;

    /**
     * Add an item to the current menu. If clickFn is defined
     * it will be added as the 'onClick' handler for the
     * new menu item. This should ONLY be done for the
     * leaf items!
     */
    $proto.addItem = function(label, clickFn) {
        var newItem = new MenuItem(label, clickFn);
        newItem.parent = this;

        if (this.children) {
            this.children.push(newItem);
        } else {
            this.children = [newItem];
        }

        return newItem;
    };

    $proto.isRoot = function() {
        return (this.parent === null);
    };

    $proto.isLeaf = function() {
        return (this.children === null);
    };

    /**
     * Render the entire menu, starting from here.
     */
    $proto.renderMenu = function(container) {
        this.renderItem(container, 0);
    };

    /**
     * Render the given item and its children.
     * 'container' is a DOM node
     */
    $proto.renderItem = function(container, level) {
        var $this = this;

        var link;
        var li;
        var ul;

        if (!this.isRoot()) {
            li = document.createElement('li');
            container.appendChild(li);

            container = li;

            link = document.createElement('a');
            container.appendChild(link);

            link.appendChild(document.createTextNode(this.label));
            link.href = '#';

            // Note: for a non-touch system (i.e. desktop or laptop) we use
            // CSS hover to provide rollover display behavior, but do not
            // provide submenu-opening in CSS, since touch systems don't
            // support that. We do that here.
            if (!this.isLeaf()) {
                if (!touchSupported()) {
                    // Desktop/laptop. We'll use mouseOver and mouseOut
                    link.onmouseover = function(ev) {
                        //CC.console.log('mouseover for non-leaf item [' + $this.label + ']');
                        mopen($this.submenu);
                    };

                    link.onmouseout = function(ev) {
                        //CC.console.log('mouseout for non-leaf item [' + $this.label + ']');
                        mclosetime();
                    };
                } else {
                    // Tablet/phone. Hover not supported, so do it on click.
                    link.onclick = function(ev) {
                        //CC.console.log('onclick for non-leaf item [' + $this.label + ']');
                        mopen($this.submenu);
                        ev.stopPropagation();
                        ev.preventDefault();
                    };
                }
            } else {
                if ($this.clickFn) {
                    link.onclick = function(ev) {
                        //CC.console.log('click for leaf item [' + $this.label + ']');
                        mclose($this.parent);
                        $this.clickFn(ev); 
                        ev.stopPropagation();
                        ev.preventDefault();
                    };
                }

                return;
            }

            // leaves have no submenu
            if ($this.isLeaf()) {
                return;
            }
        }

        // sub-menu
        this.submenu = document.createElement('ul');
        container.appendChild(this.submenu);

//        this.submenu = createUL(container);

        if (this.isRoot()) {
            this.submenu.id = 'mainmenu';
            this.label = 'Root menu';
        } else {
            // the root menu does not have submenu mouse-over display(?), since
            // the submenu items are always displayed--they don't pop up and down.
            // XXX There is a question whether the top-level menu should have
            // mouseout when the user scrolls along the main menubar but outside
            // all the items.
            this.submenu.onmouseover = function(ev) {
//                CC.console.log('submenu mouseover for submenu of item [' + $this.label + ']');
                mcancelclosetime();
            };

            this.submenu.onmouseout = function(ev) {
//                CC.console.log('submenu mouseout for submenu of item [' + $this.label + ']');
                mclosetime();
            };
        }

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].renderItem(this.submenu, level + 1);
        }
    };
    
    // hides the visualized menu after clicking outside of its area and 
    // expiring of the loaded timer
    document.onclick = function() {
        //CC.console.log('calling mclose from document.onclick');
        mclose();
    };
})();

function defineMenu(Y, app) {

    // set up the menu stuff
    var menu = new MenuItem();  // root

    var dashboardMenu = menu.addItem("dashboard",
                                     function(ev) {
                                         app.save('/dashboard');
                                     });

    var configurationMenu = menu.addItem("configuration");

    configurationMenu.addItem("overview", 
                         function(ev) {
                             app.save('/config/overview');
                         });

    configurationMenu.addItem("services",
                         function(ev) {
                             app.save('/config/services');
                         });

    configurationMenu.addItem("security - realms",
                              function(ev) {
                                  app.save('/config/security/realms');
                              });

    configurationMenu.addItem("security - keystores",
                              function(ev) {
                                  app.save('/config/security/keystore');
                              });

    configurationMenu.addItem("security - truststores",
                              function(ev) {
                                  app.save('/config/security/truststore');
                              });

    configurationMenu.addItem("service defaults",
                         function(ev) {
                             app.save('/config/service_defaults');
                         });

    var monitoringMenu = menu.addItem("monitoring");

    monitoringMenu.addItem("gateways",
                           function(ev) {
                               app.save('/monitor/gateways');
                           });

    monitoringMenu.addItem("services",
                           function(ev) {
                               app.save('/monitor/services');
                           });

    monitoringMenu.addItem("sessions",
                           function(ev) {
                               app.save('/monitor/sessions');
                           });

/* 
   // For testing of submenus
    var fooMenu = monitoringMenu.addItem("foo", null);
    fooMenu.addItem('bar', 
                    function(ev) {
                        CC.console.log('HUZZAH!');
                    });
    var bazMenu = fooMenu.addItem('baz', 
                                  function(ev) {
                                      CC.console.log('BWAHAHAHAHA!');
                                  });
    bazMenu.addItem('bax', 
                    function(ev) {
                        CC.console.log('bax!');
                    });
    bazMenu.addItem('bart', 
                    function(ev) {
                        CC.console.log('bart!');
                    });
*/

    var aboutMenu = menu.addItem("about",
                                 function(ev) {
                                     app.handleAbout();
                                 });

    if (window.TEST_ENABLED) {
        var testMenu = menu.addItem("test");

        testMenu.addItem("Browser Information", 
                         function(ev) {
                             var browserInfo = checkBrowserVersion();
                             alert('browser.userAgent = [' + navigator.userAgent + ']' + 
                                   '\nbrowser.platform = [' + navigator.platform + ']' + 
                                   '\nbrowser.vendor = [' + navigator.vendor + ']' +
                                   '\nbrowserInfo.OS = ' + browserInfo.OS + 
                                   '\nbrowser = ' + browserInfo.browser + 
                                   '\nbrowser version = ' + browserInfo.version);
                         });
    }

    return menu;
}
