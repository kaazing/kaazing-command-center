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
// Functionality to support filtering of various model objects to meet
// certain criteria (defined in the filter.)
//-------------------------------------------------------------------------

function Filter() {
}

(function() {
    var $proto = Filter.prototype;

    $proto.findFilters = function(attribute) {
        return null; // only non-null for And/Or
    }

    $proto.match = function(obj) {
        return true;
    };

    $proto.toString = function() {
        return "";
    }
})();


/**
 * A filter to AND together several other filters
 */
function AndFilter() {
    this.subFilters = [];
}

(function() {
    AndFilter.prototype = new Filter();

    var $proto = AndFilter.prototype;

    /**
     * Find one or more sub-filters with the given attribute, 
     * if any. If none found, return null, else a list.
     */
    $proto.findFilters = function(attribute) {
        var found = [];

        for (var i = 0; i < this.subFilters.length; i++) {
            var subFilter = this.subFilters[i];
            if (subFilter.attribute === attribute) {
                found.push(subFilter);
            }
        }

        return (found.length > 0 ? found : null);
    }

    $proto.addFilter = function(subFilter) {
        this.subFilters.push(subFilter);
    };

    $proto.addFilters = function(subFilterList) {
        if (subFilterList) {
            this.subFilters = this.subFilters.concat(subFilterList);
        }
    };

    $proto.deleteFilter = function(subFilter) {
        var subFilters = this.subFilters;
        var index = subFilters.indexOf(subFilter);
        if (index >= 0) {
            subFilters.splice(index, 1);
        }
    };

    // Insert a subfilter at a given index, pushing others down
    $proto.insertFilter = function(subFilter, index) {
        var subFilters = this.subFilters;
        subFilters.splice(index, 0, subFilter);
    };

    $proto.getSubFilters = function() {
        return this.subFilters;
    };

    $proto.match = function(obj) {
        var subFilters = this.subFilters;

        for (var i = 0; i < subFilters.length; i++) {
            var subFilter = subFilters[i];
            if (!subFilter.match(obj)) {
                return false;
            }
        }

        return true;
    };

    $proto.toString = function() {
        var subFilters = this.subFilters;

        var result = "";
        for (var i = 0; i < subFilters.length; i++) {
            var subFilter = subFilters[i];

            if (i > 0) {
                result = result + " and ";
            }

            result = result + "(" + subFilter.toString() + ")"
        }

        return result;
    };
})();

/**
 * A filter to OR together several other filters
 */
function OrFilter() {
    this.subFilters = [];
}

(function() {
    OrFilter.prototype = new Filter();

    var $proto = OrFilter.prototype;

    /**
     * Find one or more sub-filters with the given attribute, 
     * if any. If none found, return null, else a list.
     */
    $proto.findFilters = function(attribute) {
        var found = [];

        for (var i = 0; i < this.subFilters.length; i++) {
            var subFilter = this.subFilters[i];
            if (subFilter.attribute === attribute) {
                found.push(subFilter);
            }
        }

        return (found.length > 0 ? found : null);
    }

    $proto.addFilter = function(subFilter) {
        this.subFilters.push(subFilter);
    };

    $proto.addFilters = function(subFilterList) {
        if (subFilterList) {
            this.subFilters = this.subFilters.concat(subFilterList);
        }
    };

    $proto.deleteFilter = function(subFilter) {
        var subFilters = this.subFilters;
        var index = subFilters.indexOf(subFilter);
        if (index >= 0) {
            subFilters.splice(index, 1);
        }
    };

    // Insert a subfilter at a given index, pushing others down
    $proto.insertFilter = function(subFilter, index) {
        var subFilters = this.subFilters;
        subFilters.splice(index, 0, subFilter);
    };

    $proto.getSubFilters = function() {
        return this.subFilters;
    };

    $proto.match = function(obj) {
        var subFilters = this.subFilters;

        for (var i = 0; i < subFilters.length; i++) {
            var subFilter = subFilters[i];
            if (subFilter.match(obj)) {
                return true;
            }
        }

        return false;
    };

    $proto.toString = function() {
        var subFilters = this.subFilters;

        var result = "";
        for (var i = 0; i < subFilters.length; i++) {
            var subFilter = subFilters[i];

            if (i > 0) {
                result = result + " or ";
            }

            result = result + "(" + subFilter.toString() + ")"
        }

        return result;
    };
})();

/**
 * A filter to do a numeric comparison against an attribute
 * of the given object, using 'get' to retrieve the attribute
 * value. Operator values include:
 * LT, LEQ, EQ, NEQ, GEQ, GT, SET, UNSET
 */
function NumericFilter(attribute, operator, value) {
    this.attribute = attribute;
    this.operator = operator;
    this.value = value;
}

