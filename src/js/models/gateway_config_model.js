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
 * The gateway-config-model module contains the complete configuration details
 * for a single gateway with the Kaazing Command Center application.
 *
 * @module gateway-config-model
 */
YUI.add('gateway-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'gatewayConfigModel';

    /**
     * The model for the data for a Gateway configuration.  All the data in the 
     * configuration is static except the cluster information, which changes
     * as various members are started & stopped and join/leave the cluster.
     *
     * @class GatewayConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.GatewayConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
            hasAttribute: function(attrName) {
                return Y.GatewayConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
                // we want to pass along the client gateway ID to the lower-level
                // config objects
                var gatewayModel = this.get('gatewayModel');

                // The values of the various config ATTRS are straight Objects, rather
                // than model objects. We'll change that here.

                var clusterConfig = this.get('clusterConfig');
                if (clusterConfig) {
                    clusterConfig.gatewayModel = gatewayModel;
                    this.set('clusterConfig', new Y.ClusterConfigModel(clusterConfig));
                }

                var licensesConfig = this.get('licensesConfig');
                if (licensesConfig) {
                    licensesConfig.gatewayModel = gatewayModel;
                    this.set('licensesConfig', new Y.LicensesConfigModel(licensesConfig));
                }

                var networkConfig = this.get('networkConfig');
                if (networkConfig) {
                    networkConfig.gatewayModel = gatewayModel;
                    this.set('networkConfig', new Y.NetworkConfigModel(networkConfig));
                }

                var securityConfig = this.get('securityConfig');
                if (securityConfig) {
                    securityConfig.gatewayModel = gatewayModel;
                    this.set('securityConfig', new Y.SecurityConfigModel(securityConfig)); 
                    securityConfig = this.get('securityConfig');
                }

                var serviceDefaultsConfig = this.get('serviceDefaultsConfig');
                if (serviceDefaultsConfig) {
                    serviceDefaultsConfig.gatewayModel = gatewayModel;
                    this.set('serviceDefaultsConfig', 
                             new Y.ServiceDefaultsConfigModel(serviceDefaultsConfig));
                }

                var serviceConfigs = this.get('serviceConfigs');
                if (serviceConfigs) {
                    if (serviceConfigs.length === 0) {
                        this.set('serviceConfigs', null);
                    } else {
                        var realmConfigs = securityConfig.get('realmConfigs'); // map

                        for (var i = 0; i < serviceConfigs.length; i++) {
                            var serviceConfig = serviceConfigs[i];
                            serviceConfig.gatewayModel = gatewayModel;
                            serviceConfigs[i] = new Y.ServiceConfigModel(serviceConfig);

                            // convert the realm name in the service config into a reference
                            // to the real RealmConfigModel object, and add the serviceConfig
                            // to the realm, too.
                            var realm = (realmConfigs ? realmConfigs[serviceConfigs[i].get('realm')] : null);
                            serviceConfigs[i].set('realm', realm);
                            if (realm) {
                                realm.addServiceConfig(serviceConfigs[i]);
                            }
                        }

                        this.set('serviceConfigs', serviceConfigs);
                    }
                }
            },

            /** 
             * Given a service ID, return the associated ServiceConfigModel, or null if not present.
             */
            getServiceConfig: function(serviceId) {
                var serviceConfigs = this.get('serviceConfigs');
                if (serviceConfigs) {
                    for (var i = 0; i < serviceConfigs.length; i++) {
                        var serviceConfig = serviceConfigs[i];
                        if (serviceConfig.get('serviceId') === serviceId) {
                            return serviceConfig;
                        }
                    }
                }

                return null;
            },


            /** 
             * Given a realm name, return the associated RealmConfigModel, or null if not present.
             */
            getRealmConfig: function(realmName) {
                var securityConfig = this.get('securityConfig');
                return (securityConfig ? securityConfig.getRealmConfig(realmName) : null);
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("GatewayConfig for GW " + this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'productTitle', offset);
                dumpAttr(this, 'productVersionBuild', offset);
                dumpAttr(this, 'productEdition', offset);
                dumpAttr(this, 'clusterConfig', offset);
                dumpAttr(this, 'licensesConfig', offset);
                dumpAttr(this, 'networkConfig', offset);
                dumpAttr(this, 'securityConfig', offset);
                dumpAttr(this, 'serviceDefaultsConfig', offset);
                dumpAttr(this, 'serviceConfigs', offset);
                dumpAttr(this, 'readTime', offset);
            }
        }, 
        {
            ATTRS: {
                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                productTitle: {
                    value: null
                },
                productVersionBuild: {
                    value: null
                },
                productEdition: {
                    value: null
                },
                clusterConfig: {
                    value: null
                },
                licensesConfig: {
                    value: null  
                },
                networkConfig: {
                    value: null
                },
                securityConfig: {
                    value: null  // includes realm configs as an internal array
                },
                serviceDefaultsConfig: {
                    value: null  
                },
                serviceConfigs: {
                    value: null  // list of Y.ServiceConfigModels
                },
                readTime: {
                    value: null  // the time the given set of stats were received by the client.
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'cluster-config-model', 'licenses-config-model',
               'network-config-model', 'security-config-model', 'service-config-model',
               'service-defaults-config-model', 'gateway-model']
});

