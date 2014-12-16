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
 * The about-panel module provides the About information for 
 * the Command Center application.
 * @module about-panel
 */
YUI.add('about-panel', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'aboutPanel';

    /**
     * The AboutPanel class is the panel displaying the 'About' info 
     * for the Kaazing Command Center.
     *
     * @class AboutPanel
     * @extends Y.Panel
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.AboutPanel = Y.Base.create(
        NAME,
        Y.Panel,
        [Y.WidgetInheritCss],
        {
            firstTime: true,

            initializer: function() {
                this.plug(Y.Plugin.Drag, {handles: ['.yui3-widget-hd']});
                this.dd.plug(Y.Plugin.DDConstrained, {constraint2node: '#content'});
                this.set('dragObj', new Y.DD.Drag({node: '#aboutPanel'}));
                this.on(Y.ClusterModel.prototype.UPDATE_AVAILABLE_EVENT,
                        this.updateAvailableNotification, 
                        this);
            },

            // Configure the display.
            // We assume that the connectionUrl is non-empty, and in valid format.
            // We also assume the callback is a function.
            display: function() {
                if (this.firstTime) {
                    this.render();
                    this.firstTime = false;
                } else {
                    // Show and center the panel (gets around a YUI 3.11.0 bug).
                    centerPanel(this);
                }
            },
            
            updateAvailableNotification: function(){
            	if(this.get('app').get('manualCheckingForUpdate')){
            		this.get('app').set('manualCheckingForUpdate', false);
            		var timeoutId = this.get("updateTimeout");
            		if(timeoutId != null){
            			clearTimeout(timeoutId);
            			this.set("updateTimeout", null);
            		}
                    this.renderUI();
            	}
            },

            renderUI: function() {
                // let the superclass do its thing
                Y.AboutPanel.superclass.renderUI.apply(this, arguments);

                var contentBox = Y.one(this.get('contentBox'));
                var productField = contentBox.one('#aboutProduct');
                var productVersion = contentBox.one('#aboutVersion');
                var productBuild = contentBox.one('#aboutBuild');
                var updateButton = this.getButton('updateButton', 'footer');
                var app = this.get('app');
                var clusterModel = app.clusterModel;
                var versionInfo = computeDisplayVersionInfo(clusterModel.get('versionInfo'));

                var updateField = contentBox.one('#updateAvailable');
                var updateNotification = contentBox.one('#aboutPanelUpdateAvailable');
                var checkingForUpdateBox = contentBox.one('#aboutCheckingForUpdate');
                var updateVersion = (clusterModel.get('updateVersion'));
                
                // 
        		var timeoutId = this.get("updateTimeout");
        		if(timeoutId != null){
        			clearTimeout(timeoutId);
        			this.set("updateTimeout", null);
        		}
                
                if(!(updateVersion)){
                	// update not available
                	updateNotification.addClass("hidden");
                	if(this.get('app').get('manualCheckingForUpdate')){
                		// checking for update
                		checkingForUpdateBox.removeClass('hidden');
                		updateButton.addClass('hidden');
                		var myPanel = this;
                		timeoutId = setTimeout(function() {
                			myPanel.get('app').set('manualCheckingForUpdate', false);
                			myPanel.renderUI();
                		}, 10000);
                		this.set("updateTimeout", timeoutId);
                	} else {
                		// not checkin for update
                		checkingForUpdateBox.addClass('hidden');
                		updateButton.removeClass('hidden');
                	}
                }else{
                	// update available
                	checkingForUpdateBox.addClass('hidden');
                	updateNotification.removeClass("hidden");
                	updateButton.addClass('hidden');
                	updateField.setHTML(updateVersion);
                }

                if (versionInfo) {
                    productField.setHTML(versionInfo[0]);
                    productVersion.setHTML(versionInfo[1]);
                    productBuild.setHTML(versionInfo[2]);
                } else {
                    productField.set('text', '');
                    productVersion.set('text', '');
                    productBuild.set('text', '');
                }
            },

            handleOkayButton: function(e) {
            },
        }, 
        {
            ATTRS: {
                srcNode: {
                    value: '#aboutPanel'
                },
                
                app: {
                    value: null
                },

                centered: {
                    value: true
                },

                modal: {
                    value: true
                },

                zIndex: {
                    value: 5
                },

                buttons: {

                    value:  [
                        {
                            value: "OK",
                            classNames: 'commandButton aboutPanelButton',
                            action: function(e) {
                                e.preventDefault();
                                this.set("checkingForUpdate", false);
                                this.get('app').set('manualCheckingForUpdate', false);
                                var timeoutId = this.get('updateTimeout');
                        		if(timeoutId != null){
                        			clearTimeout(timeoutId);
                        			this.set("updateTimeout", null);
                        		}
                                this.hide();
                            },
                            section: Y.WidgetStdMod.FOOTER
                        },
                        {
                            value: "Check for Update",
                            name: "updateButton",
                            classNames: 'commandButton aboutPanelButton updateButton',
                            action: function(e) {
                                e.preventDefault();
                                this.get('app').set('manualCheckingForUpdate', true);

                                var clusterModel = this.get('app').clusterModel;
                                var myPanel = this;
                                // Assume it will be ready in 2 seconds, so get it then
                                clusterModel.getGateways()[0].get('mngtApi').forceUpdateVersionCheck(
                            		function(v1){
                            			setTimeout(function(){
                            				var value = clusterModel.getGateways()[0].get('mngtApi').getUpdateVersion(function(value){
                            					if(value){
                            						clusterModel.set('updateVersion', value);
                            						myPanel.renderUI();
                            					}
                            				});
                            			}, 2000)
                            		}
                                );
                                this.set("checkingForUpdate", true);
                                this.renderUI();
                            },
                            section: Y.WidgetStdMod.FOOTER
                        }
                    ]
                },

                updateTimeout: {
                	value : null
                }
            }
        }
    );
}, '0.99', {
    requires: ['panel', 'dd', 'dd-plugin', 'dd-drag', 'event', 'gallery-widget-inherit-css'], 
    skinnable: false
});
