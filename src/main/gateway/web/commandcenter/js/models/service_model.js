/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The service-model module contains the data for a single service
 * within a single gateway within the Kaazing Command Center application.
 *
 * @module service-model
 */
YUI.add('service-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'serviceModel';

    /**
     * The model for a given service within a given gateway.
     *
     * @class ServiceModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ServiceModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            ADD_SESSION_EVENT:    NAME + ':addSession',
            REMOVE_SESSION_EVENT: NAME + ':removeSession',

            initializer: function() {
                var $this = this;

                this.publish(this.ADD_SESSION_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              bubbles: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });
                this.publish(this.REMOVE_SESSION_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              bubbles: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });

                var dynamicDataModel = new Y.ServiceDynamicDataModel({serviceModel: this});
                this.set('dynamicDataModel', dynamicDataModel);
                dynamicDataModel.addTarget(this);

                var sessionModels = this.get('sessionModels');

                // Add us as a target of the sessionModels map, for general bubbling
                // of SessionModel events. The SessionModels bubble through the map.
                sessionModels.addTarget(this); 

                // Now that we're a target of the new sessionModels map, we need
                // to convert MAPMODEL_ADD_EVENTs from it to a different event type.
                this.on(Y.MapModel.prototype.MAPMODEL_ADD_EVENT, 
                        this.onSessionAdd, 
                        this);
                this.on(Y.MapModel.prototype.MAPMODEL_REMOVE_EVENT, 
                        this.onSessionRemove, 
                        this);

                // Add us as a target for gateway setting the stopTime, so we pick
                // up the same stop time here.
                var gatewayModel = this.get('gatewayModel');
                gatewayModel.after('gatewayModel:stopTimeChange',
                                   this.afterStopTimeChange,
                                   this);
            },

            hasAttribute: function(attrName) {
                return Y.ServiceModel.ATTRS.hasOwnProperty(attrName);
            },

            load: function(serviceDatum) {
                this.get('dynamicDataModel').load(serviceDatum);
            },

            /**
             * Handle service-level notifications, or pass on 
             * session notifications to the next level.
             */
            processNotification: function(notificationObj) {

                // NOTE: we do know (based on the SNMP layer) that the notification type
                // is one of the known ones--we don't need to check for that here, though
                // we do need to make sure the data fields are valid.
                var notificationType = notificationObj.type;

                switch (notificationType) {
                case CC.Constants.NotificationType.SERVICE_SUMMARY:
                    //CC.console.debug("SERVICE_SUMMARY notification");
                    this.get('dynamicDataModel').processNotification(notificationObj);
                    break;
                case CC.Constants.NotificationType.SESSION_OPEN:
                    this.processSessionOpen(notificationObj);
                    break;
                case CC.Constants.NotificationType.SESSION_CLOSE:
                    this.processSessionClose(notificationObj);
                    break;
                case CC.Constants.NotificationType.CURRENT_SESSION_COUNT:
                    // service-level notification that the current session count has changed.
                    // Note that a separate notification comes for the total session count--
                    // we do not change the total ourselves in response to this notif.

                    //CC.console.debug("#### Temporarily ignoring a " + 
                    //                      "CURRENT_SESSION_COUNT notification for:\n   " + 
                    //                      this.getDebugIdStr());
                    break;
                case CC.Constants.NotificationType.TOTAL_SESSION_COUNT:
                    // service-level notification that the total session count has changed.
                    // Note that a separate notification comes for the current session count--
                    // we do not change the current # ourselves in response to this notif.

                    //CC.console.debug("#### Temporarily ignoring a TOTAL_SESSION_COUNT " + 
                    //                      "notification for:\n   " + 
                    //                      this.getDebugIdStr());
                    break;
                default:
                    this.processSessionNotification(notificationObj);
                }
            },

            /**
             * Given a notification from a session open, add the session. We can't use
             * storeSessionModel, because that is for already existing sessions, and 
             * doesn't check whether they're missing.
             * XXX EnableNotifications is assumed 0, as it is not sent.
             */
            processSessionOpen: function(notificationObj) {
                var sessionId = notificationObj.sessionId;

//                CC.console.debug("SESSION_OPEN for session ID " + sessionId + "\n   " + 
//                                      ", serviceId " + notificationObj.serviceId + " for service:\n   " + 
//                                      this.getDebugIdStr());
                
                // NOTE: the notification object already has been parsed from a JSON string,
                // so various JSON fields do not need to be parsed again.
                var sessionModel = 
                    new Y.SessionModel({serviceModel: this,
                                        serviceId: this.get('serviceId'),
                                        sessionId : sessionId,
                                        sessionOpen: 1,
                                        enableNotifications: 0,
                                        startTime: notificationObj.startTime,
                                        localAddress: notificationObj.localAddress,
                                        remoteAddress: notificationObj.remoteAddress,
                                        principals: notificationObj.principals,
                                        sessionTypeName: notificationObj.sessionTypeName,
                                        sessionDirection: notificationObj.sessionDirection,
                                        extensions: notificationObj.extensions,
                                        protocolVersion: notificationObj.protocolVersion});

                // We don't get any of the session dynamic data yet, but a lot of the display stuff 
                // depends on it being there. Since the session is just open now, it can't actually 
                // have any non-zero totals, so we'll create an item for it now. The 'setup' routine 
                // for session dynamic data expects an object with at least two fields: 'summaryData' 
                // (with all dynamic attrs except 'readTime') and 'readTime'). Create that here.
                var sessionDataDefinition = this.get('gatewayModel').getSummaryDataDefinition('session');
                var numFields = sessionDataDefinition.fields.length - 1; // to exclude 'readTime'
                var summaryData = [];

                for (var i = 0; i < numFields; i++) {
                    summaryData[i] = 0;
                }

                sessionModel.load({summaryData: summaryData});
                
                var sessionModels = this.get('sessionModels');
                sessionModels.putItem(sessionId, sessionModel);

                // XXX do something here to add to official session counts?
                // There is an issue in that the data is also updated by the
                // repeating notification, and we really don't have enough
                // info in the open for a full dynamic data item.
            },

            processSessionClose: function(notificationObj) {
                var sessionId = notificationObj.sessionId;
                var stopTime = notificationObj.readTime;

//                CC.console.debug("SESSION_CLOSE for session ID " + sessionId + "\n   " + 
//                                      ", serviceId " + notificationObj.serviceId + " for service:\n   " + 
//                                      this.getDebugIdStr());
                
                var session = this.getSession(sessionId);

                if (!session) {
                    // we got a close without ever hearing about the session
                    // so just ignore it.
                    return;
                } 

                session.close(stopTime);

                // XXX do something here to add to official session counts.
                // There is an issue in that the data is also updated by the
                // repeating notification, and we really don't have enough
                // info in the close for a full dynamic data item.
            },

            /**
             * Process a notification that we know is supposed to go to an
             * existing session in the service. When we start up it is 
             * possible we'll get notifications for sessions we don't know
             * about (how? We should have gotten them all during 'getSessions',
             * but maybe some others came in between then and everything
             * being initialized?
             */
            processSessionNotification: function(notificationObj) {
                // Notification is session-level, since we know it's a valid type
                //            CC.console.debug("SESSION_SUMMARY for session ID " + 
                //                                  notificationObj.sessionId + "\n    " + 
                //                                  this.getDebugIdStr());
                
                var sessionModel = this.getSession(notificationObj.sessionId);

                if (sessionModel) {
                    sessionModel.processNotification(notificationObj);
                } else {
                    // It is possible that we'll get summary notifications for
                    // sessions that have already closed (the server should
                    // not be sending them, but the last one may come up to the
                    // interval time afterwards.) For 'directory' services, the
                    // session is very short, so I'm going to ignore them. For
                    // others, I'm not sure we can reasonably do that, in which
                    // case maybe a ping for the session ID is needed. For now
                    // we'll still dump the error message.
                    var serviceConfig = this.getServiceConfig();

                    // The session is closed, but we're getting a post-close 
                    // summary notification most likely. For now, don't show it.
                    //CC.console.debug("#### Processing session-level notification" +
                    //                      " for unknown session ID " + notificationObj.sessionId + 
                    //                      " for service:\n   " +
                    //                      this.getDebugIdStr());
                }
            },

            /**
             * Event propagation after we add a new SessionModel. Note that 
             * we do NOT add ourselves as a target of the new SessionModel, as the map it is
             * in is already a target, and we are a target of that.
             */
            onSessionAdd: function(ev) {
                ev.halt(true);
//                dumpEventTargets(this);

                var item = ev.item;

                if (item.name === 'sessionModel') {
//                    CC.console.debug("ServiceModel:onSessionAdd for session ID " + 
//                                          item.get('sessionId'));
//                    CC.console.debug("### ServiceModel: firing " + this.ADD_SESSION_EVENT);
                    this.fire(this.ADD_SESSION_EVENT, {sessionModel: item});
                } else {
//                    CC.console.debug("ServiceModel:onSessionAdd - " + 
//                                          ignoring mapModel:add event for item.name = " + 
//                                          item.name);
                }
            },

            /**
             * Event propagation after we remove a SessionModel. We are not
             * a target of an individual SessionModel, just the map that contains them
             */
            onSessionRemove: function(ev) {
                ev.halt(true);

                var item = ev.item;

                if (item.name === 'sessionModel') {
                    CC.console.debug("ServiceModel:onSessionRemove for session ID " + 
                          item.get('sessionId'));
                    CC.console.debug("### ServiceModel: firing " + this.REMOVE_SESSION_EVENT);
                    this.fire(this.REMOVE_SESSION_EVENT, {sessionModel: item});
                } else {
                    CC.console.debug("ServiceModel:onSessionRemove - " + 
                                          "ignoring mapModel:remove event for item.name = " + 
                                          item.name);
                }
            },

            afterStopTimeChange: function(ev) {
                if (!this.get('stopTime')) {
                    this.set('stopTime', ev.newVal);
                }
            },

            /**
             * Process a block of session data from getGatewaySessions, after it has
             * been separated by service. Close any sessions not in the incoming list,
             * update those that are in the list, and add any in the list that are not 
             * in the existing sessions. The incoming data is keyed by sessionId.
             */
            updateSessionData: function(serviceSessionData, readTime) {
                var sessionModels = this.getSessions();

                if (sessionModels) {
                    sessionModels.forEach(function(sessionModel) {
                        // find the incoming session data, if any
                        var sessionId = "" + sessionModel.get('sessionId');
                        var sessionDatum = (serviceSessionData && serviceSessionData[sessionId]);
                        if (!sessionDatum) {
                            // the existing session doesn't match one coming in, 
                            // so it must be closed now.
                            sessionModel.close(readTime);
                        } else {
                            sessionModel.load(sessionDatum);
                            delete serviceSessionData[sessionId];  // so we don't process it later
                        }
                    });
                }

                // the only elements left in serviceSessionData, if any, are new sessions we 
                // don't already know about. Store them.
                if (serviceSessionData) {
                    for (var sessionId in serviceSessionData) {
                        if (serviceSessionData.hasOwnProperty(sessionId)) {
                            this.storeGatewaySession(serviceSessionData[sessionId]);
                        }
                    }
                }
            },

            /**
             * Given an object containing a set of session attributes from
             * getGatewaySessions() call (i.e., all attributes present, including
             * dynamic data), insert it. 
             */
            storeGatewaySession: function(sessionDatum) {
                var $this = this;

                var sessionId = sessionDatum.sessionId;

                var sessionModels = $this.get('sessionModels');
                var sessionModel = sessionModels.getItem(sessionId);

                // NOTE: contrary to session-open notification, the values that come
                // over for the various fields are individual JSON strings, which still
                // need to be parsed. Those will be done in the initializers.
                if (!sessionModel) {
                    sessionModel = new Y.SessionModel(
                        {serviceModel: this,
                         serviceId: sessionDatum.serviceId,
                         sessionId : sessionId,
                         sessionOpen: sessionDatum.sessionOpen,
                         enableNotifications: sessionDatum.enableNotifications,
                         startTime: sessionDatum.startTime,
                         localAddress: sessionDatum.localAddress,
                         remoteAddress: sessionDatum.remoteAddress,
                         principals: (sessionDatum.principals 
                                      ? parseJSON(sessionDatum.principals)
                                      : null),
                         sessionTypeName: sessionDatum.sessionTypeName,
                         sessionDirection: sessionDatum.sessionDirection,
                        });

                    // Add the processing data first so that we have a valid record there before
                    // we do anything that might result in the session being shown.
                    sessionModel.load(sessionDatum);
                    sessionModels.putItem(sessionId, sessionModel);
                } else {
                    // We should never actually get here.
                    sessionModel.load(sessionDatum); 
                }
            },

            /**
             * Return a particular session model, given its session ID. If not found, return null.
             */
            getSession: function(sessionId) {
                return this.get('sessionModels').getItem(sessionId);
            },

            /**
             * Return the session models, if any, as a list. If none, return null.
             */
            getSessions: function() {
                var sessionModels = this.get('sessionModels').values();
                return (sessionModels.length > 0 ? sessionModels : null);
            },

            dumpSessionModels: function() {
                CC.console.debug(this.getDebugIdStr());
                var sessionModels = this.get('sessionModels').values();
                if (sessionModels.length > 0) {
                    for (var i = 0; i < sessionModels.length; i++) {
                        var sessionModel = sessionModels[i];
                        CC.console.debug("   Session id: " + sessionModel.get('sessionId') + 
                                              ", " + (sessionModel.get('sessionOpen') === 0 
                                                      ? "CLOSED" 
                                                      : "OPEN"));
                    }
                } else {
                    CC.console.debug("   Has no sessions");
                }
            },

            getDebugIdStr: function() {
                var serviceId = this.get('serviceId');
                var gatewayModel = this.get('gatewayModel');
                var gatewayConfig = gatewayModel.get('gatewayConfig');
                var serviceConfig = gatewayConfig.getServiceConfig(serviceId);
                return gatewayModel.getDebugIdStr() + 
                    ",\n   service (ID: " + serviceId + 
                    ", name: '" + serviceConfig.get('name')  + 
                    "', type: '" + serviceConfig.get('type') + 
                    "')";
            },

            /**
             * Return the Y.ServiceConfigModel for this service from its associated gateway.
             * This assumes that the gateway has an available gatewayConfig, which is generally true.
             * Not sure if there is a case when gateways are going up and down where it might not,
             * but don't think so.
             */
            getServiceConfig: function() {
                return this.get('gatewayModel')
                    .get('gatewayConfig')
                    .getServiceConfig(this.get('serviceId'));
            },

            isBalanced: function() {
                var serviceConfig = this.getServiceConfig();
                return (serviceConfig !== null && serviceConfig.isBalanced());
            },

            /**
             * Utility function for the pseudo-attributes that want to just return the 
             * current value for one of the dynamic data attributes
             */
            getDynamicDataValue: function(attrName) {
                return this.get('dynamicDataModel').getValue(attrName);
            },

            dump: function() {
                CC.console.debug("ServiceModel for gateway " + 
                                      this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'serviceId', offset);
                dumpValue('serviceConfig', 
                          this.get('gatewayModel').get('gatewayConfig').
                          getServiceConfig(this.get('serviceId')));
                dumpSessionModels();
            }
        }, 
        {
            ATTRS: {
                /**
                 * Reference back to the GatewayModel.
                 */
                gatewayModel: {
                    value: null
                },

                dynamicDataModel: {
                    value: null
                },

                //--------------------------
                // Static service properties
                //--------------------------
                serviceId: {
                    value: null
                },


                /**
                 * Y.MapModel of SessionModels, one per session in the service, keyed by sessionId.
                 */
                sessionModels: {    
                    valueFn: function() {
                        var ml = new Y.MapModel({model: Y.SessionModel});
                        ml.modelName = 'SessionModel';
                        return ml;
                    }
                },

                //===================================================================
                // Pseudo-properties
                //===================================================================
                gatewayLabel: {
                    getter: function(currValue, attrName) {
                        return this.get('gatewayModel').get('gatewayLabel');
                    }
                },

                // For 4.0 the start and stop time for a service will be the
                // same as those for the gateway. They'll be set when the
                // gateway starts or stops.
                startTime: {
                    value: null
                },

                stopTime: {
                    value: null
                },

                serviceLabel: {
                    getter: function() {
                        var serviceConfig = this.getServiceConfig();
                        var name = serviceConfig.get('name');

                        if (name && name.trim() != "") {
                            return name.trim();
                        } else {
                            var type = serviceConfig.get('type');
                            var serviceId = this.get('serviceId');
                            return "Id " + serviceId + " (" + type + ")";
                        }
                    }
                },

                state: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('state');
                    }
                },

                serviceConnected: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('serviceConnected');
                    }
                },

                totalBytesReceived: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalBytesReceived');
                    }
                },

                totalBytesReceivedThroughput: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalBytesReceivedThroughput');
                    }
                },

                totalBytesSent: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalBytesSent');
                    }
                },

                totalBytesSentThroughput: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalBytesSentThroughput');
                    }
                },

                totalCurrentSessions: {
                    getter: function(currValue, attrName) {
                        var value = this.getDynamicDataValue('totalCurrentSessions');
                        //CC.console.debug('getTotalCurrentSessions for ' + 
                        //                      this.getDebugIdStr() + ' returns [' + value + ']');
                        return value;
                    }
                },

                totalCurrentNativeSessions: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalCurrentNativeSessions');
                    }
                },

                totalCurrentEmulatedSessions: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalCurrentEmulatedSessions');
                    }
                },

                totalCumulativeSessions: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalCumulativeSessions');
                    }
                },

                totalCumulativeNativeSessions: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalCumulativeNativeSessions');
                    }
                },

                totalCumulativeEmulatedSessions: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalCumulativeEmulatedSessions');
                    }
                },

                totalExceptionCount: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('totalExceptionCount');
                    }
                },

                latestException: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('latestException');
                    }
                },

                latestExceptionTime: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('latestExceptionTime');
                    }
                },

                lastSuccessfulConnectTime: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('lastSuccessfulConnectTime');
                    }
                },

                lastFailedConnectTime: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('lastFailedConnectTime');
                    }
                },

                lastHeartbeatPingResult: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('lastHeartbeatPingResult');
                    }
                },

                lastHeartbeatPingTimestamp: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('lastHeartbeatPingTimestamp');
                    }
                },

                heartbeatPingCount: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('heartbeatPingCount');
                    }
                },

                heartbeatPingSuccesses: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('heartbeatPingSuccesses');
                    }
                },

                heartbeatPingFailures: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('heartbeatPingFailures');
                    }
                },

                heartbeatRunning: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('heartbeatRunning');
                    }
                },

                enableNotifications: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('enableNotifications');
                    }
                },

                loggedInSessions: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('loggedInSessions');
                    }
                },

                readTime: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue('readTime');
                    }
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model', 'session-model', 'service-dynamic-data-model']
});

