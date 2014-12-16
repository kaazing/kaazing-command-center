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
 * The View for displaying data from the JvmContainerModel (gateway.jvmContainer)
 * that contains all the JVMModel instances.)
 * The model is set in gatewayView.afterModelChange.
 */
function defineJVMView(Y) {
    Y.JVMView = Y.Base.create('jvmView', Y.View, [], {
        events: {
            '#jvmTable button': {click: 'handleGraphButtonClick'},
            '#jvmTable input[type=button]': {click: 'handleGraphButtonClick'}
        },
        
        initializer: function() {
            var $this = this;

            // XXX For some reason things don't seem to work with defining
            // container.valueFn(), so I'll force the issue here.
            // FIX THIS LATER!
            $this.set('container', "#jvmInfo");

            // If we are passed an initial JvmContainerModel, set up to use that.
            var model = $this.get('model'); 

            // if this view has a model, bubble model events to the view.
            model && model.addTarget($this);

            // The only thing that will swap out our model is when the GatewayView
            // model changes and we need to resynchronize. We'll do that by adding
            // a handler for 'modelChange' on the gatewayView, then change our
            // model accordingly and hook up to bubble events from it.
            // Note: I'm not bubbling all events to here, just this particular one.
            var gatewayView = this.get('gatewayView');
            gatewayView.after('modelChange', $this.afterGWModelChange, $this);

            // if the model gets swapped out, reset targets accordingly.
            // We can make good use of this to switch the same
            // view among various model objects, rather than creating
            // a separate View object for each.
            $this.after('modelChange', $this.afterModelChange, $this);

            // we're only creating a single view.
            $this.after('modelList:add', $this.afterAdd, $this);
        },

        afterGWModelChange: function(e) {
            // Somebody changed the GW model, so we need to change ours.
            // We're passed in a GatewayModel (or null)
            if (e.newVal) {
                var gwContainer = e.newVal;
                this.set('model', gwContainer.get('jvmContainer'));
            } else {
                this.set('model', null);  // should cause a ripple to change.
            }
        },

        afterModelChange: function(e) {
            // when the model itself is swapped out (i.e. by afterGWModelChange)
            e.prevVal && e.prevVal.removeTarget(this);
            e.newVal &&  e.newVal.addTarget(this);
            this.render();
        },

        afterAdd: function(e) {
            this.render();
        },

        render: function() {
            var jvmContainer = this.get('model'); 

            var jvmModel = (jvmContainer ? jvmContainer.getInstance(-1) : null);

            var renderFieldMap = this.get('renderFieldMap');

            for (var fieldId in renderFieldMap) {
                var value = (jvmModel ? jvmModel.get(renderFieldMap[fieldId]) : "");
                replaceTextValue('#' + fieldId, value);
            }

            return this;
        },

        handleGraphButtonClick: function(e) {
            // the ID of the clicked button has the attribute name for 
            // the data of interest, with 'Button' on the end
            var buttonId = e.target.get('id');
            // remove lead 'jvm' and trail 'Button'
            var fieldName = buttonId.substring(3, buttonId.indexOf("Button"));  
            fieldName = fieldName.substring(0,1).toLowerCase() + fieldName.substring(1);
            var gwView = this.get('gatewayView');
            var graphView = gwView.get('graphView');
            graphView.setTarget({modelList: this.get('model').getInstanceList(), 
                                 graphAttributeName: fieldName});
        }
    }, {
        // Specify attributes and static properties for your View here.
         // Specify attributes and static properties for your View here.
        // reference so we can find the JVM view
        ATTRS: {
            gatewayView: {
                value: null
            },

            // override default 'container' attribute, since
            // we already have a container.  Must use 'valueFn'.
/*
            container: {
                valueFn: function() {
                    return Y.one("#jvmInfo");
                }
            }
*/
            renderFieldMap: {
                value: {
                    // display field ID, data field name
                    jvmGatewayIdValue: 'gatewayId',
                    jvmClassesLoadedValue: 'classesLoaded',
                    jvmTotalClassesLoadedValue: 'totalClassesLoaded',
                    jvmTotalClassesUnloadedValue: 'totalClassesUnloaded',
                    jvmThreadingLiveThreadsValue: 'threadingLiveThreads',
                    jvmThreadingPeakThreadsValue: 'threadingPeakThreads',
                    jvmThreadingTotalThreadsValue: 'threadingTotalThreads',

                    jvmMemHeapInitSizeValue: 'memHeapInitSize',
                    jvmMemHeapUsedValue: 'memHeapUsed',
                    jvmMemHeapCommittedValue: 'memHeapCommitted',
                    jvmMemHeapMaxSizeValue: 'memHeapMaxSize',

                    jvmMemNonHeapInitSizeValue: 'memNonHeapInitSize',
                    jvmMemNonHeapUsedValue: 'memNonHeapUsed',
                    jvmMemNonHeapCommittedValue: 'memNonHeapCommitted',
                    jvmMemNonHeapMaxSizeValue: 'memNonHeapMaxSize'
                }
            }
        }
   });
}
