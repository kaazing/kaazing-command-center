/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

/**
 * Various SNMP OIDs that the management client will want to deal with.
 * This file is just so they're generally available to all levels of
 * the client, not just the mngt API, though we might want to put them
 * back to only that level later.
 * We don't need multiple of these, so I just assign them to an object
 * For now, however, I can do things like create lists of labels and
 * OIDs that that I can then use JQuery with to create UI objects
 * like table rows and such.
 */

var MngtOIDs = (function() {

    var rootOID = "1.3.6.1.2.1.1";
    var enterpriseOID = "1.3.6.1.4.1.29197";

    var gatewayConfigOID = enterpriseOID + ".1";           // gateway configuration data 1

    var clusterConfigOID = gatewayConfigOID + ".1";        // cluster config data 1.1
    var networkConfigOID = gatewayConfigOID + ".2";        // network config data 1.2
    var securityConfigOID = gatewayConfigOID + ".3";       // security config data 1.3
    var serviceConfigOID = gatewayConfigOID + ".4";        // service config data  1.4
    var serviceDefaultsConfigOID = gatewayConfigOID + ".5"; // service defaults config data  1.5
    var versionInfoOID = gatewayConfigOID + ".6";          // version info data  1.6

    var realmConfigOID = securityConfigOID + ".5";         // realm config data 1.3.5
    var realmConfigEntryOID = realmConfigOID + ".1";       // realm config entry 1.3.5.1

    var serviceConfigEntryOID = serviceConfigOID + ".1";   // service config entry 1.4.1

    var gatewayOID = enterpriseOID + ".2";                 // gateway live data table
    var gatewayEntryOID = gatewayOID + ".1";               // gateway live data table entry 

    var serviceOID = enterpriseOID + ".3";                 // service live data table
    var serviceEntryOID = serviceOID + ".1";               // service live data table entry

    var sessionOID = enterpriseOID + ".4";                 // session live data table
    var sessionEntryOID = sessionOID + ".1";               // session live data table entry

    var systemOID = enterpriseOID + ".5";                  // System (host) data not specific to CPU or NIC

    var cpuOID = enterpriseOID + ".6";                     // Individual CPU/core data
    var cpuEntryOID = cpuOID + ".1";                       // cpu live data table entry

    var nicOID = enterpriseOID + ".7";                     // Individual network interface (NIC) data
    var nicEntryOID = nicOID + ".1";                       // NIC live data table entry

    var jvmMngtMibOID = "1.3.6.1.4.1.42.2.145.3.163.1";
    var jvmMngtMibObjectsOID = jvmMngtMibOID + ".1";
    var jvmClassLoadingOID = jvmMngtMibObjectsOID + ".1";
    var jvmMemOID = jvmMngtMibObjectsOID + ".2";
    var jvmThreadingOID = jvmMngtMibObjectsOID + ".3";

    var props = {
        // The OID in notification data whose value is the notification type.
        // E.g. for a notification with a gateway's summary data, the value
        // of the following key will be 1.3.6.1.4.1.29197.1.1.25 (column 25
        // of the 'gateway entry' MIB definition.)
        NOTIFICATION_TYPE_OID: "1.3.6.1.6.3.1.1.4.1.0",

        // Root OID for 'system'-related stuff (like JVM values).
        SYSTEM_ROOT_OID: rootOID,

        //==================================================
        // The static gateway configuration and its contents
        //==================================================
        GATEWAY_CFG_OID                          : gatewayConfigOID,             // 1

        CLUSTER_CFG_OID                          : clusterConfigOID,             // 1.1
        CLUSTER_CFG_NAME_OID                     : clusterConfigOID + ".1.0",    // 1.1.1.0
        CLUSTER_CFG_ACCEPTS_OID                  : clusterConfigOID + ".2.0",    // 1.1.2.0
        CLUSTER_CFG_CONNECTS_OID                 : clusterConfigOID + ".3.0",    // 1.1.3.0
        CLUSTER_CFG_CONNECT_OPTIONS_OID          : clusterConfigOID + ".4.0",    // 1.1.4.0

        NETWORK_CFG_OID                          : networkConfigOID,             // 1.2
        NETWORK_CFG_ADDRESS_MAPPINGS_OID         : networkConfigOID + ".1.0",    // 1.2.1.0

        SECURITY_CFG_OID                         : securityConfigOID,            // 1.3
        SECURITY_CFG_KEYSTORE_TYPE_OID           : securityConfigOID + ".1.0",   // 1.3.1.0
        SECURITY_CFG_KEYSTORE_CERT_INFO_OID      : securityConfigOID + ".2.0",   // 1.3.2.0
        SECURITY_CFG_TRUSTSTORE_TYPE_OID         : securityConfigOID + ".3.0",   // 1.3.3.0
        SECURITY_CFG_TRUSTSTORE_CERT_INFO_OID    : securityConfigOID + ".4.0",   // 1.3.4.0

        REALM_CFG_OID                            : realmConfigOID,               // 1.3.5
        REALM_CFG_ENTRY_OID                      : realmConfigEntryOID,          // 1.3.5.1
        REALM_CFG_NAME_OID                       : realmConfigEntryOID + ".1",   
        REALM_CFG_DESCRIPTION_OID                : realmConfigEntryOID + ".2",          
        REALM_CFG_USER_PRINCIPAL_CLASSES_OID     : realmConfigEntryOID + ".3",
        REALM_CFG_HTTP_CHALLENGE_SCHEME_OID      : realmConfigEntryOID + ".4",
        REALM_CFG_HTTP_HEADERS_OID               : realmConfigEntryOID + ".5",
        REALM_CFG_HTTP_QUERY_PARAMS_OID          : realmConfigEntryOID + ".6",
        REALM_CFG_HTTP_COOKIE_NAMES_OID          : realmConfigEntryOID + ".7",
        REALM_CFG_AUTHORIZATION_MODE_OID         : realmConfigEntryOID + ".8",
        REALM_CFG_SESSION_TIMEOUT_OID            : realmConfigEntryOID + ".9",
        REALM_CFG_LOGIN_MODULES_OID              : realmConfigEntryOID + ".10",

        SERVICE_CFG_OID                          : serviceConfigOID,             // 1.4
        SERVICE_CFG_ENTRY_OID                    : serviceConfigEntryOID,        // 1.4.1
        SERVICE_CFG_TYPE_OID                     : serviceConfigEntryOID + ".1",
        SERVICE_CFG_NAME_OID                     : serviceConfigEntryOID + ".2",
        SERVICE_CFG_DESCRIPTION_OID              : serviceConfigEntryOID + ".3",
        SERVICE_CFG_ACCEPTS_OID                  : serviceConfigEntryOID + ".4",
        SERVICE_CFG_ACCEPT_OPTIONS_OID           : serviceConfigEntryOID + ".5", 
        SERVICE_CFG_BALANCES_OID                 : serviceConfigEntryOID + ".6",
        SERVICE_CFG_CONNECTS_OID                 : serviceConfigEntryOID + ".7",
        SERVICE_CFG_CONNECT_OPTIONS_OID          : serviceConfigEntryOID + ".8",
        SERVICE_CFG_CROSS_SITE_CONSTRAINTS_OID   : serviceConfigEntryOID + ".9",
        SERVICE_CFG_PROPERTIES_OID               : serviceConfigEntryOID + ".10",
        SERVICE_CFG_REQUIRED_ROLES_OID           : serviceConfigEntryOID + ".11",
        SERVICE_CFG_REALM_OID                    : serviceConfigEntryOID + ".12",
        SERVICE_CFG_MIME_MAPPINGS_OID            : serviceConfigEntryOID + ".13",

        SERVICE_DFLTS_CFG_OID                    : serviceDefaultsConfigOID,           // 1.6
        SERVICE_DFLTS_CFG_ACCEPT_OPTIONS_OID     : serviceDefaultsConfigOID + ".1.0",  // 1.6.1.0
        SERVICE_DFLTS_CFG_MIME_MAPPINGS_OID      : serviceDefaultsConfigOID + ".2.0",  // 1.6.2.0

        GATEWAY_VERSION_INFO_OID                 : versionInfoOID,             // 1.7
        GATEWAY_VERSION_INFO_PRODUCT_TITLE_OID   : versionInfoOID + ".1.0",    // 1.7.1.0
        GATEWAY_VERSION_INFO_PRODUCT_BUILD_OID   : versionInfoOID + ".2.0",    // 1.7.2.0
        GATEWAY_VERSION_INFO_PRODUCT_EDITION_OID : versionInfoOID + ".3.0",    // 1.7.3.0

        // Resources???   // 1.7

        //================================================================
        // the dynamic Gateway data. As of 11/12, a given gateway really 
        // only has one entry in this table, for the current gateway. We 
        // log into to other gateways to get their data, rather than 
        // getting it through a single connection to one gateway.
        //================================================================
        GATEWAY_OID                              : gatewayOID,                   // 2
        GATEWAY_ENTRY_OID                        : gatewayEntryOID,              // 2.1   

        GATEWAY_INDEX_OID                        : gatewayEntryOID + ".1",       // 2.1.1
        GATEWAY_ID_OID                           : gatewayEntryOID + ".2",
        GATEWAY_TOTAL_CURRENT_SESSIONS_OID       : gatewayEntryOID + ".3",
        GATEWAY_TOTAL_BYTES_RECEIVED_OID         : gatewayEntryOID + ".4",
        GATEWAY_TOTAL_BYTES_SENT_OID             : gatewayEntryOID + ".5",
        GATEWAY_UPTIME_OID                       : gatewayEntryOID + ".6",
        GATEWAY_START_TIME_OID                   : gatewayEntryOID + ".7",
        GATEWAY_INSTANCE_KEY_OID                 : gatewayEntryOID + ".8",
        GATEWAY_SUMMARY_DATA_OID                 : gatewayEntryOID + ".9",
        GATEWAY_CLUSTER_MEMBERS_OID              : gatewayEntryOID + ".10",
        GATEWAY_BALANCER_MAP_OID                 : gatewayEntryOID + ".11",
        GATEWAY_MNGT_SERVICE_MAP_OID             : gatewayEntryOID + ".12",
        GATEWAY_MNGT_LATEST_UPDATE_VERSION_OID   : gatewayEntryOID + ".13",
        GATEWAY_MNGT_FORCE_UPDATE_CHECK_OID   	 : gatewayEntryOID + ".14",

        GATEWAY_SUMMARY_DATA_FIELDS_OID          : gatewayOID + ".2.0",
        GATEWAY_SUMMARY_DATA_INTERVAL_OID        : gatewayOID + ".3.0",
        GATEWAY_SUMMARY_DATA_NOTIF_OID           : gatewayOID + ".4",  // gateway summary data

        // NOTE the following are under the Gateway root OID, even though they're related to cluster data
        GATEWAY_MEMBERSHIP_NOTIF_OID             : gatewayOID + ".5", // another member is join/leaving
        GATEWAY_MEMBERSHIP_EVENT_TYPE_OID        : gatewayOID + ".6.0",

        GATEWAY_MNGT_SVC_NOTIF_OID               : gatewayOID + ".8", 
        GATEWAY_MNGT_SVC_EVENT_TYPE_OID          : gatewayOID + ".9.0",
        GATEWAY_MNGT_SVC_EVENT_ACCEPT_URIS_OID   : gatewayOID + ".10.0",

        GATEWAY_BALANCER_MAP_NOTIF_OID               : gatewayOID + ".11", 
        GATEWAY_BALANCER_MAP_EVENT_TYPE_OID          : gatewayOID + ".12.0",
        GATEWAY_BALANCER_MAP_EVENT_BALANCER_URI_OID  : gatewayOID + ".13.0",
        GATEWAY_BALANCER_MAP_EVENT_BALANCEE_URIS_OID : gatewayOID + ".14.0",

        //==========================
        // the dynamic Service data.
        //==========================

        // the ServiceEntry within a ServiceTable.
        SERVICE_OID                              : serviceOID,                    // 3
        SERVICE_ENTRY_OID                        : serviceEntryOID,               // 3.1

        SERVICE_INDEX_OID                        : serviceEntryOID + ".1",
        // service status (1 = running, 2 = stopped, 3 = stop requested
        //                 4 = restart requested, 5 = start requested)
        SERVICE_STATE_OID                        : serviceEntryOID + ".2",  
        SERVICE_SERVICE_CONNECTED_OID            : serviceEntryOID + ".3", // true = 'service is connected'
        SERVICE_TOTAL_BYTES_RCVD_CT_OID          : serviceEntryOID + ".4",
        SERVICE_TOTAL_BYTES_SENT_CT_OID          : serviceEntryOID + ".5",
        SERVICE_CURR_SESSION_CT_OID              : serviceEntryOID + ".6",
        SERVICE_CURR_NATIVE_SESSION_CT_OID       : serviceEntryOID + ".7",
        SERVICE_CURR_EMULATED_SESSION_CT_OID     : serviceEntryOID + ".8",
        SERVICE_TOTAL_SESSION_CT_OID             : serviceEntryOID + ".9",
        SERVICE_TOTAL_NATIVE_SESSION_CT_OID      : serviceEntryOID + ".10",
        SERVICE_TOTAL_EMULATED_SESSION_CT_OID    : serviceEntryOID + ".11",
        SERVICE_TOTAL_EXCEPTION_CT_OID           : serviceEntryOID + ".12",
        SERVICE_LATEST_EXCEPTION_OID             : serviceEntryOID + ".13",
        SERVICE_LATEST_EXCEPTION_TIME_OID        : serviceEntryOID + ".14",
        SERVICE_LAST_SUCCESS_CONNECT_TS_OID      : serviceEntryOID + ".15",
        SERVICE_LAST_FAILED_CONNECT_TS_OID       : serviceEntryOID + ".16",
        SERVICE_LAST_HB_PING_RESULT_OID          : serviceEntryOID + ".17",
        SERVICE_LAST_HB_PING_TS_OID              : serviceEntryOID + ".18",
        SERVICE_HB_PING_CT_OID                   : serviceEntryOID + ".19",
        SERVICE_HB_PING_SUCCESS_CT_OID           : serviceEntryOID + ".20",
        SERVICE_HB_PING_FAILURE_CT_OID           : serviceEntryOID + ".21",
        SERVICE_HB_RUNNING_OID                   : serviceEntryOID + ".22", // boolean
        SERVICE_ENABLE_NOTIFS_OID                : serviceEntryOID + ".23",
        SERVICE_LOGGED_IN_SESSIONS_OID           : serviceEntryOID + ".24",
        SERVICE_SUMMARY_DATA_OID                 : serviceEntryOID + ".25",

        SERVICE_SUMMARY_DATA_FIELDS_OID          : serviceOID + ".2.0",
        SERVICE_SUMMARY_DATA_INTERVAL_OID        : serviceOID + ".3.0",
        SERVICE_SUMMARY_DATA_NOTIF_OID           : serviceOID + ".4",

        SERVICE_SESSION_OPEN_NOTIF_OID           : serviceOID + ".5",   // session in svc has connected/opened
        SERVICE_SESSION_CLOSE_NOTIF_OID          : serviceOID + ".6",   // session in svc has disconn./closed

        //==========================
        // the dynamic Session data.
        //==========================

        // the SessionEntry within a SessionTable.
        SESSION_OID                              : sessionOID,                    // 4
        SESSION_ENTRY_OID                        : sessionEntryOID,               // 4.1

        SESSION_INDEX_OID                        : sessionEntryOID + ".1",
        SESSION_ID_OID                           : sessionEntryOID + ".2",
        SESSION_READ_BYTES_CT_OID                : sessionEntryOID + ".3",
        SESSION_READ_BYTES_THPT_OID              : sessionEntryOID + ".4",
        SESSION_WRITTEN_BYTES_CT_OID             : sessionEntryOID + ".5",
        SESSION_WRITTEN_BYTES_THPT_OID           : sessionEntryOID + ".6",
        SESSION_SESSION_OPEN_OID                 : sessionEntryOID + ".7",  // comes over as 1, set to 0 and 
                                                                          // write to close session.
        SESSION_ENABLE_NOTIFS_OID                : sessionEntryOID + ".8",  // set to 1 to enable msg rcvd/sent notifs
        SESSION_START_TIME_OID                   : sessionEntryOID + ".9",  // called 'createTime' on server, we use this for consistency
        SESSION_REMOTE_ADDRESS_OID               : sessionEntryOID + ".10",
        SESSION_PRINCIPALS_OID                   : sessionEntryOID + ".11",
        SESSION_SESSION_TYPE_NAME_OID            : sessionEntryOID + ".12",
        SESSION_SESSION_DIRECTION_OID            : sessionEntryOID + ".13",
        SESSION_SUMMARY_DATA_OID                 : sessionEntryOID + ".14", 

        SESSION_SUMMARY_DATA_FIELDS_OID          : sessionOID + ".2.0",           // 4.2.0 
        SESSION_SUMMARY_DATA_INTERVAL_OID        : sessionOID + ".3.0",           // 4.3.0  
        SESSION_SUMMARY_DATA_NOTIF_OID           : sessionOID + ".4",             // 4.4
        SESSION_MESSAGE_RCVD_NOTIF_OID           : sessionOID + ".5",             // 4.5
        SESSION_MESSAGE_SENT_NOTIF_OID           : sessionOID + ".6",             // 4.6

        //=================================================================
        // OIDs from the SystemManagementMIB.
        //=================================================================

        SYSTEM_OID                               : systemOID,            // 5
        SYSTEM_OS_NAME_OID                       : systemOID + ".1.0",   // fixed
        SYSTEM_UPTIME_SECONDS_OID                : systemOID + ".2.0",   // variable from here.
        SYSTEM_TOTAL_FREE_MEMORY_OID             : systemOID + ".3.0",
        SYSTEM_TOTAL_USED_MEMORY_OID             : systemOID + ".4.0",
        SYSTEM_TOTAL_MEMORY_OID                  : systemOID + ".5.0",
        SYSTEM_TOTAL_FREE_SWAP_OID               : systemOID + ".6.0",
        SYSTEM_TOTAL_USED_SWAP_OID               : systemOID + ".7.0",
        SYSTEM_TOTAL_SWAP_OID                    : systemOID + ".8.0",
        SYSTEM_CPU_PERCENTAGE_OID                : systemOID + ".9.0",

        SYSTEM_SUMMARY_DATA_FIELDS_OID           : systemOID + ".30.0", 
        SYSTEM_SUMMARY_DATA_OID                  : systemOID + ".31.0", 
        SYSTEM_SUMMARY_DATA_INTERVAL_OID         : systemOID + ".32.0",
        SYSTEM_SUMMARY_DATA_NOTIF_OID            : systemOID + ".33",
        SYSTEM_SUMMARY_DATA_GATHER_INTERVAL_OID  : systemOID + ".34.0",

        //=================================================================
        // OIDs from the CpuManagementMIB.
        //=================================================================

        CPU_OID                                  : cpuOID,              // 6
        CPU_ENTRY_OID                            : cpuEntryOID,         // 6.1

        // Entries for the data from the entire list of CPUs
        CPU_LIST_NUM_CPUS_OID                    : cpuOID + ".2.0",     // 6.2.0
        CPU_LIST_SUMMARY_DATA_FIELDS_OID         : cpuOID + ".3.0",
        CPU_LIST_SUMMARY_DATA_OID                : cpuOID + ".4.0",
        CPU_LIST_SUMMARY_DATA_INTERVAL_OID       : cpuOID + ".5.0",
        CPU_LIST_SUMMARY_DATA_NOTIF_OID          : cpuOID + ".6",
        CPU_LIST_SUMMARY_DATA_GATHER_INTERVAL_OID: cpuOID + ".7.0",

        // Entries for individual CPU entries
        CPU_INDEX_OID                            : cpuEntryOID + ".1",  // 6.1.1
        CPU_ID_OID                               : cpuEntryOID + ".2",
        CPU_COMBINED_OID                         : cpuEntryOID + ".3",
        CPU_IDLE_OID                             : cpuEntryOID + ".4",
        CPU_IRQ_OID                              : cpuEntryOID + ".5",
        CPU_NICE_OID                             : cpuEntryOID + ".6",
        CPU_SOFT_IRQ_OID                         : cpuEntryOID + ".7",
        CPU_STOLEN_OID                           : cpuEntryOID + ".8",
        CPU_SYS_OID                              : cpuEntryOID + ".9",
        CPU_USER_OID                             : cpuEntryOID + ".10",
        CPU_WAIT_OID                             : cpuEntryOID + ".11",
        CPU_SUMMARY_DATA_OID                     : cpuEntryOID + ".12",  // no notification on this, see CPU_LIST

        //=================================================================
        // OIDs from the NicManagementMIB.
        //=================================================================

        NIC_OID                                  : nicOID,              // 7
        NIC_ENTRY_OID                            : nicEntryOID,         // 7.1

        // Entries for the data from the entire list of NICs
        NIC_LIST_NET_INTERFACE_NAMES_OID         : nicOID + ".2.0",     // 7.2.0
        NIC_LIST_SUMMARY_DATA_FIELDS_OID         : nicOID + ".3.0",
        NIC_LIST_SUMMARY_DATA_OID                : nicOID + ".4.0",
        NIC_LIST_SUMMARY_DATA_INTERVAL_OID       : nicOID + ".5.0",
        NIC_LIST_SUMMARY_DATA_NOTIF_OID          : nicOID + ".6",
        NIC_LIST_SUMMARY_DATA_GATHER_INTERVAL_OID: nicOID + ".7.0",


        NIC_INDEX_OID                            : nicEntryOID + ".1",  // 7.1.1
        NIC_ID_OID                               : nicEntryOID + ".2",
        NIC_NAME_OID                             : nicEntryOID + ".3",
        NIC_RX_BYTES_OID                         : nicEntryOID + ".4",
        NIC_RX_BYTES_PER_SECOND_OID              : nicEntryOID + ".5",
        NIC_RX_DROPPED_OID                       : nicEntryOID + ".6",
        NIC_RX_ERRORS_OID                        : nicEntryOID + ".7",
        NIC_TX_BYTES_OID                         : nicEntryOID + ".8",
        NIC_TX_BYTES_PER_SECOND_OID              : nicEntryOID + ".9",
        NIC_TX_DROPPED_OID                       : nicEntryOID + ".10",
        NIC_TX_ERRORS_OID                        : nicEntryOID + ".11",
        NIC_SUMMARY_DATA_OID                     : nicEntryOID + ".12",  // no notification on this, see NIC_LIST

        //=================================================================
        // Some (not all) standard Java JVM OIDs from the JVMManagementMIB.
        //=================================================================
        JVM_MNGT_MIB_OID: jvmMngtMibOID,
        JVM_MNGT_MIB_OBJECTS_OID: jvmMngtMibObjectsOID,

        // The JVM 'class-loading' group
        JVM_CLASS_LOADING_OID                    : jvmClassLoadingOID,
        // current #classes loaded in the JVM
        JVM_CLS_LOADED_OID                       : jvmClassLoadingOID + ".1.0",
        // total #classes loaded since JVM started
        JVM_TOTAL_CLS_LOADED_OID                 : jvmClassLoadingOID + ".2.0",
        // total #classes unloaded since JVM started
        JVM_TOTAL_CLS_UNLOADED_OID               : jvmClassLoadingOID + ".3.0",

        // The JVM memory group root OID
        JVM_MEM_OID                              : jvmMemOID,
        // The way to discover/trigger GC calls 
        // (see JVMManagementMIB.java for the full description)
        JVM_MEM_GC_CALL_OID                      : jvmMemOID + ".3.0",

        // The heap memory initial size requested
        JVM_MEM_HEAP_INIT_SIZE_OID               : jvmMemOID + ".10.0",
        // The heap memory (bytes) used from heap memory pools
        JVM_MEM_HEAP_USED_OID                    : jvmMemOID + ".11.0",
        // The heap memory (bytes) committed by heap memory pools
        JVM_MEM_HEAP_COMMITTED_OID               : jvmMemOID + ".12.0",
        // The total max size of memory (bytes) for all heap memory pools
        JVM_MEM_HEAP_MAX_SIZE_OID                : jvmMemOID + ".13.0",

        // The non-heap memory initial size requested
        JVM_MEM_NON_HEAP_INIT_SIZE_OID           : jvmMemOID + ".20.0",
        // The non-heap memory (bytes) used from non-heap memory pools
        JVM_MEM_NON_HEAP_USED_OID                : jvmMemOID + ".21.0",
        // The non-heap memory (bytes) committed by non-heap memory pools
        JVM_MEM_NON_HEAP_COMMITTED_OID           : jvmMemOID + ".22.0",
        // The total max size of memory (bytes) for all non-heap memory pools
        JVM_MEM_NON_HEAP_MAX_SIZE_OID            : jvmMemOID + ".23.0",

        // The JVM 'threading' group
        JVM_THREADING_OID                        : jvmThreadingOID,
        // current #threads in the JVM
        JVM_THREADING_LIVE_THREADS_OID           : jvmThreadingOID + ".1.0",
        // peak #threads since JVM started
        JVM_THREADING_PEAK_THREADS_OID           : jvmThreadingOID + ".3.0",
        // total #threads started since JVM started
        JVM_THREADING_TOTAL_THREADS_OID          : jvmThreadingOID + ".4.0",

        // Because we can't muck with the JVM MIB's OIDs, we'll declare
        // the support for summary data as based on the system OIDs
        JVM_SUMMARY_DATA_FIELDS_OID              : systemOID + ".40.0", 
        JVM_SUMMARY_DATA_OID                     : systemOID + ".41.0", 
        JVM_SUMMARY_DATA_INTERVAL_OID            : systemOID + ".42.0",
        JVM_SUMMARY_DATA_NOTIF_OID               : systemOID + ".43",
        JVM_SUMMARY_DATA_GATHER_INTERVAL_OID     : systemOID + ".44.0"
    };

    return props;
})();
