/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

/**
 * The View for displaying a property table for attributes of one of
 * our model objects.
 * We're relying internally on the Y.Datatable for most functionality
 * but I'll add functionality to do the transformation as needed.
 * It's assumed that the incoming 
 */
function definePropertyTable(Y) {
    Y.PropertyTable = Y.Base.create('propertyTable', Y.View, [], {

        initializer: function() {
            var $this = this;

            // Define the parts we're going to use to construct the Datatable
            // instance.
            var columns = [
                {key: 'propertyName', 
                 label: 'Property Name', 
                 allowHTML: true, 
                 emptyCellValue: "", 
                 formatter: function(o) {return $this.formatName(o);},
                },
                {key: 'propertyValue', 
                 label: 'Property Value', 
                 allowHTML: true, 
                 emptyCellValue: "",
                 formatter: function(o) {return $this.formatValue(o);},
                }
            ];
            
            var properties = this.get('properties');
            var data = [];

            properties.forEach(function(property) {
                var key = property.key;
                var fieldData = {propertyName: key, propertyValue: null };
                data.push(fieldData);
            });

            this.set('table', new Y.DataTable({columns: columns,
                                               data: data}));

            if (this.get('object')) {
                this.processObject();
            }
        },

        // Called to update the object.
        update: function(newObj) {
            this.set('object', newObj);
            this.processObject();
        },

        // Process the data for a given instance of an object by replacing the row values.
        processObject: function() {
            var obj = this.get('object');

            var properties = this.get('properties');

            for (var i = 0; i < properties.length; i++) {
                var value = null;

                var propDefn = properties[i];
                var key = propDefn.key;

                // Get value. Assumes our object is a YUI obj with ATTRS.  Need something better!
                if (obj) {
                    value = obj.get(key);
                }

                var fieldData = {propertyValue: value};

                this.get('table').modifyRow(i, fieldData);
            }
        },

        render: function(parentNode) {
            return this.get('table').render(parentNode);
        },

        // Function used to format values in the 'name' column.  
        // Object contains: value, data, record, column, className, rowIndex, rowClass.
        formatName: function(o) {
            o.className += "label";
            var properties = this.get('properties');
            var propDefn = properties[o.rowIndex];
            var val;

            if (propDefn.label) {
                val = propDefn.label;
            } else if (propDefn.key) {
                val = propDefn.key;
            }
            
            // we control the column formatting on this one.
            return val;
        },

        // Function used to format values in the 'value' column.  
        // Object contains: value, data, record, column, className, rowIndex, rowClass.
        formatValue: function(o) {
            var propDefn = this.get('properties')[o.rowIndex];
            var val = o.value;
            
            if (val === undefined || val === null || val === "") {
                if (propDefn.emptyCellValue !== undefined && 
                    propDefn.emptyCellValue !== null) {
                    return propDefn.emptyCellValue;
                } else {
                    return "";
                }
            }

            if (typeof propDefn.formatter === 'function') {
                return propDefn.formatter(o);
            } else if (typeof propDefn.formatter === "string") {
                // take the string and run through the various parts of 'o', substituting.
                // I only support first-level references.
                val = propDefn.formatter;
                val = val.replace('${value}', o.value);
                return val;
            }

            return val;
        },

    }, {
        ATTRS: {
            table: {
                value: null
            },

            // The current instance of the object that we're displaying
            object: {
                value: null
            },

            // I'm trying to make it so that I allow the same definitions
            // as for 'columns' in the regular dataTable, then provide
            // custom formatting functions and data access to provide the
            // same output.
            // For now we'll allow 'label', 'key', 'formatter', 'emptyCellValue',
            // 
            // (cellTemplate allows fields from 'o' to be substituted in.
            //
            // The standard column configurations allow:
            // key, name, field, id, label, children, abbr, headerTemplate,
            // cellTemplate, formatter, emptyCellValue, allowHTML, className,
            // width, sortable, sortFn, sortDir
            properties: {
                value: []
            },
        }
    });
}
