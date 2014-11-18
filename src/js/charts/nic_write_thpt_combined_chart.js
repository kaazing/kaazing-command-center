/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * Chart to show throughput (bytes per second) for send/receive summed across
 * all NICs, for each gateway.
 *
 * @module nic-write-thpt-combined-chart
 */
YUI.add('nic-write-thpt-combined-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'nicWriteThptCombinedChart';

    /**
     * The View for the 'nic write throughput' (Bps) when combining the write 
     * output of all the NICs on the gateway's host.
     *
     * @class NicWriteThptCombinedChart
     * @extends Y.DashboardChart
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.NicWriteThptCombinedChart = Y.Base.create(
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

                // Each gateway has an array of data item values
                var values = dataItemValues[instanceKey];
                if (!values) {
                    values = [];
                    dataItemValues[instanceKey] = values;
                    shouldDraw = true;
                }

                // Get the indexes of the values we need to read from the nicList data
                var txBytesPerSecondIndex = this.get('txBytesPerSecondIndex');
                var readTimeIndex = this.get('readTimeIndex');

                if (txBytesPerSecondIndex == null) {
                    readTimeIndex = gatewayModel.summaryAttributeIndex('nicList', 'readTime');
                    txBytesPerSecondIndex = gatewayModel.summaryAttributeIndex('nicList', 'txBytesPerSecond');
                    this.set('readTimeIndex', readTimeIndex);
                    this.set('txBytesPerSecondIndex', txBytesPerSecondIndex);
                }

                // For this chart, the new read and write values are a combination of 
                // values across all the NICs.

                // total the nicData across all the NICs
                var newTxValue = 0.0;

                for (var nicIndex = 0; nicIndex < numNics; nicIndex++) {
                    newTxValue += nicData[nicIndex][txBytesPerSecondIndex];
                }

                if (numNics > 0) {
                    newTxValue = newTxValue / numNics;
                }

                // Take the time from the first NIC's entries
                var newTime = ev.data[0][readTimeIndex];

                // Adjust the Y domain min/max and values multiplier, if these 
                // new data points are outside the current bounds.
                var yDomain = this.get('yDomain');
                var valuesMultiplier = this.get('valuesMultiplier');

                var newBounds = this.computeDomainBounds(newTxValue, 
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

                // Insert the new [time, value] pairs into the right slots in their values list.
                insertChartValue(values, newTime, newTxValue);

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
             * return an array of items. We'll just return a list of gateway
             * instanceKeys, since they are immutable and never go away, and
             * we're already using them as keys into the dataItemValues.
             */
            getDataItems: function() {
                var clusterModel = this.get('model');

                var dataItems = [];
                var dataItemValues = this.get('dataItemValues');

                for (var instanceKey in dataItemValues) {
                    if (dataItemValues.hasOwnProperty(instanceKey)) {
                        if (this.isShowGateway(clusterModel.findGatewayModelByInstanceKey(instanceKey))) {
                            dataItems.push(instanceKey);
                        }
                    }
                }

                return dataItems;
            },

            /**
             * Return the list of [time,value] pairs for a given dataItem.
             * This chart's dataItems are its gateway instanceKeys.
             */
            getDataItemValues: function(dataItem) {
                var values = this.get('dataItemValues')[dataItem];
                return (!values ? [] : values);
            },

            /**
             * Compute a string of HTML we'll use for our summary line at
             * the bottom of the chart.
             */
            computeSummaryHtml: function() {
                var dashboard = this.get('dashboard');

                var val = minMaxAverageSummaryFn(this.get('dataItemValues'), 
                                                 this.get('valuesMultiplier'),
                                                 dashboard.get('xDomainClip')[1]);
                return val;
            },

            /**
             * Given a data item (for this chart, an instanceKey), return the color to use for its line.
             */
            getDataItemColor: function(dataItem) {
                var gatewayModel = this.get('model').findGatewayModelByInstanceKey(dataItem);
                return this.get('dashboard').getColor(gatewayModel.get('connectionUrl'));
            },

            /**
             * Given two dataItems (for this chart, each is a gatewayModel)
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
                    value: 'byteRate'
                },

                showUnits: {
                    value: true
                },

                // an object containing one property for each gateway, the
                // gateway's gatewayLabel. For this chart, the value
                // is an array of [time, value] pairs, the relevant NICList 
                // 'txBytesPerSecond' property value for that gateway at that specific time.
                dataItemValues: {
                    value: {}
                },

                // the index in the summary data of the 'txBytesPerSecond' property.
                // NOTE: we're assuming it's the same for all gateways, which
                // may or may not be true if they are at different versions.
                txBytesPerSecondIndex: {
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
