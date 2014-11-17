/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

function start(challengeHandlerCreatorFn) {
    // turn our offscreen data back to visible, since we had to set it invisible 
    // to avoid Flash of Unstyled Content.
    document.getElementById('offscreenData').style.visibility = 'visible';

    var ROOT_PATH = '/commandcenter';

    setupYUIPatches();

    YUI({filter:'min', 
         base: ROOT_PATH + '/yui/',
         combine: false, 
         useBrowserConsole:true,
         debug:false,
         lang:"en-US",
         groups: {
             gallery: {
                 combine: false,  // turning on requires updating all URLs in css
                 base: ROOT_PATH + '/yui-gallery/',
                 patterns: {
                     'gallery-': { },
                     'lang/gallery-': { },
                     'gallerycss-': {type: 'css'}
                 }
             },
         },
         modules: {
/*
             "strings": {
                 lang: ["en-US"]
             },
*/
/*
             "about-panel": {
                 fullpath: ROOT_PATH + '/js/panels/about_panel.js'
             },
             "cluster-config-model": {
                 fullpath: ROOT_PATH + '/js/models/cluster_config_model.js'
             },
             "cluster-model": {
                 fullpath: ROOT_PATH + '/js/models/cluster_model.js'
             },
             "cluster-realm-config-view": {
                 fullpath: ROOT_PATH + '/js/views/cluster_realm_config_view.js'
             },
             "cluster-service-config-view": {
                 fullpath: ROOT_PATH + '/js/views/cluster_service_config_view.js'
             },
             "command-center": {
                 fullpath: ROOT_PATH + '/js/command_center.js'
             },
             "config-overview-view": {
                 fullpath: ROOT_PATH + '/js/views/config_overview_view.js'
             },
             "config-security-keystore-view": {
                 fullpath: ROOT_PATH + '/js/views/config_security_keystore_view.js'
             },
             "config-security-realms-view": {
                 fullpath: ROOT_PATH + '/js/views/config_security_realms_view.js'
             },
             "config-security-truststore-view": {
                 fullpath: ROOT_PATH + '/js/views/config_security_truststore_view.js'
             },
             "config-service-defaults-view": {
                 fullpath: ROOT_PATH + '/js/views/config_service_defaults_view.js'
             },
             "config-services-view": {
                 fullpath: ROOT_PATH + '/js/views/config_services_view.js'
             },
             "cpu-list-model": {
                 fullpath: ROOT_PATH + '/js/models/cpu_list_model.js'
             },
             "cpu-all-perc-chart": {
                 fullpath: ROOT_PATH + '/js/charts/cpu_all_perc_chart.js'
             },
             "cpu-avg-perc-chart": {
                 fullpath: ROOT_PATH + '/js/charts/cpu_avg_perc_chart.js'
             },
             "current-sessions-chart": {
                 fullpath: ROOT_PATH + '/js/charts/current_sessions_chart.js'
             },
             "dashboard-chart": {
                 fullpath: ROOT_PATH + '/js/charts/dashboard_chart.js'
             },
             "dashboard-view": {
                 fullpath: ROOT_PATH + '/js/views/dashboard_view.js'
             },
             "gateway-config-view": {
                 fullpath: ROOT_PATH + '/js/views/gateway_config_view.js'
             },
             "gateway-config-model": {
                 fullpath: ROOT_PATH + '/js/models/gateway_config_model.js'
             },
             "gateway-dynamic-data-model": {
                 fullpath: ROOT_PATH + '/js/models/gateway_dynamic_data_model.js'
             },
             "gateway-model": {
                 fullpath: ROOT_PATH + '/js/models/gateway_model.js'
             },
             "gateway-realm-config-view": {
                 fullpath: ROOT_PATH + '/js/views/gateway_realm_config_view.js'
             },
             "gateway-service-config-view": {
                 fullpath: ROOT_PATH + '/js/views/gateway_service_config_view.js'
             },
             "jvm-heap-chart": {
                 fullpath: ROOT_PATH + '/js/charts/jvm_heap_chart.js'
             },
             "jvm-model": {
                 fullpath: ROOT_PATH + '/js/models/jvm_model.js'
             },
             "kaazing-view": {
                 fullpath: ROOT_PATH + '/js/views/kaazing_view.js'
             },
             "list-model": {
                 fullpath: ROOT_PATH + '/js/models/list_model.js'
             },
             "login-panel": {
                 fullpath: ROOT_PATH + '/js/panels/login_panel.js'
             },
             "login-processor": {
                 fullpath: ROOT_PATH + '/js/login_processor.js'
             },
             "map-model": {
                 fullpath: ROOT_PATH + '/js/models/map_model.js'
             },
             "monitor-filter-panel": {
                 fullpath: ROOT_PATH + '/js/panels/monitor_filter_panel.js'
             },
             "monitor-gateways-view": {
                 fullpath: ROOT_PATH + '/js/views/monitor_gateways_view.js'
             },
             "monitor-services-view": {
                 fullpath: ROOT_PATH + '/js/views/monitor_services_view.js'
             },
             "monitor-sessions-view": {
                 fullpath: ROOT_PATH + '/js/views/monitor_sessions_view.js'
             },
             "network-config-model": {
                 fullpath: ROOT_PATH + '/js/models/network_config_model.js'
             },
             "nic-list-model": {
                 fullpath: ROOT_PATH + '/js/models/nic_list_model.js'
             },
             "nic-read-thpt-indiv-chart": {
                 fullpath: ROOT_PATH + '/js/charts/nic_read_thpt_indiv_chart.js'
             },
             "nic-read-thpt-combined-chart": {
                 fullpath: ROOT_PATH + '/js/charts/nic_read_thpt_combined_chart.js'
             },
             "nic-rw-thpt-combined-chart": {
                 fullpath: ROOT_PATH + '/js/charts/nic_rw_thpt_combined_chart.js'
             },
             "nic-write-thpt-indiv-chart": {
                 fullpath: ROOT_PATH + '/js/charts/nic_write_thpt_indiv_chart.js'
             },
             "nic-write-thpt-combined-chart": {
                 fullpath: ROOT_PATH + '/js/charts/nic_write_thpt_combined_chart.js'
             },
             "realm-config-model": {
                 fullpath: ROOT_PATH + '/js/models/realm_config_model.js'
             },
             "security-config-model": {
                 fullpath: ROOT_PATH + '/js/models/security_config_model.js'
             },
             "service-config-model": {
                 fullpath: ROOT_PATH + '/js/models/service_config_model.js'
             },
             "service-defaults-config-model": {
                 fullpath: ROOT_PATH + '/js/models/service_defaults_config_model.js'
             },
             "service-dynamic-data-model": {
                 fullpath: ROOT_PATH + '/js/models/service_dynamic_data_model.js'
             },
             "service-model": {
                 fullpath: ROOT_PATH + '/js/models/service_model.js'
             },
             "session-dynamic-data-model": {
                 fullpath: ROOT_PATH + '/js/models/session_dynamic_data_model.js'
             },
             "session-model": {
                 fullpath: ROOT_PATH + '/js/models/session_model.js'
             },
             "system-model": {
                 fullpath: ROOT_PATH + '/js/models/system_model.js'
             }
*/
         },
         onFailure: function(err) {
             alert("There was an error. Failed to load the " + PRODUCT_NAME + " application:\n" + err.msg);
         }
        })
        .use('app', 
             'node', 
             'selector-css3', 
             'intl',
             'transition', 
             'dt-refresh-row-patch',
             'datatable', 
             'datatable-sort',
             'datatable-scroll',
             'panel', 
             'tabview', 
             'scrollview', 
             'stylesheet',
             'gallery-widget-inherit-css',
             'gallery-datatable-selection',
             'dd',
             'dd-drag',
             'dd-plugin',
             'gallery-contextmenu-view', 
             'event', 
             'event-custom',
             'event-outside',
             'router',
             'widget',
             'cluster-realm-config-view',
             'cluster-service-config-view',
             'command-center',
             'config-gateways-view',
             'config-overview-view',
             'config-security-keystore-view',
             'config-security-realms-view',
             'config-security-truststore-view',
             'config-service-defaults-view',
             'config-services-view',
             'cpu-all-perc-chart',
             'cpu-avg-perc-chart',
             'current-sessions-chart',
             'dashboard-chart',
             'dashboard-view',
             'gateway-config-view',
             'gateway-realm-config-view',
             'gateway-service-config-view',
             'jvm-heap-chart',
             'kaazing-view',
             'list-model',
             'login-processor',
             'monitor-gateways-view',
             'monitor-services-view',
             'monitor-sessions-view',
             'nic-read-thpt-combined-chart',
             'nic-read-thpt-indiv-chart',
             'nic-rw-thpt-combined-chart',
             'nic-write-thpt-combined-chart',
             'nic-write-thpt-indiv-chart',
             function(Y) {continueStart(Y, challengeHandlerCreatorFn);});
        // XXX Add back gallery-datatable-selection after testing.
}

