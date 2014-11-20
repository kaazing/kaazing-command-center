/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
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