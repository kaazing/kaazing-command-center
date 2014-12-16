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

//-------------------------------------------------------------------------
// Code to support performance testing and debugging. Generally this need
// not be included in the main HTML page or shipped, though it doesn't
// hurt if it is.
//
// When included in the main HTML page, make sure it is early, as other
// files will depend on it, esp. menu support.
//-------------------------------------------------------------------------

var TEST_ENABLED = true;  // flag for the rest of the app to indicate that we want

/* 
 * Compute the approximate memory size, in bytes, of the specified object,
 * walking the object tree and adding any sub-objects to the total.
 * 'ignoreObjects', if given, are a list of objects that should be ignored,
 * which is most easily done by considering them as 'already processed'.
 */
function sizeof(object, ignoreObjects) {
    var objects;
    var size = 0;

    var numBoolean = 0;
    var numNumber = 0;
    var numString = 0;
    var sizeString = 0;  // # characters
    var numArray = 0;
    var numObject = 0;
    var numObjectKey = 0;
    var sizeObjectKey = 0;  // # characters
    var numFunction = 0;
    var numException = 0;

    var item, index, key, len, tmp, tmp2;

    if (ignoreObjects) {
        objects = ignoreObjects;
    } else {
        objects = [];
    }

    objects.push(object);

    function processPrimitive(item, type) {
        switch (type) {
        case 'boolean': 
            size += 4; 
            numBoolean++;
            break;
        case 'number': 
            size += 8; 
            numNumber++;
            break;
        case 'string': 
            len = item.length;
            size += len * 2;
            numString++;
            sizeString += len;
            break;
        case 'function':
            numFunction++;
            break;
        case 'null':
        case 'undefined':
            break;
        default:
            alert('Found unknown item ' + item + ' of type ' + type);
        }
    }

    function isSystemObj(item) {
        return (item === window || 
                item === navigator || 
                item === localStorage);
    }

    function processItem(item, itemType) {
        if (itemType !== 'array' && itemType !== 'object') {
            processPrimitive(item, itemType);
        } else if (isSystemObj(item)) {
            CC.console.log('Ignoring system object');
        } else if (objects.indexOf(item) >= 0) {
            CC.console.log('Ignoring already-seen object');
        } else {
            CC.console.log('pushing item of type [' + itemType + ']');
            objects.push(item);
        }
    }

    // do equivalent to a breadth-first search, in that items inside
    // objects are added to the object array.
    for (var itemIndex = objects.indexOf(object); itemIndex < objects.length; itemIndex ++) {
        if (itemIndex % 100 == 0) {
            CC.console.log('checking obj #' + itemIndex);
        }

        // determine the type of the object
        var item = objects[itemIndex];
        var type = typeOf(item);

        if (type === 'array') {
            //CC.console.log('Found array');
            numArray++;
            for (var i = 0; i < item.length; i++) {
                processItem(item[i], typeOf(item[i]));
            }
        } else if (type !== 'object') {
            processPrimitive(item, type);
        } else {
            //CC.console.log('Found object');
            numObject++;

            // loop over the keys, checking the values. Any that have not
            // been processed go into the object array for processing.
            for (key in item) {
                // add the key size
                size += 2 * key.length;
                numObjectKey++;
                sizeObjectKey += key.length;

                CC.console.log('Found object key [' + key + ']');

                // Sometimes we get things like DOMExceptions when trying
                // to fetch what ostensibly is an attribute value. For example,
                // SVGLength is an object with 'value', but that returns
                // a DOMException]. We'll ignore those.
                try {
                    processItem(item[key], typeOf(item[key]));
                } catch (ex) {
                    numException++;
                }
            }
        }
    }

    // return the size data
    return [size, numBoolean, numNumber, numString, sizeString, 
            numArray, numObject, numObjectKey, sizeObjectKey, numFunction, numException];
}

function countClusterSize(clusterModel) {
    var ignoreObjects = [clusterModel];

    var gatewayModel = clusterModel.getGateways()[0];
    ignoreObjects.push(gatewayModel);

    var serviceModel = null;

    var services = gatewayModel.getServices();
    for (var i = 0; i < services.length; i++) {
        var service = services[i];

        if (service.get('serviceLabel') == 'performance proxy') {
            serviceModel = service;
        }

        ignoreObjects.push(service);
    }

    var spdm = serviceModel.get('serviceProcessingDataModels').item(0);

    var sizeData = sizeof(spdm, ignoreObjects);
    alert('The first service processing data model in service [' + serviceModel.get('serviceLabel') + 
          ' takes up approximately:\n' + 
          sizeData[0] + ' bytes overall\n' + 
          sizeData[1] + ' booleans\n' + 
          sizeData[2] + ' numbers\n' + 
          sizeData[3] + ' strings (' + sizeData[4] + ' chars)\n' +
          sizeData[5] + ' arrays\n' + 
          sizeData[6] + ' objects (' + sizeData[7] + 
          ' keys taking ' + sizeData[8] + ' chars)\n' + 
          sizeData[9] + ' functions\n' + 
          sizeData[10] + ' unreadable object properties');
    return ignoreObjects;
}

