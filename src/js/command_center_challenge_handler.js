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

"use strict";

/**
 * Object for handling the login process for a given gateway.
 * It's a variation of BasicChallengeHandler, but customized
 * so we're keeping the ChallengeResponse credentials here, 
 * rather than letting a BasicChallengeHandler keep it, so we 
 * can try to handle both multiple logins (by passing the first valid 
 * response to the ClusterModel) and automatic revalidate
 * (just so we can try not to bother the user, though they can
 * do the same by removing the revalidate entirely or having
 * it be long).
 */
function CommandCenterChallengeHandler(loginPanel, connectionUrl) {
    this.connectionUrl = connectionUrl;
    this.loginPanel = loginPanel;

    // Temporary storage for username and password while the login
    // process is going on. Completing the login gets called to clear this
    this.username = null; 
    this.password = null; 

    this.challengeCallback = null;

    // Encoded credentials from a previous login for later use.
    // Also see $proto.defaultChallengeCredentials.
    this.challengeCredentials = null;

    this.loginState = null;

    this.connected = false; // is connection to the gateway open now?
}

(function() {
    var TRYING_RESPONSE = 1;
    var TRYING_REVALIDATE = 2;
    var GATHERING_CREDENTIALS = 3;
    var CANCELLED = 4;

    var $proto = CommandCenterChallengeHandler.prototype;

    /**
     * Implement a singleton "default challenge credentials" value.
     * This is set the first time some gateway manages to log in
     * and is used by others afterward. 
     */
    $proto.defaultChallengeCredentials = null;

    /**
     * We can handle 'Basic' schemes (Basic and Application Basic).
     */
    $proto.canHandle = function(challengeRequest) {
        return (challengeRequest != null && 
                challengeRequest.authenticationScheme === "Basic" &&
                challengeRequest.location.endsWith("/snmp"));
    };

    /**
     * Actually handle the request. 
     */
    $proto.handle = function(challengeRequest, callback) {
        if (challengeRequest.location === null) {
            callback(null);
            return;
        }
            
        this.challengeCallback = callback;

        var showError = false;

        if (this.loginState === null) {
            // We're just starting the login process (either initially or because
            // we were somehow logged out) OR we're starting a revalidate.

            if (this.challengeCredentials || this.defaultChallengeCredentials) {
                // (Silently) try the previous response.
                if (this.connected) {
                    //CC.console.log("CommandCenterChallengeHandler.handle with previous response - TRYING_REVALIDATE");
                    this.loginState = TRYING_REVALIDATE;
                } else {
                    //CC.console.log("CommandCenterChallengeHandler.handle with previous response - TRYING_RESPONSE");
                    this.loginState = TRYING_RESPONSE;
                }

                this.challengeCallback(this.makeChallengeResponse());
                return;
            }
        } else if (this.loginState === TRYING_REVALIDATE) {
            // The first time we try to revalidate, we'll be set to TRYING_REVALIDATE.
            // If that succeeds, we don't get a chance to change this flag, so we'll
            // also see it the next time we come back.
            // If the first time revalidate fails, we do NOT (as of 4.0) get called 
            // back here immediately--we only get one chance at it.  The revalidate period
            // will then run out and close the connection.
            // So really, the only thing we should do here is re-send the current credentials,
            // since we're dealing with the "succeeds" case.
            // NOTE: we know there is a challenge response since we're trying revalidate.

            //CC.console.log("CommandCenterChallengeHandler.handle with TRYING_REVALIDATE. Trying again");
            this.challengeCallback(this.makeChallengeResponse());
            return;
        } else if (this.loginState === TRYING_RESPONSE) {
            // our try with previous response failed, so show the login dialog.
            this.challengeCredentials = null;
        } else if (this.loginState === CANCELLED) {
            //CC.console.log("CommandCenterChallengeHandler.handle with CANCELLED. Calling back with null");
            this.challengeCallback(null);
            return;
        } else {
            // we're past the TRYING_RESPONSE phase, so our previous try at 
            // the dialog failed (not cancelled). Just stay in this state, 
            // but have the dialog show an error.
            showError = true;
        }

        // Since we're about to gather credentials, force that state and pass
        // the showError flag to the dialog.
        this.loginState = GATHERING_CREDENTIALS;

        this.gatherCredentialsFn(showError);
    }

    /**
     * Our function to put up the login dialog to gather user credentials when needed.
     */
    $proto.gatherCredentialsFn = function(showError) {
        var $this = this;
        this.loginPanel.display(this.connectionUrl, 
                                false,
                                showError, 
                                this.username, 
                                this.password, 
                                function(connectionUrl, username, password, cancelling) {
                                    $this.gatherCredentialsCallback(connectionUrl, 
                                                                    username, 
                                                                    password, 
                                                                    cancelling);
                                });
    };

    /**
     * The callback from the login panel after gathering credentials.
     */
    $proto.gatherCredentialsCallback = function(connectionUrl, username, password, cancelling) {
        if (cancelling || username == null) {
            this.loginState = CANCELLED;
            this.challengeCredentials = null;
            this.username = null;
            this.password = null;
            this.challengeCallback(null);
            return;
        }

        // store the username and password in case they are wrong, so
        // we can pass them back for credential-gathering. The stored 
        // values are cleared during onOpen().
        this.username = username;
        this.password = password;
        this.challengeCredentials = this.encodeCredentials(username, password);

        this.challengeCallback(this.makeChallengeResponse());
    };

    /**
     * Function called by the gateway being logged into when the connection
     * is made and gatewayModel.onOpen() is run. Gives this object a chance
     * to clear any locally-stored username and password data to avoid a 
     * security hole. 
     * NOTE: we're NOT clearing the challengeResponse, however--that's kept 
     * for use on revalidate.
     * The connectionUrl is passed in in case the customers want to write
     * a handler that deals with all the connectionUrls together.
     */
    $proto.onOpen = function(connectionUrl) {
        // The first gateway to log in stores its challenge response in the
        // prototype so others that come after can use the same value.
        if (!CommandCenterChallengeHandler.prototype.defaultChallengeCredentials) {
            CommandCenterChallengeHandler.prototype.defaultChallengeCredentials = this.challengeCredentials;
        }

        this.loginState = null;
        this.username = null;
        this.password = null;
        this.connected = true;
    };

    /**
     * Encode the username and password. The result is then used to create a
     * ChallengeResponse, and can be kept around to create another response later
     * for revalidate.
     */
    $proto.encodeCredentials = function(username, password) {
        var str = username + ':' + password;
        var bytes = [];
        
        for (var i = 0; i < str.length; ++i)
        {
            bytes.push(str.charCodeAt(i));
        } // aka UTF-8

        return Base64.encode(bytes);
    };

    $proto.makeChallengeResponse = function() {
        var challengeCredentials = (this.challengeCredentials || this.defaultChallengeCredentials);
        return new Kaazing.Gateway.ChallengeResponse("Basic " +  challengeCredentials, null);
    };

    /**
     * Function called by a given gateway when the connection to it is
     * closed and gatewayModel.onClose() is run. Gives this object a chance
     * to clear any locally-stored data relevant only to the current connection
     * (e.g. the 'connected' value, which is used during revalidate).
     * 
     * The connectionUrl is passed in in case the customers want to write
     * a handler that deals with all the connectionUrls together.
     */
    $proto.onClose = function(connectionUrl) {
        this.connected = false;
    }

    $proto.isCancelled = function() {
        return (this.loginState === 4);
    }
})();
