/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The view for a gateway service config objects.
 *
 * @module config-services-view
 */
YUI.add('config-services-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'configServicesView';

    /**
     * The View for selecting and displaying information about a single
     * cluster-level service config (i.e. service that is common across gateways.)
     *
     * @class ConfigServicesView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ConfigServicesView = Y.Base.create(
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
                    this.after('selectedServiceConfigChange', 
                               this.afterSelectedServiceConfigChange, 
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

                    this.updateClusterServiceConfigs();

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
                this.updateClusterServiceConfigs();
                this.render();
            },

            onGatewayAvailable: function(ev) {
                this.updateClusterServiceConfigs();
                this.render();
            },

            afterStopTimeChange: function(ev) {
                this.updateClusterServiceConfigs();
                this.render();
            },

            afterSelectedServiceConfigChange: function(ev) {
                this.render();
            },
            
            updateClusterServiceConfigs: function() {
                var clusterServiceConfigs = this.buildServiceConfigList();  // array of arrays
                this.set('clusterServiceConfigs', clusterServiceConfigs);
            },

            /**
             * Given the usable gatewayModels the cluster contains, build an 
             * array of arrays of 'equal' ServiceConfigModels across all the gateways.
             */
            buildServiceConfigList: function() {
                var serviceConfigLists = [];  // array of arrays

                var i, j, k;

                var gatewayModels = this.get('model').getUsableGateways();

                if (gatewayModels && gatewayModels.length > 0) {
                    for (i = 0; i < gatewayModels.length; i++) {
                        var gatewayModel = gatewayModels[i];

                        // if usable, we will have the gatewayConfig.
                        var gatewayConfig = gatewayModel.get('gatewayConfig');

                        var serviceConfigs = gatewayConfig.get('serviceConfigs');
                        if (!serviceConfigs) {
                            continue;
                        }

                        serviceConfigs.forEach(function(serviceConfig) {
                            var found = false;

                            for (k = 0; k < serviceConfigLists.length; k++) {
                                var serviceConfigList = serviceConfigLists[k];
                                if (serviceConfig.equals(serviceConfigList[0])) {
                                    found = true;
                                    serviceConfigList.push(serviceConfig);
                                    break;
                                }
                            }

                            if (!found) {
                                serviceConfigLists.push([serviceConfig]);
                            }
                        });
                    }

                    serviceConfigLists.sort(function(serviceConfigList1,serviceConfigList2) {
                        var config1 = serviceConfigList1[0];
                        var config2 = serviceConfigList2[0];
                        return config1.sortCompare(config2);
                    });
                }

                return serviceConfigLists;
            },

            /**
             * Render the entire view
             */
            render: function() {
                if (this.isActiveView()) {
                    removeAllChildren(this.get('container').one('#configServicesData'));
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

                var clusterServiceConfigs = this.get('clusterServiceConfigs');

                var toolbar = this.get('toolbar');
                removeAllChildren(toolbar);

                var selector = createSELECT(toolbar, 'toolbarSelect');

                var option = createOPTION(selector, null, 'Select a service...')
                    .set('selected', false);

                if (clusterServiceConfigs && clusterServiceConfigs.length > 0) {
                    // Remember, we have LISTS of "equal" service configs here. Get the
                    // labels of the first of each and sort them.
                    clusterServiceConfigs.sort(function(scList1, scList2) {
                        var l1 = scList1[0].get('label').toLowerCase();
                        var l2 = scList2[0].get('label').toLowerCase();
                        if (l1 == l2) {
                            return 0;
                        } else {
                            return (l1 < l2 ? -1 : 1);
                        }
                    });

                    var ssc = this.get('selectedServiceConfig');

                    for (var i = 0; i < clusterServiceConfigs.length; i++) {
                        var serviceConfigList = clusterServiceConfigs[i];
                        var serviceConfigModel = serviceConfigList[0];
                        var label = serviceConfigModel.get('label');

                        option = createOPTION(selector, null, label);

                        if (serviceConfigModel.equals(ssc)) {
                            option.set('selected', true);
                        }
                    }

                    selector.after('change', function(ev) {
                        var select = ev.target;
                        var selIndex = select.get('selectedIndex'); // the selector is 'this' here
                        if (selIndex <= 0) {
                            if ($this.get('selectedServiceConfig') !== null) {
                                $this.set('selectedServiceConfig', null);
                            }
                            
                            return;
                        } 

                        // remember to subtract 1 from the selection because we have the
                        // 'Select a service' label as index 0.
                        var serviceConfigModel = null;

                        var clusterServiceConfigs = $this.get('clusterServiceConfigs');
                        if (clusterServiceConfigs && clusterServiceConfigs.length >= selIndex) {
                            var clusterServiceConfig = clusterServiceConfigs[selIndex - 1];
                            // clusterServiceConfig itself is an array
                            if (clusterServiceConfig.length > 0) {
                                serviceConfigModel = clusterServiceConfig[0];
                            }  // somehow array has gone to 0.
                        }

                        if ($this.get('selectedServiceConfig') !== serviceConfigModel) {
                            $this.set('selectedServiceConfig', serviceConfigModel);
                        }
                    });
                } else {
                    // somehow we 'lost' the service configs (perhaps because a 
                    // gateway went away).
                    if (this.get('selectedServiceConfig') !== null) {
                        this.set('selectedServiceConfig', null);
                    }
                }
            },

            /**
             * Render the data fields, for whatever ServiceConfigModel happens 
             * to be selected. If there is none selected, clear all data fields.
             */
            renderData: function() {
                var container = this.get('container');
                var dataDiv = container.one('#configServicesData');

                removeAllChildren(dataDiv);

                var ssc = this.get('selectedServiceConfig');

                if (!ssc) {
                    return;
                }
                
                var content = Y.one(Y.config.doc.createDocumentFragment());

                content.append(this.renderDetails(ssc));
                content.append(this.renderAcceptData(ssc));
                content.append(this.renderCrossSiteConstraints(ssc));
                content.append(this.renderConnectData(ssc));
                content.append(this.renderProperties(ssc));
                content.append(this.renderAuthorizationConstraints(ssc));
                content.append(this.renderMimeMappings(ssc));
                
                dataDiv.append(content);

                return this;
            },

            /**
             * Render the 'Details' section.
             * @param ssc the selected service config from the user's service menu
             */
            renderDetails: function(ssc) {
                var $this = this;
                
                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .setHTML('Service: <SPAN class="configServicesServiceName">' + 
                             ssc.get('label') + 
                             '</SPAN>'); // XXX replace later with lookup

                var table = createTABLE(section);

                // Figure out the gateways the service is defined in
                var clusterServiceConfigs = this.get('clusterServiceConfigs');

                var scArray;

                for (var j = 0; j < clusterServiceConfigs.length; j++) {
                    scArray = clusterServiceConfigs[j];
                    if (scArray[0].equals(ssc)) {
                        // found the array that matches our selected config
                        break;
                    }
                }

                var definedInGateways = [];
                var gatewayModel;

                for (var j = 0; j < scArray.length; j++) {
                    gatewayModel = scArray[j].get('gatewayModel');

                    if (definedInGateways.indexOf(gatewayModel) == -1) {
                        definedInGateways.push(gatewayModel);
                    }
                }

                var definedInStr = definedInGateways.map(function(elt, index, arr) {
                    return elt.get('gatewayLabel');
                }).sort().join(', ');

                var tr = createTR(table);

                var td = createTD(tr, 'configServicesDetailLabel')
                    .set('text', 'Defined In:');                   // XXX replace later with lookup

                td = createTD(tr, 'servicesDataValue')
                    .setHTML(this.createValueHtml(definedInStr));


                // Type
                tr = createTR(table);

                td = createTD(tr, 'configServicesDetailLabel')
                    .set('text', 'Type:')                    // XXX replace later with lookup

                td = createTD(tr, 'servicesDataValue')
                    .setHTML(this.createValueHtml(ssc.get('type')));

                // Realm
                tr = createTR(table);

                td = createTD(tr, 'configServicesDetailLabel')
                    .set('text', 'Security Realm:');         // XXX replace later with lookup

                var realm = ssc.get('realm');

                td = createTD(tr, 'servicesDataValue');
                
                if (realm) {
                    var gatewayModel = ssc.get('gatewayModel');

                    var link = createLINK(td, 'javascript:void(0)')
                        .setHTML(this.createValueHtml(realm.get('name')));

                    link.on('click',
                            (function(connectionUrl, realmName) {
                                return function(ev) {
                                    ev.halt(true);
                                    $this.get('app').save('/config/security/realms?connectionUrl=' + 
                                                          connectionUrl + 
                                                          '&realm=' + realmName);
                                };
                            })(gatewayModel.get('connectionUrl'), realm.get('name')));

                } else {
                    td.setHTML(this.createValueHtml('<none>'));
                }

                return content;
            },

            renderAcceptData: function(ssc) {
                var $this = this;
                
                //-----------------------------------------------------------------
                // acceptUrls and acceptOptions can return null (e.g. for JMX). In that
                // case both will return null at the same time. If their values are 
                // not null, accepts will return a (possibly empty) array and acceptOptions 
                // will return an object (either empty or with properties).
                //-----------------------------------------------------------------
                var acceptUrls = (ssc && ssc.get('accepts'));
                var acceptOptions = (ssc && ssc.get('acceptOptions'));

                var hasAcceptUrls = !isEmptyValue(acceptUrls);
                var hasAcceptOptions = !isEmptyValue(acceptOptions);

                if (!hasAcceptUrls && !hasAcceptOptions) {
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .set('text', 'Accepts');                  // XXX replace later with lookup

                // Accept URLs
                if (hasAcceptUrls) {
                    var urlsSection = createDIV(section);

                    header = createH(urlsSection, 4)
                        .set('text', 'URLs');                  // XXX replace later with lookup

                    var table = createTABLE(urlsSection, 'configDataTable');

                    for (var i = 0; i < acceptUrls.length; i++) {
                        var tr = createTR(table);
                        var td = createTD(tr, 'servicesDataValue')
                            .setHTML(this.createValueHtml(acceptUrls[i]));
                    }
                }

                // Accept Options
                if (hasAcceptOptions) {
                    var optionsSection = createDIV(section);

                    header = createH(optionsSection, 4)
                        .set('text', 'Options');               // XXX replace later with lookup

                    var table = createTABLE(optionsSection, 'configDataTable');

                    // put the property keys into a sorted list, so we
                    // can display them and their values in sorted order.
                    var keys = getSortedKeys(acceptOptions);

                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var value = acceptOptions[key];
                        var type = typeOf(value);
                        var str;

                        if (type === "array") {
                            str = value.map(function(elt, index, arr) {
                                return $this.createValueHtml(elt);
                            }).join('<BR>');
                        } else if (type === 'object') {
                            var propArray = [];
                            for (var prop in value) {
                                if (value.hasOwnProperty(prop)) {
                                    propArray.push(prop);
                                }
                            }
                            if (propArray.length === 0) {
                                str = "";
                            } else {
                                propArray.sort();
                                str = propArray.map(function(elt, index, arr) {
                                    return '<b>' + $this.createValueHtml(elt) + ':</b> ' + $this.createValueHtml(value[elt]);
                                }).join('<BR>');
                            }
                        } else {
                            str = this.createValueHtml(value);
                        }

                        var tr = createTR(table);

                        var td = createTD(tr, 'configServicesDataLabel')
                            .set('text', key);

                        td = createTD(tr, 'servicesDataValue')
                            .setHTML(str);
                    }
                }

                return content;
            },

            renderConnectData: function(ssc) {
                //-----------------------------------------------------------------
                // If connects are disallowed (e.g. for echo or Stomp JMS), connectUrls
                // and connecteOptions will return null. If not, connectUrls will return
                // a (possibly empty) array and connectOptions will return an object
                // (either empty or with properties).
                //-----------------------------------------------------------------
                var connectUrls = (ssc && ssc.get('connects'));
                var connectOptions = (ssc && ssc.get('connectOptions'));

                var hasConnectUrls = !isEmptyValue(connectUrls);
                var hasConnectOptions = !isEmptyValue(connectOptions);

                if (!hasConnectUrls && !hasConnectOptions) {
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .set('text', 'Connect');               // XXX replace later with lookup

                // Connect URLs
                if (hasConnectUrls) {
                    var urlsSection = createDIV(section);

                    header = createH(urlsSection, 4)
                        .set('text', 'URLs');                  // XXX replace later with lookup

                    var table = createTABLE(urlsSection, 'configDataTable');

                    for (var i = 0; i < connectUrls.length; i++) {
                        var tr = createTR(table);

                        var td = createTD(tr, 'servicesDataValue')
                            .setHTML(this.createValueHtml(connectUrls[i]));
                    }
                }

                // Connect Options
                if (hasConnectOptions) {
                    var optionsSection = createDIV(section);

                    header = createH(optionsSection, 4)
                        .set('text', 'Options');               // XXX replace later with lookup

                    var table = createTABLE(optionsSection, 'configDataTable');

                    // put the property keys into a sorted list, so we
                    // can display them and their values in sorted order.
                    var keys = getSortedKeys(connectOptions);

                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var value = connectOptions[key];

                        tr = createTR(table);

                        td = createTD(tr, 'configServicesDataLabel')
                            .set('text', key);
                        td = createTD(tr, 'servicesDataValue')
                            .setHTML(this.createValueHtml(value));
                    }
                }

                return content;
            },

            renderProperties: function(ssc) {
                var properties = (ssc && ssc.get('properties'));

                if (isEmptyValue(properties)) {
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .set('text', 'Properties');                  // XXX replace later with lookup

                var table = createTABLE(section, 'configDataTable');

                // put the property keys into a sorted list, so we
                // can display them and their values in sorted order.
                var keys = getSortedKeys(properties);

                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var value = properties[key];

                    // Some properties are special, in that you can have
                    // an array of them directly (i.e., the top-level
                    // value is an array of objects).  We don't want to
                    // show the item as a sub-array of a single root key,
                    // even though that's actually what they are.
                    if (typeOf(value) !== 'array') {
                        value = [value]; // force to array, for simplicity.
                    }

                    for (var j = 0; j < value.length; j++) {
                        var tr = createTR(table);

                        var td = createTD(tr, 'configServicesDataLabel')
                            .set('text', key);
                        td = createTD(tr, 'servicesDataValue')
                            .setHTML(this.createValueHtml(value[j]));
                    }
                }

                return content;
            },

            renderCrossSiteConstraints: function(ssc) {
                var crossSiteConstraints = (ssc && ssc.get('crossSiteConstraints'));

                if (isEmptyValue(crossSiteConstraints)) {
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .set('text', 'Cross-Site Constraints');     // XXX replace later with lookup

                var table = createTABLE(section, 'configDataTable');

                // A cross-site constraint entry has an allow-origin (URI)
                // an options CSV list of allow-methods, and an optional CSV 
                // list of allow-headers, and an optional maximum-age.
                var tr, td, th, thead;

                thead = createTHEAD(table);

                th = createTH(thead, 'configServicesDataLabel')
                    .set('text', 'Origin');

                th = createTH(thead, 'configServicesDataLabel')
                    .set('text', 'Methods');

                th = createTH(thead, 'configServicesDataLabel')
                    .set('text', 'Headers');

                th = createTH(thead, 'configServicesDataLabel')
                    .set('text', 'Maximum Age');

                for (var i = 0; i < crossSiteConstraints.length; i++) {
                    var origin = '';
                    var methods = '';
                    var headers = '';
                    var maximumAge = '';
                    var constraint = crossSiteConstraints[i];

                    for (var field in constraint) {
                        if (field === 'allow-origin') {
                            origin = constraint[field];
                        } else if (field === 'allow-methods') {
                            methods = constraint[field];
                        } else if (field === 'allow-headers') {
                            headers = constraint[field];
                        } else if (field === 'maximum-age') {
                            maximumAge = constraint[field];
                        }
                    }

                    tr = createTR(table);

                    td = createTD(tr, 'servicesDataValue')
                        .setHTML(this.createValueHtml(origin));

                    td = createTD(tr, 'servicesDataValue')
                        .setHTML(this.createValueHtml(methods));

                    td = createTD(tr, 'servicesDataValue')
                        .setHTML(this.createValueHtml(headers));

                    td = createTD(tr, 'servicesDataValue')
                        .setHTML(this.createValueHtml(maximumAge));
                }

                return content;
            },

            renderAuthorizationConstraints: function(ssc) {
                var authorizationConstraints = (ssc && ssc.get('requiredRoles'));

                if (isEmptyValue(authorizationConstraints)) {
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .set('text', 'Authorization Constraints');     // XXX replace later with lookup

                var table = createTABLE(section, 'configDataTable');

                // NOTE: in the config, authorization constraints can consist
                // of multiples of either of two choices: <require-role> or <require-valid-user>.
                // The second is really syntactic sugar for require-role = "*", so it's easier
                // for users to deal with it. We should convert back to the "nice" version here.

                for (var i = 0; i < authorizationConstraints.length; i++) {
                    var constraint = authorizationConstraints[i].trim();

                    var tr = createTR(table);

                    var label;

                    if (constraint === "*") {
                        label = "require-valid-user";
                        constraint = "";
                    } else {
                        label = "required-role";
                    }

                    var td = createTD(tr, 'configServicesDataLabel')
                        .set('text', label);

                    td = createTD(tr, 'servicesDataValue')
                        .setHTML(this.createValueHtml(constraint));
                }

                return content;
            },

            renderMimeMappings: function(ssc) {
                var mimeMappings = (ssc && ssc.get('mimeMappings'));

                if (isEmptyValue(mimeMappings)) {
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                var section = createDIV(content, 'configServicesSection');

                var header = createH(section, 3)
                    .set('text', 'MIME Mappings');     // XXX replace later with lookup

                var table = createTABLE(section, 'configDataTable');

                var tr, td, thead, th;

                thead = createTHEAD(table);

                th = createTH(thead, 'configServicesDataLabel')
                    .set('text', 'Extension');

                th = createTH(thead, 'configServicesDataLabel')
                    .set('text', 'MIME Type');

                // put the mime mappings keys into a sorted list, so we
                // can display them and their values in sorted order.
                var keys = getSortedKeys(mimeMappings);

                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var value = mimeMappings[key];

                    tr = createTR(table);

                    td = createTD(tr, 'configServicesDataLabel')
                        .setHTML(this.createValueHtml(key));
                    td = createTD(tr, 'servicesDataValue')
                        .setHTML(this.createValueHtml(value));
                }

                return content;
            },

            /**
             * Some item values are strings, some are numbers, some are 
             * objects or arrays of sub-items. Create a string representation
             * for each such that we can then display it reasonably.
             * The first case for this is <topic> sub-items in JMS service properties
             * (KG-8757), but it will almost undoubtedly be useful elsewhere.
             */
            createValueHtml: function(value) {
                var $this = this;

                var str;

                var type = typeOf(value);

                if (type === "array") {
                    str = value.map(function(elt, index, arr) {
                        return $this.createValueHtml(elt);
                    }).join('<BR>');
                } else if (type === 'object') {
                    var propArray = [];
                    for (var prop in value) {
                        if (value.hasOwnProperty(prop)) {
                            propArray.push(prop);
                        }
                    }
                    if (propArray.length === 0) {
                        str = "";
                    } else {
                        propArray.sort();
                        str = propArray.map(function(elt, index, arr) {
                            return '<b>' + $this.createValueHtml(elt) + ':</b> ' + $this.createValueHtml(value[elt]);
                        }).join('<BR>');
                    }
                } else {
                    str = Y.Escape.html(value);
                }

                return str;
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#configServicesViewContainer');
                    }
                },

                title: {
                    value: 'Configuration : Services'
                },
                
                toolbar: {
                    value: null
                },

                /**
                 * The latest set of cluster-level service configs, updated
                 * after each change to the set of gateways.
                 */
                clusterServiceConfigs: {
                    value: null
                },

                /**
                 * The service config to display.
                 */
                selectedServiceConfig: {
                    value: null
                },

                firstTime: {
                    value: true
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'service-config-model']
});
