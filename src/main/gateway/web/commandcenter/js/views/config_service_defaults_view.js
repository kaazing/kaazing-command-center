/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The view for a gateway's service defaults
 *
 * @module config-service-defaults-view
 */
YUI.add('config-service-defaults-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'configServiceDefaultsView';

    /**
     * The View for displaying information about a single gateway's service defaults
     *
     * @class ConfigServiceDefaultsView
     * @extends Y.View
     * @uses xxxxx
     * @constructorv
     * @cfg {object} configuration attributes
     */
    Y.ConfigServiceDefaultsView = Y.Base.create(
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
                    this.after('selectedGatewayChange', this.afterSelectedGatewayChange, this);

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

                    this.set('firstTime', false);
                }

                if (!this.isCluster()) {
                    // Single gateway. Force the showing of it.
                    var gatewayModels = this.get('model').getUsableGateways();
                    this.set('selectedGateway', gatewayModels[0].get('instanceKey'));
                } else {
                    this.renderSelector();
                }
            },

            /**
             * Response after the ClusterModel we're referring to is replaced.
             */
            afterModelChange: function(ev) {
                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);
                this.render();
            },

            onGatewayAvailable: function(ev) {
                var gatewayModel = ev.gatewayModel;
                // If we're a single gateway, force that display by changing the selected gateway. 
                // If not, do nothing and let the user choose.
                if (!this.isCluster()) {
                    this.set('selectedGateway', gatewayModel.get('instanceKey'));
                } else {
                    // we need to reset the selector
                    this.render();
                }
            },

            afterStopTimeChange: function(ev) {
                var gatewayModel = ev.target;
                if (gatewayModel.get('instanceKey') === this.get('selectedGateway')) {
                    this.set('selectedGateway', null);
                } else {
                    // we need to reset the selector
                    this.render();
                }
            },

            afterSelectedGatewayChange: function(ev) {
                this.render();
            },
            
            /**
             * Render the entire view. Note: do NOT render the selector here, because that
             * is done in "common" space (the toolbar), so affects other pages. 
             */
            render: function() {
                if (this.isActiveView()) {
                    removeAllChildren(this.get('container').one('#configServiceDefaultsData'));
                    this.renderSelector();
                    this.renderData();
                }

                return this;
            },

            /**
             * Render the selector into the toolbar (only called if we actually have a cluster)
             */
            renderSelector: function() {
                var $this = this;

                if (!this.isActiveView()) {
                    return;
                }

                var toolbar = this.get('toolbar');
                var selector = toolbar.one('#configServiceDefaultsGatewaySelector');

                if (!this.isCluster()) {
                    if (selector) {
                        toolbar.remove(selector, true);
                    }
                    return;
                }

                var selectedGateway = this.get('selectedGateway');  // instanceKey

                // Get our usable gateway models. If we believe we're not a cluster
                // any more, we will have bailed above, so at this point we
                // think we have a cluster, though we may only have a single
                // gateway model present.
                var gatewayModels = this.get('model').getUsableGateways();

                if (gatewayModels) {
                    gatewayModels.sort(function(g1, g2) {
                        return compareStrings(g1.get('gatewayLabel').toLowerCase(),
                                              g2.get('gatewayLabel').toLowerCase());
                    });
                }

                if (!selector) {
                    selector = createSELECT(toolbar)
                        .set('id', 'configServiceDefaultsGatewaySelector');
                } else {
                    selector.on('change', null);  // so we don't trip anything while re-rendering.
                    removeAllChildren(selector);
                }

                var option = createOPTION(selector, null, 'Select a Cluster Member...')
                    .set('selected', false);

                if (!gatewayModels) {
                    this.set('selectedGateway', null);
                    return;
                }

                for (var i = 0; i < gatewayModels.length; i++) {
                    var gatewayModel  = gatewayModels[i];

                    var label = gatewayModel.get('gatewayLabel');
                    var instanceKey = gatewayModel.get('instanceKey');

                    option = createOPTION(selector, null, label, instanceKey);

                    if (instanceKey === selectedGateway) {
                        option.set('selected', true);
                    }
                }

                selector.on('change', function(ev) {
                    var select = ev.target;
                    var selIndex = select.get('selectedIndex'); // the selector is 'this' here
                    if (selIndex <= 0) {
                        $this.set('selectedGateway', null);
                        return;
                    } 

                    // remember to subtract 1 from the selection because we have the
                    // 'Select...' label as index 0.
                    var instanceKey = select.get('options').item(selIndex).get('value');
                    $this.set('selectedGateway', instanceKey);
                });
            },

            /**
             * Render the data fields, for whatever GatewayModel happens 
             * to be selected. If there is none selected, clear all data fields.
             */
            renderData: function() {
                var container = this.get('container');
                
                var instanceKey = this.get('selectedGateway');
                
                if (!instanceKey) {
                    return;
                }

                var gatewayModel = this.get('model').findGatewayModelByInstanceKey(instanceKey);

                var gatewayConfig = (gatewayModel && gatewayModel.get('gatewayConfig'));
                var serviceDefaultsConfig = (gatewayConfig && gatewayConfig.get('serviceDefaultsConfig'));
                
                var acceptOptions = (serviceDefaultsConfig && serviceDefaultsConfig.get('acceptOptions'));
                this.renderAcceptOptions(container, acceptOptions);

                var mimeMappings = (serviceDefaultsConfig && serviceDefaultsConfig.get('mimeMappings'));
                this.renderMimeMappings(container, mimeMappings);

                var showNoData = (gatewayConfig !== undefined && 
                                  gatewayConfig !== null &&
                                  ((acceptOptions === undefined || acceptOptions === null || isEmptyObject(acceptOptions)) &&
                                   (mimeMappings === undefined || mimeMappings === null || isEmptyObject(mimeMappings))));

                this.renderNoDataMessage(container, showNoData);
                
                return this;
            },

            // Render/hide a message saying that we have no defaults data, or hide it.
            renderNoDataMessage: function(container, show) {
                var dataDiv = container.one('#configServiceDefaultsData');
                
                var section = dataDiv.one("#configServiceDefaultsNoDataSection");

                if (!section) {
                    // XXX Internationalize later!
                    var noDefaultsMessage = 
                        (this.isCluster()
                         ? "No service defaults have been specified for this cluster member."
                         : "No service defaults have been specified for this gateway.");

                    // first time only, render the section structure
                    section = createDIV(dataDiv, 'configServiceDefaultsSection')
                        .set('id', 'configServiceDefaultsNoDataSection')
                        .set('text', noDefaultsMessage);   // XXX  i18n later
                }

                if (show) {
                    section.removeClass('hidden');
                } else {
                    section.addClass('hidden');
                }
            },

            // Render/hide accept options
            renderAcceptOptions: function(container, acceptOptions) {
                var dataDiv = container.one('#configServiceDefaultsData');
                
                var section = dataDiv.one("#configServiceDefaultsAcceptOptionsSection");

                if (!section) {
                    // first time only, render the section structure
                    section = createDIV(dataDiv, 'configServiceDefaultsSection')
                        .set('id', 'configServiceDefaultsAcceptOptionsSection');

                    var sectionHeader = createH(section, 3)
                        .set('text', 'Accept Options');               // XXX replace later with lookup

                    var table = createTABLE(section, 'configDataTable')
                        .set('id', 'configServiceDefaultsAcceptOptions');
                }

                var acceptOptionsTable = dataDiv.one('#configServiceDefaultsAcceptOptions');
                removeAllChildren(acceptOptionsTable);

                //-----------------------------------------------------------------
                // acceptOptions can return null. In that case, it's really an
                // object with no properties
                // case both will return null at the same time. If their values are 
                // not null, accepts will return a (possibly empty) array and acceptOptions 
                // will return an object (either empty or with properties).
                //-----------------------------------------------------------------
                if (!acceptOptions || isEmptyObject(acceptOptions)) {
                    section.addClass('hidden');
                    return;
                }

                section.removeClass('hidden');

                var tr, td;

                // put the property keys into a sorted list, so we
                // can display them and their values in sorted order.
                var keys = getSortedKeys(acceptOptions);

                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    // If values are arrays, insert <br> between the values,
                    // meaning that we need to escape other values and use
                    // node.setHTML instead of set('text').
                    var value = acceptOptions[key];
                    var type = typeOf(value);
                    if (type === "array") {
                        var str = "";
                        for (var j = 0; j < value.length; j++) {
                            if (j > 0) {
                                str += "<br>";
                            }
                            str += Y.Escape.html(value[j]);
                        }
                        value = str;
                    } else {
                        value = Y.Escape.html(value);
                    }

                    tr = createTR(acceptOptionsTable);

                    td = createTD(tr, 'configServiceDefaultsDataLabel')
                        .set('text', key);
                    td = createTD(tr, 'serviceDefaultsDataValue')
                        .setHTML(value);
                }
            },

            // Render/hide MIME mappings
            renderMimeMappings: function(container, mimeMappings) {
                var dataDiv = container.one('#configServiceDefaultsData');
                
                var section = dataDiv.one("#configServiceDefaultsMimeMappingsSection");

                if (!section) {
                    // first time only, render the section structure
                    section = createDIV(dataDiv, 'configServiceDefaultsSection')
                        .set('id', 'configServiceDefaultsMimeMappingsSection');

                    var sectionHeader = createH(section, 3)
                        .set('text', 'MIME Mappings');     // XXX replace later with lookup

                    var table = createTABLE(section, 'configDataTable')
                        .set('id', 'configServiceDefaultsMimeMappings');
                }

                var mimeMappingsTable = dataDiv.one('#configServiceDefaultsMimeMappings');
                removeAllChildren(mimeMappingsTable);

                if (mimeMappings === undefined || 
                    mimeMappings === null ||
                    isEmptyObject(mimeMappings)) {
                    // undefined/null = 'not allowed', empty = 'nothing set'
                    section.addClass('hidden');
                    return;
                }

                section.removeClass('hidden');

                var tr, td, thead, th;

                thead = createTHEAD(mimeMappingsTable);

                th = createTH(thead, 'configServiceDefaultsDataLabel')
                    .set('text', 'Extension');

                th = createTH(thead, 'configServiceDefaultsDataLabel')
                    .set('text', 'MIME Type');

                // put the mime mappings keys into a sorted list, so we
                // can display them and their values in sorted order.
                var keys = getSortedKeys(mimeMappings);

                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var value = mimeMappings[key];

                    tr = createTR(mimeMappingsTable);

                    td = createTD(tr, 'configServiceDefaultsDataLabel')
                        .set('text', key);
                    td = createTD(tr, 'serviceDefaultsDataValue')
                        .set('text', value);
                }
            }
        },
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#configServiceDefaultsContainer');
                    }
                },

                title: {
                    value: 'Configuration : Service Defaults'
                },

                /**
                 * The instance key of the gateway instance whose service defaults we're showing.
                 */
                selectedGateway: {
                    value: null
                },

                firstTime: {
                    value: true
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'service-defaults-config-model']
});
