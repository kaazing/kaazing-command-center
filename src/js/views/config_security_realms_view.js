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
 * The view for gateway/cluster security realms.
 *
 * @module config-security-realms-view
 */
YUI.add('config-security-realms-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'configSecurityRealmsView';

    /**
     * The View for displaying information about the various security realms
     * in a gateway/cluster. As with Services, we 'coalesce' where the realms
     * match across gateways
     *
     * @class ConfigSecurityRealmsView
     * @extends Y.KaazingView
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ConfigSecurityRealmsView = Y.Base.create(
        NAME, 
        Y.KaazingView,
        [],
        {
            initializer: function() {
                var model = this.get('model');

                model && model.addTarget(this);

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
                    this.after('selectedRealmConfigChange', 
                               this.afterSelectedRealmConfigChange, 
                               this);

                    // When a gateway instance becomes available, we need to 
                    // recompute and re-render if we are also connected to it.
                    this.on(Y.GatewayModel.prototype.GATEWAY_AVAILABLE_EVENT,
                            this.onGatewayAvailable, 
                            this);

                    // We don't actually care if a gateway becomes unavailable 
                    // (we'll still use its config) until it actually sets a 
                    // stopTime (at which point we cannot use it anymore).
                    this.after('gatewayModel:stopTimeChange',
                               this.afterStopTimeChange,
                               this);

                    this.updateClusterRealmConfigs();
                    
                    this.set('firstTime', false);
                }

                this.render();
            },

            /**
             * Response after the ClusterModel we're referring to is replaced.
             */
            afterModelChange: function(ev) {
                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);
                this.updateClusterRealmConfigs();
                this.render();
            },

            onGatewayAvailable: function(ev) {
                this.updateClusterRealmConfigs();
                this.render();
            },

            afterStopTimeChange: function(ev) {
                this.updateClusterRealmConfigs();
                this.render();
            },

            afterSelectedRealmConfigChange: function(ev) {
                this.render();
            },
            
            updateClusterRealmConfigs: function() {
                var clusterRealmConfigs = this.buildRealmConfigList();  // array of arrays
                this.set('clusterRealmConfigs', clusterRealmConfigs);
            },

            /**
             * Given the 'usable' gatewayModels the cluster contains, build an 
             * array of arrays of 'equal' RealmConfigModels across all the gateways.
             */
            buildRealmConfigList: function() {
                var realmConfigLists = [];  // array of arrays

                var i, j, realmName;

                var gatewayModels = this.get('model').getUsableGateways();

                if (gatewayModels && gatewayModels.length > 0) {
                    for (i = 0; i < gatewayModels.length; i++) {
                        var gatewayModel = gatewayModels[i];

                        // if usable, we will have the gatewayConfig.
                        var gatewayConfig = gatewayModel.get('gatewayConfig');

                        var securityConfig = gatewayConfig.get('securityConfig');
                        if (!securityConfig) {
                            continue;
                        }

                        var realmConfigs = securityConfig.get('realmConfigs');
                        if (!realmConfigs) {
                            continue;
                        }

                        for (realmName in realmConfigs) {
                            if (realmConfigs.hasOwnProperty(realmName)) {
                                var realmConfig = realmConfigs[realmName];

                                var found = false;

                                for (j = 0; j < realmConfigLists.length; j++) {
                                    var realmConfigList = realmConfigLists[j];
                                    if (realmConfig.equals(realmConfigList[0])) {
                                        found = true;
                                        realmConfigList.push(realmConfig);
                                        break;
                                    }
                                }

                                if (!found) {
                                    realmConfigLists.push([realmConfig]);
                                }
                            }
                        }
                    }

                    realmConfigLists.sort(function(realmConfigList1,realmConfigList2) {
                        var config1 = realmConfigList1[0];
                        var config2 = realmConfigList2[0];
                        return config1.sortCompare(config2);
                    });
                }

                return realmConfigLists;
            },

            /**
             * Render the entire view
             */
            render: function() {
                if (this.isActiveView()) {
                    removeAllChildren(this.get('container').one('#configSecurityRealmsData'));
                    this.renderToolbar();
                    this.renderData();
                }

                return this;
            },

            /**
             * Render our data in the toolbar. We may need to re-render this
             * each time because the list of services may change.
             */
            renderToolbar: function() {
                var $this = this;

                var clusterRealmConfigs = this.get('clusterRealmConfigs');

                var toolbar = this.get('toolbar');
                removeAllChildren(toolbar);

                var selector = createSELECT(toolbar, 'toolbarSelect');

                var option = createOPTION(selector, null, 'Select a realm...')
                    .set('selected', false);

                if (clusterRealmConfigs && clusterRealmConfigs.length > 0) {
                    // Remember, we have LISTS of "equal" realm configs here. Get the
                    // labels of the first of each and sort them.
                    clusterRealmConfigs.sort(function(rcList1, rcList2) {
                        var l1 = rcList1[0].get('name').toLowerCase();
                        var l2 = rcList2[0].get('name').toLowerCase();
                        if (l1 == l2) {
                            return 0;
                        } else {
                            return (l1 < l2 ? -1 : 1);
                        }
                    });

                    var src = this.get('selectedRealmConfig');

                    for (var i = 0; i < clusterRealmConfigs.length; i++) {
                        var realmConfigList = clusterRealmConfigs[i];
                        var realmConfigModel = realmConfigList[0];
                        var label = realmConfigModel.get('name');

                        option = createOPTION(selector, null, label);

                        if (realmConfigModel.equals(src)) {
                            option.set('selected', true);
                        }
                    }

                    selector.after('change', function(ev) {
                        var select = ev.target;
                        var selIndex = select.get('selectedIndex'); // the selector is 'this' here
                        if (selIndex <= 0) {
                            if ($this.get('selectedRealmConfig') !== null) {
                                $this.set('selectedRealmConfig', null);
                            }
                            
                            return;
                        } 

                        // remember to subtract 1 from the selection because we have the
                        // 'Select a realm' label as index 0.
                        var realmConfigModel = null;

                        // Figure out which 'equal' realm configs array our selected
                        // realm config matches to.
                        var clusterRealmConfigs = $this.get('clusterRealmConfigs');
                        if (clusterRealmConfigs && clusterRealmConfigs.length >= selIndex) {
                            var clusterRealmConfig = clusterRealmConfigs[selIndex - 1];
                            // clusterRealmConfig itself is an array
                            if (clusterRealmConfig.length > 0) {
                                realmConfigModel = clusterRealmConfig[0];
                            }  // somehow array has gone to 0.
                        }

                        if ($this.get('selectedRealmConfig') !== realmConfigModel) {
                            $this.set('selectedRealmConfig', realmConfigModel);
                        }
                    });
                } else {
                    // somehow we 'lost' the realm configs (perhaps because a 
                    // gateway went away).
                    if (this.get('selectedRealmConfig') !== null) {
                        this.set('selectedRealmConfig', null);
                    }
                }
            },

            /**
             * Render the data fields, for whatever RealmConfigModel happens 
             * to be selected. If there is none selected, clear all data fields.
             */
            renderData: function() {
                var container = this.get('container');
                var dataDiv = container.one('#configSecurityRealmsData');

                removeAllChildren(dataDiv);

                var src = this.get('selectedRealmConfig');

                if (!src) {
                    return;
                }

                var $this = this;

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configSecuritySection');

                var header = createH(section, 3)
                    .setHTML('Realm: <SPAN class="configSecurityRealmName">' + 
                             src.get('name') + 
                             '</SPAN>'); 

                // The basic details
                var table = createTABLE(section, 'configSecurityRealmTable');

                // Figure out which list of equal clusterRealmConfigs our selected
                // config belongs to. We know at least one does contain it.
                var clusterRealmConfigs = this.get('clusterRealmConfigs');

                var rcArray;

                for (var i = 0; i < clusterRealmConfigs.length; i++) {
                    rcArray = clusterRealmConfigs[i];
                    if (rcArray.indexOf(src) >= 0) {
                        // found the array that matches our selected config
                        break;
                    }
                }

                // Get the list of serviceConfigModels that each realm in the 
                // array belongs to. Use those to construct a list of matching
                // services between gateways.
                var serviceConfigArrays = [];

                for (var i = 0; i < rcArray.length; i++) {
                    var realmConfig = rcArray[i];

                    var serviceConfigs = realmConfig.get('serviceConfigs');
                    if (serviceConfigs) {
                        for (var j = 0; j < serviceConfigs.length; j++) {
                            var serviceConfig = serviceConfigs[j];

                            // go through the service config arrays already present
                            // in the array above and match them.
                            var found = false;

                            for (var k = 0; k < serviceConfigArrays.length; k++) {
                                var scArray = serviceConfigArrays[k];

                                if (serviceConfig.equals(scArray[0])) {
                                    // found the match
                                    scArray.push(serviceConfig);
                                    break;
                                }
                            }

                            if (!found) {
                                // doesn't match any other service configs (yet).
                                // Push a new array.
                                serviceConfigArrays.push([serviceConfig]);
                            }
                        }
                    }
                }

                // At this point, serviceConfigArrays contains arrays of 'equal'
                // service configs. Show one link from each, with the link pointing
                // to the realm page. 
                var serviceConfigLinkStr = "";

                // Delegate the handling for the anchors in this
                if (serviceConfigArrays.length > 0) {

                    // First, sort the arrays within arrays by
                    // the label that will be displayed.
                    // 
                    serviceConfigArrays.sort(function(scArray1, scArray2) {
                        var label1 = scArray1[0].get('label').toLowerCase();
                        var label2 = scArray2[0].get('label').toLowerCase();
                        if (label1 < label2) {
                            return -1;
                        } else {
                            return (label1 === label2 ? 0 : 1);
                        }
                    });

                    for (var i = 0; i < serviceConfigArrays.length; i++) {
                        var serviceConfig = serviceConfigArrays[i][0];
                        if (i > 0) {
                            serviceConfigLinkStr += ", ";
                        }

                        // The class in the following is only for allowing delegation here.
                        serviceConfigLinkStr += ('<A href="javascript:void(0);" ' + 
                                                 'class="serviceLink" ' + 
                                                 'index="' + i + '">' + 
                                                 serviceConfig.get('label') + 
                                                 '</A>');
                    }
                }

                // Delegate the handling of any service links within this table
                // at the table level.
                table.delegate('click', $this.handleServiceLink, '.serviceLink', $this, serviceConfigArrays);

                // Figure out which gateways the realm is defined in.
                var definedInGateways = [];
                var gatewayModel;

                for (var j = 0; j < rcArray.length; j++) {
                    gatewayModel = rcArray[j].get('gatewayModel');

                    if (definedInGateways.indexOf(gatewayModel) == -1) {
                        definedInGateways.push(gatewayModel);
                    }
                }

                var definedInStr = definedInGateways.map(function(elt, index, arr) {
                    return elt.get('gatewayLabel');
                }).sort().join(', ');

                this.possiblyCreateDetailTableRow(table, 
                                                  'Defined In:', // XXX replace later w/lookup
                                                  definedInStr);

                this.possiblyCreateDetailTableRow(table, 
                                                  'Used In Services:', // XXX replace later w/lookup
                                                  serviceConfigLinkStr);

                this.possiblyCreateDetailTableRow(table, 
                                                  'Description:', // XXX replace later w/lookup
                                                  src.get('description'));

                this.possiblyCreateDetailTableRow(table, 
                                                  'Authorization Mode:', // XXX replace later w/lookup
                                                  src.get('authorizationMode'));

                this.possiblyCreateDetailTableRow(table, 
                                                  'HTTP Challenge Scheme:', // XXX replace later w/lookup
                                                  src.get('httpChallengeScheme'));

                this.possiblyCreateDetailTableRow(table, 
                                                  'Session Timeout:', // XXX replace later w/lookup
                                                  src.get('sessionTimeout'));

                var httpCookieNames = src.get('httpCookieNames');
                var httpCookieNamesStr = (httpCookieNames ? httpCookieNames.sort().join(',<br>') : "");

                this.possiblyCreateDetailTableRow(table, 
                                                  'HTTP Cookie Names:', // XXX replace later w/lookup
                                                  httpCookieNamesStr);

                var httpHeaders = src.get('httpHeaders');
                var httpHeadersStr = (httpHeaders ? httpHeaders.sort().join(',<br>') : "");

                this.possiblyCreateDetailTableRow(table, 
                                                  'HTTP Headers:', // XXX replace later w/lookup
                                                  httpHeadersStr);

                // HTTP Query Params
                var httpQueryParams = src.get('httpQueryParams');
                var httpQueryParamsStr = (httpQueryParams ? httpQueryParams.sort().join(',<br>') : "");

                this.possiblyCreateDetailTableRow(table, 
                                                  'HTTP Query Parameters:', // XXX replace later w/lookup
                                                  httpQueryParamsStr);

                // User Principal Classes
                var userPrincipalClasses = src.get('userPrincipalClasses');
                var userPrincipalClassesStr = 
                    (userPrincipalClasses ? userPrincipalClasses.sort().join('<br>') : "");

                

                this.possiblyCreateDetailTableRow(table, 
                                                  'User Principal Classes:', // XXX replace later w/lookup
                                                  userPrincipalClassesStr);

                // Login Modules is an array of objects, each with
                // type (login module name)
                // success (enum of success requirement)
                // options (object of name/value pairs).
                // We're going to show them as a sub-table.
                var loginModules = src.get('loginModules');
                if (loginModules && loginModules.length > 0) {
                    var loginModuleContent = Y.one(Y.config.doc.createDocumentFragment());

                    var loginModuleTable = createTABLE(loginModuleContent, 'configDataTable');
                    loginModuleTable.set('id', 'configSecurityLoginModuleTable');

                    var tr = createTR(loginModuleTable);
                    var th = createTH(tr, 'configSecurityLoginModuleType')
                        .set('text', 'Type');

                    th = createTH(tr, 'configSecurityLoginModuleSuccess')
                        .set('text', 'Success');

                    th = createTH(tr)
                        .set('text', 'Options');

                    for (var j = 0; j < loginModules.length; j++) {
                        var value = "";
                        var loginModule = loginModules[j];

                        var type = loginModule.type;

                        // convert the type class to something a little
                        // nicer to look at. For various classes, we know
                        // what the class name is.
                        if (type.startsWith("org.kaazing.gateway.security.auth.")) {
                            type = type.substring(type.lastIndexOf(".") + 1);
                            if (type.endsWith("LoginModule")) {
                                type = type.substring(0, type.indexOf("LoginModule"));
                                type = type.toLowerCase();
                            }
                        }

                        var options = loginModule.options;
                        var optionsStr = "";
                        
                        if (options && !isEmptyObject(options)) {
                            for (var prop in options) {
                                if (options.hasOwnProperty(prop)) {
                                    if (optionsStr !== "") {
                                        optionsStr += "<br>";
                                    }
                                    optionsStr += "<b>" + prop + ": </b>" + options[prop];
                                }
                            }
                        }

                        this.createLoginModuleRow(loginModuleTable, type, loginModule.success, optionsStr);
                    }

                    this.possiblyCreateDetailTableRow(table, 
                                                      'Login Modules:', // XXX replace later w/lookup
                                                      loginModuleContent);
                }

                // Now that the pieces are assembled, set our container contents
                dataDiv.setHTML(content);

                return this;
            },

            /**
             * Possibly create a row in the 'detail' entries. These are 
             * simpler than the sub-tables for login modules.
             */
            possiblyCreateDetailTableRow: function(table, label, value) {
                if (isEmptyValue(value)) {
                    return;
                }

                var tr = createTR(table);
                var td = createTD(tr, 'configSecurityDetailLabel')
                    .setHTML(Y.Escape.html(label));         // XXX replace later with lookup

                td = createTD(tr, 'securityDataValue')
                    .setHTML(value);
            },

            /**
             * Render a line in a login module sub-table.
             * type and success are strings. 
             * options is a stringified array (with possible HTML tags in it
             * to do things like make newlines)
             */
            createLoginModuleRow: function(table, type, success, options) {
                var tr = createTR(table);
                var td = createTD(tr, 'securityDataValue')
                    .set('text', type)         // XXX replace later with lookup
                    .addClass('configSecurityLoginModuleType');

                td = createTD(tr, 'securityDataValue')
                    .set('text', success)
                    .addClass('configSecurityLoginModuleSuccess');

                td = createTD(tr, 'securityDataValue')
                    .setHTML(options);
            },

            handleServiceLink: function(ev, serviceConfigArrays) {
                var target = ev.target;  // the link
                var index = target.getAttribute('index');  // position in config arrays list
                var scArray = serviceConfigArrays[index];
                var serviceConfig = scArray[0];
                var gatewayModel = serviceConfig.get('gatewayModel');
                var connectionUrl = gatewayModel.get('connectionUrl');
                var serviceId = serviceConfig.get('serviceId');
                ev.halt(true);
                this.get('app').save('/config/services?connectionUrl=' + connectionUrl +
                                     '&serviceId=' + serviceId);
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#configSecurityRealmsViewContainer');
                    }
                },

                title: {
                    value: 'Configuration : Security : Realms'
                },

                toolbar: {
                    value: null
                },

                /**
                 * The latest set of cluster-level realm configs, updated
                 * after each change to the set of gateways.
                 */
                clusterRealmConfigs: {
                    value: null
                },

                /**
                 * The realm config to display.
                 */
                selectedRealmConfig: {
                    value: null
                },

                firstTime: {
                    value: true
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'security-config-model']
});
