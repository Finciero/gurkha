// Unit tests
'use strict';
var Gurkha = require('../gurkha');
describe('gurkha', function () {
  describe('#parse', function () {
    var gk;
    var parsedObj, expectedObj;
    // mock html
    var html =
      '<html>' +
        '<a href="www.google.com">google</a>' +
        '<table id=\'fruit\'>' +
          '<thead>' +
            '<tr>' +
              '<td>Product</td>' +
              '<td>Code</td>' +
              '<td>Price</td>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr>' +
              '<td>Apple</td>' +
              '<td>2001</td>' +
              '<td>$0.40</td>' +
            '</tr>' +
            '<tr>' +
              '<td>Orange</td>' +
              '<td>2002</td>' +
              '<td>$0.44</td>' +
            '</tr>' +
            '<tr>' +
              '<td>Banana</td>' +
              '<td>2003</td>' +
              '<td>$0.50</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</html>';

    it('should parse a single string', function () {
      gk = new Gurkha('table#fruit > tbody > tr > td:nth-child(1)');
      parsedObj = gk.parse(html);
      expectedObj = ['Apple', 'Orange', 'Banana'];

      expect(parsedObj).toEqual(expectedObj);

      gk = new Gurkha('table#fruit > tbody > tr > td');
      parsedObj = gk.parse(html);
      expectedObj = ['Apple', '2001', '$0.40', 'Orange', '2002', '$0.44', 'Banana', '2003', '$0.50'];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse a single array', function () {
      gk = new Gurkha([
        'table#fruit > tbody > tr:nth-child(1) > td'
      ]);
      parsedObj = gk.parse(html);
      expectedObj = [['Apple', '2001', '$0.40']];

      expect(parsedObj).toEqual(expectedObj);

      gk = new Gurkha([
        'table#fruit > tbody > tr:nth-child(1) > td',
        'table#fruit > tbody > tr:nth-child(2) > td',
        'table#fruit > tbody > tr:nth-child(3) > td'
      ]);
      parsedObj = gk.parse(html);
      expectedObj = [
        [ 'Apple', '2001', '$0.40' ],
        [ 'Orange', '2002', '$0.44' ],
        [ 'Banana', '2003', '$0.50' ]
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object with no rules', function () {
      gk = new Gurkha({});
      parsedObj = gk.parse(html);
      expectedObj = [ 'googleProductCodePriceApple2001$0.40Orange2002$0.44Banana2003$0.50' ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object with a single rule', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr > td:nth-child(1)'
      });
      parsedObj = gk.parse(html);
      expectedObj = ['Apple', 'Orange', 'Banana'];

      expect(parsedObj).toEqual(expectedObj);

      gk = new Gurkha({
        '$rule': 'a'
      });
      parsedObj = gk.parse(html);
      expectedObj = ['google'];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object with single rule members', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        'name': 'td:nth-child(1)',
        'code': 'td:nth-child(2)',
        'price': 'td:nth-child(3)'
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {'name': 'Apple', 'code': '2001', 'price': '$0.40'},
        {'name': 'Orange', 'code': '2002', 'price': '$0.44'},
        {'name': 'Banana', 'code': '2003', 'price': '$0.50'}
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse a nested array', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        'vars': [
          'td:nth-child(1)',
          'td:nth-child(2)',
          'td:nth-child(3)'
        ]
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {'vars': ['Apple', '2001', '$0.40']},
        {'vars': ['Orange', '2002', '$0.44']},
        {'vars': ['Banana', '2003', '$0.50']}
      ];

      expect(parsedObj).toEqual(expectedObj);

      gk = new Gurkha({

      });
    });

    it('should parse a nested array and not flatten single element arrays when forced by the schema', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        'vars': [
          {
            '$rule': 'td:nth-child(1)'
          }
        ]
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {'vars': ['Apple']},
        {'vars': ['Orange']},
        {'vars': ['Banana']}
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an array of any number of valid schema objects', function () {
      gk = new Gurkha([
        'table#fruit > tbody > tr > td:nth-child(1)',
        {
          '$rule': 'table#fruit > tbody > tr > td:nth-child(1)'
        },
        ['table#fruit > tbody > tr > td:nth-child(1)'],
        {
          '$rule': 'table#fruit > tbody > tr',
          'name': 'td:nth-child(1)',
          'code': 'td:nth-child(2)',
          'price': 'td:nth-child(3)'
        }
      ]);
      parsedObj = gk.parse(html);
      expectedObj = [
        ['Apple', 'Orange', 'Banana'],
        ['Apple', 'Orange', 'Banana'],
        [['Apple', 'Orange', 'Banana']],
        [
          {'name': 'Apple', 'code': '2001', 'price': '$0.40'},
          {'name': 'Orange', 'code': '2002', 'price': '$0.44'},
          {'name': 'Banana', 'code': '2003', 'price': '$0.50'}
        ]
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object with a single rule and sanitizing function', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr > td:nth-child(3)',
        '$fn': function ($elem) {
          return $elem.text().trim().replace(/\$/g, '');
        }
      });
      parsedObj = gk.parse(html);
      expectedObj = ['0.40', '0.44', '0.50'];

      expect(parsedObj).toEqual(expectedObj);

      gk = new Gurkha({
        '$rule': 'a',
        '$fn': function ($elem) {
          return $elem.attr('href');
        }
      });
      parsedObj = gk.parse(html);
      expectedObj = ['www.google.com'];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object applying a sanitizing function to single-rule unreserved members', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        '$fn': function (elem) {
          return elem.text() + ' test';
        },
        'name': 'td:nth-child(1)',
        'code': 'td:nth-child(2)',
        'price': 'td:nth-child(3)'
      });
      parsedObj = gk.parse(html);
      expectedObj = [
          {'name': 'Apple test', 'code': '2001 test', 'price': '$0.40 test'},
          {'name': 'Orange test', 'code': '2002 test', 'price': '$0.44 test'},
          {'name': 'Banana test', 'code': '2003 test', 'price': '$0.50 test'}
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object using $topLevel', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        'name': 'td:nth-child(1)',
        'code': 'td:nth-child(2)',
        'price': 'td:nth-child(3)',
        'link': {
          '$topLevel': true,
          '$rule': 'a'
        }
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {'name': 'Apple', 'code': '2001', 'price': '$0.40', 'link': 'google'},
        {'name': 'Orange', 'code': '2002', 'price': '$0.44', 'link': 'google'},
        {'name': 'Banana', 'code': '2003', 'price': '$0.50', 'link': 'google'}
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should parse an object using $post', function () {
      var gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        '$post': function (obj) {
          if (obj.price.toString().replace(/\$/g, '') > 0.42) {
            obj.name = 'Premium ' + obj.name;
          }

          return obj;
        },
        'name': 'td:nth-child(1)',
        'code': 'td:nth-child(2)',
        'price': 'td:nth-child(3)'
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {'name': 'Apple', 'code': '2001', 'price': '$0.40'},
        {'name': 'Premium Orange', 'code': '2002', 'price': '$0.44'},
        {'name': 'Premium Banana', 'code': '2003', 'price': '$0.50'}
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should mind not to propagate sanitizing functions into inner objects with unreserved members', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        '$fn': function ($elem) {
          return $elem.text() + ' gurkha rocks!';
        },
        'name': 'td:nth-child(1)',
        'name2': {
          '$rule': 'td:nth-child(1)'
        },
        'name-price': [
          'td:nth-child(1)',
          'td:nth-child(3)'
        ],
        'price-code': {
          'code': 'td:nth-child(2)',
          'price': 'td:nth-child(3)'
        }
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {
          'name': 'Apple gurkha rocks!',
          'name2': 'Apple gurkha rocks!',
          'name-price': ['Apple gurkha rocks!', '$0.40 gurkha rocks!'],
          'price-code': {'code': '2001', 'price': '$0.40'}
        },
        {
          'name': 'Orange gurkha rocks!',
          'name2': 'Orange gurkha rocks!',
          'name-price': ['Orange gurkha rocks!', '$0.44 gurkha rocks!'],
          'price-code': {'code': '2002', 'price': '$0.44'}
        },
        {
          'name': 'Banana gurkha rocks!',
          'name2': 'Banana gurkha rocks!',
          'name-price': ['Banana gurkha rocks!', '$0.50 gurkha rocks!'],
          'price-code': {'code': '2003', 'price': '$0.50'}
        }
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should override sanitizing functions', function () {
      gk = new Gurkha({
        '$rule': 'table#fruit > tbody > tr',
        '$fn': function ($elem) {
          return $elem.text() + ' this shouldn\'t be here';
        },
        'name': {
          '$rule': 'td:nth-child(1)',
          '$fn': function ($elem) {
            return $elem.text() + ' this should be here';
          }
        }
      });
      parsedObj = gk.parse(html);
      expectedObj = [
        {'name': 'Apple this should be here'},
        {'name': 'Orange this should be here'},
        {'name': 'Banana this should be here'}
      ];

      expect(parsedObj).toEqual(expectedObj);
    });

    it('should throw an exception if the constructor argument is not an object, array, or string', function () {
      expect(function () {
        new Gurkha();
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');

      expect(function () {
        new Gurkha(1);
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');

      expect(function () {
        new Gurkha(false);
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');

      expect(function () {
        new Gurkha(true);
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');

      expect(function () {
        new Gurkha(null);
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');

      expect(function () {
        new Gurkha(undefined);
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');

      expect(function () {
        new Gurkha(function () {});
      }).toThrow('Illegal argument: constructor must receive a schema object, string or array');
    });

    it('should throw an exception if an inner schema object is not an object, array, or string', function () {
      expect(function () {
        gk = new Gurkha({
          'name': 1
        });
        gk.parse(html);
      }).toThrow('Illegal argument: schema values must be object, string or array. Got 1');

      expect(function () {
        gk = new Gurkha({
          'name': false
        });
        gk.parse(html);
      }).toThrow('Illegal argument: schema values must be object, string or array. Got false');

      expect(function () {
        gk = new Gurkha({
          'name': true
        });
        gk.parse(html);
      }).toThrow('Illegal argument: schema values must be object, string or array. Got true');

      expect(function () {
        gk = new Gurkha({
          'name': null
        });
        gk.parse(html);
      }).toThrow('Illegal argument: schema values must be object, string or array. Got null');

      expect(function () {
        gk = new Gurkha({
          'name': undefined
        });
        gk.parse(html);
      }).toThrow('Illegal argument: schema values must be object, string or array. Got undefined');

      expect(function () {
        gk = new Gurkha({
          'name': function () {}
        });
        gk.parse(html);
      }).toThrow('Illegal argument: schema values must be object, string or array. Got function () {}');
    });

    it('should throw an exception if a rule is not in string format', function () {
      expect(function () {
        gk = new Gurkha({
          '$rule': 1
        });

        gk.parse(html);
      }).toThrow('Illegal type: Rules must be in String format');

      expect(function () {
        gk = new Gurkha({
          '$rule': true
        });

        gk.parse(html);
      }).toThrow('Illegal type: Rules must be in String format');

      expect(function () {
        gk = new Gurkha({
          '$rule': []
        });

        gk.parse(html);
      }).toThrow('Illegal type: Rules must be in String format');

      expect(function () {
        gk = new Gurkha({
          '$rule': function () {}
        });

        gk.parse(html);
      }).toThrow('Illegal type: Rules must be in String format');
    });

    it('should throw an exception if a sanitizing function is not in function format', function () {
      expect(function () {
        gk = new Gurkha({
          '$fn': 1
        });

        gk.parse(html);
      }).toThrow('Illegal type: Sanitizers must be in function format');

      expect(function () {
        gk = new Gurkha({
          '$fn': true
        });

        gk.parse(html);
      }).toThrow('Illegal type: Sanitizers must be in function format');

      expect(function () {
        gk = new Gurkha({
          '$fn': []
        });

        gk.parse(html);
      }).toThrow('Illegal type: Sanitizers must be in function format');

      expect(function () {
        gk = new Gurkha({
          '$fn': {}
        });

        gk.parse(html);
      }).toThrow('Illegal type: Sanitizers must be in function format');
    });

    it('should throw an exception if a post-processing function is not in function format', function () {
      expect(function () {
        gk = new Gurkha({
          '$post': 1
        });

        gk.parse(html);
      }).toThrow('Illegal type: Post-processing functions must be in function format');

      expect(function () {
        gk = new Gurkha({
          '$post': true
        });

        gk.parse(html);
      }).toThrow('Illegal type: Post-processing functions must be in function format');

      expect(function () {
        gk = new Gurkha({
          '$post': []
        });

        gk.parse(html);
      }).toThrow('Illegal type: Post-processing functions must be in function format');

      expect(function () {
        gk = new Gurkha({
          '$post': {}
        });

        gk.parse(html);
      }).toThrow('Illegal type: Post-processing functions must be in function format');
    });
  });
});