(function() {
    NumericFilter.prototype = new Filter();

    var $proto = NumericFilter.prototype;

    $proto.match = function(obj) {
        var objValue = obj.get(this.attribute);

        switch (this.operator) {
        case 'LT': return (objValue < this.value);
        case 'LEQ': return (objValue <= this.value);
        case 'EQ': return (objValue === this.value);
        case 'NEQ': return (objValue != this.value);
        case 'GEQ': return (objValue >= this.value);
        case 'GT': return (objValue > this.value);
        case 'SET': return (objValue !== undefined && objValue !== null);
        case 'UNSET': return (objValue === undefined || objValue === null);
        default: return false;
        }
    };

    $proto.toString = function() {
        var result = this.attribute + " " + this.operToString();
        if (this.operator !== 'SET' && this.operator !== 'UNSET') {
            result = result + " " + this.value;
        }
        return result;
    };

    $proto.operToString = function() {
        switch (this.operator) {
        case 'LT': return '<';
        case 'LEQ': return '<=';
        case 'EQ': return '==';
        case 'NEQ': return '!=';
        case 'GEQ': return '>=';
        case 'GT': return '>';
        case 'SET': return 'is set';
        case 'UNSET': return 'is not set';
        default: return "";
        }
    }
})();


/**
 * A filter to do an alpha comparison against an attribute
 * of the given object, using 'get' to retrieve the attribute
 * value.
 */
function AlphaFilter(attribute, operator, value) {
    this.attribute = attribute;
    this.operator = operator;
    this.value = value;
}

(function() {
    AlphaFilter.prototype = new Filter();

    var $proto = AlphaFilter.prototype;

    $proto.match = function(obj) {
        var objValue = obj.get(this.attribute);
        if (objValue) {
            objValue = objValue.toString();
        } else {
            objValue = "";  // to avoid issues with null/undefined
        }

        switch (this.operator) {
        case 'LT': return (objValue < this.value);
        case 'LEQ': return (objValue <= this.value);
        case 'EQ': return (objValue === this.value);
        case 'NEQ': return (objValue != this.value);
        case 'GEQ': return (objValue >= this.value);
        case 'GT': return (objValue > this.value);
        case 'CONTAIN': return (objValue.indexOf(this.value, 0) >= 0);
        case 'NOT_CONTAIN': return (objValue.indexOf(this.value, 0) < 0);
        case 'START': return (objValue.startsWith(this.value));
        case 'END': return (objValue.endsWith(this.value));
        case 'SET': return (objValue !== undefined && objValue !== null);
        case 'UNSET': return (objValue === undefined || objValue === null);
        default: return false;
        }
    };

    $proto.toString = function() {
        var result = this.attribute + " " + this.operToString();
        if (this.operator !== 'SET' && this.operator !== 'UNSET') {
            result = result + " '" + this.value + "'";
        }
        return result;
    };

    $proto.operToString = function() {
        switch (this.operator) {
        case 'LT': return '<';
        case 'LEQ': return '<=';
        case 'EQ': return '==';
        case 'NEQ': return '!=';
        case 'GEQ': return '>=';
        case 'GT': return '>';
        case 'CONTAIN': return 'contains';
        case 'NOT_CONTAIN': return 'does not contain';
        case 'START': return 'starts with';
        case 'END': return 'ends with';
        case 'SET': return 'is set';
        case 'UNSET': return 'is not set';
        default: return "";
        }
    }
})();

/**
 * A filter to do an eq/neq comparison against an attribute
 * of the given object, using 'get' to retrieve the attribute
 * value. This is somewhat different than an alpha comparison,
 * in that we only support eq/neq.
 */
function ValueFilter(attribute, operator, value) {
    this.attribute = attribute;
    this.operator = operator;
    this.value = value;
}

(function() {
    ValueFilter.prototype = new Filter();

    var $proto = ValueFilter.prototype;

    $proto.match = function(obj) {
        var objValue = obj.get(this.attribute);

        switch (this.operator) {
        case 'EQ': return (objValue === this.value);
        case 'NEQ': return (objValue != this.value);
        case 'SET': return (objValue !== undefined && objValue !== null);
        case 'UNSET': return (objValue === undefined || objValue === null);
        default: return false;
        }
    };

    $proto.toString = function() {
        var result = this.attribute + " " + this.operToString();
        if (this.operator !== 'SET' && this.operator !== 'UNSET') {
            result = result + " '" + this.value + "'";
        }
        return result;
    };

    $proto.operToString = function() {
        switch (this.operator) {
        case 'EQ': return '==';
        case 'NEQ': return '!=';
        case 'SET': return 'is set';
        case 'UNSET': return 'is not set';
        default: return "";
        }
    }
})();
