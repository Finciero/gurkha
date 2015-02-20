# gurkha
Data extraction module for Yakuza

## Description

gurkha is a simple data extraction tool designed to standarize html parsing. While it was thought with web scraping in mind, it can be used as a standalone tool. Let's say you have the following html table:

| Product | Code | Price |
|---------|------|-------|
| Apple   | 2001 | $0.40 |
| Orange  | 2002 | $0.44 |
| Banana  | 2003 | $0.50 |

Let's also say you wish to generate an array of 'product objects' like so:

```javascript
[{'name': 'Apple', 'code': '2001', 'price': '0.40'},
 {'name': 'Orange', 'code': '2002', 'price': '0.44'},
 {'name': 'Banana', 'code': '2003', 'price': '0.50'}]
```

With gurkha, you just have to specify the object structure (called schema object) you desire, and a set of rules to indicate where in the html you can find the desired data for each object member. You can also specify post-processing functions to sanitize the data after it is retrieved (for example, if the price component of each object has to be stripped of the dollar signs). After that, you're just a function call away from your precious object array!

## Usage

Considering the previous example, this is what the table html would look like:

```html
<html>
  <table id='fruit'>
    <thead>
      <tr>
        <td>Product</td>
        <td>Code</td>
        <td>Price</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Apple</td>
        <td>2001</td>
        <td>$0.40</td>
      </tr>
      <tr>
        <td>Orange</td>
        <td>2002</td>
        <td>$0.44</td>
      </tr>
      <tr>
        <td>Banana</td>
        <td>2003</td>
        <td>$0.50</td>
      </tr>
    </tbody>
  </table>
</html>
```

And this is how you would parse it using gurkha:

```javascript
var Gurkha = require('gurkha');
var gk = new Gurkha({
  '$rule': 'table#fruit > tbody > tr',
  'name': 'td:nth-child(1)',
  'code': 'td:nth-child(2)',
  'price': {
    '$rule': 'td:nth-child(3)',
    '$fn': function ($elem) {
      return $elem.text().replace(/\$/, '');
    }
  }
});

var products = gk.parse(someHtml);

console.log(products[0].name);
// 'Apple'
```

gurkha automatically detects whether the selection returns multiple elements and in that case, the value of that object member will be an array.

The result of a .parse() call will always be an array.

## Smart Parsing

gurkha is smart. You can instruct it to parse html into any kind of object structure. This includes nested objects and arrays, single values or an array of any mix of valid object structures. The only current limitation is that you cannot have dynamic object member names (they have to be predefined).

### Nested Objects

Following the previous example, let's say you wish to create a different structure, like so:

```javascript
[{
  'fruit1:' {
    'name': 'Apple',
    'code': '2001',
    'price': '$0.40'
  },
  'fruit2': {
    'name': 'Orange',
    'code': '2002',
    'price': '$0.44'
  },
  'fruit3': {
    'name': 'Banana',
    'code': '2003',
    'price': '$0.50'
  }
}]
```

Your schema object then would look something like this:

```javascript
var gk = new Gurkha({
  '$rule': 'table#fruit > tbody',
  'fruit1': {
    '$rule': 'tr:nth-child(1)',
    'name': 'td:nth-child(1)',
    'code': 'td:nth-child(2)',
    'price': 'td:nth-child(3)'
  },
  'fruit2': {
    '$rule': 'tr:nth-child(2)',
    'name': 'td:nth-child(1)',
    'code': 'td:nth-child(2)',
    'price': 'td:nth-child(3)'
  },
  'fruit3': {
    '$rule': 'tr:nth-child(3)',
    'name': 'td:nth-child(1)',
    'code': 'td:nth-child(2)',
    'price': 'td:nth-child(3)'
  }
});
```

This particular example is kind of redundant, but it shows how you can build infinitely nested objects with gurkha.

### Nested Arrays

Let's say you now just want your fruit data in array format, like so:

```javascript
[
  {
    'fruit': ['Apple', '2001', '$0.40']
  },
  {
    'fruit': ['Orange', '2002', '$0.44']
  },
  {
    'fruit': ['Banana', '2003', '$0.50']
  }
}]
```

Your schema object would then look something like this:

```javascript
gk = new Gurkha({
  '$rule': 'table#fruit > tbody > tr',
  'fruit': [
    'td:nth-child(1)',
    'td:nth-child(2)',
    'td:nth-child(3)'
  ]
});
```

### Single Array

If you just wished to get an array of the fruit names:

```javascript
['Apple', 'Orange', 'Banana']

Your schema object would then look something like this:

```javascript
gk = new Gurkha({
  '$rule': 'table#fruit > tbody > tr > td:nth-child(1)'
});
```

### String

You can pass a single selector to gurkha and it will return an array of the text attributes of all elements selected.

So this schema object

```javascript
gk = new Gurkha('table#fruit > tbody > tr > td:nth-child(1)');
``

would return the same as the previous example, that is

```javascript
['Apple', 'Orange', 'Banana']
```

### Mixed Array

