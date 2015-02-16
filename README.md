# Gurkha
Data extraction module for Yakuza

## Description

Gurkha is a simple data extraction tool designed to standarize html parsing. While it was thought with web scraping in mind, it can be used as a standalone tool. Let's say you have the following html table:

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

With Gurkha, you just have to specify the object structure you desire, and a set of rules to indicate where in the html you can find the desired data for each object member. You can also specify post-processing functions to sanitize the data after it is retrieved (for example, the price component of each object has to be stripped of the dollar signs). After that, you're just a function call away from your precious object array!

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


```javascript
var Gurkha = require('Gurkha');
var gk = new Gurkha({
  '$rule': 'table#fruit > tbody > tr',
  'name': 'td:nth-child(1)',
  'code': 'td:nth-child(2)',
  'price': {
    '$rule': 'td:nth-child(3)',
    '$fn': function (elem) {
      return elem.text().replace(/\$/, '');
    }
  }
});

var products = gk.parse(someHtml);

console.log(products[0].name);
// 'Apple'
```

By default, Gurkha will always assign the text of a selected element to its corresponding object member. However, you can override this behavior by specifying a sanitizing function, as seen with the 'price' member of the object. Sanitizing functions always receive a cheerio object as a parameter and must return the sanitized value.

Gurkha automatically detects whether the selection returns multiple elements and in that case, the value of that object member will be an array. The only exception to this is the top level selector, which will always return an array of objects (even if the selector only applies to a single element).


## Contributing

If you wish to contribute to this module, feel free to branch out from the development branch, I'll be glad to go over your contributions and add them if they're reasonable. Any requests for features or bug fixes can be made by adding a new issue.
