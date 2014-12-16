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
 * A set of constants that the rest of the Command Center can use.
 */
CC.Constants = {

    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June',
             'July', 'August', 'September', 'October', 'November', 'December'],

    // A map of objects, one per service type. Each contains information
    // to be used to display graphics for the service type (e.g., the
    // Config Overview.)
    SERVICE_DISPLAY_INFO: {
        balancer: {cssServiceType: 'websocket-service', image: '../images/service-balancer.png'},
        directory: {cssServiceType: 'directory-service', image: '../images/service-directory.png'},
        broadcast: {cssServiceType: 'websocket-service', image: '../images/service-broadcast.png'},
        echo: {cssServiceType: 'websocket-service', image: '../images/service-echo.png'},
        'http.proxy': {cssServiceType: 'proxy-service', image: '../images/service-http-proxy.png'},
        'jms': {cssServiceType: 'websocket-service', image: '../images/service-stomp-jms.png'},
        'jms.proxy': {cssServiceType: 'websocket-service', image: '../images/service-stomp-interceptor.png'},
        keyring: {cssServiceType: 'websocket-service', image: '../images/service-keyring.png'},
        proxy: {cssServiceType: 'proxy-service', image: '../images/service-proxy.png'},
        session: {cssServiceType: 'directory-service', image: '../images/service-session.png'},
        'management.jmx': {cssServiceType: 'management-service', image: '../images/service-management-jmx.png'},
        'management.snmp': {cssServiceType: 'management-service', image: '../images/service-management-snmp.png'}
    },

    // See ProtocolRegistry.java for the list of supported protocols and their visible names
    PROTOCOL_DISPLAY_INFO: {
        http: {
            forwardIcon: '../images/arrow_blue_right.png', 
            reverseIcon: '../images/arrow_blue_left.png',
            borderColor: '#396F87',
            innerColor: '#2590BA',
            label: 'HTTP'
        },
        https: {
            forwardIcon: '../images/arrow_blue_right.png', 
            reverseIcon: '../images/arrow_blue_left.png',
            borderColor: '#396F87',
            innerColor: '#2590BA',
            label: 'Secure HTTP'
        },
        httpx: {
            forwardIcon: '../images/arrow_blue_right.png', 
            reverseIcon: '../images/arrow_blue_left.png',
            borderColor: '#396F87',
            innerColor: '#2590BA',
            label: 'HTTP'
        },
        httpxe: {
            forwardIcon: '../images/arrow_blue_right.png', 
            reverseIcon: '../images/arrow_blue_left.png',
            borderColor: '#396F87',
            innerColor: '#2590BA',
            label: 'HTTP'
        },
        'httpxe+ssl': {
            forwardIcon: '../images/arrow_blue_right.png', 
            reverseIcon: '../images/arrow_blue_left.png',
            borderColor: '#396F87',
            innerColor: '#2590BA',
            label: 'Secure HTTP'
        },
        'httpx+ssl': {
            forwardIcon: '../images/arrow_blue_right.png', 
            reverseIcon: '../images/arrow_blue_left.png',
            borderColor: '#396F87',
            innerColor: '#2590BA',
            label: 'Secure HTTP'
        },
        mcp: {
            forwardIcon: '../images/arrow_black_right.png', 
            reverseIcon: '../images/arrow_black_left.png',
            borderColor: '#000000',
            innerColor: '#444444',
            label: 'MCP'
        },
        mdp: {
            forwardIcon: '../images/arrow_black_right.png', 
            reverseIcon: '../images/arrow_black_left.png',
            borderColor: '#000000',
            innerColor: '#444444',
            label: 'MDP'
        },
        proxy: {
            forwardIcon: '../images/arrow_purple_right.png', 
            reverseIcon: '../images/arrow_purple_left.png',
            borderColor: '#9900CC',
            innerColor: '#9D49BF',
            label: 'PROXY'
        },
        sse: {
            forwardIcon: '../images/arrow_red_right.png', 
            reverseIcon: '../images/arrow_red_left.png',
            borderColor: '#771C0C',
            innerColor:  '#CC4834',
            label: 'SSE'
        },
        'sse+ssl': {
            forwardIcon: '../images/arrow_red_right.png', 
            reverseIcon: '../images/arrow_red_left.png',
            borderColor: '#771C0C',
            innerColor:  '#CC4834',
            label: 'Secure SSE'
        },
        ssl: {
            forwardIcon: '../images/arrow_purple_right.png', 
            reverseIcon: '../images/arrow_purple_left.png',
            borderColor: '#9900CC',
            innerColor: '#9D49BF',
            label: 'SSL'
        },
        tcp: {
            forwardIcon: '../images/arrow_black_right.png', 
            reverseIcon: '../images/arrow_black_left.png',
            borderColor: '#9900CC',
            innerColor: '#444444',
            label: 'TCP'
        },
        udp: {
            forwardIcon: '../images/arrow_black_right.png', 
            reverseIcon: '../images/arrow_black_left.png',
            borderColor: '#6E9932',
            innerColor: '#444444',
            label: 'UDP'
        },
        ws: {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#E46D0A',
            label: 'WS'
        },
        'ws-draft-75': {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#E46D0A',
            label: 'WS (draft-75)'
        },
        'ws-draft-75+ssl': {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'Secure WS (draft-75)'
        },
        wse: {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'WS (emulated)'
        },
        'wse+ssl': {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'Secure WS (emulated)'
        },
        wsn: {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'WS'
        },
        'wsn+ssl': {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'Secure WS'
        },
        wsr: {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'RTMP (Flash)'
        },
        'wsr+ssl': {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'Secure RTMP (Flash)'
        },
        wss: {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'Secure WS'
        },
        wsx: {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'WS'
        },
        'wsx+ssl': {
            forwardIcon: '../images/arrow_orange_right.png', 
            reverseIcon: '../images/arrow_orange_left.png',
            borderColor: '#E5761A',
            innerColor:  '#46D0A',
            label: 'Secure WS'
        }
    },

    TLS_SSL_IMAGES: {
        'https': '../images/lock.png',
        'httpxe+ssl': '../images/lock.png',
        'httpx+ssl': '../images/lock.png',
        'sse+ssl': '../images/lock.png',
        'ws-draft-75+ssl': '../images/lock.png',
        'wse+ssl': '../images/lock.png',
        'wsn+ssl': '../images/lock.png',
        'wsr+ssl': '../images/lock.png',
        'wss': '../images/lock.png',
        'wsx+ssl': '../images/lock.png'
    },

    WARNING_IMAGE: '../images/warning.png',

    // Value to return when returning timed information for an attribute,
    // when the particular attribute is fixed, rather than dynamic.
    CONSTANT_TIME: -1,

    NotificationType: {MEMBERSHIP_CHANGE: 'membershipChange',
                       GATEWAY_SUMMARY: 'gatewaySummary',
                       SERVICE_SUMMARY: 'serviceSummary',
                       SESSION_SUMMARY: 'sessionSummary',
                       SYSTEM_SUMMARY: 'systemSummary',
                       CPU_LIST_SUMMARY: 'cpuListSummary',
                       NIC_LIST_SUMMARY: 'nicListSummary',
                       JVM_SUMMARY: 'jvmSummary',
                       MANAGEMENT_SERVICE_CHANGE: 'managementServiceChange',
                       BALANCER_MAP_CHANGE: 'balancerMapChange',
                       SESSION_OPEN: 'sessionOpen',
                       SESSION_CLOSE: 'sessionClose',
                       TOTAL_SESSION_COUNT: 'totalSessionCount',
                       CURRENT_SESSION_COUNT: 'currentSessionCount'},

    LineStyle: {SOLID: 0, 
                DASHED: 1}
}
