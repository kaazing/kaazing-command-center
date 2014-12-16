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
 * The nic-list-model module is the client-side equivalent of the NicListManagementBean
 * in the Gateway. It's job is to store information about NIC status for all the NICs
 * on the host that's running the particular gateway. We split this off from system
 * both to make that one simpler and allow better notification control on NIC information,
 * since it's much more frequent. We're also going to use it to hide the fact that we're
 * doing performance optimization from the rest of YUI.
 *
 * @module nic-list-model
 */
YUI.add('nic-list-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'nicListModel';

    /**
     * The 'manager' model for the list of NICs for a single gateway and its
     * dynamic NIC data.
     *
     * @class NicListModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.NicListModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            // the data definition structure from the gateway model.
            dataDefinition: null,

            // Name of event we'll generate when we add a new set of NIC dynamic
            // data to the object.
            UPDATE_EVENT: NAME + ':update',

            initializer: function() {
                var dataDefinition = this.get('gatewayModel').getSummaryDataDefinition('nicList');

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
                if (attrName == 'netInterfaceNames') {
                    return true;
                } 

                return (this._getAttributeIndex(attrName) >= 0);
            },


            /**
             * Retrieve the value for one of the attributes.
             * To avoid problems with YUI's 'get', we need to change the name.
             *
             * This getValue() differs from others in that we are trying to 
             * return the attribute value for a SINGLE NIC.
             */
            getValue: function(netInterfaceName, attrName, includeTime) {
                if (attrName == 'netInterfaceNames') {
                    var netInterfaceNames = this.get('netInterfaceNames');
                    return (includeTime 
                            ? [CC.Constants.CONSTANT_TIME, netInterfaceNames] 
                            : netInterfaceNames);
                }

                var attrIndex = this._getAttributeIndex(attrName);
                if (attrIndex < 0) {
                    return undefined;
                }

                var data = this.get('data');
                if (!data) {
                    return null;
                }

                var val = data[netInterfaceName][attrIndex];
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
             * Given an object with key-value properties (from a getNicListStats)
             * initialize this object from those properties. This is slightly
             * different than most load() functions in the model, in that
             * 'summaryData' has been passed through and contains instances of
             * objects that need to be stored in the internal array.
             */
            load: function(nicListDatum) {
                this.set('netInterfaceNames', nicListDatum['netInterfaceNames']);
                this.loadSummaryData(nicListDatum['summaryData']);
            },

            /**
             * Given a list of summary data objects (nicData, readTime in each)
             * insert them into summaryData such that summaryData remains in sorted time order.
             *
             * We ignore the datum's read time, as that's set on the client side.
             * We'll use the read time in each of the summaryData objects.
             */
            loadSummaryData: function(summaryDataList) {
                if (summaryDataList && summaryDataList.length > 0) {
                    var latestReadTime = this.getReadTime();
                    var netInterfaceNames = this.get('netInterfaceNames');

                    for (var i = 0; i < summaryDataList.length; i++) {
                        var item = summaryDataList[i];
                        var nicData = item.nicData; // the array of N NICs, M values per NIC
                        var readTime = item.readTime;

                        // add the readTime in its slot in each of the summary data 
                        // items (one per NIC) (last), so we keep it around.
                        for (var j = 0; j < netInterfaceNames.length; j++) {
                            nicData[j].push(readTime);
                        }

                        if (readTime > latestReadTime) {
                            // since this new one is later than the latest
                            // that we have, set it as the current item.
                            latestReadTime = readTime;
                            this.set('data', nicData); // all NICs in 1 list.
                        }

                        // regardless whether the current one is or isn't latest,
                        // fire the update event with the new data.
                        this.fire(this.UPDATE_EVENT, {model: this, data: nicData});
                    }
                }
            },

            /**
             * Handle nic-list-level notifications (specifically, summary updates).
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
                 * An array of the names of the various NICs on the host. We get this
                 * as a constant (we don't have to assemble it from notification data).
                 */
                netInterfaceNames: {
                    value: null
                },

                /**
                 * The latest nicList data (an object with a property for each NIC,
                 * each of whose value is an array of property values).
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

