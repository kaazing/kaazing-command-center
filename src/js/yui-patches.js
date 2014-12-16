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
 * A function to load patches onto the YUI global object before other stuff gets done.
 */

function setupYUIPatches() {

    /*
     * A patch from the YUI guys to fix the problem with refreshRow when the changed
     * field in an object is not one of the columns in the DataTable.
     */
    YUI.add('dt-refresh-row-patch',
            function (Y) {
                "use strict";

                function DataTableRefreshRowPatch() {
                }

                DataTableRefreshRowPatch.prototype = {
                    initializer: function () {

                        this.onceAfter('render', function () {
                            this.body.refreshRow = function (row, model, columns) {
                                var key,
                                cell,
                                len = columns.length,
                                i;

                                for (i = 0; i < len; i++) {
                                    key = columns[i];
                                    cell = row.one('.' + this.getClassName('col', key));
                                    // a changed column may not be in the list of displayed columns
                                    if (cell) {
                                        this.refreshCell(cell, model);
                                    }
                                }

                                return this;
                            };
                        });
                    }
                };

                Y.DataTable.RefreshRowPatch = DataTableRefreshRowPatch;
            }, '0.1', {requires: ['datatable']});
}
