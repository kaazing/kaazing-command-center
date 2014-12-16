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
 * The view for a gateway realm config object.
 *
 * @module gateway-realm-config-view
 */
YUI.add('gateway-realm-config-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'gatewayRealmConfigView';

    /**
     * A view of a single gateway-level RealmConfigModel, for use within page-level views 
     * like Config Overview (which show configs, not 'live' data.)
     *
     * @class GatewayRealmConfigView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.GatewayRealmConfigView = Y.Base.create(
        NAME, 
        Y.View, 
        [], 
        {
            initializer: function() {
                // There really are no 'change' events we need to listen for from
                // the model, but we do want to know whether we should be showing
                // URLs or not.
                $this.after('showUrlsChange', 
                            $this.afterShowUrlsChange, 
                            $this);
            },

            /**
             * Response to flipping the 'show Urls' state
             */
            afterShowUrlsChange: function(ev) {
                // XXX Do something.
                //            this.render();
            },

            /**
             * Render the realmConfig.
             */
            render: function() {
                var $this = this;

                var container = $this.get('container');

                // Clear out old data
                removeAllChildren(container);

                return realmBox;
            }
        }, 
        {
            ATTRS: {
                container: {
                    value: null
                },

                app: {
                    value: null
                },

                showUrls: {
                    value: false
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'realm-config-model']
});

