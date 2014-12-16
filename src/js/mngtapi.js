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
 * The MngtAPI object, which provides the "management API" that 
 * we (or customers) can use to write a KWG management client.  
 * This is the transport-independent layer. It contains an instance
 * a transport-specific object that it passes calls to, so it
 * is really just a wrapper.
 * Current implementations are for SNMP and 'array' (i.e. fake local
 * data.)
 */
function MngtAPI(impl) {
    // the object that actually implements the various API methods.
    this._impl = impl;
}

/* Initialize the wrapper methods */
(function() {
    var $proto = MngtAPI.prototype;

    /**
     * Set the challenge handler on the websocket connection (store 
     * until opened, if the socket has not yet been created.
     */
    $proto.setChallengeHandler = function(challengeHandler) {
        this._impl.setChallengeHandler(challengeHandler);
    };

    /**
     * Return the challenge handler for the connection, if any.
     */
    $proto.getChallengeHandler = function() {
        return this._impl.getChallengeHandler();
    }

    /**
     * Connects to the gateway server.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name connect
     * @memberOf SNMP
     */
    $proto.connect = function(location) {
        this._impl.connect(location);
    };

    /**
     * Return true/false indicating whether the socket is in state WebSocket.OPEN.
     */
    $proto.isOpen = function() {
        return this._impl.isOpen();
    }

    /**
     * Disconnects from the gateway.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name disconnect
     */
    $proto.disconnect = function() {
        this._impl.disconnect();
    };

    $proto.setOpenListener = function(listener, callbackData) {
        this._impl.setOpenListener(listener, callbackData);
    };

    $proto.setExceptionListener = function(listener, callbackData) {
        this._impl.setExceptionListener(listener, callbackData);
    };

    $proto.setCloseListener = function(listener, callbackData) {
        this._impl.setCloseListener(listener, callbackData);
    };

    $proto.setProperty = function(callback, oid, valueType, value) {
        this._impl.setProperty(callback, oid, valueType, value);
    };

    /**
     * Return cluster-state information from the point of view of 
     * the gateway we're connected to.
     * 
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getClusterState = function(callback) {
        return this._impl.getClusterState(callback);
    };

    /**
     * Returns a Gateway Config object for the gateway.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     *
     * NOTE: the data returned is ALL the config data for the gateway (cluster config,
     * network config, realm config and service config), which is ultimately split
     * into several objects at the model level.
     */
    $proto.getGatewayConfiguration = function(callback) {
        return this._impl.getGatewayConfiguration(callback);
    };

    /**
     * Return the Gateway live data for this gateway.
     * 
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getGateway = function(callback) {
        return this._impl.getGateway(callback);
    };

    /**
     * Returns an array of Service objects (live data) for the gateway.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds (and each time the call succeeds,
     * if the call is to be repeated.)
     */
    $proto.getServices = function(callback) {
        return this._impl.getServices(callback);
    };

    /**
     * Return the Service object for a given service id.
     * 
     * @param callback indicates the callback function that
     * will be called if the call succeeds.
     */
    $proto.getService = function(serviceId, callback) {
        return this._impl.getService(serviceId, callback);
    };

    /**
     * Enable/disable notifications for a given service 
     * 
     * @param serviceId the service of interest
     * @param value the new 'enable' value (1 = enable, 0 = disable)
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.setServiceNotifications = function(serviceId, value, callback) {
        return this._impl.setServiceNotifications(serviceId, value, callback);
    };

    /**
     * Returns an array of sessions for all services in the gateway
     * (excluding management sessions, which are not measured.)
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */ 
    $proto.getGatewaySessions = function(callback) {
        return this._impl.getGatewaySessions(callback);
    };

    /**
     * Returns an array of sessions for a given service in the gateway
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getSessions = function(serviceId, callback) {
        return this._impl.getSessions(serviceId, callback);
    };

    /**
     * Returns a Session object for a given session in a given service
     * in the gateway.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getSession = function(serviceId, sessionId, callback) {
        return this._impl.getSession(serviceId, sessionId, callback);
    };

    /**
     * Tell the gateway to close a session in a given service.
     *
     * @param serviceId the service of interest
     * @param sessionId the session of interest
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.closeSession = function(serviceId, sessionId, callback) {
        return this._impl.closeSession(serviceId, sessionId, callback);
    };

    /**
     * Have the gateway start sending notifications.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.startNotifications = function(callback) {
        this._impl.startNotifications(callback);
    };

    /**
     * Return JVM statistics (ALL stats, including threads and classes
     * counts) for the gateway. This actually returns some other
     * info besides the summary, indicating the summary data fields
     * and notification and gather intervals.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getJVMStats = function(callback) {
        return this._impl.getJVMStats(callback);
    };

    /**
     * Return system-level statistics (data for each CPU/core on the 
     * server running a gateway.)  This actually returns some other
     * info besides the summary, indicating the summary data fields
     * and notification and gather intervals.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getSystemStats = function(callback) {
        return this._impl.getSystemStats(callback);
    };

    /**
     * Return CPU-level statistics (data for each CPU/core on the 
     * server running a gateway).
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getCpuListStats = function(callback) {
        return this._impl.getCpuListStats(callback);
    };

    /**
     * Return NIC-level statistics (data for each NIC on the 
     * server running a gateway.)  This actually returns some other
     * info besides the summary, indicating the summary data fields
     * and notification and gather intervals.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getNicListStats = function(callback) {
        return this._impl.getNicListStats(callback);
    };

    /**
     * Return an object that lists the summary data definition information
     * for each of the various object types that support summary data,
     * so we can optimize the sending of summary data from the gateway
     * by not sending the field names as part of the data.
     * Each object type corresponds to a property of the returned object:
     *  'gateway', 'service', 'session', 'system', 'cpuList', 
     *  'nicList', 'jvm'
     * The value of each is an object 
     *  {fields: an array of strings, the field names for the type, in order.
     *           NOTE: we add an extra field, 'readTime', which we associate
     *           with each summary record, either coming from the gateway
     *           or assigned locally on the client.
     *   notificationInterval: the notificationInterval, in MS, for summary
     *                         notifications for that object type.
     *   gatherInterval: for those types that 'gather' more than one set of
     *                   data before sending it (e.g., CPU and NIC), the
     *                   current interval used when gathering the data.
     *                   For other types, this value is null.
     *
     *  'gateway', 'service', 'session', 'system', 'cpuList', 
     *  'nicList', 'jvm'
     */
    $proto.getSummaryDataDefinitions = function(callback) {
        return this._impl.getSummaryDataDefinitions(callback);
    };

    /**
     * Simple 'ping' to the server. to check that the connection
     * is working.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.ping = function(callback) {
        return this._impl.ping(callback);
    };

    /**
     * Push an update check to the server
     */
    $proto.forceUpdateVersionCheck = function(callback) {
        return this._impl.forceUpdateVersionCheck(callback);
    }

    /**
     * Get the current version that is available for update
     */
    $proto.getUpdateVersion = function(callback){
        return this._impl.getUpdateVersion(callback);
    }
})();
