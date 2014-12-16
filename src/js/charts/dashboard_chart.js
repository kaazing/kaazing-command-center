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
 * A single chart to be shown on the Command Center Dashboard. It will get a number
 * of its working values from its parent DashboardView, so that it stays in
 * sync with various other charts also being displayed on the Dashboard at
 * the same time.
 * 
 * All Dashboard charts assume that their min and max date range (X data) 
 * is defined by DashboardView,
 * so that all the charts show the same time range.
 *
 * @module dashboard-chart
 */
YUI.add('dashboard-chart', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'dashboardChart',
    IS_FIREFOX = false,  // are we using Firefox browser?
    PT_OFFSET = 0.5,
    MIN_TICK_SEPARATION = 18,
    MAX_TICK_SEPARATION = 200,

    EXPAND_IMG_URL = '../images/expand.png',
    CONTRACT_IMG_URL = '../images/expand.png',
    CLOSE_IMG_URL = '../images/close.png',

    // data and functions for computing with the various chart value types
    VALUE_TYPE_DATA = {'number': 
                       {initDomain: [0, 10],
                        maxVals: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
                        minVals: [0, -1, -5, -10, -25, -50, -100, -250, -500, -1000],
                        valMultiplierSize: 1000,
                        unitsFn: numberUnits},
                       'percentage': 
                       {initDomain: [0, 100],
                        maxVals: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
                        minVals: [0, -1, -5, -10, -25, -50, -100, -250, -500, -1000],
                        valMultiplierSize: 1000,
                        unitsFn: numberUnits},
                       'bytes': 
                       {initDomain: [0, 1024],
                        maxVals: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
                        minVals: [0, -1, -5, -10, -25, -50, -100, -250, -500, -1000],
                        valMultiplierSize: 1024,
                        unitsFn: byteUnits},
                       'byteRate': 
                       {initDomain: [0, 1024],
                        maxVals: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
                        minVals: [0, -1, -5, -10, -25, -50, -100, -250, -500, -1000],
                        valMultiplierSize: 1024,
                        unitsFn: byteRateUnits},
                       'numberRate': 
                       {initDomain: [0, 10],
                        maxVals: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
                        minVals: [0, -1, -5, -10, -25, -50, -100, -250, -500, -1000],
                        valMultiplierSize: 1000,
                        unitsFn: numberRateUnits},
                       'other': 
                       {initDomain: [0, 1],
                        maxVals: [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000],
                        minVals: [0, -1, -5, -10, -25, -50, -100, -250, -500, -1000],
                        valMultiplierSize: 1000,
                        unitsFn: numberUnits},
                      };

    /**
     * The View for a single chart on the Dashboard. 
     *
     * @class DashboardChart
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.DashboardChart = Y.Base.create(
        NAME, 
        Y.KaazingView, 
        [], 
        {
            initializer: function() {
                var $this = this;

                IS_FIREFOX = (BrowserDetect.browser === 'Firefox');

                //
                // Configure the chart in the containing view. It won't have its correct
                // data yet, but its size is calculable. 
                // Note that the 'container' object here is the DIV of class 'dashboardChart'
                // inside the .dashboardCharts div. To allow us to have border spacing while
                // still allowing fixed-size calculations, we're going to put another DIV
                // inside the container, of class 'dashboardChartContent'.
                var container = this.get('container');

                var chartContent = createDIV(container, 'dashboardChartContent');
                this.set('chartContent', chartContent);

                this.setupChart(chartContent);
                this.setupTitle(chartContent);
                this.adjustTitle();  // show initial value
                this.setupSummary(chartContent);
                this.adjustSummary(); // show initial value
                this.setupDrag(container);  // drag the entire .dashboardChart, not just content

                // listen for various attribute changes in the dashboard (e.g., the
                // xDomainClip to know what region we're supposed to display.)
                var dashboard = this.get('dashboard');

                this.addSubscription(dashboard.on(Y.DashboardView.prototype.MODEL_CHANGE_EVENT, 
                                                  this.onModelChange,
                                                  $this));

                this.addSubscription(dashboard.on(Y.DashboardView.prototype.BOUNDS_CHANGE_EVENT, 
                                                  this.onBoundsChange,
                                                  $this));

                this.addSubscription(dashboard.on(Y.DashboardView.prototype.ADD_CHART_EVENT, 
                                                  this.onAddChart,
                                                  $this));

                this.addSubscription(dashboard.on(Y.DashboardView.prototype.DELETE_CHART_EVENT, 
                                                  this.onDeleteChart,
                                                  $this));
                this.addSubscription(dashboard.on(Y.DashboardView.prototype.RESIZE_EVENT, 
                                                  this.onResize,
                                                  $this));

                this.addSubscription(dashboard.on(Y.DashboardView.prototype.TOGGLE_CHART_SIZE_EVENT, 
                                                  this.onToggleChartSize,
                                                  $this));

                this.addSubscription(dashboard.on(Y.DashboardView.prototype.SHOW_GATEWAY_CHANGE_EVENT, 
                                                  this.onShowGatewayChange,
                                                  $this));

                // NOTE: the individual charts are responsible for setting
                // up their own event listeners for changes to data, since
                // we may not always be listening for add/removeGateway.
            },

            /**
             * Handle changing the cluster model at the view.
             */
            onModelChange: function(ev) {
                this.drawChart();
            },

            afterConnectionUrlChange: function(ev) {
            },
            
            /**
             * Handle a change in chart bounds (e.g., clipping region or scale).
             */
            onBoundsChange: function(ev) {
                this.drawChart();
            },
            
            /**
             * Handle when the user adds a chart. When they do, everybody gets
             * back to visible and normal size.
             */
            onAddChart: function(ev) {
                this.unmaximize();
                this.drawChart();
            },

            /**
             * Handle the user deleting some other chart. Because, when a
             * maximized chart is showing, it is the only one that can be
             * deleted, we know afterward that all charts are visible, at
             * normal size.
             */
            onDeleteChart: function(ev) {
                this.unmaximize();
                this.drawChart();
            },
            
            /**
             * Handle when the window resizes.
             */
            onResize: function(ev) {
                this.drawChart(); // this will fix sizes
            },

            /**
             * Handle event when user toggles a given chart maximum or not.
             */
            onToggleChartSize: function(ev) {
                var maximizedChart = ev.maximizedChart;

                if (!maximizedChart) {
                    // there is no maximized chart, we must be visible
                    // and unmaximized, so do that.
                    this.unmaximize();
                } else if (maximizedChart === this) {
                    this.maximize();
                } else {
                    // we're not the maximized chart, so we must hide
                    this.hide();
                }
                
                this.drawChart();
            },

            /**
             * Handle event when the user changes the set of gateways to show.
             */
            onShowGatewayChange: function() {
                this.drawChart();
            },

            /**
             * Set up the chart elements. The HTML5 'canvas' object
             * is to take up the entire area of the chart content.
             * We want to hide the dashboardChart initially, but need it to be non-hidden
             * until we get the chart area bounding rect for the canvas width/height.
             * Once that's done, we can hide it.
             */
            setupChart: function(chartContent) {
                var chartArea = createDIV(chartContent, 'chartArea');
                this.set('chartArea', chartArea);

                this.setupCanvas(chartArea);

                // Now we can hide the dashboardChart (our 'container' object, above 'chartContent')
                this.get('container').addClass('hidden');

                this.setupYDomain();
                this.setupPanZoom();
            },
            
            /**
             * Set up the canvas object and context.
             */
            setupCanvas: function(chartArea) {
                var canvas = createCANVAS(chartArea, 'canvas')
                    .set('id', 'canvas_' + this.get('chartId'))
                    .getDOMNode();
                
                var dashboard = this.get('dashboard');
                var chartAreaSize = dashboard.get('chartAreaSize');
                canvas.width = chartAreaSize[0];
                canvas.height = chartAreaSize[1];
                this.set('canvas', canvas); 

                var context = canvas.getContext('2d');
                this.set('context', context);
            },

            /**
             * As we do things to adjust the size, both the container and 
             * the canvas object may need to have their 'width' and 'height' 
             * values adjusted to the new values coming from dashboard.
             */
            adjustChartSize: function() {
                var dashboard = this.get('dashboard');
                var chartContainerSize = dashboard.get('chartContainerSize');
                var container = this.get('container');
                container.setStyle('width', chartContainerSize[0] + '%');
                container.setStyle('height', chartContainerSize[1] + '%');

                var canvas = this.get('canvas');
                var chartAreaSize = dashboard.get('chartAreaSize');
                canvas.width = chartAreaSize[0];
                canvas.height = chartAreaSize[1];
            },

            /**
             * Set up the Y domain (the Y range is maintained in dashboard_view,
             * along with the other range values).
             */
            setupYDomain: function() {
                var yDomain = this.getValueTypeInfo('initDomain').slice(0);
                this.set('yDomain', yDomain);
            },

            /**
             * Set up a handler and functions to listen for mouse
             * movement on the canvas. If the mouse moves are within
             * the chart body (excluding the axes), call the provided
             * callback function with the chart-body-relative coordinate.
             */
            setupPanZoom: function() {
                var $this = this;

                var canvas = this.get('canvas');

                var dashboard = this.get('dashboard');

                canvas.addEventListener(IS_FIREFOX ? 'DOMMouseScroll' : 'mousewheel',
                                        function(e) {
                                            $this.handleMouseWheel(e)
                                        },
                                        false);

                var mouseMoveEventListener = function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    $this.handlePan(e);
                }

                canvas.addEventListener('mousedown', function(e) {
                    // see if the mouse is within the chart area
                    var canvasPos = $this.getMousePos(e);

                    if ($this.inChartBody(canvasPos)) {
                        $this.set('panMousePos', {x: canvasPos.x, y: canvasPos.y});
                        canvas.addEventListener('mousemove', mouseMoveEventListener, false);
                        $this.get('dashboard').startPanningOrZooming();
                        e.stopPropagation();
                        e.preventDefault();
                    }
                }, false);

                canvas.addEventListener('mouseup', function(e) {
                    $this.set('panMousePos', null);
                    canvas.removeEventListener('mousemove', mouseMoveEventListener, false);
                    $this.get('dashboard').endPanningOrZooming();
                    e.stopPropagation();
                    e.preventDefault();
                }, false);
            },

            /**
             * Handle the user moving the mouse when over a chart canvas. We are
             * given the event and the position in the relevant canvas.
             */
            handlePan: function(e) {
                // compare our position with the mouse down position to see where
                // we should be translating to. We're only interested in the X direction.
                var panMousePos = this.get('panMousePos');
                var canvasPos = this.getMousePos(e);

                var mouseDeltaX = canvasPos.x - panMousePos.x;
                this.set('panMousePos', {x: canvasPos.x, y: canvasPos.y});

                if (mouseDeltaX !== 0) {
                    // If the user has moved to the right (the delta is positive) it means
                    // he's trying to drag the data to the right (i.e., he's trying to move
                    // BACKWARD in time), so we need to invert the delta amount.
                    this.get('dashboard').translateByPixels(-mouseDeltaX);
                }
            },

            /**
             * Handle moving the mouse wheel while the mouse is over the zoom pane.
             * We will only zoom if we have charts to display, since we need them
             * to get certain values like chart width.
             */
            handleMouseWheel: function(ev) {
                var wheelDelta = this.getWheelDelta(ev);  // 1 or -1
                this.get('dashboard').scale(wheelDelta);
            },

            /**
             * Firefox's mouse wheel event has a 'detail' value. Others have 'wheelDelta'.
             * We're going to return 1 for up or -1 for down, regardless of browser.
             */
            getWheelDelta: function(ev) {
                var delta = Math.max(-1, Math.min(1, (ev.wheelDelta || -ev.detail)));
                return delta;
            },

            getMousePos: function(evt) {
                var rect = this.get('canvas').getBoundingClientRect();
                return {
                    x: evt.clientX - rect.left,
                    y: evt.clientY - rect.top
                };
            },

            inChartBody: function(canvasPos) {
                var dashboard = this.get('dashboard');
                var chartMargin = dashboard.get('chartMargin');
                var chartSize = dashboard.get('chartSize');

                var val = (canvasPos.x >= chartMargin.left && 
                           canvasPos.x <= chartMargin.left + chartSize[0] &&
                           canvasPos.y >= chartMargin.top &&
                           canvasPos.y <= chartMargin.top + chartSize[1]);
                return val;
            },
            
            clearContext: function() {
                var canvas = this.get('canvas');
                canvas.width = canvas.width; // reassigning a size attribute clears the canvas
            },

            setupDrag: function(container) {
                // Make this guy draggable and droppable
                var drag = new Y.DD.Drag({node: container}).addHandle('.titleDiv');
                drag.set('data', {chart: this});
                this.set('drag', drag);

                var drop = new Y.DD.Drop({node: container});
                drop.set('data', {chart: this});
                this.set('drop', drop);
            },

            /**
             * Create a title area DIV for the title.
             */
            setupTitle: function(chartContent) {
                var $this = this;

                var titleDiv = createDIV(chartContent, 'titleDiv');
                this.set('titleDiv', titleDiv);

                var span = createSPAN(titleDiv, '', 'titleSpan');

                var closeBox = createIMG(titleDiv, CLOSE_IMG_URL, 'closeBox');
                closeBox.setAttribute('alt', 'Close');
                closeBox.on('click', function() {$this.get('dashboard').handleDeleteChart($this);});

                // create box for max/unmax chart size.
                var toggleChartSizeBox = 
                    createIMG(titleDiv, 
                              (this.get('maximized') 
                               ? CONTRACT_IMG_URL
                               : EXPAND_IMG_URL), 
                              'toggleChartSizeBox');
                toggleChartSizeBox.on('click', 
                                      function() {$this.get('dashboard').handleToggleChartSize($this);});
                toggleChartSizeBox.setAttribute('alt', 'Maximize/unmaximize');
            },

            /**
             * Adjust the title if necessary. For example, may include units, (esp. if the
             * valuesMultiplier > 1), such as 'xxx (MiB)' or 'xxx (millions)'
             * (e.g. 'xxx (in MiB)' or 'xxx (in millions)'
             * Values for showUnits are null (use valuesMultiplier), false (never show)
             * and true (always show).
             */
            adjustTitle: function() {
                var showUnits = this.get('showUnits');

                var titleDiv = this.get('titleDiv');
                var titleText = this.get('title');

                if (showUnits !== false) {
                    var unitsFn = this.getValueTypeInfo('unitsFn');
                    
                    var valuesMultiplier = this.get('valuesMultiplier');
                    if (showUnits || valuesMultiplier > 1) {
                        titleText = titleText + " (" + unitsFn(valuesMultiplier) + ")";
                    }
                }

                var span = titleDiv.one('span');
                span.set('text', titleText);
            },

            /**
             * Create a summary area DIV for the summary label (total/min/max/avg, stuff like that).
             */
            setupSummary: function(chartContent) {
                var summaryDiv = createDIV(chartContent, 'summaryDiv');
                this.set('summaryDiv', summaryDiv);
            },

            adjustSummary: function() {
                var summaryDiv = this.get('summaryDiv');
                summaryDiv.setHTML(this.computeSummaryHtml());
            },
            
            /**
             * Once data values and such have been set up, draw the parts of
             * the chart using the current values. Rather than spread checks
             * for being the active view everywhere, we'll do them here.
             */
            drawChart: function() {
                var dashboard = this.get('dashboard');

                if (!dashboard.isActiveView() || this.isHidden()) {
                    return;
                }

                var start = Date.now();

                // in case we're doing something that's caused resizing, adjust
                // to the latest dashboard size values.
                this.adjustChartSize();

                var context = this.get('context');

                var chartMargin = dashboard.get('chartMargin');
                var chartSize = dashboard.get('chartSize');

                this.clearContext();
                this.adjustTitle();
                this.drawYAxisAndGrid(context, chartMargin, chartSize[0], chartSize[1]);
                this.drawXAxisAndGrid(context, chartMargin, chartSize[0], chartSize[1]); 
                this.drawData(context, chartMargin, chartSize[0], chartSize[1]);
                this.adjustSummary();
            },
            
            /**
             * Draw the Y axis starting at 0,0, then translate appropriately.
             * Note that we add the 0.5,0.5 offset to make lines not bleed across
             * two pixels.
             */
            drawYAxisAndGrid: function(context, chartMargin, chartWidth, chartHeight) {
                context.save();

                // our Y origin is at the bottom, not the top.
                context.translate(chartMargin.left, chartMargin.top + chartHeight);

                context.beginPath();
                context.lineWidth = 1;
                context.strokeStyle = "#000000";
                
                //
                // Vertical line 
                //
                context.moveTo(0 + PT_OFFSET, 0 + PT_OFFSET);
                context.lineTo(0 + PT_OFFSET, -chartHeight + PT_OFFSET);
                context.stroke();

                //============================
                // Begin tick marks and labels
                //============================
                context.save();
                context.beginPath();

                var yDomain = this.get('yDomain');

                // Compute the optimum number of ticks to show.
                // We want a minimum of 20 pixels between ticks, and we want
                // the max number of ticks we can show, within the following
                // values (all with one more tick at 0): 2, 5, 10, 25.
                var ticksList = [2, 5, 10, 20];
                var yTicks = null;

                var pixelDiff = chartHeight;
                var domainDiff = yDomain[1] - yDomain[0];

                for (var i = ticksList.length - 1; i >= 0; i--) {
                    var numTicks = ticksList[i];

                    if (Math.round(pixelDiff / numTicks) >= 20 && 
                        Math.round(domainDiff / numTicks) >= 1) {
                        yTicks = numTicks;
                        break;
                    } 
                }

                if (yTicks == null) {
                    yTicks = ticksList[0];
                }

                //var yTicks = this.get('yTicks');
                var tickSize = this.get('tickSize');

                var domainDelta = ((yDomain[1] - yDomain[0]) / yTicks);
                var pixelDelta = -(chartHeight / yTicks);

                // Can we move any of the following style stuff out?
                context.font = "normal 100% arial";
                context.textAlign = 'right';
                context.textBaseline = 'middle';
                context.strokeStyle="#444444";

                for (var i = 0; i <= yTicks; i++) {
                    var yPixel = Math.round(i * pixelDelta);  // offset pixel value, rounded to int
                    var domainVal = Math.round(i * domainDelta); // same for domain delta

                    context.moveTo(0 + PT_OFFSET, yPixel + PT_OFFSET);
                    context.lineTo(-tickSize + PT_OFFSET, yPixel + PT_OFFSET);
                    context.strokeText("" + domainVal, 
                                       -12 + PT_OFFSET, 
                                       yPixel + PT_OFFSET); // -2 is because 'middle' is too low
                }

                context.stroke();
                context.restore(); 

                //===============
                // begin y grid
                //===============
                context.save(); 
                
                context.beginPath();

                context.strokeStyle="#C8C8C8";

                for (var i = 0; i <= yTicks; i++) {
                    var yPixel = Math.round(i * pixelDelta);  // offset pixel value, rounded to int

                    context.moveTo(0 + PT_OFFSET, yPixel + PT_OFFSET);
                    context.lineTo(chartWidth + PT_OFFSET, yPixel + PT_OFFSET);
                }

                context.stroke();
                context.restore();  // end of Y grid

                context.restore();  // end of Y axis and grid
            },
            
            drawXAxisAndGrid: function(context, chartMargin, chartWidth, chartHeight) {
                var $this = this;
                var dashboard = this.get('dashboard');

                context.save();
                
                context.translate(chartMargin.left, chartMargin.top + chartHeight);

                context.beginPath();

                context.lineWidth = 1;
                context.strokeStyle = "#000000";
                
                // Draw a horizontal line 
                context.moveTo(0 + PT_OFFSET,0 + PT_OFFSET);
                context.lineTo(chartWidth + PT_OFFSET, 0 + PT_OFFSET);

                context.stroke();

                // At most, we'd like 15 ticks across the display portion. Figure
                // out the optimal time separation for the ticks, to see what level
                // of detail we want to show (1 sec, 5 sec, 15 sec, 30 sec, 1 minute,
                // 5 min, etc.)
                var xDomain = dashboard.get('xDomain');
                var xDomainClip = dashboard.get('xDomainClip');
                var xRange = dashboard.get('xRange');
                var xTicks = dashboard.get('xTicks');
                var tickSize = this.get('tickSize');

                // find the next higher resolution in our time list.
                var timeSizes = [1000, 5000, 15000, 30000, 60000, 300000, 900000, 1800000, 3600000];
                var numTimeSizes = timeSizes.length;

                var minMS = xDomain[0];
                var maxMS = xDomain[1];
                
                var totalTicks = Math.floor((xRange[1] - xRange[0]) / chartWidth * xTicks);

                var timeSep = (maxMS - minMS) / totalTicks;

                var timeSizeIndex;
                for (var i = 0; i < numTimeSizes; i++) {
                    if (timeSep < timeSizes[i] || i == numTimeSizes - 1) {
                        timeSizeIndex = i;
                        break;
                    }
                }

                // At this point we know what the desired time separation is 
                // between elements. However, if the pixel separation at that
                // time size is too close together or too far apart, we'll adjust
                // it so it's reasonable (i.e. between MIN and MAX tick separation)
                var xTickSep = 
                    (xRange[1] - xRange[0]) * timeSizes[timeSizeIndex] / (xDomain[1] - xDomain[0]);

                if (xTickSep < MIN_TICK_SEPARATION) {
                    while (xTickSep < MIN_TICK_SEPARATION && timeSizeIndex < numTimeSizes - 1) {
                        timeSizeIndex++;
                        xTickSep = 
                            (xRange[1] - xRange[0]) * timeSizes[timeSizeIndex] / (xDomain[1] - xDomain[0]);
                    }
                } else if (xTickSep > MAX_TICK_SEPARATION) {
                    while (xTickSep > MAX_TICK_SEPARATION && timeSizeIndex > 0) {
                        timeSizeIndex--;
                        xTickSep = 
                            (xRange[1] - xRange[0]) * timeSizes[timeSizeIndex] / (xDomain[1] - xDomain[0]);
                    }
                }

                timeSep = timeSizes[timeSizeIndex];

                // at this point we have the separation between time units.
                // Now compute the nearest value that is an integer multiple of
                // the 'nice' separation time units away from the start of the domain.
                var remainder = xDomainClip[0] % timeSep;
                var minMarkerMS = (remainder == 0 
                                   ? xDomainClip[0] 
                                   : (xDomainClip[0] - remainder) + timeSep);

                // recompute (temporarily) the xTicks value, based on the adjusted
                // separation between ticks.
                xTicks = Math.floor((xDomainClip[1] - xDomainClip[0]) / timeSep) + 1;

                // 
                // Tick marks and labels (the total is one more than xTicks, so we 
                // have a tick at the minimum
                //
                context.save();
                context.beginPath();

                context.font = "normal 100% arial";
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.strokeStyle="#666666";

                var xPixels = [];

                var xRangeClip = [scaleX(xDomainClip[0], xDomain, xRange), 
                                  scaleX(xDomainClip[1], xDomain, xRange)];

                for (var i = 0; i < xTicks; i++) {
                    var time = minMarkerMS + (i * timeSep);
                    var xPixel = scaleX(time, xDomain, xRange);
                    if (xPixel >= xRangeClip[0] && xPixel <= xRangeClip[1]) {
                        // we're within the X display range. The beginning of the clipping area
                        // is supposed to show at our X = 0 coordinate, so we need to subtract
                        // the xRangeClip[0] from the real value.
                        xPixel -= xRangeClip[0];
                        xPixels.push(xPixel);
                        var date = new Date(time);
                        var label = (date.getSeconds() == 0 
                                     ? addZero(date.getHours()) + ':' + addZero(date.getMinutes())
                                     : ':' + addZero(date.getSeconds()));

                        context.moveTo(xPixel + PT_OFFSET, 0 + PT_OFFSET);
                        context.lineTo(xPixel + PT_OFFSET, tickSize + PT_OFFSET);
                        context.strokeText(label, xPixel + PT_OFFSET, 13 + PT_OFFSET); 
                    }
                }

                context.stroke();
                context.restore();  // end of tick marks

                // Now the X grid, using the saved range values
                context.save();
                context.beginPath();

                context.strokeStyle="#C8C8C8";

                for (var i = 0; i < xPixels.length; i++) {
                    var xPixel = xPixels[i];
                    context.moveTo(xPixel + PT_OFFSET, 0 + PT_OFFSET);
                    context.lineTo(xPixel + PT_OFFSET, -chartHeight + PT_OFFSET);
                }

                context.stroke();
                context.restore();  // end of tick marks

                context.restore();  // xAxis overall
            },
            
            /**
             * Given the data points and the current X (time) clipping region,
             * draw the line. 
             * NOTE: because of the 'bursty' nature of some of the data, we will
             * never show a value that is later than 'now' - 
             */
            drawData: function(context, chartMargin, chartWidth, chartHeight) {
                var $this = this;
                
                var dataItems = this.getDataItems();
                var numDataItems = dataItems.length;

                if (numDataItems == 0) {
                    return;
                }

                var dashboard = this.get('dashboard');
                var lastDisplayableTime = dashboard.get('lastDisplayableTime');

                var xDomain = dashboard.get('xDomain');
                var xRange = dashboard.get('xRange');
                var xDomainClip = dashboard.get('xDomainClip');

                // Figure out our displayable range. We may fix it later to not
                // allow the user to scroll past the last displayable time, but 
                // for now--if the last displayable time is earlier than the 
                // beginning of our range, bail, since we would clip everything anyway.
                var minMS = xDomainClip[0];
                
                if (lastDisplayableTime < minMS) {
                    return;
                }

                // We can only draw something to the last displayable time.
                var maxMS = Math.min(xDomainClip[1], lastDisplayableTime);

                var yRange = dashboard.get('yRange');
                var yDomain = this.get('yDomain');

                // Find the elements of the dataItems that have time values in
                // the available time range.

                // We need to subtract the minMS X value from anything we choose
                // to show, since coords on the canvas are all relative to that.
                var minX = scaleX(minMS, xDomain, xRange);

                var extendLastValue = this.get('extendLastValue');
                var interpolation = this.get('interpolation');

                for (var i = 0; i < numDataItems; i++) {
                    var dataItem = dataItems[i];  // e.g., gateway
                    var dataItemValues = this.getDataItemValues(dataItem);  // doesn't return null
                    var numVals = dataItemValues.length;

                    if (numVals === 0) {
                        continue;
                    }

                    var dataMS = dataItemValues[0][0];

                    if (dataMS > maxMS) {
                        // the first data point is after our clipping region, so we
                        // have nothing we can display.
                        continue;
                    }

                    dataMS = dataItemValues[numVals - 1][0];

                    if (dataMS < minMS && !extendLastValue) {
                        // the last data point is before our clipping region, and
                        // we're not extending the value.
                        continue;
                    }

                    // we have some data intersecting the clipping region (even if
                    // only because we're extending the last value across the region).
                    // Find the range of points that intersect our time range.
                    // We'll go one before and one after, so we can draw a
                    // line from outside the clip area into the area correctly.
                    var minIndex, maxIndex;
                    var j;

                    for (j = 0; j < numVals; j++) {
                        if (dataItemValues[j][0] >= minMS) {
                            break;
                        }
                    }

                    // The following gets the last point before the range (even if no points
                    // were actually in the range and we're doing 'extendLastValue')
                    minIndex = (j > 0 ? j - 1 : j); 

                    for (j = minIndex; j < numVals; j++) {
                        if (dataItemValues[j][0] > maxMS) {
                            break;
                        }
                    }

                    var lineColor = this.getDataItemColor(dataItem);
                    var lineStyle = this.getDataItemLineStyle(dataItem);

                    // The following gets the first point after the range (even if no points
                    // were actually in the range and we're doing 'extendLastValue'), or 
                    // the last valid point
                    maxIndex = (j == numVals ? j - 1 : j);  

                    context.save();
                    context.translate(chartMargin.left, chartMargin.top + chartHeight);

                    context.beginPath();
                    context.rect(0, 0, chartWidth, -chartHeight);
                    context.clip();

                    context.beginPath();
                    context.lineWidth = 1;
                    context.strokeStyle = lineColor;

                    var valuesMultiplier = this.get('valuesMultiplier');

                    // we're within the X display range.
                    var x,y,item, lastX, lastY;

                    for (var j = minIndex; j <= maxIndex; j++) {
                        item = dataItemValues[j];
                        x = scaleX(item[0], xDomain, xRange) - minX; // x is relative to left edge
                        y = scaleY(item[1], yDomain, valuesMultiplier, yRange);

                        if (j == minIndex) {
                            context.moveTo(x + PT_OFFSET, y + PT_OFFSET);
                        } else if (interpolation === 'step-before') {
                            if (y != lastY) {
                                this.lineTo(context, lineStyle, lastX, lastY, lastX, y);
                            }
                            this.lineTo(context, lineStyle, lastX, y, x, y);
                        } else if (interpolation === 'step-after') {
                            this.lineTo(context, lineStyle, lastX, lastY, x, lastY);

                            if (x != lastX) {
                                this.lineTo(context, lineStyle, x, lastY, x, y);
                            }
                        } else {
                            // assumed to be 'linear'
                            this.lineTo(context, lineStyle, lastX, lastY, x, y);
                        }

                        lastX = x;
                        lastY = y;
                    }

                    // If 'extendLastValue' is true and our final point is before the
                    // end of the clip range (and also before the latest displayable time),
                    // AND ALSO BEFORE THE STOPTIME, IN THE CASE OF A GATEWAY-SPECIFIC VALUE
                    // add a line at the same value to the appropriate point (end of the 
                    // clip range or last displayable time or gateway stopTime. 
                    if (extendLastValue && 
                        dataItemValues[maxIndex][0] < maxMS) {
                        // The following is just saying "give me the last Y value extended to maxMS".
                        // We really need to say "give me the last Y value extended to the minimum of
                        // maxMS and the stop time of the given gateway", if that's relevant.
                        // 
                        // Let the individual chart decide how to handle extending a particular
                        // data item to 'now' by creating a temporary item at whatever it thinks
                        // the correct time is. Default just returns the original value.
                        var extendedLastDataItemValue = 
                            this.extendLastValue(dataItem, dataItemValues[maxIndex], maxMS);
                        
                        x = scaleX(extendedLastDataItemValue[0], xDomain, xRange) - minX; 
                        y = scaleY(extendedLastDataItemValue[1], yDomain, valuesMultiplier, yRange);
                        this.lineTo(context, lineStyle, lastX, lastY, x, y);
                    }

                    context.stroke();
                    context.restore();  // end of line
                }
            },

            /**
             * Given our data item and a particular data item value pair (time, value) and the maximum
             * value of our display window, return a new data item value pair that will be the 'extended'
             * pair. This default just copies the value to the maxMS time. Others (e.g. current sessions)
             * may want to do things like check the stopTime for a given gateway instance.
             */
            extendLastValue: function(dataItem, dataItemValue, maxMS) {
                return [maxMS, dataItemValue[1]];
            },

            /**
             * Used only when drawing the DATA, this adjusts for line style and point offset.
             */
            lineTo: function(context, lineStyle, x1, y1, x2, y2) {
                if (lineStyle == CC.Constants.LineStyle.DASHED) {
                    context.dashedLine(x1 + PT_OFFSET, y1 + PT_OFFSET, x2 + PT_OFFSET, y2 + PT_OFFSET, [4, 2]);
                } else {
                    context.lineTo(x2 + PT_OFFSET, y2 + PT_OFFSET);
                }
            },
            
            /**
             * Compute and return our list of data items (from which we'll
             * get timed values). This default does nothing.
             */
            getDataItems: function() {
                return [];
            },

            /**
             * Compute a string of HTML we'll use for our summary line at
             * the bottom of the chart. This default does nothing.
             */
            computeSummaryHtml: function() {
                return "";
            },

            /**
             * Return an array of [time, val] pairs from the given data item.
             * This default does nothing. The caller is responsible for NOT
             * changing any of the values while being used, as this is the
             * real list.
             */
            getDataItemValues: function(dataItem) {
                return [];
            },

            destroy: function(options) {
                this.deleteSubscriptions();

                var container = this.get('container');
                removeAllChildren(container);

                this.set('canvas', null);
                this.set('context', null);
                this.set('yDomain', null);
                this.set('titleDiv', null);
                this.set('chartArea', null);
                this.set('summaryDiv', null);
                this.set('dashboard', null);

                var drag = this.get('drag');
                if (drag) {
                    drag.set('data', null);
                    this.set('drag', null);
                    drag.destroy();
                }
                var drop = this.get('drop');
                if (drop) {
                    drop.set('data', null);
                    this.set('drop', null);
                    drop.destroy();
                }

                // Do the official YUI destroy
                Y.DashboardChart.superclass.destroy.call(this, options);
            },

            /**
             * Called from individual chart instances to find out whether
             * or not a given gateway model should be in the data being shown.
             */
            isShowGateway: function(gatewayModel) {
                var val = this.get('dashboard').isShowGateway(gatewayModel.get('connectionUrl'));
                return val;
            },

            /**
             * Compare a new entry vs the current domain min/max and values multiplier to
             * see if they need adjustment, and return a new triple with the values after
             * any adjustment. The goal is to have min and max within valuesMultiplierSize
             * and valuesMultiplier to be the multiplier we need to reconstitute the real value.
             *
             * Note that the incoming domain min and max have already been divided by the
             * valuesMultiplier, so we need to multiply them by the valuesMultiplier so we're
             * comparing 3 values at the same multiplier. Dividing the newValue doesn't
             * work because it might be of a higher valuesMultiplier but smaller adjusted size.
             */
            computeDomainBounds: function(newValue, domainMin, domainMax, valuesMultiplier) {
                var realMin = domainMin * valuesMultiplier;  // so they're same scale as newValue
                var realMax = domainMax * valuesMultiplier;

                var changed = false;

                if (newValue < realMin) {
                    realMin = newValue;
                    changed = true;
                }

                if (newValue > realMax) {
                    realMax = newValue;
                    changed = true;
                }

                if (changed) {
                    var valuesMultiplierSize = this.getValueTypeInfo('valMultiplierSize');

                    valuesMultiplier = 1;
                    var maxAbsVal = Math.max(Math.abs(realMin), Math.abs(realMax));

                    while (maxAbsVal > valuesMultiplierSize) {
                        valuesMultiplier = valuesMultiplier * valuesMultiplierSize;
                        maxAbsVal = maxAbsVal / valuesMultiplierSize;
                    }

                    domainMin = this.niceMin(realMin / valuesMultiplier);
                    domainMax = this.niceMax(realMax / valuesMultiplier);
                }

                return {domainMin: domainMin, 
                        domainMax: domainMax, 
                        valuesMultiplier: valuesMultiplier};
            },

            /**
             * Adjust our 'min' value to a "nice" value, as defined by niceMinVals.
             */
            niceMin: function(domainMin) {
                var niceMinVals = this.getValueTypeInfo('minVals');

                for (var i = 0; i < niceMinVals.length; i++) {
                    if (domainMin >= niceMinVals[i]) {
                        return niceMinVals[i];
                    }
                }

                return niceMinVals[niceMinVals.length -1 ];
            },

            /**
             * Adjust our 'max' value to a "nice" value, as defined by niceMaxVals.
             */
            niceMax: function(domainMax) {
                var niceMaxVals = this.getValueTypeInfo('maxVals');

                for (var i = 0; i < niceMaxVals.length; i++) {
                    if (domainMax <= niceMaxVals[i]) {
                        return niceMaxVals[i];
                    }
                }

                return niceMaxVals[niceMaxVals.length -1 ];
            },

            /**
             * Is the chart marked to be hidden?
             */
            isHidden: function() {
                var container = this.get('container');
                return container.hasClass('hidden');
            },

            /**
             * Mark the chart to be hidden. The actual changing of the
             * visibility will be done in draw().
             */
            hide: function() {
                var container = this.get('container');
                container.addClass('hidden');
                return this;
            },

            /**
             * Mark the chart to be un-hidden. The actual changing of the
             * visibility will be done in draw().
             */
            unhide: function() {
                var container = this.get('container');
                container.removeClass('hidden');
                return this;
            },

            /**
             * Mark the chart to be unhidden and maximized, and update its 
             * toggle icon.
             */
            maximize: function() {
                this.unhide();
                var container = this.get('container');
                var toggleChartSizeBox = container.one('.toggleChartSizeBox');
                toggleChartSizeBox.setAttribute('src', CONTRACT_IMG_URL);
                this.set('maximized', true);
            },

            /**
             * Mark the chart as unmaximized, and update its toggle icon.
             * The actual changing of the visibility will be done in draw().
             */
            unmaximize: function() {
                this.unhide();
                var container = this.get('container');
                var toggleChartSizeBox = container.one('.toggleChartSizeBox');
                toggleChartSizeBox.setAttribute('src', EXPAND_IMG_URL);
                this.set('maximized', false);
            },

            isMaximized: function() {
                return this.get('maximized');
            },

            isNormal: function() {
                return (!this.isHidden() && !this.isMaximized());
            },

            // return the field from the object in VALUE_TYPE_DATA associated with 
            // the chart's 'valueType'. 
            // If the type name isn't found, return the field from 'other'
            getValueTypeInfo: function(fieldName) {
                var valueTypeInfo = VALUE_TYPE_DATA[this.get('valueType')];
                if (!valueTypeInfo) {
                    valueTypeInfo = VALUE_TYPE_DATA['other'];
                }
                return valueTypeInfo[fieldName];
            },

            /**
             * Given a data item, return the color to use for its line.
             * This default just assumes the dataItem is a gateway and
             * calls the dashboard to get the gateway's color.
             */
            getDataItemColor: function(dataItem) {
                return this.get('dashboard').getColor(dataItem);
            },

            /**
             * Given a data item, return a string indicating a line style
             * for the line (either 'solid' or 'dashed'). This default
             * just returns 'solid'.
             */
            getDataItemLineStyle: function(dataItem) {
                return CC.Constants.LineStyle.SOLID;
            },

            /**
             * Add an event subscription to our list of subscribed events.
             * We keep them here so we can remove all on destroy().
             */
            addSubscription: function(subscription) {
                this.get('subscriptions').push(subscription);
            },

            deleteSubscriptions: function() {
                var subscriptions = this.get('subscriptions');
                subscriptions.forEach(function(subscription) {
                    subscription.detach();
                });
            },

            dumpVals: function(vals) {
                if (vals && vals.length > 0) {
                    for (var i = 0; i < vals.length; i++) {
                        CC.console.debug('[' + vals[i][0] + ', ' + vals[i][1] + ']');
                    }
                    CC.console.debug("#########");
                    CC.console.debug(" ");
                }
            }
        }, 
        {
            ATTRS: {
                // model is clusterModel

                // set on create - we do not pass one in.
                container: {
                    value: null
                },

                titleDiv: {
                    value: null
                },

                chartArea: {
                    value: null
                },

                summaryDiv: {
                    value: null
                },

                // set on create
                dashboard: {
                    value: null
                },

                // set on create
                title: {
                    value: null
                },

                // The type of value being displayed, so we have a clue what
                // a reasonable display is for labels. Current valid values are:
                // 'number' (values are general numbers), 
                // 'percentage' (values are 0-100),
                // 'bytes' (values are bytes, so are adjusted in units of 1024, not 1000).
                valueType: {
                    value: null
                },

                // In displaying the title, when do we show units?
                // Default (null) is to show units only when the values multiplier is > 1
                // (e.g. when we shift from showing bytes to KiB or MiB).
                // Other values are 'true' (always show units) and 'false' (never show units).
                showUnits: {
                    value: null
                },

                /**
                 * The type of interpolation to use on the line for each object's chart.
                 */
                interpolation: {
                    value: 'linear'
                },

                /**
                 * If trying to plot to a time after the last data point,
                 * do we extend the last data value to the current time (true)
                 * or not (false). For example, if #connection is 5 at time X,
                 * and we're showing time X+2, unless we know otherwise, it is
                 * still 5. For something like memory, though, we know the 
                 * value jumps around and it really doesn't mean anything to extend
                 * the previous value. Default is to NOT extend.
                 */
                extendLastValue: {
                    value: false
                },

                // The HTML5 canvas object (the real DOM node, not a YUI wrapper)
                canvas: {
                    value: null
                },

                // The canvas context
                context: {
                    value: null
                },

                // The Y domain
                yDomain: {
                    value: null
                },

                // The number of ticks to show on the Y axis. Might vary by chart,
                // but probably not.
                yTicks: {
                    value: 5
                },

                tickSize: {
                    value: 6
                },

                // The value we're using to reduce all the real values to small
                // enough numbers so we don't run out of space. For example, if the
                // value is 1000, it means the values we're showing are in thousands,
                // so we divide the real value by 1000 before display. The current
                // value is a power of the valuesMultiplerSize (the size of the 
                // basic valuesMultiplier that we divide values by 
                // to get a nice range of numbers. The 'valuesMultiplier' is some
                // number of multiples of this number (the base value is 1).
                // See NICE_NUMBER_VAL_MULTIPLIER_SIZE, for example.
                valuesMultiplier: {
                    value: 1
                },

                chartId: {
                    value: null
                },

                maximized: {
                    value: false
                },

                // Latest recorded position of the mouse during a pan operation.
                panMousePos: {
                    value: null
                },

                subscriptions: {
                    value: []
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'cluster-model', 'gateway-model', 'dashboard-view']
});
