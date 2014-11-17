/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The service-defaults-config-model module contains the service-defaults configuration details
 * for a single gateway with the Kaazing Command Center application.
 *
 * @module service-defaults-config-model
 */
YUI.add('service-defaults-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'serviceDefaultsConfigModel';

    /**
     * The fields from the service-defaults.
     *
     * @class ServiceDefaultsConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ServiceDefaultsConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            hasAttribute: function(attrName) {
                return Y.ServiceDefaultsConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("ServiceDefaultsConfig for GW " + 
                                 this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'acceptOptions', offset);
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
                acceptOptions: {
                    value: null 
                },
                mimeMappings: {
                    value: null 
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

