/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The service-dynamic-data-model module stores all the dynamic (i.e., summary) data
 * for a single service in a single object. This allows us to hide details about whether
 * or not history (or how much) is actually kept. Generally users of this object will
 * only know about the latest value and when it is updated.
 * 
 * We do it as a YUI model only because we want to generate YUI model events as things
 * are updated.
 *
 * @module service-dynamic-data-model
 */
YUI.add('service-dynamic-data-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'serviceDynamicDataModel';

    /**
     * The wrapper model for a service's dynamic data
     *
     * @class ServiceDynamicDataModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ServiceDynamicDataModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            // The data definition structure from the gateway model
            dataDefinition: null,

            // Name of event we'll generate when we add a new set of service
            // dynamic data to the object.
            UPDATE_EVENT: NAME + ':update',
            readTimeIndex: -1,

            initializer: function() {
                // We compute four extra 'throughput' values each time a new
                // record comes in. However, we don't know about those fields in
                // the data coming from the gateway. Add those fields here if they
                // are not already in the summary data definition.
                // For convenience, keep a copy (from gatewayModel) of the summary data definition
                // (fields, notificationInterval, gatherInterval)
                var dataDefinition = this.get('serviceModel')
                                         .get('gatewayModel')
                                         .getSummaryDataDefinition('service');

                var fields = dataDefinition.fields;
                if (fields.indexOf('totalBytesSentThroughput') < 0) {
                    // Put the new fields ahead of readTime, the last field.
                    fields.push('totalBytesSentThroughput',
                                'totalBytesReceivedThroughput',
                                fields.pop());
                }

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
            load: function(serviceDatum) {
                // the initial loading has summaryData in the serviceDatum as an
                // attribute (in the right order). The only thing we need
                // is to add 'readTime' (I happen to know it's last).
                var summaryData = serviceDatum.summaryData;
                var readTime = serviceDatum.readTime;

                // Because 'load' is only called once (the first time we get data after
                // creating the model), we know that we can push the current values of
                // the various totals as the instantaneous throughput values.
                summaryData[this._getAttributeIndex('totalBytesSentThroughput')] = 
                    summaryData[this._getAttributeIndex('totalBytesSent')].toFixed(2);
                summaryData[this._getAttributeIndex('totalBytesReceivedThroughput')] = 
                    summaryData[this._getAttributeIndex('totalBytesReceived')].toFixed(2);
                summaryData[this._getAttributeIndex('readTime')] = 
                    serviceDatum.readTime;
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
             * Process a service summary notification
             */
            processNotification: function(notification) {
                var summaryData = notification.value;
                var readTime = notification.readTime;

                summaryData[this._getAttributeIndex('totalBytesSentThroughput')] = 
                    this.computeThroughputAttr(summaryData, 'totalBytesSent', readTime);
                summaryData[this._getAttributeIndex('totalBytesReceivedThroughput')] = 
                    this.computeThroughputAttr(summaryData, 'totalBytesReceived', readTime);
                summaryData[this._getAttributeIndex('readTime')] = readTime;

                this.loadSummaryData(summaryData);
            },

            /**
             * Return the index for a given attribute in the summary data stored here.
             */
            _getAttributeIndex: function(attrName) {
                var attrIndex = this.dataDefinition.fields.indexOf(attrName);
                return attrIndex;
            },

            /**
             * put the given value into the correct slot for the attribute in the 
             * currently-stored data array. Requires that 'data' already be defined.
             */
            _setValue: function(attrName, value) {
                var attrIndex = this._getAttributeIndex(attrName);
                this.get('data')[attrIndex] = value;
            },

            /**
             * During loading of new values, we have several 'throughput' computations we need
             * to do by comparing values in the new summary data against our existing data.
             * The return value is in some units per second (i.e., we 
             * divide by 1000, since the readTime values are in MS).
             *
             * @param summaryData the incoming array of summary fields, in the order specified
             * by the data definition.
             * @param attrName is the attribute we're comparing (e.g. totalBytesSent)
             * @param newReadTime the readTime of the new summary data (which hasn't been
             * added to the summary data yet).
             * 
             */
            computeThroughputAttr: function(summaryData, attrName, newTime) {
                var prevValue = this.getValue(attrName);
                var prevTime = this.getValue('readTime');

                var index = this._getAttributeIndex(attrName);
                var newValue = summaryData[index];

                // just in case, check that some time has passed. If not,
                // just return the current value rather than dividing by 0.
                var val;
                if (prevTime === newTime) {
                    // To avoid display problems, round the value
                    val = newValue;
                } else {
                    val = ((newValue - prevValue) / (newTime - prevTime)) * 1000;
                }

                // To avoid display issues, round the final value 
                return val.toFixed(2);
            },
        }, 
        {
            ATTRS: {
                serviceModel: {
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
    requires: ['model', 'service-model']
});

