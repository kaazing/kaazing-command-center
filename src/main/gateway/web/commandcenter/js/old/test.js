/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

function testConnect() {
  connectToGatewaySNMP("ws://localhost:8001/snmp");
  //    snmp = new SNMP();
  //    snmp.connect("ws://localhost:8001/snmp");
    //    snmp.connect("ws://192.168.2.101:8001/snmp");
}

function getDescription() {
  snmp.getDescription(printDescription);
}

function printDescription(desc) {
  if ((desc != null) && (desc.values != undefined)) {
    var descDiv = document.getElementById("desc");
    var oid;
    var description;

    for (var propName in desc.values) {
        oid = propName;
        description = desc.values[propName];
    }

    descDiv.innerHTML = "<span>" + oid + " = " + description + "</span>";
  }
}

function clearDescription() {
  var descDiv = document.getElementById("desc");
  descDiv.innerHTML = "<span></span>";
}

function getUptime() {
  snmp.getUptime(printUptime);
}

function printUptime(uptime) {
  if ((uptime != null) && (uptime.values != undefined)) {
    var uptimeDiv = document.getElementById("uptime");
    var oid;
    var ticks;

    for (var propName in uptime.values) {
        oid = propName;
        ticks = uptime.values[propName];
    }

    uptimeDiv.innerHTML = "<span>" + oid + " = " + ticks + " ticks (" + ticks / 100 + " sec)</span>";
  }
}

function clearUptime() {
  var uptimeDiv = document.getElementById("uptime");
  uptimeDiv.innerHTML = "<span></span>";
}

function getCurrentSessionCount() {
  snmp.getCurrentSessionCount(printCurrentSessionCount);
}

function printCurrentSessionCount(sessionCount) {
  if ((sessionCount != null) && (sessionCount.values != undefined)) {
    var sessionCountDiv = document.getElementById("sessionCount");
    var oid;
    var numSessions;

    for (var propName in sessionCount.values) {
        oid = propName;
        numSessions = sessionCount.values[propName];
    }

    sessionCountDiv.innerHTML = "<span>" + oid + " = " + numSessions + " current sessions</span>";
  }
}

function clearCurrentSessionCount() {
  var sessionCountDiv = document.getElementById("sessionCount");
  sessionCountDiv.innerHTML = "<span></span>";
}

function getTotalSessionCount() {
  snmp.getTotalSessionCount(printTotalSessionCount);
}

function printTotalSessionCount(totalSessions) {
  if ((totalSessions != null) && (totalSessions.values != undefined)) {
    var totalSessionsDiv = document.getElementById("totalSessions");
    var oid;
    var numSessions;

    for (var propName in totalSessions.values) {
        oid = propName;
        numSessions = totalSessions.values[propName];
    }

    totalSessionsDiv.innerHTML = "<span>" + oid + " = " + numSessions + " total sessions</span>";
  }
}

function clearTotalSessionCount() {
  var totalSessionsDiv = document.getElementById("totalSessions");
  totalSessionsDiv.innerHTML = "<span></span>";
}

function getSessionTable() {
  var t = setTimeout("getSessionTable()", 3000);
  snmp.timer = t;
  snmp.getSessionTable(printSessionTable);
}

function printSessionTable(sessionData) {
  if ((sessionData != null) && (sessionData.values != undefined)) {
    var oid;
    var propValue;

    for (var propName in sessionData.values) {
        oid = propName;
        propValue = sessionData.values[propName];
        updateSessionData(oid, propValue);
    }
  }
}

function stopSessionUpdates() {
  clearTimeout(snmp.timer);
  delete snmp.timer;
}

function clearSessionTable() {
  var sessionsRegionDiv = document.getElementById("sessionsRegion");
  sessionsRegionDiv.innerHTML = "";
}

