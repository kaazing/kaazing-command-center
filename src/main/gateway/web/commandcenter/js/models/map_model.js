/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The map-model module provides a map object similar to Y.ModelList for use
 * with the Kaazing Command Center application.
 *
 * @module map-model
 */
YUI.add('map-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'mapModel';

    /**
     * The MapModel class is a map object similar to Y.ModelList.
     * It holds a map of items of a particular model class, and 
     * can generate new ones. The MapModel is an event target
     * for the items added. It is no longer a target for items removed.
     *
     * @class MapModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    /**
     */
    Y.MapModel = Y.Base.create(
        NAME,
        Y.Model, 
        [], 
        {
            MAPMODEL_ADD_EVENT:        NAME + ':add', 
            MAPMODEL_REMOVE_EVENT:     NAME + ':remove', 
            MAPMODEL_UPDATE_KEY_EVENT: NAME + ':updatekey', 

            initializer: function() {
                var $this = this;
                $this.publish($this.MAPMODEL_ADD_EVENT,
                              {emitFacade: true,
                               broadcast: true,
                               defaultFn: function(){},
                               preventedFn: function(){},
                               stoppedFn: function(){}
                              });
                $this.publish($this.MAPMODEL_REMOVE_EVENT,
                              {emitFacade: true,
                               broadcast: true,
                               defaultFn: function(){},
                               preventedFn: function(){},
                               stoppedFn: function(){}
                              });
                $this.publish($this.MAPMODEL_UPDATE_KEY_EVENT,
                              {emitFacade: true,
                               broadcast: true,
                               defaultFn: function(){},
                               preventedFn: function(){},
                               stoppedFn: function(){}
                              });
                // We're going to hide a real {} as a property, NOT an attr.
                // We have to do this because of weirdness with hasOwnProperty
                // overridden by YUI.
                $this.items = {};
            },

            putItem: function(key, value) {
                this.removeItem(key);  // just in case we're overwriting
                this.items[key] = value;
                value && value.addTarget(this);
//                CC.console.debug("### MapModel:firing " + this.MAPMODEL_ADD_EVENT);
                this.fire(this.MAPMODEL_ADD_EVENT, {item:value});
                return value;
            },

            removeItem: function(key) {
                var items = this.items;

                if (items.hasOwnProperty(key)) {
                    var value = items[key];
                    if (value) {
                        value.removeTarget(this);
                    }
                    delete items[key];
//                    CC.console.debug("### MapModel:firing " + this.MAPMODEL_REMOVE_EVENT);
                    this.fire(this.MAPMODEL_REMOVE_EVENT, {item:value});
                }
            },

            getItem: function(key) {
                return this.items[key];
            },

            hasKey: function(key) {
                return this.items.hasOwnProperty(key);
            },

            // Change an item's key. Note that this will overwrite any other item
            // that already has the new key. Generates an UPDATE_KEY event. Does
            // NOT generate a REMOVE event unless there's already an item with the
            // new key.
            updateKey: function(oldKey, newKey) {
                var items = this.items;

                if (this.hasKey(newKey)) {
                    this.removeItem(newKey);
                }

                if (this.hasKey(oldKey)) {
                    var value = items[oldKey];
                    delete items[oldKey];
                    items[newKey] = value;
                    this.fire(this.MAPMODEL_UPDATE_KEY_EVENT, {oldKey: oldKey, newKey: newKey});
                }
            },

            // map objects don't have a 'size', but we mean the number of items.
            size: function() {
                var items = this.items;
                var count = 0;
                for (var k in items) {
                    if (items.hasOwnProperty(k)) {
                        count++;
                    }
                }

                return count;
            },

            keys: function() {
                var items = this.items;
                var vals = [];
                for (var k in items) {
                    if (items.hasOwnProperty(k)) {
                        vals.push(k);
                    }
                }

                return vals;
            },

            values: function() {
                var items = this.items;
                var vals = [];
                for (var k in items) {
                    if (items.hasOwnProperty(k)) {
                        vals.push(items[k]);
                    }
                }

                return vals;
            }
        }, 
        {
            ATTRS: {
            }
        }
    );
}, '0.99', {
    requires: ['model']
});
