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
 * Chart to show throughput (bytes per second) for each of the NICs 
 * on the host for each gateway.
 *
 * @module nic-read-thpt-indiv-chart
 */
YUI.add('nic-read-thpt-indiv-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'nicReadThptIndivChart';

    /**
     * The View for the 'nic read throughput (bps) for each NIC 
     * on each host for each gateway' chart
     *
     * @class NicReadThptIndivChart
     * @extends Y.DashboardChart
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.NicReadThptIndivChart = Y.Base.create(
        NAME, 
        Y.DashboardChart, 
        [], 
        {
            initializer: function() {
                var $this = this;

                var model = $this.get('model');

                model && model.addTarget($this);

                // We're going to listen for NIC list update events ONLY.
                // Because we can retrieve the gatewayModel instance from that
                // event, we know what gatewayModel instances we need to display.
                // We should NOT have to listen for GATEWAY_AVAILABLE and
                // GATEWAY_UNAVAILABLE events because of this.
                $this.on(Y.NicListModel.prototype.UPDATE_EVENT, 
                            $this.onNicListUpdate,
                            $this);
            },

            // The listener for additions to the data. This is the ONLY 
            // routine that will get data.
            onNicListUpdate: function(ev) {
                var dashboard = this.get('dashboard');

                var shouldDraw = false;

                // Because we're getting this event, we know that we
                // have at least one gateway that is reporting information.
                var nicListModel = ev.model;
                var gatewayModel = nicListModel.get('gatewayModel');

                var dataItemValues = this.get('dataItemValues');

                var instanceKey = gatewayModel.get('instanceKey'); 

                // the array of N NICs, M values per NIC, for a given gateway.
                var nicData = ev.data;  
                var numNics = nicData.length;

                if (numNics == 0) {
                    return;  // should never happen, but just in case
                }

                // Each gateway has N arrays of data item values, one for each NIC.
                // We keep the two arrays in a single outer array.
                var values = dataItemValues[instanceKey];
                if (!values) {
                    values = [];
                    // array entry for each NIC
                    for (var i = 0; i < nicData.length; i++) {
                        values.push([]);
                    }
                    dataItemValues[instanceKey] = values;
                    shouldDraw = true;
                }

                // Get the indexes of the values we need to read from the nicList data
                var rxBytesPerSecondIndex = this.get('rxBytesPerSecondIndex');
                var readTimeIndex = this.get('readTimeIndex');

                if (rxBytesPerSecondIndex == null) {
                    readTimeIndex = gatewayModel.summaryAttributeIndex('nicList', 'readTime');
                    rxBytesPerSecondIndex = gatewayModel.summaryAttributeIndex('nicList', 'rxBytesPerSecond');
                    this.set('readTimeIndex', readTimeIndex);
                    this.set('rxBytesPerSecondIndex', rxBytesPerSecondIndex);
                }

                // Adjust the Y domain min/max and values multiplier, if these 
                // new data points are outside the current bounds.
                var yDomain = this.get('yDomain');
                var valuesMultiplier = this.get('valuesMultiplier');

                // For this chart, we need to get the new values across 
                // all the NICs, and update the bounds as we do. Since
                // we have to check the bounds multiple times, we'll set
                // up newBounds with the existing values first.
                var newValue;
                var newBounds = {domainMin: yDomain[0], domainMax: yDomain[1], valuesMultiplier: valuesMultiplier};

                // Take the time from the first NIC's entries. It's the same for all.
                var newTime = ev.data[0][readTimeIndex];

                for (var nicIndex = 0; nicIndex < numNics; nicIndex++) {
                    newValue = nicData[nicIndex][rxBytesPerSecondIndex];
                    newBounds = this.computeDomainBounds(newValue, 
                                                         newBounds.domainMin, 
                                                         newBounds.domainMax,
                                                         newBounds.valuesMultiplier);

                    // Insert the new [time, value] pairs into the right slot in the values list.
                    insertChartValue(values[nicIndex], newTime, newValue);
                    
                    if (dashboard.isTimeVisible(newTime)) {
                        shouldDraw = true;
                    }
                }

                if (newBounds.domainMin !== yDomain[0] || 
                    newBounds.domainMax !== yDomain[1] ||
                    newBounds.valuesMultiplier !== valuesMultiplier) {
                    this.set('yDomain', [newBounds.domainMin, newBounds.domainMax]);
                    this.set('valuesMultiplier', newBounds.valuesMultiplier);
                    shouldDraw = true;
                }

                this.adjustTitle();
                this.adjustSummary();

                if (shouldDraw) {
                    this.drawChart();
                }
            },

            /**
             * Retrieve the current list of data items. Each will be used to
             * draw a path. The function can do anything it wants, but must
             * return an array of items.
             * We'll make each data item an array of 2 elements:
             *   the instanceKey of the gatewayModel of interest
             *   the name of the NIC in the netInterfaceNames for the gateway.
             * We can use those to retrieve the real data values needed.
             */
            getDataItems: function() {
                var clusterModel = this.get('model');

                var dataItems = [];
                var dataItemValues = this.get('dataItemValues');

                for (var instanceKey in dataItemValues) {
                    if (dataItemValues.hasOwnProperty(instanceKey)) {
                        var gateway = clusterModel.findGatewayModelByInstanceKey(instanceKey);
                        if (this.isShowGateway(gateway)) {
                            var nicListModel = gateway.get('nicListModel');
                            var netInterfaceNames = nicListModel.get('netInterfaceNames');
                            for (var j = 0; j < netInterfaceNames.length; j++) {
                                dataItems.push([instanceKey, j]);
                            }
                        }
                    }
                }

                return dataItems;
            },

            /**
             * Return the list of [time,value] pairs for a given dataItem.
             */
            getDataItemValues: function(dataItem) {
                var instanceKey = dataItem[0];
                var nicName = dataItem[1];
                var dataItemValues = this.get('dataItemValues');
                var values = dataItemValues[instanceKey];
                return (!values ? [] : values[nicName]);
            },

            /**
             * Compute a string of HTML we'll use for our summary line at
             * the bottom of the chart.
             */
            computeSummaryHtml: function() {
                var dashboard = this.get('dashboard');

                var val = minMaxAverageMultipleSummaryFn(this.get('dataItemValues'), 
                                                         this.get('valuesMultiplier'),
                                                         dashboard.get('xDomainClip')[1]);
                return val;
            },

            /**
             * Given a data item, return the color to use for its line.
             */
            getDataItemColor: function(dataItem) {
		var gatewayModel = this.get('model').findGatewayModelByInstanceKey(dataItem[0]);
                return this.get('dashboard').getColor(gatewayModel.get('connectionUrl'));
            },

            /**
             * Given two dataItems (for this chart, each is [instanceKey, nicIndex])
             * return whether they are equal or not.
             */
            dataItemsEqual: function(dataItem1, dataItem2) {
                var val = (dataItem1[0] === dataItem2[0] &&
                           dataItem1[1] === dataItem2[1]);
                return val;
            }
        }, 
        {
            ATTRS: {
                title: {
                    value: null
                },

                valueType: {
                    value: 'byteRate'
                },

                showUnits: {
                    value: true
                },

                // an object containing one property for each gateway, the
                // gateway's gatewayLabel. For this chart (slightly different than
                // others, since we have N lines to draw for each gateway, one per NIC), 
                // the value is an array, with N entries (one per NIC), each of which
                // it itself an array of [time, value] pairs, the relevant NICList 
                // 'rxBytesPerSecond' property values for that gateway at that specific time.
                dataItemValues: {
                    value: {}
                },

                // the index in the summary data of the 'rxBytesPerSecond' property.
                // NOTE: we're assuming it's the same for all gateways, which
                // may or may not be true if they are at different versions.
                rxBytesPerSecondIndex: {
                    value: null
                },

                // The index in the summary data of the 'readTime' attribute
                readTimeIndex: {
                    value: null
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'dashboard-chart', 'gateway-model']
});