function updateSessionData(oid, propValue) {
    // now update the DOM with the new propValue... if there
    // is no session element for this OID yet, create it
    var oidArray = oid.split('.');

    // make sure it's a kaazing oid
    if (oidArray.length < 7 || parseInt(oidArray[6], 10) != 29197) {
        return;
    }

    var rowId = oidArray[oidArray.length - 1];
    var columnId = parseInt(oidArray[oidArray.length - 2], 10);

    var sessionDiv = document.getElementById("session"+rowId);
    if ((sessionDiv === null) || (sessionDiv === undefined)) {
        sessionDiv = document.createElement("div");
        sessionDiv.id = "session"+rowId;
        sessionDiv.className = "session-block";
        sessionDiv.innerHTML = document.getElementById("newSession").innerHTML;

        var sessionRegionDiv = document.getElementById("sessionsRegion");
        sessionRegionDiv.appendChild(sessionDiv);
    }

    // columnId will tell us which property
    //    2 - service name
    //    3 - service description
    //    4 - current session count
    //    5 - total session count
    //    6 - bytes received
    //    7 - bytes sent
    //
    // <HACK-ALERT>ugly code, quick and dirty to get the table updating</HACK-ALERT>
    switch (columnId) {
    case 2: // name
        updateServiceName(sessionDiv, propValue);
        break;
    case 3: // description
        updateServiceDescription(sessionDiv, propValue);
        break;
    case 4:
        updateCurrentSessionCount(sessionDiv, propValue);
        break;
    case 5:
        updateTotalSessionCount(sessionDiv, propValue);
        break;
    case 8:
        updateBytesReceived(sessionDiv, propValue);
        break;
    case 9:
        updateBytesSent(sessionDiv, propValue);
        break;
    }
}

function updateObjectName(sessionDiv, propValue) {
  var objectNameElement = sessionDiv.childNodes[1];
  //  objectNameElement.innerHTML = "<span class=\"object-name\">" + propValue + "</span>";
  objectNameElement.innerHTML = propValue;
}

function updateServiceName(sessionDiv, propValue) {
  var objectNameElement = sessionDiv.childNodes[1];
  //  objectNameElement.innerHTML = "<span class=\"object-name\">" + propValue + "</span>";
  objectNameElement.innerHTML = propValue;
}

function updateServiceDescription(sessionDiv, propValue) {
  var objectNameElement = sessionDiv.childNodes[2];
  //  objectNameElement.innerHTML = "<span class=\"object-name\">" + propValue + "</span>";
  objectNameElement.innerHTML = propValue;
}

function updateCurrentSessionCount(sessionDiv, propValue) {
  var currentSessionCountElement = sessionDiv.childNodes[4].childNodes[3].childNodes[2];
  //  currentSessionCountElement.innerHTML = "<span class=\"row-value\">" + propValue + "</span>";
  currentSessionCountElement.innerHTML = propValue;
}

function updateTotalSessionCount(sessionDiv, propValue) {
  var totalSessionCountElement = sessionDiv.childNodes[4].childNodes[7].childNodes[2];
  //  totalSessionCountElement.innerHTML = "<span class=\"row-value\">" + propValue + "</span>";
  totalSessionCountElement.innerHTML = propValue;
}

function updateBytesReceived(sessionDiv, propValue) {
  var bytesReceivedElement = sessionDiv.childNodes[4].childNodes[3].childNodes[8];
  //  bytesReceivedElement.innerHTML = "<span class=\"row-value\">" + propValue + "</span>";
  bytesReceivedElement.innerHTML = propValue;
}

function updateBytesSent(sessionDiv, propValue) {
  var bytesSentElement = sessionDiv.childNodes[4].childNodes[7].childNodes[8];
  //  bytesSentElement.innerHTML = "<span class=\"row-value\">" + propValue + "</span>";
  bytesSentElement.innerHTML = propValue;
}

function startNotifListener() {
  snmp.startNotifListener(printNotif);
}

function printNotif(notif) {
  var notifDiv = document.getElementById("notifRegion");

  var pre = document.createElement("pre");
  pre.style.wordWrap = "break-word";
  if (notif != null && notif != undefined) {
    var notifData = notif.type + " -- ";

    if (notif.values != null && notif.values != undefined) {
      var oid;
      var propValue;

      for (var propName in notif.values) {
        notifData = notifData + "(oid:" + propName + "; value:" + notif.values[propName] + ") -- ";

        oid = propName;
        propValue = notif.values[propName];
        updateSessionData(oid, propValue);
      }
    }

    pre.innerHTML = notifData;
  }

  notifDiv.insertBefore(pre, notifDiv.firstChild);
  while (notifDiv.childNodes.length > 25) {
    notifDiv.removeChild(notifDiv.lastChild);
  }
}
