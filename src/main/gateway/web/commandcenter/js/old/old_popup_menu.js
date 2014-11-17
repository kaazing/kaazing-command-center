/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

/**
 * The functions to create/manage a popup menu, using YUI. 
 * The actual use of the YUI MenuNav Node Plugin only takes place
 * during the 'render' operation (which has nothing to do with
 * YUI View render, I just think it's a reasonable method name.)
 */

/**
 * An item in a popup menu/regular menu. This can be used
 * directly (for normal menu items) and indirectly as a 
 * superclass of both submenus and separators.
 */
function MenuItem() {
    this.parentMenu = null;  // the parent Menu object for this item/menu.  The root's parent is null.

    this.label = null;

    this.href = "";

    this.onFns = null;  // event handlers we'll attach to the real menu item once rendered

    this.afterFns = null;  // event handlers we'll attach to the real menu item once rendered

    this.domElement = null;
}

/* Initialize the MenuItem prototype */
(function() {
    var $proto = MenuItem.prototype;

    $proto.setLabel = function(label) {
        this.label = label;
    }

    $proto.getLabel = function() {
        return this.label;
    }

    $proto.setHref = function(href) {
        this.href = href;
    }

    $proto.getHref = function() {
        return this.href;
    }

    /**
     * Render the item as a child of the given YUI DOM node.
     */
    $proto.render = function(parentNode) {
        if (parentNode === null) {
            alert("bogus - menuItem without parent node");
        }

        var item = createLI(parentNode, 'yui-menuitem');

        this.domElement = item;  // for later reference

        var link = createLINK(item, this.getHref(), 'yui3-menuitem-content')
            .set('text', this.getLabel());

        // If we have any on or after fns, attach them now
        if (this.onFns) {
            for (var eventName in this.onFns) {
                var fn = this.onFns[eventName];
                link.on(eventName, fn);
            }
        }

        if (this.afterFns) {
            for (var eventName in this.afterFns) {
                var fn = this.afterFns[eventName];
                link.after(eventName, fn);
            }
        }

        return item;
    }

    /**
     * Attach a handler for an 'on' event once the menu is rendered.
     */
    $proto.on = function(eventName, fn) {
        if (this.onFns === null) {
            this.onFns = {};
        } 

        this.onFns[eventName] = fn;
    }

    /**
     * Attach a handler for an 'after' event once the menu is rendered
     */
    $proto.after = function(eventName, fn) {
        if (this.afterFns === null) {
            this.afterFns = {};
        } 

        this.afterFns[eventName] = fn;
    }

    $proto.getRoot = function() {
        return (this.parentMenu === null ? this : this.parentMenu.getRoot());
    }
})();


/**
 * A list of menu items (items and submenus).
 */
function Menu(menuId) {
    this.id = menuId;

    this.menuItems = [];
}

/* Initialize the Menu prototype */
(function() {
    var submenuIdCounter = 1;

    // inherit from MenuItem.
    Menu.prototype = new MenuItem();

    var $proto = Menu.prototype;

    $proto.addItem = function(label) {
        var item = new MenuItem();
        item.parentMenu = this;
        item.setLabel(label);
        this.menuItems.push(item);
        return item;
    }

    $proto.addSeparator = function() {
        var item = new Separator();
        item.parentMenu = this;
        this.menuItems.push(item);
        return item;
    }

    $proto.addSubmenu = function(label) {
        var item = new Menu("submenu-" + submenuIdCounter);
        item.parentMenu = this;
        submenuIdCounter++;

        item.setLabel(label);
        this.menuItems.push(item);
        return item;
    }

    /**
     * Render the menu markup.  If node is null/undefined, this must
     * be a root node.
     */
    $proto.render = function(parentNode) {
        if (parentNode === null) {
            parentNode = Y.one("body");
        }

        if (this.parentMenu !== null) {
            // we are a submenu, create the wrapping submenu listitem
            // and the link that shows up in the parent.
            var listItem = createLI(parentNode);

            var link = createLINK(listItem, '#' + this.id, 'yui3-menu-label')
                .set('text', this.getLabel());

            parentNode = listItem;

            if (!this.menuItems.length > 0) {
                return listItem;
            }
        }

        var menu = createDIV(parentNode, 'yui3-menu')
            .set('id', this.id);
        
        var menuContent = createDIV(menu, 'yui3-menu-content');

        var menuList = createUL(menuContent);

        // Do stuff for the submenu items, though we need
        // to handle separators specially.
        if (this.menuItems.length > 0) {

            this.menuItems.forEach(function(item) {
                item.render(menuList);
            });
        }

        // If we have any on or after fns, attach them now
        if (this.onFns) {
            for (var eventName in this.onFns) {
                var fn = this.onFns[eventName];
                // we have to do special stuff for onclick, as
                // we need the menu to come down before we handle it.
                // The default YUI Overlay does not do that.
                if (eventName === 'click') {
                    var 
                    fn = (function(fn) {
                        return function(ev) {
                            
                        }
                    })(fn);
                }

                menu.on(eventName, fn);
            }
        }

        if (this.afterFns) {
            for (var eventName in this.afterFns) {
                var fn = this.afterFns[eventName];
                menu.after(eventName, fn);
            }
        }

        return menu;
    }
})();

/**
 * A separator within a menu.
 */
function Separator() {
}

/* Initialize the Menu separator prototype */
(function() {
    Separator.prototype = new MenuItem(); 

    var $proto = Separator.prototype;

    $proto.render = function(parentNode) {
        // does nothing.
    }
})();