function countSpdmSize(clusterModel) {
    var totals = countModelObjects(clusterModel);
    var spdmList = totals['sessionProcessingDataModels'];
    var ignoreList = [];
}

/**
 * Given a cluster model, count the various types of objects it contains
 * that are considered Kaazing model objects.
 */
function countModelObjects(clusterModel) {
    var totals = {clusterModels: [], 
                  clusterConfigModels: [],
                  cpuListModels: [],
                  cpuListSummaryDataItems: [],
                  gatewayModels: [],
                  gatewayConfigModels: [],
                  gatewayProcessingDataModels: [],
                  jvmModels: [],
                  jvmSummaryDataItems: [],
                  licenseConfigModels: [],
                  networkConfigModels: [],
                  nicListModels: [],
                  nicListSummaryDataItems: [],
                  realmConfigModels: [],
                  securityConfigModels: [],
                  serviceConfigModels: [],
                  serviceDefaultsConfigModels: [],
                  serviceModels: [],
                  serviceProcessingDataModels: [],
                  sessionModels: [],
                  sessionProcessingDataModels: [],
                  systemModels: [],
                  systemSummaryDataItems: []};

    function processClusterModel(clusterModel) {
        if (addModel('clusterModels', clusterModel)) {
            var gateways = clusterModel.get('gatewayModels');
            if (gateways) {
                // modelList
                gateways.values().forEach(function(gw) {
                    processGatewayModel(gw);
                });
            }

            gateways = clusterModel.get('inProcessGatewayModels');
            // array
            gateways.forEach(function(gw) {
                processGatewayModel(gw);
            });
        }
    }

    function processGatewayModel(gatewayModel) {
        if (addModel('gatewayModels', gatewayModel)) {
            processGatewayConfigModel(gatewayModel.get('gatewayConfig'));

            var gpdmList = gatewayModel.get('gatewayProcessingDataModels');
            for (var i = 0; i < gpdmList.size(); i++) {
                processGatewayProcessingDataModel(gpdmList.item(i));
            }

            var systemModel = gatewayModel.get('systemModel');
            if (systemModel) {
                processSystemModel(systemModel);
            }

            var cpuListModel = gatewayModel.get('cpuListModel');
            if (cpuListModel) {
                processCpuListModel(cpuListModel);
            }

            var nicListModel = gatewayModel.get('nicListModel');
            if (nicListModel) {
                processNicListModel(nicListModel);
            }

            var jmvModel = gatewayModel.get('jmvModel');
            if (jmvModel) {
                processJmvModel(jmvModel);
            }

            var services = gatewayModel.getServices();
            if (services) {
                services.forEach(function(serviceModel) {
                    processServiceModel(serviceModel);
                });
            }
        }

    }

    function processGatewayConfigModel(gatewayConfigModel) {
        if (addModel('gatewayConfigModels', gatewayConfigModel)) {
            var clusterConfigModel = gatewayConfigModel.get('clusterConfig');
            if (clusterConfigModel) {
                processClusterConfigModel(clusterConfigModel);
            }

            var licenseConfigModel = gatewayConfigModel.get('licenseConfig');
            if (licenseConfigModel) {
                processLicenseConfigModel(licenseConfigModel);
            }

            var networkConfigModel = gatewayConfigModel.get('networkConfig');
            if (networkConfigModel) {
                processNetworkConfigModel(networkConfigModel);
            }

            var securityConfigModel = gatewayConfigModel.get('securityConfig');
            if (securityConfigModel) {
                processSecurityConfigModel(securityConfigModel);
            }

            var serviceDefaultsConfigModel = gatewayConfigModel.get('serviceDefaultsConfig');
            if (serviceDefaultsConfigModel) {
                processServiceDefaultsConfigModel(serviceDefaultsConfigModel);
            }

            var serviceConfigModels = gatewayConfigModel.get('serviceConfigs');
            if (serviceConfigModels) {
                serviceConfigModels.forEach(function(serviceConfigModel) {
                    processServiceConfigModel(serviceConfigModel);
                })
            }
        }
    }

    function processClusterConfigModel(clusterConfigModel) {
        addModel('clusterConfigModels', clusterConfigModel);
    }

    function processLicenseConfigModel(licenseConfigModel) {
        addModel('licenseConfigModels', licenseConfigModel);
    }

    function processNetworkConfigModel(networkConfigModel) {
        addModel('networkConfigModels', networkConfigModel);
    }

    function processSecurityConfigModel(securityConfigModel) {
        if (addModel('securityConfigModels', securityConfigModel)) {
            var realmConfigModels = securityConfigModel.get('realmConfigs');
            if (realmConfigModels) {
                for (var realmName in realmConfigModels) {
                    processRealmConfigModel(realmConfigModels[realmName]);
                }
            }
        }
    }

    function processRealmConfigModel(realmConfigModel) {
        addModel('realmConfigModels', realmConfigModel);
    }

    function processServiceDefaultsConfigModel(serviceDefaultsConfigModel) {
        addModel('serviceDefaultsConfigModels', serviceDefaultsConfigModel);
    }

    function processServiceConfigModel(serviceConfigModel) {
        addModel('serviceConfigModels', serviceConfigModel);
    }

    function processGatewayProcessingDataModel(gpdm) {
        addModel('gatewayProcessingDataModels', gpdm);
    }

    function processSystemModel(systemModel) {
        if (addModel('systemModels', systemModel)) {
            var summaryData = systemModel.get('summaryData');
            summaryData.forEach(function(item) {
                processSystemSummaryDataItem(item);
            });
        }
    }
    function processSystemSummaryDataItem(systemSummaryDataItem) {
        // we know these are unique
        totals['systemSummaryDataItems'].push(systemSummaryDataItem);
    }


    function processCpuListModel(cpuListModel) {
        if (addModel('cpuListModels', cpuListModel)) {
            var summaryData = cpuListModel.get('summaryData');
            summaryData.forEach(function(item) {
                processCpuListSummaryDataItem(item);
            });
        }
    }
    function processCpuListSummaryDataItem(cpuListSummaryDataItem) {
        // we know these are unique
        totals['cpuListSummaryDataItems'].push(cpuListSummaryDataItem);
    }


    function processNicListModel(nicListModel) {
        if (addModel('nicListModels', nicListModel)) {
            var summaryData = nicListModel.get('summaryData');
            summaryData.forEach(function(item) {
                processNicListSummaryDataItem(item);
            });
        }
    }
    function processNicListSummaryDataItem(nicListSummaryDataItem) {
        // we know these are unique
        totals['nicListSummaryDataItems'].push(nicListSummaryDataItem);
    }


    function processJvmModel(jvmModel) {
        if (addModel('jvmModels', jvmModel)) {
            var summaryData = jvmModel.get('summaryData');
            summaryData.forEach(function(item) {
                processJvmSummaryDataItem(item);
            });
        }
    }
    function processJvmSummaryDataItem(jvmSummaryDataItem) {
        // we know these are unique
        totals['jvmSummaryDataItems'].push(jvmSummaryDataItem);
    }

    function processServiceModel(serviceModel) {
        if (addModel('serviceModels', serviceModel)) {
            var spdmList = serviceModel.get('serviceProcessingDataModels');
            for (var i = 0; i < spdmList.size(); i++) {
                processServiceProcessingDataModel(spdmList.item(i));
            }

            var sessions = serviceModel.getSessions();
            if (sessions) {
                sessions.forEach(function(sessionModel) {
                    processSessionModel(sessionModel);
                });
            }
        }
    }

    function processServiceProcessingDataModel(spdm) {
        // we know these are unique
        totals['serviceProcessingDataModels'].push(spdm);
    }

    function processSessionModel(sessionModel) {
        if (addModel('sessionModels', sessionModel)) {
            var spdmList = sessionModel.get('sessionProcessingDataModels');
            for (var i = 0; i < spdmList.size(); i++) {
                processSessionProcessingDataModel(spdmList.item(i));
            }
        }
    }

    function processSessionProcessingDataModel(spdm) {
        // we know the session models are unique.
        totals['sessionProcessingDataModels'].push(spdm);
    }

    /**
     * Try to add a model with a given type name (corresponds to the
     * prop names in totals to the list. If it is already there, does
     * nothing.
     */
    function addModel(type, model) {
        var list = totals[type];
        if (list.indexOf(model) < 0) {
            list.push(model);
            return true;
        } 

        return false;
    }

    
    // Start the processing.
    processClusterModel(clusterModel);

    var msg = 'Counts of the various types of model objects in the cluster tree:\n';
    for (var prop in totals) {
        msg += (prop + ": " + totals[prop].length + '\n');
    }

    alert(msg);
    return totals;
}

function countBytesRead(clusterModel) {
    var gateways = clusterModel.getGateways();
    var result = "Read since connection:\n";

    if (gateways) {
        for (var i = 0; i < gateways.length; i++) {
            var gateway = gateways[i];
            var mngtApi = gateway.get('mngtApi');
            var bytesRead = mngtApi._impl._snmp._bytesRead;
            var fragmentsRead = mngtApi._impl._snmp._fragmentsRead;
            result += (gateway.get('gatewayLabel') + ': ' + 
                       fragmentsRead + ' fragments, ' + bytesRead + ' bytes\n');
        }
    } else {
        result += "  No gateways are connected";
    }

    alert(result);
}