You can give gurkha an array of valid schema objects and it will yield an array of the results of parsing each of those objects separately! You can even nest these arrays and gurkha will follow suit.

Just play around with the schema object and the selectors and you should be able to create just about any kind of structure you desire!

## Options

gurkha has a bunch of reserved keywords in the schema object to help you build your structure. This section will explain them in detail.

### Rule

The '$rule' object member specifies the CSS selector that will retrieve the element in question. If absent, the selection will begin at the top level of the DOM.

When an member of the schema object has a string for a value, the string value is implicitly bound to '$rule'.

```javascript
{
  'name': 'table#fruit > tbody > tr > td:nth-child(1)'
}
```

Is equivalent to

```javascript
{
  'name': {
    '$rule': 'table#fruit > tbody > tr > td:nth-child(1)'
  }
}
```

It must be noted that nested '$rule' values are equivalent to a jquery .find() method.

For example, in this schema object

```javascript
{
  '$rule': 'table#fruit > tbody > tr',
  'name': {
    '$rule': 'td:nth-child(1)',
  }
}
```

The 'name' object member will be extracted using $('table#fruit > tbody > tr').find('td:nth-child(1)') (roughly equivalent to concatenating the selectors)

This holds true to implicit rules, such as

```javascript
{
  '$rule': 'table#fruit > tbody > tr',
  'name': 'td:nth-child(1)'
}
```

Use of '$rule' is optional, but not using it at the top level of the schema object will result on a performance hit. The only exception to this is when you need to specify other options, since a selector is required for each object member.

For example, this is an illegal schema object

```javascript
{
  'name': {
    '$fn': function ($elem) {
      return elem.text().trim();
    }
  }
}
```

since there is no selector for the 'name' attribute.

On the other hand

```javascript
{
  'name': 'table#fruit > tbody > tr > td:nth-child(1)'
}
```

is perfectly valid.

### Sanitizing function

The '$fn' object member specifies a sanitizing function to be applied to the data retrieved by the selector specified in '$rule'. It always receives a cheerio object representing the selected element as a parameter and must return the sanitized value. This is useful if you wish to perform any operations on the data, like removing special characters, trimming or even to continue traversing the DOM and retrieve other values to perform mixed operations.

For instance, a good use of '$fn' would be to remove the dollar signs on the price of the fruit, like in the first example.

'$fn' can also be specified at the top level of the schema object. A top level '$fn' definition will only apply to single-rule object members, so if you have this schema object

```javascript
gk = new Gurkha({
  '$rule': 'table#fruit > tbody > tr',
  '$fn': function ($elem) {
    return $elem.text() + ' gurkha rocks!';
  },
  'name': 'td:nth-child(1)',
  'price-code': {
    'code': 'td:nth-child(2)',
    'price': 'td:nth-child(3)'
  }
});
```

the sanitizing function will not propagate to the inner members of 'price-code', but will apply to 'name', yielding the following result:

```javascript
[ { name: 'Apple gurkha rocks!',
    'price-code': { code: '2001', price: '$0.40' } },
  { name: 'Orange gurkha rocks!',
    'price-code': { code: '2002', price: '$0.44' } },
  { name: 'Banana gurkha rocks!',
    'price-code': { code: '2003', price: '$0.50' } } ]
```

Moreover, inner sanitizing functions override outer ones on their scope.

### Top level selection

A schema object that has the '$topLevel' object member set to true will override '$rule' concatenation, meaning that it will select from the top level of the DOM. This is useful if the data you wish to extract is not all in one place.

Let's continue with the example but add an anchor tab outside the table:

```html
<html>
  <a href="https://www.npmjs.com/package/gurkha">gurkha</a>
  <table>
    ...
  </table>
</html>
```

Let's say that for some reason, you wish your fruit objects to also have the link as a property. Your object array would look like this:

```javascript
[{'name': 'Apple', 'code': '2001', 'price': '0.40', link: 'https://www.npmjs.com/package/gurkha'},
 {'name': 'Orange', 'code': '2002', 'price': '0.44', link: 'https://www.npmjs.com/package/gurkha'},
 {'name': 'Banana', 'code': '2003', 'price': '0.50', link: 'https://www.npmjs.com/package/gurkha'}]
```

With '$rule' concatenation, any selector you added to extract the 'link' attribute would start selecting from the rows of the table, yielding no results. Here is where you can use '$topLevel' to specify that the selection should start from the top level of the DOM.

Your schema object would look like this

```javascript
gk = new Gurkha({
  '$rule': 'table#fruit > tbody > tr',
  'name': 'td:nth-child(1)',
  'code': 'td:nth-child(2)',
  'price': {
    '$rule': 'td:nth-child(3)',
    '$fn': function ($elem) {
      return $elem.text().replace(/\$/, '');
    }
  },
  'link': {
    '$rule': 'a',
    '$topLevel': true,
    '$fn': function ($elem) {
      return $elem.attr('href');
    }
  }
});
```

## Contributing

If you wish to contribute to this module, feel free to branch out from the development branch, I'll be glad to go over your contributions and add them if they're reasonable. Any requests for features or bug fixes can be made by adding a new issue.
