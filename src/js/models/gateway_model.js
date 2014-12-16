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
 * The gateway-model module contains all the data for a single gateway
 * within the Kaazing Command Center application.
 *
 * @module gateway-model
 */
YUI.add('gateway-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'gatewayModel',

    /**
     * A set of constants describing the current state of the gateway.
     * For unmanaged gateways, the state is either UNINITIALIZED or AVAILABLE. 
     * For managed gateways, it progresses from UNINITIALIZED through the login 
     * process and initialization of structures like config and service data and
     * is finally set to AVAILABLE.
     */
    GatewayState = {UNINITIALIZED: 0,
                    DISCONNECTED: 10,
                    DISCONNECTING: 20,
                    CONNECTING: 30,
                    CONNECTED: 50,
                    AVAILABLE: 100};  // only after initialization of service and config data is done.

    /**
     * The model for Gateway static data and a list of gateway dynamic
     * processing data over time, and the models (one per service) for 
     * services in that gateway.
     *
     * @class GatewayModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.GatewayModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
            GATEWAY_AVAILABLE_EVENT:   NAME + ':gatewayAvailable',
            GATEWAY_UNAVAILABLE_EVENT: NAME + ':gatewayUnavailable',
            ADD_SERVICE_EVENT:         NAME + ':addService',
            REMOVE_SERVICE_EVENT:      NAME + ':removeService',
            UPDATE_AVAILABLE_EVENT:    NAME + ':updateAvailable',
            START_CONNECT_TIMER_LIST:  [100, 1000, 5000, 10000, 30000, 60000],

            initializer: function() {
                var $this = this;

                this.set('createTime', Date.now());

                // We can't 'unpublish' an event type, so might as well
                // declare them on initialization
                this.publish(this.GATEWAY_AVAILABLE_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });
                this.publish(this.GATEWAY_UNAVAILABLE_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });

                this.publish(this.ADD_SERVICE_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });
                this.publish(this.REMOVE_SERVICE_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });
                this.publish(this.UPDATE_AVAILABLE_EVENT,
	                		{emitFacade: true,
			                 broadcast: true,
			                 defaultFn: function(){},
			                 preventedFn: function(){},
			                 stoppedFn: function(){}
	                		});

                // Add us as a target of the serviceModels map, for general bubbling
                // of ServiceModel events (of course, these only happen when we're managed
                // and are able to retrieve service configurations to create ServiceModels.)
                // The ServiceModels bubble through the map.
                this.get('serviceModels').addTarget(this);
                
                // Convert ServiceModel map adds and removes to a different event type.
                this.on(Y.MapModel.prototype.MAPMODEL_ADD_EVENT, 
                        this.onServiceModelAdd, 
                        this);
                this.on(Y.MapModel.prototype.MAPMODEL_REMOVE_EVENT, 
                        this.onServiceModelRemove, 
                        this);

                // For code simplicity and cleanliness we're going to treat both 
                // managed and unmanaged gateways the same way--by setting them
                // as unmanaged and available. Then, for managed ones, we'll have
                // them start a connect (as though we were getting a new management
                // service notification. 
                // NOTE: The following MUST be done as invokeLater(), as listeners for
                // changes to gatewayState won't get this until the instance is 
                // in the gatewayModels list in clusterModel, which doesn't happen
                // until after this initializer ends.
/*
                var connectionUrl = this.get('connectionUrl');

                if (connectionUrl) {
                    this.set('connectionUrl', null);  // we do not want anybody listening to this change!
                }

                invokeLater(function() {
                    $this.setGatewayState(GatewayState.AVAILABLE);
                    invokeLater(function() {
                        if (connectionUrl) {
                            $this.startFirstConnect(connectionUrl);
                        }
                    }, 0);
                }, 0);
*/

                var connectionUrl = this.get('connectionUrl');

                if (connectionUrl) {
                    this.startFirstConnect(connectionUrl);
                } else {
                    // unmanaged for now, so we're available. When the new management
                    // service comes in, if ever, we'll update stuff.
                    // The following MUST be done as invokeLater(), as listeners for
                    // changes to gatewayState won't get this until the instance is 
                    // in the gatewayModels list in clusterModel, which doesn't happen
                    // until after this initializer ends.
                    invokeLater(function() {
                        $this.setGatewayState(GatewayState.AVAILABLE);
                    }, 0);
                }
            },
            
            hasAttribute: function(attrName) {
                return Y.GatewayModel.ATTRS.hasOwnProperty(attrName);
            },

            /**
             * Destroy the gateway during logout processing (the clusterModel controls
             * the overall process).
             */
            destroyGateway: function() {
                this.set('clusterModel', null);
                this.set('destroyed', true);
                this.destroy();  // YUI method.
            },

            startFirstConnect: function(connectionUrl) {
                var $this = this;

                this.setGatewayState(GatewayState.DISCONNECTED);
                this.set('connectionUrl', connectionUrl);

                invokeLater(function() {$this.doConnect();}, 10);
            },

            /**
             * Start to connect to whatever we're using for our data source, after a delay.
             * The index, if given, is the index in our START_CONNECT_TIMER_LIST
             * to wait before requesting the login lock. It means that we're
             * not going to attempt to connect for that . If not given,
             * we'll use the stored startConnectIndex.
             */
            doConnect: function() {
                var $this = this;

//                CC.console.log('### In doConnect for gateway [' + 
//                                    this.get('connectionUrl') + '], instanceKey [' + 
//                                    this.get('instanceKey') + ']');

                var clusterModel = this.get('clusterModel');

                this.setGatewayState(GatewayState.CONNECTING);

                // If there are default credentials available in clusterModel, we'll start by
                // trying to use those.  If not, we'll need to get some from the user.
                var credentials = this.get('credentials');

                if (!credentials) {
                    credentials = clusterModel.get('defaultCredentials');
                }

                if (!credentials) {
                    this.get('loginProcessor')
                        .requestLoginLock($this, 
                                          function(connectionUrl, username, password) {
                                              $this.set('connectionUrl', connectionUrl);
                                              $this.set('credentials', $this.encodeCredentials(username, password));
                                              $this.doConnect2(function(callbackData) {
                                                  $this.handleBadCredentials(connectionUrl, username, password);
                                              });
                                          },
                                          $this.get('canChangeUrl'));
                } else {
                    this.set('credentials', credentials);
                    this.doConnect2(function(callbackData) {
                        // as we already have the credentials, just call our onClose so it will 
                        // cycle around again after a wait.
                        $this.onClose(callbackData);
                    });
                }
            },

            /**
             * Continue connection processing. Because processing differs between when we try to log in the
             * first time and when we try to handle the gateway going down (and thus causing an 'onClose' 
             * and getting us to try to connect again), a closeCallbackFn is passed in that will be called
             * during the connection processing if onClose() is received. Once the login is completed, this
             * is replaced with a standard call to our onClose handler.
             */
            doConnect2: function(closeListenerFn) {
                var $this = this;

                var mngtApi = this.get('mngtApi');
                if (mngtApi) {
                    // Because of the way closures work and our need to send the most up-to-date
                    // connectionUrl and username and password back to the dialog in case of
                    // errors, we need to create a new mngtApi each time through this loop--we
                    // cannot reuse it.
                    mngtApi.disconnect();  // to force the socket closed.
                    mngtApi.setChallengeHandler(null); // so we don't have any refs back to this model
                    mngtApi.setOpenListener(null);
                    mngtApi.setExceptionListener(null);
                    mngtApi.setCloseListener(null);
                }

                var impl = new MngtAPI_SNMP();
                // for debugging messages, pass this model in temporarily
                impl._snmp._gatewayModel = this;

                mngtApi = new MngtAPI(impl);
                this.set('mngtApi', mngtApi);

                // Define listeners that will only be operating during the connection stuff.
                // As soon as connection is completed, they will be replaced.
                mngtApi.setOpenListener(function(callbackData) {
                    // If we get here, it means the connection succeeded. 
                    // Go into the onOpen processing we always have done.

                    $this.clearLoginLock();

                    var clusterModel = $this.get('clusterModel');

                    if (!clusterModel.get('defaultCredentials')) {
                        clusterModel.set('defaultCredentials', $this.get('credentials'));
                    }

                    // Replace the listeners for error and close, now that we're done with login.
                    var mngtApi = $this.get('mngtApi');

                    // Since we got in, reset the #tries to 0 so we don't have error messages
                    // when we go through revalidate.
                    mngtApi.getChallengeHandler().resetTries();

                    mngtApi.setExceptionListener(function(callbackData) {
                        $this.onError(callbackData);
                    });

                    mngtApi.setCloseListener(function(callbackData) {
                        $this.onClose(callbackData);
                    });

                    // Call our standard onOpen. Note that we're NOT replacing this onOpen
                    // with the one we're calling, as we should always come through here.
                    $this.onOpen(callbackData);
                });

                mngtApi.setExceptionListener(function(callbackData) {
                    // Generally we should never get here during connection processing, 
                    // according to current (4.0) client-library processing.
                    alert("Exception during connection processing for " + $this.getDebugIdStr());
                });

                mngtApi.setCloseListener(function(callbackData) {
                    CC.console.debug('mngtApi.closeListener callback for gateway [' + 
                                          $this.get('connectionUrl') + 
                                          ', key = ' + $this.get('instanceKey') + ']');

                    closeListenerFn(callbackData);
                });

                var challengeHandler = this.makeChallengeHandler(this, this.get('credentials'));
                mngtApi.setChallengeHandler(challengeHandler);

                mngtApi.connect(this.get('connectionUrl'));
            },

            handleBadCredentials: function(connectionUrl, username, password) {
                // we should always be the loginProcessor's current lock entry at this point,
                // since we're doing a login loop for a single item.
                var loginProcessor = this.get('loginProcessor');
                loginProcessor.processLogin(true, username, password);
            },

            /**
             * Encode the username and password. The result is then used to create a
             * ChallengeResponse, and can be kept around to create another response later
             * for revalidate.
             */
            encodeCredentials: function(username, password) {
                var str = username + ':' + password;
                return btoa(unescape(encodeURIComponent(str)));  // in case we have non-ASCII chars, convert first
            },

            
            /**
             * Given some encoded credentials, create an object that supports the
             * ChallengeHandler API to return a response with the credentials when
             * challenged by the gateway.
             */
            makeChallengeHandler: function(gatewayModel, credentials) {
                return {
                    gatewayModel: gatewayModel,
                    credentials: credentials,
                    tryNumber: 0,  // how many handle() calls have been made to this handler?

                    canHandle: function(challengeRequest) {
                        return (challengeRequest != null && 
                                challengeRequest.authenticationScheme === "Basic" &&
                                challengeRequest.location.endsWith("/snmp"));
                    },

                    resetTries: function() {
                        this.tryNumber = 0;
                    },

                    handle: function(challengeRequest, callback) {
                        var $this = this;

                        CC.console.debug('challengeHandler.handle for gateway [' + 
                                              this.gatewayModel.get('connectionUrl') + 
                                              '], instanceKey [' + 
                                              this.gatewayModel.get('instanceKey') + ']');

                        if (!gatewayModel.isAuthenticated()) {
                            if (this.tryNumber > 0) {
                                // We're not yet connected. The user entered invalid credentials.
                                // Asynchronously tell the model that the challenge failed, then
                                // respond to the challenge by cancelling it. We have to do the
                                // first asynchronously so we can do the second after and not
                                // hit the timeout problem.
                                callback(null);
                                return;
                            }

                            this.tryNumber++;
                        } else {
                            // We're revalidating. As of 4.0, the revalidate will not be called again if 
                            // for some reason it fails. However, a revalidate that succeeds will not
                            // tell us anything, but will call back later for a second and subsequent
                            // revalidates when the time comes. Because of this we will NOT use tryNumber
                            // during revalidate at all--we'll just always send back a response. That will
                            // correctly handle the credentials-valid case, and we'll leave it to the gateway
                            // to NOT send a second handle() call immediately if it fails, which will 
                            // correctly handle the credentials-invalid case, FOR NOW.
                            CC.console.debug('revalidating');
                            var i = 0; // test
                        }

                        var response = null;

                        if (challengeRequest.location !== null) {
                            response = new Kaazing.Gateway.ChallengeResponse("Basic " +  this.credentials, null);
                        }

                        callback(response);
                    },

                    updateCredentials: function(credentials) {
                        this.credentials = credentials;
                    }
                };
            },

            clearStartConnectTimer: function() {
                var startConnectTimerId = this.get('startConnectTimerId');
                if (startConnectTimerId) {
                    window.clearTimeout(startConnectTimerId);
                    this.set('startConnectTimerId', null);
                }
            },

            resetStartConnectIndex: function() {
                this.set('startConnectIndex', 0);
            },

            /**
             * Return the *current* start connect wait time, if any, or 0 if none.
             */
            getStartConnectWaitTime: function() {
                var startConnectIndex = this.get('startConnectIndex');
                if (startConnectIndex > 0) {
                    startConnectIndex--;
                }
                return this.START_CONNECT_TIMER_LIST[startConnectIndex];
            },

            /**
             * Force a disconnect from the gateway, if we're not already disconnected.
             */
            disconnect: function() {
                if (this.isOpen()) {
                    this.get('mngtApi').disconnect();
                }
            },

            /**
             * Clear the login lock if we have it. This also gets called during logout
             * based on the return of the 'onClose' call when gateways are being closed
             * and destroyed, so we need to be sure that we actually still have a 
             * clusterModel pointer
             */
            clearLoginLock: function() {
                this.get('loginProcessor').clearLoginLock(this);
            },

            /**
             * Handle when the connection for this GatewayModel gets an error. 
             * XXX Does this necessarily indicate that the connection is down?
             * For 4.0, we should normally not see this--the client code swallows
             * the error and generates a CLOSE instead.
             * Just attempt to re-login.
             */
            onError: function(errorCallbackData) {
                CC.console.error("onError for " + this.getDebugIdStr());
                this.onClose(null);
            },

            /**
             * Handle when the connection for this GatewayModel is closed, 
             * AFTER it has already been successfully opened (see doConnect2()).
             * Note that this could be that we just lost the connection
             * to the GW but don't know yet if the gateway itself is really down.
             * NOTE: this could also occur if we're being disconnected during
             * logout, when the gateway has already been disconnected from the
             * clusterModel.
             */
            onClose: function(closeCallbackData) {
                var $this = this;

                CC.console.debug('standard onClose for gateway [' + this.get('connectionUrl') + 
                                      ', key = ' + this.get('instanceKey') + ']');
                
                this.set('authenticated', false);

                var clusterModel = this.get('clusterModel');

                if (this.get('stopTime')) {
                    // we're a dead instance.
                    CC.console.debug('dead instance ' + this.get('instanceKey'));
                    return;
                } else if (!clusterModel || clusterModel.get('loggingOut')) {
                    // we're logging out, do nothing
                    CC.console.debug('logging out ' + this.get('instanceKey'));
                    return;
                }

                this.setGatewayState(GatewayState.DISCONNECTED);

                // Determine how long we need to wait before attempting another doConnect.
                // Update our start connect index, the flag we're using to decide how long
                // to wait before trying a connection again.
                var index = this.get('startConnectIndex');
                if (index < this.START_CONNECT_TIMER_LIST.length - 1) {
                    this.set('startConnectIndex', index + 1);  // for next time
                }

                CC.console.log("Setting doConnect for " + 
                                    this.START_CONNECT_TIMER_LIST[index] + 
                                    "ms from now for instance " + 
                                    this.get('instanceKey'));

                this.set('startConnectTimerId', 
                         invokeLater(function() {
                             $this.doConnect();
                         }, this.START_CONNECT_TIMER_LIST[index]));
            },

            /**
             * The function that is called by the lower layer when the 
             * GatewayModel has been connected and received 'onOpen'. 
             */
            onOpen: function(openCallbackData) {
                var $this = this;

                this.set('authenticated', true);

                // Clear both the start-connect timer and start-connect index,
                // if somehow we haven't already done so (we should have).
                this.clearStartConnectTimer();
                this.resetStartConnectIndex();

                CC.console.debug("### Successfully logged into management service for " + 
                                      this.getDebugIdStr());

                this.setGatewayState(GatewayState.CONNECTED);

                CC.console.log("## onOpen, after setting gatewayState to CONNECTED");

                this.get('mngtApi').getClusterState(function(clusterStateData) {
                    invokeLater(function() {$this.onOpen1(clusterStateData);}, 0);
                });
            },

            /**
             * Handle the cluster state data. Several conditions are possible:
             *   - A first-time connection may or may not have an instanceKey
             *     already defined in the model. If it does not, it's the first
             *     gateway we're connecting to, so we need to set the instanceKey
             *     and fix it in the MapModel of gateways (w/o generating an add/remove)
             *     If it already has an instanceKey, we need to match the incoming
             *     instanceKey in the clusterStateData to it and handle if not matching.
             *   - If we're reconnecting to the gateway's connection URL after being 
             *     disconnected earlier:
             *       - the instanceKey is different (if the gateway actually went down).
             *         * Mark this gateway as down (even if we never got a LEAVE
             *           in another node that's marked the gateway as down)
             *       - the instanceKey is NOT different and the cluster name is the same
             *         (e.g. we just lost the net connection and got it back, and the
             *          gateway stayed up).
             *         * Retrieve only some of the gateway state, not everything, since 
             *           we already have most of it.
             *       - the instanceKey is the same but the cluster name is different.
             *         The gateway has been switched to a different cluster (not in 4.0) 
             *         without actually going down, so the member is no longer in the 
             *         cluster.
             *         * Either remove its data entirely from the cluster or just mark 
             *           it as stopped for this cluster. Disconnect this connection.
             */
            onOpen1: function(clusterStateData) {
                var $this = this;

                var clusterModel = this.get('clusterModel');

                var newInstanceKey = clusterStateData.instanceKey;
                var oldInstanceKey = this.get('instanceKey');

                var mngtApi = this.get('mngtApi');

                if (oldInstanceKey !== '' && oldInstanceKey !== newInstanceKey) {
                    // somehow we're opening when the gateway instance has gone 
                    // down and come back up (with a new instanceKey, same connectionUrl).
                    // If we already have a stopTime, just do nothing, because somebody
                    // else has already come along earlier to shut us down. 
                    // This is (unfortunately) a late response.
                    if (this.get('stopTime')) {
                        CC.console.warn('Somehow in onOpen1 for gateway instance ' + 
                                             this.get('instanceKey') + 
                                             ' (' + this.getDebugIdStr() + ') ' + 
                                             'that has already been stopped. ' + 
                                             'Disconnecting this gateway instance.');
                        this.disconnect();
                    } else {
                        // Shut us down, then create a new instance for the 
                        // new instanceKey and let that instance log in.
                        this.shutDown(clusterStateData.readTime);

                        // It should not be possible to have no stop time but also 
                        // have the new instance already created, but we'll check anyway.
                        if (clusterModel.findGatewayModelByInstanceKey(newInstanceKey)) {
                            CC.console.error('Somehow in onOpen1 for gateway instance ' + 
                                                  oldInstanceKey + 
                                                  ' (' + this.get('connectionUrl') + ') ' + 
                                                  'that is not marked as stopped, but a new instance ' +
                                                  'key already exists for this connection URL. ' + 
                                                  'Disconnecting this gateway instance and marking it ' +
                                                  'as stopped.');
                        } else {
                            // no instance already exists with the new key. Create it,
                            // which will start the connection processing.
                            clusterModel.createGatewayModel(newInstanceKey,
                                                            this.get('connectionUrl'));
                        }
                    }

                    // We're shut down, so have nothing left to do in this instance.
                    return;
                }

                // If we have no instance key we're the first gateway to get connected. In that
                // case we need to update the key in the clusterModel.
                if (oldInstanceKey === '') {
                    // We're just starting.
                    this.set('instanceKey', newInstanceKey);
                    clusterModel.setFirstGatewayInstanceKey(newInstanceKey);
                }

                // At this point we're either a new instance or reconnecting to an instance
                // that we were disconnected from but that has not gone down.

                // Convert the hostAndPID to its displayable value, so we don't
                // have to do so each time it's shown or keep a separate formatted 
                // version (and we can also do things like 'endsWith' on the value
                // without having to check if its null).
                var hostAndPID = clusterStateData.hostAndPID;
                if (hostAndPID !== undefined && hostAndPID !== null) {
                    var fields = hostAndPID.split('@');
                    hostAndPID = fields[1] + " : " + fields[0];
                } else {
                    hostAndPID = "";
                }

                this.set('hostAndPID', hostAndPID);

                // The following are redundant when reconnecting
                this.set('startTime', clusterStateData.startTime);
                this.set('upTime', clusterStateData.upTime);

                // If we're a standalone gateway, there is no management service map that
                // we're sent. However, to make the ClusterModel 'processClusterStateData'
                // code happy, we'll create a fake one here so it won't have to be checking
                // and overall processing will be simpler.
                if (!clusterStateData.mngtServiceMap || isEmptyObject(clusterStateData.mngtServiceMap)) {
                    clusterStateData.mngtServiceMap = {};
                    clusterStateData.mngtServiceMap[this.get('instanceKey')] = [this.get('connectionUrl')];
                }

                invokeLater(function() {
                    clusterModel.processClusterStateData(clusterStateData.clusterMembers,
                                                         clusterStateData.balancerMap,
                                                         clusterStateData.mngtServiceMap,
                                                         clusterStateData.readTime);
                }, 0);
                    
                // Start notifications. We'll queue them until we're ready to 
                // mark the gateway as AVAILABLE.
                mngtApi.startNotifications(function(data) {
                    $this.notificationCallback(data);
                });

                invokeLater(function() {$this.onOpen2();}, 0);
            },

            /**
             * Retrieve the summary-data definitions
             */
            onOpen2: function() {
                var $this = this;

                // If we've already got summary-data definitions, we're reconnecting a still-existing model.
                // For 4.0 that means we can skip getting them again.
                if (!this.get('summaryDataDefinitions')) {
                    var mngtApi = this.get('mngtApi');
                    mngtApi.getSummaryDataDefinitions(
                        function(summaryDataDefinitions) {
                            $this.set('summaryDataDefinitions', summaryDataDefinitions);

                            // Now that we have the summary-data definitions, we can create
                            // a number of sub-objects for various types of storage.

                            // Create our storage for dynamic gateway data
                            var dynamicDataModel = new Y.GatewayDynamicDataModel({gatewayModel: $this});
                            $this.set('dynamicDataModel', dynamicDataModel);
                            dynamicDataModel.addTarget($this);

                            var systemModel = new Y.SystemModel({gatewayModel: $this});
                            $this.set('systemModel', systemModel);
                            systemModel.addTarget($this);

                            var cpuListModel = new Y.CpuListModel({gatewayModel: $this});
                            $this.set('cpuListModel', cpuListModel);
                            cpuListModel.addTarget($this);
                            
                            var nicListModel = new Y.NicListModel({gatewayModel: $this});
                            $this.set('nicListModel', nicListModel);
                            nicListModel.addTarget($this);

                            var jvmModel = new Y.JvmModel({gatewayModel: $this});
                            $this.set('jvmModel', jvmModel);
                            jvmModel.addTarget($this);

                            invokeLater(function() {$this.onOpen3();}, 0);
                        }
                    );
                } else {
                    invokeLater(function() {$this.onOpen3();}, 0);
                }
            },

            /**
             * Retrieve the gateway configuration data.
             */
            onOpen3: function() {
                var $this = this;

                // If we've already got the gateway config, we're reconnecting a still-existing model.
                // For 4.0 that means we can skip getting them again.
                if (!this.get('gatewayConfig')) {
                    this.get('mngtApi').getGatewayConfiguration(
                        function(gatewayConfigData) {
                            gatewayConfigData.gatewayModel = $this;

                            var gatewayConfig = new Y.GatewayConfigModel(gatewayConfigData);  
                            $this.set('gatewayConfig', gatewayConfig);

                            // create the ServiceModel instances for our configured services.
                            var serviceModels = $this.get('serviceModels'); // Y.MapModel

                            var startTime = $this.get('startTime');

                            var serviceConfigs = gatewayConfig.get('serviceConfigs');
                            
                            // make a ServiceModel for all except the management services, since
                            // they won't be sending any data over (and we don't want to imply
                            // that they will by showing them).
                            for (var i = 0; i < serviceConfigs.length; i++) {
                                var serviceConfig = serviceConfigs[i];
                                if (!serviceConfig.isManagement()) {
                                    var serviceId = serviceConfig.get('serviceId');
                                    var serviceModel = new Y.ServiceModel({gatewayModel: $this,
                                                                           serviceId: serviceId,
                                                                           startTime: startTime});
                                    serviceModels.putItem(serviceId, serviceModel); 
                                }
                            }

                            invokeLater(function() {$this.onOpen4();}, 0);
                        }
                    );
                } else {
                    invokeLater(function() {$this.onOpen4();}, 0);
                }
            },

            onOpen4: function() {
                var $this = this;

                this.get('mngtApi').getGateway(
                    function(gatewayDatum) {
                        $this.get('dynamicDataModel').load(gatewayDatum);  // causes an 'update' event
                        invokeLater(function() {$this.onOpen5();}, 0);
                    }
                );
            },

            onOpen5: function() {
                var $this = this;

                this.get('mngtApi').getSystemStats(
                    function(systemStats) {
                        $this.get('systemModel').load(systemStats);  // causes an 'update' event
                        invokeLater(function() {$this.onOpen6();}, 0);
                    }
                );
            },

            onOpen6: function() {
                var $this = this;

                this.get('mngtApi').getCpuListStats(
                    function(cpuListStats) {
                        $this.get('cpuListModel').load(cpuListStats);  // causes an 'update' event
                        invokeLater(function() {$this.onOpen7();}, 0);
                    }
                );
            },

            onOpen7: function() {
                var $this = this;

                this.get('mngtApi').getNicListStats(
                    function(nicListStats) {
                        $this.get('nicListModel').load(nicListStats);  // causes an 'update' event
                        invokeLater(function() {$this.onOpen8();}, 0);
                    }
                );
            },

            onOpen8: function() {
                var $this = this;

                this.get('mngtApi').getJVMStats(
                    function(jvmStats) {
                        $this.get('jvmModel').load(jvmStats);  // causes an 'update' event
                        invokeLater(function() {$this.onOpen9();}, 0);
                    }
                );
            },

            onOpen9: function() {
                var $this = this;

                // get the live service data for all services
                $this.get('mngtApi').getServices(
                    function(serviceDataList) {
                        // get the current map of service modeld
                        var serviceModels = $this.get('serviceModels'); // Y.MapModel

                        // processing live data for all the services. The list had better
                        // match the list of services known in the config! If not,
                        // something changed since getting the config.
                        // For 4.0 we'll assume not, as that would require restarting
                        // the gateway
                        serviceDataList.forEach(function(serviceDatum) {
                            serviceModels.getItem(serviceDatum.serviceId).load(serviceDatum); 
                        });

                        invokeLater(function() {$this.onOpen10();}, 0);
                    }
                );
            },

            onOpen10: function() {
                var $this = this;

                var fn = function(servicesList) {
                    if (servicesList && servicesList.length > 0) {
                        var serviceModel = servicesList.shift();
                        $this.get('mngtApi').setServiceNotifications(serviceModel.get('serviceId'),
                                                                     1, 
                                                                     function(){fn(servicesList);});
                    } else {
                        invokeLater(function() {$this.onOpen11();}, 0);
                    }
                };

                fn($this.getServices());
            },

            onOpen11: function() {
                var $this = this;
                
                this.get('mngtApi').getGatewaySessions(
                    function(sessionDataList) {
                        var serviceSessionData, 
                        sessionDatum, 
                        readTime, 
                        serviceModels, 
                        serviceSessions;

                        CC.console.debug("GetGatewaySessions for " + 
                                              $this.getDebugIdStr() +
                                              "\n   returned " + 
                                              sessionDataList.length + 
                                              " current sessions");

                        // We have no way to know the real close time for any local sessions
                        // we already have, so use the time from the incoming session data, if any.
                        readTime = (sessionDataList && sessionDataList.length > 0
                                    ? sessionDataList[0].readTime 
                                    : Date.now());

                        // Split the incoming session data into their services, so the services
                        // can process their own set themselves.
                        serviceSessions = {};  // one entry per serviceId, keyed by serviceId

                        for (var i = 0; i < sessionDataList.length; i++) {
                            sessionDatum = sessionDataList[i];
                            serviceSessionData = serviceSessions["" + sessionDatum.serviceId];
                            if (!serviceSessionData) {
                                serviceSessionData = {};
                                serviceSessions["" + sessionDatum.serviceId] = serviceSessionData;
                            }

                            serviceSessionData["" + sessionDatum.sessionId] = sessionDatum;
                        }

                        serviceModels = $this.getServices();
                        serviceModels.forEach(function(serviceModel) {
                            serviceSessionData = serviceSessions["" + serviceModel.get('serviceId')];
                            serviceModel.updateSessionData(serviceSessionData, readTime);
                        });

                        invokeLater(function() {$this.onOpen12();}, 0);
                    }
                );
            },

            onOpen12: function() {
                // Finish logging into a gateway by processing any queued notifications
                // we've accrued during initialization and checking for other known gateways
                // in the cluster.
                this.processQueuedNotifications();

                // Mark the gateway as AVAILABLE. Also set a flag so the views know that
                // login was completed at least once, regardless of current state.
                this.set('loginCompleted', true);
                this.setGatewayState(GatewayState.AVAILABLE);
                this.get('clusterModel').loginCompleted(this);

                this.get('dynamicDataModel').addTarget(this);
                this.on(Y.GatewayDynamicDataModel.prototype.UPDATE_EVENT,
                    this.onUpdateDataModel,
              	this);
            },

            /**
             * Do all the relevant processing needed to mark the gateway instance as 'shut down'
             * or 'stopped' permanently. The data the gateway contains is still available for 
             * use, but the gateway is no longer "live".
             */
            shutDown: function(stopTime) {
                if (!this.get('stopTime')) {
                    CC.console.log('### Marking gateway instance at [' + 
                                        this.get('connectionUrl') + 
                                        ' with instanceKey [' + this.get('instanceKey') +
                                        "] as shut down, at stop time " + stopTime);
                    this.set('stopTime', stopTime);
                    this.disconnect();

                    // issue a last dynamic data record so charts know the instance is stopped.
                    // All we need to do is zero out the 'current sessions' total, since that's
                    // the only value that's "live" in the dynamic data. The others are all ongoing
                    // totals, which will stay as they are.
                    var dynamicDataModel = this.get('dynamicDataModel');
                    if (dynamicDataModel) {
                        dynamicDataModel.shutDown(stopTime);
                    }
                    
                    // various 'just in case' things
                    this.clearLoginLock();
                    this.clearStartConnectTimer();
                    this.resetStartConnectIndex();
                }
            },

            /**
             * The handler for notifications from the low level. The SNMP layer 
             * has parsed some of the data and converted it into a 'notification object' 
             * so we don't have to know about things like OIDs. 
             * Route the notification depending on its type and some of its contents
             * Obviously all gateway or lower level notification are to THIS gateway.
             */
            notificationCallback: function(notificationObj) {
                if (this.get('stopTime')) {
                    // we're dead, just bail. Don't even try to forward any cluster-level stuff.
                    return;
                }

                var notificationType = notificationObj.type;

                if (notificationType === CC.Constants.NotificationType.MEMBERSHIP_CHANGE) {
                    this.get('clusterModel').processMembershipChange(notificationObj);
                } else if (notificationType === CC.Constants.NotificationType.MANAGEMENT_SERVICE_CHANGE) {
                    this.get('clusterModel').processManagementServiceChange(notificationObj);
                } else if (notificationType === CC.Constants.NotificationType.CONNECTION_LIMIT_CHANGE) {
                    this.get('clusterModel').processConnectionLimitChange(notificationObj);
                } else if (notificationType === CC.Constants.NotificationType.BALANCER_MAP_CHANGE) {
                    this.processBalancerMapChange(notificationObj);
                } else {
                    notificationObj.gatewayModel = this;

                    if (!this.isAvailable()) {
                        // we're not done getting the gateway set up, so queue for later processing
                        this.pushNotification(notificationObj);
                    } else {
                        this.processNotification(notificationObj);
                    }
                }
            },

            /**
             * During gateway setup, push a notification onto the notification queue.
             */
            pushNotification: function(notificationObj) {
                this.get('notificationQueue').push(notificationObj);
            },

            /**
             * Process receiving a LEAVE (called from ClusterModel).
             *
             * The gateway is no longer part of the cluster (and presumably will not
             * be coming back with the current instanceKey, at least in this cluster?)
             * In 4.0 that also means that the gateway is going down or already dead,
             * so we should close if we're still connected.
             * In later releases it may just mean the gateway is leaving the cluster 
             * for another one, or could mean that it's dead. We may want to go 
             * to an "unclustered" state where we're still known to management,
             * but shown differently (removed from the cluster). 
             * 
             * Note that CLIENT-mode gateways aren't in cluster state, so we won't hear about them.
             */
            processLeave: function(stopTime) {
                CC.console.log("### processLeave for gateway " + this.getDebugIdStr());
                this.shutDown(stopTime);
            },

            /**
             * Process a notification telling us of a change in a given gateway's list of 
             * management services. 
             * XXX For 4.0, only 'add' is supported
             *
             * @param eventType 'add', 'remove' 
             * @param accepts array of accept URIs
             */
            processAddManagementService: function(accepts, readTime) {
                var connectionUrl = this.get('connectionUrl');
                var instanceKey = this.get('instanceKey');

                if (connectionUrl) {
                    // we already saw an event for adding a management service, so do nothing.
                    CC.console.log(this.getDebugIdStr() + 
                                        ' ignoring addManagementService for instanceKey ' + instanceKey +
                                        ' because connectionUrl is already set: ' + connectionUrl);
                    return;
                }

                if (!accepts) {
                    CC.console.error(this.getDebugIdStr() + 
                                          ' adding management service for instanceKey ' + instanceKey + 
                                          ' but it has no accepts!');
                    return;
                }

                // Find a connection URL. If there is one for WSS, take that.
                // Otherwise, if there is one for WS, take that. If neither
                // is true, we still can't connect.
                connectionUrl = null;

                for (var i = 0; i < accepts.length; i++) {
                    var acceptUrl = accepts[i];
                    if (acceptUrl.startsWith('wss://')) {
                        connectionUrl = acceptUrl;
                        break;
                    } else if (acceptUrl.startsWith('ws://')) {
                        connectionUrl = acceptUrl;
                        // keep looking for WSS
                    }
                }

                if (!connectionUrl) {
                    // We still can't find a useful connection URL, so we have to continue unmanaged.
                    CC.console.warn(this.getDebugIdStr() + 
                                         " Adding management service for instanceKey " + instanceKey + 
                                         " but it has no WS:// or WSS:// accepts!");
                    return;
                } 

                CC.console.info(this.getDebugIdStr() + 
                                     ' Adding management service for instance key ' + instanceKey + 
                                     ', connectionUrl ' + connectionUrl);

                this.set('canChangeUrl', false);  // because we're getting a URL from data, not user entry.

                // Connect. Note that because we're picking up the URL from a management-service
                // notification, we are not allowed to change it.
                this.startFirstConnect(connectionUrl);
            },

            processRemoveManagementService: function(accepts, readTime) {
                // not doing anything for 4.0
            },

            processBalancerMapChange: function(notificationObj) {
                // not doing anything for 4.0
//                CC.console.info(this.getDebugIdStr() + 
//                                     " NOT YET PROCESSING BALANCER_MAP_CHANGE notification!");
            },

            /**
             * Handle gateway-level notifications, or pass on 
             * service/session notifications to the next level
             */
            processNotification: function(notificationObj) {

                // NOTE: we do know (based on the SNMP layer) that the notification type
                // is one of the known ones--we don't need to check for that here, though
                // we do need to make sure the data fields are valid.
                var notificationType = notificationObj.type;

                switch (notificationType) {
                case CC.Constants.NotificationType.GATEWAY_SUMMARY: 
                    this.get('dynamicDataModel').processNotification(notificationObj);
                    break;
                case CC.Constants.NotificationType.SYSTEM_SUMMARY: 
                    this.get('systemModel').processNotification(notificationObj);
                    break;
                case CC.Constants.NotificationType.CPU_LIST_SUMMARY: 
                    this.get('cpuListModel').processNotification(notificationObj);
                    break;
                case CC.Constants.NotificationType.NIC_LIST_SUMMARY: 
                    this.get('nicListModel').processNotification(notificationObj);
                    break;
                case CC.Constants.NotificationType.JVM_SUMMARY:
                    this.get('jvmModel').processNotification(notificationObj);
                    break;
                default:
                    //CC.console.debug("#### Gateway.processNotif: " + 
                    //                      "Processing service or session notif:");
                    //dumpNotificationData(notificationObj);

                    // The notification is service or session level
                    var serviceModel = this.getService(notificationObj.serviceId);

                    if (serviceModel) {
                        serviceModel.processNotification(notificationObj);
                    } else {
                        CC.console.error("#### Processing a service-or-session notification for:\n   " +
                                              this.getDebugIdStr() + ",\n   " + 
                                              "service ID " + notificationObj.serviceId + ",\n   " + 
                                              "session ID " + notificationObj.sessionId + ",\n   " + 
                                              "### SERVICE WAS NOT FOUND");
                    }
                }
            },

            /**
             * Process notifications that were queued during the login and onOpen processing.
             */
            processQueuedNotifications: function() {
                var $this = this;

                var notificationQueue = this.get('notificationQueue');
                var numNotifications = notificationQueue.length;

                CC.console.debug("Processing " + numNotifications + 
                                      " queued notifications for " + 
                                      $this.getDebugIdStr() + ":");

                if (numNotifications > 0) {
                    while(notificationQueue.length > 0) {
                        // XXX need to test here to see if connection has been lost
                        var notificationObj = notificationQueue.shift();
                        $this.processNotification(notificationObj);
                    }

                    CC.console.debug("Done processing queued notifications for " + 
                                          this.getDebugIdStr());
                }
            },

            isConnecting: function() {
                return this.get('gatewayState') === GatewayState.CONNECTING;
            },

            isOpen: function() {
                var mngtApi = this.get('mngtApi');
                return (mngtApi !== null && mngtApi.isOpen());
            },

            isDisconnecting: function() {
                return this.get('gatewayState') === GatewayState.DISCONNECTING;
            },

            isAvailable: function() {
                return this.get('gatewayState') === GatewayState.AVAILABLE;
            },

            /**
             * Indicate if the user has been authenticated and the connection is open.
             * If there is no challenge handler, just checks if it is open.
             */
            isAuthenticated: function() {
                return this.get('authenticated');
            },

            /**
             * Specially for the config views, though useful elsewhere as well, 
             * indicate if the gateway data is "usable". For them, that means 
             * "we've completed the login/onOpen process at least once, and we 
             * do not have a stopTime (i.e. we're not disconnected from the cluster).
             */
            isUsable: function() {
                return (this.get('loginCompleted') && !this.get('stopTime') ? true : false);
            },

            /**
             * Set/change the state, and (if appropriate) generate an event telling 
             * the rest of the system that the gateway is or is no longer available.
             * We don't really want anybody listening just for changes to the state.
             */
            setGatewayState: function(gatewayState) {
                var oldGatewayState = this.get('gatewayState');

                if (oldGatewayState !== gatewayState) {
                    CC.console.info('Marking gateway at [' + this.get('connectionUrl') + 
                                         '], instanceKey [' + this.get('instanceKey') + 
                                         '] as ' + this.gatewayStateString(gatewayState));
                    this.set('gatewayState', gatewayState);

                    if (gatewayState === GatewayState.AVAILABLE) {
                        this.fire(this.GATEWAY_AVAILABLE_EVENT, {gatewayModel: this});
                    } else if (oldGatewayState === GatewayState.AVAILABLE) {
                        this.fire(this.GATEWAY_UNAVAILABLE_EVENT, {gatewayModel: this});
                    }
                }
            },

            gatewayStateString: function(gatewayState) {
                switch (gatewayState) {
                case GatewayState.UNINITIALIZED: return "UNINITIALIZED";
                case GatewayState.DISCONNECTED:  return "DISCONNECTED";
                case GatewayState.DISCONNECTING: return "DISCONNECTING";
                case GatewayState.CONNECTING:    return "CONNECTING";
                case GatewayState.CONNECTED:     return "CONNECTED";
                case GatewayState.AVAILABLE:     return "AVAILABLE";
                default: return "UNKNOWN";
                }
            },

            isCluster: function() {
                var config = this.get('gatewayConfig');
                if (!config) {
                    return false;
                }

                // As of 4.0, 'mode' is gone, so we no longer distinguish standalone
                // gateways from clusters of 1. In both cases, we eliminate the
                // (empty) cluster config
                var clusterConfig = config.get('clusterConfig');
                return (clusterConfig !== undefined && clusterConfig !== null);
            },

            isClusterPeer: function() {
                return this.isCluster();  // if we're a cluster, ALL are peers
            },

            /**
             * Returns a unique, constant, string for the given gateway.
             * The string must not change if the gateway goes down and
             * restarts but is to be considered the 'same' gateway.
             * Initially we'll use the gatewayLabel (because it is 
             * created from the management service accept URL). If/when
             * we start having identical config behind a load balancer,
             * we'll probably have to use something else.
             */
            getUniqueId: function() {
                return this.get('gatewayLabel');
            },

            /**
             * Event propagation when we add a new ServiceModel. Note that we
             * do NOT add ourselves as a target of the new model, as the map 
             * it is in is already a target, and we are a target of that.
             */
            onServiceModelAdd: function(ev) {
                ev.halt(true);

                var item = ev.item;

                if (item.name === 'serviceModel') {
                    CC.console.debug("GatewayModel:onServiceModelAdd for service ID " + 
                                          item.get('serviceId'));
                    this.fire(this.ADD_SERVICE_EVENT, {serviceModel: item});
                } else {
                    CC.console.debug("GatewayModel:onServiceModelAdd - " + 
                                          "ignoring mapModel:add event for item.name = " + 
                                          item.name);
                }
            },

            /**
             * Event propagation after we remove a ServiceModel.
             * We are not a target of an individual model, just the map that contains them
             */
            onServiceModelRemove: function(ev) {
                ev.halt(true);

                var item = ev.item;

                if (item.name === 'serviceModel') {
                    CC.console.debug("GatewayModel:onServiceModelRemove for service ID " + 
                                          item.get('serviceId'));
                    this.fire(this.REMOVE_SERVICE_EVENT, {serviceModel: item});
                } else {
                    CC.console.debug("GatewayModel:onServiceModelRemove - " + 
                                          "ignoring mapModel:remove event for item.name = " + 
                                          item.name);
                }
            },

            onUpdateDataModel: function(ev) {
                this.fire(this.UPDATE_AVAILABLE_EVENT, {newVersion: ev.data[this.summaryAttributeIndex("gateway", "latestUpdateableGatewayVersion")] });
            },
            
            /**
             * Return a particular service model, given its service ID. If not found, return null.
             */
            getService: function(serviceId) {
                return this.get('serviceModels').getItem(serviceId);
            },

            /**
             * Return the service models, if any, as a list. If none, return null.
             */
            getServices: function() {
                var serviceModels = this.get('serviceModels').values();
                return (serviceModels.length > 0 ? serviceModels : null);
            },

            /**
             * For use with select lists, return a sorted list of 
             * service labels from the gateway.
             * If there are none, return an empty list.
             */
            getMembersList: function() {
                var serviceModels = this.getServices();
                var labels = [];
                if (serviceModels) {
                    for (var i = 0; i < serviceModels.length; i++) {
                        labels[i] = serviceModels[i].get('serviceLabel');
                    }
                }
                labels.sort(function(a, b) {
                    return compareStrings(a.toLowerCase(), b.toLowerCase());
                });
                return labels;
            },

            /**
             * Return the latest value for a given attribute across all services,
             * as an array. The caller can then do whatever they like with the
             * values (total them, average them, find one particular one, etc.)
             * This is much easier than getting all of them, as we only need to 
             * get the last one in each chain--the times don't matter, since we
             * assume each value stays the same if no further values are registered
             * for it.
             */
            getLatestAcrossServices: function(attr) {
                var arr = [];
                var serviceModels = this.getServices();
                if (serviceModels) {
                    serviceModels.forEach(function(serviceModel) {
                        arr.push(serviceModel.get(attr));  // gets the latest
                    });
                }
                return arr;
            },

            /**
             * Given one of the type names of objects that have summary data
             * (stored here in summaryDataDefinitions), return the index of
             * the given field in the list of summary field names for that
             * type (or -1 if the field is not one defined for that type or
             * the type itself does not exist.
             */
            summaryAttributeIndex: function(typeName, attrName) {
                var summaryDataDefinitions = this.get('summaryDataDefinitions');
                var typeData = summaryDataDefinitions[typeName];
                if (!typeData) {
                    return -1;
                }

                return typeData.fields.indexOf(attrName);  // will return -1 if not present.
            },

            getSummaryDataDefinition: function(typeName) {
                var summaryDataDefinitions = this.get('summaryDataDefinitions');
                var typeData = summaryDataDefinitions[typeName];
                return typeData;
            },

            getDebugIdStr: function() {
                return 'gateway (' + this.get('gatewayLabel') + ')';
            },

            /**
             * Utility function for the pseudo-attributes that want to just return the 
             * current value for one of the dynamic data attributes
             */
            getDynamicDataValue: function(attrName) {
                var dynamicDataModel = this.get('dynamicDataModel');
                return (dynamicDataModel ? dynamicDataModel.getValue(attrName) : null);
            },

            /**
             * Utility function for the pseudo-attributes that want to just return the 
             * current value for one of the system data attributes
             */
            getSystemDataValue: function(attrName) {
                var systemModel = this.get('systemModel');
                return (systemModel ? systemModel.getValue(attrName) : null);
            },

            isManaged: function() {
                return (this.get('connectionUrl') ? true : false);
            },

            dump: function() {
                CC.console.debug("GatewayModel for GW " + this.getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'gatewayState', offset);
                dumpAttr(this, 'connectionUrl', offset);
                dumpAttr(this, 'gatewayConfig', offset);
                dumpAttr(this, 'hostAndPID', offset);
                dumpAttr(this, 'startTime', offset);
                dumpAttr(this, 'instanceKey', offset);
                dumpAttr(this, 'upTime', offset);
            }

        }, {
            ATTRS: {
                /**
                 * Reference back to the cluster model (it is passed in on creation)
                 */
                clusterModel: {
                    value: null
                },

                /**
                 * Reference to the clusterModel's loginProcessor, so we don't have to
                 * keep going there to get it.
                 */
                loginProcessor: {
                    value: null
                },

                /** 
                 * The encoded credentials for logging into the gateway.
                 */
                credentials: {
                    value: null
                },

                /**
                 * Has the user managed to get an onOpen, indicating that either there is no
                 * challengeHandler or that there is an it ran successfully AND that the
                 * connection is currently open?
                 */
                authenticated: {
                    value: false
                },

                // Unique string identifying an instance of a gateway. If the gateway goes
                // down and comes back up, this value will be different, so we know that
                // the original gateway is gone (not true if not a cluster!)
                instanceKey: {
                    value: ''
                },

                /**
                 * Time the gateway model was created. If we have no live-processing
                 * data, 'readTime' will return this.
                 */
                createTime: {
                    value: null
                },

                //-----------------------------------------------------------------
                // Properties used to manage the connection to the management 
                // service on the gateway, if connectionUrl is defined.
                // Those without a connectionUrl don't use any of the following.
                //-----------------------------------------------------------------

                /**
                 * Are we allowed to change the URL on first connect? This is only
                 * true for the first gateway, or the first gateway after we have
                 * lost connection to all gateways. Passed in on creation.
                 */
                canChangeUrl: {
                    value: false
                },

                /**
                 * The current state of the gateway
                 */
                gatewayState: {
                    value: GatewayState.UNINITIALIZED
                },

                /**
                 * Has the gateway completed the login/initialization process at least once?
                 */
                loginCompleted: {
                    value: false
                },

                /**
                 * The URL we'll use to connect to the SNMP agent which ever instance of 
                 * the gateway this model is talking to. Passed in during construction (or
                 * added if, somehow, we initially create a GW without a connection URL and
                 * later get a new management service notification or join/leave.
                 * NOTE: this does NOT indicate the connection status--we may or may not 
                 * actually be able to connect to the URL.
                 */
                connectionUrl: {
                    value: null
                },

                /**
                 * The instance of the MngtApi that is connected to the gateway at the
                 * connectionUrl. Passed in during construction.
                 */
                mngtApi: {
                    value: null
                },

                /**
                 * For connected gateways, to avoid losing notifications while the gateway
                 * data is being retrieved, we'll start receiving notifications as soon
                 * as the gateway is open, and queue them (except for cluster ones like
                 * LEAVE) until "initialization" is complete (i.e. we have all the service
                 * and session data, and have done a 'makeGatewayAvailable').
                 * This is the queue for storing the notification objects (these are the 
                 * ones passed back to notificationCallback.) At the end of initialization, 
                 * we'll process all the notifications in order.
                 */
                notificationQueue: {
                    value: []
                },

                /**
                 * The next available index in the startConnectTimer list that we're on.
                 */
                startConnectIndex: {
                    value: 0
                },

                startConnectTimerId: {
                    value: null
                },

                //-----------------------------------------------------------------
                //        PROPERTIES FOR GATEWAYS WITH A MANAGEMENT SERVICE
                // Gateways without a management service we cannot talk to to 
                // retrieve anything.
                //-----------------------------------------------------------------

                /**
                 * Config data for the gateway (loaded once only.)
                 * Note that this also includes an instance of Y.ClusterConfigModel.
                 */
                gatewayConfig: {
                    value: null  // a GatewayConfigModel
                },

                /**
                 * An object containing the 'summary data' field names for each
                 * object type (gateway, service, session, system, cpuList, nicList, jvm).
                 * Each object type above is a property on this object.
                 * The summary data is sent without field names, but the order of the
                 * data in each summary data array matches the fields names here.
                 */
                summaryDataDefinitions: {
                    value: null
                },

                /**
                 * The gateway's dynamic data.
                 */
                dynamicDataModel: {
                    value: null  // a Y.GatewayDynamicDataModel
                },

                /**
                 * The system model (dynamic system memory and processor data) for 
                 * the host containing the gateway.
                 */
                systemModel: {
                    value: null
                },

                /**
                 * The cpu list model (cpu data across all CPUs on the machine the
                 * gateway is running on). The object itself is created during the 
                 * initializer, but not loaded until during open() processing.
                 */
                cpuListModel: {
                    value: null
                },

                /**
                 * The nic list model (cpu data across all NICs on the machine the
                 * gateway is running on). We're 
                 */
                nicListModel: {
                    value: null
                },

                /**
                 * The JVM model (JVM data for the JVM running the gateway)
                 */
                jvmModel: {
                    value: null
                },

                /**
                 * Y.MapModel of ServiceModels, one per service in the gateway, 
                 * keyed by serviceId. These are the instances of live data, 
                 * not the config data.
                 */
                serviceModels: {    
                    valueFn: function() {
                        var ml = new Y.MapModel({model: Y.ServiceModel});
                        ml.modelName = 'ServiceModel';
                        return ml;
                    }
                },

                // The following 3 all come from the Gateway Entry data (which I 
                // though was supposed to be all "live"). We set these during
                // the callback for 'getGateway'.
                hostAndPID: {
                    value: null
                },

                upTime: {
                    value: null
                },

                startTime: {
                    value: null
                },

                stopTime: {
                    value: null
                },

                // Used for version updates
                lastSeenVersion: {
                	value: ""
                },
                
                // Various pseudo-attributes (either computed data or data
                // from sub-structures we want to be able to access via
                // the GatewayModel, so we don't have to do anything weird
                // in the display code to make it know too much about
                // the sub-structures.

                // A label for showing the gateway in lists or graphics or debug msgs.
                // We also use this as the user-visible unique identifier for gateway instances.
                // Since the gateway state can change over time for gateways that come
                // up after we start, this is recomputed as needed.
                gatewayLabel: {
                    getter: function(currValue, attrName) {
                        var url = (this.get('connectionUrl') || this.get('instanceKey'));

                        var pos = url.indexOf('//');
                        if (pos >= 0) {
                            url = url.substring(pos + 2);
                        }

                        pos = url.indexOf('/');
                        if (pos >= 0) {
                            url = url.substring(0, pos);
                        }

                        return url;
                    }
                },

                //====================================================
                // The "pseudo" attributes for the values from the
                // GatewayProcessingDataModel.
                // Actually, we're ignoring the gateway processing
                // values, which are not currently being correctly
                // kept up to date, and doing a rollup of service-level
                // values instead, which works fine.
                //====================================================
                totalCurrentSessions: {
                    getter: function(currValue, attrName) {
                        var arr = this.getLatestAcrossServices('totalCurrentSessions');
                        var val = arr.reduce(function(prev, curr, index, arr) {
                            return (prev + (curr === null ? 0 : curr));
                        }, 0);
                        return val;
                    }
                },

                totalBytesReceived: {
                    getter: function(currValue, attrName) {
                        var arr = this.getLatestAcrossServices('totalBytesReceived');
                        var val = arr.reduce(function(prev, curr, index, arr) {
                            return (prev + (curr === null ? 0 : curr));
                        }, 0);
                        return val;
                    }
                },

                totalBytesSent: {
                    getter: function(currValue, attrName) {
                        var arr = this.getLatestAcrossServices('totalBytesSent');
                        var val = arr.reduce(function(prev, curr, index, arr) {
                            return (prev + (curr === null ? 0 : curr));
                        }, 0);
                        return val;
                    }
                },

                readTime: {
                    getter: function(currValue, attrName) {
                        var dynamicReadTime = this.getDynamicDataValue('readTime');
                        return (dynamicReadTime ? dynamicReadTime : this.get('createTime'));
                    }
                },
                
                //=============================================================
                // The "pseudo" attributes for the values from the SystemModel
                //=============================================================
                osName: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                uptimeSeconds: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                totalFreeMemory: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                totalUsedMemory: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                totalMemory: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                totalFreeSwap: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                totalUsedSwap: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                totalSwap: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                freeMemoryPercentage: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                usedMemoryPercentage: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                freeSwapPercentage: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                usedSwapPercentage: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                },

                cpuPercentage: {
                    getter: function(currValue, attrName) {
                        return this.getSystemDataValue(attrName);
                    }
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'cluster-model', 'service-model', 'session-model', 
               'gateway-dynamic-data-model', 'gateway-cluster-data-model',
               'jvm-model', 'system-model', 'cpu-list-model', 'nic-list-model']
});
