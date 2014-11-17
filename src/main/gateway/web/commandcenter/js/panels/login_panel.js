/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The login-panel module provides the login dialog for the Kaazing Command Center
 * application.
 * @module login-panel
 */
YUI.add('login-panel', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'loginPanel';

    /**
     * The LoginPanel class is the login dialog for the Kaazing Command Center.
     * @class LoginPanel
     * @extends Y.Panel
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.LoginPanel = Y.Base.create(
        NAME,                 // class name
        Y.Panel,              // 'base' class this is derived from
        [Y.WidgetInheritCss], // extensions being mixed in
        {
            firstTime: true,
            connectionUrlField: Y.one('#connectionUrl'),
            usernameField: Y.one('#loginUsername'),
            passwordField: Y.one('#loginPassword'),
            loginInvalidMessage: Y.one('#loginInvalidMessage'),

            initializer: function() {
                var $this = this;

                var checkEnter = function(e) {
                    var code = (e.keyCode ? e.keyCode : e.which);
                    if (code === 13) {
                        e.preventDefault();
                        var loginOkay = Y.one("#loginOkay");
                        loginOkay.simulate('click');
                    }
                }

                this.connectionUrlField.on('keypress', checkEnter);
                this.usernameField.on('keypress', checkEnter);
                this.passwordField.on('keypress', checkEnter);

                // The Login button wants to be centered, but because it
                // are (for the moment) in a YUI panel footer, it's wrapped in a span
                // and if we center that things are off. If we make them the same width,
                // then things center correctly. Tried doing this in initializer, but
                // the button isn't actually assigned yet.
                var loginButton = Y.one('#loginOkay');

                loginButton.on('click', 
                               function(e) {
                                   this.handleLoginButton(e);
                               },
                               this);
            },

            // Configure the display.
            // We assume that the connectionUrl is non-empty, and in valid format.
            // We also assume the callback is a function.
            display: function(connectionUrl, canChangeUrl, showError, username, password, callback) {
                var $this = this;

                this.connectionUrlField.set('value', cvtUndefOrNull(connectionUrl,''));
                // the 'readonly' field must either be present or not. Setting false/true doesn't work.
                if (!canChangeUrl) {
                    this.connectionUrlField.setAttribute('readonly', 'readonly');
                }
                this.usernameField.set('value', cvtUndefOrNull(username, ''));
                this.passwordField.set('value', cvtUndefOrNull(password, ''));

                if (showError) {
                    this.loginInvalidMessage.removeClass('hidden');
                } else {
                    this.loginInvalidMessage.addClass('hidden');
                }

                this.set('callback', callback);

                if (this.firstTime) {
                    this.render();
                    this.firstTime = false;
                } else {
                    // Show and center the panel (gets around a YUI 3.11.0 bug).
                    centerPanel(this);
                }

                this.usernameField.focus();
            },

            handleLoginButton: function(e) {
                this.handleButton(e);
            },

            handleButton: function(e) {
                e.preventDefault();
                this.hide();

                var connectionUrl = this.connectionUrlField.get('value');
                var username = this.usernameField.get('value');
                var password = this.passwordField.get('value');

                this.connectionUrlField.set('value', '');
                this.usernameField.set('value', '');
                this.passwordField.set('value', '');

                this.get('callback')(connectionUrl, username, password, false);
            }
        }, 
        {
            ATTRS: {
                srcNode: {
                    value: '#loginPanel'
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
                    value: []
                },

                callback: {
                    value: null
                }
            }
        }
    );
}, '0.99', {
    requires: ['panel', 'gallery-widget-inherit-css'],
    skinnable: false
});
