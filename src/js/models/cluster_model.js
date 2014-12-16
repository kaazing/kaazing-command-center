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
 * The model that acts as the root of the tree, and contains various
 * GatewayModels (one per Gateway that we know about.)
 *
 * @module cluster-model
 */
YUI.add('cluster-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'clusterModel';

    /**
     * The Cluster-level model
     *
     * @class ClusterModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ClusterModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
        	UPDATE_AVAILABLE_EVENT:      NAME + ':updateAvailable',

        	initializer: function() {
                // Add us as a target of the gatewayModels map, for general 
                // bubbling of GatewayModel events. Those bubble through the map.
                this.get('gatewayModels').addTarget(this);

                this.publish(this.UPDATE_AVAILABLE_EVENT,
                		{emitFacade: true,
		                	broadcast: true,
		                	defaultFn: function(){},
		                	preventedFn: function(){},
		                	stoppedFn: function(){}
                		});

                this.on(Y.GatewayModel.prototype.UPDATE_AVAILABLE_EVENT,
                        this.onUpdateAvailable, 
                        this);
            },

            hasAttribute: function(attrName) {
                return Y.ClusterConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            /**
             * 'Start' the model by creating a GatewayModel for the current connection.
             * Internally that will then start a login process, since a connection URL
             * is known.
             */
            start: function(connectionUrl) {
                return this.createGatewayModel("", connectionUrl, true);
            },

            /**
             * General logout of the entire application (all gateways).
             * Just tells each gateway to disconnect, which should
             * close all sockets and destroy that gateway.
             */
            logout: function() {
                CC.console.log("### starting cluster logout");
                this.set('loggingOut', true);

                var gatewayModels = this.getGateways();
                if (gatewayModels) {
                    gatewayModels.forEach(function(gatewayModel) {
                        // NOTE: must invoke any logouts synchronously--doing an
                        // invokeLater() finishes the thread, then (presumably) the
                        // client-library code cuts the connection without the
                        // gateways actually doing their disconnect stuff.
                        // Doing things synchronously allows the disconnects before
                        // finishing this original request and going back to the
                        // browser stack.
                        gatewayModel.disconnect();
                        gatewayModel.destroyGateway();
                    });
                }
                CC.console.log("### finishing cluster logout");
            },
            
            onUpdateAvailable: function(ev) {
            	var newV = ev.newVersion;
            	var oldV = this.get("updateVersion");
            	if(newV && newV !== oldV) {
            		this.set("updateVersion", newV);
                    this.fire(this.UPDATE_AVAILABLE_EVENT, {newVersion: newV});
            	}
            },
            
            createGatewayModel: function(instanceKey, connectionUrl, canChangeUrl) {
                var gatewayModel = new Y.GatewayModel({clusterModel: this, 
                                                       loginProcessor: this.get('loginProcessor'),
                                                       connectionUrl: connectionUrl,
                                                       instanceKey: instanceKey,
                                                       canChangeUrl: canChangeUrl});
                // add to our gateway models list. Various listeners are already waiting.
                this.get('gatewayModels').putItem(instanceKey, gatewayModel);
                return gatewayModel;
            },

            /**
             * Find the gatewayModel by its instanceKey attribute. There should
             * never be more than one instance with a given instanceKey.
             */
            findGatewayModelByInstanceKey: function(instanceKey) {
                var gatewayModels = this.get('gatewayModels').values();

                for (var i = 0; i < gatewayModels.length; i++) {
                    var gatewayModel = gatewayModels[i];

                    if (gatewayModel.get('instanceKey') === instanceKey) {
                        return gatewayModel;
                    }
                }

                return null;
            },

            /**
             * Set the instanceKey of the gateway instance with key '' (the initial
             * setting for the first gateway, because we don't yet know its instance key.
             */
            setFirstGatewayInstanceKey: function(instanceKey) {
                var gateways = this.get('gatewayModels');
                gateways.updateKey('', instanceKey);
            },

            /**
             * Handle a gateway that's completed the login process and fetched all its 
             * relevant data (i.e., the 'onOpen' sequence has completed).
             */
            loginCompleted: function(gatewayModel) {
                this.set('isCluster', gatewayModel.isCluster());
                var gatewayConfig = gatewayModel.get('gatewayConfig');
                this.set('versionInfo', gatewayConfig.get('versionInfo'));
                // indicate we've completed at least one login, so displays 
                // know they can validly try to render data.
                this.set('loggedIn', true);
            },

            /**
             * When a GatewayModel needs to be deleted, do it here to 
             * make sure it gets out of all the cluster-level structures,
             * then let the gateway remove the stuff it contains.
             */
            destroyGateway: function(gatewayModel) {
                var instanceKey = gatewayModel.get('instanceKey');

                this.get('gatewayModels').removeItem(instanceKey);
                gatewayModel.destroyGateway();
            },

            /**
             * Called from a GatewayModel during its onOpen processing. Any gateways that
             * that are mentioned but are not already in the list are created here.
             * Also, any existing instances that are NOT mentioned in the incoming list
             * are stopped. 
             */
            processClusterStateData: function(clusterMembers, balancerMap, mngtServiceMap, 
                                              readTime) {
                var $this = this;

                // Create a map from instanceKey to connectionUrl, if there is one.
                var connectionUrlMap = {};

                for (var instanceKey in clusterMembers) {
                    if (clusterMembers.hasOwnProperty(instanceKey)) {
                        var connectionUrl = null;

                        if (mngtServiceMap && mngtServiceMap.hasOwnProperty(instanceKey)) {
                            // Find the entry starting with 'ws' or 'wss'
                            var mngtUris = mngtServiceMap[instanceKey];
                            for (var i = 0; i < mngtUris.length; i++) {
                                var mngtUri = mngtUris[i];
                                if (mngtUri.startsWith('ws://')) {
                                    connectionUrl = mngtUri;
                                } else if (mngtUri.startsWith('wss://')) {
                                    connectionUrl = mngtUri;
                                    break;
                                }
                            }
                        }

                        connectionUrlMap[instanceKey] = connectionUrl;
                    }
                }

                // At this point the connectionUrlMap has an entry for each gateway 
                // that's known to the cluster (i.e., alive), whether or not that 
                // member has a management service. Match that against our list of
                // gatewayModels. Any that are not in the connectionUrlMap are
                // by definition not in the cluster (for 4.0 that means "dead"). 
                var gatewayModels = this.getGateways();
                gatewayModels.forEach(function(gatewayModel) {
                    var instanceKey = gatewayModel.get('instanceKey');
                    if (!connectionUrlMap.hasOwnProperty(instanceKey)) {
                        // we don't know anything about the instanceKey, so the gatewayModel
                        // is no longer in the cluster. Shut it down if it isn't already.
                        gatewayModel.shutDown(readTime);
                    } else {
                        // connectionUrlMap knows about the gateway, so we 
                        // won't have to create a new gatewaymodel for that key.
                        delete connectionUrlMap[instanceKey];
                    }
                });

                // The only keys left in the connectionUrlMap are ones without a GatewayModel.
                for (var instanceKey in connectionUrlMap) {
                    if (connectionUrlMap.hasOwnProperty(instanceKey)) {
                        // We do not do an invokeLater because we want to make sure
                        // that we get all the gatewayModels we know about created
                        // before anybody else gets to run this same routine.
                        this.createGatewayModel(instanceKey, connectionUrlMap[instanceKey]);
                    }
                }
            },

            /**
             * Process a change in cluster membership (i.e., JOIN/LEAVE),
             */
            processMembershipChange: function(notificationObj) {

                var instanceKey = notificationObj.instanceKey;
                var eventType = notificationObj.eventType;

                var gatewayModel = this.findGatewayModelByInstanceKey(instanceKey);

                if (eventType === 'join') {
                    // If the instance already exists (whether we're logged in or not), 
                    // it means that somebody else has come along with a JOIN before us.
                    // We can't get another JOIN on the same URL without a LEAVE first,
                    // which will change the instanceKey and cause us not to have that
                    // instance. That means we have nothing to do.
                    if (!gatewayModel) {
                        // create the gateway model and leave it alone. We do not have a 
                        // connection URL for it yet, because the management service, if
                        // there is one, hasn't started yet. If there is a management 
                        // service, that will come along via another notification.
                        gatewayModel = this.createGatewayModel(instanceKey, '');
                        CC.console.log('Processing JOIN created gateway model for instance key ' + 
                                            instanceKey);
                    }
                } else {
                    // we're getting a LEAVE. If we didn't have a gateway model already
                    // for this, ignore it, as we came along during the time it was shutting
                    // down and it won't affect us (at least with that instanceKey) anymore.
                    if (gatewayModel) {
                        gatewayModel.processLeave(notificationObj.readTime);
                    }
                }
            },

            /**
             * Process a notification telling us of a change in a given gateway's list of 
             * management services. Initially this will only be for additions, but we'll
             * try to anticipate extension.
             */
            processManagementServiceChange: function(notificationObj) {
                var instanceKey = notificationObj.instanceKey;
                var gatewayModel = this.findGatewayModelByInstanceKey(instanceKey);

                // If we don't have a model, it means that either (a) we're getting a 
                // notification before we've seen the notification for joining the
                // cluster and created the model (this seems possible in two cases: due
                // to network delay or if this is the only PEER member in the cluster)
                // or we were deleted (due to notifications about LEAVE and somehow we 
                // still got this late. I'm going to assume that the first is possible
                // (since I've seen it! ;-) 
                if (!gatewayModel) {
                    gatewayModel = this.createGatewayModel(instanceKey, '');
                }

                if (notificationObj.eventType == 'add') {
                    gatewayModel.processAddManagementService(notificationObj.accepts,
                                                             notificationObj.readTime);
                } else {
                    // Not in 4.0, but coming soon
                    gatewayModel.processRemoveManagementService(notificationObj.accepts,
                                                                notificationObj.readTime);
                }
            },

            getNumGateways: function() {
                return this.get('gatewayModels').size();
            },

            /**
             * Return the list of GatewayModel objects in 'gatewayModels' as an array.
             * If there are none, return null.
             */
            getGateways: function() {
                var gatewayModels = this.get('gatewayModels');
                return ((gatewayModels.size() > 0) ? gatewayModels.values() : null);
            },

            /**
             * We need in several cases to sort the gateway instances by connectionUrl and 
             * then by whether or not they have a stopTime (there should be at most one
             * that does not). The idea is that any non-stopTime gateway will be ahead
             * of any others, and those others will be sorted by stopTime so we know
             * they are in execution order.
             * If no gateway instances exist, returns null.
             */
            getSortedGateways: function() {
                var gateways = this.getGateways();  // all instances

                if (!gateways || gateways.length == 0) {
                    return null;
                }

                // Sort the list by connection URL, and within that, by whether or
                // not there is a stopTime entry, and if there is, which one is later
                // guys without URLs go at the end, and are ignored.
                gateways.sort(function(g1,g2) {
                    var val = compareStrings(g1.get('connectionUrl'), 
                                             g2.get('connectionUrl'));
                    if (val != 0) {
                        return val;
                    }
                    
                    return compareNumbers(g1.get('stopTime'), 
                                          g2.get('stopTime'),
                                          true,
                                          0);
                })

                return gateways;
            },

            /**
             * Return a list of gateways with state AVAILABLE, or null if there are no
             * gateway instances at all. If we have some but none are AVAILABLE, the 
             * array will be 0 length.
             */
            getAvailableGateways: function() {
                var gateways = this.getGateways();  // all instances

                if (!gateways || gateways.length == 0) {
                    return null;
                }

                for (var i = gateways.length - 1; i >= 0; i--) {
                    if (!gateways[i].isAvailable()) {
                        gateways.splice(i,1);
                    }
                }

                return gateways;
            },

            /**
             * Return a list of gateways considered 'usable' (see GatewayModel.isUsable()), or null if 
             * there are no gateway instances at all. If we have some but none are usable, the
             * array will be 0 length.
             */
            getUsableGateways: function() {
                var gateways = this.getGateways();  // all instances

                if (!gateways || gateways.length == 0) {
                    return null;
                }

                for (var i = gateways.length - 1; i >= 0; i--) {
                    if (!gateways[i].isUsable()) {
                        gateways.splice(i,1);
                    }
                }

                return gateways;
            },

            /**
             * For use with select lists, return a sorted list of 
             * gateway labels from the gateways in the gatewayModels list.
             * If there are none, return an empty list.
             */
            getMembersList: function() {
                var gatewayModels = this.getGateways();
                var labels = [];
                if (gatewayModels) {
                    for (var i = 0; i < gatewayModels.length; i++) {
                        labels[i] = gatewayModels[i].get('gatewayLabel');
                    }
                }
                labels.sort(function(a, b) {
                    return compareStrings(a.toLowerCase(), b.toLowerCase());
                });
                return labels;
            }
        }, 
        {
            ATTRS: {
                
                /**
                 * The time the cluster actually 'started'. This is useful, for example,
                 * in defining the minimum time for chart data in the Dashboard view.
                 */
                startTime: {
                    valueFn: function() {
                        return new Date();
                    }
                },

                /**
                 * Indicates if the cluster really is a cluster, or is just a single
                 * unclustered gateway. Set each time a managed gateway is made 
                 * available.  We allow each gateway to reset the value so that if 
                 * we lose all connectivity, or a gateway somehow changes from one 
                 * to the other by going down and coming up again, the value can 
                 * change, but we still have the old value until that occurs, even if
                 * we have no actual connectivity to anything at the moment.
                 */
                isCluster: {
                    value: false
                },

                /**
                 * Similar to isCluster, store the version info of the latest 
                 * managed gateway to be made available. From that we can show
                 * any version information (product title, build#, edition, though
                 * the title contains the edition name in caps).
                 */
                versionInfo: {
                    value: null
                },
                
                /**
                 * Y.MapModel of GatewayModels, one per gateway in the cluster and keyed by 
                 * cluster 'instanceKey' (random string that remains the same as long as the
                 * gateway is up, but resets on restart, so we can tell when a given gateway
                 * has gone down and then restarted, which means it might have changed.)
                 * Every GatewayModel is added to this list during its initialization, and
                 * does not leave it unless the user explicitly removes it (or we somehow know 
                 * that the user doesn't want the data and the gateway is gone and not coming 
                 * back.) This is a MapModel so we can bubble events to the cluster. This is 
                 * the map that's displayed by the UI.
                 */
                gatewayModels: {    
                    valueFn: function() {
                        var ml = new Y.MapModel({model: Y.GatewayModel});
                        ml.modelName = 'GatewayModel';
                        return ml;
                    }
                },

                /**
                 * Object that handles login processing (including UI). Passed in on 
                 * creation, used by individual gateways.
                 */
                loginProcessor: {
                    value: null
                },

                /**
                 * For view display, it helps to know if we've ever managed to log into 
                 * a gateway or not, and not display anything until we have. This flag
                 * indicates if we've completed a login. We won't have much actual data
                 * until then.
                 */
                loggedIn: {
                    value: false
                },

                /**
                 * Flag set during the official logout process, so gateways
                 * don't attempt to auto-reconnect.
                 */
                loggingOut: {
                    value: false
                },

                defaultCredentials: {
                    value: null
                },

                // Pseudo-attributes

                /**
                 * The number of quarantined gateways in the cluster.
                 */
                numQuarantined: {
                    getter: function() {
                        return 0;  // XXX FIX THIS!
                    }
                },

                /**
                 * The latest update-able version
                 * that the gateway knows of
                 */
                updateVersion : {
                    getter : function() {
                        var v = this.value;
                        if (!v) {
                            if (typeof (Storage) != "undefined") {
                                var savedV = localStorage.getItem("updateVersion");
                                if (savedV) {
                                    v = savedV;
                                    this.value = v;
                                }
                            }
                        }
                        return v;
                    },


                   setter : function(val, name) {
                       if (val && val !== "") {
                        this.value = val;
                        if (typeof (Storage) != "undefined") {
                             // Store
                            localStorage.setItem("updateVersion",val);
                            }
                        }
                    },
                	
            		value: ""
                },

                /**
                 * The number of running gateways in the cluster (managed or not).
                 * Do not count stopped instances.
                 */
                numRunning: {
                    getter: function() {
                        var total = 0;
                        var gateways = this.getGateways();
                        for (var i = 0; i < gateways.length; i++) {
                            var gatewayModel = gateways[i];
                            // Note: we don't care if managed or not--all GW instances
                            // are given a stopTime when we get a LEAVE for them.
                            if (!gatewayModel.get('stopTime')) {
                                total++;
                            }
                        }
                        
                        return total;
                    }
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

