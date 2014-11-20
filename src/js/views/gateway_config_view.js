/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The view for a gateway config object.
 *
 * @module gateway-config-view
 */
YUI.add('gateway-config-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'gatewayConfigView';

    /**
     * A view for a single GatewayConfigModel (NOT on the live GatewayModel data).
     *
     * @class GatewayConfigView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.GatewayConfigView = Y.Base.create(
        NAME, 
        Y.View,
        [],
        {
            initializer: function() {
                var $this = this;

                var gatewayModel = this.get('model');
                var gatewayConfig = gatewayModel.get('gatewayConfig');

                // XXX Do we need to add ourselves as a target for anything here?
                // Don't think so.

                var realmConfigViews = this.get('realmConfigViews');
                var realmConfigs = gatewayConfig.get('realmConfigs');

                if (realmConfigs) {
                    for (var i = 0; i < realmConfigs.length; i++) {
                        var realmConfig = realmConfigs[i];
                        realmConfigViews.push(new Y.GatewayRealmConfigView({model: realmConfig,
                                                                            app: this.get('app')
                                                                           }));
                    }
                }

                var noRealmServiceConfigViews = this.get('noRealmServiceConfigViews');
                var serviceConfigs = gatewayConfig.get('serviceConfigs');

                if (serviceConfigs) {
                    for (var i = 0; i < serviceConfigs.length; i++) {
                        var serviceConfig = serviceConfigs[i];
                        if (!serviceConfig.get('realm')) {
                            noRealmServiceConfigViews.push(new Y.GatewayServiceConfigView({model: serviceConfig,
                                                                                           app: this.get('app')
                                                                                          }));
                        }
                    }
                }
            },

            /* Specify the destructor so we properly clean up the sub-view */
            destructor: function () {
                this.destroySubviews();
            },

            /**
             * Render the clusterRealmConfig. Our 'model' is a list of RealmConfigModels,
             * and we'll use the first one in the list for the display. We can't use a
             * GatewayRealmConfigView to display that because the list of services is
             * across multiple gateways.
             * Follow the 'view/subview' render pattern.
             */
            render: function() {
                var content = Y.one(Y.config.doc.createDocumentFragment());

                var modelList = this.get('modelList');
                var realmConfig = modelList.item(0);  

                // Add the realm display box
                var realmBox = createDIV(content, 'graphicRealm');

                var titleDiv = createDIV(realmBox, 'graphicRealmTitleDiv');
                
                var icon = createIMG(titleDiv, '../images/castle3.png', 'graphicRealmImage');
                
                var labelStr = createSPAN(titleDiv, 'Realm: ', 'graphicRealmTitle');

                var realmStr = createSPAN(titleDiv, realmConfig.get('name'), 'graphicRealmTitleName');
                
                // Add the service views
                var clusterServiceConfigViews = this.get('clusterServiceConfigViews');
                var numServiceViews = clusterServiceConfigViews.length;

                if (numServiceViews === 0) {
                    var div = createDIV(realmBox, 'graphicNoServiceRealm')
                        .set('text', 'No services refer to this realm');
                } else {
                    // Sort the views
                    var serviceViews = clusterServiceConfigViews.slice(); 
                    serviceViews.sort(function(a,b) {
                        var serviceConfig1 = a.get('modelList').item(0);
                        var serviceConfig2 = b.get('modelList').item(0);
                        return serviceConfig1.sortCompare(serviceConfig2);
                    });

                    for (var i = 0; i < numServiceViews; i++) {
                        var serviceConfigView = serviceViews[i];
                        realmBox.append(serviceConfigView.render().get('container'));
                    }
                }

                // Now that the pieces are assembled, set our container contents
                this.get('container').setHTML(content);

                return this;
            },

            /**
             * Compare this view vs another one, to see which one would be
             * shown first (basically, whichever has the earlier realm name.
             */
            sortCompare: function(clusterRealmConfigView) {
                var realm1 = this.get('modelList').item(0);
                var realm2 = clusterRealmConfigView.get('modelList').item(0);
                return realm1.sortCompare(realm2);
            }
        }, 
        {
            ATTRS: {
                container: {
                    value: null   // passed in on creation by YUI.
                },

                app: {
                    value: null
                },

                // Y.GatewayModel passed in on creation (never null)
                model: {
                    value: null
                },

                // For the realms in the gateway, GatewayRealmConfigViews,
                // in sorted order by realm name
                realmConfigViews: {
                    value: []
                },

                // For those services in the gateway that don't have a 
                // realm, the GatewayServiceConfigView for each.
                noRealmServiceConfigViews: {
                    value: [] 
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'gateway-config-model']
});
