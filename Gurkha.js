'use strict';
var cheerio = require('cheerio');

function gurkha (schema) {
  this._schema = schema;
  if (typeof(schema) !== 'object') {
    throw new Error('Illegal argument: constructor must receive a schema object');
  }
}

gurkha.prototype._parse = function ($currentElement, sch) {
  var _this = this;
  var $ = _this.$;
  var rule = sch.$rule;
  var resultArray = [];
  if (rule) {
    if (typeof(rule) !== 'string') {
      throw new Error('Illegal type: Rules must be in String format');
    }

    if (!$currentElement) {
      $currentElement = $(rule);
    } else {
      $currentElement = $($currentElement).find(rule);
    }

    $currentElement.each(function (index, el) {
      var value;
      var $el = $(el);
      var result = {};
      var keyCount = 0;
      var sanitizer = sch.$fn;
      if (sanitizer) {
        if (typeof(sanitizer) !== 'function') {
          throw new Error('Illegal type:' +
            ' Sanitizers must be in Function format');
        }
      }
      for (var key in sch) {
        if (key === '$rule' || key === '$fn' || !key) {
          continue;
        } else {
          keyCount += 1;
          value = sch[key];
          if (typeof(value) === 'string') {
            var $subElement = $el.find(value);
            if (sanitizer) {
              result[key] = sanitizer($subElement);
            } else {
              result[key] = $subElement.text();
            }
          } else if (value instanceof Array) {
            var i;
            var array = [];
            for (i = 0; i < value.length; i += 1) {
              array.push(_this._parse($el, value[i]));
            }
            result[key] = array;
          } else if (typeof(value) === 'object') {
              result[key] = _this._parse($el, value);
          }
        }
      }
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

gurkha.prototype._flatten = function (val) {
  var array = [];
  var i;
  for (i = 0; i < val.length; i += 1) {
    array.push(this._flatten2(val[i]));
  }
  return array;
};

gurkha.prototype._flatten2 = function (val) {
  var array = [];
  if (val instanceof Array) {
    if (val.length === 1) {
      return val[0];
    } else {
      var i;
      for (i = 0; i < val.length; i += 1) {
        array.push(this._flatten2(val[i]));
      }
      return array;
    }
  } else {
    var result = {};
    if (typeof(val) === 'object') {
      for (var key in val) {
        if (!key) {
          continue;
        } else {
          result[key] = this._flatten2(val[key]);
        }
      }
      return result;
    } else {
      return val;
    }
  }
};
gurkha.prototype.parse = function (html) {
  this.$ = cheerio.load(html);
  return this._flatten(this._parse(null, this._schema));
};

module.exports = gurkha;
