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
YUI.add('nic-rw-thpt-combined-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'nicRWThptCombinedChart';

    /**
     * The View for the 'nic read/write throughput' (Bps) when combining the
     * reads and the writes for all NICs on the gateway's host into two lines.
     *
     * @class NicRWThptCombinedChart
     * @extends Y.DashboardChart
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.NicRWThptCombinedChart = Y.Base.create(
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

                // Each gateway has 2 arrays of data item values--one for read, one for write. 
                // We keep the two arrays in a single object.
                var values = dataItemValues[instanceKey];
                if (!values) {
                    values = {read: [], write:[]};
                    dataItemValues[instanceKey] = values;
                    shouldDraw = true;
                }

                // Get the indexes of the values we need to read from the nicList data
                var rxBytesPerSecondIndex = this.get('rxBytesPerSecondIndex');
                var txBytesPerSecondIndex = this.get('txBytesPerSecondIndex');
                var readTimeIndex = this.get('readTimeIndex');

                if (rxBytesPerSecondIndex == null) {
                    readTimeIndex = gatewayModel.summaryAttributeIndex('nicList', 'readTime');
                    rxBytesPerSecondIndex = gatewayModel.summaryAttributeIndex('nicList', 'rxBytesPerSecond');
                    txBytesPerSecondIndex = gatewayModel.summaryAttributeIndex('nicList', 'txBytesPerSecond');
                    this.set('readTimeIndex', readTimeIndex);
                    this.set('rxBytesPerSecondIndex', rxBytesPerSecondIndex);
                    this.set('txBytesPerSecondIndex', txBytesPerSecondIndex);
                }

                // For this chart, the new read and write values are a combination of 
                // values across all the NICs.

                // total the nicData across all the NICs
                var newRxValue = 0.0;
                var newTxValue = 0.0;

                for (var nicIndex = 0; nicIndex < numNics; nicIndex++) {
                    newRxValue += nicData[nicIndex][rxBytesPerSecondIndex];
                    newTxValue += nicData[nicIndex][txBytesPerSecondIndex];
                }

                if (numNics > 0) {
                    newRxValue = newRxValue / numNics;
                    newTxValue = newTxValue / numNics;
                }

                // Take the time from the first nic's entries
                var newTime = ev.data[0][readTimeIndex];

                // Adjust the Y domain min/max and values multiplier, if these 
                // new data points are outside the current bounds.
                var yDomain = this.get('yDomain');
                var valuesMultiplier = this.get('valuesMultiplier');

                var newBounds = this.computeDomainBounds(newRxValue, 
                                                         yDomain[0], 
                                                         yDomain[1], 
                                                         valuesMultiplier);
                newBounds = this.computeDomainBounds(newTxValue, 
                                                     newBounds.domainMin, 
                                                     newBounds.domainMax, 
                                                     newBounds.valuesMultiplier);

                if (newBounds.domainMin !== yDomain[0] || 
                    newBounds.domainMax !== yDomain[1] ||
                    newBounds.valuesMultiplier !== valuesMultiplier) {
                    this.set('yDomain', [newBounds.domainMin, newBounds.domainMax]);
                    this.set('valuesMultiplier', newBounds.valuesMultiplier);
                    shouldDraw = true;
                }

                // Insert the new [time, value] pairs into the right slots in their values list.
                insertChartValue(values.read, newTime, newRxValue);
                insertChartValue(values.write, newTime, newTxValue);

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
             *
             * For this chart we'll have 2 lines for each gateway. First is
             * the read throughput (combined). Second is the write throughput
             * (again combined).
             */
            getDataItems: function() {
                var clusterModel = this.get('model');

                var dataItems = [];
                var dataItemValues = this.get('dataItemValues');

                for (var instanceKey in dataItemValues) {
                    if (dataItemValues.hasOwnProperty(instanceKey)) {
                        if (this.isShowGateway(clusterModel.findGatewayModelByInstanceKey(instanceKey))) {
                            dataItems.push([instanceKey, 'read'], [instanceKey, 'write']);
                        }
                    }
                }

                return dataItems;
            },

            /**
             * Given a data item, return a string indicating a line style
             * for the line (either 'solid' or 'dashed'). This default
             * just returns 'solid'.
             */
            getDataItemLineStyle: function(dataItem) {
                return (dataItem[1] == 'read' 
                        ? CC.Constants.LineStyle.DASHED 
                        : CC.Constants.LineStyle.SOLID);
            },

            /**
             * Return the list of [time,value] pairs for a given dataItem.
             * This chart's dataItems are its gateway instanceKeys, paired with 'read' or 'write'.
             */
            getDataItemValues: function(dataItem) {
                var instanceKey = dataItem[0];
		var type = dataItem[1];
                var dataItemValues = this.get('dataItemValues');
                var values = dataItemValues[instanceKey];
                return (!values ? [] : values[type]);
            },

            /**
             * Compute a string of HTML we'll use for our summary line at
             * the bottom of the chart. We know we have 2 dataItems, one
             * for read, the other for write.
             */
            computeSummaryHtml: function() {
                var numItems = 0;

                var dataItemValues = this.get('dataItemValues');
                var valuesMultiplier = this.get('valuesMultiplier');
                var lastVisibleTime = this.get('dashboard').get('xDomainClip')[1];
                var readTotals = {min: 0, max: 0, total: 0, avg: 0};
                var writeTotals = {min: 0, max: 0, total: 0, avg: 0};

                if (dataItemValues) {
                    for (var key in dataItemValues) {
                        if (dataItemValues.hasOwnProperty(key)) {
                            numItems++;
                            this.computeTotals(readTotals, dataItemValues[key].read, lastVisibleTime, valuesMultiplier);
                            this.computeTotals(writeTotals, dataItemValues[key].write, lastVisibleTime, valuesMultiplier);
                        }
                    }

                    if (numItems > 0) {
                        readTotals.avg = readTotals.total / numItems;
                        writeTotals.avg = writeTotals.total / numItems;
                    }
                }

                // Put a wrapper div around everything (a) so we can select things
                // reasonably in the CSS, and so it can be centered automatically.
                var val = '<div class="rwThptSummary">';

                val    += '<div class="readThpt">R: </div>' + 
                          '<div class="readThptLine">' +
                          '  <svg>' + 
                          '    <line class="readThpt" x1="3" y1="0" x2="40" y2="0"></line>' + 
                          '  </svg>' + 
                          '</div>'
                val += '<div class="writeThpt">W: </div>' + 
                       '<div class="writeThptLine">' +
                       '  <svg>' + 
                       '    <line class="writeThpt" x1="3" y1="0" x2="40" y2="0"></line>' + 
                       '  </svg>' + 
                       '</div>';
                
                val += '<div class="rwThptMaxAverage">' +
                       '  <div class="summaryLabel">Max: </div>' + 
                       '  <div class="summaryValue">' + Math.max(readTotals.max, writeTotals.max).toFixed(2) + '</div>' + 
                       '  <div class="summaryLabel">&nbsp;Avg.: </div>' + 
                       '  <div class="summaryValue">' + 
                            ((readTotals.avg + writeTotals.avg) / 2).toFixed(2) + 
                       '</div>' + 
                       '</div>';

                val += '</div>';
                                                              
                return val;
            },

            /**
             * Compute the min,max,total for either itemType 'read' or 'write'.
             */
            computeTotals: function(totals, valArray, lastVisibleTime, valuesMultiplier) {
                var first = true;
                var j;

                if (valArray.length > 0) {
                    // we need to find the last item at the last visible time, as 
                    // we want to report the total as of then, NOT as of the last
                    // data item or lastDisplayableTime.

                    for (j = valArray.length - 1; j >= 0; j--) {
                        if (valArray[j][0] < lastVisibleTime) {
                            break;
                        }
                    }

                    if (j >= 0) {
                        var val = valArray[j][1] / valuesMultiplier;

                        if (first) {
                            totals.min = val;
                            totals.max = val;
                            first = false;
                        } else {
                            totals.min = Math.min(totals.min, val);
                            totals.max = Math.max(totals.max, val);
                        }

                        totals.total += val;
                    }
                }
            },

            /**
             * Given a data item (for this chart, an instanceKey combined with either 'read' or 'write'), 
	     * return the color to use for its line.
             */
            getDataItemColor: function(dataItem) {
		var gatewayModel = this.get('model').findGatewayModelByInstanceKey(dataItem[0]);
                return this.get('dashboard').getColor(gatewayModel.get('connectionUrl'));
            },

            /**
             * Optional fn to allow us to change the class list for any data item.
             * For this chart, dataItems are [gateway, 'read'] and [gateway, 'write'].
             * We will use the default class 'line', but append the data item type, too.
             */
            getDataItemClasses: function(dataItem) {
                return 'line ' + dataItem[1];
            },

            /**
             * Given two dataItems (for this chart, each is gateway)
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
                // others, since we have 2 lines to draw for each gateway), the value
                // is an object with 2 properties, 'read' and 'write', that are arrays
                // of [time, value] pairs, the relevant NICList 'rxBytesPerSecond' and 
                // 'txBytesPerSecond' property values for that gateway at that specific time.
                dataItemValues: {
                    value: {}
                },

                // the index in the summary data of the 'rxBytesPerSecond' property.
                // NOTE: we're assuming it's the same for all gateways, which
                // may or may not be true if they are at different versions.
                rxBytesPerSecondIndex: {
                    value: null
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
