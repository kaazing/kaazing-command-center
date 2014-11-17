/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The gateway-dynamic-data-model module stores all the dynamic (i.e., summary) data
 * for a single gateway in a single object. This allows us to hide details about whether
 * or not history (or how much) is actually kept. Generally users of this object will
 * only know about the latest value and when it is updated.
 * 
 * We do it as a YUI model only because we want to generate YUI model events as things
 * are updated.
 *
 * @module gateway-dynamic-data-model
 */
YUI.add('gateway-dynamic-data-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'gatewayDynamicDataModel';

    /**
     * The wrapper model for a gateway's dynamic data
     *
     * @class GatewayDynamicDataModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.GatewayDynamicDataModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            // the data definition structure from the gateway model.
            dataDefinition: null,

            // Name of event we'll generate when we add a new set of gateway
            // dynamic data to the object.
            UPDATE_EVENT: NAME + ':update',
            readTimeIndex: -1,

            initializer: function() {
                var dataDefinition = this.get('gatewayModel').getSummaryDataDefinition('gateway');

                // For speed, we're going to store the data definition, which should remain
                // static, in a property rather than an attribute.
                this.dataDefinition = dataDefinition;

                this.readTimeIndex = this._getAttributeIndex('readTime');

                // For now we're going to NOT keep any history of summary data.
                // Each time we're to load new data we'll just replace this array.
                // and generate an update event.

                this.publish(this.UPDATE_EVENT,
                             {emitFacade: true,
                              broadcast: true,
                              defaultFn: function(){},
                              preventedFn: function(){},
                              stoppedFn: function(){}
                             });
            },

            hasAttribute: function(attrName) {
                return (this._getAttributeIndex(attrName) >= 0);
            },

            /**
             * Retrieve the value for one of the attributes, possibly as an array
             * including the time the value was retrieved from the gateway.
             * To avoid problems with YUI's 'get', we need to change the name.
             * 
             * @param attrName the attribute whose value is to be returned
             * @param includeTime if true, returns [readTime, value]. If not,
             * returns just the value.
             */
            getValue: function(attrName, includeTime) {
                var attrIndex = this._getAttributeIndex(attrName);
                if (attrIndex < 0) {
                    return undefined;
                }

                var data = this.get('data');
                if (!data) {
                    return null;
                }

                var val = data[attrIndex];
                if (typeOf(val) == 'function') {
                    val = val();
                }

                return (includeTime ? [this.getReadTime(), val] : val);
            },

            /**
             * Return the latest 'readTime' value. We know here that it is 
             * last of the values in 'data'.
             */
            getReadTime: function() {
                var data = this.get('data');
                return data[data.length - 1];
            },
           
            /**
             * Given an object with key-value properties (from a getServices() 
             * request) load those values into the 'data' array.
             */
            load: function(gatewayDatum) {
                // the initial loading has summaryData in the gatewayDatum as an
                // attribute (in the right order). The only thing we need
                // is to add 'readTime' (I happen to know it's last).
                var summaryData = gatewayDatum.summaryData;
                summaryData.push(gatewayDatum.readTime);
                this.loadSummaryData(summaryData);
            },

            /**
             * Load some summary data and fire the 'update' event.
             */
            loadSummaryData: function(summaryData) {
                var data = this.get('data');
                if (!data || data[this.readTimeIndex] !== summaryData[this.readTimeIndex]) {
                    this.set('data', summaryData);
                    this.fire(this.UPDATE_EVENT, {model: this, data: summaryData});
                }
            },

            /**
             * Process a gateway summary notification
             */
            processNotification: function(notification) {
                var summaryData = notification.value;
                var readTime = notification.readTime;
                // put the read time into its slot on the summary data
                summaryData.push(readTime);  // we know it's last
                this.loadSummaryData(summaryData);
            },

            /**
             * Have the dynamic data 'shut down', by generating a final update with 
             * the given stop time where we set the 'current sessions' to 0 and
             * leave the cumulative totals guys alone.
             */
            shutDown: function(stopTime) {
                var data = this.get('data');
                if (data && data[this.readTimeIndex] === stopTime) {
                    // already shut down, do nothing
                    return;
                }

                if (!data) {
                    // create a fake summary record at stopTime
                    data = [];
                    var numFields = this.dataDefinition.fields.length;
                    for (var i = 0; i < numFields; i++) {
                        data[i] = 0;
                    }
                } else {
                    data = data.slice();  // new copy
                    // reduce the current session count to 0. Other values are cumulative.
                    data[this._getAttributeIndex('totalCurrentSessions')] = 0;
                }

                data[this.readTimeIndex] = stopTime;

                this.loadSummaryData(data);
            },

            /**
             * Return the index for a given attribute in the summary data stored here.
             */
            _getAttributeIndex: function(attrName) {
                var attrIndex = this.dataDefinition.fields.indexOf(attrName);
                return attrIndex;
            }
        }, 
        {
            ATTRS: {
                gatewayModel: {
                    value: null
                },

                // The most current array of summary data.
                data: {
                    value: null
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

