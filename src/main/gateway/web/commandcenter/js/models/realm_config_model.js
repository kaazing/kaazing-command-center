/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The realm-config-model module contains the security realm config details
 * for a single realm within a single gateway with the Kaazing Command Center application.
 *
 * @module realm-config-model
 */
YUI.add('realm-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'realmConfigModel';

    /**
     * A realm config instance block within a GatewayConfigModel
     *
     * @class SecurityConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.RealmConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            hasAttribute: function(attrName) {
                return Y.RealmConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
                // Sort multi-valued fields appropriately for presentation.

                // Get the array of login modules (from JSON). Turns out that one of the 
                // pieces of data that we store in the login module options is
                // 'GATEWAY_CONFIG_DIRECTORY'. This is actually internal, not user-specified
                // in the config, so we're going to remove it (for now.)
                var loginModules = this.get('loginModules');
                if (loginModules) {
                    for (var i = 0; i < loginModules.length; i++) {
                        var loginModule = loginModules[i];
                        var options = loginModule.options;
                        if (options) {
                            delete options['GATEWAY_CONFIG_DIRECTORY'];
                        }
                    }

                    this.set('loginModules', loginModules);
                }
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("SecurityConfig for GW " + this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'name', offset);
                dumpAttr(this, 'description', offset);
                dumpAttr(this, 'httpChallengeScheme', offset);
                dumpAttr(this, 'authorizationMode', offset);
                dumpAttr(this, 'sessionTimeout', offset);
                dumpAttr(this, 'userPrincipalClasses', offset);
                dumpAttr(this, 'httpCookieNames', offset);
                dumpAttr(this, 'httpHeaders', offset);
                dumpAttr(this, 'httpQueryParams', offset);
                dumpAttr(this, 'loginModules', offset);
            },

            /**
             * Are two RealmConfigModels equal in all respects?
             */
            equals: function(realmConfig) {
                // the code below is split into individual tests so that we can 
                // add switches later to turn some tests off if the user wants to ignore them.
                if (!realmConfig) {
                    return false;
                }

                // shortcut
                if (this === realmConfig) {
                    return true;
                }

                if (!equalModelStrings(realmConfig.get('name'), 
                                       this.get('name'))) {
                    return false;
                }

                if (!equalModelStrings(realmConfig.get('description'), 
                                       this.get('description'))) {
                    return false;
                }

                if (!equalModelStrings(realmConfig.get('httpChallengeScheme'), 
                                       this.get('httpChallengeScheme'))) {
                    return false;
                }

                if (!equalModelStrings(realmConfig.get('authorizationMode'), 
                                       this.get('authorizationMode'))) {
                    return false;
                }

                if (!equalModelNumbers(realmConfig.get('sessionTimeout'), 
                                       this.get('sessionTimeout'))) {
                    return false;
                }

                if (!equalModelArrays(realmConfig.get('userPrincipalClasses'), 
                                      this.get('userPrincipalClasses'))) {
                    return false;
                }

                if (!equalModelArrays(realmConfig.get('httpCookieNames'), 
                                      this.get('httpCookieNames'))) {
                    return false;
                }

                if (!equalModelArrays(realmConfig.get('httpHeaders'), 
                                      this.get('httpHeaders'))) {
                    return false;
                }

                if (!equalModelArrays(realmConfig.get('httpQueryParams'), 
                                      this.get('httpQueryParams'))) {
                    return false;
                }

                if (!equalModelArrays(realmConfig.get('loginModules'), 
                                      this.get('loginModules'))) {
                    return false;
                }

                return true;
            },

            /**
             * Comparison function for two realm config models, for doing display sorting.
             * display sorting. Sort first by name, description
             */
            sortCompare: function(scm) {
                var name1 = this.get('name');
                var name2 = scm.get('name');

                // realm MUST have a name, by XSD,
                // and it must be unique in the GW
                // (though not in the cluster).
                name1 = name1.toLowerCase();
                name2 = name2.toLowerCase();

                if (name1 < name2) {
                    return -1;
                } else if (name1 > name2) {
                    return 1;
                } else {
                    return 0; // presumably same name across diff gateways
                }
            },

            addServiceConfig: function(serviceConfigModel) {
                this.get('serviceConfigs').push(serviceConfigModel);
            }
        }, 
        {
            ATTRS: {
                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                name: {
                    value: null
                },
                description: {
                    value: null
                },
                httpChallengeScheme: {
                    value: null
                },
                authorizationMode: {
                    value: null
                },
                sessionTimeout: {
                    value: null
                },
                userPrincipalClasses: {
                    value: null  // array of strings
                },
                httpCookieNames: {
                    value: null  // array of strings
                },
                httpHeaders: {
                    value: null  // array of strings
                },
                httpQueryParams: {
                    value: null  // array of strings
                },
                loginModules: {
                    value: null  // object (map of key-value pairs)
                },
                serviceConfigs: {
                    value: []    // Array of ServiceConfigModels that refer to this RealmConfigModel
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

