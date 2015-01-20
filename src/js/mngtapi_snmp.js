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
 * The SNMP-specific implementation of MngtAPI.
 * 
 * The API supports connection only to a single gateway instance.
 */
function MngtAPI_SNMP() {
    this._snmp = new SNMP();
}

(function() {
    var $proto = MngtAPI_SNMP.prototype;

    var GATEWAY_ID = 1; // always, even though we don't actually need it, since each
                        // gateway has its own SNMP repository and connection.

    //====================================================================================
    // The sub-elements contained in a GatewayConfigModel. All the following is static data.
    // Each block has its own sub-object in the model.
    //====================================================================================
    $proto.CONNECTION_SOFT_LIMIT = 0;
    $proto.CONNECTION_HARD_LIMIT = 1;

    // The map of version info OIDs to field names
    $proto.VERSION_INFO_FIELD_MAP = {};
    $proto.VERSION_INFO_FIELD_MAP[MngtOIDs.GATEWAY_VERSION_INFO_PRODUCT_TITLE_OID] = 'productTitle';
    $proto.VERSION_INFO_FIELD_MAP[MngtOIDs.GATEWAY_VERSION_INFO_PRODUCT_BUILD_OID] = 'productBuild';
    $proto.VERSION_INFO_FIELD_MAP[MngtOIDs.GATEWAY_VERSION_INFO_PRODUCT_EDITION_OID] = 'productEdition';

    // The map of cluster config OIDs to field names (the object is a ClusterConfigModel.)
    $proto.CLUSTER_CFG_FIELD_MAP = {};
    $proto.CLUSTER_CFG_FIELD_MAP[MngtOIDs.CLUSTER_CFG_NAME_OID] = "name";
    $proto.CLUSTER_CFG_FIELD_MAP[MngtOIDs.CLUSTER_CFG_ACCEPTS_OID] = "accepts";
    $proto.CLUSTER_CFG_FIELD_MAP[MngtOIDs.CLUSTER_CFG_CONNECTS_OID] = "connects";
    $proto.CLUSTER_CFG_FIELD_MAP[MngtOIDs.CLUSTER_CFG_CONNECT_OPTIONS_OID] = "connectOptions";

    // The map of network config OIDs to field names (the object is a NetworkConfigModel.)
    $proto.NETWORK_CFG_FIELD_MAP = {};
    $proto.NETWORK_CFG_FIELD_MAP[MngtOIDs.NETWORK_CFG_ADDRESS_MAPPINGS_OID] = "addressMappings";

    // The map of security config OIDs to field names (the object is a SecurityConfigModel.)
    $proto.SECURITY_CFG_FIELD_MAP = {};
    $proto.SECURITY_CFG_FIELD_MAP[MngtOIDs.SECURITY_CFG_KEYSTORE_TYPE_OID] = "keystoreType";
    $proto.SECURITY_CFG_FIELD_MAP[MngtOIDs.SECURITY_CFG_KEYSTORE_CERT_INFO_OID] = "keystoreCertificateInfo";
    $proto.SECURITY_CFG_FIELD_MAP[MngtOIDs.SECURITY_CFG_TRUSTSTORE_TYPE_OID] = "truststoreType";
    $proto.SECURITY_CFG_FIELD_MAP[MngtOIDs.SECURITY_CFG_TRUSTSTORE_CERT_INFO_OID] = "truststoreCertificateInfo";

    // The map of realm config OIDs to field names (each object is a RealmConfigModel.)
    $proto.REALM_CFG_FIELD_MAP = {};
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_NAME_OID] = "name";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_DESCRIPTION_OID] = "description";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_USER_PRINCIPAL_CLASSES_OID] = "userPrincipalClasses";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_HTTP_CHALLENGE_SCHEME_OID] = "httpChallengeScheme";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_HTTP_HEADERS_OID] = "httpHeaders";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_HTTP_QUERY_PARAMS_OID] = "httpQueryParams";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_HTTP_COOKIE_NAMES_OID] = "httpCookieNames";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_AUTHORIZATION_MODE_OID] = "authorizationMode";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_SESSION_TIMEOUT_OID] = "sessionTimeout";
    $proto.REALM_CFG_FIELD_MAP[MngtOIDs.REALM_CFG_LOGIN_MODULES_OID] = "loginModules";

    // The map of service config OIDs to field names (each object is a ServiceConfigModel.)
    $proto.SERVICE_CFG_FIELD_MAP = {};
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_TYPE_OID] = "type";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_NAME_OID] = "name";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_DESCRIPTION_OID] = "description";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_ACCEPTS_OID] = "accepts";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_ACCEPT_OPTIONS_OID] = "acceptOptions";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_BALANCES_OID] = "balances";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_CONNECTS_OID] = "connects";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_CONNECT_OPTIONS_OID] = "connectOptions";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_CROSS_SITE_CONSTRAINTS_OID] = "crossSiteConstraints";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_PROPERTIES_OID] = "properties";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_REQUIRED_ROLES_OID] = "requiredRoles";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_REALM_OID] = "realm";
    $proto.SERVICE_CFG_FIELD_MAP[MngtOIDs.SERVICE_CFG_MIME_MAPPINGS_OID] = "mimeMappings";

    // The map of service defaults OIDs to field names.
    $proto.SERVICE_DFLTS_CFG_FIELD_MAP = {};
    $proto.SERVICE_DFLTS_CFG_FIELD_MAP[MngtOIDs.SERVICE_DFLTS_CFG_ACCEPT_OPTIONS_OID] = "acceptOptions";
    $proto.SERVICE_DFLTS_CFG_FIELD_MAP[MngtOIDs.SERVICE_DFLTS_CFG_MIME_MAPPINGS_OID] = "mimeMappings";

    /**
     * Store a given OID value into the gateway config or one of its sub-objects.
     * Since the gateway config information has "sub-areas" and has both static 
     * columns (end with .0) and rows (the realms), we'll have to do any parsing
     * here.
     */
    $proto.setGatewayConfigAttribute = function(gatewayConfigObj, oid, val) {
        // we set readTime separately
        if (oid === "readTime") {
            gatewayConfigObj.readTime = val;
            return;
        }

        // go through all the 'sub-areas' to see which applies
        var attrName = this.VERSION_INFO_FIELD_MAP[oid]; 
        if (attrName !== undefined) {
            if (attrName !== "") {
                var versionInfo = gatewayConfigObj.versionInfo;
                if (!versionInfo) {
                    versionInfo = {};
                    gatewayConfigObj.versionInfo = versionInfo;
                }

                versionInfo[attrName] = val;
            }
            return;
        }

        var attrName = this.CLUSTER_CFG_FIELD_MAP[oid]; 
        if (attrName !== undefined) {
            if (attrName !== "") {
                var clusterConfig = gatewayConfigObj.clusterConfig;
                if (!clusterConfig) {
                    clusterConfig = {};
                    gatewayConfigObj.clusterConfig = clusterConfig;
                }

                clusterConfig[attrName] = val;
            }
            return;
        }

        attrName = this.NETWORK_CFG_FIELD_MAP[oid]; 
        if (attrName !== undefined) {
            if (attrName !== "") {
                var networkConfig = gatewayConfigObj.networkConfig;
                if (!networkConfig) {
                    networkConfig = {};
                    gatewayConfigObj.networkConfig = networkConfig;
                }

                networkConfig[attrName] = val;
            }
            return;
        }

        attrName = this.SECURITY_CFG_FIELD_MAP[oid]; 
        if (attrName !== undefined) {
            if (attrName !== "") {
                var securityConfig = gatewayConfigObj.securityConfig;
                if (!securityConfig) {
                    securityConfig = {};
                    gatewayConfigObj.securityConfig = securityConfig;
                }

                securityConfig[attrName] = val;
            }
            return;
        }

        // The realm OIDs in the field map are just the first part of the OID,
        // since they are in a table. We need to see if the OID we're given
        // is an extension of any of them.
        if (oid.startsWith(MngtOIDs.REALM_CFG_ENTRY_OID + ".")) {
            for (var attrOID in this.REALM_CFG_FIELD_MAP) {
                if (oid.startsWith(attrOID + ".")) {
                    // found what we think is our match.
                    attrName = this.REALM_CFG_FIELD_MAP[attrOID]; 
                    
                    if (attrName !== undefined && attrName !== "") {
                        var lastDotPos = oid.lastIndexOf(".");
                        var rowIndex = parseInt(oid.substring(lastDotPos + 1), 10);

                        // If we don't have a security config object yet, we need one now.
                        var securityConfig = gatewayConfigObj.securityConfig;
                        if (!securityConfig) {
                            securityConfig = {};
                            gatewayConfigObj.securityConfig = securityConfig;
                        }

                        // there are possibly multiple realm config objects in the gateway.
                        var realmConfigs = securityConfig.realmConfigs;
                        if (!realmConfigs) {
                            realmConfigs = [];
                            securityConfig.realmConfigs = realmConfigs;
                        }

                        var realmConfig = realmConfigs[rowIndex - 1];  // so row #1 is in pos 0
                        if (!realmConfig) {
                            realmConfig = {};
                            realmConfigs[rowIndex - 1] = realmConfig;
                        }

                        realmConfig[attrName] = val;

                        return;
                    }
                }
            }

            // weird error - unknown column name
            alert("Gateway realm config unknown attribute OID '" + oid + "'");
            return;
        }

        // The service config OIDs in the field map are just the first part of the OID,
        // since they are in a table. We need to see if the OID we're given
        // is an extension of any of them.
        if (oid.startsWith(MngtOIDs.SERVICE_CFG_ENTRY_OID + ".")) {
            for (var attrOID in this.SERVICE_CFG_FIELD_MAP) {
                if (oid.startsWith(attrOID + ".")) {
                    // found what we think is our match.
                    attrName = this.SERVICE_CFG_FIELD_MAP[attrOID]; 
                    
                    if (attrName !== undefined && attrName !== "") {
                        var lastDotPos = oid.lastIndexOf(".");
                        var rowIndex = parseInt(oid.substring(lastDotPos + 1), 10);

                        // If we don't have a service configs array yet, we need one now.
                        var serviceConfigs = gatewayConfigObj.serviceConfigs;
                        if (!serviceConfigs) {
                            serviceConfigs = [];
                            gatewayConfigObj.serviceConfigs = serviceConfigs;
                        }

                        var serviceConfig = serviceConfigs[rowIndex - 1];  // so row #1 is in pos 0
                        if (!serviceConfig) {
                            serviceConfig = {};
                            serviceConfig.serviceId = rowIndex;
                            serviceConfigs[rowIndex - 1] = serviceConfig;
                        }

                        serviceConfig[attrName] = val;

                        return;
                    }
                }
            }

            // weird error - unknown column name
            alert("Gateway service config unknown attribute OID '" + oid + "'");
            return;
        }

        attrName = this.SERVICE_DFLTS_CFG_FIELD_MAP[oid]; 
        if (attrName !== undefined) {
            if (attrName !== "") {
                var serviceDefaultsConfig = gatewayConfigObj.serviceDefaultsConfig;
                if (!serviceDefaultsConfig) {
                    serviceDefaultsConfig = {};
                    gatewayConfigObj.serviceDefaultsConfig = serviceDefaultsConfig;
                }

                serviceDefaultsConfig[attrName] = val;
            }
            return;
        }

        // weird error - unknown column name
        alert("Gateway Config completely unknown attribute OID '" + oid + "'");
    };

    //====================================================================================
    // The 'live' data for various gateway-related objects.
    //====================================================================================

    // The map of gateway table OIDs to field names
    $proto.GATEWAY_FIELD_MAP = {};
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_INDEX_OID] = "gatewayId";
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_ID_OID] = "hostAndPID"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_TOTAL_CURRENT_SESSIONS_OID] = "totalCurrentSessions";
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_TOTAL_BYTES_RECEIVED_OID] = "totalBytesReceived";
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_TOTAL_BYTES_SENT_OID] = "totalBytesSent";
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_UPTIME_OID] = "upTime"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_START_TIME_OID] = "startTime"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_INSTANCE_KEY_OID] = "instanceKey"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_SUMMARY_DATA_OID] = "summaryData"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_CLUSTER_MEMBERS_OID] = "clusterMembers"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_BALANCER_MAP_OID] = "balancerMap"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_MNGT_SERVICE_MAP_OID] = "mngtServiceMap"; 
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_MNGT_LATEST_UPDATE_VERSION_OID] = "latestAvailableUpdateVersion";
    $proto.GATEWAY_FIELD_MAP[MngtOIDs.GATEWAY_MNGT_FORCE_UPDATE_CHECK_OID] = "forceUpdateVersionCheck";
    $proto.GATEWAY_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the Gateway object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setGatewayAttribute = function(gatewayObj, columnOID, val) {
        var attrName = this.GATEWAY_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("gateway unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            gatewayObj[attrName] = val;
        }
    };

    //-------------------------------------------------
    // Service-related field constants
    //-------------------------------------------------
    $proto.SERVICE_OIDS = 
        [
            MngtOIDs.SERVICE_INDEX_OID,  // Service.serviceId will be this one.
            MngtOIDs.SERVICE_STATE_OID,
            MngtOIDs.SERVICE_SERVICE_CONNECTED_OID,
            MngtOIDs.SERVICE_TOTAL_BYTES_RCVD_CT_OID,
            MngtOIDs.SERVICE_TOTAL_BYTES_SENT_CT_OID,
            MngtOIDs.SERVICE_CURR_SESSION_CT_OID,
            MngtOIDs.SERVICE_CURR_NATIVE_SESSION_CT_OID,
            MngtOIDs.SERVICE_CURR_EMULATED_SESSION_CT_OID,
            MngtOIDs.SERVICE_TOTAL_SESSION_CT_OID,
            MngtOIDs.SERVICE_TOTAL_NATIVE_SESSION_CT_OID,
            MngtOIDs.SERVICE_TOTAL_EMULATED_SESSION_CT_OID,
            MngtOIDs.SERVICE_TOTAL_EXCEPTION_CT_OID,
            MngtOIDs.SERVICE_LATEST_EXCEPTION_OID,
            MngtOIDs.SERVICE_LATEST_EXCEPTION_TIME_OID,
            MngtOIDs.SERVICE_LAST_SUCCESS_CONNECT_TS_OID,
            MngtOIDs.SERVICE_LAST_FAILED_CONNECT_TS_OID,
            MngtOIDs.SERVICE_LAST_HB_PING_RESULT_OID,
            MngtOIDs.SERVICE_LAST_HB_PING_TS_OID,
            MngtOIDs.SERVICE_HB_PING_CT_OID,
            MngtOIDs.SERVICE_HB_PING_SUCCESS_CT_OID,
            MngtOIDs.SERVICE_HB_PING_FAILURE_CT_OID,
            MngtOIDs.SERVICE_HB_RUNNING_OID,
            MngtOIDs.SERVICE_ENABLE_NOTIFS_OID,
            MngtOIDs.SERVICE_LOGGED_IN_SESSIONS_OID,
            MngtOIDs.SERVICE_SUMMARY_DATA_OID
        ];

    // Map the MngtOID to the field name of the Service object
    $proto.SERVICE_FIELD_MAP = {};
    $proto.SERVICE_FIELD_MAP[MngtOIDs.GATEWAY_INDEX_OID] = "gatewayId";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_INDEX_OID] = "serviceId";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_STATE_OID] = "state";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_SERVICE_CONNECTED_OID] = "serviceConnected";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_TOTAL_BYTES_RCVD_CT_OID] = "totalBytesReceived";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_TOTAL_BYTES_SENT_CT_OID] = "totalBytesSent";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_CURR_SESSION_CT_OID] = "totalCurrentSessions";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_CURR_NATIVE_SESSION_CT_OID] = "totalCurrentNativeSessions";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_CURR_EMULATED_SESSION_CT_OID] = "totalCurrentEmulatedSessions";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_TOTAL_SESSION_CT_OID] = "totalCumulativeSessions";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_TOTAL_NATIVE_SESSION_CT_OID] = "totalCumulativeNativeSessions";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_TOTAL_EMULATED_SESSION_CT_OID] = "totalCumulativeEmulatedSessions";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_TOTAL_EXCEPTION_CT_OID] = "totalExceptionCount";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LATEST_EXCEPTION_OID] = "latestException";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LATEST_EXCEPTION_TIME_OID] = "latestExceptionTime";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LAST_SUCCESS_CONNECT_TS_OID] = "lastSuccessfulConnectTime";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LAST_FAILED_CONNECT_TS_OID] = "lastFailedConnectTime";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LAST_HB_PING_RESULT_OID] = "lastHeartbeatPingResult";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LAST_HB_PING_TS_OID] = "lastHeartbeatPingTimestamp";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_HB_PING_CT_OID] = "heartbeatPingCount";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_HB_PING_SUCCESS_CT_OID] = "heartbeatPingSuccesses";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_HB_PING_FAILURE_CT_OID] = "heartbeatPingFailures";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_HB_RUNNING_OID] = "heartbeatRunning";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_ENABLE_NOTIFS_OID] = "enableNotifications";
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_LOGGED_IN_SESSIONS_OID] = "loggedInSessions";  // Not in summary
    $proto.SERVICE_FIELD_MAP[MngtOIDs.SERVICE_SUMMARY_DATA_OID] = "summaryData";

    $proto.SERVICE_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the Service object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setServiceAttribute = function(serviceObj, columnOID, val) {
        var attrName = this.SERVICE_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("service unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            serviceObj[attrName] = val;
        }
    };

    //-------------------------------------------------
    // Session-related field constants
    //-------------------------------------------------
    $proto.SESSION_OIDS = 
        [
            MngtOIDs.SESSION_INDEX_OID,
            MngtOIDs.SESSION_ID_OID,
            MngtOIDs.SESSION_READ_BYTES_CT_OID,
            MngtOIDs.SESSION_READ_BYTES_THPT_OID,
            MngtOIDs.SESSION_WRITTEN_BYTES_CT_OID,
            MngtOIDs.SESSION_WRITTEN_BYTES_THPT_OID,
            MngtOIDs.SESSION_SESSION_OPEN_OID,
            MngtOIDs.SESSION_ENABLE_NOTIFS_OID,
            MngtOIDs.SESSION_START_TIME_OID,
            MngtOIDs.SESSION_REMOTE_ADDRESS_OID,
            MngtOIDs.SESSION_PRINCIPALS_OID,
            MngtOIDs.SESSION_SESSION_TYPE_NAME_OID,
            MngtOIDs.SESSION_SESSION_DIRECTION_OID
            // XXX Do we include summary data here? 
        ];

    // Map the MngtOID to the field name of the Session object
    $proto.SESSION_FIELD_MAP = {};

    $proto.SESSION_FIELD_MAP[MngtOIDs.GATEWAY_INDEX_OID] = "gatewayId";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SERVICE_INDEX_OID] = "serviceId";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_INDEX_OID] = "sessionId";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_ID_OID] = "";  // we're ignoring this one for now.
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_READ_BYTES_CT_OID] = "readBytes";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_READ_BYTES_THPT_OID] = "readBytesThroughput";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_WRITTEN_BYTES_CT_OID] = "writtenBytes";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_WRITTEN_BYTES_THPT_OID] = "writtenBytesThroughput";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_SESSION_OPEN_OID] = "sessionOpen";  // init 1, set to 0 and write to close session
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_ENABLE_NOTIFS_OID] = "enableNotifications"; // set to 1 to enable rcvd/sent notifs
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_START_TIME_OID] = "startTime";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_REMOTE_ADDRESS_OID] = "remoteAddress";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_PRINCIPALS_OID] = "principals";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_SESSION_TYPE_NAME_OID] = "sessionTypeName";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_SESSION_DIRECTION_OID] = "sessionDirection";
    $proto.SESSION_FIELD_MAP[MngtOIDs.SESSION_SUMMARY_DATA_OID] = "summaryData"; 
    $proto.SESSION_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the Session object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setSessionAttribute = function(sessionObj, columnOID, val) {
        var attrName = this.SESSION_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("session unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            sessionObj[attrName] = val;
        }
    };

    //-------------------------------------------------
    // System-related field constants
    //-------------------------------------------------
    $proto.SYSTEM_OIDS = 
        [
            MngtOIDs.SYSTEM_OS_NAME_OID,
            MngtOIDs.SYSTEM_SUMMARY_DATA_OID
        ];

    // Map the MngtOID to the field name of the System object
    $proto.SYSTEM_FIELD_MAP = {};

    $proto.SYSTEM_FIELD_MAP[MngtOIDs.SYSTEM_OS_NAME_OID] = "osName";
    $proto.SYSTEM_FIELD_MAP[MngtOIDs.SYSTEM_SUMMARY_DATA_OID] = "summaryData"; 

    $proto.SYSTEM_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the System object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setSystemAttribute = function(systemObj, columnOID, val) {
        var attrName = this.SYSTEM_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("System unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            systemObj[attrName] = val;
        }
    };

    //-------------------------------------------------
    // CPUList-related field constants
    //-------------------------------------------------
    $proto.CPU_LIST_OIDS = 
        [
            MngtOIDs.CPU_LIST_NUM_CPUS_OID,
            MngtOIDs.CPU_LIST_SUMMARY_DATA_OID
        ];

    // Map the MngtOID to the field name of the CPU (cpus/cores data) object
    $proto.CPU_LIST_FIELD_MAP = {};

    $proto.CPU_LIST_FIELD_MAP[MngtOIDs.CPU_LIST_NUM_CPUS_OID] = "numCpus";
    $proto.CPU_LIST_FIELD_MAP[MngtOIDs.CPU_LIST_SUMMARY_DATA_OID] = "summaryData"; 

    $proto.CPU_LIST_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the CPU object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setCpuListAttribute = function(cpuListObj, columnOID, val) {
        var attrName = this.CPU_LIST_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("CPUList unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            cpuListObj[attrName] = val;
        }
    };

    //-------------------------------------------------
    // NICList-related field constants
    //-------------------------------------------------
    $proto.NIC_LIST_OIDS = 
        [
            MngtOIDs.NIC_LIST_NET_INTERFACE_NAMES_OID,
            MngtOIDs.NIC_LIST_SUMMARY_DATA_OID
        ];

    // Map the MngtOID to the field name of the System object
    $proto.NIC_LIST_FIELD_MAP = {};

    $proto.NIC_LIST_FIELD_MAP[MngtOIDs.NIC_LIST_NET_INTERFACE_NAMES_OID] = "netInterfaceNames";
    $proto.NIC_LIST_FIELD_MAP[MngtOIDs.NIC_LIST_SUMMARY_DATA_OID] = "summaryData"; 

    $proto.NIC_LIST_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the NIC object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setNicListAttribute = function(nicListObj, columnOID, val) {
        var attrName = this.NIC_LIST_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("NICList unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            nicListObj[attrName] = val;
        }
    };

    //-------------------------------------------------
    // JVM-related field constants
    //-------------------------------------------------
    $proto.JVM_OIDS = 
        [
            MngtOIDs.JVM_SUMMARY_DATA_OID
        ];

    // Map the MngtOID to the field name of the JVM object
    $proto.JVM_FIELD_MAP = {};

    $proto.JVM_FIELD_MAP[MngtOIDs.JVM_SUMMARY_DATA_OID] = "summaryData"; 

    $proto.JVM_FIELD_MAP["readTime"] = "readTime";

    /**
     * Given a column OID and value, store the value in the JVM object field.
     * Note that this is NOT to be a prototype function--it's totally for internal use.
     * XXX Later we might want to eliminate the check for an undefined name.
     */
    $proto.setJVMAttribute = function(jvmObj, columnOID, val) {
        var attrName = this.JVM_FIELD_MAP[columnOID]; 

        if (attrName === undefined) {
            alert("JVM unknown attribute OID '" + columnOID + "'");
        } else if (attrName !== "") {
            jvmObj[attrName] = val;
        }
    };

    //=====================================================================================
    // The Management API
    //=====================================================================================

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
    $proto.setChallengeHandler = function(challengeHandler) {
        this._snmp.setChallengeHandler(challengeHandler);
    };

    /**
     * Return the currently-set challengeHandler.
     */
    $proto.getChallengeHandler = function() {
        return this._snmp.getChallengeHandler();
    };

    /**
     * Connects through SNMP to the gateway server.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name connect
     * @memberOf SNMP
     */
    $proto.connect = function(location) {
        this._snmp.connect(location);
    };

    /**
     * Return true/false indicating whether the socket is in state WebSocket.OPEN.
     */
    $proto.isOpen = function() {
        return this._snmp.isOpen();
    };

    /**
     * Disconnects from the gateway.
     *
     * @return {void}
     *
     * @public
     * @function
     * @name disconnect
     * @memberOf SNMP
     */
    $proto.disconnect = function() {
        this._snmp.disconnect();
    };

    $proto.setOpenListener = function(listener, callbackData) {
        this._snmp.setOpenListener(listener, callbackData);
    };

    $proto.setExceptionListener = function(listener, callbackData) {
        this._snmp.setExceptionListener(listener, callbackData);
    };

    $proto.setCloseListener = function(listener, callbackData) {
        this._snmp.setCloseListener(listener, callbackData);
    };

    /**
     * Return the cluster state data, from this gateway's point of view,
     * along with some gateway identification information.
     * 
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getClusterState = function(callback) {
        var $this = this;

        // append the 'gateway ID' (1) to the OIDs, since SNMP expects it, even though
        // there is only 1 gateway per connection.
        var oidList = [MngtOIDs.GATEWAY_ID_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_UPTIME_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_START_TIME_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_INSTANCE_KEY_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_CLUSTER_MEMBERS_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_BALANCER_MAP_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_MNGT_SERVICE_MAP_OID + '.' + GATEWAY_ID,
                       MngtOIDs.CLUSTER_CFG_NAME_OID
                       ];

        var fn = function() {
            $this._snmp.makeGetRequest(
                function(clusterStateData) {
                    $this.getClusterState2(clusterStateData, callback);
                },
                encodeOIDList(oidList));
        };

        var t = invokeLater(fn,0);
        return t;
    };

    /**
     * Return the gateway's cluster state data..
     */
    $proto.getClusterState2 = function(clusterStateData, callback) {

        var $this = this;

        if ((clusterStateData !== null) && (clusterStateData.values !== undefined)) {
            // Except for the cluster name, this is really gateway data 
            // according to the MIB, so we'll use gateway attributes
            var clusterState = {};
            this.setGatewayAttribute(clusterState, "readTime", (new Date()).getTime());

            var values = clusterStateData.values;
            for (var oid in values) {
                if (oid !== undefined) {
                    if (oid == MngtOIDs.CLUSTER_CFG_NAME_OID) {
                        clusterState.clusterName = values[oid];
                    } else {
                        var tmpOid = oid;
                        var lastDotPos = tmpOid.lastIndexOf("."); 
                        tmpOid = tmpOid.substring(0, lastDotPos);
                        this.setGatewayAttribute(clusterState, tmpOid, values[oid]);
                    }
                }
            }

            this.parseJSONField(clusterState, 'mngtServiceMap', false);  // note we're NOT exploding the params
            this.parseJSONField(clusterState, 'clusterMembers', false);  // note we're NOT exploding the params
            this.parseJSONField(clusterState, 'balancerMap', false);     // note we're NOT exploding the params
            // The following hack is only until bug #KG-8547 is fixed
            this.fixBalancerMap(clusterState);
            
            this.setGatewayAttribute(clusterState, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID);

            callback(clusterState);
        }
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
        var $this = this;

        // Because there is only one gateway's worth of data in a given gateway's 
        // SNMP agent, we can just ask for everything under the GATEWAY_CFG_OID.
        var fn = function() {
            $this._snmp.makeGetSubtreeRequest(
                function(gatewayConfigData) {
                    $this.getGatewayConfiguration2(gatewayConfigData, callback);
                },
                [encodeOID(MngtOIDs.GATEWAY_CFG_OID)]);
        }

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getGatewayConfiguration2 = function(gatewayConfigData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        var gatewayConfig = {};

        var values = gatewayConfigData.values;
        for (var oid in values) {
            var val = values[oid];
            $this.setGatewayConfigAttribute(gatewayConfig, oid, val);
        }

        $this.setGatewayConfigAttribute(gatewayConfig, "readTime", readTime);

        // If we have a singleton gateway instead of a cluster, the cluster config
        // data is set, but is all nulls.  If that's the case, rather than 
        // forcing the callers to check it, we'll just remove it.
        var clusterConfig = gatewayConfig.clusterConfig;
        if (!clusterConfig.accepts &&
            !clusterConfig.connects) {
            delete gatewayConfig.clusterConfig;
        }

        var licensesConfig = gatewayConfig.licensesConfig;
        if (licensesConfig) {
            var allowedServices = licensesConfig.allowedServices;
            if (allowedServices) {
                allowedServices = allowedServices.split(',');
                // there may be spaces around the individual items, so trim each
                allowedServices.forEach(function(val, index, arr) {
                    arr[index] = val.trim();
                });

                allowedServices.sort();
                licensesConfig.allowedServices = allowedServices;
            }
        }

        // Similarly for network config
        var networkConfig = gatewayConfig.networkConfig;
        if (!networkConfig.addressMappings) {
            delete gatewayConfig.networkConfig;
        } else {
            networkConfig.addressMappings = parseJSON(networkConfig.addressMappings);
        }

        // If we have security config data, the keystore and truststore are
        // coming over as JSON. Parse that so we don't need to later (which
        // causes YUI events and holds some memory.
        var securityConfig = gatewayConfig.securityConfig;
        if (securityConfig) {
            securityConfig.keystoreCertificateInfo = parseJSON(securityConfig.keystoreCertificateInfo);

            securityConfig.truststoreCertificateInfo = parseJSON(securityConfig.truststoreCertificateInfo);
            // it happens that many of the certs in the truststore have the same value 
            // for issuer and subject. Apparently JS isn't smart about interning strings in
            // this sort of case, so we're going to do it to release the space being kept
            // by the second copy.
            var truststoreCertificateInfo = securityConfig.truststoreCertificateInfo;
            if (truststoreCertificateInfo) {
                for (var i = 0; i < truststoreCertificateInfo.length; i++) {
                    var cert = truststoreCertificateInfo[i];
                    if (cert.issuer === cert.subject) {
                        cert.issuer = cert.subject;
                    }
                }
            }

            if (securityConfig.realmConfigs) {
                for (var i = 0; i < securityConfig.realmConfigs.length; i++) {
                    var realmConfig = securityConfig.realmConfigs[i];
                    realmConfig.userPrincipalClasses = parseJSON(realmConfig.userPrincipalClasses);
                    realmConfig.httpCookieNames = parseJSON(realmConfig.httpCookieNames);
                    realmConfig.httpHeaders = parseJSON(realmConfig.httpHeaders);
                    realmConfig.httpQueryParams = parseJSON(realmConfig.httpQueryParams);
                    realmConfig.loginModules = parseJSON(realmConfig.loginModules);
                }
            }
        }

        var serviceConfigs = gatewayConfig.serviceConfigs;
        if (serviceConfigs) {
            for (var i = 0; i < serviceConfigs.length; i++) {
                var serviceConfig = serviceConfigs[i];

                // If accepts are allowed (JMX is one case where they are not), then
                // we need to set accepts to an array (even if empty) and acceptOptions
                // to an object (even if empty). If they are not allowed, both values
                // will come from the server as null, and we maintain that.
                serviceConfig.accepts = parseJSON(serviceConfig.accepts);
                if (serviceConfig.accepts) {
                    serviceConfig.accepts.sort();
                }

                serviceConfig.acceptOptions = parseJSON(serviceConfig.acceptOptions);

                serviceConfig.balances = parseJSON(serviceConfig.balances);

                serviceConfig.connects = parseJSON(serviceConfig.connects);
                if (serviceConfig.connects) {
                    serviceConfig.connects.sort();
                }

                serviceConfig.connectOptions = parseJSON(serviceConfig.connectOptions);

                serviceConfig.crossSiteConstraints = parseJSON(serviceConfig.crossSiteConstraints);

                serviceConfig.properties = parseJSON(serviceConfig.properties);

                serviceConfig.requiredRoles = parseJSON(serviceConfig.requiredRoles);

                serviceConfig.mimeMappings = parseJSON(serviceConfig.mimeMappings);
            }
        }

        var serviceDefaultsConfig = gatewayConfig.serviceDefaultsConfig;
        if (serviceDefaultsConfig) {
            serviceDefaultsConfig.acceptOptions = parseJSON(serviceDefaultsConfig.acceptOptions);
            serviceDefaultsConfig.mimeMappings = parseJSON(serviceDefaultsConfig.mimeMappings);
        }

        callback(gatewayConfig);
    };

    /**
     * Return the Gateway live data for this gateway.
     * 
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getGateway = function(callback, callbackData) {
        var $this = this;

        // append the 'gateway ID' (1) to the OIDs, since SNMP expects it, even though
        // there is only 1 gateway per connection.
        var oidList = [MngtOIDs.GATEWAY_ID_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_UPTIME_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_START_TIME_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_INSTANCE_KEY_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_SUMMARY_DATA_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_CLUSTER_MEMBERS_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_BALANCER_MAP_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_MNGT_SERVICE_MAP_OID + '.' + GATEWAY_ID,
                       MngtOIDs.GATEWAY_MNGT_LATEST_UPDATE_VERSION_OID + '.' + GATEWAY_ID
                       ];

        var fn = function() {
            $this._snmp.makeGetRequest(
                function(gatewayData) {
                    $this.getGateway2(gatewayData, callback, callbackData);
                },
                encodeOIDList(oidList));
        };

        var t = invokeLater(fn,0);
        return t;
    };

    /**
     * Return the gateway's 'live' data.
     */
    $proto.getGateway2 = function(gatewayData, callback, callbackData) {

        var $this = this;

        if ((gatewayData !== null) && (gatewayData.values !== undefined)) {
            var gateway = {};
            this.setGatewayAttribute(gateway, "readTime", (new Date()).getTime());

            var values = gatewayData.values;
            for (var oid in values) {
                if (oid !== undefined) {
                    var tmpOid = oid;
                    var lastDotPos = tmpOid.lastIndexOf("."); 
                    tmpOid = tmpOid.substring(0, lastDotPos);

                    this.setGatewayAttribute(gateway, tmpOid, values[oid]);
                }
            }

            // Parse the summaryData fields. Now that they are just an array of 
            // values, not properties, do not put them into the main object--just
            // replace the original value.
            this.parseJSONField(gateway, 'summaryData', false);
            this.parseJSONField(gateway, 'mngtServiceMap', false);  // note we're NOT exploding the params
            this.parseJSONField(gateway, 'clusterMembers', false);  // note we're NOT exploding the params
            this.parseJSONField(gateway, 'balancerMap', false);     // note we're NOT exploding the params
            // The following hack is only until bug #KG-8547 is fixed
            this.fixBalancerMap(gateway);

            this.setGatewayAttribute(gateway, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID);

            callback(gateway, callbackData);
        }
    };

    $proto.fixBalancerMap = function(obj) {
        var balancerMap = obj.balancerMap;
        if (balancerMap) {
            for (var balancerUri in balancerMap) {
                if (balancerMap.hasOwnProperty(balancerUri)) {
                    var balancees = balancerMap[balancerUri];
                    if (balancees) {
                        balancees.sort();
                        // starting from the element 1 before the last one, check
                        // to see if it and the one after it are the same. If so,
                        // remove the higher one.
                        for (var i = balancees.length - 1; i >= 1; i--) {
                            if (balancees[i] === balancees[i-1]) {
                                balancees.splice(i, 1);
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * Returns an array of Service objects (live data) for the gateway.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds (and each time the call succeeds,
     * if the call is to be repeated.)
     */
    $proto.getServices = function(callback) {
        var $this = this;

        var fn = function() {
            $this._snmp.makeGetSubtreeRequest(
                function(servicesData) {
                    $this.getServices2(servicesData, callback);
                }, 

                // NOTE: we're only requesting the index and summary data
                // because if we requested the entire table, we'd get the regular
                // data fields and the summary as well, which is again the regular
                // fields, but compressed. Add the gateway ID because SNMP expects it.
                // NOTE: For now, we're passing on the list of logged-in sessions.
                // It is not in the summary data, and we really don't want to get it
                // each and every time.
                [encodeOID(MngtOIDs.SERVICE_INDEX_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SERVICE_SUMMARY_DATA_OID + "." + GATEWAY_ID)
                ]);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getServices2 = function(servicesData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        var services = {};

        var values = servicesData.values;

        var i;

        var serviceEntryOID = MngtOIDs.SERVICE_ENTRY_OID;
        var serviceEntryOIDLen = serviceEntryOID.length;
        var serviceIndexOID = MngtOIDs.SERVICE_INDEX_OID;

        // Go through the data, creating Service records whenever we
        // find an OID that doesn't match an already-created record.
        for (var oid in values) {
            var val = values[oid];

            var tmpOid = oid;
            var lastDotPos = tmpOid.lastIndexOf("."); 
            var serviceId = parseInt(tmpOid.substring(lastDotPos + 1), 10);
            tmpOid = tmpOid.substring(0, lastDotPos);
            lastDotPos = tmpOid.lastIndexOf(".");
            var columnOID = tmpOid.substring(0, lastDotPos);

            var service = services[serviceId];

            if (service === undefined) {
                service = {};

                $this.setServiceAttribute(service, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID);
                $this.setServiceAttribute(service, MngtOIDs.SERVICE_INDEX_OID, serviceId);
                $this.setServiceAttribute(service, "readTime", readTime);
                services[serviceId] = service;
            }

            $this.setServiceAttribute(service, columnOID, val);
        }

        var serviceList = [];

        // convert the object into an array.
        for (var s in services) {
            service = services[s];

            $this.parseJSONField(service, 'summaryData', false);  // note we're NOT exploding the params
            
            serviceList.push(service);
        }

        serviceList.sort(function(s1, s2) {
            return s1['serviceId'] - s2['serviceId'];
        });

        callback(serviceList);
    }

    /**
     * Return the Service object for a given service id.
     * 
     * @param callback indicates the callback function that 
     * will be called if the call succeeds.
     */
    $proto.getService = function(serviceId, callback) {
        var $this = this;

        var tmpCallback = function(svcData) {
            if ((svcData !== null) && (svcData.values !== undefined)) {
                var service = {};
                $this.setServiceAttribute(service, "readTime", (new Date()).getTime());
                $this.setServiceAttribute(service, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID);
                
                var values = svcData.values;
                for (var oid in values) {
                    if (oid !== undefined) {
                        var val = values[oid];

                        var columnOID = oid.substring(0, oid.lastIndexOf(".")); 
                        columnOID = columnOid.substring(0, columnOID.lastIndexOf("."));
                        $this.setServiceAttribute(service, columnOID, val);
                    }
                }

                callback(service);
            }
        };

        // Take the service column OIDs and add the gateway ID (fixed) and service ID to them
        var baseOIDs = $this.SERVICE_OIDS;
        var numOIDs = baseOIDs.length;
        var serviceOIDs = [];
        for (var i = 0; i < numOIDs; i++) {
            serviceOIDs.push(baseOIDs[i] + "." + GATEWAY_ID + "." + serviceId);
        }

        var fn = function() {
            $this._snmp.makeGetRequest(tmpCallback, encodeOIDList(serviceOIDs));
        };

        var t = invokeLater(fn,0);
        return t;
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
        var $this = this;

        var fn = function() {
            $this._snmp.makeSetRequest(
                callback,
                encodeOID(MngtOIDs.SERVICE_ENABLE_NOTIFS_OID + "." + GATEWAY_ID + "." + serviceId),
                0x02,  // SNMP's TYPE_INTEGER, which is not exposed
                value);
        };

        var t = invokeLater(fn,0);
        return t;
    };


    /**
     * Returns an array of sessions for all services in the gateway
     * (excluding management sessions, which are not measured.)
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */ 
    $proto.getGatewaySessions = function(callback) {
        var $this = this;

        var fn = function() {
            $this._snmp.makeGetSubtreeRequest(
                function(sessionsData) {
                    $this.getGatewaySessions2(sessionsData, callback);
                },
                [encodeOID(MngtOIDs.SESSION_INDEX_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_ID_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_SESSION_OPEN_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_ENABLE_NOTIFS_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_START_TIME_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_REMOTE_ADDRESS_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_PRINCIPALS_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_SESSION_TYPE_NAME_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_SESSION_DIRECTION_OID + "." + GATEWAY_ID),
                 encodeOID(MngtOIDs.SESSION_SUMMARY_DATA_OID + "." + GATEWAY_ID)
                ]);
        };

        var t = invokeLater(fn,0);
        return t;
    }

    $proto.getGatewaySessions2 = function(sessionsData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        var sessions = {};
        var sessionList = [];

        var values = sessionsData.values;

        // See if there is a value for 4.1.1 + GATEWAY_ID. (the SESSION_INDEX_OID).
        // If the value is null, we have no data.
        var indexVal = values[MngtOIDs.SESSION_INDEX_OID + "." + GATEWAY_ID];

        if (indexVal !== null) {
            var i;

            // Go through the data, creating Session records whenever we
            // find an OID that doesn't match an already-created record.
            // NOTE: if there are no sessions found, the return value will
            // be each OID with a value of null.
            for (var oid in values) {
                var val = values[oid];

                var lastDotPos = oid.lastIndexOf(".");
                var sessionId = parseInt(oid.substring(lastDotPos + 1), 10);
                oid = oid.substring(0, lastDotPos);
                lastDotPos = oid.lastIndexOf(".");
                var serviceId = parseInt(oid.substring(lastDotPos + 1), 10);
                oid = oid.substring(0, lastDotPos);
                lastDotPos = oid.lastIndexOf(".");
                var columnOID = oid.substring(0, lastDotPos);

                var session = sessions[sessionId];

                if (session === undefined) {
                    // This is the first attribute found for the given session, so 
                    // we need to create the session and initialize the index.
                    session = {};

                    $this.setSessionAttribute(session, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID); 
                    $this.setSessionAttribute(session, MngtOIDs.SERVICE_INDEX_OID, serviceId); 
                    $this.setSessionAttribute(session, MngtOIDs.SESSION_INDEX_OID, sessionId);
                    $this.setSessionAttribute(session, "readTime", readTime); 

                    sessions[sessionId] = session;
                }

                $this.setSessionAttribute(session, columnOID, val);
            }

            // convert the object into an array.
            for (var s in sessions) {
                session = sessions[s];
                $this.parseJSONField(session, 'summaryData', false);
                sessionList.push(session);
            }

            sessionList.sort(function(s1, s2) {
                if (s1['serviceId'] !== s2['serviceId']) {
                    return s1['serviceId'] - s2['serviceId'];
                } else {
                    return s1['sessionId'] - s2['sessionId'];
                }
            });
        }

        callback(sessionList);
    };

    /*
     * Returns an array of sessions for a given service in the gateway
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getSessions = function(serviceId, callback) {
        var $this = this;

        var fn = function() {
            $this._snmp.makeGetSubtreeRequest(
                function(sessionsData) {
                    $this.getSessions2(sessionsData, serviceId, callback);
                },
                [encodeOID(MngtOIDs.SESSION_INDEX_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_ID_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_SESSION_OPEN_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_ENABLE_NOTIFS_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_START_TIME_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_REMOTE_ADDRESS_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_PRINCIPALS_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_SESSION_TYPE_NAME_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_SESSION_DIRECTION_OID + "." + GATEWAY_ID + "." + serviceId),
                 encodeOID(MngtOIDs.SESSION_SUMMARY_DATA_OID + "." + GATEWAY_ID + "." + serviceId)
                ]);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getSessions2 = function(sessionsData, serviceId, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        var sessions = {};
        var sessionList = [];

        var values = sessionsData.values;

        // See if there is a value for 4.1.1 + GATEWAY_ID + serviceId. (the SESSION_INDEX_OID).
        // If the value is null, we have no data.
        var indexVal = values[MngtOIDs.SESSION_INDEX_OID + "." + GATEWAY_ID + "." + serviceId];

        if (indexVal !== null) {
            var i;

            // Go through the data, creating Session records whenever we
            // find an OID that doesn't match an already-created record.
            // NOTE: if there are no sessions found, the return value will
            // be each OID with a value of null.
            for (var oid in values) {
                var val = values[oid];

                var lastDotPos = oid.lastIndexOf(".");
                var sessionId = parseInt(oid.substring(lastDotPos + 1), 10);
                oid = oid.substring(0, lastDotPos);
                lastDotPos = oid.lastIndexOf(".");
                oid = oid.substring(0, lastDotPos);
                lastDotPos = oid.lastIndexOf(".");
                var columnOID = oid.substring(0, lastDotPos);

                var session = sessions[sessionId];

                if (session === undefined) {
                    session = {};

                    $this.setSessionAttribute(session, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID); 
                    $this.setSessionAttribute(session, MngtOIDs.SERVICE_INDEX_OID, serviceId); 
                    $this.setSessionAttribute(session, MngtOIDs.SESSION_INDEX_OID, sessionId);
                    $this.setSessionAttribute(session, "readTime", readTime); 

                    sessions[sessionId] = session;
                }

                $this.setSessionAttribute(session, columnOID, val);
            }

            // convert the object into an array.
            for (var s in sessions) {
                session = sessions[s];

                // Because we requested the summary data instead of several other
                // attributes, take apart the return value and put the parameters
                // into the object
                $this.parseJSONField(session, 'summaryData', true);

                sessionList.push(session);
            }

            sessionList.sort(function(s1, s2) {
                return s1['sessionId'] - s2['sessionId'];
            });
        }

        callback(sessionList);
    };

    /**
     * Returns a Session object for a given session in a given service.
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getSession = function(serviceId, sessionId, callback) {
        var $this = this;

        var tmpCallback = function(sessData) {
            if ((sessData !== null) && (sessData.values !== undefined)) {
                var session = {};
                $this.setSessionAttribute(session, MngtOIDs.GATEWAY_INDEX_OID, GATEWAY_ID); 
                $this.setSessionAttribute(session, MngtOIDs.SERVICE_INDEX_OID, serviceId); 
                $this.setSessionAttribute(session, MngtOIDs.SESSION_INDEX_OID, sessionId);
                $this.setSessionAttribute(session, "readTime", (new Date()).getTime());

                var values = sessData.values;
                for (var oid in values) {
                    if (oid !== undefined) {
                        var val = values[oid];

                        var lastDot = oid.lastIndexOf("."); // get rid of sessionId
                        lastDot = oid.lastIndexOf(".", lastDot - 1); // get rid of serviceId
                        lastDot = oid.lastIndexOf(".", lastDot - 1); // get rid of gatewayId

                        var columnOID = oid.substring(0, lastDot);
                        $this.setSessionAttribute(session, columnOID, val);
                    }
                }
                
                callback(session);
            }
        };

        var baseOIDs = $this.SESSION_OIDS;
        var numOIDs = baseOIDs.length;
        var sessionOIDs = [];
        for (var i = 0; i < numOIDs; i++) {
            sessionOIDs.push(baseOIDs[i] + "." + GATEWAY_ID + "." + serviceId + "." + sessionId);
        }

        var fn = function() {
            $this._snmp.makeGetRequest(tmpCallback, encodeOIDList(sessionOIDs));
        }

        var t = invokeLater(fn,0);
        return t;
    };

    /**
     * Close a session in a given service 
     * 
     * @param serviceId the service of interest
     * @param sessionId the session of interest
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.closeSession = function(serviceId, sessionId, callback) {
        var $this = this;

        var fn = function() {
            $this._snmp.makeSetRequest(
                callback,
                encodeOID(MngtOIDs.SESSION_SESSION_OPEN_OID + 
                          "." + GATEWAY_ID + 
                          "." + serviceId + 
                          "." + sessionId),
                0x02,  // SNMP's TYPE_INTEGER, which is not exposed
                0);
        };

        var t = invokeLater(fn,0);
        return t;
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
        var $this = this;

        var oids = [ encodeOID(MngtOIDs.SYSTEM_OS_NAME_OID),
                     encodeOID(MngtOIDs.SYSTEM_SUMMARY_DATA_OID)
                   ];
        var fn = function() {
            $this._snmp.makeGetRequest(function(systemData) {
                                           $this.getSystemStats2(systemData, callback);
                                       },
                                       oids);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getSystemStats2 = function(systemData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        // The incoming systemData is an object that is the parsed buffer,
        // with community="public", errorCode=0, requestId=..., values=Object.
        // The 'values' object is pairs of OIDs and their values. Some may
        // be in JSON.
        if ((systemData !== null) && (systemData.values !== undefined)) {
            var values = systemData.values;

            var systemObj = {};
            systemObj.gatewayId = GATEWAY_ID;

            for (var oid in values) {
                var val = values[oid];
                $this.setSystemAttribute(systemObj, oid, val);
            }

            $this.setSystemAttribute(systemObj, "readTime", readTime);

            // The summaryData is supposed to be a list of entries where
            // each entry has 2 fields: readTime and systemData. For some
            // reason it is possible that the systemData field in some
            // entries is null. These entries should be excluded.
            $this.parseJSONField(systemObj, 'summaryData', false); 

            callback(systemObj);
        }
    };

    /**
     * Return CPU-level statistics (data for each CPU/core on the 
     * server running a gateway).
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getCpuListStats = function(callback) {
        var $this = this;

        var oids = [ encodeOID(MngtOIDs.CPU_LIST_NUM_CPUS_OID),
                     encodeOID(MngtOIDs.CPU_LIST_SUMMARY_DATA_OID)
                   ];
        var fn = function() {
            $this._snmp.makeGetRequest(function(cpuListData) {
                                           $this.getCpuListStats2(cpuListData, callback);
                                       },
                                       oids);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getCpuListStats2 = function(cpuListData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        if ((cpuListData !== null) && (cpuListData.values !== undefined)) {
            var values = cpuListData.values;

            var cpuListObj = {};
            cpuListObj.gatewayId = GATEWAY_ID;

            for (var oid in values) {
                var val = values[oid];
                $this.setCpuListAttribute(cpuListObj, oid, val);
            }

            $this.setCpuListAttribute(cpuListObj, "readTime", readTime);

            $this.parseJSONField(cpuListObj, 'summaryData', false); 

            callback(cpuListObj);
        }
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
        var $this = this;

        var oids = [ encodeOID(MngtOIDs.NIC_LIST_NET_INTERFACE_NAMES_OID),
                     encodeOID(MngtOIDs.NIC_LIST_SUMMARY_DATA_OID)
                   ];
        var fn = function() {
            $this._snmp.makeGetRequest(function(nicListData) {
                                           $this.getNicListStats2(nicListData, callback);
                                       },
                                       oids);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getNicListStats2 = function(nicListData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        if ((nicListData !== null) && (nicListData.values !== undefined)) {
            var values = nicListData.values;

            var nicListObj = {};
            nicListObj.gatewayId = GATEWAY_ID;

            for (var oid in values) {
                var val = values[oid];
                $this.setNicListAttribute(nicListObj, oid, val);
            }

            $this.setNicListAttribute(nicListObj, "readTime", readTime);
            $this.parseJSONField(nicListObj, 'netInterfaceNames', false);
            $this.parseJSONField(nicListObj, 'summaryData', false);

            callback(nicListObj);
        }
    };

    $proto.forceUpdateVersionCheck = function(callback) {
        var $this = this;

        var fn = function() {
            $this._snmp.makeSetRequest(
                callback,
                encodeOID(MngtOIDs.GATEWAY_MNGT_FORCE_UPDATE_CHECK_OID +
                          "." + GATEWAY_ID),
                0x02,  // SNMP's TYPE_INTEGER, which is not exposed
                0);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getUpdateVersion = function(callback) {
         var $this = this;
         var oids = [ encodeOID(MngtOIDs.GATEWAY_MNGT_LATEST_UPDATE_VERSION_OID + "." + GATEWAY_ID)];
         var fn = function() {
             $this._snmp.makeGetRequest(function(updateVersion) {
                  $this.getUpdateVersion2(updateVersion, callback);
             },
             oids);
         };

         var t = invokeLater(fn,0);
         return t;
    };

    $proto.getUpdateVersion2 = function(updateVersion, callback) {
        var $this = this;

        if (updateVersion !== null) {
            var val = updateVersion.values[MngtOIDs.GATEWAY_MNGT_LATEST_UPDATE_VERSION_OID + "." + GATEWAY_ID];
            callback(val);
        }
    };
    /**
     * Start notifications, and whenever we get a notification event,
     * process enough of it to figure out where it is supposed to go
     * and what type it is, then send the notification data there
     * (if possible, without the OIDs, since those are SNMP-specific.)
     */
    $proto.startNotifications = function(callback) {
        var $this = this;
        this._snmp.startNotifListener(function(notificationData) {
            $this.notificationCallback(notificationData, callback);
        });
    };

    /**
     * Parse the notification basics to get the type and 
     * figure out how to route it based on the type and data.
     */
    $proto.notificationCallback = function(notificationData, callback) {
        // XXX We may want to check the errorCode field, but for now we'll leave it alone
        
        var values = notificationData.values;
        var notificationTypeOid = values[MngtOIDs.NOTIFICATION_TYPE_OID];

        var notificationObj = {};

        notificationObj.readTime = (new Date()).getTime();

        if (notificationTypeOid === MngtOIDs.GATEWAY_MEMBERSHIP_NOTIF_OID) {
            this.processMembershipNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.GATEWAY_MNGT_SVC_NOTIF_OID) {
            this.processManagementServiceNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.GATEWAY_BALANCER_MAP_NOTIF_OID) {
            this.processBalancerMapNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.GATEWAY_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.SERVICE_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.SESSION_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.SYSTEM_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.CPU_LIST_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.NIC_LIST_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.JVM_SUMMARY_DATA_NOTIF_OID) {
            this.processSummaryNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.SERVICE_SESSION_OPEN_NOTIF_OID) {
            this.processSessionOpenNotification(notificationTypeOid, values, notificationObj);
        } else if (notificationTypeOid === MngtOIDs.SERVICE_SESSION_CLOSE_NOTIF_OID) {
            this.processSessionCloseNotification(notificationTypeOid, values, notificationObj);
        } else {
            CC.console.error("### Ignoring notification event:" + 
                                  "\n   Unknown notification type OID [" + notificationTypeOid + "]" + 
                                  "\n   Notification data = [" + 
                                  notificationData.toString() + "]");
            return;
        }

        callback(notificationObj);
    };
    
    /**
     * The notification for changes to the set of cluster members (i.e. join/leave)
     */
    $proto.processMembershipNotification = function(notificationTypeOid, values, notificationObj) {
        notificationObj.type = CC.Constants.NotificationType.MEMBERSHIP_CHANGE;
        notificationObj.eventType = values[MngtOIDs.GATEWAY_MEMBERSHIP_EVENT_TYPE_OID];

        var oid = this.findFullKey(values, MngtOIDs.GATEWAY_INSTANCE_KEY_OID);
        notificationObj.instanceKey = values[oid];
    };

    /**
     * The notification for changes to the list of management service URIs for a given instance.
     * If an 'add', we can attempt to contact it.
     */
    $proto.processManagementServiceNotification = function(notificationTypeOid, values, notificationObj) {
        notificationObj.type = CC.Constants.NotificationType.MANAGEMENT_SERVICE_CHANGE;
        notificationObj.eventType = values[MngtOIDs.GATEWAY_MNGT_SVC_EVENT_TYPE_OID];
        notificationObj.accepts = values[MngtOIDs.GATEWAY_MNGT_SVC_EVENT_ACCEPT_URIS_OID]; 
        if (notificationObj.accepts) {
            notificationObj.accepts = notificationObj.accepts.split('\n');
        } else {
            notificationObj.accepts = null;
        }

        var oid = this.findFullKey(values, MngtOIDs.GATEWAY_INSTANCE_KEY_OID);
        notificationObj.instanceKey = values[oid];
    };

    /**
     * The notification for changes to the cluster balancer map (the map of
     * URIs in the various instances that support a particular balance URI).
     */
    $proto.processBalancerMapNotification = function(notificationTypeOid, values, notificationObj) {
        notificationObj.type = CC.Constants.NotificationType.BALANCER_MAP_CHANGE;
        notificationObj.eventType = values[MngtOIDs.GATEWAY_BALANCER_MAP_EVENT_TYPE_OID];
        notificationObj.balancerURI = values[MngtOIDs.GATEWAY_BALANCER_MAP_EVENT_BALANCER_URI_OID]; 
        notificationObj.balanceeURIs = values[MngtOIDs.GATEWAY_BALANCER_MAP_EVENT_BALANCEE_URIS_OID]; 
    };

    /**
     * The summary notifications are all of similar style, so are handled here.
     */
    $proto.processSummaryNotification = function(notificationTypeOid, values, notificationObj) {
        var oid, partialOid, oidParts;
        var serviceId, sessionId;

        if (notificationTypeOid === MngtOIDs.GATEWAY_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.GATEWAY_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.GATEWAY_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.GATEWAY_SUMMARY_DATA_OID.length + 1);
        } else if (notificationTypeOid === MngtOIDs.SERVICE_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.SERVICE_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.SERVICE_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.SERVICE_SUMMARY_DATA_OID.length + 1);
        } else if (notificationTypeOid === MngtOIDs.SESSION_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.SESSION_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.SESSION_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.SESSION_SUMMARY_DATA_OID.length + 1);
        } else if (notificationTypeOid === MngtOIDs.SYSTEM_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.SYSTEM_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.SYSTEM_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.SYSTEM_SUMMARY_DATA_OID.length + 1);
        } else if (notificationTypeOid === MngtOIDs.CPU_LIST_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.CPU_LIST_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.CPU_LIST_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.CPU_LIST_SUMMARY_DATA_OID.length + 1);
        } else if (notificationTypeOid === MngtOIDs.NIC_LIST_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.NIC_LIST_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.NIC_LIST_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.NIC_LIST_SUMMARY_DATA_OID.length + 1);
        } else if (notificationTypeOid === MngtOIDs.JVM_SUMMARY_DATA_NOTIF_OID) {
            notificationObj.type = CC.Constants.NotificationType.JVM_SUMMARY;
            oid = this.findFullKey(values, MngtOIDs.JVM_SUMMARY_DATA_OID);
            partialOid = oid.substring(MngtOIDs.JVM_SUMMARY_DATA_OID.length + 1);
        }
        
        oidParts = partialOid.split(".");
        if (oidParts.length > 1) {
            serviceId = parseInt(oidParts[1], 10);
        }
        if (oidParts.length > 2) {
            sessionId = parseInt(oidParts[2], 10);
        }

        notificationObj.gatewayId = GATEWAY_ID;
        notificationObj.serviceId = serviceId;
        notificationObj.sessionId = sessionId;
        notificationObj.value = parseJSON(values[oid]);
    };

    /**
     * The notification for a new session in a given service.
     * Data includes the sessionData and the current and total session counts
     * for the given service (including the new session)
     */
    $proto.processSessionOpenNotification = function(notificationTypeOid, values, notificationObj) {
        var $this = this;

        notificationObj.type = CC.Constants.NotificationType.SESSION_OPEN;

        var sessionDataStr = values[MngtOIDs.SERVICE_SESSION_OPEN_NOTIF_OID];
        
        var sessionValues = parseJSON(sessionDataStr);
        for (var fld in sessionValues) {
            if (sessionValues.hasOwnProperty(fld)) {
                notificationObj[fld] = sessionValues[fld];
            }
        }

        // The gateway calls the time the session started 'createTime'. For consistency acrss various
        // layers (gateway/service/session), we'll change that to 'startTime'.
        if (notificationObj.hasOwnProperty('createTime')) {
            notificationObj.startTime = notificationObj.createTime;
            delete notificationObj.createTime;
        }

        // we know that serviceId and sessionId are part of the data, so
        // turn them from strings into integers
        notificationObj.serviceId = parseInt(notificationObj.serviceId, 10);
        notificationObj.sessionId = parseInt(notificationObj.sessionId, 10);

        var oid = this.findFullKey(values, MngtOIDs.SERVICE_CURR_SESSION_CT_OID);
        notificationObj.currSessionCount = values[oid];

        oid = this.findFullKey(values, MngtOIDs.SERVICE_TOTAL_SESSION_CT_OID);
        notificationObj.totalSessionCount = values[oid];
    };

    /**
     * The notification for a session close in a given service.
     */
    $proto.processSessionCloseNotification = function(notificationTypeOid, values, notificationObj) {
        notificationObj.type = CC.Constants.NotificationType.SESSION_CLOSE;

        // We know that current session count on the service has changed.
        var oid = this.findFullKey(values, MngtOIDs.SERVICE_CURR_SESSION_CT_OID);
        notificationObj.currSessionCount = values[oid];

        // The other value present is the 'session_open' field value (now 0)
        // for the session that closed. Get the OID first, then parse it
        // to get the service and session IDs, too.
        oid = this.findFullKey(values, MngtOIDs.SESSION_SESSION_OPEN_OID);
        notificationObj.sessionOpen = values[oid];

        var dotPos = oid.lastIndexOf('.');
        notificationObj.sessionId = parseInt(oid.substring(dotPos + 1), 10);

        var dotPos2 = oid.lastIndexOf('.', dotPos - 1);
        notificationObj.serviceId = parseInt(oid.substring(dotPos2 + 1, dotPos), 10);
    };

    /**
     * Given an object from a notification, iterate through the keys to find one 
     * that starts with the given string followed by a '.' (we're using this for
     * OIDs). Return the full matching key.
     * If there are multiple matches, only the first found will be returned.
     *
     * Note that we're assuming the 'values' object coming in has ONLY 
     * properties we're interested in--no extra prototype ones or whatever.
     */
    $proto.findFullKey = function(values, keyStart) {
        var len = keyStart.length;

        for (var key in values) {
            if (key.startsWith(keyStart) && key.charAt(len) == '.') {
                return key;
            }
        }

        return null;
    };

    /**
     * Given an object from a notification, check to see if it contains
     * a particular (full) key.
     */
    $proto.hasKey = function(values, key) {
        return values.hasOwnProperty(key);
    };

    /**
     * Return the gateway's JVM statistics 
     *
     * @param callback indicates the callback function that will be
     * called if the call succeeds.
     */
    $proto.getJVMStats = function(callback) {
        var $this = this;
        var oids = [ encodeOID(MngtOIDs.JVM_SUMMARY_DATA_OID) ];
        var fn = function() {
            $this._snmp.makeGetRequest(function(jvmData) {
                                           $this.getJVMStats2(jvmData, callback);
                                       },
                                       oids);
        };

        var t = invokeLater(fn,0);
        return t;
    };

    $proto.getJVMStats2 = function(jvmData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        if ((jvmData !== null) && (jvmData.values !== undefined)) {
            var values = jvmData.values;

            var jvmObj = {};
            jvmObj.gatewayId = GATEWAY_ID;

            for (var oid in values) {
                var val = values[oid];
                $this.setJVMAttribute(jvmObj, oid, val);
            }

            $this.setJVMAttribute(jvmObj, "readTime", readTime);

            $this.parseJSONField(jvmObj, 'summaryData', false);

            callback(jvmObj);
        }
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
     */
    $proto.getSummaryDataDefinitions = function(callback) {
        var $this = this;
        var oids = [ encodeOID(MngtOIDs.GATEWAY_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.GATEWAY_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.SERVICE_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.SERVICE_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.SESSION_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.SESSION_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.SYSTEM_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.SYSTEM_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.SYSTEM_SUMMARY_DATA_GATHER_INTERVAL_OID),
                     encodeOID(MngtOIDs.CPU_LIST_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.CPU_LIST_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.CPU_LIST_SUMMARY_DATA_GATHER_INTERVAL_OID),
                     encodeOID(MngtOIDs.NIC_LIST_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.NIC_LIST_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.NIC_LIST_SUMMARY_DATA_GATHER_INTERVAL_OID),
                     encodeOID(MngtOIDs.JVM_SUMMARY_DATA_FIELDS_OID),
                     encodeOID(MngtOIDs.JVM_SUMMARY_DATA_INTERVAL_OID),
                     encodeOID(MngtOIDs.JVM_SUMMARY_DATA_GATHER_INTERVAL_OID)
                   ];
        var fn = function() {
            $this._snmp.makeGetRequest(function(definitionData) {
                                           $this.getSummaryDataDefinitions2(definitionData, callback);
                                       },
                                       oids);
        };

        var t = invokeLater(fn,0);
        return t;
    }

    $proto.getSummaryDataDefinitions2 = function(definitionData, callback) {
        var $this = this;

        var readTime = (new Date()).getTime();

        if ((definitionData !== null) && (definitionData.values !== undefined)) {
            var values = definitionData.values;

            var result = {};
            result.gatewayId = GATEWAY_ID;
            result.gateway = {fields: null, notificationInterval: null, gatherInterval: null};
            result.service = {fields: null, notificationInterval: null, gatherInterval: null};
            result.session = {fields: null, notificationInterval: null, gatherInterval: null};
            result.system = {fields: null, notificationInterval: null, gatherInterval: null};
            result.cpuList = {fields: null, notificationInterval: null, gatherInterval: null};
            result.nicList = {fields: null, notificationInterval: null, gatherInterval: null};
            result.jvm = {fields: null, notificationInterval: null, gatherInterval: null};
            
            for (var oid in values) {
                var val = values[oid];
                if (val) {
                    val = JSON.parse(val);
                }

                if (oid == MngtOIDs.GATEWAY_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.gateway.fields = val;
                } else if (oid == MngtOIDs.GATEWAY_SUMMARY_DATA_INTERVAL_OID) {
                    result.gateway.notificationInterval = val;
                } else if (oid == MngtOIDs.SERVICE_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.service.fields = val;
                } else if (oid == MngtOIDs.SERVICE_SUMMARY_DATA_INTERVAL_OID) {
                    result.service.notificationInterval = val;
                } else if (oid == MngtOIDs.SESSION_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.session.fields = val;
                } else if (oid == MngtOIDs.SESSION_SUMMARY_DATA_INTERVAL_OID) {
                    result.session.notificationInterval = val;
                } else if (oid == MngtOIDs.SYSTEM_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.system.fields = val;
                } else if (oid == MngtOIDs.SYSTEM_SUMMARY_DATA_INTERVAL_OID) {
                    result.system.notificationInterval = val;
                } else if (oid == MngtOIDs.SYSTEM_SUMMARY_DATA_GATHER_INTERVAL_OID) {
                    result.system.gatherInterval = val;
                } else if (oid == MngtOIDs.CPU_LIST_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.cpuList.fields = val;
                } else if (oid == MngtOIDs.CPU_LIST_SUMMARY_DATA_INTERVAL_OID) {
                    result.cpuList.notificationInterval = val;
                } else if (oid == MngtOIDs.CPU_LIST_SUMMARY_DATA_GATHER_INTERVAL_OID) {
                    result.cpuList.gatherInterval = val;
                } else if (oid == MngtOIDs.NIC_LIST_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.nicList.fields = val;
                } else if (oid == MngtOIDs.NIC_LIST_SUMMARY_DATA_INTERVAL_OID) {
                    result.nicList.notificationInterval = val;
                } else if (oid == MngtOIDs.NIC_LIST_SUMMARY_DATA_GATHER_INTERVAL_OID) {
                    result.nicList.gatherInterval = val;
                } else if (oid == MngtOIDs.JVM_SUMMARY_DATA_FIELDS_OID) {
                    val.push('readTime');
                    result.jvm.fields = val;
                } else if (oid == MngtOIDs.JVM_SUMMARY_DATA_INTERVAL_OID) {
                    result.jvm.notificationInterval = val;
                } else if (oid == MngtOIDs.JVM_SUMMARY_DATA_GATHER_INTERVAL_OID) {
                    result.jvm.gatherInterval = val;
                }
            }

            result.readTime = readTime;

            callback(result);
        }
    };

    /*
     * Generic support routines
     */

    /**
     * Given an object with a field that is stringified JSON data, extract the
     * field data and parse it. If 'storeSummaryFields' is true, take each field
     * of the resulting data and put it back into the original object. If not,
     * just store the parsed field back into 'summaryData'.
     */
    $proto.parseJSONField = function(obj, fieldName, storeFieldData) {
        var fieldData = obj[fieldName];
        delete obj[fieldName];  // so we don't pass anything on to the model objects

        if (fieldData && fieldData.length > 0) {
            fieldData = parseJSON(fieldData);

            if (storeFieldData) {
                // the caller wants us to portion out the fields for them
                if (fieldData) {
                    for (var fld in fieldData) {
                        if (fieldData.hasOwnProperty(fld)) {
                            obj[fld] = fieldData[fld];
                        }
                    }
                }
            } else {
                // the caller does not want us to mess with the parsed data.
                // Just put it back in the original field.
                obj[fieldName] = fieldData;
            }
        }
    };

    /**
     * set a property
     */
    $proto.setProperty = function(callback, oid, valueType, value) {
        this._snmp.makeSetRequest(callback, oid, valueType, value);
    };

    /**
     * Simple 'ping' to the server. We really don't care about any data, 
     * just want to check the connection is working.
     */
    $proto.ping = function(callback) {
        var $this = this;

        var fn = function() {
            $this._snmp.makeGetRequest(callback, 
                                       encodeOID(MngtOIDs.GATEWAY_INDEX_OID + "." + GATEWAY_ID));
        }

        var t = invokeLater(fn,0);
        return t;
    };
})();
