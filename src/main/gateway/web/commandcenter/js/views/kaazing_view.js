/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * A View superclass for all Kaazing 'main' views (those that are
 * put into the display using showView).
 *
 * @module kaazing-view
 */
YUI.add('kaazing-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'kaazingView';

    /**
     * A "superclass" View for Kaazing-specific "main" views
     *
     * @class KaazingView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.KaazingView = Y.Base.create(
        NAME,
        Y.View,
        [],
        {
            isActiveView: function() {
                var app = this.get('app');
                return app.isActiveView(this);
            },

            isInDoc: function() {
                var container = this.get('container');
                return (container.inDoc());
            },

            /**
             * Has the app completed a valid login at least once?
             */
            hasLoggedIn: function() {
                var app = this.get('app');
                return app.hasLoggedIn();
            },

            /**
             * Are we dealing with a cluster?
             */
            isCluster: function() {
                var app = this.get('app');
                return app.isCluster();
            }
        },
        {
            ATTRS: {
                // reference back to the app
                app: {
                    value: null
                },

                title: {
                    value: null,
                },

                toolbar: {
                    value: null // passed in on creation
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'command-center']
});