/**
 * Callback when YUI has retrieved the relevant modules, so we 
 * can continue application setup and display here.
 */
function continueStart(Y, challengeHandlerCreatorFn) {
    // Include the DataTable refreshRow patch to not render columns not in the table
    Y.Base.mix(Y.DataTable, [Y.DataTable.RefreshRowPatch]);

    window.Y = Y;

    // Some useful stuff I found
    Y.Node.ATTRS.outerHeight = {
        getter: function () {
            var offsetHeight = this.get('offsetHeight');
            return offsetHeight + 
                parseFloat(this.getComputedStyle('marginTop')) + 
                parseFloat(this.getComputedStyle('marginBottom'));
        }
    };

    Y.Node.ATTRS.outerWidth = {
        getter: function () {
            var offsetWidth = this.get('offsetWidth');
            return offsetWidth +
                parseFloat(this.getComputedStyle('marginLeft')) +
                parseFloat(this.getComputedStyle('marginRight'));
        }
    };

    new Y.CommandCenter(
        {challengeHandlerCreatorFn: challengeHandlerCreatorFn,
         viewContainer: '#viewContainer',
         transitions: false,
         views: {
             dashboardView:                {type: 'DashboardView', preserve:true},
             configOverviewView:           {type: 'ConfigOverviewView', preserve:true},
             configServicesView:           {type: 'ConfigServicesView', preserve:true},
             configServiceDefaultsView:    {type: 'ConfigServiceDefaultsView', preserve:true},
             configSecurityRealmsView:     {type: 'ConfigSecurityRealmsView', preserve:true},
             configSecurityKeystoreView:   {type: 'ConfigSecurityKeystoreView', preserve:true},
             configSecurityTruststoreView: {type: 'ConfigSecurityTruststoreView', preserve:true},
             monitorGatewaysView:          {type: 'MonitorGatewaysView', preserve:true},
             monitorServicesView:          {type: 'MonitorServicesView', preserve:true},
             monitorSessionsView:          {type: 'MonitorSessionsView', preserve:true}
         },
         serverRouting: false  // The server is not involved in routing at all
        }
    );
}

