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
 * The update-panel module provides the About information for 
 * the Command Center application.
 * @module update-panel
 */
YUI.add('update-panel', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'updatePanel';

    /**
     * The UpdatePanel class is the panel displaying the 'Update-Version' info 
     * for the Kaazing Command Center.
     *
     * @class UpdatePanel
     * @extends Y.Panel
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.UpdatePanel = Y.Base.create(
        NAME,
        Y.Panel,
        [Y.WidgetInheritCss],
        {
            firstTime: true,

            initializer: function() {
                this.plug(Y.Plugin.Drag, {handles: ['.yui3-widget-hd']});
                this.dd.plug(Y.Plugin.DDConstrained, {constraint2node: '#content'});
                this.set('dragObj', new Y.DD.Drag({node: '#updatePanel'}));
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

            renderUI: function() {
                // let the superclass do its thing
                Y.UpdatePanel.superclass.renderUI.apply(this, arguments);

                var contentBox = Y.one(this.get('contentBox'));
                var versionField = contentBox.one('#updateVersion');
                var app = this.get('app');
                var clusterModel = app.clusterModel;
                versionField.setHTML(clusterModel.get('updateVersion'));
                    
            },

            handleOkayButton: function(e) {
            },
        }, 
        {
            ATTRS: {
                srcNode: {
                    value: '#updatePanel'
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
                            classNames: 'commandButton updateOkay',
                            action: function(e) {
                                e.preventDefault();
                                this.hide();
                            },
                            section: Y.WidgetStdMod.FOOTER
                        }
                    ]
                }
            }
        }
    );
}, '0.99', {
    requires: ['panel', 'dd', 'dd-plugin', 'dd-drag', 'event', 'gallery-widget-inherit-css'], 
    skinnable: false
});
