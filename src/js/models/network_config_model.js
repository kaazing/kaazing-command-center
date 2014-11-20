/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The network-config-model module contains the network config details
 * for a single gateway with the Kaazing Command Center application.
 *
 * @module network-config-model
 */
YUI.add('network-config-model', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'networkConfigModel';

    /**
     * The static fields from the network configuration
     *
     * @class NetworkConfigModel
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.NetworkConfigModel = Y.Base.create(
        NAME, 
        Y.Model, 
        [],
        {
            hasAttribute: function(attrName) {
                return Y.NetworkConfigModel.ATTRS.hasOwnProperty(attrName);
            },

            initializer: function() {
            },

            // Dump the attributes
            dump: function() {
                CC.console.debug("NetworkConfig for GW " + this.get('gatewayModel').getDebugIdStr());
                var offset = 2;
                dumpAttr(this, 'addressMappings', offset);
            }
        }, 
        {
            ATTRS: {
                // Reference to the specific GatewayModel instance we came from, for 
                // client-side sorting and comparison.
                gatewayModel: {
                    value: null
                },
                addressMappings: {
                    value: null 
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'gateway-model']
});

