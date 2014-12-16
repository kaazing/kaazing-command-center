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
 * The view for gateway/cluster truststore objects.
 *
 * @module config-security-truststore-view
 */
YUI.add('config-security-truststore-view', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'configSecurityTruststoreView',
    CERT_DISPLAY_FIELDS = ['alias', 'issuer', 'notValidBefore', 'notValidAfter', 
                           'subject', 'subjectAlternativeNames', 'pathConstraint', 
                           'selfSigned', 'signatureAlgorithm' ],
    CERT_DISPLAY_LABELS = ['Alias', 'Issuer', 'Not Valid Before', 'Not Valid After',
                           'Subject', 'Subject Alternative Names', 'Certificate Authority?', 
                           'Self Signed?', 'Signature Algorithm'];

    /**
     * The View for displaying information about the truststore(s)
     * used by a gateway/cluster. As with Services, we 'coalesce' where the
     * truststores match across gateways
     *
     * @class ConfigSecurityTruststoreView
     * @extends Y.KaazingView
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.ConfigSecurityTruststoreView = Y.Base.create(
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

                    this.updateClusterTruststores();

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
                this.updateClusterTruststores();
                this.render();
            },

            onGatewayAvailable: function(ev) {
                this.updateClusterTruststores();
                this.render();
            },

            afterStopTimeChange: function(ev) {
                this.updateClusterTruststores();
                this.render();
            },
            
            updateClusterTruststores: function() {
                var clusterSecurityConfigs = this.buildTruststoreList();  // array of arrays
                this.set('clusterSecurityConfigs', clusterSecurityConfigs);
            },


            /**
             * Given the 'usable' gatewayModels the cluster contains, build an 
             * array of arrays of  'equal' SecurityConfigModels (dealing only 
             * with Truststore information) across all the gateways.
             */
            buildTruststoreList: function() {
                var securityConfigLists = [];  // array of arrays of SecurityConfigModel

                var i, j;

                var gatewayModels = this.get('model').getUsableGateways();

                if (gatewayModels && gatewayModels.length > 0) {
                    for (i = 0; i < gatewayModels.length; i++) {
                        var gatewayModel = gatewayModels[i];

                        // if usable, we will have the gatewayConfig.
                        var gatewayConfig = gatewayModel.get('gatewayConfig');

                        var securityConfig = gatewayConfig.get('securityConfig');
                        if (!securityConfig) {
                            continue;
                        }

                        // see if the truststore info matches any other securityconfig
                        var found = false;

                        for (j = 0; j < securityConfigLists.length; j++) {
                            var securityConfigList = securityConfigLists[j];
                            if (securityConfig.equalsTruststoreInfo(securityConfigList[0])) {
                                found = true;
                                securityConfigList.push(securityConfig);
                                break;
                            }
                        }

                        if (!found) {
                            securityConfigLists.push([securityConfig]);
                        }
                    }

                    securityConfigLists.sort(function(scList1,scList2) {
                        var sc1 = scList1[0];
                        var sc2 = scList2[0];
                        return sc1.sortCompareTruststore(sc2);
                    });
                }

                return securityConfigLists;
            },

            render: function() {
                if (this.isActiveView()) {
                    removeAllChildren(this.get('container').one('#configSecurityTruststoreData'));
                    this.renderData();
                }

                return this;
            },

            /**
             * Render the data fields for all cluster-level truststores from
             * their associated SecurityConfigModels.
             */
            renderData: function() {
                var $this = this;

                var container = this.get('container');

                var dataDiv = container.one('#configSecurityTruststoreData');

                var clusterSecurityConfigs = this.get('clusterSecurityConfigs');  // array of arrays

                removeAllChildren(dataDiv);

                if (!clusterSecurityConfigs || clusterSecurityConfigs.length == 0) {
                    // XXX put up some message about there being no truststores declared?
                    return;
                }

                var content = Y.one(Y.config.doc.createDocumentFragment());

                // Loop through the arrays of arrays. Each inner array (outer array element) 
                // is the list of security configs considered equal.
                for (var i = 0; i < clusterSecurityConfigs.length; i++) {
                    var truststoreDiv = createDIV(content, 'configSecuritySection');

                    var securityConfigArray = clusterSecurityConfigs[i];

                    var securityConfig = securityConfigArray[0];

                    var header = createH(truststoreDiv, 3)
                        .setHTML('Truststore');

                    // The basic details
                    var table = createTABLE(truststoreDiv);

                    // The gateways the truststore is defined in
                    var definedInGateways = [];
                    var gatewayModel;

                    for (var j = 0; j < securityConfigArray.length; j++) {
                        securityConfig = securityConfigArray[j];
                        gatewayModel = securityConfig.get('gatewayModel');

                        if (definedInGateways.indexOf(gatewayModel) == -1) {
                            definedInGateways.push(gatewayModel);
                        }
                    }

                    var definedInStr = definedInGateways.map(function(elt, index, arr) {
                        return elt.get('gatewayLabel');
                    }).sort().join(', ');

                    this.possiblyCreateDetailTableRow(table, 
                                                      'Defined In:', // XXX replace later w/lookup
                                                      definedInStr);

                    this.possiblyCreateDetailTableRow(table, 
                                                      'Type:', // XXX replace later w/lookup
                                                      securityConfig.get('truststoreType'));

                    var truststoreCertificateInfo = securityConfig.get('truststoreCertificateInfo');

                    // truststoreCertificateInfo is an array of objects, each with
                    // alias: (certificate alias)
                    // options (object of name/value pairs)
                    if (truststoreCertificateInfo && truststoreCertificateInfo.length > 0) {
                        var certificateContent = Y.one(Y.config.doc.createDocumentFragment());

                        var certificateDiv = createDIV(certificateContent);

                        // Given the array of certificate objects, extract the relevant
                        // fields and then sort the certs by alias.
                        var tempCerts = truststoreCertificateInfo.map(function(elt, index, array) {
                            return this.extractCertInfo(elt);
                        }, $this);
                        tempCerts.sort(function(a, b) {
                            var aliasA = a[CERT_DISPLAY_FIELDS[0]];
                            var aliasB = b[CERT_DISPLAY_FIELDS[0]];

                            if (aliasA < aliasB) {
                                return -1;
                            } else {
                                return (aliasA > aliasB ? 1 : 0);
                            }
                        });

                        for (var j = 0; j < tempCerts.length; j++) {
                            var certificateTable = createTABLE(certificateContent, 'configDataTable');
                            certificateTable.set('id', 'configSecurityCertificateTable');

                            var tempCertInfo = tempCerts[j];

                            for (var k = 0; k < CERT_DISPLAY_FIELDS.length; k++) {
                                var fieldClass = null;

                                var field = CERT_DISPLAY_FIELDS[k];
                                var label = CERT_DISPLAY_LABELS[k];
                                var value = tempCertInfo[field];

                                // we want to do special formatting for certain fields
                                if (k == 0) {
                                    fieldClass = 'configSecurityCertificateAlias';
                                } else if (field === 'issuer') {
                                    // split the LDAP-style issuer for reformatting
                                    if (value !== null && value != undefined) {
                                        value = value.split(',').join('<BR>');
                                    }
                                    fieldClass = 'configSecurityCertificateIssuer';
                                } else if (field === 'subject') {
                                    // split the LDAP-style subject for reformatting
                                    if (value !== null && value != undefined) {
                                        value = value.split(',');
                                        for (var f = 0; f < value.length; f++) {
                                            if (value[f].startsWith('CN=')) {
                                                value[f] = ('<b>' + value[f] + '</b>');
                                            }
                                        }

                                        value = value.join('<BR>');
                                    }

                                    fieldClass = 'configSecurityCertificateSubject';
                                } else if (field === 'subjectAlternativeNames') {
                                    // we always want to see a SAN entry, even if with no value
                                    if (!value) {
                                        value = '&nbsp;';
                                    }
                                } else if (value && (field === 'notValidBefore' || field === 'notValidAfter')) {
                                    // convert from Unix epoch MS to GMT date string
                                    var d = new Date(value);
                                    value = d.toUTCString();
                                } else if (field === 'pathConstraint') {
                                    // pathConstraint is only >= 0 if the subject is a 
                                    // certificate authority
                                    if (value === -1) {
                                        value = 'NO';
                                    } else {
                                        value = (tempCertInfo['issuer'] && 
                                                 (tempCertInfo['issuer'] === tempCertInfo['subject'])
                                                 ? 'Root CA'
                                                 : 'Intermediate CA');
                                    }
                                } else if (field === 'selfSigned') {
                                    value = (tempCertInfo['issuer'] && 
                                             (tempCertInfo['issuer'] === tempCertInfo['subject'])
                                             ? 'Yes' : 'No');
                                }

                                this.possiblyCreateCertificateRow(certificateTable, label, value, fieldClass);
                            }
                        }

                        this.possiblyCreateDetailTableRow(table, 
                                                          'Certificates:', // XXX replace later w/lookup
                                                          certificateContent);
                    }
                }

                // Now that the pieces are assembled, set our container contents
                dataDiv.setHTML(content);

                // Finally, set all the config data tables to the width of the widest one
                var dataTables = dataDiv.all('.configDataTable');
                if (dataTables) {
                    var maxWidth = 0;

                    dataTables.each(function(node) {
                        var width = parseInt(node.getStyle('width'));
                        if (width > maxWidth) {
                            maxWidth = width;
                        }
                    });

                    // To be reasonable in a 1024 window, size to 800 max
                    if (maxWidth > 800) {
                        maxWidth = 800;
                    }

                    dataTables.each(function(node) {
                        node.setStyle('width', maxWidth);
                    });
                }

                return this;
            },

            /**
             * Possibly create a row in the 'detail' entries. These are 
             * simpler than the sub-tables for login modules.
             */
            possiblyCreateDetailTableRow: function(table, label, value) {
                if (isEmptyValue(value)) {
                    return;
                }

                var tr = createTR(table);

                var td = createTD(tr, 'configSecurityDetailLabel')
                    .set('text', label);         // XXX replace later with lookup

                td = createTD(tr, 'securityDataValue')
                    .setHTML(value);
            },


            /**
             * Extract a subset of the certificate info for display.
             */
            extractCertInfo: function(certificateInfo) {
                var result = {};

                for (var prop in certificateInfo) {
                    if (CERT_DISPLAY_FIELDS.indexOf(prop) >= 0) {
                        result[prop] = certificateInfo[prop];
                    }
                }

                return result;
            },

            /**
             * Render a line in a certificate sub-table.
             * options is a stringified array (with possible HTML tags in it
             * to do things like make newlines)
             */
            possiblyCreateCertificateRow: function(table, label, value, valueClass) {
                if (!isEmptyValue(value)) {
                    var tr = createTR(table);
                    var td = createTD(tr, 'securityDataValue')
                        .set('text', label)         // XXX replace later with lookup
                        .addClass('configSecurityCertificateLabel');

                    td = createTD(tr, 'securityDataValue')
                        .setHTML(value);

                    if (valueClass) {
                        td.addClass(valueClass);
                    }
                }
            }
        }, 
        {
            ATTRS: {
                container: {
                    valueFn: function() {
                        return Y.one('#configSecurityTruststoreViewContainer');
                    }
                },

                title: {
                    value: 'Configuration : Security : Truststores'
                },

                /**
                 * The latest set of cluster-level security configs, updated
                 * after each change to the set of gateways. We extract 
                 * truststore information from them.
                 */
                clusterSecurityConfigs: {
                    value: null
                },

                firstTime: {
                    value: true
                }
            }
        }
    );
}, '0.99', {
    requires: ['kaazing-view', 'security-config-model']
});
