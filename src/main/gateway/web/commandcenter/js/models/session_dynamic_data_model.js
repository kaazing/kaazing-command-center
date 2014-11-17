/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The session-dynamic-data-model module stores all the dynamic (i.e., summary) data
 * for a single session in a single object. This allows us to hide details about whether
 * or not history (or how much) is actually kept. Generally users of this object will
 * only know about the latest value and when it is updated. For now we are tossing out
 * any historical data except the most recent value.
 * 
 * We do it as a YUI model only because we want to generate YUI model events as things
 * are updated.
 *
 * @module session-dynamic-data-model
 */
YUI.add('session-dynamic-data-model', function(Y) {
    "use strict";

    // The summary data fields come over in the following order:
    // 0 - readBytes
    // 1 - readBytesThroughput
    // 2 - writtenBytes
    // 3 - writtenBytesThroughput

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'sessionDynamicDataModel';

    /**
     * The wrapper model for a session's dynamic data
     *
     * @class SessionDynamicDataModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.SessionDynamicDataModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            // the data definition structure from the gateway model.
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
                var dataDefinition = this.get('sessionModel')
                                         .get('serviceModel')
                                         .get('gatewayModel')
                                         .getSummaryDataDefinition('session');

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
             * Given an object with key-value properties (from a getGatewaySessions() 
             * request) load those values into the 'data' array.
             */
            load: function(sessionDatum) {
                // the initial loading has summaryData in the sessionDatum as an
                // attribute (in the right order). The only thing we need
                // is to add 'readTime' (I happen to know it's last).
                var summaryData = sessionDatum.summaryData;
                var readTime = sessionDatum.readTime;
                summaryData.push(readTime);

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
             * Process a session summary notification
             */
            processNotification: function(notification) {
                var summaryData = notification.value;
                var readTime = notification.readTime;

                // to avoid display problems, take the read and write
                // throughput values and round them to a couple decimal places
                var index = this._getAttributeIndex('readBytesThroughput');
                summaryData[index] = summaryData[index].toFixed(2);
                index = this._getAttributeIndex('writtenBytesThroughput');
                summaryData[index] = summaryData[index].toFixed(2);

                summaryData[this._getAttributeIndex('readTime')] = readTime;

                this.loadSummaryData(summaryData);
            },

            /**
             * Return the index for a given attribute in the summary data stored here.
             */
            _getAttributeIndex: function(attrName) {
                return this.dataDefinition.fields.indexOf(attrName);
            },

            /**
             * put the given value into the correct slot for the attribute in the 
             * currently-stored data array. Requires that 'data' already be defined.
             */
            _setValue: function(attrName, value) {
                var attrIndex = this._getAttributeIndex(attrName);
                this.get('data')[attrIndex] = value;
            },
        }, 
        {
            ATTRS: {
                sessionModel: {
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
    requires: ['model', 'session-model']
});

