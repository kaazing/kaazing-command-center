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
 * The view for monitoring gateways
 *
 * @module monitor-gateways-view
 */
YUI.add('monitor-gateways-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'monitorGatewaysView',
    CLUSTER_MEMBER_COLUMN_INDEX = 0;

    /**
     * The View for monitoring gateways
     *
     * @class MonitorGatewaysView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.MonitorGatewaysView = Y.Base.create(
        NAME, 
        Y.KaazingView,
        [],
        {
            initializer: function() {
                // subscribe to events when our model is replaced or any other
                // change events take place.
                var model = this.get('model');

                // This view listens for ClusterModel events, specifically replacing the model.
                model && model.addTarget(this);

                // Listen for change events on the cluster model.
                this.after('modelChange', this.afterModelChange, this);

                // When the user actually does log in, we can actually draw stuff.
                this.after('*:loggedInChange', this.afterLoggedInChange, this);
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
             * Setup the first time when we're actually shown (or on a second or
             * later one, just set up the toolbar and return. We do NOT want to
             * listen for anything until we're actually shown the first time.
             */
            doDisplaySetup: function() {
                if (this.get('firstTime')) {
                    this.on(Y.GatewayModel.prototype.GATEWAY_AVAILABLE_EVENT, 
                            this.onGatewayAvailable,
                            this);

                    // Because the gateway-level processing data is essentially meaningless, since
                    // it doesn't yet correctly keep all the totals, we're going to listen for
                    // SERVICE-level processing data instances instead, since that will trigger
                    // when something that should have triggered a gateway-level event occurs.
                    this.on(Y.ServiceDynamicDataModel.prototype.UPDATE_EVENT, 
                            this.onUpdateService, 
                            this);


                    // We generally don't care if a gateway instance is unavailable (doesn't change
                    // any displayed data), but we do if the instance is marked as stopped.
                    this.after('gatewayModel:stopTimeChange',
                               this.afterStopTimeChange,
                               this);

                    // create a default filter for gateway instances that have no stopTime
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'UNSET', ''));
                    this.set('filter', filter);

                    // do this after set('filter') so we don't trigger an extra doSearch on start
                    this.after('filterChange', this.afterFilterChange, this);

                    // Define the gateway data table structure
                    var data = new Y.ModelList({model: Y.GatewayModel});

                    var dataTableColumns = [
                        /* XXX
                           For first version, leave 'action' out for gateways
                           { key: 'action',
                           label: '&nbsp;',
                           sortable: false,
                           allowHTML: true,
                           formatter: function(o) {
                           return '<button type="button" class="goButton"></button>';
                           },
                           className: 'monitorGatewaysAction'
                           },
                        */
                        { key: 'hostAndPID', 
                          label: 'Host&nbsp;:&nbsp;PID<br>&nbsp;',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:70,
                          className: 'monitorGatewaysHostAndPID'
                        },
                        { key: 'startTime', 
                          label: 'Start<br>Time',
                          sortable: true,
                          allowHTML: true,
                          emptyCellValue: "",
                          width:70,
                          formatter: function(o) {
                              return formatTableTime(o, 'startTime');
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('startTime'), 
                                                    b.get('startTime'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorGatewaysStartTime'
                        },
                        { key: 'stopTime', 
                          label: 'Stop<br>Time',
                          sortable: true,
                          allowHTML: true,
                          emptyCellValue: "",
                          width:70,
                          formatter: function(o) {
                              return formatTableTime(o, 'stopTime');
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('stopTime'), 
                                                    b.get('stopTime'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorGatewaysStartTime'
                        },
                        { key: 'totalCurrentSessions', 
                          label: 'Current<br>Sessions',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:70,
                          formatter: function(o) {
                              var gateway = o.record;
                              return formatNumber(gateway.get('totalCurrentSessions'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalCurrentSessions'), 
                                                    b.get('totalCurrentSessions'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorGatewaysCurrentSessions'
                        },
                        { key: 'totalBytesReceived',
                          label: 'Bytes<br>Read',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var gateway = o.record;
                              return memorySizeString(gateway.get('totalBytesReceived'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalBytesReceived'), 
                                                    b.get('totalBytesReceived'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorGatewaysBytesReceived'
                        },
                        { key: 'totalBytesSent',
                          label: 'Bytes<br>Written',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var gateway = o.record;
                              return memorySizeString(gateway.get('totalBytesSent'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalBytesSent'), 
                                                    b.get('totalBytesSent'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorGatewaysBytesSent'
                        }
                    ];

                    var dataTable = new Y.DataTable({
                        columns: dataTableColumns,
                        data: data,
                        recordType: Y.GatewayModel,
                        editable: false,
                        highlightMode: 'row',
                        selectionMode: 'row',
                        selectionMulti: false
                    });
                    
                    dataTable.set('strings.emptyMessage','No gateways meet your selected criteria');

                    /* XXX For first version, leave 'action' out for gateways
                    // Have the button on each row handled by delegate
                    Y.delegate('click', 
                    this.handleActionButton, 
                    '#monitorGatewayssResults', 
                    'button.goButton');
                    */

                    this.set('dataTable', dataTable);

                    this.adjustForClusterColumn();

                    this.doSearch();

                    dataTable.render('#monitorGatewaysResults');

                    this.set('firstTime', false);
                }

                this.setupToolbar();
            },

            /**
             * Build the filter field definitions. This is called lazily when the
             * filter dialog is exposed, because sometimes when we come in from
             * a bookmark, we don't know if we're a cluster by the time this 
             * view is shown.
             */
            buildFilterFieldDefinitions: function() {
                var $this = this;

                // Define the fields we'll allow the data table to filter on
                var filterFieldDefinitions = 
                    [
                     ['hostAndPID', 'Host : PID', 'alpha'], 
                     ['startTime', 'Start Time', 'numeric'], 
                     ['stopTime', 'Stop Time', 'numeric'], 
                     ['totalCurrentSessions', 'Current Sessions', 'numeric'],
                     ['totalBytesReceived', 'Bytes Read', 'numeric'],
                     ['totalBytesSent', 'Bytes Written', 'numeric']
                    ];

                if (this.isCluster()) {
                    filterFieldDefinitions.push(['gatewayLabel', 'Cluster Member', 'alpha']);
                }

                filterFieldDefinitions.sort(function(a, b) {
                    var labelA = a[1];
                    var labelB = b[1];
                    if (labelA < labelB) {
                        return -1;
                    } else {
                        return (labelA === labelB ? 0 : 1);
                    }
                });

                $this.set('filterFieldDefinitions', filterFieldDefinitions);

                return filterFieldDefinitions;
            },

/* XXX For first version, leave 'action' out for gateways
            handleActionButton: function(ev) {
                alert('In handleActionButton');
            },
*/

            adjustForClusterColumn: function() {
                var dataTable = this.get('dataTable');
                
                if (dataTable) {
                    var columns = dataTable.get('columns');

                    if (this.isCluster()) {
                        if (columns[CLUSTER_MEMBER_COLUMN_INDEX].key !== 'gatewayLabel') {
                            columns.splice(CLUSTER_MEMBER_COLUMN_INDEX,
                                           0, 
                                           { key: 'gatewayLabel',
                                             label: 'Cluster<br>Member',
                                             sortable: true,
                                             allowHTML: true,
                                             emptyCellValue: "",
                                             width:60,
                                             formatter: function(o) {
                                                 var gateway = o.record;
                                                 return gateway.get('gatewayLabel');
                                             },
                                             className: 'monitorGatewaysGateway'
                                           });
                            dataTable.set('columns', columns); // force re-render
                        }
                    } else {
                        if (columns[CLUSTER_MEMBER_COLUMN_INDEX].key === 'gatewayLabel') {
                            columns.splice(CLUSTER_MEMBER_COLUMN_INDEX, 1);
                            dataTable.set('columns', columns); // force re-render
                        }
                    }
                }
            },

            /**
             * Initialize the context menu. 
             */
            initContextMenu: function(dataTable) {
                var $this = this;

                var cmenu = new Y.ContextMenuView({
                    container: Y.Node.create('<div id="cmenuView" class="cmenu" tabindex="1"></div>'),
                    app: this.get('app'),
                    menuItemTemplate: '<div class="yui3-contextmenu-menuitem" data-cmenu="{menuIndex}">{menuContent}</div>',

                    menuItems: [
                        {label:"Shut down", value:"i", handler: $this.handleShutDownGateway}
                    ],
                    trigger: {
                        node:  dataTable.get('srcNode').one('table .yui3-datatable-data'),
                        target: 'tr'
                    }
                });

                // Set a listener on the context menu's 'selectedMenu' attribute
                // when it changes
                cmenu.after('selectedMenuChange', $this.selectedContextMenuItem, $this);
                
                cmenu.after('contextTargetChange',function(e){
                    var tar = e.newVal,
                    tarPrev = e.prevVal || null;

                    if (tarPrev) {
                        tarPrev.removeClass('selectTr');
                    }
                    if (tar) {
                        tar.addClass('selectTr');
                    }
                });

                cmenu.on('contextMenuHide',function() {
                    var tar = this.get('contextTarget');
                    if (tar) {
                        tar.removeClass('selectTr');
                    }
                });

                $this.set('cmenu', cmenu);
            },

            /**
             * Handler for the user selecting a context menu item for a given row in the table.
             */
            selectedContextMenuItem: function(ev) {
                // It's possible based on our changing of data in the record based
                // on the dynamic data instances, that the <tr> is no longer
                // attached to the table when we get here, so we can't just go up the
                // 'parentNode' chain. However, we can use the record ID from the <tr> 
                // and the table to find the real GatewayModel
                var dataTable = this.get('dataTable');
                var cmenu = this.get('cmenu');

                var tr = cmenu.get('contextTarget');
                var recordId = tr.getAttribute('data-yui3-record');
                var gatewayModel = dataTable.getRecord(recordId);  // from internal ModelList
                
                var menuIndex = +(ev.newVal.menuIndex);

                var menuItem = ev.newVal.menuItem;

                //CC.console.debug('selected gateway ' + gatewayModel.get('gatewayLabel') + 
                //                      ', menu index ' + menuIndex + 
                //                      ', menu label \'' + menuItem.label + '\'');

                if (menuItem.handler) {
                    setTimeout(function() {menuItem.handler.call(this, gatewayModel)}, 0);
                }
            },

            handleShutDownGateway: function(gatewayModel) {
                alert("Shutting down a gateway is not currently implemented.");
            },

            setupToolbar: function() {
                var toolbar = this.get('toolbar');

                this.setupFilters(toolbar);
                // this.setupDisplayMax(toolbar);  Removed for 4.0, back in later.
            }, 

            // Not called for 4.0. Back in later.
            setupDisplayMax: function(toolbar) {
                var displayLabel = createLABEL(toolbar, 'Display max of ');

                var maxRows = this.get('maxRows');

                var maxRowsSelect = createSELECT(toolbar, 'monitorMaxRowsSelect')
                    .set('id', 'gatewaysMaxRowsSelect');
                maxRowsSelect.on('change', this.onMaxRowsChange, this);

                var option = createOPTION(maxRowsSelect, null, '10', '10');
                option = createOPTION(maxRowsSelect, null, '50', '50');
                option = createOPTION(maxRowsSelect, null, '100', '100');
                option = createOPTION(maxRowsSelect, null, '500', '500');

                maxRowsSelect.get("options").each( function() {
                    var value  = this.get('value');
                    if (value == maxRows) {
                        // note we're comparing a # vs a string
                        this.set('selected', 'selected');
                    }
                });            

                displayLabel = createLABEL(toolbar, ' rows');
            },

            setupFilters: function(toolbar) {
                var label = createLABEL(toolbar, 'Filter: ', 'filterSelector');

                // Define the set of pre-specified filters
                var filterSelect = createSELECT(label, 'toolbarSelect');
                filterSelect.on('change', this.onFilterSelectChange, this);

                var option = createOPTION(filterSelect, null, 'Choose...', 'choose');
                option = createOPTION(filterSelect, null, 'Clear all conditions', 'clear');
                option = createOPTION(filterSelect, null, 'Running Instances', 'running');
                option = createOPTION(filterSelect, null, 'Stopped Instances', 'stopped');
                option = createOPTION(filterSelect, null, 'Edit...', 'edit');

                this.displayFilter();
            },

            /**
             * Response after the GatewayModel we're referring to is replaced.
             */
            afterModelChange: function(ev) {
                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);
                this.render();
            },

            /**
             * Response to making a gateway instance available (managed or not).
             */
            onGatewayAvailable: function(ev) {
                this.adjustForClusterColumn();

                var gatewayModel = ev.gatewayModel;

                var filter = this.get('filter');

                if (!filter || filter.match(gatewayModel)) {
                    this.get('dataTable').addRow(gatewayModel, null);
                }
            },

            /**
             * Called when we update the service dynamic data, as that affects
             * the gateway-level counts, which are incorrect for now.
             */
            onUpdateService: function(ev) {
                var serviceDynamicDataModel = ev.model;
                var serviceModel = serviceDynamicDataModel.get('serviceModel');
                var gatewayModel = serviceModel.get('gatewayModel');

                var filter = this.get('filter');

                var dataTable = this.get('dataTable');

                // Do we match the filter (if there is no filter, we do by definition)
                var match = (!filter || filter.match(gatewayModel));

                var index = dataTable.data.indexOf(gatewayModel);

                if (match) {
                    // we should (still) be in the table
                    if (index >= 0) {
                        var changes = {};
                        // Fields needs to match those in the monitor_gateways_view dataTableColumn specs.
                        var fields = ['totalCurrentSessions', 
                                      'totalBytesReceived', 'totalBytesSent'];
                        for (var i = 0; i < fields.length; i++) {
                            var field = fields[i];
                            changes[field] = gatewayModel.get(field);
                        }

                        dataTable.modifyRow(index, changes); 
                    } else {
                        dataTable.addRow(gatewayModel, null);
                    }
                } else {
                    if (index >= 0) {
                        dataTable.removeRow(gatewayModel);
                    }
                }
            },

            /**
             * Respond when the filter is changed, to both set the current-filter
             * label and do the actual filtering operation.
             */
            afterFilterChange: function() {
                this.displayFilter();
                this.doSearch();
            },

            /**
             * After a gateway instance changes (sets) its stopTime. 
             */
            afterStopTimeChange: function(ev) {
                this.adjustForClusterColumn();

                var gatewayModel = ev.target;

                var filter = this.get('filter');

                var dataTable = this.get('dataTable');

                // Do we match the filter (if there is no filter, we do by definition)
                var match = (!filter || filter.match(gatewayModel));

                var index = dataTable.data.indexOf(gatewayModel);

                if (match) {
                    // we should (still) be in the table
                    if (index >= 0) {
                        dataTable.modifyRow(index, {'stopTime': ev.newVal}); 
                    } else {
                        dataTable.addRow(gatewayModel, null);
                    }
                } else {
                    if (index >= 0) {
                        dataTable.removeRow(gatewayModel);
                    }
                }
            },

            // fired when the user changes the max number of rows to display.
            // XXX Commented out for 4.0.
            onMaxRowsChange: function(e) {
                var newMaxRows = parseInt(e.target.get('value'), 10);
                this.set('maxRows', newMaxRows);

                var dataTable = this.get('dataTable');
                if (dataTable.data.size() > newMaxRows) {
                    // XXX We need to do something here!
                    //alert("Reducing the datatable size is not implemented yet.");
                }            
            },

            // Handle the user selecting something on the Filters dropdown
            onFilterSelectChange: function(e) {
                var command = e.target.get('value')

                switch (command) {
                case 'choose':
                    // do nothing
                    break;
                case 'edit':
                    this.doFilterDisplay();
                    e.target.set('selectedIndex', 0);
                    break;
                case 'clear':
                    var filter = new AndFilter();
                    this.set('filter', filter);
                    e.target.set('selectedIndex', 0);
                    break;
                case 'running':
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'UNSET', ''));
                    this.set('filter', filter);
                    break;
                case 'stopped':
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'SET', ''));
                    this.set('filter', filter);
                    break;
                default:
                    break;
                }
            },

            /**
             * Render the entire gateways view.  We actually don't do anything
             * here, since we set up the datatable and render that specifically.
             */
            render: function() {
                return this;
            },

            /**
             * Invoke the dialog to let us configure filters.
             */
            doFilterDisplay: function() {
                var $this = this;
                var filterFieldDefinitions = this.get('fieldFieldDefinitions');
                if (!filterFieldDefinitions) {
                    filterFieldDefinitions = this.buildFilterFieldDefinitions();
                }

                this.get('filterPanel')
                    .display(this.get('model'), 
                             this.get('filter'),
                             filterFieldDefinitions,
                             function(filter) {
                                 $this.set('filter', filter);
                             }
                            );
            },

            displayFilter: function() {
                var filter = this.get('filter');
                var label = Y.one("#monitorGatewaysCurrentFilter");

                var filterText = (filter ? filter.toString() : "none");
                if (filterText === "") {
                    filterText = "none";
                }

                label.setHTML("<span>Current Filter: </span><span class=\"filterValue\">" + filterText + "</span>");
            },

            /**
             * Clear all current filters
             */
            clearFilters: function() {
                var filter = new AndFilter();
                this.set('filter', filter);
            },

            /**
             * Gather the entered values and run the search for gateways.
             */
            doSearch: function() {
                var filter = this.get('filter');

                // For the Gateways view, just run the filter. It doesn't really
                // help at all to separate the gatewayModels that pass any
                // gatewayModel filter first.
                var clusterModel = this.get('model');

                var gatewayModels = clusterModel.getGateways();  // may be null

                var dataTable = this.get('dataTable');

                if (dataTable.data.size() > 0) {
                    dataTable.data.reset();
                }

                if (gatewayModels) {
                    for (var i = 0; i < gatewayModels.length; i++) {
                        var gatewayModel = gatewayModels[i];
                        if (!filter || filter.match(gatewayModel)) {
                            dataTable.addRow(gatewayModel, null);
                        }
                    }
                }
            },

            /**
             * Given our 'filter' value, find a sub-filter in it with
             * the given field name, if any. If not found, return null.
             */
            findFilters: function(fieldName) {
                var filter = this.get('filter');
                return (filter ? filter.findFilters(fieldName) : null);
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#monitorGatewaysViewContainer');
                    }
                },

                // The objects that together make up the selection functionality
                // over gateawys. The idea is that we need to be able to gather
                // a list of all the gateways in a certain context, compare them
                // using the object stored here, and return a list of all those
                // that match the comparison.
                selectionCriterion: {
                    value: null
                },

                title: {
                    value: 'Monitoring : Gateways'
                },

                maxRows: {
                    value: 100
                },

                dataTable: {
                    value: null
                },

                filterFieldDefinitions: {
                    value: null
                },

                // The currently-assigned filter, as of the last 'Search' invocation.
                // We use this when things change to decide if a given gateway fits
                // (if new) or still fits (if being changed.)
                filter: {
                    value: null
                },

                cmenu: {
                    value: null
                },

                filterPanel: {
                    value: null // passed in on creation
                },

                firstTime: {
                    value: true
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'cluster-model', 'gateway-model', 'monitor-filter-panel']
});
