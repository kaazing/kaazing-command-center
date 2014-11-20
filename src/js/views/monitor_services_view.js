/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The view for monitoring services
 *
 * @module monitor-services-view
 */
YUI.add('monitor-services-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'monitorServicesView',
    CLUSTER_MEMBER_COLUMN_INDEX = 0;

    /**
     * The View for monitoring services.
     *
     * @class MonitorServicesView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.MonitorServicesView = Y.Base.create(
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

                // Listen for change events on the cluster model, which
                // will cause a complete re-render.
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
             * Callback from app as we're switching away from the view.
             * For us, turn off the drawing and updating.
             */
            hideViewCallback: function() {
                // More to add here later?
                return this;
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

                    this.on(Y.GatewayModel.prototype.ADD_SERVICE_EVENT, 
                            this.onAddService,
                            this);

                    this.on(Y.GatewayModel.prototype.REMOVE_SERVICE_EVENT, 
                            this.onRemoveService,
                            this);

                    this.on(Y.ServiceDynamicDataModel.prototype.UPDATE_EVENT, 
                            this.onUpdateService, 
                            this);

                    // Generally the ServiceModel only changes data in the dynamic data model.
                    // We're already listening for changes to that above. However, we also
                    // have the service change it's 'stopTime' when the gateway goes down
                    // (post-4.0 we may also allow the service itself to be stopped). At that
                    // point we also want to update/filter rows on the stopTime.
                    this.after('serviceModel:stopTimeChange',
                               this.afterStopTimeChange,
                               this);

                    // create a default filter for service instances that have no stopTime
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'UNSET', ''));
                    this.set('filter', filter);

                    // do this after set('filter') so we don't trigger an extra doSearch on start
                    this.after('filterChange', this.afterFilterChange, this);

                    // Define the service data table structure
                    var data = new Y.ModelList({model: Y.ServiceModel});

                    var dataTableColumns = [
                        /* XXX
                           For first version, leave 'action' out
                           { key: 'action',
                           label: '&nbsp;',
                           sortable: false,
                           allowHTML: true,
                           formatter: function(o) {
                           return '<button type="button" class="goButton"></button>';
                           },
                           className: 'monitorServicesAction'
                           },
                        */

                        { key: 'serviceLabel',
                          label: 'Service<br>&nbsp;',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:100,
                          formatter: function(o) {
                              var service = o.record;
                              return service.get('serviceLabel');
                          },
                          className: 'monitorServicesService'
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
                          className: 'monitorServicesStartTime'
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
                          className: 'monitorServicesStopTime'
                        },
                        { label: 'Current Sessions', 
                          children: 
                          [{ key: 'totalCurrentSessions',
                             label: 'Total',
                             sortable: true,
                             allowHTML: true,
                             emptyCellValue: "",
                             width:70,
                             formatter: function(o) {
                                 // DT seems to have a bug where when we set back to 0, it
                                 // thinks the value is "falsey" and considers it empty.
                                 // We can fix that by using a formatter.
                                 var service = o.record;
                                 return formatNumber(service.get('totalCurrentSessions'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('totalCurrentSessions'), 
                                                       b.get('totalCurrentSessions'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorServicesTotalCurrentSessions'
                           },
                           { key: 'totalCurrentNativeSessions',
                             label: 'Native',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:70,
                             formatter: function(o) {
                                 var service = o.record;
                                 return formatNumber(service.get('totalCurrentNativeSessions'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('totalCurrentNativeSessions'), 
                                                       b.get('totalCurrentNativeSessions'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorServicesTotalCurrentNativeSessions'
                           },
                           { key: 'totalCurrentEmulatedSessions',
                             label: 'Emulated',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:70,
                             formatter: function(o) {
                                 var service = o.record;
                                 return formatNumber(service.get('totalCurrentEmulatedSessions'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('totalCurrentEmulatedSessions'), 
                                                       b.get('totalCurrentEmulatedSessions'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorServicesTotalCurrentEmulatedSessions'
                           }]
                        },
                        { label: 'Cumulative Sessions', 
                          children: 
                          [{ key: 'totalCumulativeSessions',
                             label: 'Total',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:70,
                             formatter: function(o) {
                                 var service = o.record;
                                 return formatNumber(service.get('totalCumulativeSessions'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('totalCumulativeSessions'), 
                                                       b.get('totalCumulativeSessions'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorServicesTotalCumulativeSessions'
                           },
                           { key: 'totalCumulativeNativeSessions',
                             label: 'Native',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:70,
                             formatter: function(o) {
                                 var service = o.record;
                                 return formatNumber(service.get('totalCumulativeNativeSessions'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('totalCumulativeNativeSessions'), 
                                                       b.get('totalCumulativeNativeSessions'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorServicesTotalCumulativeNativeSessions'
                           },
                           { key: 'totalCumulativeEmulatedSessions',
                             label: 'Emulated',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:70,
                             formatter: function(o) {
                                 var service = o.record;
                                 return formatNumber(service.get('totalCumulativeEmulatedSessions'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('totalCumulativeEmulatedSessions'), 
                                                       b.get('totalCumulativeEmulatedSessions'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorServicesTotalCumulativeEmulatedSessions'
                           }]
                        },
                        { key: 'totalBytesReceived',
                          label: 'Bytes<br>Read',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var service = o.record;
                              return memorySizeString(service.get('totalBytesReceived'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalBytesReceived'), 
                                                    b.get('totalBytesReceived'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorServicesTotalBytesReceived'
                        },
                        { key: 'totalBytesReceivedThroughput',
                          label: 'Bytes Read<br>Throughput',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var service = o.record;
                              return memoryThroughputString(service.get('totalBytesReceivedThroughput'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalBytesReceivedThroughput'), 
                                                    b.get('totalBytesReceivedThroughput'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorServicesTotalBytesReceivedThroughput'
                        },
                        { key: 'totalBytesSent',
                          label: 'Bytes<br>Written',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var service = o.record;
                              return memorySizeString(service.get('totalBytesSent'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalBytesSent'), 
                                                    b.get('totalBytesSent'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorServicesTotalBytesSent'
                        },
                        { key: 'totalBytesSentThroughput',
                          label: 'Bytes Written<br>Throughput',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var service = o.record;
                              return memoryThroughputString(service.get('totalBytesSentThroughput'));
                          },
                          sortFn: function (a, b, desc) {
                              return compareNumbers(a.get('totalBytesSentThroughput'), 
                                                    b.get('totalBytesSentThroughput'),
                                                    desc,
                                                    0);
                          },
                          className: 'monitorServicesTotalBytesSentThroughput'
                        }
                    ];

                    var dataTable = new Y.DataTable({
                        columns: dataTableColumns,
                        data: data,
                        recordType: Y.ServiceModel,
                        editable: false,
                        highlightMode: 'row',
                        selectionMode: 'row',
                        selectionMulti: false
                    });
                    
                    dataTable.set('strings.emptyMessage','No services meet your selected criteria');

                    /* XXX For first version, leave out 'action' for services
                    // Have the button on each row handled by delegate
                    Y.delegate('click', 
                    this.handleActionButton, 
                    '#monitorServicesResults', 
                    'button.goButton');
                    */

                    this.set('dataTable', dataTable);

                    this.adjustForClusterColumn();

                    this.doSearch();

                    dataTable.render('#monitorServicesResults');
                    
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
                     ['totalBytesReceived', 'Bytes Read', 'numeric'],
                     ['totalBytesReceivedThroughput', 'Bytes Read Throughput', 'numeric'],
                     ['totalBytesSent', 'Bytes Written', 'numeric'],
                     ['totalBytesSentThroughput', 'Bytes Written Throughput', 'numeric'],
                     ['totalCumulativeEmulatedSessions', 'Cumul. Emulated Sessions', 'numeric'],
                     ['totalCumulativeNativeSessions', 'Cumul. Native Sessions', 'numeric'],
                     ['totalCumulativeSessions', 'Cumul. Total Sessions', 'numeric'],
                     ['totalCurrentEmulatedSessions', 'Current Emulated Sessions', 'numeric'],
                     ['totalCurrentNativeSessions', 'Current Native Sessions', 'numeric'],
                     ['totalCurrentSessions', 'Current Total Sessions', 'numeric'],
                     ['serviceLabel', 'Service', 'alpha'],
                     ['startTime', 'Start Time', 'numeric'], 
                     ['stopTime', 'Stop Time', 'numeric']
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

                this.set('filterFieldDefinitions', filterFieldDefinitions);

                return filterFieldDefinitions;
            },

/* XXX For 1st version, leave 'action' out
            handleActionButton: function(ev) {
                alert('In handleActionButton');
            },
*/

            adjustForClusterColumn: function() {
                var model = this.get('model');

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
                                                 var service = o.record;
                                                 return service.get('gatewayLabel');
                                             },
                                             className: 'monitorServicesGateway'
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

            initContextMenu: function(dataTable) {
                var $this = this;

                var cmenu = new Y.ContextMenuView({
                    container: Y.Node.create('<div id="cmenuView" class="cmenu" tabindex="1"></div>'),
                    app: this.get('app'),
                    menuItemTemplate: '<div class="yui3-contextmenu-menuitem" data-cmenu="{menuIndex}">{menuContent}</div>',

                    menuItems: [
                        {label:"Inspect", value:"i", handler: $this.handleInspectService}
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
                // on the ServiceDataProcessing instances, that the <tr> is no longer
                // attached to the table when we get here, so we can't just go up the
                // 'parentNode' chain. However, we can use the record ID from the <tr> 
                // and the table to find the real ServiceModel.
                var dataTable = this.get('dataTable');
                var cmenu = this.get('cmenu');

                var tr = cmenu.get('contextTarget');
                var recordId = tr.getAttribute('data-yui3-record');
                var serviceModel = dataTable.getRecord(recordId);  // from internal ModelList
                
                var menuIndex = +(ev.newVal.menuIndex);

                var menuItem = ev.newVal.menuItem;

                if (menuItem.handler) {
                    setTimeout(function() {menuItem.handler.call(this, serviceModel)}, 0);
                }
            },

            handleInspectService: function(serviceModel) {
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
                    .set('id', 'servicesMaxRowsSelect');
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
                option = createOPTION(filterSelect, null, 'Running Service Instances', 'running');
                option = createOPTION(filterSelect, null, 'Stopped Service Instances', 'stopped');
                option = createOPTION(filterSelect, null, 'Edit...', 'edit');

                this.displayFilter();
            },

            /**
             * Response after the ServiceModel we're referring to is replaced.
             */
            afterModelChange: function(ev) {
                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);
                this.render();
            },

            /**
             * Response to making a gateway instance available (managed or not).
             * Add the services that match our filter from the given gateway.
             */
            onGatewayAvailable: function(ev) {
                this.adjustForClusterColumn();

                var gatewayModel = ev.gatewayModel;

                var serviceModels = gatewayModel.getServices();

                if (serviceModels && serviceModels.length > 0) {
                    var filter = this.get('filter');
                    
                    for (var i = 0; i < serviceModels.length; i++) {
                        var serviceModel = serviceModels[i];

                        if (!filter || filter.match(serviceModel)) {
                            this.get('dataTable').addRow(serviceModel, null);
                        }
                    }
                }
            },

            /**
             * Response to adding a new service to a gateway.
             */
            onAddService: function(ev) {
                var serviceModel = ev.serviceModel;

                var filter = this.get('filter');

                if (!filter || filter.match(serviceModel)) {
                    this.get('dataTable').addRow(serviceModel, null);
                }
            },

            /**
             * Called when we update the dynamic data for a service instance. Make sure the
             * service is added/updated/removed as appropriate.
             */
            onUpdateService: function(ev) {
                var serviceDynamicDataModel = ev.model;
                var serviceModel = serviceDynamicDataModel.get('serviceModel');

                var filter = this.get('filter');

                var dataTable = this.get('dataTable');

                // Do we match the filter (if there is no filter, we do by definition)
                var match = (!filter || filter.match(serviceModel));

                var index = dataTable.data.indexOf(serviceModel);

                if (match) {
                    // we should (still) be in the table
                    if (index >= 0) {
                        var changes = {};
                        // Fields needs to match those in the monitor_services_view field specs.
                        var fields = ['totalCurrentSessions', 'totalCurrentNativeSessions', 
                                      'totalCurrentEmulatedSessions', 'totalCumulativeSessions',
                                      'totalCumulativeNativeSessions', 'totalCumulativeEmulatedSessions', 
                                      'totalBytesReceived', 'totalBytesSent'];
                        for (var i = 0; i < fields.length; i++) {
                            var field = fields[i];
                            changes[field] = serviceModel.get(field);
                        }

                        dataTable.modifyRow(index, changes); 
                    } else {
                        dataTable.addRow(serviceModel, null);
                    }
                } else {
                    if (index >= 0) {
                        dataTable.removeRow(serviceModel);
                    }
                }
            },

            /**
             * Response to removing an existing service from a gateway (we may never
             * actually end up doing this until we support live configuration).
             */
            onRemoveService: function(ev) {
                var serviceModel = ev.serviceModel;

                var dataTable = this.get('dataTable');
                if (dataTable.data.indexOf(serviceModel) >= 0) {
                    dataTable.removeRow(serviceModel, null);
                }
            },

            /**
             * After a service instance changes (sets) its stopTime.
             */
            afterStopTimeChange: function(ev) {
                this.adjustForClusterColumn();

                var serviceModel = ev.target;

                var filter = this.get('filter');

                var dataTable = this.get('dataTable');

                // Do we match the filter (if there is no filter, we do by definition)
                var match = (!filter || filter.match(serviceModel));

                var index = dataTable.data.indexOf(serviceModel);

                if (match) {
                    // we should (still) be in the table
                    if (index >= 0) {
                        dataTable.modifyRow(index, {'stopTime': ev.newVal}); 
                    } else {
                        dataTable.addRow(serviceModel, null);
                    }
                } else {
                    if (index >= 0) {
                        dataTable.removeRow(serviceModel);
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

            // fired when the user changes the max number of rows to display
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
             * Render the entire services view.  We actually don't do anything
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
                var filterFieldDefinitions = this.get('filterFieldDefinitions');
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
                var label = Y.one("#monitorServicesCurrentFilter");

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
             * Gather the entered values and run the search for services.
             */
            doSearch: function() {
                var dataTable = this.get('dataTable');

                if (dataTable.data.size() > 0) {
                    // Remove all the rows in the table, without generating a 'reset' event.
                    // If silent is false (the default), we run into a DT bug.
                    dataTable.data.reset({silent:true});
                }

                var clusterModel = this.get('model');

                var gatewayModels = clusterModel.getGateways();

                if (!gatewayModels) {
                    return;
                }

                var filter = this.get('filter');

                var subFilters = (filter && filter.getSubFilters());
                if (subFilters && subFilters.length == 0) {
                    subFilters = null;
                }

                loopGateways:
                for (var i = 0; i < gatewayModels.length; i++) {
                    var gatewayModel = gatewayModels[i];
                    
                    // check any gateway-level filters
                    if (subFilters) {
                        for (var f = 0; f < subFilters.length; f++) {
                            var subFilter = subFilters[f];
                            if (this.isGatewayFilter(subFilter)) {
                                if (!subFilter.match(gatewayModel)) {
                                    continue loopGateways;
                                }
                            }
                        }
                    }

                    // at this point gatewayModel matches

                    var serviceModels = gatewayModel.getServices();

                    if (!serviceModels) {
                        continue loopGateways;
                    }

                    loopServices:
                    for (var j = 0; j < serviceModels.length; j++) {
                        var serviceModel = serviceModels[j];

                        if (subFilters) {
                            for (var f = 0; f < subFilters.length; f++) {
                                var subFilter = subFilters[f];
                                if (!this.isGatewayFilter(subFilter)) {
                                    if (!subFilter.match(serviceModel)) {
                                        continue loopServices;
                                    }
                                }
                            }
                        }

                        dataTable.addRow(serviceModel, null);
                    }
                }
            },

            isGatewayFilter: function(filter) {
                return (filter.attribute === 'gatewayLabel');
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#monitorServicesViewContainer');
                    }
                },

                // The objects that together make up the selection functionality
                // over services. The idea is that we need to be able to gather
                // a list of all the services in a certain context, compare them
                // using the object stored here, and return a list of all those
                // that match the comparison.
                selectionCriterion: {
                    value: null
                },

                title: {
                    value: 'Monitoring : Services'
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
                // We use this when things change to decide if a given service fits
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
    requires: ['kaazing-view', 'cluster-model', 'gateway-model', 'service-model', 'monitor-filter-panel']
});
