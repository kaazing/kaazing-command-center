/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The list-model module provides a list object similar to Y.ModelList for use
 * with the Kaazing Command Center application. The internals of the list are just
 * an array, and the only event we generate is 'listModel:add'.
 *
 * @module list-model
 */
YUI.add('list-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'listModel';

    /**
     * The ListModel class is a list object similar to Y.ModelList.
     * It holds an array of items. It supports 'add' and 'remove'
     * methods (generally we're assuming it won't be used for remove
     * very often), and generates a 'listModel:add' event. It's 
     * assumed the objects it contains are just plain JS objects, 
     * NOT YUI model objects.
     *
     * @class ListModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    /**
     */
    Y.ListModel = Y.Base.create(
        NAME,
        Y.Model, 
        [], 
        {
            LISTMODEL_ADD_EVENT: 'listModel:add', 
            LISTMODEL_REMOVE_EVENT: 'listModel:remove', 

            initializer: function() {
                var $this = this;
                $this.publish($this.LISTMODEL_ADD_EVENT,
                              {emitFacade: true,
                               broadcast: true,
                               defaultFn: function(){},
                               preventedFn: function(){},
                               stoppedFn: function(){}
                              });
                $this.publish($this.LISTMODEL_REMOVE_EVENT,
                              {emitFacade: true,
                               broadcast: true,
                               defaultFn: function(){},
                               preventedFn: function(){},
                               stoppedFn: function(){}
                              });

                // We're going to hide a real {} as a property, NOT an attr.
                // We have to do this because of weirdness with hasOwnProperty
                // overridden by YUI.
                $this.items = [];
            },

            add: function(value) {
                this.items.push(value);
                this.fire(this.LISTMODEL_ADD_EVENT, {item:value});
                return value;
            },

            remove: function(value) {
                var items = this.items;

                var index = items.indexOf(value);
                if (index >= 0) {
                    items.splice(index, 1);
                    this.fire(this.LISTMODEL_REMOVE_EVENT, {item:value});
                }
            },

            item: function(index) {
                return this.items[index];
            },

            size: function() {
                return this.items.length;
            },

            values: function() {
                var items = this.items;
                var vals = items.slice(0);
                return vals;
            },

            /**
             * Given a function, return an array of the items in 
             * the list that return a truthy value from the function.
             */
            filter: function(fn) {
                var items = this.items;
                var vals = [];

                if (items) {
                    items.forEach(function(item) {
                        if (fn(item)) {
                            vals.push(item);
                        }
                    });
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
