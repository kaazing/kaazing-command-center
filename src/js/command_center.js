/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The command-center module is the extension of Y.App for the Kaazing Command Center
 * application. This is also its own router.
 * 
 * @module command-center
 */
YUI.add('command-center', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'commandCenter';

    /**
     * The CommandCenter class is the overall application.
     * @class CommandCenter
     * @extends Y.App
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.CommandCenter = Y.Base.create(
        NAME,             // class name
        Y.App,            // 'base' class this is derived from
        [Y.EventTarget],  // extensions being mixed in
        {
            // The app's string resources
            resources: null,

            // the Y.ClusterModel instance.
            clusterModel: null,

            // The instance of the LoginPanel class, usable by the
            // challenge handlers for each gateway SNMP URL.
            loginPanel: null,

            // The main menu
            menu: null,

            // The list of dashboard chart metadata
            chartMetadata: {
            },

            DEFAULT_CHART_LIST: ["cpuAvgPercChart",
                                 "currentSessionsChart",
                                 "jvmHeapChart",
                                 "nicRWThptCombinedChart"],

            // The panel for filtering the various levels of monitoring
            // data (sessions, services, gateways).
            monitorFilterPanel: null,

            // The panel with our 'About' information
            aboutPanel: null,

            initializer: function() {
                var $this = this;


                // Force the min-height of the document to the size of the 
                // current viewport, and adjust it if the  window resizes.
                var fn = function(ev) {
                    var w = Y.one('window');
                    var windowHeight = w.get('winHeight');
                    var docHeight = w.get('docHeight');
                    if (docHeight < windowHeight) {
                        Y.one('body').setStyle('height', windowHeight + "px");
                    }
                }
                
                fn();
                Y.one('window').on('resize', fn);

                // YUI3 doesn't support 'window.onbeforeunload' using the YUI .on method, so we'll
                // have to do it directly ourselves.
                window.onbeforeunload = function(ev) {
                    $this.handleBeforeUnload(ev);
                }, 

                this.loginPanel = new Y.LoginPanel();
                this.monitorFilterPanel = new Y.MonitorFilterPanel();
                this.aboutPanel = new Y.AboutPanel({app: $this});
                this.updatePanel = new Y.UpdatePanel({app: $this});

                this.menu = defineMenu(Y, $this);

                this.menu.renderMenu(Y.one("#mainMenuWrapper").getDOMNode());
    
                this.setupRoutes();

                var challengeHandlerCreatorFn = this.get('challengeHandlerCreatorFn');

                var loginProcessor = 
                    new Y.LoginProcessor(
                        {loginPanel: this.loginPanel,
                         app: this});

                this.clusterModel = new Y.ClusterModel({loginProcessor: loginProcessor});
                this.clusterModel.addTarget($this);

                window.document.title = CC.PRODUCT_NAME;

                this.doBranding();

                Y.one('#headerLogo').on('click', 
                                        function(ev) {
                                            $this.handleVisitCompany();
                                        }, 
                                        this);

                Y.one('#logoutLink').on('click', 
                                        function(ev) {
                                            $this.handleLogout();
                                        }, 
                                        this);

                if (this._setupCallback) {
                    this._setupCallback();
                    delete this._setupCallback;
                }

                this.on('activeViewChange', this.activeViewChange, this);
                this.on('*:versionInfoChange', this.versionInfoChange, this);
                this.on(Y.ClusterModel.prototype.UPDATE_AVAILABLE_EVENT, this.handleUpdateVersion, this); 

                // all our routes use a path past #, so figure out if we have a 
                // current match/matches and if so, go to the first. If none,
                // we have an error (if no hash at all, or empty, force to go
                // to the dashboard.)
                var hashStr = window.location.hash;
                if (!hashStr || hashStr === "#") {
                    this.save('/dashboard');
                } else {
                    if (hashStr.startsWith("#")) {
                        hashStr = hashStr.substring(1);
                    }

                    var matches = $this.match(hashStr);

                    if (matches.length > 0) {
                        $this.dispatch();
                    } else {
                        // invalid path
                        $this.save('/');
                    }
                }

                this.setupStandardCharts();

                // 'Start' the model by having it attempt to connect to the management service
                // URL for our current gateway (the one we've retrieved pages from.)
                var connectionUrl = window.location.host + "/snmp";
                if (window.location.protocol == 'https:') {
                    connectionUrl = 'wss://' + connectionUrl;
                } else {
                    connectionUrl = 'ws://' + connectionUrl;
                }

                this.clusterModel.start(connectionUrl);
            },

            doBranding: function() {
                Y.one('#headerLogoImage').setAttribute('src', CC.HEADER_LOGO_IMAGE_URL);
                Y.one('#footerLogoImage').setAttribute('src', CC.FOOTER_LOGO_IMAGE_URL);
                Y.one('#loginLogoImage').setAttribute('src', CC.LOGIN_LOGO_IMAGE_URL);
                Y.one('#aboutLogoImage').setAttribute('src', CC.ABOUT_LOGO_IMAGE_URL);
                Y.one('#updateLogoImage').setAttribute('src', CC.UPDATE_LOGO_IMAGE_URL);

                Y.all('.copyrightNotice span').setHTML(CC.COPYRIGHT_NOTICE);
            },

            /**
             * When the version info changes (really, when it's set the first time),
             * set the product title into the footer.
             */
            versionInfoChange: function(ev) {
                var productTitleDiv = Y.one('.productTitle');

                var versionInfo = computeDisplayVersionInfo(ev.newVal);

                if (versionInfo) {
                    productTitleDiv.set('text', versionInfo[0] + " " + versionInfo[1]);
                } else {
                    productTitleDiv.set('text', '');
                }
            },

            setupRoutes: function() {
                var $this = this;

                $this.route('/', 'handleDashboardView');
                $this.route('/dashboard', 'handleDashboardView');
                $this.route('/config/overview', 'handleConfigOverview');
                $this.route('/config/licenses', 'handleConfigLicenses');
                $this.route('/config/service_defaults', 'handleConfigServiceDefaults');
                $this.route('/config/services', 'handleConfigServices');
                $this.route('/config/security/realms', 'handleConfigSecurityRealms');
                $this.route('/config/security/keystore', 'handleConfigSecurityKeystore');
                $this.route('/config/security/truststore', 'handleConfigSecurityTruststore');
                $this.route('/monitor/gateways', 'handleMonitorGateways');
                $this.route('/monitor/services', 'handleMonitorServices');
                $this.route('/monitor/sessions', 'handleMonitorSessions');
            },

            handleDashboardView: function(request, response, next) {
                this.startShowView('dashboardView', 
                                   {model: this.clusterModel,
                                    toolbar: this.getToolBar(),
                                    app: this},
                                   null);
            },

            handleConfigOverview: function(request, response, next) {
                this.startShowView('configOverviewView', 
                                   {model: this.clusterModel,
                                    toolbar: this.getToolBar(),
                                    app: this},
                                   null);
            },

            handleConfigLicenses: function(request, response, next) {
                this.startShowView('configLicensesView', 
                                   {model: this.clusterModel,
                                    toolbar: this.getToolBar(),
                                    app: this},
                                   null);
            },

            handleConfigServiceDefaults: function(request, response, next) {
                this.startShowView('configServiceDefaultsView', 
                                   {model: this.clusterModel,
                                    toolbar: this.getToolBar(),
                                    app: this},
                                   null);
            },

            handleConfigServices: function(request, response, next) {
                // see if the URL had a connectionUrl and serviceId attached
                // (e.g., from a link on the Overview page). If so, prefetch the
                // service of interest.
                var query = request.query;
                var connectionUrl = (query && query.connectionUrl);
                var serviceId = (query && query.serviceId);
                var selectedServiceConfig =  null;

                // If the user has passed in a connectionUrl and service,
                // (e.g., when the user clicks on a link from the overview)
                // set up to show that service. If not, don't pass in a
                // selected service config--let any previous one stay there.
                if (!isEmpty(connectionUrl) && isNumeric(serviceId)) {
                    serviceId = parseInt(serviceId);
                    
                    var gatewayModel = 
                        this.findGatewayModelByConnectionUrl(connectionUrl);
                    if (gatewayModel) {
                        selectedServiceConfig = 
                            gatewayModel.get('gatewayConfig').getServiceConfig(serviceId);
                    }
                }

                var config = {model: this.clusterModel,
                              toolbar: this.getToolBar(),
                              app: this};

                if (selectedServiceConfig !== null) {
                    config.selectedServiceConfig = selectedServiceConfig;
                }

                this.startShowView('configServicesView', config, {update:true, render:true});
            },

            handleConfigSecurityRealms: function(request, response, next) {
                // see if the URL had a connectionUrl and realm name attached
                // (e.g., from a link on the Services page). If so, prefetch the
                // realm of interest.
                var query = request.query;
                var connectionUrl = (query && query.connectionUrl);
                var realm = (query && query.realm);
                var selectedRealmConfig =  null;

                // If the user has passed in a client gateway and realm name
                // (e.g., when the user clicks on a link from the services page)
                // set up to show that realm. If not, don't pass in a
                // selected realm config--let any previous one stay there.
                if (!isEmpty(connectionUrl) && realm && realm.length > 0) {
                    var gatewayModel = 
                        this.findGatewayModelByConnectionUrl(connectionUrl);
                    if (gatewayModel) {
                        selectedRealmConfig = 
                            gatewayModel.get('gatewayConfig').getRealmConfig(realm);
                    }
                }

                var config = {model: this.clusterModel,
                              toolbar: this.getToolBar(),
                              app: this};

                if (selectedRealmConfig !== null) {
                    config.selectedRealmConfig = selectedRealmConfig;
                }

                this.startShowView('configSecurityRealmsView', config, {update:true, render:true});
            },

            handleConfigSecurityKeystore: function(request, response, next) {
                this.startShowView('configSecurityKeystoreView', 
                                   {model: this.clusterModel,
                                    toolbar: this.getToolBar(),
                                    app: this},
                                   null);
            },

            handleConfigSecurityTruststore: function(request, response, next) {
                this.startShowView('configSecurityTruststoreView', 
                                    {model: this.clusterModel,
                                     toolbar: this.getToolBar(),
                                     app: this},
                                    null);
            },

            handleMonitorGateways: function(request, response, next) {
                this.startShowView('monitorGatewaysView', 
                                    {model: this.clusterModel,
                                     toolbar: this.getToolBar(),
                                     filterPanel: this.monitorFilterPanel,
                                     app: this},
                                    null);
            },

            handleMonitorServices: function(request, response, next) {
                this.startShowView('monitorServicesView', 
                                    {model: this.clusterModel,
                                     toolbar: this.getToolBar(),
                                     filterPanel: this.monitorFilterPanel,
                                     app: this},
                                    null);
            },

            handleMonitorSessions: function(request, response, next) {
                this.startShowView('monitorSessionsView', 
                                    {model: this.clusterModel,
                                     toolbar: this.getToolBar(),
                                     filterPanel: this.monitorFilterPanel,
                                     app: this},
                                    null);
            },

            handleAbout: function(request, response, next) {
                var $this = this;

                invokeLater(function() {
                    var aboutPanel = $this.aboutPanel;
                    aboutPanel.display();
                });
            },
            
            handleUpdateVersion: function(request, response, next) {
                var $this = this;

                invokeLater(function() {
                    if(!($this.get('manualCheckingForUpdate'))) {
            			var updatePanel = $this.updatePanel;
                    	updatePanel.display();
                    }
                });
            },

            handleVisitCompany: function() {
                window.open(CC.COMPANY_WEBSITE_URL);
            },

            handleLogout: function() {
                if (confirm("Are you sure you want to log out of the " + CC.PRODUCT_NAME + "?")) {
                    if (this.clusterModel) {
                        this.clusterModel.logout();
                        // note in the following: IE9 does not support the 'origin' property,
                        // so we have to build with protocol and host, which all support.
                        window.location = window.location.protocol + "//" +
                                          window.location.host + 
                                          window.location.pathname;
                    }
                }
            },

            // User is trying to close the browser/tab. For us, just silently shut
            // down any open connections.
            handleBeforeUnload: function(ev) {
                if (this.clusterModel) {
                    this.clusterModel.logout();
                }
            },

            /**
             * Has the user ever completed a login?
             */
            hasLoggedIn: function() {
                return this.clusterModel.get('loggedIn');
            },

            /**
             * Are we dealing with a cluster?
             */
            isCluster: function() {
                return this.clusterModel.get('isCluster');
            },

            activeViewChange: function(ev) {
                CC.console.debug("##### ACTIVE VIEW CHANGE!");
                CC.console.debug('PREV VAL: ' + (ev.prevVal ? ev.prevVal.name : "null"));
                CC.console.debug('NEW VAL: ' + (ev.newVal ? ev.newVal.name : "null"));
            },

            isActiveView: function(view) {
                return this.get('activeView') === view;
            },


            /**
             * Convenience function here since we only want to use it here.
             * Find the first instance (i.e. the live one, if there is one, or the
             * most recently dead one) of a given connection URL.
             */
            findGatewayModelByConnectionUrl: function(connectionUrl) {
                var gateways = this.clusterModel.getSortedGateways();

                if (!gateways) {
                    return null;
                }

                for (var i = 0; i < gateways.length; i++) {
                    var gateway = gateways[i];
                    if (gateway.get('connectionUrl') == connectionUrl) {
                        return gateway;
                    }
                }

                return null;
            },

            /**
             * A custom version of 'showView' because the app's functionality
             * is somewhat more structured than the standard YUI view. Takes most
             * of the standard showView parameters, calls hideViewCallback first.
             * Note that we don't give a 'callback' options, since we want to force
             * the same callback all the time.
             */
            startShowView: function(view, config, options) {
                var currView = this.get('activeView');

                if (currView && currView.hideViewCallback) {
                    currView.hideViewCallback();
                }

                this.showView(view, config, options, this.showViewCallback);
            },

            /**
             * Callback function for places where we do a 'showView'.  Gets the 'title' of the 
             * view for display in the view title area, and other stuff.
             */
            showViewCallback: function(view) {
                var title = view.get('title');
                Y.one("#viewTitle").setHTML('<span>' + (title ? title : "") + '</span>');

                // Clear out the toolbar, in case the new view wants
                // to load it with their own stuff.
                removeAllChildren("#viewToolBar");

                // Cause the view container to scroll to the top (might want to not
                // do this sometimes, but for now we need to, at least until we 
                // add History support, which might fix this.
                Y.one("#viewContainer").set('scrollTop', 0);

                // If the given view defines its own 'showViewCallback' method,
                // call it to the let the view do stuff. 
                if (view.showViewCallback) {
                    view.showViewCallback(); 
                }
            },

            /**
             * Show a view title in the 'view title' "global" area above the view
             * content. Called when a view becomes the active view.
             */
            setViewTitle: function(title) {
                var titleDiv = Y.one("#viewTitle");
                titleDiv.setHTML(title);
            },

            getToolBar: function() {
                return Y.one("#viewToolBar");
            },

            putChart: function(chartKey, chartTitle, chartClass) {
                this.chartMetadata[chartKey] = [chartTitle, chartClass];
            },

            getChart: function(chartKey) {
                var metadata = this.chartMetadata[chartKey];
                return (metadata ? metadata : null);
            },

            getCharts: function() {
                return this.chartMetadata;
            },

            /**
             * Set up the metadata for the standard dashboard gateway charts.
             */
            setupStandardCharts: function() {
                this.putChart('currentSessionsChart', 
                              'Current Sessions', 
                              Y.CurrentSessionsChart);
                this.putChart('cpuAllPercChart',
                              'CPU % (all CPUs/cores)',
                              Y.CpuAllPercChart);
                this.putChart('cpuAvgPercChart', 
                              'CPU % (average)',
                              Y.CpuAvgPercChart);
                this.putChart('jvmHeapChart', 
                              'JVM Heap',
                              Y.JvmHeapChart);
                this.putChart('nicReadThptCombinedChart', 
                              'Read Throughput Combined',
                              Y.NicReadThptCombinedChart);
                this.putChart('nicReadThptIndivChart', 
                              'Read Throughput/Interface Card',
                              Y.NicReadThptIndivChart);
                this.putChart('nicRWThptCombinedChart', 
                              'Total Read/Write Throughput',
                              Y.NicRWThptCombinedChart);
                this.putChart('nicWriteThptCombinedChart', 
                              'Write Throughput Combined',
                              Y.NicWriteThptCombinedChart);
                this.putChart('nicWriteThptIndivChart', 
                              'Write Throughput/Interface Card',
                              Y.NicWriteThptIndivChart);
            }
        },
        {
            ATTRS: {
                challengeHandlerCreatorFn: {
                    value: null
                },
                root: {
                    value: ""
                },
                html5: {
                    value: false
                },
                /**
                 * Used to state whether the user is manually checking for updates of not,
                 * If he is then the notification shouldn't pop up
                 */
                manualCheckingForUpdate: {
                    value: false
                }
            }
        }
    );

}, '0.99', {
    requires: ['app', 'login-panel', 'monitor-filter-panel', 'about-panel', 'map-model', 'cluster-model', 'update-panel'],  
    skinnable: false
});
