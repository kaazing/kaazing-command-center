/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The support object that organizes access to the login dialog.
 *
 * @module login-processor
 */
YUI.add('login-processor', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'loginProcessor';

    /**
     * The login-processing component
     *
     * @class LoginProcessor
     * @extends Y.Model
     * @uses xxxxx
     * @constructor
     * @cfg {object} configuration attributes
     */
    Y.LoginProcessor = Y.Base.create(
        NAME, 
        Y.Model, 
        [], 
        {
            initializer: function() {
            },

            /**
             * Called by GatewayModels when they want to try to log in, to serialize
             * contention for the login dialog (or any other login resources.) 
             * Models are pushed onto a queue if this is called when some other
             * gatewayModel has the lock.
             */
            requestLoginLock: function(gatewayModel, callback, canChangeUrl) {
                var $this = this;

                var lockQueueEntry = this.get('loginLock');

                if (lockQueueEntry) {
                    // Don't allow the same gateway model to be on the queue more than once.
                    if (lockQueueEntry.gatewayModel !== gatewayModel) {
                        var loginLockQueue = this.get('loginLockQueue');
                        for (var i = 0; i < loginLockQueue.length; i++) {
                            if (loginLockQueue[i].gatewayModel === gatewayModel) {
                                // already queued, just ignore it.
                                return;
                            }
                        }

                        // we're not in the queue, push a new entry
                        loginLockQueue.push({gatewayModel: gatewayModel, 
                                             callback: callback, 
                                             canChangeUrl: canChangeUrl});
                    }
                } else {
                    this.set('loginLock', {gatewayModel: gatewayModel, 
                                           callback: callback, 
                                           canChangeUrl: canChangeUrl});

                    // XXX Should this really be invokeLater()? Or does that
                    // cause potential issues because the guy getting the lock
                    // hasn't actually had a chance to process yet?
                    invokeLater(function() {$this.processLogin(false, null, null);}, 0);
                }
            },
            
            hasLoginLock: function(gatewayModel) {
                var lockQueueEntry = this.get('loginLock');
                return (lockQueueEntry !== null && lockQueueEntry.gatewayModel === gatewayModel);
            },

            /**
             * If a given model has the lock or is in the lock queue, remove it.
             * It is NOT an error if the model is in neither.
             */
            clearLoginLock: function(gatewayModel) {
                var loginLockQueue = this.get('loginLockQueue');

                if (this.hasLoginLock(gatewayModel)) {
                    if (loginLockQueue.length == 0) {
                        this.set('loginLock', null);
                    } else {
                        var nextEntry = loginLockQueue.shift();
                        this.set('loginLock', nextEntry);

                        // XXX Should this really be invokeLater()? Or does that
                        // cause potential issues because the guy getting the lock
                        // hasn't actually had a chance to process yet?
                        invokeLater(function() {$this.processLogin(false, null, null);}, 0);
                    }
                } else {
                    for (var i = 0; i < loginLockQueue.length; i++) {
                        if (loginLockQueue[i].gatewayModel === gatewayModel) {
                            loginLockQueue.splice(index, 1);
                        }
                    }
                }
            },

            /**
             * Emergency function to bail on all loginresource requests
             */
            clearAllLoginLockRequests: function() {
                this.set('loginLockQueue', []);
                this.set('loginLock', null);
            },

            /**
             * Process the login request that currently has the login lock. Cycle until
             * we either get a set of credentials to return or the user bails.
             */
            processLogin: function(showError, username, password) {
                var $this = this;

                var lockRequest = this.get('loginLock');
                var connectionUrl = lockRequest.gatewayModel.get('connectionUrl');

                this.get('loginPanel').display(connectionUrl,
                                               lockRequest.canChangeUrl,
                                               showError,
                                               username,
                                               password,
                                               function(connectionUrl, username, password, cancelling) {
                                                   $this.gatherCredentialsCallback(connectionUrl,
                                                                                   username,
                                                                                   password,
                                                                                   cancelling);
                                               });
            },

            /**
             * Process the response from the loginPanel. The loginLock still contains
             * the original parameters of the login before any user changes.
             */
            gatherCredentialsCallback: function(connectionUrl, username, password, cancelling) {
                var $this = this;

                var lockQueueEntry = this.get('loginLock');

                if (cancelling || isEmpty(!username) || isEmpty(connectionUrl)) {
                    // user has bailed. Clear the entry from the lock queue and continue.
                    invokeLater(function() {$this.clearLoginLock(lockQueueEntry.gatewayModel);}, 0);
                    return;
                }

                lockQueueEntry.callback(connectionUrl, username, password);
            },
        }, 
        {
            ATTRS: {

                app: {
                    value: null     // the CommandCenter
                },

                loginPanel: {
                    value: null
                },

                // The GatewayModel that has the login lock.
                loginLock: {
                    value: null
                },
                
                // The GatewayModels that are waiting for the login lock
                loginLockQueue: {
                    value: []
                }
            }
        }
    );
}, '0.99', {
    requires: ['model', 'cluster-model', 'gateway-model']
});

