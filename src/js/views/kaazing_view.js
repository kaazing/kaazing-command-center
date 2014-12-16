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
