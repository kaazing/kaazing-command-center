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
 * The Dashboard view for the Kaazing Command Center application. All the graphs on
 * this display will be using the same time/zoom scale.
 *
 * @module dashboard-view
 */
YUI.add('dashboard-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'dashboardView',
    DATA_DIV_ID = 'dashboardData',
    SCALE_FACTOR = 1.2,
    DRAW_INTERVAL = 250,
    CHART_CTR = 1,
    CHART_LIST_ITEM_NAME = 'kaazingCommandCenterCharts',
    TIME_OFFSET_MS = 6000,
    INITIAL_CLIP_WIDTH_MS = 60000,
    MAX_ADJUST_INTERVAL = 300000;

    // the labels
    var SCROLLING_LABEL = "Scrolling",
    DEFAULT_CHARTS_LABEL = "Default Charts",
    CONNECTED_CLUSTER_LABEL = 'Connected to a cluster',
    CONNECTED_SINGLE_LABEL = 'Connected to a single gateway';

    // image URLs
    var PAUSE_IMAGE_URL = '<img src="../images/pause.png"/>',
    PLAY_IMAGE_URL = '<img src="../images/play.png"/>';
    
    // checkbox-staste constants
    var CB_SHOW_ALL_STATE = 1,
    CB_SHOW_NONE_STATE = 0,
    CB_SHOW_SOME_STATE = -1;

    var IS_WEBKIT = false;   // are we using a WebKit-based browser?

    /**
     * The View to display the Command Center dashboard. 
     *
     * @class DashboardView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.DashboardView = Y.Base.create(
        NAME, 
        Y.KaazingView, 
        [], 
        {
            MODEL_CHANGE_EVENT:  NAME + 'modelChange',
            BOUNDS_CHANGE_EVENT:  NAME + 'boundsChange',
            ADD_CHART_EVENT:  NAME + 'addChart',
            DELETE_CHART_EVENT:  NAME + 'deleteChart',
            RESIZE_EVENT:  NAME + 'resize',
            TOGGLE_CHART_SIZE_EVENT: NAME + 'toggleChartSize',
            SHOW_GATEWAY_CHANGE_EVENT: NAME + 'showGatewayChange',

            initializer: function() {
                // Some stuff differs when we're using WebKit or Firefox browsers, so
                // we'll set a flag here for each.
                IS_WEBKIT = (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0);

                // subscribe to events when our model is replaced or any other
                // change events take place.
                var model = this.get('model');

                // This view listens for ClusterModel events, specifically replacing the model.
                model.addTarget(this);

                // Listen for change events on the cluster model, which will 
                // cause a complete re-render.
                this.after('modelChange', this.afterModelChange, this);

                // When the user actually does log in, we can actually draw stuff.
                this.after('*:loggedInChange', this.afterLoggedInChange, this);
            },
            
            onChartDragFn: function() {
                // don't need to do anything, but do need to be here
            },

            onChartDragEnd: function(ev) {
                var drag = ev.target;
                var data = drag.get('data');

                if (data.hit !== true) {
                    ev.preventDefault();
                }

                delete data.hit;
            },

            onChartDropHit: function(ev) {
                var charts = this.get('charts');

                var drag = ev.drag;
                var dragChart = drag.get('data').chart; 
                var dragIndex = charts.indexOf(dragChart);

                var drop = ev.drop;
                var dropChart = drop.get('data').chart; 
                var dropIndex = charts.indexOf(dropChart);

                // put the chart in front of whomever is the drop target,
                // unless it is already directly in front of the drop target.
                if (dragIndex != dropIndex - 1) {
                    var dragContainer = dragChart.get('container');
                    var dropContainer = dropChart.get('container');

                    var parentNode = dragContainer.get('parentNode');
                    parentNode.removeChild(dragContainer);
                    parentNode.insertBefore(dragContainer, dropContainer);
                    // The drag sets a specific value for left and top of the
                    // dragged node. We need to reset the left and top to 'auto'
                    // so they are positioned correctly
                    dragContainer.setStyle('left', 'auto');
                    dragContainer.setStyle('top', 'auto');
                    drag.get('data').hit = true;

                    // adjust the 'charts' list to reflect the new ordering.
                    // The index to splice to depends on whether we're moving
                    // toward the head or tail of the list.
                    charts.splice(dragIndex, 1);  // remove the drag item
                    charts.splice(dragIndex < dropIndex 
                                  ? (dropIndex - 1) 
                                  : dropIndex, 0, dragChart); 

                    this.computeAndStoreChartList();
                }
            },

            /**
             * Response after the ClusterModel we're referring to is replaced.
             * Basically never, until we have multiple clusters.
             */
            afterModelChange: function(ev) {
                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);

                this.fire(this.MODEL_CHANGE_EVENT, {});
            },

            /**
             * Handle a change of connection URL by one of the gateways.
             */
            afterConnectionUrlChange: function(ev) {
                if (this.isActiveView()) {
                    this.renderOverallInfo();
                    this.renderLegend();
                }
            },

            /**
             * Response to adding a new gateway to the cluster. Redraw the 
             * header and legend data. The individual charts are responsible
             * for handling the same event and adjusting the number of chart
             * lines as needed. 
             */
            onGatewayAvailable: function(ev) {
                if (this.isActiveView()) {
                    this.renderOverallInfo();
                    this.renderLegend();
                }
            },

            /**
             * Response to seeing that a gateway instance has been marked as stopped.
             */
            afterStopTimeChange: function(ev) {
                if (this.isActiveView()) {
                    this.renderOverallInfo();
                    this.renderLegend();
                }
            },

            /**
             * Handle the window-resize event. If we're not onscreen, it will be
             * handled the next time we come onscreen, in showViewCallback.
             */
            afterWindowResize: function() {
                if (this.isActiveView()) {
                    var charts = this.get('charts');
                    if (charts && charts.length > 0) {
                        var maximizedChart = this.getMaximizedChart(); // null if none
                        this.adjustChartSizes(maximizedChart ? 1 : charts.length);
                        this.fire(this.RESIZE_EVENT, {});
                    }
                }
            },

            /**
             * Handle the 'lastDisplayableTime' value being changed (including the
             * initial time from null to a value). If we're drawing and the domain
             * clipping region is close enough to the time, update the clipping region 
             * to show that and fire a bounds-changed event
             */
            afterLastDisplayableTimeChange: function(ev) {
                var prevVal = ev.prevVal;
                var newVal = ev.newVal; 

                var xDomainClip = this.get('xDomainClip');
                // if we have no xDomainClip yet (e.g. because we're getting this before
                // logging in), we have nothing to adjust, so bail.
                if (!xDomainClip) {
                    return;
                }
                
                // If we're specifically set as scrolling, move the bounds even if
                // we're not showing as close to the edge.
                if (prevVal == null || this.get('scrolling')) {
                    var newXDomainClip = [xDomainClip[0] + (newVal - xDomainClip[1]), newVal];
                    this.set('xDomainClip', newXDomainClip); 

                    this.fire(this.BOUNDS_CHANGE_EVENT,
                              {type: 'translate', 
                               oldXDomainClip: xDomainClip,
                               newXDomainClip: newXDomainClip});
                }
            },

            /**
             * After the user logs in the first time. Only really does something if
             * we're on-screen. Otherwise, we will go through showViewCallback when
             * we're displayed.
             */
            afterLoggedInChange: function(ev) {
                return (this.isActiveView() ? this.doDisplaySetup() : null);
            },

            /**
             * Callback from app after we display the view. Only really does
             * something if we've logged in. Otherwise, we don't want to show
             * anything anyway, and will go through afterLoggedInChange when
             * we do log in.
             */
            showViewCallback: function() {
                return (this.hasLoggedIn() ? this.doDisplaySetup() : null);
            },

            /**
             * Callback from app as we're switching away from the view.
             * For us, turn off the drawing and updating.
             *
             * Note that we do NOT unhook model events. We want to continue
             * to respond to them by changing our data structures, just not
             * waste time trying to render anything to the view (we'll do 
             * that during showViewCallback).
             */
            hideViewCallback: function() {
                this.cancelDisplayTimeLoop();
                return this;
            },

            /**
             * Do the chart initialization and start rendering stuff.
             * Called either from 'showViewCallback' or 'afterLoggedInChange',
             * depending on which is called first. We know at this point that
             * we have a container size, so can compute chart sizes.
             */
            doDisplaySetup: function() {
                var $this = this;

                this.setupToolbar();
                this.renderOverallInfo();
                this.renderLegend();

                if (this.get('firstTime')) {
                    // First time through. Set up our events, then charts.
                    this.publish(this.MODEL_CHANGE_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // event for saying "the chart bounds or clip region changed"
                    this.publish(this.BOUNDS_CHANGE_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // event when the user manually adds a chart to display
                    this.publish(this.ADD_CHART_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // event when the user manually deletes a chart from the display
                    this.publish(this.DELETE_CHART_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // event when the user manually resizes the window, which means
                    // we need to resize the charts being displayed.
                    this.publish(this.RESIZE_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // event when the user says a chart is to be maximized or "unmaximized"
                    this.publish(this.TOGGLE_CHART_SIZE_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // event when the user says to show or hide a given gateway's data
                    this.publish(this.SHOW_GATEWAY_CHANGE_EVENT,
                                 {emitFacade: true,
                                  broadcast: true,
                                  bubbles: true,
                                  defaultFn: function(){},
                                  preventedFn: function(){},
                                  stoppedFn: function(){}
                                 });

                    // We'll listen for add/remove gateways so we can control the
                    // display of the header area (connection info, #gateways, etc.)
                    // The graphs that are specific to gateways need to do the same.
                    this.on(Y.GatewayModel.prototype.GATEWAY_AVAILABLE_EVENT, 
                            this.onGatewayAvailable,
                            this);

                    // We don't actually care if a gateway instance becomes unavailable 
                    // (we'll still use its config, if it's managed, or it will at least 
                    // still count even if not). When it actually sets a stopTime we cannot
                    // use it any more. Unmanaged gateways go directly from available to 
                    // having a stop time. Managed gateways become unavailable first.
                    this.after('gatewayModel:stopTimeChange',
                               this.afterStopTimeChange,
                               this);

                    // handle a change in lastDisplayableTime
                    this.after('lastDisplayableTimeChange', 
                               this.afterLastDisplayableTimeChange, 
                               this);

                    // handle a change in scrolling
                    this.after('scrollingChange', 
                               this.afterScrollingChange, 
                               this);

                    Y.after('windowresize', 
                            function() {
                                $this.afterWindowResize();
                            });


                    // handle changes to gateway connection URLs as gateways come up
                    this.after('gatewayModel:connectionUrlChange', 
                               this.afterConnectionUrlChange,
                               this);

                    // Set up the drag and drop listener functions so we can drag charts 
                    // around to reposition things. They are only droppable
                    Y.DD.DDM.on('drag:drag', this.onChartDragFn, this);
                    Y.DD.DDM.on('drag:end', this.onChartDragEnd, this);
                    Y.DD.DDM.on('drag:dropmiss', this.onChartDropMiss, this);
                    Y.DD.DDM.on('drag:drophit', this.onChartDropHit, this);

                    this.set('firstTime', false);
                }

                var charts = this.get('charts');

                if (!charts) {

                    this.setupChartTimeBounds(); 

                    // get the list of chart names from localStorage.
                    // * null - we have yet to define a list, use the default charts
                    // * empty string - the user has removed all charts from the
                    //   display, do not reset to the default list 
                    // * Anything else - an array of chart keys.
                    var chartList = this.getChartList();

                    if (chartList !== '') {
                        if (chartList == null) {
                            chartList = this.getDefaultChartList();
                        }

                        // do we have one chart marked as maximized?
                        var anyMaximized = false;
                        for (var i = 0; i < chartList.length; i++) {
                            if (chartList[i].endsWith('+')) {
                                anyMaximized = true;
                                break;
                            }
                        }

                        // Figure out the initial chart size, based on whether or
                        // not we have a maximized chart or one chart (both will
                        // will take up all available space) or more than one chart.
                        this.adjustChartSizes(anyMaximized ? 1 : chartList.length);

                        // now set up the individual charts. All will be 
                        // the same size, but if one is maximized then
                        // the others will be hidden.
                        var charts = [];
                        this.set('charts', charts);

                        var chartsDiv = this.get('container').one('.dashboardCharts');

                        for (var i = 0; i < chartList.length; i++) {
                            var chartKey = chartList[i];
                            var isMaximized = chartKey.endsWith('+');

                            if (isMaximized) {
                                chartKey = chartKey.substring(0, chartKey.length - 1);
                            }

                            var chartMetadata = this.getChartMetadata(chartKey);

                            // Check if we find the chart, in case somebody 
                            // has an old chart name no longer supported.
                            if (chartMetadata) {
                                // create the chart at the appropriate size. 
                                // All charts are initially created hidden, 
                                // so we have some flexibility about when to 
                                // show them.
                                var chart = this.instantiateChart(chartsDiv, 
                                                                  chartMetadata, 
                                                                  isMaximized);
                                charts.push(chart);

                                // mark correct visibility for the relevant guys. They
                                // are all created as hidden, though 'maximized' is set
                                // correctly on the maximized one.
                                if (isMaximized || !anyMaximized) {
                                    chart.unhide();
                                }
                            } else {
                                alert("Unable to find the chart named '" +
                                      chartKey + "'");
                            }
                        }

                        this.computeAndStoreChartList();
                    }
                }

                if (this.get('scrolling')) {
                    this.startDisplayTimeLoop();
                } else if (!this.get('lastDisplayableTime')) {
                    this.updateLastDisplayableTime();
                }

                return this;
            },

            /**
             * Set the initial chart time range. We'll do it as two pieces:
             * an initial setting for a few minutes from 'now', then a repeating
             * interval that starts a minute before that first time runs out,
             * and repeats with the same time as the 'few minutes' from now.
             */
            setupChartTimeBounds: function() {
                var $this = this;

                // the min time is when the cluster started, - 60 seconds so
                // that we can see the data appear from the right side of the
                // screen.
                var startTime = this.get('model').get('startTime').getTime();
                var now = Date.now();

                this.set('xDomain', [startTime, Date.now() + MAX_ADJUST_INTERVAL]);
                this.set('xDomainClip', [now - TIME_OFFSET_MS - INITIAL_CLIP_WIDTH_MS, 
                                         now - TIME_OFFSET_MS]);

                var fn = function() {
                    $this.extendX();
                }

                this.set('maxChartTimeTimerId', 
                         invokeLater(fn, MAX_ADJUST_INTERVAL - 60000, MAX_ADJUST_INTERVAL));
            },

            /**
             * Given current sizes, compute the chart % sizes and actual pixel width
             * and height for all charts that are being displayed. We'll then send off
             * a 'resize' entry to pick these up.
             */
            adjustChartSizes: function(numCharts) {
                var widthPercentage, heightPercentage, rows;

                if (numCharts < 2) {
                    widthPercentage = 100;
                    heightPercentage = 100;
                } else {
                    widthPercentage = 50;
                    rows = Math.floor((numCharts + 1) / 2);
                    heightPercentage = Math.floor(100/rows);
                }

                var chartContainerSize = [widthPercentage, heightPercentage];
                this.set('chartContainerSize', chartContainerSize);;

                // Convert the chartContainerSize to pixels based on the size of
                // the 'dashboardCharts' div. This is the container for all charts,
                var container = this.get('container');
                var chartsDiv = container.one('.dashboardCharts');
                var chartsDivSize = [ parseInt(chartsDiv.getStyle('width')), 
                                      parseInt(chartsDiv.getStyle('height')) ];
                var chartMargin = this.get('chartMargin');

                // Now we're going to do some "magic". There are a set of 
                // style values that we need to get, but as I can't get them
                // right now, I'll use constants instead.
                // We know that the charts are using border-box sizing.
                var CHART_BORDER_WIDTH = 4;
                var HEADER_FOOTER_SIZE = (26 + 21); // for chart title and summary footer
                var CHART_AREA_L_R_BORDER = 1;  // L & R borders only

                var chartAreaSize = [(chartsDivSize[0] * (widthPercentage / 100)) -
                                     (2 * (CHART_BORDER_WIDTH + CHART_AREA_L_R_BORDER)),
                                     (chartsDivSize[1] * (heightPercentage / 100)) - 
                                     HEADER_FOOTER_SIZE - 
                                     (CHART_BORDER_WIDTH * 2)];
                this.set('chartAreaSize', chartAreaSize);

                var chartSize = [chartAreaSize[0] - (chartMargin.left + chartMargin.right),
                                 chartAreaSize[1] - (chartMargin.top + chartMargin.bottom)];
                this.set('chartSize', chartSize);
                
                var xDomain = this.get('xDomain');
                var xRange = this.get('xRange');
                var xDomainClip = this.get('xDomainClip');

                if (!xDomainClip) {
                    // The initial setup of X range has INITIAL_CLIP_WIDTH_MS milliseconds
                    // of data showing across the chart, from the beginning. We'll do an
                    // initial translation, if desired, later.
                    xRange = [0, ((xDomain[1] - xDomain[0]) / INITIAL_CLIP_WIDTH_MS) * chartSize[0]];
                    this.set('xRange', xRange);

                    xDomainClip = [xDomain[0], xDomain[0] + INITIAL_CLIP_WIDTH_MS];  
                    this.set('xDomainClip', xDomainClip);
                } else {
                    // Presumably the chart is being resized. We want to keep the same
                    // clipping region by time, and the xDomain hasn't changed, so we
                    // need to recompute the xRange.
                    xRange = [0, ((xDomain[1] - xDomain[0]) / 
                                  (xDomainClip[1] - xDomainClip[0])) * chartSize[0]];
                    this.set('xRange', xRange);
                }

                // The Y range is also calculable here, so we'll do that, too.
                this.set('yRange', [0, -chartSize[1]]);
            },

            /**
             * Render the view. 
             * 
             * This is to be called ONLY ONCE, at initial display! After that,
             * we'll just replace data as appropriate. Also, 
             *
             * Because we need to have actual widths for things in order to 
             * create the various X-axis artifacts, we need to wait to create
             * the charts until we get here--we cannot do it in initializer().
             */
            render: function() {
                var container = this.get('container');
                var dataDiv = container.one('#dashboardData');

                removeAllChildren(dataDiv);

                createDIV(dataDiv, 'dashboardCharts');
                createDIV(dataDiv, 'dashboardLegendDiv');
                
                // Since showViewCallback will be called and require that we
                // re-render overall info and the legend, don't do that here.

                return this;
            },

            /**
             * Setup any stuff we want in the toolbar.
             */
            setupToolbar: function() {
                this.clearToolbar();
                this.setupToolbarButtons();
                this.setupAddChartSelector();
            },

            clearToolbar: function() {
                var toolbar = this.get('toolbar');
                removeAllChildren(toolbar);
            },

            /**
             * Set up the buttons the user can click to do something.
             * These are simpler than the 'Add Chart' and 'Show Only Gateway'
             * selectors, which are done in other routines.
             */
            setupToolbarButtons: function() {
                var toolbar = this.get('toolbar');

                var scrollingButton = createBUTTON(toolbar, SCROLLING_LABEL, 'toolbarButton')
                    .set('id', 'scrollingButton');
                this.set('scrollingButton', scrollingButton);

                scrollingButton.on('click', this.handleToggleScrolling, this);

                this.adjustScrollingButton();

                var showDefaultChartsButton = 
                    createBUTTON(toolbar, DEFAULT_CHARTS_LABEL, 'toolbarButton')
                    .set('id', 'showDefaultChartsButton');

                showDefaultChartsButton.on('click', this.handleShowDefaultCharts, this);
            },

            /**
             * Adjust the background image to reflect the scrolling state on the scrolling button.
             */
            adjustScrollingButton: function() {
                var scrollingButton = this.get('scrollingButton');

                if (this.get('scrolling')) {
                    scrollingButton.removeClass('paused');
                    if (!scrollingButton.hasClass('scrolling')) {
                        scrollingButton.addClass('scrolling');
                    }
                } else {
                    scrollingButton.removeClass('scrolling');
                    if (!scrollingButton.hasClass('paused')) {
                        scrollingButton.addClass('paused');
                    }
                }
            },


            setupAddChartSelector: function() {
                var toolbar = this.get('toolbar');
                
                var addChartSelectorDiv = toolbar.one('.dashboardAddChartSelectorDiv');

                var addChartSelector;

                if (!addChartSelectorDiv) {
                    addChartSelectorDiv = createDIV(toolbar, 'dashboardAddChartSelectorDiv');
                    var span = createSPAN(addChartSelectorDiv, 'Add Chart:');
                    var selectorSpan = createSPAN(addChartSelectorDiv, '');
                    selectorSpan.addClass('dashboardAddChartSelectorSpan');
                    addChartSelector = createSELECT(selectorSpan, 'toolbarSelect');
                    addChartSelector.on('change', this.handleAddChart, this);
                } else {
                    addChartSelector = addChartSelectorDiv.one('select');
                }

                addChartSelector.get('childNodes').remove();

                // Create the selector to let the user add charts to the display
                var app = this.get('app');
                var chartMetadata = app.getCharts();

                var option = createOPTION(addChartSelector, null, "Select chart...", '');
                for (var prop in chartMetadata) {
                    if (chartMetadata.hasOwnProperty(prop)) {
                        var chartData = chartMetadata[prop];
                        var option = createOPTION(addChartSelector, null, chartData[0], prop);
                    }
                }
            },

            /**
             * Render some overall information about the cluster/gateway, like 
             * the product and license, #working and quarantined, etc.
             * This shows up above the charts.
             *
             * We only do the rendering if we're the active view, because
             * we'll do it again in showViewCallback when we come onscreen.
             */
            renderOverallInfo: function() {
                var clusterModel = this.get('model');
                var dataDiv = this.get('container').one('#dashboardData');

                var overallDiv = dataDiv.one('#dashboardOverall');
                if (!overallDiv) {
                    overallDiv = createDIV(dataDiv)
                        .set('id', 'dashboardOverall');
                }

                removeAllChildren(overallDiv);
                
                var numRunning = clusterModel.get('numRunning');

                var div = createDIV(overallDiv, 'title');

                if (this.isCluster()) {
                    var numQuarantined = clusterModel.get('numQuarantined');
                    var numRunning = clusterModel.get('numRunning');
                    var total = numQuarantined + numRunning;

                    div.set('text', CONNECTED_CLUSTER_LABEL);

                    div = createDIV(overallDiv, 'label')
                        .set('text', "Members: ");

                    div = createDIV(overallDiv, 'value')
                        .set('text', total);

                    div = createDIV(overallDiv, 'label')
                        .set('text', "Quarantined: ");

                    div = createDIV(overallDiv, 'value')
                        .set('text', numQuarantined);

                    div = createDIV(overallDiv, 'label')
                        .set('text', "Running: ");

                    div = createDIV(overallDiv, 'value')
                        .set('text', numRunning);
//                } else if (numRunning === 0) {
//                    div.set('text', 'Not connected to any gateway');
                } else {
                    div.set('text', CONNECTED_SINGLE_LABEL);
                }
            },

            /**
             * Render the legend. The overall idea is that for a chart, the set of
             * lines in the chart reflect the gateway instances (diff instanceKey values),
             * while the legend and its 'show/hide gateway' functionality reflect the 
             * set of connectionUrls. 
             *
             * Gateways that are unmanaged (no connectionUrl) ARE NOT considered.
             * Gateway instances that are disconnected/stopped ARE considered, though we also
             * need to indicate visually if the latest instance for a connection URL (the one
             * that is not stopped, or if all are, the one with the latest stopTime) is connected
             * or not.
             *
             * Later (pre-4.0-final?) we may want to allow a gateway config setting or template
             * function to allow customers to configure the format of the legend labels, though
             * they will (at least for now) still correspond to the connection URL.
             */
            renderLegend: function() {
                var $this = this;

                var container = this.get('container');
                var legendDiv = container.one('.dashboardLegendDiv');
                removeAllChildren(legendDiv);

                var label = createDIV(legendDiv, 'dashboardLegendLabel')
                    .set('text', 'Legend');

                var instructions = createDIV(legendDiv, 'dashboardLegendInstructions');

                var clusterModel = this.get('model');

                if (clusterModel.get('isCluster')) {
                    instructions.set('text', 
                                     "Click on a cluster member below to show or hide that " +
                                     "member's data in all charts");
                } else {
                    instructions.set('text', 
                                     "Click on the gateway below to show or hide its " +
                                     "data in all charts");
                }

                var selectCheckbox = 
                    this.createImageCheckbox(legendDiv, 
                                             null,
                                             'dashboardLegendSelectAll',
                                             'Select All',
                                             function(ev) {
                                                 // get the real checkbox input object
                                                 var checkbox = ev._currentTarget;
                                                 $this.handleShowGatewaySelectAll(checkbox);
                                             });

                // set the checkbox state to the current value of showGatewayList
                var showGatewayList = this.get('showGatewayList');

                if (!showGatewayList) {
                    this.updateImageCheckbox(selectCheckbox, CB_SHOW_ALL_STATE);
                } else if (showGatewayList.length == 0) {
                    this.updateImageCheckbox(selectCheckbox, CB_SHOW_NONE_STATE);
                } else {
                    this.updateImageCheckbox(selectCheckbox, CB_SHOW_SOME_STATE);
                }
                

                var clusterModel = this.get('model');
                var gateways = clusterModel.getSortedGateways();

                if (gateways) {
                    // Take the first of each connection URL and show an entry for that.
                    var currUrl = null;

                    for (var i = 0; i < gateways.length; i++) {
                        var gatewayModel = gateways[i];

                        var url = gatewayModel.get('connectionUrl');
                        if (!url) {
                            break; // we're into unmanaged gateways that we don't show
                        } 

                        if (url !== currUrl) {
                            var label = gatewayModel.get('gatewayLabel');  // XXX whatever we decide for this

                            var isShowGateway = this.isShowGateway(url);

                            var color = this.getColor(gatewayModel.get('connectionUrl'));

                            var gatewayCheckbox = 
                                this.createImageCheckbox(legendDiv, 
                                                         null,
                                                         'dashboardLegendGateway',
                                                         label,
                                                         (function(url) {
                                                             return function(ev) {
                                                                 var checkbox = ev._currentTarget;
                                                                 $this.handleShowGatewaySelect(checkbox, url);
                                                             };
                                                         })(url));
                                                            
                            gatewayCheckbox.setStyle('color', color.toString());

                            this.updateImageCheckbox(gatewayCheckbox, (isShowGateway 
                                                                       ? CB_SHOW_ALL_STATE 
                                                                       : CB_SHOW_NONE_STATE));

                            currUrl = url;
                        }
                    }
                }
            },

            /**
             * Create a checkbox shown with an image instead of the real input, by
             * putting 2 images (background + dash or check or nothing) and text 
             * into the checkbox label.
             */
            createImageCheckbox: function(parentDiv, divId, styleClass, label, clickFn) {
                var div = createDIV(parentDiv, 'dashboardCheckbox');

                if (divId) {
                    div.set('id', divId);
                }

                if (styleClass) {
                    div.addClass(styleClass);
                }

                var selectLabel = createLABEL(div);

                createSPAN(selectLabel,  label);

                var checkbox = createINPUT(selectLabel, 'checkbox');

                checkbox.on('click', clickFn, this);

                return div;
            },

            /**
             * Update the state of an image checkbox (to 1, 0 or -1  // indeterminate)
             */
            updateImageCheckbox: function(imageCheckbox, state) {
                var label = imageCheckbox.get('children').item(0); 
                var input = label.one('input');

                label.removeClass('none');
                label.removeClass('all');
                label.removeClass('some');


                setCheckboxState(input._node, state);

                if (state === 0) {
                    label.addClass('none');
                } else if (state === 1) {
                    label.addClass('all');
                } else {
                    label.addClass('some');
                }
            },

            /**
             * Handle the user clicking/toggling the select box for a particular connection URL
             * (implies that the view is on-screen).
             */
            handleShowGatewaySelect: function(checkboxInput, connectionUrl) {
                var clusterModel = this.get('model');

                // Fix the current checkbox display.
                var checkbox = Y.one(checkboxInput.parentNode.parentNode);  // the <div> tag
                this.updateImageCheckbox(checkbox, checkboxState(checkboxInput));

                var selectAllCheckbox = this.get('container').one('.dashboardLegendSelectAll');

                var showGatewayList = this.get('showGatewayList');  // null/empty, or a list of N>0 conn URLs

                var gateways = clusterModel.getGateways();

                if (this.isShowGateway(connectionUrl)) {
                    // instances with connectionUrl are being shown, stop that URL only.
                    if (!showGatewayList) {
                        // Gather all URLs except the one being removed.
                        showGatewayList = [];
                        for (var i = 0; i < gateways.length; i++) {
                            var connUrl = gateways[i].get('connectionUrl');
                            if (connUrl && showGatewayList.indexOf(connUrl) < 0 && connUrl !== connectionUrl) {
                                showGatewayList.push(connUrl);
                            }
                        }
                    } else {
                        // we have a non-empty list, so just remove the connectionUrl entry
                        showGatewayList.splice(showGatewayList.indexOf(connectionUrl), 1);
                    }

                    this.updateImageCheckbox(selectAllCheckbox, 
                                             (showGatewayList.length == 0 ? 0 : -1));
                } else {
                    // we're not showing the connectionUrl (so showGatewayList cannot be null), but must 
                    // be showing others since showGatewayList exists.
                    showGatewayList.push(connectionUrl);

                    // decide if we're now showing every instance
                    var missing = false;
                    for (var i = 0; i < gateways.length; i++) {
                        var gatewayModel = gateways[i];
                        if (showGatewayList.indexOf(gatewayModel.get('connectionUrl')) < 0) {
                            missing = true;
                            break;
                        }
                    }

                    if (!missing) {
                        showGatewayList = null; // 'all'
                    }

                    this.updateImageCheckbox(selectAllCheckbox, 
                                             (!showGatewayList ? 1 : -1));
                }

                this.set('showGatewayList', showGatewayList);
                this.fire(this.SHOW_GATEWAY_CHANGE_EVENT, {});
            },

            /**
             * Handle the user clicking on the 'select' box in the legend.
             * The assumption is that we're on-screen when this occurs.
             * The input checkbox is the actual HTML checkbox input, NOT the wrapper
             * div that allows us to graphically style it. 
             */
            handleShowGatewaySelectAll: function(checkboxInput) {
                var $this = this;

                var state = checkboxState(checkboxInput);

                this.set('showGatewayList', (state == 0 ? [] : null)); // all on or all off

                // Because we're forcing between on and off, it's possible
                // that the drawing above toggled to 'intermediate'. Force
                // it back to what we had at start.
                var container = this.get('container');
                var legendDiv = container.one('.dashboardLegendDiv');
                var checkboxes = legendDiv.all('.dashboardCheckbox');
                checkboxes.each(function(imageCheckbox) {
                    $this.updateImageCheckbox(imageCheckbox, state);
                });

                this.fire(this.SHOW_GATEWAY_CHANGE_EVENT, {});
            },

            /**
             * Handle the user requesting to show the default set of charts.
             * Because we only start history-gathering in the charts when they're
             * created, we need to keep around any charts that we've already got.
             * (Do we have to keep around charts we've already seen but dumped?)
             * It's assumed that the view is onscreen, and that the draw loop
             * may or may not be operating.
             */
            handleShowDefaultCharts: function() {
                // delete existing charts. We don't call handleDeleteChart
                // individually because that keeps resizing the remaining ones.
                var charts = this.get('charts');
                if (charts) {
                    for (var i = 0; i < charts.length; i++) {
                        charts[i].destroy({remove:true});
                    }

                    this.set('charts', null);
                }

                this.removeChartList();  // so we will pick up the default list on setup.
                this.render();           // clean out all existing charts and data
                this.doDisplaySetup();
            },

            /**
             * Handle the user requesting to add a chart.
             */
            handleAddChart: function(ev) {
                var addChartSelector = ev.target;
                var chartKey = addChartSelector.get('value');

                // Go back to the 'Add Chart...' entry
                addChartSelector.set('selectedIndex', 0);

                var chartMetadata = this.getChartMetadata(chartKey);
                if (chartMetadata) {
                    // Create the new chart instance.
                    var charts = this.get('charts');

                    // if we start running with the chart list = "", we won't set anything
                    // up until we hit here.
                    if (!charts) {
                        charts = [];
                    }

                    var numCharts = charts.length + 1;  // the 1 is for the new chart

                    this.adjustChartSizes(numCharts);
                    
                    var chart = this.instantiateChart(this.getChartsDiv(),
                                                      chartMetadata,
                                                      false);

                    charts.push(chart);
                    this.set('charts', charts);  // not necessary unless we want to handle an event

                    this.fire(this.ADD_CHART_EVENT, {chart: chart});

                    this.computeAndStoreChartList();
                }
            },

            /**
             * Called from the 'close box' on each chart, delete the chart
             * from the array of charts and destroy it. Because, when a chart
             * is maximized, we can only delete that chart, the result is that
             * all charts remaining are visible.
             */
            handleDeleteChart: function(chart) {
                // remove the chart from the charts list
                var charts = this.get('charts');

                var index = charts.indexOf(chart);
                if (index >= 0) {
                    charts.splice(index, 1);
                }
                
                chart.destroy({remove:true});

                var numCharts = charts.length;
                
                this.adjustChartSizes(numCharts);
                    
                this.fire(this.DELETE_CHART_EVENT);

                this.computeAndStoreChartList();
            },

            /**
             * Called from the 'toggleChartSize' box on each chart.
             * Just flip the maximized state and let draw()
             * deal with resizing everything and changing hidden
             * and unhidden.
             */
            handleToggleChartSize: function(chart) {
                var charts = this.get('charts');

                if (chart.isMaximized()) {
                    this.adjustChartSizes(charts.length);
                    this.fire(this.TOGGLE_CHART_SIZE_EVENT, {maximizedChart: null});
                } else {
                    this.adjustChartSizes(1);
                    this.fire(this.TOGGLE_CHART_SIZE_EVENT, {maximizedChart: chart});
                }


                // Store the chart list because it also keeps track of maximized state
                this.computeAndStoreChartList();
            },

            /**
             * Handle after the scrolling state changes.
             * This implies we're onscreen.
             */
            afterScrollingChange: function() {
                this.adjustScrollingButton();
                
                if (this.get('scrolling')) {
                    var lastTime = Date.now() - TIME_OFFSET_MS;
                    var lastClipTime = this.get('xDomainClip')[1];
                    this.startDisplayTimeLoop(); 
                    this.translateByTime(lastTime - lastClipTime);
                } else {
                    this.cancelDisplayTimeLoop();
                }
            },

            /**
             * Handle the user pausing scrolling or restarting scrolling (and resetting
             * scale and position).
             */
            handleToggleScrolling: function() {
                var scrolling = this.get('scrolling');

                if (!scrolling) {
                    // reset everything, since we're resuming scrolling.
                    var lastDisplayableTime = this.get('lastDisplayableTime');
                    var xDomainClip = this.get('xDomainClip');
                    var newXDomainClip = [lastDisplayableTime - INITIAL_CLIP_WIDTH_MS,
                                          lastDisplayableTime];
                    this.set('xDomainClip', newXDomainClip); 

                    // since we're forcing the scale back to 1, we also need to change
                    // the xRange
                    var chartSize = this.get('chartSize');
                    var xDomain = this.get('xDomain');
                    var xRange = [0, ((xDomain[1] - xDomain[0]) / INITIAL_CLIP_WIDTH_MS) * chartSize[0]];
                    this.set('xRange', xRange);

                    this.fire(this.BOUNDS_CHANGE_EVENT,
                              {type: 'translate', 
                               oldXDomainClip: xDomainClip,
                               newXDomainClip: newXDomainClip});
                }

                this.set('scrolling', !scrolling);
            },

            /**
             * Instantiate a single chart. 
             *
             * DO NOT call this before showViewCallback, as the containing view 
             * won't have an actual size yet (because it isn't shown).
             * 
             * The chart is responsible for getting itself set up, but NOT
             * for calling 'draw' to draw line data.
             * 'chartData' consists of [chartTitle, chartClass].
             */
            instantiateChart: function(containingDiv, chartMetadata, maximized) {
                var chartContainerSize = this.get('chartContainerSize');

                var div = createDIV(containingDiv, 'dashboardChart')
                    .setStyle('width', chartContainerSize[0] + '%')
                    .setStyle('height', chartContainerSize[1] + '%');

                var chartTitle = chartMetadata[0];
                var chartClass = chartMetadata[1];

                // provide a unique ID for each chart, so we can append it
                // to internal IDs to keep the DOM from getting confused.
                var chart = new chartClass({model: this.get('model'),
                                            dashboard: this,
                                            container: div,
                                            chartId: CHART_CTR++,
                                            title: chartTitle,
                                            maximized: maximized
                                          });
                return chart;
            },

            /**
             * Return the maximized chart, if any, else null.
             */
            getMaximizedChart: function() {
                var charts = this.get('charts');

                if (charts) {
                    for (var i = 0; i < charts.length; i++) {
                        var chart = charts[i];
                        if (chart.isMaximized()) {
                            return chart;
                        }
                    }
                }

                return null;
            },

            /**
             * Indicate if the given connection URL is to be shown. We use the connection URL
             * to be shown. If the list is null/empty, all gateways are shown.
             * The list is a list of connection URLs.
             */
            isShowGateway: function(connectionUrl) {
                var showGatewayList = this.get('showGatewayList');
                return (!showGatewayList || showGatewayList.indexOf(connectionUrl) >= 0);
            },

            /**
             * Start the timer that will update the 'lastDisplayableTime' repeatedly.
             * This is to run when (a) we haven't paused drawing, and (b) we're onscreen.
             */
            startDisplayTimeLoop: function() {
                var $this = this;

                // just in case, cancel any previous timer
                this.cancelDisplayTimeLoop();
                
                var fn = function() {
                    $this.updateLastDisplayableTime();
                }

                // we really want the first update to happen immediately, without giving
                // up the execution thread, so...
                fn();

                var displayLoopTimer = invokeLater(fn, DRAW_INTERVAL, DRAW_INTERVAL);

                this.set('displayLoopTimer', displayLoopTimer);
            },

            cancelDisplayTimeLoop: function() {
                var displayLoopTimer = this.get('displayLoopTimer');

                if (displayLoopTimer) {
                    clearInterval(displayLoopTimer);
                    this.set('displayLoopTimer', null);
                }
            },

            /**
             * Compute the chart names from current charts and store that.
             */
            computeAndStoreChartList: function() {
                var charts = this.get('charts');

                if (!charts) {
                    this.removeChartList();  // no chart list
                } else {
                    var chartList = (charts.length == 0 
                                     ? "" 
                                     : charts.map(function(chart) {
                                         var name = chart.name;
                                         return (chart.isMaximized() ? name + '+' : name);
                                     }).join(','));
                    this.storeChartList(chartList);
                }
            },

            /**
             * Store the list of chart names in local storage
             */
            storeChartList: function(chartList) {
                localStorage.setItem(CHART_LIST_ITEM_NAME, chartList);
            },

            /**
             * Return the chart list. If null, it means we have not defined
             * a list of charts at all. If empty (""), it means we have 
             * specifically deleted all the charts.
             */
            getChartList: function() {
                var chartList = localStorage.getItem(CHART_LIST_ITEM_NAME);
                if (chartList == '') {
                    return '';
                } else if (!chartList) {
                    return null;
                } else {
                    return chartList.split(',');
                }
            },

            /**
             * Given a chart's ID/key, return the metadata for the chart.
             */
            getChartMetadata: function(chartKey) {
                var metadata = this.get('app').getChart(chartKey);
                return metadata;
            },

            getDefaultChartList: function() {
                var chartList = this.get('app').DEFAULT_CHART_LIST;
                return chartList;
            },

            removeChartList: function() {
                localStorage.removeItem(CHART_LIST_ITEM_NAME);
            },

            getChartsDiv: function() {
                var chartsDiv = this.get('container').one('.dashboardCharts');
                return chartsDiv;
            },

            /**
             * Return a color for the particular gateway, or assign a new one
             * if it has not already gotten one. These are organized by connectionUrl
             * (so multiple gateway instances of the same one over time will have
             * the same color). We don't show instances w/o URLs
             */
            getColor: function(connectionUrl) {
                var gatewayColors = this.get('gatewayColors');
                var val = gatewayColors(connectionUrl);
                return val;
            },

            /**
             * Routine called primarily by the loop timer to update the last displayable
             * time. We also call this once at the beginning just to make sure we actually
             * have a value.
             */
            updateLastDisplayableTime: function() {
                this.set('lastDisplayableTime', Date.now() - TIME_OFFSET_MS);
            },

            /**
             * Translate the clipping domain by an amount of time (in MS). Charts listen
             * for the BOUNDS_CHANGE_EVENT and respond appropriately.
             * This routine, since it's the only one that's panning, also handles
             * checking that we don't go past the last displayable time.
             */
            translateByTime: function(timeDelta) {
                var xDomainClip = this.get('xDomainClip');
                var lastDisplayableTime = this.get('lastDisplayableTime');
                
                if (xDomainClip[1] + timeDelta > lastDisplayableTime) {
                    timeDelta = lastDisplayableTime - xDomainClip[1];
                }
                
                if (timeDelta !== 0) {
                    var newXDomainClip = [xDomainClip[0] + timeDelta, xDomainClip[1] + timeDelta];
                    this.set('xDomainClip', newXDomainClip);
                    this.fire(this.BOUNDS_CHANGE_EVENT,
                              {type: 'translate', 
                               oldXDomainClip: xDomainClip,
                               newXDomainClip: newXDomainClip});
                }
            },

            /**
             * Translate the current X position by a number of pixels.
             * The incoming X is relative to the direction you want TIME to move
             * relative to your viewpoint, i.e., a positive value moves forward in time 
             * (i.e., the chart data moves to the LEFT). Negative values move back in time 
             * (i.e., the chart data moves to the RIGHT). 
             */
            translateByPixels: function(pixelDeltaX) {
                var xDomain = this.get('xDomain');
                var xRange = this.get('xRange');

                var x0 = invertX(0, xDomain, xRange);
                var x1 = invertX(pixelDeltaX, xDomain, xRange);
                this.translateByTime(x1 - x0);
            },

            /**
             * Handle a mouse-wheel event from one of the charts.
             */
            scale: function(wheelDelta) {
                var xDomain = this.get('xDomain');
                var xRange = this.get('xRange');
                var xDomainClip = this.get('xDomainClip');

                var scaleFactor = (wheelDelta > 0 ? SCALE_FACTOR : 1/SCALE_FACTOR);

                var newXRange = [xRange[0] * scaleFactor, xRange[1] * scaleFactor];

                var oldClipSize = xDomainClip[1] - xDomainClip[0];
                var newClipSize = oldClipSize/scaleFactor; // >1 scale factor is zooming in
                var newXDomainClip = [xDomainClip[0] + oldClipSize/2 - newClipSize/2,
                                      xDomainClip[1] - oldClipSize/2 + newClipSize/2];

                // If the user is zooming out, prevent them from going past the
                // xRange limit (they aren't allowed to see past lastDisplayableTime).
                var lastDisplayableTime = this.get('lastDisplayableTime');

                if (newXDomainClip[1] > lastDisplayableTime) {
                    newXDomainClip[0] -= (newXDomainClip[1] - lastDisplayableTime);
                    newXDomainClip[1] = lastDisplayableTime; 
                }
                
                this.set('xRange', newXRange);
                this.set('xDomainClip', newXDomainClip);

                this.fire(this.BOUNDS_CHANGE_EVENT,
                          {type: 'scale', 
                           scaleFactor: scaleFactor,
                           oldXRange: xRange,
                           newXRange: newXRange,
                           oldXDomainClip: xDomainClip,
                           newXDomainClip: newXDomainClip});
            },

            /**
             * Function called repeatedly to automatically extend the X domain as time
             * passes, so the data values we get for the charts are always within the
             * X domain extent. We want to extend the X domain without actually changing
             * the display at all, meaning that we need to fiddle with various stuff.
             */
            extendX: function() {
                var xDomain = this.get('xDomain');
                var xRange = this.get('xRange');

                // if original X domain is [T0,T1] and with the new addition it
                // becomes [T0,T2], the multiplier is (T2-T0)/(T1-T0). Multiply
                // xRange [X0,X1] by that to get a new xRange.
                var t0 = xDomain[0];
                var t1 = xDomain[1];
                var t2 = xDomain[1] + MAX_ADJUST_INTERVAL;
                var multiplier = (t2 - t0)/(t1 - t0);

                var x0 = xRange[0];
                var x1 = xRange[1];
                var newX1 = (x1 - x0) * multiplier + x0;

                xDomain[1] = t2;
                this.set('xDomain', xDomain);

                xRange[1] = newX1;
                this.set('xRange', xRange);
            },

            /**
             * Is a given time value (in MS) in range of the xDomainClip min/max?
             */
            isTimeVisible: function(timeMS) {
                var xDomainClip = this.get('xDomainClip');
                return (timeMS >= xDomainClip[0] && timeMS <= xDomainClip[1]);
            },

            /**
             * Called from the charts when panning starts. Stop auto-scrolling if
             * we were doing so.
             */
            startPanningOrZooming: function() {
                this.set('scrolling', false);
            },

            /**
             * Called from the charts when panning stops. Check where we are and
             * resume scrolling if we're close enough.
             */
            endPanningOrZooming: function() {
                var lastDisplayableTime = this.get('lastDisplayableTime');
                var xDomainClip = this.get('xDomainClip');
                
                // if we're "close enough" (say 2 seconds) as we release the
                // mouse, resume scrolling.
                if (Math.abs(lastDisplayableTime - xDomainClip[1]) < 2000) {
                    this.set('scrolling', true);
                }
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#dashboardViewContainer');
                    }
                },

                toolbar: {
                    value: null
                },

                title: {
                    value: 'Dashboard'
                },

                chartMargin: {
                    value: {top: 10, right: 20, bottom: 25, left: 45}
                },

                /**
                 * Is the browser supposed to be scrolling to the right as time
                 * passes? Generally this will be true, unless the user manually
                 * pans around, at which point this may or may not be turned off.
                 * If it is turned off, once they sync to 'current time' again
                 * this will be set to true again. This is useful when the system
                 * for some reason has to pause for more than a second and so would
                 * normally lose the scrolling because it isn't within 1 second
                 * of the last displayable time anymore.
                 */
                scrolling: {
                    value: true
                },

                /**
                 * The percentage size of each chart's container (e.g. [100, 100].
                 * The charts can add a '%' to this and set it on their container
                 * when things resize.
                 */
                chartContainerSize: {
                    value: null
                },

                /**
                 * The size of the 'chartArea' DIV inside a 'dashboardChart' DIV.
                 * We compute this here, and use it for each chart (the canvas part of
                 * each chart is the same size.
                 */
                chartAreaSize: {
                    value: null
                },

                /**
                 * The computed size of the 'data' area of each chart, the area between the axes. 
                 */
                chartSize: {
                    value: null
                },

                // The array of chart views.
                // null until we initially instantiate some charts.
                charts: {
                    value: null
                },

                /**
                 * To support the user choosing to show a limited set of gateway instances,
                 * this field (set by the user choosing in the legend indicates the *connectionUrls*
                 * to be shown (each may correspond to one or more gateway instances, if a 
                 * given gateway went up/down at least once).
                 * 
                 * If empty, it means "show no gateways". Otherwise, show only those
                 * gateways that are in the list.
                 */
                showGatewayList: {
                    value: null
                },

                // The SUGGESTED number of ticks to show on the X axis in the
                // displayed area. The value is adjusted up or down based on
                // whether there is enough space. See dashboard_chart.
                xTicks: {
                    value: 12
                },

                // The timer that we create to update the maxChartTime.
                maxChartTimeTimerId: {
                    value: null
                },

                // The range of times to encompass our chart data, that we'll use to
                // compute the X axis display values. The minimum value is not expected
                // to change, and will equal the time the gateway started, possibly
                // plus or minus some constant so we show some data at the start. The max value
                // is generally a while ahead of 'now' (e.g. 5 minutes) and is extended
                // before 'now' reaches the time, so we know that the domain always 
                // includes all the data.
                // Charts will almost certainly be listening for changes to this.
                xDomain: {
                    value: null
                },

                // The time range to display on all the charts (somewhere between 
                // the min and max xDomain values). 
                // Charts will definitely be listening for changes to this value.
                xDomainClip: {
                    value: null
                },

                /**
                 * The range of X pixel coordinates for our charts. The minimum value
                 * will always be 0, as we're just adjusting the maximum value as time 
                 * passes. The 0 point corresponds to the minimum domain time. This 
                 * is the OVERALL X range, not the current clipping region.
                 * Charts will almost certainly be listening for changes to this.
                 */
                xRange: {
                    value: null
                },

                /**
                 * The range of Y pixel coordinates for our charts. We define the 
                 * minimum as 0, and only adjust the maximum value as the window is
                 * resized. 
                 * Charts will almost certainly be listening for changes to this.
                 */
                yRange: {
                    value: null
                },

                /**
                 * The last valid time (Unix epoch MS) that the user should be 
                 * allowed to see, generally TIME_OFFSET_MS behind the 'now' time
                 * the last time this was updated.
                 */
                lastDisplayableTime: {
                    value: null
                },

                /**
                 * The 'display loop' timer. We use this to update the latest displayable
                 * time, then check that to see if we should update the xDomainClip.
                 */
                displayLoopTimer: {
                    value: null
                },

                firstTime: {
                    value: true
                },

                // A fixed set of colors we can use to color the lines for
                // different gateways.
                gatewayColors: {
                    valueFn: function() {
                        var choices = ['#F47D31', '#3A6F8F', '#FF0000', '#48FF48', '#0000FF', 
                                       '#OOFFFF', '#7FFFD4', '#FF7F50', '#006400', '#DAA520',
                                       '#CD5C5C', '#90EE90', '#3CB371', '#DDA0DD', '#4169E1'];
                        var lastUsed = -1;
                        var choiceMap = {};

                        return function(dataItem) {
                            var val = choiceMap[dataItem];
                            if (val) {
                                return val;
                            }

                            val = choices[++lastUsed];
                            choiceMap[dataItem] = val;
                            return val;
                        };
                    }
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'cluster-model', 'gateway-model', 'dashboard-chart']
});
