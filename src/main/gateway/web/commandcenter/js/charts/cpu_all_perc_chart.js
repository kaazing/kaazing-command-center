/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * Chart to show CPU percentage, with all cores in each CPU shown
 *
 * @module cpu-all-perc-chart
 */
YUI.add('cpu-all-perc-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'cpuAllPercChart';

    /**
     * The View for the 'cpu percentage for each core in each gateway' chart
     *
     * @class CpuAllPercChart
     * @extends Y.DashboardChart
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.CpuAllPercChart = Y.Base.create(
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
                var numCpus = cpuData.length;

                if (numCpus == 0) {
                    return;  // should never happen, but just in case
                }

                // Each gateway has N arrays of data item values, one for each CPU.
                // We keep the two arrays in a single outer array.
                var values = dataItemValues[instanceKey];
                if (!values) {
                    values = [];
                    // array entry for each CPU
                    for (var i = 0; i < cpuData.length; i++) {
                        values.push([]);
                    }
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

                // Adjust the Y domain min/max and values multiplier, if these 
                // new data points are outside the current bounds.
                var yDomain = this.get('yDomain');
                var valuesMultiplier = this.get('valuesMultiplier');

                // For this chart, we need to get the new values across 
                // all the CPUs, and update the bounds as we do. Since
                // we have to check the bounds multiple times, we'll set
                // up newBounds with the existing values first.
                var newValue;
                var newBounds = {domainMin: yDomain[0], domainMax: yDomain[1], valuesMultiplier: valuesMultiplier};

                // Take the time from the first CPU's entries. It's the same for all.
                var newTime = ev.data[0][readTimeIndex];

                for (var cpuIndex = 0; cpuIndex < numCpus; cpuIndex++) {
                    newValue = cpuData[cpuIndex][combinedIndex];
                    newBounds = this.computeDomainBounds(newValue, 
                                                         newBounds.domainMin, 
                                                         newBounds.domainMax,
                                                         newBounds.valuesMultiplier);

                    // Insert the new [time, value] pairs into the right slot in the values list.
                    insertChartValue(values[cpuIndex], newTime, newValue);
                    
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
             *   the instanceKey of the gatewayModel of interest (we can get
             *       that from the dataItemValues, and the instanceKeys are
             *       immutable and never go away.)
             *   the index of the CPU in the cpuListModel for the gateway.
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
                            var cpuListModel = gateway.get('cpuListModel');
                            var numCpus = cpuListModel.get('numCpus');
                            for (var j = 0; j < numCpus; j++) {
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
                var cpuIndex = dataItem[1];
                var dataItemValues = this.get('dataItemValues');
                var values = dataItemValues[instanceKey];
                return (!values ? [] : values[cpuIndex]);
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
             * Given two dataItems (for this chart, each is [instanceKey, cpuIndex])
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
                    value: 'percentage'
                },

                showUnits: {
                    value: false
                },

                // an object containing one property for each gateway, the
                // gateway's gatewayLabel. For this chart (slightly different than
                // others, since we have N lines to draw for each gateway, one per CPU/core), 
                // the value is an array, with N entries (one per CPU/core), each of which
                // it itself an array of [time, value] pairs, the relevant CpuList 
                // 'combined' property values for that gateway at that specific time.
                dataItemValues: {
                    value: {}
                },

                // the index in the summary data of the 'combined' property.
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
