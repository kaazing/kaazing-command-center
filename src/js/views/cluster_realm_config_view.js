/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The view for a cluster realm config object.
 *
 * @module cluster-realm-config-view
 */
YUI.add('cluster-realm-config-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'clusterRealmConfigView';

    /**
     * A cluster-level view of a ModelList of "equal" RealmConfigModels, so we can easily
     * control visibility and things like 'show URLs'. This shows a single RealmConfigModel
     * to represent the entire ModelList. Realms can be empty, and otherwise will contain
     * ClusterServiceConfigViews.
     *
     * The view is initially created with a ModelList of a single RealmConfigModel (see
     * config_overview_view.js).
     *
     * @class ClusterRealmConfigView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ClusterRealmConfigView = Y.Base.create(
        NAME, 
        Y.View, 
        [],
        {
            initializer: function() {
                // Our modelList consists of RealmConfigModels. On setup, there is only 1 RCM.     
                var modelList = this.get('modelList');  
                modelList.addTarget(this);

                this.addRealmConfig(modelList.item(0));

                this.after('modelListChange', 
                           this.afterModelChange, 
                           this);

                this.after('showUrlsChange', 
                           this.afterShowUrlsChange, 
                           this);
            },

            /**
             * Given a new RealmConfig (added after initialization of the view), 
             * see if it matches the realm configs in this view (we only have 
             * to test 1, since if one does they all match by definition.) If so, 
             * add it to the realmConfig ModelList, and add its services into 
             * our local list of ServiceConfig ModelLists.
             */
            addRealmConfig: function(realmConfig) {
                var realmConfigs = this.get('modelList');

                if (!realmConfigs.item(0).equals(realmConfig)) {
                    return false;
                }

                // yay, we match! 
                realmConfigs.add(realmConfig);

                this.addServiceConfigs(realmConfig);
                
                return true;
            },

            /**
             * Given a RealmConfig, return true if this view's list of realm configs contains
             * that particular config, else false. We generally use this during removal.
             */
            containsRealmConfig: function(realmConfig) {
                var realmConfigs = this.get('modelList');

                return (realmConfigs.indexOf(realmConfig) >= 0);
            },

            removeRealmConfig: function(realmConfig) {
                var realmConfigs = this.get('modelList');
                realmConfigs.remove(realmConfig);
                this.removeServiceConfigs(realmConfig);
            },

            isEmpty: function() {
                var realmConfigs = this.get('modelList');
                return (realmConfigs.size() === 0);
            },

            /**
             * Given a new RealmConfig (either on initialization or because of a 
             * later Gateway add), add its associated ServiceConfigModels into 
             * our lists of ModelLists by checking to see which services match 
             * and adding new ones as needed.
             */
            addServiceConfigs: function(realmConfig) {
                var newServiceConfigs = realmConfig.get('serviceConfigs');  // [] of ServiceConfigModels

                if (newServiceConfigs) {
                    var clusterServiceConfigViews = this.get('clusterServiceConfigViews'); 
                    var clusterServiceConfigView = null;

                    for (var i = 0; i < newServiceConfigs.length; i++) {
                        var newServiceConfig = newServiceConfigs[i];

                        var found = false;

                        for (var j = 0; j < clusterServiceConfigViews.length; j++) {
                            clusterServiceConfigView = clusterServiceConfigViews[j];

                            if (clusterServiceConfigView.addServiceConfig(newServiceConfig)) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            // need to create a new ClusterServiceConfigView, since our service
                            // doesn't match any of the other ones for this RealmConfig.
                            // Then we need to insert it in the right place in the array of 
                            // ClusterServiceConfigViews.
                            var modelList = new Y.ModelList({model: Y.ServiceConfigModel});
                            modelList.add(newServiceConfig);

                            clusterServiceConfigView = 
                                new Y.ClusterServiceConfigView({modelList: modelList,
                                                                clusterModel: this.get('clusterModel'),
                                                                showUrls: this.get('showUrls'),
                                                                app: this.get('app')
                                                               });
                            clusterServiceConfigViews.push(clusterServiceConfigView);
                        }
                    }
                }
            },

            /**
             * Given a RealmConfig that we're removing from this view, remove its associated
             * ServiceConfigModels from our lists of ModelLists.
             */
            removeServiceConfigs: function(realmConfig) {
                var serviceConfigs = realmConfig.get('serviceConfigs');  // [] of ServiceConfigModels

                if (serviceConfigs) {
                    var clusterServiceConfigViews = this.get('clusterServiceConfigViews'); 
                    var clusterServiceConfigView = null;

                    for (var i = 0; i < serviceConfigs.length; i++) {
                        var serviceConfig = serviceConfigs[i];

                        for (var j = 0; j < clusterServiceConfigViews.length; j++) {
                            clusterServiceConfigView = clusterServiceConfigViews[j];

                            if (clusterServiceConfigView.containsServiceConfig(serviceConfig)) {
                                clusterServiceConfigView.removeServiceConfig(serviceConfig);
                                if (clusterServiceConfigView.isEmpty()) {
                                    arrayRemove(clusterServiceConfigViews, clusterServiceConfigView);
                                    clusterServiceConfigView.destroy();
                                }
                                break;
                            }
                        }
                    }
                }
            },

            calculateWarnings: function() {
                var serviceConfigViews = this.get('clusterServiceConfigViews');
                for (var i = 0; i < serviceConfigViews.length; i++) {
                    serviceConfigViews[i].calculateWarnings();
                }
            },

            /* Specify the destructor so we properly clean up the sub-view */
            destructor: function () {
                this.destroySubviews();
            },

            afterModelListChange: function(ev) {
                this.destroySubviews();

                var container = $this.get('container');
                removeAllChildren(container);
                
                ev.prevVal && ev.prevVal.removeTarget(this);
                ev.newVal && ev.newVal.addTarget(this);
                
                this.initializeSubviews();

                // note that we don't force a render(), as we're expecting
                // a parent to do that.
            },

            /**
             * Response to flipping the 'Show Urls' state
             */
            afterShowUrlsChange: function(ev) {
                var subviews = this.get('clusterServiceConfigViews');
                for (var i = 0; i < subviews.length; i++) {
                    subviews[i].set('showUrls', this.get('showUrls'));
                }

                // XXX Do we have to do anything here to like reposition anything?
            },

            /**
             * Render the clusterRealmConfig. Our 'model' is a list of RealmConfigModels,
             * and we'll use the first one in the list for the display. We can't use a
             * GatewayRealmConfigView to display that because the list of services is
             * across multiple gateways.
             * Follow the 'view/subview' render pattern.
             */
            render: function() {
                var $this = this;
                var content = Y.one(Y.config.doc.createDocumentFragment());

                var modelList = this.get('modelList');
                var realmConfig = modelList.item(0);  

                // Add the realm display box
                var realmBox = createDIV(content, 'graphicRealm');
                var titleDiv = createDIV(realmBox, 'graphicRealmTitleDiv');
                var icon = createIMG(titleDiv, '../images/castle3.png', 'graphicRealmImage');
                
                var labelStr = createSPAN(titleDiv, 'Realm: ', 'graphicRealmTitle');
                var realmLink = createLINK(titleDiv, 'javascript:void(0);', 'graphicRealmTitleName')
                    .set('text', realmConfig.get('name'));
                
                realmLink.on('click', (function(realmConfig) {
                    return function(ev) {
                        $this.get('app').save('/config/security/realms?connectionUrl=' + 
                                              realmConfig.get('gatewayModel').get('connectionUrl') + 
                                              "&realm=" + realmConfig.get('name'));
                    }
                })(realmConfig));



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
            },

            destroySubviews: function() {
                var clusterServiceConfigViews = this.get('clusterServiceConfigViews');
                var i;

                for (i = 0; i < clusterServiceConfigViews.length; i++) {
                    var clusterServiceConfigView = clusterServiceConfigViews[i];
                    clusterServiceConfigView.destroy();
                }

                this.set('clusterServiceConfigViews', []);
            }

        }, {
            ATTRS: {
                container: {
                    value: null   // passed in on creation by YUI.
                },

                app: {
                    value: null
                },

                // reference back to the cluster.
                clusterModel: {
                    value: null   // passed in on creation
                },

                // ModelList of RealmConfigModels, passed in on creation (non-empty), 
                // added to over time. All are considered 'equal'.
                modelList: {
                    value: null   
                },

                // List of ClusterServiceConfigViews, each of which handles 
                // a list of 'equal' ServiceConfigModels
                clusterServiceConfigViews: {
                    value: [] 
                },

                showUrls: {
                    value: false
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'cluster-model', 'gateway-model', 'realm-config-model']
});

