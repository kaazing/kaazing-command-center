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
 * The jvm-model module is the client-side equivalent of the JvmManagementBean
 * in the Gateway. It's job is to store information about JVM status for the JVM
 * on the host that's running the particular gateway. We're also going to use it 
 * to hide the fact that we're doing performance optimization from the rest of YUI.
 *
 * Current fields as of 4.0 are (in order):
 *
 * @module jvm-model
 */
YUI.add('jvm-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'jvmModel';

    /**
     * The wrapper model for the JVM for a single gateway and its dynamic data.
     *
     * @class JvmModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.JvmModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
            // the data definition structure from the gateway model.
            dataDefinition: null,

            // Event we'll generate when we add a new set of JVM dynamic data
            // to the object.
            UPDATE_EVENT: NAME + ':update',

            initializer: function() {
                var dataDefinition = this.get('gatewayModel').getSummaryDataDefinition('jvm');

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
             * Given an object with key-value properties (from a getJvmStats)
             * initialize this object from those properties. This is slightly
             * different than most load() functions in the model, in that
             * 'summaryData' has been passed through and contains instances of
             * objects that need to be stored in jvmData's internal array.
             */
            load: function(jvmDatum) {
                this.loadSummaryData(jvmDatum['summaryData']);
            },

            /**
             * Given a list of summary data objects (JVM + readTime in each)
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
                        var jvmData = item.jvmData; 
                        var readTime = item.readTime;

                        // just in case there is somehow a duplicate of KG-14770
                        // that shows up for System data, put in a check that
                        // jvmData is actually non-null.
                        if (jvmData == null || jvmData == undefined) {
                            continue;
                        }

                        // add the readTime to the summary data so we keep it
                        // around in a reasonable place.
                        jvmData.push(readTime);

                        if (readTime > latestReadTime) {
                            // since this new one is later than the latest
                            // that we have, set it as the current item.
                            latestReadTime = readTime;
                            this.set('data', jvmData);
                        }

                        // regardless whether the current one is or isn't latest,
                        // fire the update event with the new data.
                        this.fire(this.UPDATE_EVENT, {model: this, data: jvmData});
                    }
                }
            },

            /**
             * Handle jvm-level notifications (specifically, summary updates).
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

                /**
                 * The latest JVM data (an array of property values, one for each
                 * of our defined attributes).
                 */
                data: {
                    value: null
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

