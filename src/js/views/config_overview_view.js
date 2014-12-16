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
 * The view for the config overview graphic display. The gateways being displayed
 * are the ones that we are either connected to or were connected to but have not
 * yet determined a stopTime for (i.e. we do not know if they are alive or not
 * but we are trying to reconnect to them).
 *
 * @module config-overview-view
 */
YUI.add('config-overview-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'configOverviewView';

    // labels
    var HIDE_URLS_LABEL = "Hide URLs",
    SHOW_URLS_LABEL = "Show URLs";

    /**
     * The View that contains the Configuration Overview display.
     * The view's model is a ClusterModel
     *
     * @class ConfigOverviewView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ConfigOverviewView = Y.Base.create(
        NAME, 
        Y.KaazingView,
        [],
        {
            initializer: function() {
                var model = this.get('model');  // clusterModel
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
                this.setupToolbar();

                Y.one("#legend").removeClass('hidden');

                if (this.get('firstTime')) {
                    this.after('showUrlsChange', 
                               this.afterShowUrlsChange, 
                               this);

                    // When a gateway instance becomes available, we need to recompute and 
                    // re-render (even if the gateway instance is not considered 'usable', 
                    // it will change the text of warning messages for those that are).
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

                    this.initializeSubviews();
                    
                    this.set('firstTime', false);
                }
            },

            setupToolbar: function() {
                var toolbar = this.get('toolbar');
                var showUrls = this.get('showUrls');

                // The hide/show scrolling button needs to remain the same size between
                // the two labels, so we need to adjust to the width of the latter.
                var showUrlsButton = createBUTTON(toolbar, 
                                                  SHOW_URLS_LABEL,
                                                  'toolbarButton')
                    .set('id', 'configOverviewShowUrls');

                var width = showUrlsButton.getStyle('width');
                
                showUrlsButton.setHTML('<span>' + (showUrls ? HIDE_URLS_LABEL : SHOW_URLS_LABEL) + '</span>');
                showUrlsButton.setStyle('width', width);
                showUrlsButton.on('click', this.toggleShowUrls, this);
            },

            // Given our model, create any necessary RealmConfig sub-views.  This is only called
            // when the page is initialized or when the cluster model changes (which it never
            // should.) After that we listen to events for gateway instances becoming available or
            // not and adjust the display accordingly.
            // NOTE: we do NOT want to optimize to only call addGatewayInstance with 'usable'
            // gateways, because any change of #gateways, usable or not, changes warning messages.
            initializeSubviews: function() {
                var clusterModel = this.get('model');

                var gatewayModels = clusterModel.getGateways();

                if (gatewayModels && gatewayModels.length > 0) {
                    for (var i = 0; i < gatewayModels.length; i++) {
                        this.addGatewayInstance(gatewayModels[i]);
                    }
                }
            },

            /* Specify the destructor so we properly clean up the sub-view */
            destructor: function () {
                this.destroySubviews();
            },

            /**
             * Response after the ClusterModel we're referring to is replaced. Generally this won't
             * happen now, but might later. Adding this also makes this model layer look
             * the same as others.
             */
            afterModelChange: function(ev) {
                this.destroySubviews();

                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);
                
                this.initializeSubviews();

                this.render();
            },

            /**
             * Response to having a gateway become available to the cluster. We still need to 
             * check if the new gateway is 'usable', but we'll do that in addGatewayInstance,
             * because we need to change things like warning messages whether the gateway is
             * usable or not.
             */
            onGatewayAvailable: function(ev) {
                this.addGatewayInstance(ev.gatewayModel);
            },

            /**
             * We don't actually care if a gateway becomes unavailable (we'll still use its 
             * config) until it actually sets a stopTime (at which point we cannot use it anymore).
             * Remove any references to the instance from our structures and display.
             */
            afterStopTimeChange: function(ev) {
                this.removeGatewayInstance(ev.target);
            },

            /**
             * Add a GatewayModel instance to the views. Only 'usable' gateways have configs we
             * can use to affect the set of services and realms, but even unmanaged gateways affect
             * the rendering of warnings and errors (e.g., by changing the # of gateways).
             */
            addGatewayInstance: function(gatewayModel) {
                var clusterModel = this.get('model');

                // we can only get config data from 'usable' gateways.
                // However, we still need to render() in either case, because we've changed
                // the total # of gateways, which may change warnings to the user.
                if (gatewayModel.isUsable()) {
                    var gatewayConfig = gatewayModel.get('gatewayConfig');
                    var securityConfig = gatewayConfig.get('securityConfig');
                    var realmConfigs = (securityConfig && securityConfig.get('realmConfigs'));

                    var i, j, k;

                    if (realmConfigs) {
                        var clusterRealmConfigViews = this.get('clusterRealmConfigViews');
                        var clusterRealmConfigView = null;

                        // try to pass each realm config to the ClusterRealmConfigViews until
                        // one is found that matches. If none matches, fail.
                        for (var realmName in realmConfigs) {
                            if (realmConfigs.hasOwnProperty(realmName)) {
                                var realmConfig = realmConfigs[realmName];

                                var found = false;

                                for (i = 0; i < clusterRealmConfigViews.length; i++) {
                                    clusterRealmConfigView = clusterRealmConfigViews[i];

                                    if (clusterRealmConfigView.addRealmConfig(realmConfig)) {
                                        // returns true if it has added the realmConfig (i.e. because
                                        // it matches), else false.
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    var modelList = new Y.ModelList({model: Y.RealmConfigModel});
                                    modelList.add(realmConfig);
                                    clusterRealmConfigView = 
                                        new Y.ClusterRealmConfigView({clusterModel: clusterModel,
                                                                      modelList: modelList,
                                                                      showUrls: this.get('showUrls'),
                                                                      app: this.get('app')
                                                                     });

                                    // Figure out where to insert us into the list of realm config views
                                    var inserted = false;
                                    for (i = 0; i < clusterRealmConfigViews.length; i++) {
                                        var oldClusterRealmConfigView = clusterRealmConfigViews[i];
                                        if (clusterRealmConfigView.sortCompare(oldClusterRealmConfigView) < 0) {
                                            clusterRealmConfigViews.splice(i, 0, clusterRealmConfigView);
                                            inserted = true;
                                            break;
                                        }
                                    }

                                    if (!inserted) {
                                        clusterRealmConfigViews.push(clusterRealmConfigView);
                                    }
                                }
                            }
                        }
                    }

                    // Get the 'no realm' service configs and insert them into the
                    // current list at the right points.
                    var serviceConfigs = gatewayConfig.get('serviceConfigs');

                    var noRealmServiceConfigs = [];
                    var serviceConfig, realm;

                    for (i = 0; i < serviceConfigs.length; i++) {
                        serviceConfig = serviceConfigs[i];
                        realm = serviceConfig.get('realm');
                        if (!realm) {
                            noRealmServiceConfigs.push(serviceConfig);
                        }
                    }

                    var numServiceConfigs = noRealmServiceConfigs.length;
                    if (numServiceConfigs > 0) {
                        var clusterNoRealmServiceConfigViews = this.get('clusterNoRealmServiceConfigViews');
                        var clusterServiceConfigView = null;

                        for (i = 0; i < numServiceConfigs; i++) {
                            serviceConfig = noRealmServiceConfigs[i];

                            var found = false;

                            for (j = 0; j < clusterNoRealmServiceConfigViews.length; j++) {
                                var clusterNoRealmServiceConfigView = clusterNoRealmServiceConfigViews[j];

                                if (clusterNoRealmServiceConfigView.addServiceConfig(serviceConfig)) {
                                    // returns true if it has processed the serviceConfig, else false.
                                    found = true;
                                    break;
                                }
                            }

                            if (!found) {
                                var modelList = new Y.ModelList({model: Y.ServiceConfigModel});
                                modelList.add(serviceConfig);
                                clusterServiceConfigView = 
                                    new Y.ClusterServiceConfigView({clusterModel: clusterModel,
                                                                    modelList: modelList,
                                                                    showUrls: this.get('showUrls'),
                                                                    app: this.get('app')
                                                                   });
                                // Note: normally we would render() the view here, but we're going to have to 
                                // render all of them anyway below, since warnings will change.
                                
                                // Figure out where to insert us into the list of no-realm service config views
                                var inserted = false;
                                for (j = 0; j < clusterNoRealmServiceConfigViews.length; j++) {
                                    var oldClusterServiceConfigView = clusterNoRealmServiceConfigViews[j];
                                    var compare = 
                                        clusterServiceConfigView.sortCompare(oldClusterServiceConfigView);
                                    if (compare < 0) {
                                        clusterNoRealmServiceConfigViews.splice(j, 0, clusterServiceConfigView);
                                        inserted = true;
                                        break;
                                    }
                                }

                                if (!inserted) {
                                    clusterNoRealmServiceConfigViews.push(clusterServiceConfigView);
                                }
                            }
                        }
                    }
                }

                // regardless of whether the new gatewayModel is managed or not,
                // we need to have ALL the cluster realm and cluster service config
                // views recalculate any warnings we might need to show at the
                // service level.
                this.calculateWarnings();

                this.render();
            },

            /**
             * Remove a single GatewayModel instance from the ClusterRealmConfigViews at this level.
             * Only 'usable' gateways have configs we can use to affect the set of services and realms, 
             * but even unmanaged gateways affect the rendering of warnings and errors (e.g., by 
             * changing the # of gateways), so we need to code for both.
             * NOTE: by definition, a stopTime change will mean isUsable() returns false, so we can't
             * use that to test for anything here.
             */
            removeGatewayInstance: function(gatewayModel) {
                var clusterModel = this.get('model');

                var gatewayConfig = gatewayModel.get('gatewayConfig');

                if (gatewayConfig) {
                    // If we have any realms defined for this gateway, we need to remove each
                    // from the set of cluster realm config views.
                    var securityConfig = gatewayConfig.get('securityConfig');
                    var realmConfigs = (securityConfig && securityConfig.get('realmConfigs'));

                    var i, j, k;

                    if (realmConfigs) {
                        var clusterRealmConfigViews = this.get('clusterRealmConfigViews');

                        // Find the matching ClusterRealmConfigView for each config (it should
                        // always been in one of them, but if not it means somehow we already
                        // removed this gatewayModel.)
                        for (var realmName in realmConfigs) {
                            if (realmConfigs.hasOwnProperty(realmName)) {
                                var realmConfig = realmConfigs[realmName];

                                for (i = 0; i < clusterRealmConfigViews.length; i++) {
                                    var clusterRealmConfigView = clusterRealmConfigViews[i];

                                    if (clusterRealmConfigView.containsRealmConfig(realmConfig)) {
                                        clusterRealmConfigView.removeRealmConfig(realmConfig);
                                        if (clusterRealmConfigView.isEmpty()) {
                                            arrayRemove(clusterRealmConfigViews, clusterRealmConfigView);
                                            clusterRealmConfigView.destroy();
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Get the 'no realm' service configs and insert them into the
                    // current list at the right points.
                    var serviceConfigs = gatewayConfig.get('serviceConfigs');

                    var clusterNoRealmServiceConfigViews = this.get('clusterNoRealmServiceConfigViews');

                    for (i = 0; i < serviceConfigs.length; i++) {
                        var serviceConfig = serviceConfigs[i];
                        if (!serviceConfig.get('realm')) {
                            for (j = 0; j < clusterNoRealmServiceConfigViews.length; j++) {
                                var clusterNoRealmServiceConfigView = clusterNoRealmServiceConfigViews[j];

                                if (clusterNoRealmServiceConfigView.containsServiceConfig(serviceConfig)) {
                                    clusterNoRealmServiceConfigView.removeServiceConfig(serviceConfig);
                                    if (clusterNoRealmServiceConfigView.isEmpty()) {
                                        arrayRemove(clusterNoRealmServiceConfigViews, 
                                                    clusterNoRealmServiceConfigView);
                                        clusterNoRealmServiceConfigView.destroy();
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }

                // regardless of whether the removed instance is managed or not,
                // we need to have ALL the cluster realm and cluster service config
                // views recalculate any warnings we might need to show at the
                // service level.
                this.calculateWarnings();

                this.render();
            },

            calculateWarnings: function() {
                var realmConfigViews = this.get('clusterRealmConfigViews');
                for (var i = 0; i < realmConfigViews.length; i++) {
                    realmConfigViews[i].calculateWarnings();
                }

                var serviceConfigViews = this.get('clusterNoRealmServiceConfigViews');
                for (var i = 0; i < serviceConfigViews.length; i++) {
                    serviceConfigViews[i].calculateWarnings();
                }
            },

            /**
             * Response to flipping the 'show Urls' state
             */
            afterShowUrlsChange: function(ev) {
                var showUrls = this.get('showUrls');

                var realmConfigViews = this.get('clusterRealmConfigViews');
                for (var i = 0; i < realmConfigViews.length; i++) {
                    realmConfigViews[i].set('showUrls', showUrls);
                }

                var serviceConfigViews = this.get('clusterNoRealmServiceConfigViews');
                for (var i = 0; i < serviceConfigViews.length; i++) {
                    serviceConfigViews[i].set('showUrls', showUrls);
                }
            },

            /**
             * Render the entire cluster config view. Note that we're not 
             * relying on stored display data. Rather, we're constructing the display 
             * each time, because it's relatively simple to do so.
             * Note also that we get called once before any data has come in, 
             * so we need to be careful about nulls.
             * Final note: we call this when a gateway is added or removed, 
             * because we need to re-render the warning message values, and 
             * this is the simplest way.
             */
            render: function() {
                // first the realms
                var realmDataDiv = this.get('container').one("#configOverviewRealmData");

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var clusterRealmConfigViews = this.get('clusterRealmConfigViews');

                for (var i = 0; i < clusterRealmConfigViews.length; i++) {
                    content.append(clusterRealmConfigViews[i].render().get('container'));
                }

                realmDataDiv.setHTML(content);

                // now the services w/no realm
                var noRealmDataDiv = this.get('container').one("#configOverviewNoRealmData");
                
                content = Y.one(Y.config.doc.createDocumentFragment());

                var clusterNoRealmServiceConfigViews = this.get('clusterNoRealmServiceConfigViews');

                for (var i = 0; i < clusterNoRealmServiceConfigViews.length; i++) {
                    content.append(clusterNoRealmServiceConfigViews[i].render().get('container'));
                }

                noRealmDataDiv.setHTML(content);

                return this;
            },

            toggleShowUrls: function(ev) {
                var showUrls = !this.get('showUrls');
                this.set('showUrls', showUrls);
                ev.target.setHTML('<span>' + (showUrls ? HIDE_URLS_LABEL : SHOW_URLS_LABEL) + '</span>');
            },

            destroySubviews: function() {
                var clusterRealmConfigViews = this.get('clusterRealmConfigViews');
                var i;

                for (i = 0; i < clusterRealmConfigViews.length; i++) {
                    var clusterRealmConfigView = clusterRealmConfigViews[i];
                    clusterRealmConfigView.destroy();
                }

                this.set('clusterRealmConfigViews', []);

                var clusterNoRealmServiceConfigViews = this.get('clusterNoRealmServiceConfigViews');

                for (i = 0; i < clusterNoRealmServiceConfigViews.length; i++) {
                    var clusterNoRealmServiceConfigView = clusterNoRealmServiceConfigViews[i];
                    clusterNoRealmServiceConfigView.destroy();
                }

                this.set('clusterNoRealmServiceConfigViews', []);
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#configOverviewContainer');
                    }
                },

                title: {
                    value: 'Configuration : Overview'
                },

                clusterRealmConfigViews: {  // list of Y.ClusterRealmConfigView
                    value: []
                },

                clusterNoRealmServiceConfigViews: {
                    value: []
                },

                showUrls: {
                    value: true
                },

                firstTime: {
                    value: true
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'cluster-model']
});
