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
 * Chart to show total current sessions in each gateway.
 *
 * @module current-sessions-chart
 */
YUI.add('current-sessions-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'currentSessionsChart';

    /**
     * The View for the 'total current sessions in each gateway' chart
     *
     * @class CurrentSessionsChart
     * @extends Y.DashboardChart
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.CurrentSessionsChart = Y.Base.create(
        NAME, 
        Y.DashboardChart, 
        [], 
        {
            initializer: function() {
                var $this = this;

                var model = $this.get('model');

                model && model.addTarget($this);

                // We're going to listen for GatewayDynamicDataModel update events ONLY.
                // Because we can retrieve the gatewayModel instance from that
                // event, we know what gatewayModel instances we need to display.
                // We should NOT have to listen for GATEWAY_AVAILABLE and
                // GATEWAY_UNAVAILABLE events because of this.
                $this.on(Y.GatewayDynamicDataModel.prototype.UPDATE_EVENT, 
                            $this.onGatewayUpdate,
                            $this);
            },

            // The listener for additions to the data. This is the ONLY 
            // routine that will get data.
            onGatewayUpdate: function(ev) {
                var dashboard = this.get('dashboard');

                var shouldDraw = false;

                // Because we're getting this event, we know that we
                // have at least one gateway that is reporting information.
                var dynamicDataModel = ev.model;
                var gatewayModel = dynamicDataModel.get('gatewayModel');

                var dataItemValues = this.get('dataItemValues');

                var instanceKey = gatewayModel.get('instanceKey'); 

                var values = dataItemValues[instanceKey];
                if (!values) {
                    values = [];
                    dataItemValues[instanceKey] = values;
                    shouldDraw = true;
                }

                // Get the indexes of the values we need to read from the gateway
                // dynamic data.
                var totalCurrentSessionsIndex = this.get('totalCurrentSessionsIndex'); 
                var readTimeIndex = this.get('readTimeIndex');

                if (totalCurrentSessionsIndex == null) {
                    readTimeIndex = 
                        gatewayModel.summaryAttributeIndex('gateway', 'readTime');
                    totalCurrentSessionsIndex = 
                        gatewayModel.summaryAttributeIndex('gateway', 'totalCurrentSessions');
                    this.set('readTimeIndex', readTimeIndex);
                    this.set('totalCurrentSessionsIndex', totalCurrentSessionsIndex);
                }

                var newTime = ev.data[readTimeIndex];
                var newValue = ev.data[totalCurrentSessionsIndex];

                // Adjust the Y domain min/max and values multiplier, if this 
                // new data point is outside the current bounds.
                var yDomain = this.get('yDomain');
                var valuesMultiplier = this.get('valuesMultiplier');

                var newBounds = this.computeDomainBounds(newValue, 
                                                         yDomain[0], 
                                                         yDomain[1], 
                                                         valuesMultiplier);

                if (newBounds.domainMin !== yDomain[0] || 
                    newBounds.domainMax !== yDomain[1] ||
                    newBounds.valuesMultiplier !== valuesMultiplier) {
                    this.set('yDomain', [newBounds.domainMin, newBounds.domainMax]);
                    this.set('valuesMultiplier', newBounds.valuesMultiplier);
                    shouldDraw = true;
                }

                // Insert the new [time, value] pair into the right slot in the values list.
                insertChartValue(values, newTime, newValue);

                // XXX The following is not the best, as it misses the case
                // where the point is the first one off the screen to the
                // right, extending on that was on-screen.
                if (dashboard.isTimeVisible(newTime)) {
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
             */
            getDataItems: function() {
                var clusterModel = this.get('model');

                var dataItems = [];
                var dataItemValues = this.get('dataItemValues');

                for (var instanceKey in dataItemValues) {
                    if (dataItemValues.hasOwnProperty(instanceKey)) {
                        var gateway = clusterModel.findGatewayModelByInstanceKey(instanceKey);
                        if (this.isShowGateway(gateway)) {
                            dataItems.push(instanceKey);
                        }
                    }
                }
                
                return dataItems;
            },

            /**
             * Return the list of [time,value] pairs for a given dataItem.
             */
            getDataItemValues: function(dataItem) {
                var instanceKey = dataItem;
                var dataItemValues = this.get('dataItemValues');
                var values = dataItemValues[instanceKey];
                return (!values ? [] : values);
            },

            /**
             * Since we actually want to extend the last value, override the default in dashboard_chart.
             * We must limit the extension to the stopTime of the given dataItem, if there is one.
             */
            extendLastValue: function(dataItem, dataItemValue, maxMS) {
                // the dataItem for us is an instance key.
                var clusterModel = this.get('model');

                var gatewayModel = clusterModel.findGatewayModelByInstanceKey(dataItem);
                var stopTime = gatewayModel.get('stopTime');

                if (stopTime && stopTime < maxMS) {
                    return [stopTime, dataItemValue[1]];
                } else {
                    // extend to the last point
                    return [maxMS, dataItemValue[1]];
                }
            },

            /**
             * Compute a string of HTML we'll use for our summary line at
             * the bottom of the chart.
             */
            computeSummaryHtml: function() {
                var dashboard = this.get('dashboard');

                var val = totalSummaryFn(this.get('dataItemValues'), 
                                         this.get('valuesMultiplier'), 
                                         dashboard.get('xDomainClip')[1]);
                return val;
            },

            /**
             * Given a data item, return the color to use for its line.
             */
            getDataItemColor: function(dataItem) {
		var gatewayModel = this.get('model').findGatewayModelByInstanceKey(dataItem);
                return this.get('dashboard').getColor(gatewayModel.get('connectionUrl'));
            },

            /**
             * Given two dataItems (for this chart, each is an instanceKey)
             * return whether they are equal or not.
             */
            dataItemsEqual: function(dataItem1, dataItem2) {
                return (dataItem1 === dataItem2);
            }
        }, 
        {
            ATTRS: {
                title: {
                    value: null
                },

                valueType: {
                    value: 'number'
                },

                interpolation: {
                    value: 'step-after'
                },

                extendLastValue: {
                    value: true
                },

                // an object containing one property for each gateway, the
                // gateway's gatewayLabel. Each property value is an array
                // of [time, value] pairs, the relevant GatewayDynamicDataValue
                // 'totalCurrentSessions' property value for that gateway 
                // at that specific time.
                dataItemValues: {
                    value: {}
                },

                // the index in the summary data of the 'totalCurrentSessions' property.
                // NOTE: we're assuming it's the same for all gateways, which
                // may or may not be true if they are at different versions.
                totalCurrentSessionsIndex: {
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
