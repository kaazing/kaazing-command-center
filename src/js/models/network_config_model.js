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
 * The network-config-model module contains the network config details
 * for a single gateway with the Kaazing Command Center application.
 *
 * @module network-config-model
 */
YUI.add('network-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'networkConfigModel';

    /**
     * The static fields from the network configuration
     *
     * @class NetworkConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.NetworkConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            hasAttribute: function(attrName) {
                return Y.NetworkConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("NetworkConfig for GW " + this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'addressMappings', offset);
            }
        }, 
        {
            ATTRS: {
                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                addressMappings: {
                    value: null 
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

