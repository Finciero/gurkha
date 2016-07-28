import cheerio from 'cheerio'

class gurkha {
  constructor (schema, options) {
    let cheerioOpts, externalVars;

    if ((typeof schema !== 'object' && typeof schema !== 'string') || schema === null) {
      throw new Error('Illegal argument: constructor must receive a schema object, ' +
        'string or array')
    }

    if (options !== undefined) {
      if (typeof options !== 'object') {
        throw new Error('Illegal argument: if options are present, they must be an object.')
      }

      cheerioOpts = options.options
      externalVars = options.params
    }

    this._schema = schema
    this._options = cheerioOpts || {}
    this._extvars = externalVars || {}
    this._reserved = {
      $sanitizer: true,
      $rule: true,
      $topLevel: true,
      $post: true,
      $ignore: true,
      $constant: true,
    }
  }
  // Private methods
  _parse ($currentElement, sch, sanitizer) {
    if (sch instanceof Array) {
      return this._parseArray($currentElement, sch, sanitizer)
    } else if (typeof sch === 'object' && sch !== null) {
      return this._parseObject($currentElement, sch, sanitizer)
    } else if (typeof sch === 'string') {
      return this._parseString($currentElement, sch, sanitizer)
    } else {
      throw new Error(`Illegal argument: schema values must be object, string or array. Got ${sch}`)
    }
  }

  _parseArray ($currentElement, sch, sanitizer) {
    const $ = this._$
    const resultArray = []

    if (!$currentElement) {
      $currentElement = $(this._html)
    }

    for (let i = 0; i < sch.length; i += 1) {
      const value = sch[i]
      resultArray.push(this._parse($currentElement, value, sanitizer))
    }

    if (resultArray.length === 1) {
      resultArray._ignore = true
    }

    return resultArray
  }

  _parseObject ($currentElement, sch, sanitizer) {
    const $ = this._$
    const rule = sch.$rule
    const resultArray = []
    const anonymous = () => { return false }
    // options
    const topLevel = sch.$topLevel
    const post = sch.$post
    const ignore = sch.$ignore || anonymous
    const constant = sch.$constant

    if (constant) {
      return constant
    } else {
      if (rule) {
        if (typeof rule !== 'string') {
          throw new Error('Illegal type: Rules must be in String format')
        }

        if (!$currentElement || topLevel) {
          $currentElement = $(rule)
        } else {
          $currentElement = $($currentElement).find(rule)
        }

        $currentElement.each((index, el) => {
          const $el = $(el)

          if (typeof ignore !== 'function') {
            throw new Error('Illegal type: Filters must be in function format')
          }

          if (!ignore($el, this._extvars)) {
            resultArray.push(this._build($el, sch, sanitizer))
          }
        })
      } else {
        if (!$currentElement || topLevel) {
          $currentElement = $(this._html)
        }

        resultArray.push(this._build($currentElement, sch, sanitizer))
      }

      // post-processing
      if (post) {
        if (typeof post !== 'function') {
          throw new Error('Illegal type: Post-processing functions must be in function format')
        } else {
          return resultArray.map((result) => {
            return post(this._flatten2(result), this._extvars)
          })
        }
      } else {
        return resultArray
      }
    }
  }

  _parseString ($currentElement, sch, sanitizer) {
    const $ = this._$
    const resultArray = []
    let $subElement

    if (!$currentElement) {
      $subElement = $(sch)
    } else {
      $subElement = $currentElement.find(sch)
    }

    $subElement.each((index, el) => {
      const $el = $(el)

      if (!sanitizer) {
        resultArray.push($el.text())
      } else {
        resultArray.push(sanitizer($el, this._extvars))
      }
    })

    return resultArray
  }

  _build ($el, sch, sanitizer) {
    let value
    const result = {}
    let keyCount = 0
    sanitizer = sch.$sanitizer || sanitizer

    if (sanitizer) {
      if (typeof sanitizer !== 'function') {
        throw new Error('Illegal type: Sanitizers must be in function format')
      }
    }

    for (let key in sch) {
      if (this._reserved[key] || !key) {
        continue
      } else {
        keyCount += 1
        value = sch[key]
        result[key] = this._parse($el, value, sch.$sanitizer)
      }
    }

    if (keyCount === 0) {
      if (sanitizer) {
        return sanitizer($el, this._extvars)
      } else {
        return $el.text()
      }
    } else {
      return result
    }
  }

  _flatten (val) {
    const array = []
    for (let i = 0; i < val.length; i += 1) {
      array.push(this._flatten2(val[i]))
    }
    return array
  }

  _flatten2 (val) {
    const array = []

    if (val instanceof Array) {
      if (val.length === 1 && !val._ignore) {
        return this._flatten2(val[0])
      } else {
        if (val._ignore) {
          val = [this._flatten2(val[0])]
        }

        for (let i = 0; i < val.length; i += 1) {
          array.push(this._flatten2(val[i]))
        }

        return array
      }
    } else {
      const result = {}

      if (typeof val === 'object') {
        for (let key in val) {
          if (!key) {
            continue
          } else {
            result[key] = this._flatten2(val[key])
          }
        }
        return result
      } else {
        return val
      }
    }
  }

  // Public methods
  parse (html, params) {
    this._$ = cheerio.load(html, this._options)
    this._html = html

    if (params) {
      this._extvars = params
    }

    const result = this._parse(null, this._schema)

    return this._flatten(result)
  }
}

module.exports = gurkha
