/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The view for a gateway service config object.
 *
 * @module gateway-service-config-view
 */
YUI.add('gateway-service-config-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'gatewayServiceConfigView';

    /**
     * A gateway-level view of a ServiceConfigModel, for use within page-level views 
     * like Config Overview (which show configs, not 'live' data.)
     *
     * @class GatewayServiceConfigView
     * @extends Y.View
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.GatewayServiceConfigView = Y.Base.create(
        NAME, 
        Y.View, 
        [],
        {
            // the arrow icons and URL graphics are 24 pixels high. 
            // We'll allow 8 between them + 20 on both sides.
            IMAGE_HEIGHT: 24,
            IMAGE_SEPARATION: 8,
            OUTER_SPACE: 25,

            initializer: function() {
                var $this = this;

                // There really are no 'change' events we need to listen for from
                // the model, but we do want to know whether we should be showing
                // URLs or not.
                $this.after('showUrlsChange', 
                            $this.afterShowUrlsChange, 
                            $this);
            },

            /**
             * Response to flipping the 'show Urls' state
             */
            afterShowUrlsChange: function(ev) {
                this.render();
            },

            /**
             * Render the serviceConfig.
             */
            render: function() {
                var $this = this;

                var content = Y.one(Y.config.doc.createDocumentFragment());

                // get the ServiceConfigModel being displayed.
                var scm = this.get('model');

                var serviceContainer = createDIV(content, 'graphicServiceContainer')

                var serviceBox = createDIV(serviceContainer, 'graphicService');

                // depending on the service type, set the background border and
                // gradient and such
                var type = scm.get('type');

                var serviceDisplayInfo = CC.Constants.SERVICE_DISPLAY_INFO[type];

                var serviceTypeCssClass = serviceDisplayInfo.cssServiceType;
                if (!serviceTypeCssClass) {
                    serviceTypeCssClass = 'unknown-service';
                }
                serviceBox.addClass(serviceTypeCssClass);

                // Add the service type images, or nothing
                var imageSrc = serviceDisplayInfo.image;

                if (imageSrc) {
                    var img = createIMG(serviceBox, imageSrc, 'graphicServiceTypeImage');
                }

                // compute the height depending on the number of accepts 
                // and connects (connects currently has a max of 1).
                // If the service has balances, use those instead of the
                // accepts.
                var accepts = scm.get('accepts');
                var connects = scm.get('connects');
                var balances = scm.get('balances');

                var numAccepts = (accepts ? accepts.length : 0);
                var numConnects = (connects ? connects.length : 0);
                var numBalances = (balances ? balances.length : 0);

                var maxConnectors;
                if (numBalances > 0) {
                    maxConnectors = (numBalances > numConnects ? numBalances : numConnects);
                } else {
                    maxConnectors = (numAccepts > numConnects ? numAccepts : numConnects);
                }
                
                // Force a minimum of 1 so even with no connectors
                // we have a reasonable height for the type icon.
                if (maxConnectors === 0) {
                    maxConnectors = 1;
                }

                var height = (maxConnectors * this.IMAGE_HEIGHT) + 
                    ((maxConnectors - 1) * this.IMAGE_SEPARATION) + 
                    (2 * this.OUTER_SPACE);

                serviceBox.setStyle('height', "" + height + "px");

                // add the service name or '<none>'
                var labelStr = scm.get('label');
                var labelLink = createLINK(serviceBox, 'javascript:void(0);', 'graphicServiceName')
                    .setHTML(labelStr);

                labelLink.on('click', (function(scm) {
                    return function(ev) {
                        $this.get('app').save('/config/services?connectionUrl=' + 
                                              scm.get('gatewayModel').get('connectionUrl') + 
                                              "&serviceId=" + scm.get('serviceId'));
                    }
                })(scm));

                // show the type name, too
                var typeNameBox = createDIV(serviceBox, 'graphicServiceTypeName')
                    .setHTML(scm.get('type'));

                this.renderAccepts((numBalances > 0 ? balances : accepts), serviceBox);
                this.renderConnects(connects, serviceBox);

                var warning = this.get('warning');

                if (warning && warning.length > 0) {
                    this.renderWarning(serviceBox, warning);
                }

                this.get('container').setHTML(content);
                return this;
            },

            /**
             * Render the list of accepts after it has been converted from a string.
             * If there were balances specified, render those instead.
             */
            renderAccepts: function(urls, serviceBox) {
                if (urls) {
                    for (var i = 0; i < urls.length; i++) {
                        var url = urls[i];
                        var colonPos = url.indexOf(':');
                        var protocol = url.substring(0, colonPos).toLowerCase();

                        var top = this.OUTER_SPACE + (i * (this.IMAGE_HEIGHT + this.IMAGE_SEPARATION));

                        var acceptContainer = createDIV(serviceBox, 'graphicServiceAcceptContainer')
                            .setStyle('top', top)
                            .setAttribute('title', url);

                        // insert the lock, if we have one.
                        var imageSrc = CC.Constants.TLS_SSL_IMAGES[protocol];

                        if (imageSrc) {
                            img = createIMG(acceptContainer, imageSrc, 'graphicServiceAcceptLock');
                        }

                        // show the URL, if the user has chosen to
                        if (this.get('showUrls')) {
                            var urlLabel = createDIV(acceptContainer, 'graphicServiceAcceptUrl')
                                .set('text', url)
                                .addClass(protocol + "Protocol");
                        }

                        // show the accept arrow in circle icon
                        var protocolDisplayInfo = CC.Constants.PROTOCOL_DISPLAY_INFO[protocol];

                        var imageSrc = protocolDisplayInfo.forwardIcon;
                        var img = createIMG(acceptContainer, imageSrc, 'graphicServiceAccept');
                        var clearDiv = createDIV(acceptContainer, 'clear');
                    }
                }
            },

            renderConnects: function(connects, serviceBox) {
                if (connects) {
                    for (var i = 0; i < connects.length; i++) {
                        var connect = connects[i];
                        var colonPos = connect.indexOf(':');
                        var protocol = connect.substring(0, colonPos);

                        var top = this.OUTER_SPACE + (i * (this.IMAGE_HEIGHT + this.IMAGE_SEPARATION));

                        var connectContainer = createDIV(serviceBox, 'graphicServiceConnectContainer')
                            .setStyle('top', top)
                            .setAttribute('title', connect);

                        // show the connect arrow in circle icon
                        var protocolDisplayInfo = CC.Constants.PROTOCOL_DISPLAY_INFO[protocol];

                        // XXX The following needs to check for direction, too!
                        // Are we going into the gateway, or doing reverse connectivity?
                        var imageSrc = protocolDisplayInfo.forwardIcon;
                        var img = createIMG(connectContainer, imageSrc, 'graphicServiceConnect');

                        if (this.get('showUrls')) {
                            var urlLabel = createDIV(connectContainer, 'graphicServiceConnectUrl')
                                .set('text', connect)
                                .addClass(protocol + "Protocol");
                        }

                        // insert the lock, if we have one.
                        imageSrc = CC.Constants.TLS_SSL_IMAGES[protocol];

                        if (imageSrc) {
                            img = createIMG(connectContainer, imageSrc, 'graphicServiceConnectLock');
                        }

                        var clearDiv = createDIV(connectContainer, 'clear');
                    }
                }
            },
            
            /**
             * Render a warning graphic and message (generally set by the cluster_service_config_view).
             * The incoming message allows HTML for formatting. We need to figure out how to actually
             * get to the warning in the Warnings and Errors tabs at the bottom.
             */
            renderWarning: function(container, warningHtml) {
                var img = createIMG(container, CC.Constants.WARNING_IMAGE, 'graphicServiceWarningIcon')
                    .setAttribute('alt', 'Warning')
                    .setAttribute('title', warningHtml);
                // XXX We need to figure out how to gather all the warnings into a warning area.
            }

        }, 
        {
            ATTRS: {
                container: {
                    value: null
                },

                app: {
                    value: null
                },

                model: {
                    value: null    // a ServiceConfigModel for a service in a given gateway.
                },

                showUrls: {
                    value: false
                },
                
                warning: {
                    value: null   // if the cluster thinks we need to show a warning, here's the text
                }
            }
        }
    );
}, '0.99', {
    requires: ['view', 'service-config-model']
});

