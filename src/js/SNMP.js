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
 * Creates a new SNMP instance.
 *
 * @constructor
 *
 * @class  SNMP provides a socket-based JavaScript client API to communicate
 *         over websockets with any compatible SNMP server process, such as
 *         the SNMP4J Agent started by the Gateway. 
 * 
 * NOTE: the Kaazing Command Center uses multiple instances of the SNMP object (one
 * per gateway connection), so we need to be very careful about which variables
 * are instance-specific and which are not.
 */
function SNMP() {
    // internal vars that are instance-specific
    this._challengeHandler = null;
    this._initialized = false;
    this._openListener = null;
    this._openListenerCallbackData = null;
    this._exceptionListener = null;
    this._exceptionListenerCallbackData = null;
    this._closeListener = null;
    this._closeListenerCallbackData = null;
    this._location = null;
    this._socket = null;
    this._buffer = null;
    this._notifAck = null;
    this._callbackMap = new Object();
    this._webSocketFactory = null;

    this._bytesRead = 0;  // for debugging
    this._fragmentsRead = 0;  // for debugging
}

(function() {

    var $prototype = SNMP.prototype;
    
    /**
     * The onopen handler is called when the connection is established.
     *
     * @public
     * @field
     * @type Function
     * @name onopen
     * @memberOf SNMP
     */
    $prototype.onopen = function() {
        if (this._openListener !== undefined) {
            this._openListener(this._openListenerCallbackData);
        }
    };

    /**
     * The onmessage handler is called when a message is delivered 
     * to a subscribed destination.
     *
     * @param {Object} headers  the message headers
     * @param {String} body     the message body
     *
     * @public
     * @field
     * @type Function
     * @name onmessage
     * @memberOf SNMP
     */
    $prototype.onmessage = function(headers, body) {
    };

    /**
     * The onreceipt handler is called when a message receipt is received.
     *
     * @param {Object} headers  the receipt message headers
     *
     * @public
     * @field
     * @type Function
     * @name onreceipt
     * @memberOf SNMP
     */
    $prototype.onreceipt = function(headers) {
    };

    /**
     * The onerror handler is called when an error message is received.
     *
     * @param {Object} headers  the error message headers
     * @param {String} body     the error message body
     *
     * @public
     * @field
     * @type Function
     * @name onerror
     * @memberOf SNMP
     */
    $prototype.onerror = function(headers, body) {
        CC.console.error('SNMP: onerror!');
        if (this._exceptionListener !== undefined) {
            this._exceptionListener(this._exceptionListenerCallbackData); // TODO: pass an exception object to the listener
        }
    };

    /**
     * The onclose handler is called when the connection is terminated. 
     * Note that this also occurs (I think) if a login fails.
     *
     * @public
     * @field
     * @type Function
     * @name onclose
     * @memberOf SNMP
     */
    $prototype.onclose = function() {
        CC.console.error('SNMP: onclose!');
        if (this._closeListener !== undefined) {
            this._closeListener(this._closeListenerCallbackData);
        }
    };

    $prototype.oncloseNotif = function() {
    };

    $prototype.oncloseNotifAck = function() {
    };

    /**
     * Set the challenge handler for this connection.
     *
     * @param {object}     challengeHandler            the handler object
     *
     * @return {void}
     *
     * @public
     * @function
     * @name setChallengeHandler
     * @memberOf SNMP
     */
    $prototype.setChallengeHandler = function(challengeHandler) {
        this._challengeHandler = challengeHandler;
    };

    $prototype.getLocation = function() {
        return this._location;
    };

    /**
     * Return the current challengeHandler.
     */
    $prototype.getChallengeHandler = function() {
        return this._challengeHandler;
    };
    
    /**
     * Connects to the RMI server
     *
     * @param {String}     location            the RMI server location
     *
     * @return {void}
     *
     * @public
     * @function
     * @name connect
     * @memberOf SNMP
     */
    $prototype.connect = function(location) {
        var $this = this;

        _initialize($this);

        if (this._socket === null || this._socket.readyState === Kaazing.Gateway.WebSocket.CLOSED) {
            // initialize socket
            if (!this._webSocketFactory) {
                this._webSocketFactory = new Kaazing.Gateway.WebSocketFactory();
                this._webSocketFactory.setChallengeHandler(this._challengeHandler);
            }

            var socket = this._webSocketFactory.createWebSocket(location);
            socket.binaryType = "bytebuffer";

            socket.onopen = function() { 
                $this.onopen();
            };

            socket.onmessage = function(evt) { 
                _readFragment($this, evt); 
            };

            socket.onclose = function(evt) { 
                $this.onclose(); 
            };

            $this._socket = socket;

            // initialize buffer
            $this._buffer = new Kaazing.Gateway.ByteBuffer();

            $this._location = location;
        }
    };

    /**
     * Return true if there is a websocket and its readyState is 1 (OPEN).
     */
    $prototype.isOpen = function() {
        return (this._socket !== null && this._socket.readyState === Kaazing.Gateway.WebSocket.OPEN);
    }

    /**
     * Disconnects from the SNMP Agent if it is connected.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name disconnect
     * @memberOf SNMP
     */
    $prototype.disconnect = function() {
        if (this.isOpen()) {
            this._socket.close();
        }
    };

    /**
     * Register a listener to be called back after the connection is
     * opened.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name setOpenListener
     * @memberOf SNMP
     */
    $prototype.setOpenListener = function(listener, callbackData) {
        this._openListener = listener;
        this._openListenerCallbackData = callbackData;
    };

    /**
     * Register an exception listener for errors that happen on the
     * connection and SNMP errors. Note: the listener is not called
     * for errors that happen during connection, only those that
     * occur after the connection is established.
     *
     * TODO:  throw exceptions for SNMP errors decoded from the packet
     *
     * @return {void}
     *
     * @public
     * @function
     * @name setExceptionListener
     * @memberOf SNMP
     */
    $prototype.setExceptionListener = function(listener, callbackData) {
        this._exceptionListener = listener;
        this._exceptionListenerCallbackData = callbackData;
    };

    /**
     * Register a listener to be called back after the connection is
     * closed
     *
     * @return {void}
     *
     * @public
     * @function
     * @name setCloseListener
     * @memberOf SNMP
     */
    $prototype.setCloseListener = function(listener, callbackData) {
        this._closeListener = listener;
        this._closeListenerCallbackData = callbackData;
    };

    /**
     * Acknowledge a received message.
     *
     * @param {String} messageId      the message identifier
     * @param {String} transactionId  the transaction identifier
     * @param {String} [receiptId]    the message receipt identifier
     * @param {Object} [headers]      the acknowledgment headers
     *
     * @return {void}
     *
     * @public
     * @function
     * @name ack
     * @memberOf SNMP
     */
/*
    $prototype.ack = function(messageId, transactionId, receiptId, headers) {
        var headers0 = headers || {};
        headers0["message-id"] = messageId;
        headers0.transaction = transactionId;
        headers0.receipt = receiptId;
        _writeFrame(this, "ACK", headers0);
    };
*/

    $prototype.startNotifListener = function(callback) {
        // FIXME: this needs to create a target entry and target params entry to register for
        // the desired set of notifications.  After the entry has been created (a series of set
        // requests) the rowStatus of the created entries should be set to active.
        var $this = this;

        this._callbackMap[0] = callback; // request ids start at 1, save 0 for the special notif callback

        /*OID of targetTable.targetEntry.rowStatus: 1.3.6.1.6.3.12.1.2.1.9*/
        //        this._makeSetRequest($this, validator, [0x2b, 0x06, 0x01, 0x06, 0x03, 0x0c, 0x01, 0x02, 0x01, 0x09], TYPE_INTEGER, 5);
        $this.subscribeToNotifications($this);
    };

    /**
     * Build up the SNMP GetRequest message, then send it through
     * the socket.  GetRequest takes an array of OIDs (each of which
     * has already been encoded into an array of numbers--see encodeOID())
     * and we support notifying a callback function when the response 
     * returns.
     */
    $prototype.makeGetRequest = function(callback, oidArray) {
        if (this._socket === null) {
            CC.console.warn("SNMP makeGetRequest() on connection [" + 
                            this._location + 
                            "] with no _socket defined.");
            throw new Error("SNMP makeGetRequest() on connection [" + 
                            this._location + 
                            "] with no _socket defined.");
        }
         
        if (this._socket.readyState !== Kaazing.Gateway.WebSocket.OPEN) {
            CC.console.warn("SNMP makeGetRequest() on connection [" + 
                             this._location + 
                             "] that is not OPEN (1), it is " + 
                            this._socket.readyState + ".");
            
            throw new Error("SNMP makeGetRequest() on connection [" + 
                            this._location + 
                            "] that is not OPEN (1), it is " + 
                            this._socket.readyState + ".");
        }

        var request = new Array();

        // start writing the SNMP message

        // VERSION INFO
        _writeInteger(request, 1);

        // COMMUNITY INFO (FIXME: hardcoded to public for now)
        _writeOctetString(request, "public");

        // assemble the PDU part of the request
        var pduData = new Array();
        var reqId = _getRequestId();

        _writeInteger(pduData, reqId);
        _writeInteger(pduData, 0); // error placeholder
        _writeInteger(pduData, 0); // error index

        // for each OID, create a VarBind consisting of a 2-element
        // sequence, the OID and a null placeholder for the return data.
        // Then add each VarBind to a list of VarBinds, which will itself
        // be encoded as a sequence below.
        var numOIDs = oidArray.length;
        var varBinds = [];

        for (var i = 0; i < numOIDs; i++) {
            var varBind = [];
            _writeOID(varBind, oidArray[i], TYPE_NULL, null);
            _writeSequence(varBind);  // the entire varbind
            _pushArrayData(varBinds, varBind);
        }

        // encode the VarBinds as a sequence before 
        // adding them to the pdu that will be sent.
        _writeSequence(varBinds);

        _pushArrayData(pduData, varBinds);

        // GETREQUEST PDU
        request.push(GET_REQUEST_PDU);
        _pushEncodedLength(request, pduData.length);
        _pushArrayData(request, pduData);

        // now package up the request and send it
        var packetData = new Kaazing.Gateway.ByteBuffer();

        packetData.put(TYPE_SEQUENCE);
        _writeMiscData(packetData, _writeEncodedLength(request.length));
        _writeMiscData(packetData, request);
        packetData.flip();

        this._callbackMap[reqId] = callback;

//        var blob = _getBlobAt(packetData, 0, packetData.limit);
//        this._socket.send(blob);
        this._socket.send(packetData);
    }

    /**
     * Build up the SNMP GetSubtreeRequest message, then send it through
     * the socket.  GetSubtreeRequest is of the same form as GetRequest 
     * in that it takes an array of OIDs (each of which has already been 
     * encoded into an array of numbers--see encodeOID()), but it uses
     * a different PDU (KZ_GET_SUBTREE_PDU) and instead of returning the 
     * data for the exact OIDs given, it returns the data for all
     * the OIDs in the subtree under each of the given OIDs (including
     * the data for the specified OIDs as well.)
     * We also support notifying a callback function when the response 
     * returns.
     */
    $prototype.makeGetSubtreeRequest = function(callback, oidArray) {
        if (!(this.isOpen())) {
            CC.console.warn("SNMP makeGetSubtreeRequest() on connection [" + 
                            this._location + "] that is not OPEN.");
            throw new Error("SNMP makeGetSubtreeRequest() on connection [" + 
                            this._location + "] that is not OPEN.");
        }

        var request = new Array();

        // start writing the SNMP message

        // VERSION INFO
        _writeInteger(request, 1);

        // COMMUNITY INFO (FIXME: hardcoded to public for now)
        _writeOctetString(request, "public");

        // assemble the PDU part of the request
        var pduData = new Array();
        var reqId = _getRequestId();

        _writeInteger(pduData, reqId);
        _writeInteger(pduData, 0); // error placeholder
        _writeInteger(pduData, 0); // error index

        // for each OID, create a VarBind consisting of a 2-element
        // sequence, the OID and a null placeholder for the return data.
        // Then add each VarBind to a list of VarBinds, which will itself
        // be encoded as a sequence below.
        var numOIDs = oidArray.length;
        var varBinds = [];

        for (var i = 0; i < numOIDs; i++) {
            var varBind = [];
            _writeOID(varBind, oidArray[i], TYPE_NULL, null);
            _writeSequence(varBind);  // the entire varbind
            _pushArrayData(varBinds, varBind);
        }

        // encode the VarBinds as a sequence before 
        // adding them to the pdu that will be sent.
        _writeSequence(varBinds);

        _pushArrayData(pduData, varBinds);

        request.push(KZ_GET_SUBTREE_REQUEST_PDU);
        _pushEncodedLength(request, pduData.length);
        _pushArrayData(request, pduData);

        // now package up the request and send it
        var packetData = new Kaazing.Gateway.ByteBuffer();

        packetData.put(TYPE_SEQUENCE);
        _writeMiscData(packetData, _writeEncodedLength(request.length));
        _writeMiscData(packetData, request);
        packetData.flip();

        this._callbackMap[reqId] = callback;

//        var blob = _getBlobAt(packetData, 0, packetData.limit);
//        this._socket.send(blob);
        this._socket.send(packetData);
    }

    /**
     * Request several OIDs, some of which repeat, others of which do not.
     * The OIDs in the list up to #non-repeaters (default is 0 non-repeaters) 
     * are *not* iterated over, but are each done on the server side with a 
     * single GetRequest. The subsequent OIDs are iterated over up to 
     * "max-repetitions" times.
     * Note: 'oidArray' is an array of OIDs (each of which
     * has already been encoded into an array of numbers--see encodeOID().)
     */
    $prototype.makeGetBulkRequest = function(callback, oidArray, maxRepetitions, nonRepeaters) {
        if (!(this.isOpen())) {
            CC.console.warn("SNMP makeGetBulkRequest() on connection [" + 
                            this._location + "] that is not OPEN.");
            throw new Error("SNMP makeGetBulkRequest() on connection [" + 
                            this._location + "] that is not OPEN.");
        }

        var request = new Array();

        if (nonRepeaters === undefined || nonRepeaters < 0) {
            nonRepeaters = 0;
        }

        // VERSION INFO
        _writeInteger(request, 1);

        // COMMUNITY INFO (FIXME: hardcoded to public for now)
        _writeOctetString(request, "public");

        // assemble the PDU part of the request
        var pduData = new Array();
        var reqId = _getRequestId();

        _writeInteger(pduData, reqId);
        _writeInteger(pduData, nonRepeaters);
        _writeInteger(pduData, maxRepetitions); 

        // for each OID, create a VarBind consisting of a 2-element
        // sequence, the OID and a null placeholder for the return data.
        // Then add each VarBind to a list of VarBinds, which will itself
        // be encoded as a sequence below.
        var numOIDs = oidArray.length;
        var varBinds = [];

        for (var i = 0; i < numOIDs; i++) {
            var varBind = [];
            _writeOID(varBind, oidArray[i], TYPE_NULL, null);
            _writeSequence(varBind);  // the entire varbind
            _pushArrayData(varBinds, varBind);
        }

        // encode the VarBinds as a sequence before 
        // adding them to the pdu that will be sent.
        _writeSequence(varBinds);

        _pushArrayData(pduData, varBinds);

        // GETBULK_REQUEST PDU
        request.push(GETBULK_REQUEST_PDU);
        _pushEncodedLength(request, pduData.length);
        _pushArrayData(request, pduData);

        // now package up the request and send it
        var packetData = new Kaazing.Gateway.ByteBuffer();

        packetData.put(TYPE_SEQUENCE);
        _writeMiscData(packetData, _writeEncodedLength(request.length));
        _writeMiscData(packetData, request);
        packetData.flip();

        this._callbackMap[reqId] = callback;

//        var blob = _getBlobAt(packetData, 0, packetData.limit);
//        this._socket.send(blob);
        this._socket.send(packetData);
    }

    $prototype.makeResponse = function($this, obj, variableByteBuffer) {
        if (!(this.isOpen())) {
            CC.console.warn("SNMP makeResponse() on connection [" + 
                            this._location + "] that is not OPEN.");
            throw new Error("SNMP makeResponse() on connection [" + 
                            this._location + "] that is not OPEN.");
        }

        var response = new Array();

        // VERSION INFO
        _writeInteger(response, 1);

        // COMMUNITY INFO (FIXME: hardcoded to public for now)
        _writeOctetString(response, "public");

        var tmpResponse = new Array();
        var reqId = obj.requestId;

        // TODO:  Store the reqId in a hash with the callback so the 
        // response can be correctly matched up

        _writeInteger(tmpResponse, reqId);
        _writeInteger(tmpResponse, 0); // error
        _writeInteger(tmpResponse, 0); // error index

        // build the list of variables.  First, get the
        // array of bytes
        var variableList = variableByteBuffer.getBytes(variableByteBuffer.limit);
        //        _writeOID(variableList, oid, TYPE_NULL, null);
        //        _writeSequence(variableList);
        //        _writeSequence(variableList);

        _pushArrayData(tmpResponse, variableList);

        // GETRESPONSE PDU
        response.push(GET_RESPONSE_PDU);
        _pushEncodedLength(response, tmpResponse.length);
        _pushArrayData(response, tmpResponse);

        // now package up the response and send it
        var packetData = new Kaazing.Gateway.ByteBuffer();

        packetData.put(TYPE_SEQUENCE);
        _writeMiscData(packetData, _writeEncodedLength(response.length));
        _writeMiscData(packetData, response);
        packetData.flip();

        var blob = _getBlobAt(packetData, 0, packetData.limit);
        $this._notifAck.send(blob);
    }

    $prototype.makeSetRequest = function(callback, oid, valueType, value) {
        if (!(this.isOpen())) {
            CC.console.warn("SNMP makeSetRequest() on connection [" + 
                            this._location + "] that is not OPEN.");
            throw new Error("SNMP makeSetRequest() on connection [" + 
                            this._location + "] that is not OPEN.");
        }

        var request = new Array();

        // VERSION INFO
        _writeInteger(request, 1);

        // COMMUNITY INFO (FIXME: hardcoded to public for now)
        _writeOctetString(request, "public");

        var pduData = new Array();
        var reqId = _getRequestId();

        // TODO:  Store the reqId in a hash with the callback so the response 
        // can be correctly matched up

        _writeInteger(pduData, reqId);
        _writeInteger(pduData, 0); // error
        _writeInteger(pduData, 0); // error index

        // build the list of variables
        var variableList = new Array();
        _writeOID(variableList, oid, valueType, value);
        _writeSequence(variableList);
        _writeSequence(variableList);

        // now put the variable list on the end of the request
        _pushArrayData(pduData, variableList);

        // SETREQUEST PDU
        request.push(SET_REQUEST_PDU);
        _pushEncodedLength(request, pduData.length);
        _pushArrayData(request, pduData);

        // now package up the request and send it
        var packetData = new Kaazing.Gateway.ByteBuffer();

        packetData.put(TYPE_SEQUENCE);
        _writeMiscData(packetData, _writeEncodedLength(request.length));
        _writeMiscData(packetData, request);
        packetData.flip();

        this._callbackMap[reqId] = callback;

//        var blob = _getBlobAt(packetData, 0, packetData.limit);
//        this._socket.send(blob);
        this._socket.send(packetData);
    }

    // FIMXE:  need callback?
    $prototype.subscribeToNotifications = function($this) {
        if (!(this.isOpen())) {
            CC.console.warn("SNMP subscribeToNotifications() on connection [" + 
                            this._location + "] that is not OPEN.");
            throw new Error("SNMP subscribeToNotifications() on connection [" + 
                            this._location + "] that is not OPEN.");
        }

        var request = new Array();

        // VERSION INFO
        _writeInteger(request, 1);

        // COMMUNITY INFO (FIXME: hardcoded to public for now)
        _writeOctetString(request, "public");

        //        var pduData = new Array();
        //        var reqId = _getRequestId();

        // TODO:  Store the reqId in a hash with the callback so the 
        // response can be correctly matched up

        //        _writeInteger(pduData, reqId);
        //        _writeInteger(pduData, 0); // error
        //        _writeInteger(pduData, 0); // error index

        // build the list of variables
        //        var variableList = new Array();

        // FIXME: this includes a dummy OID for now, needs to be 
        // cleaned up so the API is clear for subscribing to notifications
        //        _writeOID(variableList,
        //            [0x2b, 0x06, 0x01, 0x04, 0x01, /*29197*/0x81, 0xe4, 0x0d/*29197*/, 0x01, 0x01],
        //                                 TYPE_NULL,
        //                                 null);
        //        _writeSequence(variableList);
        //        _writeSequence(variableList);

        // now put the variable list on the end of the request
        //        _pushArrayData(pduData, variableList);

        // SETREQUEST PDU
        request.push(KZ_NOTIF_SUB_PDU);
        _pushEncodedLength(request, 0); // add 0 length since there is no payload w/ subscription request
        //        _pushEncodedLength(request, pduData.length);
        //        _pushArrayData(request, pduData);

        // now package up the request and send it
        var packetData = new Kaazing.Gateway.ByteBuffer();

        packetData.put(TYPE_SEQUENCE);
        _writeMiscData(packetData, _writeEncodedLength(request.length));
        _writeMiscData(packetData, request);
        packetData.flip();

//        var blob = _getBlobAt(packetData, 0, packetData.limit);
//        this._socket.send(blob);
        this._socket.send(packetData);
    }

    function _initialize($this) {
        if (!($this._initialized && $this._initialized === true)) {
            $this._initialized = true;

            _decodeMap[TYPE_INTEGER] = _readInteger;
            _decodeMap[TYPE_OCTET_STRING] = _readOctetString;
            _decodeMap[TYPE_NULL] = _readNull;
            _decodeMap[TYPE_OID] = _readOID;
            _decodeMap[TYPE_SEQUENCE] = _readSequence;
            //            _decodeMap[TYPE_IP_ADDRESS] = _readIpAddress;
            //            _decodeMap[TYPE_COUNTER] = _readCounter;
            _decodeMap[TYPE_TIMETICKS] = _readTimeticks;
            _decodeMap[TYPE_COUNTER64] = _readCounter64;
            _decodeMap[TYPE_NULL_NO_SUCH_OBJECT] = _readNull;
            _decodeMap[TYPE_NULL_NO_SUCH_INSTANCE] = _readNull;
            _decodeMap[TYPE_NULL_END_OF_MIB_VIEW] = _readNull;
        }
    }

    function validator(obj) {
        // FIXME: make sure set requests succeed or the whole thing should fail
    }

    /**
     * @private
     * @static
     * @function
     * @name _readFragment
     * @memberOf SNMP
     */
    function _readFragment($this, evt) {
        if (evt) {
            var fragmentData = evt.data;
            if (fragmentData) {
                $this._fragmentsRead++;

                if (fragmentData.type !== undefined) {
                    $this._bytesRead += evt.data.length;

                    Kaazing.Gateway.BlobUtils.asNumberArray(
                        function(numberArray) {_readFragmentImpl($this, numberArray);}, 
                        evt.data);
                } else {
                    $this._bytesRead += fragmentData.limit;

                    _processFragment($this, fragmentData);
                }
            }
        }
    }

    function _readFragmentImpl($this, numberArray) {
        var byteBuffer = new Kaazing.Gateway.ByteBuffer();

        // append new data to the buffer
        _writeMiscData(byteBuffer, numberArray);

        // prepare the buffer for reading
        byteBuffer.flip();

        _processFragment($this, byteBuffer);
    }

    function _processFragment($this, byteBuffer) {
        outer: while (byteBuffer.hasRemaining()) {

            // mark read progress
            byteBuffer.mark();

            // FIXME:  process the message using BER of ASN.1
            //            if ($this._callback) {
            //                var obj = _processResponse(byteBuffer);
            /*var obj = */
            try {
                _processMessage($this, byteBuffer);
                //                $this._callback(obj);
                //                delete $this._callback;
                //            }
            } catch (e) {
                var alertMsg = "Caught exception in _readFragment loop: [" + e + "]";
                var trace = printStackTrace({e: e}.join('\n\n'));
                alertMsg = alertMsg + '\nException stack:\n' + trace;

                alert(alertMsg);
                CC.console.error(alertMsg);
            }
        }
        
        // compact the buffer
        byteBuffer.compact();
        byteBuffer.clear();
//        $this._buffer = new Kaazing.Gateway.ByteBuffer();
    }

    //    function _readAck($this, evt) {
    //      alert('received msg on ack channel');
    //    }

    /**
     * @private
     * @static
     * @function
     * @name _writeFrame
     * @memberOf SNMP
     */
    function _writeFrame($this, body) {
        var frame = new Kaazing.Gateway.ByteBuffer();

        if (body) {
            for (var i = 0; i < body.length; i++) {
                frame.put(body[i]);
            }
        }

        // flip the frame buffer
        frame.flip();
        
        // send the frame buffer
//        var blob = _getBlobAt(frame, 0, frame.limit);
//        this._socket.send(blob);
        this._socket.send(frame);
    }

    function _writeMiscData(byteBuffer, data) {
        if (data) {
            for (var i = 0; i < data.length; i++) {
                byteBuffer.put(data[i]);
            }
        }
    }

    function _processMessage($this, byteBuffer) {
        var obj, sequenceLen, version, uns, community, pduType, requestId;

        try {
            // FIXME:  need to use sequenceLen for validation?
            // FIXME:  Need to use version for proper processing based on v1, v2c, v3
            uns = byteBuffer.getUnsigned();
            sequenceLen = _decodeMap[uns](byteBuffer);

            uns = byteBuffer.getUnsigned();
            version = _decodeMap[uns](byteBuffer);

            uns = byteBuffer.getUnsigned();
            community = _decodeMap[uns](byteBuffer);

            pduType = byteBuffer.getUnsigned();
            requestId = 0;
            if (pduType === GET_RESPONSE_PDU) {
                obj = _processResponse(byteBuffer, community);
                requestId = obj.requestId;
            } else if ((pduType === INFORM_REQUEST_PDU) || (pduType === TRAP_V2_PDU)) {
                obj = _processNotification(byteBuffer, pduType, community);
            }

            if (requestId !== undefined) {
                var callback = $this._callbackMap[requestId];
                if (callback !== undefined) {
                    callback(obj);
                    if (requestId !== 0) {
                        delete $this._callbackMap[requestId];
                    }
                }
            }
        } catch (e) {
            var alertMsg = "Caught exception in _processMessage: [" + e + "]";

            var trace = printStackTrace({e: e}).join('\n\n');
            alertMsg = alertMsg + '\nException stack:\n' + trace;

            alert(alertMsg);
            CC.console.error(alertMsg);
        } 
    }

    function _processResponse(byteBuffer, community) {
        var obj = new Object();

        var responseLen = _getLength(byteBuffer.getUnsigned(), byteBuffer);
        var requestId = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        // FIXME:  branch based on whether or not there is an error
        var errorCode = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
        var errorIndex = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        // CC.console.debug("SNMP.processResponse: errorCode = " + errorCode + 
        //                       ", errorIndex = " + errorIndex);

        var variableListLen = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        if (variableListLen > 0) {
            obj.values = new Object();

            // in a loop --- grab variables while they are set in the buffer
            while (byteBuffer.hasRemaining()) {
                var valType = byteBuffer.getUnsigned();
                var variableLen = _decodeMap[valType](byteBuffer);
                var oid = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
                var variableValueType = byteBuffer.getUnsigned();
                var variableValue = _decodeMap[variableValueType](byteBuffer);

                // CC.console.debug("SNMP.processResponse: valType " + valType + 
                //                  ", varLen = " + variableLen + "OID " + oid + 
                //                  ", varValueType = " + variableValueType + ", varValue = '" + 
                //                  variableValue + "'");

                obj.values[oid] = variableValue;
            }
        }

        obj.requestId = requestId;
        obj.community = community;
        obj.errorCode = errorCode;

        return obj;
        //        }
        //        return null;
    }

    function _processNotification(byteBuffer, pduType, community) {
        var obj = new Object();

        //        var sequenceLen = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
        //        var version = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        //        if (version != 1) {
        //            obj.type = "wrong version " + version;
        //            return obj;
        //        }

        //        var community = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        //        var pduType = byteBuffer.getUnsigned();
        var sendAck = false;
        if (pduType === INFORM_REQUEST_PDU) {
            sendAck = true;
            obj.type = "inform";
        } else if (pduType === TRAP_V2_PDU) {
            obj.type = "trapV2";
        } else {
            obj.type = "unknown " + pduType;
            return obj;
        }

        var responseLen = _getLength(byteBuffer.getUnsigned(), byteBuffer);
        var requestId = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        // FIXME:  branch based on whether or not there is an error
        var errorCode = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
        var errorIndex = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);

        var variableByteBuffer = byteBuffer.slice();

        var variableListLen = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
        if (variableListLen > 0) {
            obj.values = new Object();

            // in a loop --- grab variables while they are set in the buffer
            while (byteBuffer.hasRemaining()) {
                var variableLen = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
                var oid = _decodeMap[byteBuffer.getUnsigned()](byteBuffer);
                var variableValueType = byteBuffer.getUnsigned();
                var variableValue = _decodeMap[variableValueType](byteBuffer);

                obj.values[oid] = variableValue;
            }
        }

        obj.community = community;
        obj.errorCode = errorCode;
        obj.requestId = requestId;

        // before returning, we need to "ack" this notification...
        if (sendAck === true) {
           _makeResponse(this, obj, variableByteBuffer);  // XXX this routine no longer exists
        }

        return obj;
    }

    function _readInteger(byteBuffer) {
        var len = byteBuffer.getUnsigned();
        var result = 0;

        for (var i = 0; i < len; i++) {
            result = (result * 256) + byteBuffer.getUnsigned();
        }

        return result;
    }

    function _readTimeticks(byteBuffer) {
        var len = byteBuffer.getUnsigned();
        var result = 0;

        for (var i = 0; i < len; i++) {
            result = (result * 256) + byteBuffer.getUnsigned();
        }

        return result;
    }

    /**
     * Encode an integer and append it to an array of bytes
     * (modifying the incoming array.)
     * Returns the array.
     */
    function _writeInteger(arr, value) {
        var intBytes = new Array();

        for (var i = 3; i >= 0; i--) {
            var shiftAmount = i * 8;
            var bitwiseVal = 0xFF << shiftAmount;
            var extractedByte = value & bitwiseVal;
            var nextByte = extractedByte >> shiftAmount;
            if ((nextByte != 0) || (intBytes.length > 0)) {
                intBytes.push(nextByte);
            }
        }

        arr.push(TYPE_INTEGER);
        var numBytes = intBytes.length;
        if (numBytes === 0) {
            // handle 0 specially
            arr.push(1);
            arr.push(0);
        } else {
            arr.push(numBytes);
            for (var i = 0; i < numBytes; i++) {
                arr.push(intBytes[i]);
            }
        }

        return arr;
    }

    // for now we just return the array of bytes rather than 
    // using the ASCII value of the byte
    function _readOctetString(byteBuffer) {
        var len = _getLength(byteBuffer.getUnsigned(), byteBuffer);
        var result = new String();

        for (var i = 0; i < len; i++) {
            result = result.concat(String.fromCharCode(byteBuffer.getUnsigned()));
        }

        return result.toString();
    }

    /**
     * Push an octet string onto an array of bytes,
     * modifying the array.
     * Returns the array.
     */
    function _writeOctetString(arr, value) {
        arr.push(TYPE_OCTET_STRING);
        _pushEncodedLength(arr, value.length);
        for (var i = 0; i < value.length; i++) {
            arr.push(value.charCodeAt(i));
        }

        return arr;
    }

    function _readNull(byteBuffer) {
        var len = byteBuffer.get();

        for (var i = 0; i < len; i++) {
            byteBuffer.get(); // read the null bytes
        }

        // now just return null
//        return 0x00;
        return null;
    }

    /**
     * Read an OID from a byteBuffer, returning the 
     * resulting string (with '.' between the octets.)
     */
    function _readOID(byteBuffer) {
        var result = new Array();
        var len = byteBuffer.getUnsigned() - 1;

        if (len >= 0) {

            // the first byte is ((40 * x) + y) to identify the object x.y
            var initialByte = byteBuffer.getUnsigned();
            var y = initialByte % 40;
            var x = (initialByte - y) / 40;

            result.push(x);
            result.push(y);
            var partialInt = 0;
            for (var i = 0; i < len; i++) {
                // values are encoded as the bottom 7 bits of
                // a byte with the top bit being a continue bit
                var nextByte = byteBuffer.getUnsigned();
                partialInt = partialInt + (nextByte & 0x7F);
                if ((nextByte & 0x80) != 0) {
                    partialInt = partialInt * 128;
                } else {
                    result.push(partialInt);
                    partialInt = 0;
                }
            }
        }

        return result.join(".");
    }

    /**
     * Write an encoded OID into an array of bytes (modifying
     * the original array, so it's not necessary to reassign it.)
     * Returns the array being written into.
     */
    function _writeOID(arr, oid, valueType, value) {
        arr.push(TYPE_OID);
        arr.push(oid.length);
        _pushArrayData(arr, oid);

        switch (valueType) {
        case TYPE_NULL:
            arr.push(TYPE_NULL);
            arr.push(0x00);
            break;
        case TYPE_INTEGER:
            _writeInteger(arr, value);
            break;
        case TYPE_OCTET_STRING:
            _writeOctetString(arr, value);
            break;
        case TYPE_OID:
            // FIXME:  this might put too much extra stuff at the end...
            _writeOID(arr, value, TYPE_NULL, null);
            break;
        case TYPE_COUNTER64:
            _writeCounter64(arr, value);
            break;
        }

        return arr;
    }

    function _readCounter64(byteBuffer) {
        var len = byteBuffer.getUnsigned();
        var result = 0;

        for (var i = 0; i < len; i++) {
            result = result * 256; 
            result = result + byteBuffer.getUnsigned();
        }

        return result;
    }

    /**
     * Write a Counter64 value into what's usually a 
     * message array of bytes.  Returns the modified array.
     */
    function _writeCounter64(arr, value) {
        var longBytes = new Array();

        for (var i = 7; i >= 0; i--) {
            var shiftAmount = i * 8;
            var bitwiseVal = 0xFF << shiftAmount;
            var extractedByte = value & bitwiseVal;
            var nextByte = extractedByte >> shiftAmount;
            if ((nextByte != 0) || (longBytes.length > 0)) {
                longBytes.push(nextByte);
            }
        }

        arr.push(TYPE_COUNTER64);
        if (longBytes.length === 0) {
            // handle 0 specially
            arr.push(1);
            arr.push(0);
        } else {
            arr.push(longBytes.length);
            for (var i = 0; i < longBytes.length; i++) {
                arr.push(longBytes[i]);
            }
        }

        return arr;
    }

    function _readSequence(byteBuffer) {
        var len = _getLength(byteBuffer.getUnsigned(), byteBuffer);

        // we just return the length of the sequence for now...
        return len;
    }

    /**
     * Encode an SNMP sequence for an array of bytes.
     * Returns the original (now modified) array.
     */
    function _writeSequence(arr) {
        // because the sequence is TYPE_SEQUENCE + encodedLength + originalData,
        // unshift the encodedlength data first, then TYPE_SEQUENCE last.
        var encodedLengthArr = _writeEncodedLength(arr.length);
        
        for (var i = encodedLengthArr.length - 1; i >= 0; i--) {
            arr.unshift(encodedLengthArr[i]);
        }

        arr.unshift(TYPE_SEQUENCE);

//        var sequenceArray = new Array();

//        sequenceArray.push(TYPE_SEQUENCE);
//        _pushEncodedLength(sequenceArray, arr.length);
//        _pushArrayData(sequenceArray, arr);

//        return sequenceArray;

        return arr;
    }

    function _getRequestId() {
        return _reqId++;
    }

    function _getLength(len, buffer) {
        if ((len & 0x80) != 0) {
            var numBytes = len & 0x7f;
            var tmpSize = 0;
            for (var i = 0; i < numBytes; i++) {
                tmpSize = tmpSize * 256;
                tmpSize = tmpSize + buffer.getUnsigned();
            }
            len = tmpSize;
        }

        return len;
    }

   /**
    * Given a length in bytes, encode it and push the encoded length
    * onto the array provided.  Returns the buffer.
    */
    function _pushEncodedLength(arr, lengthVar) {
        if (lengthVar >= 128) {
            // The length is greater than 128 bytes, we encode the length as 
            // [0x80 | number-of-bytes] and then the length value broken up 
            // into number-of-bytes bytes.  First extract the bytes from
            // the least significant byte to the most significant byte in 
            // order to find the total number of bytes required.  Then encode 
            // the length prefix (0x80 | number-of-bytes) followed by the most
            // significant byte down to the least significant byte.  Since 
            // the length byte array is extracted least significant to most 
            // significant, start at the end of the array and work backwards.
            var tmpLength = lengthVar;
            var lengthBytes = new Array();
            while (tmpLength != 0) {
                lengthBytes.push(tmpLength & 0xFF);
                tmpLength = tmpLength >> 8;
            }

            arr.push(0x80 | lengthBytes.length);
            for (var i = lengthBytes.length - 1; i >= 0; i--) {
                arr.push(lengthBytes[i]);
            }
        } else {
            arr.push(lengthVar);
        }

        return arr;
    }

    /**
     * Given a length in bytes, encode it into an array and 
     * return the encoded array
     */
    function _writeEncodedLength(lengthVar) {
        return _pushEncodedLength(new Array(), lengthVar);
    }

   /**
    * Given two arrays, push the data in the second one onto the
    * first one (this is the equivalent of 'arr1.concat(arr2)',
    * but doesn't require us to reassign the original array variable,
    * which is sometimes convenient.  Returns the first array.
    */
    function _pushArrayData(arr1, arr2) {
        var len2 = arr2.length;
        if (len2 > 0) {
            for (var i = 0; i < len2; i++) {
                arr1.push(arr2[i]);
            }
        }

        return arr1;
    }

    function _getBlobAt(byteBuffer, index, size) {
        var bytes = byteBuffer.getBytesAt(index, size);
        return Kaazing.Gateway.BlobUtils.fromNumberArray(bytes);
//        return byteBuffer;
    }

    var GET_REQUEST_PDU = 0xA0;
    var GETNEXT_REQUEST_PDU = 0xA1;
    var GET_RESPONSE_PDU = 0xA2;
    var SET_REQUEST_PDU = 0xA3;
    var TRAP_PDU = 0xA4; // obsolete in snmp v2
    var GETBULK_REQUEST_PDU = 0xA5;
    var INFORM_REQUEST_PDU = 0xA6;
    var TRAP_V2_PDU = 0xA7;
    var KZ_NOTIF_SUB_PDU = 0xAA; // Kaazing notification subscription pdu
    var KZ_GET_SUBTREE_REQUEST_PDU = 0xAB; // Kaazing 'get subtree' pdu

    var TYPE_INTEGER = 0x02;
    var TYPE_OCTET_STRING = 0x04;
    var TYPE_NULL = 0x05;
    var TYPE_OID = 0x06; // Object Identifier
    var TYPE_SEQUENCE = 0x30;
    var TYPE_IP_ADDRESS = 0x40;
    var TYPE_COUNTER = 0x41; // counter32 in snmp v2
    var TYPE_GAUGE = 0x42;
    var TYPE_TIMETICKS = 0x43;
    var TYPE_OPAQUE = 0x44;
    var TYPE_NSAP_ADDRESS = 0x45;
    var TYPE_COUNTER64 = 0x46;
    var TYPE_UINTEGER32 = 0x47;

    // The following 3 type values are for what SNMP4J calls 'error'
    // conditions, though it's possible we could just consider them
    // as reasonable results when we don't find anything.  In the
    // SNMP4J Java code they're considered sub-cases of a 'Null' object.
    var TYPE_NULL_NO_SUCH_OBJECT = 0x80;
    var TYPE_NULL_NO_SUCH_INSTANCE = 0x81;
    var TYPE_NULL_END_OF_MIB_VIEW = 0x82;

    var _reqId = 1;  // this will be used globally by all SNMP instances in the client
    var _decodeMap = new Object();
})();
