/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * Chart to show average CPU percentage across all cores for each gateway host
 *
 * @module cpu-avg-perc-chart
 */
YUI.add('cpu-avg-perc-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'cpuAvgPercChart';

    /**
     * The View for the 'cpu percentage averaged over cores in each gateway' chart
     *
     * @class CpuAvgPercChart
     * @extends Y.DashboardChart
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.CpuAvgPercChart = Y.Base.create(
        NAME, 
        Y.DashboardChart, 
        [], 
        {
            initializer: function() {
                var $this = this;

                var model = $this.get('model');

                model && model.addTarget($this);

                // We're going to listen for CPU list update events ONLY.
                // Because we can retrieve the gatewayModel instance from that
                // event, we know what gatewayModel instances we need to display.
                // We should NOT have to listen for GATEWAY_AVAILABLE and
                // GATEWAY_UNAVAILABLE events because of this.
                $this.on(Y.CpuListModel.prototype.UPDATE_EVENT, 
                         $this.onCpuListUpdate,
                         $this);
            },

            // The listener for additions to the data. This is the ONLY 
            // routine that will get data.
            onCpuListUpdate: function(ev) {
	        var dashboard = this.get('dashboard');
		
                var shouldDraw = false;

                // Because we're getting this event, we know that we
                // have at least one gateway that is reporting information.
                var cpuListModel = ev.model;
                var gatewayModel = cpuListModel.get('gatewayModel');

                var dataItemValues = this.get('dataItemValues');

                var instanceKey = gatewayModel.get('instanceKey'); 

                // the array of N CPUs/cores, M values per CPU/core, for a given gateway.
                var cpuData = ev.data;  

                // Each gateway has an array of data item values
                var values = dataItemValues[instanceKey];
                if (!values) {
                    values = [];
                    dataItemValues[instanceKey] = values;
                    shouldDraw = true;
                }

                // Get the indexes of the values we need to read from the cpuList data
                var combinedIndex = this.get('combinedIndex');
                var readTimeIndex = this.get('readTimeIndex');

                if (combinedIndex == null) {
                    readTimeIndex = gatewayModel.summaryAttributeIndex('cpuList', 'readTime');
                    combinedIndex = gatewayModel.summaryAttributeIndex('cpuList', 'combined');
                    this.set('readTimeIndex', readTimeIndex);
                    this.set('combinedIndex', combinedIndex);
                }

                // For this chart, the new value is a combination of the value across all CPUs.
                var numCpus = cpuData.length;

                // total the cpuData across all the CPUs
                var newValue = 0.0;

                for (var cpuIndex = 0; cpuIndex < numCpus; cpuIndex++) {
                    newValue += cpuData[cpuIndex][combinedIndex];
                }

                if (numCpus > 0) {
                    newValue = newValue / numCpus;
                }

                // Take the time from the first CPU's entries
                var newTime = ev.data[0][readTimeIndex];

                // Adjust the Y domain min/max and values multiplier, if these 
                // new data points are outside the current bounds.
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

                // Insert the new [time, value] pairs into the right slots in their values list.
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
                    value: 'percentage'
                },

                showUnits: {
                    value: false
                },

                // an object containing one property for each gateway, the
                // gateway's gatewayLabel. For this chart, the value
                // is an array of [time, value] pairs, the relevant NICList 
                // 'txBytesPerSecond' property value for that gateway at that specific time.
                dataItemValues: {
                    value: {}
                },

                // the index in the summary data of the 'percentage' property.
                // NOTE: we're assuming it's the same for all gateways, which
                // may or may not be true if they are at different versions.
                combinedIndex: {
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
