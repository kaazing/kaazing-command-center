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
 * The view for a cluster-level service-config object.
 *
 * @module cluster-service-config-view
 */
YUI.add('cluster-service-config-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'clusterServiceConfigView';

    /**
     * A cluster-level view of a list of "equal" ServiceConfigModels, so we can easily
     * control visibility and things like 'show URLs'. This shows a single SCM
     * to represent the entire list. This is primarily just a container for a sub-view
     * of a single SCM, along with a possible warning about the number of gateways.
     *
     * @class ClusterServiceConfigView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ClusterServiceConfigView = Y.Base.create(
        NAME, 
        Y.View,
        [],
        {
            initializer: function() {
                var $this = this;

                var serviceConfigs = $this.get('modelList');  // ModelList of ServiceConfigModel

                serviceConfigs.addTarget($this);

                $this.after('showUrlsChange', 
                            $this.afterShowUrlsChange, 
                            $this);

                var serviceConfigView = new Y.GatewayServiceConfigView({model:serviceConfigs.item(0),
                                                                        showUrls: this.get('showUrls'),
                                                                        app: this.get('app')});
                serviceConfigView.addTarget(this);
                this.set('serviceConfigView', serviceConfigView);
            },

            /**
             * Given a new ServiceConfig (added after initialization), see if it matches 
             * the service configs in this view. If so, add it to the serviceConfig ModelList, 
             * and process its services into our local list of ServiceConfig ModelLists.
             */
            addServiceConfig: function(serviceConfig) {
                var serviceConfigs = this.get('modelList');

                if (!serviceConfigs.item(0).equals(serviceConfig)) {
                    return false;
                }

                // yay, we match!
                serviceConfigs.add(serviceConfig);

                return true;
            },

            /**
             * Given a ServiceConfig, return true if this view's list of service configs contains
             * that particular config, else false. We generally use this during removal.
             */
            containsServiceConfig: function(serviceConfig) {
                var serviceConfigs = this.get('modelList');
                return (serviceConfigs.indexOf(serviceConfig) >= 0);
            },

            removeServiceConfig: function(serviceConfig) {
                var serviceConfigs = this.get('modelList');
                serviceConfigs.remove(serviceConfig);
            },

            isEmpty: function() {
                var serviceConfigs = this.get('modelList');
                return (serviceConfigs.size() === 0);
            },

            /* Specify the destructor so we properly clean up the sub-view */
            destructor: function () {
                this.get('serviceConfigView').destroy();
                this.set('serviceConfigView', null);
            },

            /**
             * Response to flipping the 'Show Urls' state
             */
            afterShowUrlsChange: function(ev) {
                this.get('serviceConfigView').set('showUrls', this.get('showUrls'));
            },

            /**
             * Calculate whether or not our GatewayServiceConfigView should display a
             * warning or other icon. 
             * Initially, this will just be to indicate that a given service is not
             * showing up in all the cluster members.
             */
            calculateWarnings: function() {

                var numRelevantGateways = this.getNumRelevantGateways();
                var numServiceConfigs = this.get('modelList').size();

                this.get('serviceConfigView')
                    .set('warning',
                         (numServiceConfigs === numRelevantGateways
                          ? null 
                          : "This service is configured in only " + numServiceConfigs + 
                          " of " + numRelevantGateways + " cluster members"));
                if (numServiceConfigs > numRelevantGateways) {
                    // we have a weird error, check why.
                    var i = 0;
                }
            },

            /**
             * We need an odd calculation here: for managed gateways, we need only those
             * that are usable (have managed to get logged in and do not yet have a 
             * stopTime). For unmanaged, we just need those that do not have a stopTime.
             */
            getNumRelevantGateways: function() {
                var gateways = this.get('clusterModel').getGateways();
                var numGateways = 0;
                if (gateways) {
                    gateways.forEach(function(gateway) {
                        if (!gateway.get('stopTime')) {
                            if (!gateway.isManaged() ||
                                gateway.isUsable()) {
                                numGateways++;
                            }
                        }
                    });
                }

                return numGateways;
            },

            /**
             * Render the clusterServiceConfig. Our 'model' is a list of ServiceConfigModels,
             * and we'll use the first one in the list as the display. We'll use a 
             * ServiceConfigView to display that one guy.
             */
            render: function() {
                // Create a document fragment to hold the HTML created from
                // rendering the subview. We'll add more later.
                var content = Y.one(Y.config.doc.createDocumentFragment());

                // Render the subview into the document fragment,
                // then sets the fragment as the contents of this view's container.
                var serviceConfigView = this.get('serviceConfigView');

                var configViewContainer = serviceConfigView.render().get('container');
                content.append(configViewContainer);

                this.get('container').setHTML(content);

                return this;
            },

            /**
             * Compare this view vs another one, to see which one would be
             * shown first (basically, whichever has the earlier realm name.
             */
            sortCompare: function(clusterServiceConfigView) {
                var service1 = this.get('modelList').item(0);
                var service2 = clusterServiceConfigView.get('modelList').item(0);
                return service1.sortCompare(service2);
            }
        }, 
        {
            ATTRS: {
                container: {
                    value: null
                },

                // reference back to the application
                app: {
                    value: null
                },

                // reference back to the cluster. 
                clusterModel: {
                    value: null
                },

                // ModelList of ServiceConfigModels, pass in on creation (non-empty), 
                // added to over time. All are considered 'equal'.
                modelList: {
                    value: null   
                },

                // The ServiceConfigView that represents our display.
                serviceConfigView: {
                    value: null
                },

                showUrls: {
                    value: false
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'cluster-model']
});
