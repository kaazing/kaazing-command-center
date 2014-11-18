/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The security-config-model module contains the security config details
 * for a single gateway with the Kaazing Command Center application.
 *
 * @module security-config-model
 */
YUI.add('security-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'securityConfigModel';

    /**
     * The security config, including realm information
     *
     * @class SecurityConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.SecurityConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
            hasAttribute: function(attrName) {
                return Y.SecurityConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
                // The static realm configurations for (possibly) multiple realms.
                // Convert the data to a map of RealmConfigModels.
                var realmConfigs = this.get('realmConfigs');
                if (realmConfigs) {
                    if (realmConfigs.length === 0) {
                        this.set('realmConfigs', null);
                    } else {
                        var gatewayModel = this.get('gatewayModel');
                        var configMap = {};
                        for (var i = 0; i < realmConfigs.length; i++) {
                            var realmConfig = realmConfigs[i];
                            realmConfig.gatewayModel = gatewayModel;
                            realmConfig = new Y.RealmConfigModel(realmConfig);
                            configMap[realmConfig.get('name')] = realmConfig;
                        }

                        this.set('realmConfigs', configMap);
                    }
                }
            },

            /**
             * Return true if the keystore information in this config
             * matches that in another securityConfig
             */
            equalsKeystoreInfo: function(securityConfig) {
                if (!securityConfig) {
                    return false;
                }

                // shortcut
                if (this === securityConfig) {
                    return true;
                }

                if (!equalModelStrings(securityConfig.get('keystoreType'), 
                                       this.get('keystoreType'))) {
                    return false;
                }

                // XXX We need to check the certificate info here, now that
                // we don't have the keystore MD5 hash

                return true;
            },

            /**
             * Compare the keystore info against another security config, 
             * returning whichever is "less". We'll define 'null' as 
             * "greater" so it appears lower in the list
             */
            sortCompareKeystore: function(securityConfig) {
                if (!securityConfig) {
                    return -1;  // we're less
                }

                var val;

                val = compareStrings(this.get('keystoreType'), 
                                     securityConfig.get('keystoreType'));

                if (val != 0) {
                    return val;
                }

                // XXX Do we need to check something about certificate info here, since
                // it's quite likely they are different?

                return 0; // at this point for just sorting, consider them equal
            },

            /**
             * Return true if the truststore information in this config
             * matches that in another securityConfig
             */
            equalsTruststoreInfo: function(securityConfig) {
                if (!securityConfig) {
                    return false;
                }

                // shortcut
                if (this === securityConfig) {
                    return true;
                }

                if (!equalModelStrings(securityConfig.get('truststoreType'), 
                                       this.get('truststoreType'))) {
                    return false;
                }

                // XXX We need to check the certificate info here, now we don't
                // have the MD5 hash

                return true;
            },

            /**
             * Compare the truststore info against another security config, 
             * returning whichever is "less". We'll define 'null' as 
             * "greater" so it appears lower in the list
             */
            sortCompareTruststore: function(securityConfig) {
                if (!securityConfig) {
                    return -1;  // we're less
                }

                var val;

                val = compareStrings(this.get('truststoreType'), 
                                     securityConfig.get('truststoreType'));

                if (val != 0) {
                    return val;
                }

                // XXX Do we need to check something about certificate info here, since
                // it's quite likely they are different?

                return 0; // at this point for just sorting, consider them equal
            },

            /** 
             * Given a realm name, return the associated RealmConfigModel, or null if not present.
             */
            getRealmConfig: function(realmName) {
                var realmConfigs = this.get('realmConfigs');
                return (realmConfigs ? realmConfigs[realmName] : null);
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("SecurityConfig for GW " + 
                                 this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'keystoreType', offset);
                dumpAttr(this, 'keystoreCertificateInfo', offset);
                dumpAttr(this, 'truststoreType', offset);
                dumpAttr(this, 'truststoreCertificateInfo', offset);
                dumpAttr(this, 'realmConfigs', offset);
            }
        }, 
        {
            ATTRS: {
                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                keystoreType: {
                    value: null 
                },
                keystoreCertificateInfo: {
                    value: null 
                },
                truststoreType: {
                    value: null 
                },
                truststoreCertificateInfo: {
                    value: null 
                },
                realmConfigs: {
                    value: null
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model', 'realm-config-model']
});

