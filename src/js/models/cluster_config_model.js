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
 * The cluster-config-model module contains the cluster configuration details
 * for a single gateway with the Kaazing Command Center application.
 *
 * @module cluster-config-model
 */
YUI.add('cluster-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'clusterConfigModel';

    /**
     * The cluster configuration block within a GatewayConfigModel. This is the only
     * config data that changes over time, and only the last three attributes.
     *
     * @class ClusterConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ClusterConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
            hasAttribute: function(attrName) {
                return Y.ClusterConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            // The data coming from the config has various properties 
            // jammed into strings that need to be parsed. 
            initializer: function() {
                // Fix the accepts
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("ClusterConfig for GW " + this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'name', offset);
                dumpAttr(this, 'accepts', offset);
                dumpAttr(this, 'connects', offset);
                dumpAttr(this, 'connectOptions', offset);
            }
        }, 
        {
            ATTRS: {
                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                name: {
                    value: null 
                },
                accepts: {
                    value: null
                },
                connects: {
                    value: null 
                },
                connectOptions: {
                    value: null 
                }

                // note: the instance key, which used to be kept here, is kept in the GatewayModel, 
                // not the cluster data, even though it parallels the Java-side 'memberId' field.
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

