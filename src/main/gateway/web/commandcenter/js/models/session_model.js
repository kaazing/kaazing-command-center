/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The session-model module contains the details for a single session
 * within a single service within a single gateway within the Kaazing Command Center application.
 *
 * @module session-model
 */
YUI.add('session-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'sessionModel';

    /**
     * The model for Session static data and a list of session dynamic
     * data over time.
     *
     * @class SessionModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.SessionModel = Y.Base.create(
        NAME,
        Y.Model, 
        [],
        {
            CLOSE_SESSION_EVENT: NAME + ':closeSession',

            initializer: function() {
                this.publish(this.CLOSE_SESSION_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });

                this.formatRemoteAddress();

                var model = new Y.SessionDynamicDataModel({sessionModel: this});
                this.set('dynamicDataModel', model);
                model.addTarget(this);

                // Add us as a target for service setting the stopTime, so we pick
                // up the same stop time here if we don't already have one.
                var serviceModel = this.get('serviceModel');
                serviceModel.after('serviceModel:stopTimeChange',
                                   this.afterStopTimeChange,
                                   this);
            },

            /**
             * The service model creates session models and sets the remote address to
             * the raw value coming from the gateway. We only need it for display, so
             * this converts it to that format on initialization (it's always set then,
             * and not changed).
             */
            formatRemoteAddress: function() {
                var remoteAddress = this.get('remoteAddress');
                if (remoteAddress && remoteAddress.length > 0) {
                    if (remoteAddress.startsWith('[')) {
                        remoteAddress = remoteAddress.substring(1, remoteAddress.length - 1);
                    }
                    var questionMarkPos = remoteAddress.indexOf('?');
                    if (questionMarkPos > 0) {
                        remoteAddress = remoteAddress.substring(0, questionMarkPos);
                    }
                } else {
                    remoteAddress = '';
                }

                this.set('remoteAddress', remoteAddress);
            },

            afterStopTimeChange: function(ev) {
                if (!this.get('stopTime')) {
                    this.set('stopTime', ev.newVal);
                }
            },

            /**
             * The service model creates session models and sets the startTime to
             * the raw value coming from the gateway. We only need it for display, so
             * this converts it to that format on initialization (it's always set then,
             * and not changed).
             */
            formatStartTime: function() {
            },

            hasAttribute: function(attrName) {
                return Y.SessionModel.ATTRS.hasOwnProperty(attrName);
            },

            load: function(sessionDatum) {
                this.get('dynamicDataModel').load(sessionDatum);
            },

            /**
             * Mark the session as closed. Generally called from serviceModel when it
             * receives a SESSION_CLOSE event.
             */
            close: function(stopTime) {
                this.set('sessionOpen', 0);
                this.set('stopTime', stopTime);

                this.fire(this.CLOSE_SESSION_EVENT, 
                          {sessionModel: this});
            },

            /**
             * Close a session from the UI. This sends the request to the server
             * to set the session to closed, which will then send a notification 
             * back that is handled above.
             */
            startClose: function() {
                var serviceModel = this.get('serviceModel');
                if (!serviceModel) {
                    return;
                }
                
                var gatewayModel = serviceModel.get('gatewayModel');
                if (!gatewayModel) {
                    return;
                }

                var mngtApi = gatewayModel.get('mngtApi');
                mngtApi.closeSession(serviceModel.get('serviceId'), this.get('sessionId'));
            },

            /**
             * Handle session-level notifications. For now there is no lower level.
             */
            processNotification: function(notificationObj) {

                // NOTE: we do know (based on the SNMP layer) that the notification type
                // is one of the known ones--we don't need to check for that here, though
                // we do need to make sure the data fields are valid.
                var notificationType = notificationObj.type;

                switch (notificationType) {
                case CC.Constants.NotificationType.SESSION_SUMMARY:
                    //CC.console.debug("SESSION_SUMMARY notification");
                    this.get('dynamicDataModel').processNotification(notificationObj);
                    break;
                default:
                    // Do nothing. This is just here so we can add later notifs if desired.
                }
            },

            /**
             * Return the time the session has been alive. Based on the create time
             * and the close time. If the session has not yet closed, uses the
             * read time of the latest processing instance instead. Value is in milliseconds
             */
            getUptime: function() {
                var startTime = this.get('startTime');
                var stopTime = this.get('stopTime');
                if (!stopTime) {
                    stopTime = this.get('readTime');
                }
                if (!stopTime) {
                    stopTime = (new Date()).getTime();
                }
                return stopTime - startTime;
            },

            getGatewayModel: function() {
                var serviceModel = this.get('serviceModel');
                return (serviceModel ? serviceModel.get('gatewayModel') : null);
            },

            getDebugIdStr: function() {
                return this.get('serviceModel').getDebugIdStr() + 
                    ",\n   session (ID: " + this.get('sessionId') + ")";
            },

            /**
             * Utility function for the pseudo-attributes that want to just return the 
             * current value for one of the dynamic data attributes
             */
            getDynamicDataValue: function(attrName) {
                return this.get('dynamicDataModel').getValue(attrName);
            }
        }, 
        {
            ATTRS: {
                /**
                 * Reference back to the ServiceModel.
                 */
                serviceModel: {
                    value: null
                },

                dynamicDataModel: {
                    value: null
                },

                /**
                 * For easy retrieval, the service ID of the instances in this model
                 */
                serviceId: {
                    value: null
                },

                /**
                 * For easy retrieval, the session ID of the instances in this model
                 */
                sessionId: {
                    value: null
                },

                sessionOpen: {
                    value: null    // initially 1. Send back 0 to the GW to close 
                },

                enableNotifications: {
                    value: null
                },

                startTime: {
                    value: null
                },

                stopTime: {
                    value: null   // only set in app, to tell us when the session closed
                },

                localAddress: {
                    value: null  // Do we get this?
                },

                remoteAddress: {
                    value: null
                },

                principals: {
                    value: null
                },

                sessionTypeName: {
                    value: null
                },

                sessionDirection: {
                    value: null
                },

                // ??? Don't remember why this is here.
                extensions: {
                    value: null
                },

                // ??? Don't remember why this is here.
                protocolVersion: {
                    value: null
                },

                // Temporary mark we use when reconnecting to a gateway that 
                // still up, so we know which sessions to close when we 
                // retrieve the current session list.
                mark: {
                    value: false
                },

                //==================================================================
                // Various "pseudo" attributes so callers can just get the dynamic
                // data values as of the SessionModel, instead of having to know 
                // the other structure as well.
                //==================================================================

                // I *REALLY* don't like the following, as its sole purpose is to get 
                // around the YUI datatable bug by providing a getter for the action
                // button HTML code. That's not supposed to go in a model!!
                action: {
                    getter: function(currValue, attrName) {
                        var serviceModel = this.get('serviceModel');
                        var gatewayModel = serviceModel.get('gatewayModel');
                        return '<button type="button" class="goButton"' + 
                            'instanceKey="' + gatewayModel.get('instanceKey') + '" ' + 
                            'serviceId="' + serviceModel.get('serviceId') + '" ' + 
                            'sessionId="' + this.get('sessionId') + '" ' + 
                            '></button>';
                    }
                },

                gatewayLabel: {
                    getter: function(currValue, attrName) {
                        var serviceModel = this.get('serviceModel');
                        return serviceModel.get('gatewayLabel');
                    }
                },

                serviceLabel: {
                    getter: function(currValue, attrName) {
                        var serviceModel = this.get('serviceModel');
                        return serviceModel.get('serviceLabel');
                    }
                },

                uptime: {
                    getter: function(currValue, attrName) {
                        return this.getUptime();
                    }
                },

                readBytes: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue(attrName);
                    }
                },

                readBytesThroughput: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue(attrName);
                    }
                },

                writtenBytes: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue(attrName);
                    }
                },

                writtenBytesThroughput: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue(attrName);
                    }
                },

                // Note: we always will have a readTime, but we also have
                // a startTime.
                readTime: {
                    getter: function(currValue, attrName) {
                        return this.getDynamicDataValue(attrName);
                    }
                },

                // Another pseudo attribute, but this one is just so we can
                // pass a "reasonable" value back for the current session 'state'.
                state: {
                    getter: function(currValue, attrName) {
                        var sessionOpen = this.get('sessionOpen');
                        return (sessionOpen === 1 ? "Open" : "Closed");
                    }
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model', 'service-model', 
               'session-dynamic-data-model']
});

