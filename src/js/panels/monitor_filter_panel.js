/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

/*jslint devel: true,  undef: true, newcap: true, strict: true, maxerr: 50 */

/*global YUI*/

/**
 * The monitor-filter-panel module provides the filter dialog (currently used
 * by the various monitor views in the Kaazing Command Center application).
 *
 * @module monitor-filter-panel
 */
YUI.add('monitor-filter-panel', function(Y) {
    "use strict";

    // handy constants and shortcuts used in the module
    var Lang = Y.Lang,
    NAME = 'monitorFilterPanel',
    ALPHA_TYPE = 'alpha',
    NUMERIC_TYPE = 'numeric',
    FUNCTION_TYPE = 'function';

    Y.MonitorFilterPanel = Y.Base.create(
        NAME,
        Y.Panel, 
        [Y.WidgetInheritCss], 
        {
            maxFilters: 10,
            firstTime: true,

            initializer: function() {
                this.plug(Y.Plugin.Drag, {handles: ['.yui3-widget-hd']});
                this.dd.plug(Y.Plugin.DDConstrained, {constraint2node: '#content'});
                this.set('dragObj', new Y.DD.Drag({node: '#monitorFilterPanel'}));
            },

            // Create a single field-selection list, or update an existing
            // one if already there.
            buildFieldNameSelector: function(container, index, enabled) {
                var id = 'monitorFilterFieldName_' + index;

                var selector = container.one('#' + id);

                if (!selector) {
                    selector = createSELECT(container, 'monitorFilterFieldName')
                        .set('id', 'monitorFilterFieldName_' + index)
                        .set('tabIndex', 1 + (index * 3))
                        .setStyle('top', 30 * index);

                    selector.on('click', this.clickedFilter, this);
                    selector.on('change', this.selectedFilter, this);
                }

                // because we're re-calling the same filter mechanism from various
                // views, we need to reset the options every time.
                removeAllChildren(selector);

                this.addOption(selector, '', 'Choose...');

                var fieldDefinitions = this.get('fieldDefinitions');

                for (var i = 0; i < fieldDefinitions.length; i++) {
                    var fld = fieldDefinitions[i];
                    this.addOption(selector, fld[0], fld[1]);
                }

                selector.set('selectedIndex', 0);  // hope this doesn't trigger anything
                selector.set('disabled', !enabled);

                return selector;
            },

            buildAndDiv: function(container, index, enabled) {
                var id = 'monitorFilterAnd_' + index;

                var oldAnd = container.one('#' + id);

                var newAnd = container.create('<DIV>')
                    .addClass('monitorFilterAnd')
                    .set('text', 'and')
                    .set('id', 'monitorFilterAnd_' + index)
                    .setAttribute('disabled', !enabled)
                    .setStyle('top', 30 * index);

                if (oldAnd) {
                    container.replaceChild(newAnd, oldAnd);
                } else {
                    container.append(newAnd);
                }

                return newAnd;
            },

            /**
             * Build the condition selector for a given type of field.
             * Note that 'alphaNumeric' == true means "the field allows numbers,
             * or allows any alpha string, but is not a selection from a list."
             * This is done because it's legal to do < or > comparisons for
             * alpha strings, but not for list items.
             * It does NOT mean "the field allows numbers or alphas, we don't care which".
             */
            buildConditionSelector: function(container, index, valueType, enabled) {
                var id = 'monitorFilterCondition_' + index;

                var oldSelector = container.one('#' + id);

                var newSelector = container.create('<SELECT>')
                    .addClass('monitorFilterCondition')
                    .set('id', 'monitorFilterCondition_' + index)
                    .set('disabled', !enabled)
                    .set('tabIndex', 2 + (index * 3))
                    .setStyle('top', 30 * index);

                if (valueType) {
                    this.addOption(newSelector, 'SET', 'is set');
                    this.addOption(newSelector, 'UNSET', 'is not set');
                    this.addOption(newSelector, 'EQ', '==');
                    this.addOption(newSelector, 'NEQ', '!=');
                }

                if (valueType === ALPHA_TYPE || valueType === NUMERIC_TYPE) {
                    this.addOption(newSelector, 'LEQ', '<=');
                    this.addOption(newSelector, 'LT', '<');
                    this.addOption(newSelector, 'GT', '>');
                    this.addOption(newSelector, 'GEQ', '>=');
                }

                if (valueType === ALPHA_TYPE) {
                    this.addOption(newSelector, 'CONTAIN', 'contains');
                    this.addOption(newSelector, 'NOT_CONTAIN', 'does not contain');
                    this.addOption(newSelector, 'START', 'starts with');
                    this.addOption(newSelector, 'END', 'ends with');
                }

                if (oldSelector) {
                    container.replaceChild(newSelector, oldSelector);
                } else {
                    container.append(newSelector);
                }

                return newSelector;
            },

            /**
             * Build a text entry for a filter value.
             */
            buildTextValueEntry: function(container, index, valueType, enabled) {
                var id = 'monitorFilterValue_' + index;

                var oldEntry = container.one('#' + id);

                var newEntry = container.create('<INPUT>')
                    .addClass('monitorFilterValue')
                    .set('id', id)
                    .set('type', (valueType === NUMERIC_TYPE ? 'number' : 'text'))
                    .set('disabled', !enabled)
                    .set('tabIndex', 3 + (index * 3))
                    .setStyle('top', 30 * index)

                if (oldEntry) {
                    container.replaceChild(newEntry, oldEntry);
                } else {
                    container.append(newEntry);
                }

                return newEntry;
            },

            /**
             * Build a select for a filter value.
             */
            buildSelectValueEntry: function(container, index, values, enabled) {
                var id = 'monitorFilterValue_' + index;

                var oldEntry = container.one('#' + id);

                var newEntry = container.create('<SELECT>')
                    .addClass('monitorFilterValue')
                    .set('id', id)
                    .set('selectedIndex', 0)
                    .setStyle('top', 30 * index)
                    .set('disabled', !enabled)
                    .set('tabIndex', 3 + (index * 3))
                    .setStyle('top', 30 * index);

                for (var i = 0; i < values.length; i++) {
                    this.addOption(newEntry, values[i], values[i])
                }

                if (oldEntry) {
                    container.replaceChild(newEntry, oldEntry);
                } else {
                    container.append(newEntry);
                }

                return newEntry;
            },

            /**
             * The user has clicked on a particular option in the 'field' selector.
             * Adjust the condition and value items as necessary.
             */
            selectedFilter: function(ev) {
                var $this = this;
                var fieldNameSelector = ev.target;
                var fieldName = fieldNameSelector.get('value');

                var id = fieldNameSelector.get('id');
                var index = parseInt(id.substring(id.lastIndexOf('_') + 1), 10);  // filter #
                var listDiv = fieldNameSelector.get('parentNode');

                if (fieldName === '') {
                    // the 'Choose...' item, reset stuff and turn it off
                    this.buildConditionSelector(listDiv, index, null, false);
                    this.buildTextValueEntry(listDiv, index, null, false);

                    for (var i = index + 1; i < this.maxFilters; i++) {
                        var fieldAnd = this.buildAndDiv(listDiv, i, false);
                        var fieldNameSelector = this.buildFieldNameSelector(listDiv, i, false, false);
                        var conditionSelector = this.buildConditionSelector(listDiv, i, null, false);
                        var valueEntry = this.buildTextValueEntry(listDiv, i, null, false);
                    }

                    return;
                }

                var fieldDefinition = this.getFieldDefinition(fieldName);

                var valueType = fieldDefinition[2];

                this.buildConditionSelector(listDiv, index, valueType, true);

                if (typeOf(valueType) === FUNCTION_TYPE) {
                    // The value type is really a function that when run will generate
                    // a list of values to be shown as selection options.
                    var filterEntries = this.gatherFilterEntries();
                    this.buildSelectValueEntry(listDiv, index, valueType(filterEntries), true);
                } else {
                    this.buildTextValueEntry(listDiv, index, valueType, true);
                }

                // Turn on the condition and value for the field selector
                // for the next row, so the user can set it. We already did
                // the new ones on our row by creating the new elements above.
                if (index < this.maxFilters - 1) {
                    listDiv.one('#monitorFilterAnd_' + (index + 1)).setAttribute('disabled', false);
                    listDiv.one('#monitorFilterFieldName_' + (index + 1)).set('disabled', false);
                }
            },

            /**
             * Check the character entered in an input, click 'Search' if the
             * user hit CR.
             */
            checkEnter: function(e) {
                var code = (e.keyCode ? e.keyCode : e.which);
                if (code === 13) {
                    e.preventDefault();
                    var searchButton = Y.one("#sessionsSearchButton");
                    searchButton.simulate('click');
                }
            },

            /**
             * Configure the items and set the filter object we're dealing with, if any.
             */
            display: function(clusterModel, filter, filterFieldDefinitions, callback) {
                this.set('clusterModel', clusterModel);
                this.set('fieldDefinitions', filterFieldDefinitions);
                this.set('callback', callback);

                // Configure the fields here to be the same as the filter, if any.
                // Also, configure to allow the dialog to be dragged around the window,
                // even though it is still modal.
                if (this.firstTime) {
                    this.render();
                    this.firstTime = false;
                } else {
                    // Show and center the panel (gets around a YUI 3.11.0 bug).
                    centerPanel(this);
                }

                this.assignFilters(null);  // clear everything
                this.assignFilters(filter);

                this.get('contentBox').one('#monitorFilterFieldName_0').focus();
            },

            /** 
             * Given the incoming filter structure, figure out how to assign the
             * field names, operators and values to the relevant inputs we defined.
             */
            assignFilters: function(filter) {

                var contentBox = this.get('contentBox');
                var listDiv = contentBox.one('#monitorFilterListDiv');
                var numSubFilters = 0;

                if (filter !== undefined && filter !== null) {
                    // the top level, if given, is always an AndFilter, for now.
                    var subFilters = filter.getSubFilters();

                    numSubFilters = subFilters.length;

                    var andDiv = null;
                    var fieldNameSelector = null;

                    for (var index = 0; index < numSubFilters; index++) {
                        var subFilter = subFilters[index];
                        var fieldDefinition = this.getFieldDefinition(subFilter.attribute);
                        var valueType = fieldDefinition[2];

                        if (index > 0) {
                            andDiv = listDiv.one('#monitorFilterAnd_' + index);

                            if (!andDiv) {
                                andDiv = this.buildAndDiv(listDiv, index, true);
                            } else {
                                andDiv.setAttribute('disabled', false);
                            }
                        }

                        fieldNameSelector = listDiv.one('#monitorFilterFieldName_' + index);
                        if (!fieldNameSelector) {
                            fieldNameSelector = this.buildFieldNameSelector(listDiv, index, true);
                        } else {
                            fieldNameSelector.set('disabled', false);
                        }

                        this.setSelectItem(fieldNameSelector, subFilter.attribute);


                        var conditionSelector = this.buildConditionSelector(listDiv, index, valueType, true);
                        this.setSelectItem(conditionSelector, subFilter.operator);

                        var valueEntry = null;
                        if (typeOf(valueType) === 'function') {
                            valueEntry = this.buildSelectValueEntry(listDiv, index, valueType(), true);
                            this.setSelectItem(valueEntry, subFilter.value);
                        } else {
                            valueEntry = this.buildTextValueEntry(listDiv, index, valueType, true);
                            this.setTextItem(valueEntry, subFilter.value);
                        }
                    }
                }

                for (var i = numSubFilters; i < this.maxFilters; i++) {
                    if (i > 0) {
                        this.buildAndDiv(listDiv, i, (i === numSubFilters));
                    }

                    this.buildFieldNameSelector(listDiv, i, (i === numSubFilters));
                    this.buildConditionSelector(listDiv, i, null, false);
                    this.buildTextValueEntry(listDiv, i, null, false);
                }
            },

            addOption: function(select, value, label) {
                var option = createOPTION(select, null, label, value);
            },

            // Set the selected index to the item that has the given value
            setSelectItem: function(select, value) {
                var options = select.get('options');   // NodeList
                for (var i = 0; i < options.size(); i++) {
                    var option = options.item(i);
                    if (option.get('value') === value) {
                        select.set('selectedIndex', i);
                    }
                }
            },

            // A parallel to setSelectItem just so things look similar in callers
            setTextItem: function(inputNode, value) {
                inputNode.set('value', "" + value);
            },

            /**
             * Run through the various fields as initialized or as set by the 
             * user and collect a 2D list of entries, one per row. This is 
             * used in two places: during handling of the OK button, and 
             * when the user chooses a field definition that has a function
             * for returning the list of choices for the value dropdown.
             * Note that we do not attempt to verify that any fields are valid,
             * just return whatever rows have a field selected.
             */
            gatherFilterEntries: function() {
                var entries = [];

                for (var i = 0; i < this.maxFilters; i++) {
                    var fieldNameNode = Y.one('#monitorFilterFieldName_' + i);
                    var fieldName = fieldNameNode.get('value'); 
                    if (!fieldName || fieldName === '') {
                        // the 'choose' option, ignore
                        continue;
                    }

                    var conditionNode = Y.one('#monitorFilterCondition_' + i);
                    var condition = conditionNode.get('value');

                    var valueNode = Y.one('#monitorFilterValue_' + i);
                    var value = valueNode.get('value').trim();

                    var entry = [fieldName, condition, value];  // value is a string
                    entries.push(entry);  // note that we know all the entries that are set are in order.
                }

                return entries;
            },

            // handle the user pressing the Clear button
            handleClearButton: function(e) {
                e.preventDefault();
                this.assignFilters(null);
            },
            
            // handle the user pressing the Okay button. 
            handleOkayButton: function(e) {
                e.preventDefault();
                
                var entries = this.gatherFilterEntries();

                // XXX Figure out if any are illegal/invalid? Or just ignore them?
                var errors = [];
                
                var filter = new AndFilter();

                for (var i = 0; i < entries.length; i++) {
                    // we know that all entries have at least a field name.
                    var entry = entries[i];

                    var fieldName = entry[0];
                    var condition = entry[1];
                    var value = entry[2];

                    var fieldDefinition = this.getFieldDefinition(fieldName);

                    if (value === '' && condition !== 'SET' && condition !== 'UNSET') {
                        errors.push("Field '" + fieldDefinition[1] + "' has no value");
                        continue;
                    }

                    var valueType = fieldDefinition[2];
                    if (typeOf(valueType) === 'function') {
                        // list. valueNode is a select, so we know the value is valid (or
                        // is unused, in the case of SET or UNSET)
                        filter.addFilter(new ValueFilter(fieldName, condition, value));
                    } else if (valueType === NUMERIC_TYPE) {
                        if (condition !== 'SET' && condition !== 'UNSET') {
                            if (!isNumeric(value)) {
                                errors.push("Field '" + fieldDefinition[1] + "' must be a number");
                                continue;
                            }
                            value = parseFloat(value);
                        } else {
                            value = '';  // it's ignored, but we'll clear it anyway
                        }
                        filter.addFilter(new NumericFilter(fieldName, condition, value));
                    } else {
                        filter.addFilter(new AlphaFilter(fieldName, condition, value));
                    }
                }

                if (errors.length > 0) {
                    var alertStr = "Cannot save filter:";
                    for (var i = 0; i < errors.length; i++) {
                        alertStr = alertStr + "\n  " + errors[i];
                    }

                    alert(alertStr);
                    return;
                }

                this.hide();

                var callback = this.get('callback');
                if (callback) {
                    callback(filter);
                }
            },

            handleCancelButton: function(e) {
                e.preventDefault();
                this.hide();
            },

            getFieldDefinition: function(fieldName) {
                var fieldDefinitions = this.get('fieldDefinitions');
                var fieldDefinition = null;

                for (var i = 0; i < fieldDefinitions.length; i++) {
                    fieldDefinition = fieldDefinitions[i];
                    if (fieldDefinition[0] === fieldName) {
                        return fieldDefinition;
                    }
                }

                return null;
            }
        }, 
        {
            ATTRS: {
                srcNode: {
                    value: '#monitorFilterPanel'
                },
                
                clusterModel: {
                    value: null
                },

                fieldDefinitions: {
                    value: null
                },

                callback: {
                    value: null
                },

                centered: {
                    value: true
                },

                modal: {
                    value: true
                },

                zIndex: {
                    value: 5
                },

                buttons: {
                    value:  [
                        {
                            value: "Clear",
                            classNames: 'monitorFilterClear commandButton',
                            action: function(e) {this.handleClearButton(e);},
                            section: Y.WidgetStdMod.FOOTER
                        },
                        {
                            value: "OK",
                            classNames: 'monitorFilterOkay commandButton',
                            action: function(e) {this.handleOkayButton(e);},
                            section: Y.WidgetStdMod.FOOTER
                        },
                        {
                            value: "Cancel",
                            classNames: 'monitorFilterCancel commandButton',
                            action: function(e) {this.handleCancelButton(e);},
                            section: Y.WidgetStdMod.FOOTER
                        }
                    ]
                }
            }
        }
    );
}, '0.99', {
    requires: ['panel', 'dd', 'dd-plugin', 'dd-drag', 'event', 'gallery-widget-inherit-css'], 
    skinnable: false
});
