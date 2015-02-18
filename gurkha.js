'use strict';
var cheerio = require('cheerio');

function gurkha (schema) {
  if (typeof(schema) !== 'object') {
    throw new Error('Illegal argument: constructor must receive a schema object');
  }

  this._schema = schema;
}
// reserved object members
gurkha.prototype._reserved = {
  '$fn': true,
  '$rule': true,
  '$topLevel': true
};
// traverses the schema recursively in order to build the object
gurkha.prototype._parse = function ($currentElement, sch) {
  var _this = this;
  var $ = _this.$;
  var rule = sch.$rule;
  var resultArray = [];
  if (rule) {
    // options
    var topLevel = sch.$topLevel;

    if (typeof(rule) !== 'string') {
      throw new Error('Illegal type: Rules must be in String format');
    }
    // $currentElement is null if the schema object is not nested, meaning the rule should select from the entire DOM
    // topLevel indicates that the rule should select from the entire DOM,
    // ignoring any previous rules in outer schema objects
    if (!$currentElement || topLevel) {
      $currentElement = $(rule);
    } else {
      $currentElement = $($currentElement).find(rule);
    }

    // build object for each element selected by the rule
    $currentElement.each(function (index, el) {
      var value;
      var $el = $(el);
      var result = {};
      var keyCount = 0;
      var sanitizer = sch.$fn;
      if (sanitizer) {
        if (typeof(sanitizer) !== 'function') {
          throw new Error('Illegal type: Sanitizers must be in Function format');
        }
      }
      for (var key in sch) {
        // skip reserved keys
        if (_this._reserved[key] || !key) {
          continue;
        } else {
          keyCount += 1;
          value = sch[key];

          // single rule, object member named key should be a single value
          if (typeof(value) === 'string') {
            var $subElement = $el.find(value);
            if (sanitizer) {
              result[key] = sanitizer($subElement);
            } else {
              result[key] = $subElement.text();
            }
          // array, object member named key should be an array
          } else if (value instanceof Array) {
            var i;
            var array = [];
            for (i = 0; i < value.length; i += 1) {
              array.push(_this._parse($el, value[i]));
            }
            // if the proposed array has only one element, we need to flag the flattener to ignore it
            if (array.length === 1) {
              array._ignore = true;
            }
            result[key] = array;
          // object, object member named key should be an object
          } else if (typeof(value) === 'object') {
              result[key] = _this._parse($el, value);
          }
        }
      }
      // if the object has no members other than the reserved ones,
      // return the result of the selection rather than an object
      if (keyCount === 0) {
        if (sanitizer) {
          resultArray.push(sanitizer($el));
        } else {
          resultArray.push($el.text());
        }
      } else {
        resultArray.push(result);
      }
    });
    return resultArray;
  }
};

// wrapper function to avoid flattening the outer array
gurkha.prototype._flatten = function (val) {
  var array = [];
  var i;
  for (i = 0; i < val.length; i += 1) {
    array.push(this._flatten2(val[i]));
  }
  return array;
};

// flatten any inner arrays with only one value
gurkha.prototype._flatten2 = function (val) {
  var array = [];
  if (val instanceof Array) {
    // if the array is flagged to be ignored we don't flatten it
    if (val.length === 1 && !val._ignore) {
      return val[0];
    } else {
      // if the array was flagged to be ignored, we clone it to get rid of the property without using delete
      if (val._ignore) {
        val = [val[0]];
      }
      var i;
      for (i = 0; i < val.length; i += 1) {
        array.push(this._flatten2(val[i]));
      }
      return array;
    }
  } else {
    var result = {};
    // flatten recursively
    if (typeof(val) === 'object') {
      for (var key in val) {
        if (!key) {
          continue;
        } else {
          result[key] = this._flatten2(val[key]);
        }
      }
      return result;
    // single values are returned as-is
    } else {
      return val;
    }
  }
};
// exposed parsing function, wrapper for _parse
gurkha.prototype.parse = function (html) {
  this.$ = cheerio.load(html);
  return this._flatten(this._parse(null, this._schema));
};

module.exports = gurkha;
