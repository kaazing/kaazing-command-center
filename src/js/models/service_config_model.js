/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The service-config-model module contains the config details
 * for a single service within a single gateway within the Kaazing Command Center application.
 *
 * @module service-config-model
 */
YUI.add('service-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'serviceConfigModel';

    /**
     * To uniquely identify each ServiceConfigModel instance, a simple counter. 
     */
    var getNextClientServiceConfigId = (function() {
        var clientServiceConfigIdCounter = 0;

        return function() {
            return clientServiceConfigIdCounter++;
        }
    })();

    /**
     * A service config instance block within a GatewayConfigModel
     *
     * @class ServiceConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ServiceConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            // A 'type value' so we can sort the services by type, then name.
            SERVICE_TYPE_VALUES: {
                broadcast: 10,
                echo: 10,
                'stomp.proxy': 10,
                'stomp.jms': 10,
                'stomp.interceptor': 10,
                directory: 20,
                balancer: 19,
                session: 20,
                keyring: 20,
                'http.proxy': 30,
                proxy: 30,
                'management.jmx': 100,
                '$management.jmx$': 100,
                'management.snmp': 101,
                '$management.snmp$': 101
            },

            hasAttribute: function(attrName) {
                return Y.ServiceConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
                /**
                 * Assign a unique client-side ID to the given gateway, so we have a simple
                 * number to identify it and so other structures can refer to it as needed.
                 */
                this.set('clientServiceConfigId', getNextClientServiceConfigId());
            },

            /**
             * Are two ServiceConfigModels (presumably from different gateways), 
             * considered "the same" from the point of view of the cluster?
             */
            equals: function(otherSCM) {
                // the code below is split into individual tests so that we can 
                // add switches later to turn some tests off if the user wants to ignore them.
                if (!otherSCM) {
                    return false;
                }

                // quick shortcut
                if (this === otherSCM) {
                    return true;
                }

                if (!equalModelStrings(otherSCM.get('name'), this.get('name'))) {
                    return false;
                }

                if (!equalModelStrings(otherSCM.get('type'), this.get('type'))) {
                    return false;
                }

                if (!equalModelStrings(otherSCM.get('description'), this.get('description'))) {
                    return false;
                }

                if (!equalModelObjects(otherSCM.get('crossSiteConstraints'), this.get('crossSiteConstraints'))) {
                    return false;
                }

                if (!equalModelObjects(otherSCM.get('properties'), this.get('properties'))) {
                    return false;
                }

                if (!equalModelArrays(otherSCM.get('requiredRoles'), this.get('requiredRoles'))) {
                    return false;
                }

                if (!equalModelObjects(otherSCM.get('mimeMappings'), this.get('mimeMappings'))) {
                    return false;
                }

                if (!this.equalRealms(otherSCM)) {
                    return false;
                }

                if (!equalModelObjects(otherSCM.get('acceptOptions'), this.get('acceptOptions'))) {
                    return false;
                }

                if (!equalModelObjects(otherSCM.get('connectOptions'), this.get('connectOptions'))) {
                    return false;
                }

                // services that have no 'balances' element (i.e., they are either not balanced
                // or the cluster has an external load balancer) should compare their accepts for equality.
                // Services that are balanced by a Kaazing balancer service will generally not
                // have the same accepts (since they need to be distinguished by the balancer service), 
                // but the <balance> value needs to be equal.
                if (!equalModelArrays(otherSCM.get('balances'), this.get('balances'))) {
                    return false;
                }

                if (!this.isBalanced()) {
                    if (!equalModelStrings(otherSCM.get('accepts'), this.get('accepts'))) {
                        return false;
                    }
                }

                if (!equalModelStrings(otherSCM.get('connects'), this.get('connects'))) {
                    return false;
                }

                return true;
            },

            equalRealms: function(scm) {
                // remember with the realms, we converted to refs to the realm objects.
                var thisRealm = this.get('realm');
                var scmRealm = scm.get('realm');

                if (thisRealm) {
                    if (!thisRealm.equals(scmRealm)) {
                        return false;
                    }
                } else if (scmRealm) {
                    return false;
                }

                return true;
            },

            equalConnectOptions: function(scm) {
                var thisConnectOptions = this.get('connectOptions');
                var scmConnectOptions = scm.get('connectOptions');

                if (thisConnectOptions) {
                    if (!thisOptions.equals(scmConnectOptions)) {
                        return false;
                    }
                } else if (scmConnectOptions) {
                    return false;
                }

                return true;
            },

            /**
             * Comparison function for two service config models, for 
             * doing display sorting. Sort first by type, and then by name.
             */
            sortCompare: function(scm) {
                var type1 = this.SERVICE_TYPE_VALUES[this.get('type')];
                var type2 = this.SERVICE_TYPE_VALUES[scm.get('type')];

                if (type1 < type2) {
                    return -1;
                } else if (type1 > type2) {
                    return 1;
                } 

                // types equal, sort by name
                var name1 = this.get('name');
                var name2 = scm.get('name');

                if (!name1) {
                    return (name2 ? 1 : 0); // guys w/o names at the bottom
                } else if (!name2) {
                    return -1;
                } else {
                    name1 = name1.toLowerCase();
                    name2 = name2.toLowerCase();

                    if (name1 < name2) {
                        return -1;
                    } else {
                        return (name1 === name2 ? 0 : 1);
                    }
                }
            },
            
            isManagement: function() {
                var type = this.get('type');
                return (type.startsWith('$management.') || type.startsWith('management.')
                        ? true
                        : false);
            },

            /**
             * Indicate if the service is balanced. If balance allowed, it is an array
             * (possibly empty, meaning "none specified"). Only if not allowed is it null.
             */
            isBalanced: function() {
                var balances = this.get('balances');
                return (balances && balances.length > 0);
            },
            
            // Dump the attributes
            dump: function() {
                CC.console.debug("ServiceConfig for GW " + this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'name', offset);
                dumpAttr(this, 'type', offset);
                dumpAttr(this, 'description', offset);
                dumpAttr(this, 'accepts', offset);
                dumpAttr(this, 'acceptOptions', offset);
                dumpAttr(this, 'balances', offset);
                dumpAttr(this, 'connects', offset);
                dumpAttr(this, 'connectOptions', offset);
                dumpAttr(this, 'crossSiteConstraints', offset);
                dumpAttr(this, 'properties', offset);
                dumpAttr(this, 'requiredRoles', offset);
                dumpAttr(this, 'realm', offset);
                dumpAttr(this, 'mimeMappings', offset);
            }

        }, 
        {
            ATTRS: {

                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                // A 'live' ID generated on the server side each time at startup,
                // to let us hook together the service config and service model.
                serviceId: {
                    value: null
                },
                type: {
                    value: null
                },
                name: {
                    value: null
                },
                description: {
                    value: null
                },
                accepts: {
                    value: null
                },
                acceptOptions: {
                    value: null
                },
                balances: {
                    value: null
                },
                connects: {
                    value: null
                },
                connectOptions: {
                    value: null
                },
                crossSiteConstraints: {
                    value: null
                },
                properties: {
                    value: null
                },
                requiredRoles: {
                    value: null
                },
                realm: {
                    value: null
                },
                mimeMappings: {
                    value: null
                },

                // "Fake" attribute we use for displaying the config in select
                // lists and such (see ServiceModel and SessionModel for others).
                label: {
                    getter: function() {
                        var label = this.get('name');
                        if (!label) {
                            label = "Type: " + this.get('type');
                        }
                        return label;
                    }
                }

            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});
