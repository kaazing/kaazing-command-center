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
 * The system-model module contains the dynamic system (as opposed to JVM) data
 * for a single gateway within the Kaazing Command Center application (an array of 
 * summary data, so we can avoid using YUI models for that as a performance 
 * enhancement).
 *
 * @module system-model
 */
YUI.add('system-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'systemModel';

    /**
     * The model for the dynamic system data for a single host.
     *
     * @class SystemModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.SystemModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            // the data definition structure from the gateway model.
            dataDefinition: null,

            // Event we'll generate when we add a new set of system
            // dynamic data to the object.
            UPDATE_EVENT: NAME + ':update',

            initializer: function() {
                var dataDefinition = this.get('gatewayModel').getSummaryDataDefinition('system');

                // For speed, we're going to store the data definition, which should remain
                // static, in a property rather than an attribute.
                this.dataDefinition = dataDefinition;

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
             * Retrieve the value for one of the attributes.
             * To avoid problems with YUI's 'get', we need to change the name.
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
                if (!data || data.length == 0) {
                    return 0;
                }

                return data[data.length - 1];
            },
           
            /**
             * Given an object with key-value properties (from a getSystemStats()
             * initialize this object from those properties.
             */
            load: function(systemDatum) {
                this.loadSummaryData(systemDatum['summaryData']);
            },

            /**
             * Given a list of summary data objects (systemData, readTime in each),
             * generate an 'update' event for each item, so listeners know that it
             * came in, but only store any that happen to be later than the current
             * data, if any. We know by definition that the incoming summary data 
             * list is itself in time order.
             *
             * Anybody that is listening to our UPDATE event can decide whether or
             * not a given item does actually affect it. Some charts, for example, 
             * may want older items even if out of order, so they plot correctly.
             * Others that deal only with the latest data can ignore those that are
             * older than they care about.
             */
            loadSummaryData: function(summaryDataList) {
                if (summaryDataList && summaryDataList.length > 0) {
                    var latestReadTime = this.getReadTime();

                    for (var i = 0; i < summaryDataList.length; i++) {
                        var item = summaryDataList[i];
                        var systemData = item.systemData;
                        var readTime = item.readTime;

                        // There is a weird bug (KG-14770) where somehow on a
                        // Windows Server 2012 it is possible to return a null
                        // value for systemData, even though there is a valid
                        // readTime. We'll just throw those out.
                        if (systemData == null || systemData == undefined) {
                            continue;
                        }

                        // add the readTime in its slot in the summary data (last), 
                        // so we keep it around.
                        systemData.push(readTime);

                        if (readTime > latestReadTime) {
                            // since this new one is later than the latest
                            // that we have, set it as the current item.
                            latestReadTime = readTime;
                            this.set('data', systemData);
                        }

                        // regardless whether the current one is or isn't latest,
                        // fire the update event with the new data.
                        this.fire(this.UPDATE_EVENT, {model: this, data: systemData});
                    }
                }
            },


            /**
             * Process a system-level summary notification
             */
            processNotification: function(notificationObj) {
                this.loadSummaryData(notificationObj.value);
            },

            /**
             * Return the index for a given attribute in the summary data stored here.
             */
            _getAttributeIndex: function(attrName) {
                var attrIndex = this.dataDefinition.fields.indexOf(attrName);
                return attrIndex;
            }
        }, {
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

