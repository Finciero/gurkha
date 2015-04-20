'use strict';
var cheerio = require('cheerio');

function gurkha (schema, options, extvars) {
  /*jshint validthis: true */
  if (typeof(schema) !== 'object' && typeof(schema) !== 'string') {
    throw new Error('Illegal argument: constructor must receive a schema' +
                    'object, string or array');
  }

  if (options !== undefined) {
    if (options instanceof Array) {
      extvars = options;
      options = undefined;
    } else if (typeof(options) !== 'object') {
      throw new Error('Illegal argument: if options are present, they must be an object.');
    }
  }

  if (extvars !== undefined && !(extvars instanceof Array)) {
    throw new Error('Illegal argument: if external variables are present, they must be an array');
  }

  this._schema = schema;
  this._options = options || {};
  this._extvars = extvars || [];
}
// reserved object members
gurkha.prototype._reserved = {
  '$sanitizer': true,
  '$rule': true,
  '$topLevel': true,
  '$post': true
};

// traverses the schema recursively in order to build the object
gurkha.prototype._parse = function ($currentElement, sch, sanitizer) {
  var _this = this;
  if (sch instanceof Array) {
    return _this._parseArray($currentElement, sch, sanitizer);
  } else if (typeof(sch) === 'object') {
    return _this._parseObject($currentElement, sch, sanitizer);
  } else if (typeof(sch) === 'string') {
    return _this._parseString($currentElement, sch, sanitizer);
  } else {
    throw new Error('Illegal argument: schema values must be object, string or array. Got ' + sch);
  }
};

gurkha.prototype._parseArray = function ($currentElement, sch, sanitizer) {
  var _this = this;
  var $ = _this.$;
  var resultArray = [];
  var i;
  if (!$currentElement) {
    $currentElement = $('*');
  }
  for (i = 0; i < sch.length; i += 1) {
    var value = sch[i];
    resultArray.push(_this._parse($currentElement, value, sanitizer));
  }

  if (resultArray.length === 1) {
      resultArray._ignore = true;
  }

  return resultArray;
};

gurkha.prototype._parseObject = function ($currentElement, sch, sanitizer) {
  var _this = this;
  var $ = _this.$;
  var rule = sch.$rule;
  var resultArray = [];
  // options
  var topLevel = sch.$topLevel;
  var post = sch.$post;
  if (rule) {
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
      var $el = $(el);
      resultArray.push(_this._build($el, sch, sanitizer));
    });
  // no basic rule specified
  } else {
    if (!$currentElement || topLevel) {
      $currentElement = $('*');
    }
    // if there is no rule we build only one object
    resultArray.push(_this._build($currentElement, sch, sanitizer));
  }

  // post-processing
  if (post) {
    if (typeof(post) !== 'function') {
      throw new Error('Illegal type: Post-processing functions must be in function format');
    } else {
      return resultArray.map(function (result) {
        return post(result, _this._extvars);
      });
    }
  } else {
    return resultArray;
  }
};

gurkha.prototype._parseString = function ($currentElement, sch, sanitizer) {
  var _this = this;
  var $ = _this.$;
  var resultArray = [];
  var $subElement;
  // a single string is a rule, so we select the elements that match it
  if (!$currentElement) {
    $subElement = $(sch);
  } else {
    $subElement = $currentElement.find(sch);
  }

  // push result for each element selected by the rule
  $subElement.each(function (index, el) {
    var $el = $(el);
    if (!sanitizer) {
      resultArray.push($el.text());
    } else {
      resultArray.push(sanitizer($el));
    }
  });

  return resultArray;
};

// auxiliary function to build the object
gurkha.prototype._build = function ($el, sch, sanitizer) {
  var _this = this;
  var value;
  var result = {};
  var keyCount = 0;
  // override the previous sanitizer if a new one exists in the object
  sanitizer = sch.$sanitizer || sanitizer;
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
      // unreserved object members must ignore previous sanitizer functions
      result[key] = _this._parse($el, value, sch.$sanitizer);
    }
  }
  // if the object has no members other than the reserved ones,
  // return the result of the selection rather than an object
  if (keyCount === 0) {
    if (sanitizer) {
      return sanitizer($el);
    } else {
      return $el.text();
    }
  } else {
    return result;
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
  // flatten recursively
  if (val instanceof Array) {
    // if the array is flagged to be ignored we don't flatten it
    if (val.length === 1 && !val._ignore) {
      return this._flatten2(val[0]);
    } else {
      var i;
      // if the array was flagged to be ignored, we clone it to get rid of the property without using delete
      if (val._ignore) {
        val = [this._flatten2(val[0])];
      }
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
  this.$ = cheerio.load(html, this._options);
  return this._flatten(this._parse(null, this._schema));
};

module.exports = gurkha;
