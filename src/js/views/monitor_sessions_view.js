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
 * The view for monitoring sessions
 *
 * @module monitor-sessions-view
 */
YUI.add('monitor-sessions-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'monitorSessionsView',
    CLUSTER_MEMBER_COLUMN_INDEX = 1;

    /**
     * The View for monitoring sessions.
     *
     * @class MonitorSessionsView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.MonitorSessionsView = Y.Base.create(
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
             * Setup the first time when we're actually shown (or on a second or
             * later one, just set up the toolbar and return. We do NOT want to
             * listen for anything until we're actually shown the first time.
             */
            doDisplaySetup: function() {
                var $this = this;

                if (this.get('firstTime')) {
                    this.on(Y.GatewayModel.prototype.GATEWAY_AVAILABLE_EVENT, 
                            this.onGatewayAvailable,
                            this);

                    this.on(Y.GatewayModel.prototype.GATEWAY_UNAVAILABLE_EVENT, 
                            this.onGatewayUnavailable,
                            this);

                    this.on(Y.ServiceModel.prototype.ADD_SESSION_EVENT, 
                            this.onAddSession,
                            this);

                    this.on(Y.ServiceModel.prototype.REMOVE_SESSION_EVENT, 
                            this.onRemoveSession,
                            this);

                    this.on(Y.SessionDynamicDataModel.prototype.UPDATE_EVENT, 
                            this.onUpdateSession, 
                            this);

                    this.on(Y.SessionModel.prototype.CLOSE_SESSION_EVENT, 
                            this.onCloseSession, 
                            this);

                    // create a default filter for open sessions
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'UNSET', ''));
                    this.set('filter', filter);

                    // do this after set('filter') so we don't trigger an extra doSearch on start
                    this.after('filterChange', this.afterFilterChange, this);

                    // Define the session data table structure
                    var data = new Y.ModelList({model: Y.SessionModel});

                    var dataTableColumns = [
                        { key: 'action',
                          label: '&nbsp;',
                          sortable: false,
                          allowHTML: true,
                          width:20,
                          className: 'monitorSessionsAction' // see the 'action' field in SessionModel
                        },
                        { key: 'serviceLabel',
                          label: 'Service<br>&nbsp;',
                          sortable: true,
                          allowHTML: false,
                          emptyCellValue: "",
                          width:100,
                          className: 'monitorSessionsService'
                        },
                        { label: 'Meta-data',
                          children: 
                          [{ key: 'sessionId',
                             label: 'Id<br>&nbsp;',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:50,
                             className: 'monitorSessionsSessionId'
                           },
                           { key: 'startTime',
                             label: 'Start Time<BR>&nbsp;',
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
                             className: 'monitorSessionsStartTime'
                           },
                           { key: 'stopTime',
                             label: 'Stop Time<BR>&nbsp;',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:50,
                             formatter: function(o) {
                                 return formatTableTime(o, 'stopTime');
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('stopTime'), 
                                                       b.get('stopTime'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorSessionsCloseTime'
                           },
                           { key: 'sessionTypeName',
                             label: 'Type<BR>&nbsp;',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:80,
                             formatter: function(o) {
                                 var session = o.record;
                                 var typeName = session.get('sessionTypeName');
                                 var val = CC.Constants.PROTOCOL_DISPLAY_INFO[typeName];
                                 if (val) {
                                     val = val.label;
                                 } else {
                                     val = typeName;
                                 }
                                 return val;
                             },
                             className: 'monitorSessionsSessionType'
                           },
                           { key: 'sessionDirection',
                             label: 'Direction<BR>&nbsp;',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:80,
                             formatter: function(o) {
                                 var session = o.record;
                                 return session.get('sessionDirection');
                             },
                             className: 'monitorSessionsSessionDirection'
                           }
                          ]
                        },
                        { label: 'Performance (bytes)',
                          children: 
                          [{ key: 'readBytes',
                             label: 'Read<br>&nbsp;',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:80,
                             formatter: function(o) {
                                 var session = o.record;
                                 return memorySizeString(session.get('readBytes'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('readBytes'), 
                                                       b.get('readBytes'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorSessionsBytesRead'
                           },
                           { key: 'readBytesThroughput',
                             label: 'Read Thpt<br>(bytes/sec)',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:100,
                             formatter: function(o) {
                                 var session = o.record;
                                 return formatFloat(session.get('readBytesThroughput'), 3);
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('readBytesThroughput'), 
                                                       b.get('readBytesThroughput'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorSessionsBytesReadThpt'
                           },
                           { key: 'writtenBytes',
                             label: 'Written<br>&nbsp;',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:80,
                             formatter: function(o) {
                                 var session = o.record;
                                 return memorySizeString(session.get('writtenBytes'));
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('writtenBytes'), 
                                                       b.get('writtenBytes'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorSessionsBytesWritten'
                           },
                           { key: 'writtenBytesThroughput',
                             label: 'Written Thpt<br>(bytes/sec)',
                             sortable: true,
                             allowHTML: false,
                             emptyCellValue: "",
                             width:100,
                             formatter: function(o) {
                                 var session = o.record;
                                 return formatFloat(session.get('writtenBytesThroughput'), 3);
                             },
                             sortFn: function (a, b, desc) {
                                 return compareNumbers(a.get('writtenBytesThroughput'), 
                                                       b.get('writtenBytesThroughput'),
                                                       desc,
                                                       0);
                             },
                             className: 'monitorSessionsBytesWrittenThpt'
                           }
                          ]
                        },
                        { key: 'principals',
                          label: 'Principals<BR>&nbsp;',
                          sortable: true,
                          allowHTML: true,
                          emptyCellValue: "",
                          width:80,
                          formatter: function(o) {
                              var session = o.record;
                              var value = session.get('principals');
                              // principals is a map, if anything
                              if (isEmptyObject(value)) {
                                  return "";
                              }

                              var valueStr = "";

                              for (var principalName in value) {
                                  if (value.hasOwnProperty(principalName)) {
                                      if (valueStr !== "") {
                                          valueStr += '<BR>';
                                      }

                                      var principalClass = value[principalName];

                                      // convert the principal class to something a little
                                      // nicer to look at. For various classes, we know
                                      // what the class name is.
                                      if (principalClass.startsWith("com.kaazing.gateway.server.auth.config.parse")) {
                                          principalClass = principalClass.substring(principalClass.lastIndexOf(".") + 1);
                                          if (principalClass.startsWith("Default")) {
                                              principalClass = principalClass.substring(7);
                                          }
                                          if (principalClass.endsWith("Config")) {
                                              principalClass = principalClass.substring(0, principalClass.length - 6);
                                          }
                                      } else {
                                          // some unknown class--we'll just show the last part
                                          principalClass = principalClass.substring(principalClass.lastIndexOf(".") + 1);
                                      }

                                      valueStr += ('<b>' + principalClass + "</b>:&nbsp;&nbsp;" + principalName);
                                  }
                              }

                              return valueStr;
                          },
                          className: 'monitorSessionsPrincipalsType'
                        },
                    ];

                    var dataTable = new Y.DataTable({
                        columns: dataTableColumns,
                        data: data,
                        recordType: Y.SessionModel,
                        editable: false,
                        highlightMode: 'row',
                        selectionMode: 'row',
                        selectionMulti: false
                    });

                    dataTable.set('strings.emptyMessage','No sessions meet your selected criteria');

                    // Have the button on each row handled by delegate
                    Y.delegate('click', 
                               this.handleActionButton, 
                               '#monitorSessionsResults', 
                               'button.goButton',
                               this);

                    this.set('dataTable', dataTable);

                    this.adjustForClusterColumn();

                    this.doSearch();

                    dataTable.render('#monitorSessionsResults');

                    // force a height reset so we get the correct height
                    // XXX Not sure the following actually does anything useful.
                    dataTable.set('height', this.desiredDataTableHeight());
                    
                    // XXX Do something else to allow us to resize the
                    // dataTable when we're not the active view.
                    Y.one('win').on('resize', function() {
                        if ($this.isActiveView()) {
                            var desiredHeight = $this.desiredDataTableHeight();
                            dataTable.set('height', desiredHeight);
                        }
                    });

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
                     ['readBytes', 'Bytes Read', 'numeric'],
                     ['readBytesThroughput', 'Bytes Read Throughput', 'numeric'],
                     ['writtenBytes', 'Bytes Written', 'numeric'],
                     ['writtenBytesThroughput', 'Bytes Written Throughput', 'numeric'],
                     ['sessionTypeName', 'Session Type', 'alpha'],
                     ['sessionDirection', 'Session Direction', 'alpha'],
                     ['principals', 'Principals', 'alpha'],
                     ['localAddress', 'Local Address', 'alpha'],
                     ['serviceLabel', 'Service', 'alpha'],
                     ['sessionId', 'Session Id', 'numeric'],
                     ['startTime', 'Start Time', 'numeric'],
                     ['stopTime', 'Stop Time', 'numeric']
                    ]

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

            desiredDataTableHeight: function() {
                var height = this.get('container').get('clientHeight');
                return height - 95;
            },

            handleActionButton: function(ev) {
                var $this = this;

                var node = Y.one("#monitorSessionsMenu");

                if (!node) {
                    // create the menu
                    var htmlNode = Y.one("html");

                    node = createDIV(htmlNode, 'popupMenu')
                        .set('id', 'monitorSessionsMenu');

                    // Attach functionality to close the menu
                    // when we mouse outside. 
                    // XXX may need to add key support, too.
                    node.on('mousedownoutside', function() {
                        this.hide();
                    });

                    // Have a single handler for all the items.
                    node.delegate('click', 
                                  this.handleSessionOperation,
                                  'a',   // links in the menu
                                  this,
                                  node);

                    // the containing list
                    var ul = createUL(node);
                    
                    // the menu entries
                    var li = createLI(ul);
                    var link = createLINK(li, '#')
                        .set('text', 'Close Session') // XXX get from resource later
                        .setAttribute('command', 'close');
                }

                node.setStyle('left', ev.clientX + 10)
                    .setStyle('top',  ev.clientY);
                node.setAttribute('instanceKey', ev.target.getAttribute('instanceKey'));
                node.setAttribute('serviceId', ev.target.getAttribute('serviceId'));
                node.setAttribute('sessionId', ev.target.getAttribute('sessionId'));
                node.show();
            },

            /**
             * Handle invocation of the session operation
             */
            handleSessionOperation: function(ev, node) {
                ev.stopPropagation();
                Y.one('#monitorSessionsMenu').hide();

                if (!confirm("Are you sure you want to close the selected session?")) {
                    return;
                }

                var instanceKey = node.getAttribute('instanceKey');
                var serviceId = parseInt(node.getAttribute('serviceId'));
                var sessionId = parseInt(node.getAttribute('sessionId'));
                var command = ev.target.getAttribute('command');

                var clusterModel = this.get('model');

                var gatewayModel = clusterModel.findGatewayModelByInstanceKey(instanceKey);

                if (!gatewayModel) {
                    // somehow we've lost the gateway model. Maybe it closed?
                    alert("Could not find the selected gateway!");
                    return;
                }

                if (command === 'close') {
                    gatewayModel.get('mngtApi').closeSession(serviceId, sessionId);
                } else {
                    alert("unknown command '" + command + "' selected");
                }
            },

            adjustForClusterColumn: function() {
                var model = this.get('model');

                var dataTable = this.get('dataTable');
                
                if (dataTable) {
                    var columns = dataTable.get('columns');

                    // Add the Cluster Member column if necessary and
                    // we don't already have it. Column 0 is the Action 
                    // column, column 1 is the Cluster Member column or
                    // the Service column if not a cluster.
                    if (this.isCluster()) {
                        if (columns[CLUSTER_MEMBER_COLUMN_INDEX].key !== 'gatewayLabel') {
                            columns.splice(CLUSTER_MEMBER_COLUMN_INDEX,
                                           0, 
                                           { key: 'gatewayLabel',
                                             label: 'Cluster<br>Member',
                                             sortable: true,
                                             allowHTML: true,
                                             emptyCellValue: "",
                                             width:100,
                                             formatter: function(o) {
                                                 var session = o.record;
                                                 return session.get('gatewayLabel');
                                             },
                                             className: 'monitorSessionsGateway'
                                           });
                            dataTable.set('columns', columns); // force re-render
                        }
                    } else {
                        if (columns[CLUSTER_MEMBER_COLUMN_INDEX].key === 'gatewayLabel') {
                            // remove the Cluster Member column if we're now
                            // not known to be a cluster.
                            columns.splice(CLUSTER_MEMBER_COLUMN_INDEX, 1);
                            dataTable.set('columns', columns); // force re-render
                        }
                    }
                }
            },

            handleCloseSession: function(sessionModel) {
                if (confirm("Are you sure you want to close session ID " + 
                            sessionModel.get('sessionId') + "?")) {
                    sessionModel.startClose();
                }
            },

            handleInspectSession: function(sessionModel) {
                // XXX Do something later when we hook this to the UI.
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
                    .set('id', 'sessionsMaxRowsSelect');
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
                option = createOPTION(filterSelect, null, 'Open Sessions', 'open');
                option = createOPTION(filterSelect, null, 'Closed Sessions', 'closed');
                option = createOPTION(filterSelect, null, 'Edit...', 'edit');

                this.displayFilter();
            },

            /**
             * Response after the ClusterModel we're referring to is replaced.
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

                // Unmanaged gateways won't have any sessions, but we can just use
                // the same code for both managed and unmanaged.
                var serviceModels = gatewayModel.getServices();

                if (serviceModels && serviceModels.length > 0) {
                    var filter = this.get('filter');
                    
                    for (var i = 0; i < serviceModels.length; i++) {
                        var serviceModel = serviceModels[i];
                        var sessionModels = serviceModel.getSessions();

                        if (sessionModels && sessionModels.length > 0) {
                            for (var j = 0; j < sessionModels.length; j++) {
                                var sessionModel = sessionModels[j];

                                if (!filter || filter.match(sessionModel)) {
                                    this.addRow(sessionModel, null);
                                }
                            }
                        }
                    }
                }
            },

            /**
             * Response to making a gateway unavailable.
             */
            onGatewayUnavailable: function(ev) {
                // XXX What should we do here? Remove all the
                // sessions for the given gateway? Mark the
                // sessions as from a non-available gateway?
                // Something else?

                this.adjustForClusterColumn();
            },

            /**
             * Response to adding a new session to a service.
             */
            onAddSession: function(ev) {
                var sessionModel = ev.sessionModel;

                var filter = this.get('filter');

                if (!filter || filter.match(sessionModel)) {
                    this.addRow(sessionModel, null);
                }
            },

            /**
             * Called when we update a session's dynamic data. Make sure the
             * session is added/updated/removed as appropriate.
             */
            onUpdateSession: function(ev) {
                var sessionDynamicDataModel = ev.model;
                var sessionModel = sessionDynamicDataModel.get('sessionModel');

                var filter = this.get('filter');

                var dataTable = this.get('dataTable');

                // Do we match the filter (if there is no filter, we do by definition)
                var match = (!filter || filter.match(sessionModel));

                var index = dataTable.data.indexOf(sessionModel);

                if (match) {
                    // we should (still) be in the table
                    if (index >= 0) {
                        var changes = {};
                        var fields = ['readBytes', 'readBytesThroughput', 
                                      'writtenBytes', 'writtenBytesThroughput'];
                        for (var i = 0; i < fields.length; i++) {
                            var field = fields[i];
                            changes[field] = sessionModel.get(field);
                        }

                        this.modifyRow(index, changes); 
                    } else {
                        this.addRow(sessionModel, null);
                    }
                } else {
                    if (index >= 0) {
                        this.removeRow(sessionModel);
                    }
                }
            },

            /**
             * Response to closing a session
             */
            onCloseSession: function(ev) {
                var sessionModel = ev.sessionModel;

                var filter = this.get('filter');

                var dataTable = this.get('dataTable');

                // Do we now match the filter (if there is no filter, we do by definition)
                var match = (!filter || filter.match(sessionModel));

                var index = dataTable.data.indexOf(sessionModel);

                if (match) {
                    // we should (still) be in the table
                    if (index >= 0) {
                        this.modifyRow(index, {state : sessionModel.get('state')}); 
                    } else {
                        this.addRow(sessionModel, null);
                    }
                } else {
                    if (index >= 0) {
                        this.removeRow(sessionModel);
                    }
                }
            },

            /**
             * Response to removing an existing session from a service (we should only
             * end up doing this when we're culling sessions that are closed and too old.)
             */
            onRemoveSession: function(ev) {
                var sessionModel = ev.sessionModel;

                var dataTable = this.get('dataTable');
                if (dataTable.data.indexOf(sessionModel) >= 0) {
                    this.removeRow(sessionModel, null);
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
                case 'open':
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'UNSET', ''));
                    this.set('filter', filter);
                    break;
                case 'closed':
                    var filter = new AndFilter();
                    filter.addFilter(new NumericFilter('stopTime', 'SET', ''));
                    this.set('filter', filter);
                    break;
                default:
                    break;
                }
            },

            /**
             * Render the entire sessions view.  We actually don't do anything
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
                var label = Y.one("#monitorSessionsCurrentFilter");

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
             * Gather the entered values and run the search for sessions.
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
                                if (this.isServiceFilter(subFilter)) {
                                    if (!subFilter.match(serviceModel)) {
                                        continue loopServices;
                                    }
                                }
                            }
                        }

                        // at this point serviceModel matches

                        var sessionModels = serviceModel.getSessions();

                        if (!sessionModels) {
                            continue loopServices;
                        }

                        loopSessions:
                        for (var k = 0; k < sessionModels.length; k++) {
                            var sessionModel = sessionModels[k];

                            // check any session-level filters
                            if (subFilters) {
                                for (var f = 0; f < subFilters.length; f++) {
                                    var subFilter = subFilters[f];
                                    if (!this.isGatewayFilter(subFilter) && 
                                        !this.isServiceFilter(subFilter)) {
                                        if (!subFilter.match(sessionModel)) {
                                            continue loopSessions;
                                        }
                                    }
                                }
                            }

                            // at this point, sessionModel matches

                            this.addRow(sessionModel, null);
                        }
                    }
                }
            },

            addRow: function(rowData, config) {
                this.get('dataTable').addRow(rowData, config);
                var i = 0;
            },

            modifyRow: function(index, changes) {
                this.get('dataTable').modifyRow(index, changes);
            },

            removeRow: function(dataRow) {
                this.get('dataTable').removeRow(dataRow);
            },

            isGatewayFilter: function(filter) {
                return (filter.attribute === 'gatewayLabel');
            },

            isServiceFilter: function(filter) {
                return (filter.attribute === 'serviceLabel');
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#monitorSessionsViewContainer');
                    }
                },

                // The objects that together make up the selection functionality
                // over sessions. The idea is that we need to be able to gather
                // a list of all the sessions in a certain context, compare them
                // using the object stored here, and return a list of all those
                // that match the comparison.
                selectionCriterion: {
                    value: null
                },

                title: {
                    value: 'Monitoring : Sessions'
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
                // We use this when things change to decide if a given session fits
                // (if new) or still fits (if being changed.)
                filter: {
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
    requires: ['kaazing-view', 'cluster-model', 'gateway-model', 'service-model', 'session-model', 'monitor-filter-panel']
});
