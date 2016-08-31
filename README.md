# arghs
Small, flexible command-line argument parser for node.js

## Overview

**Arghs** is so you don't have to write another argument parser for node, like, ever (unless you're reimplementing `git`, in which case good luck to you), and so you don't have to pull in yet another library with three dozen dependencies to do it for you (and spend hours or days tweaking the config). **Arghs** is small, fast, flexible, totally self-contained, easy to invoke, and gives you the options you want in easily-accessible form: just a plain old object. It'll even build and format the help text for you.

It won't cook breakfast for you, though — you're on your own there.

## Quick start example

**parse.js**
```javascript
#!/usr/bin/env node
'use strict';

var parsed = require('arghs')
  .named(['path', 'dest'])
  .options({
    'id': 'array',
    'num': 'string',
    'post': 'bool',
    'verbose': 'count',
  })
  .aliases({
    'i': 'id',
    'n': 'num',
    'p': 'post',
    'v': 'verbose'
  })
  .help({
    'id': 'use item id(s) for request',
    'num': 'number of items to retrieve',
    'post': 'send POST request instead of GET',
    'verbose': 'show parsed request parameters'
  })
  .strict({
    named: true,
    unnamed: false,
    unknown: false,
    invalid: true
  })
  .usage('Usage: $1 [OPTIONS...] <PATH> <DEST>\nParse args and display, with PATH and DEST as just...things')
  .parse();

console.log('Args:', parsed);
console.log('Unnamed:', parsed._);
console.log('Unknown:', parsed.$);
console.log('Overflow:', parsed['--']);
```

### or...

**parse.js**
```javascript
#!/usr/bin/env node
'use strict';

var parsed = require('arghs')({
	named: ['path', 'dest'],
	options: {
		'id': 'array',
		'num': 'string',
		'post': 'bool',
		'verbose': 'count',
	},
	aliases: {
		'i': 'id',
		'n': 'num',
		'p': 'post',
		'v': 'verbose'
	},
	help: {
		'id': 'use item id(s) for request',
		'num': 'number of items to retrieve',
		'post': 'send POST request instead of GET',
		'verbose': 'show parsed request parameters'
	},
	strict: {
    named: true,
    unnamed: false,
    unknown: false,
	  invalid: true
	},
	usage: 'Usage: $1 [OPTIONS...] <PATH> <DEST>\nParse args and display, with PATH and DEST as just...things'
}).parse();

console.log('Args:', parsed);
console.log('Unnamed:', parsed._);
console.log('Unknown:', parsed.$);
console.log('Overflow:', parsed['--']);
```

Try it:
```bash
parse.js beep -vv boop --id=5,10 wiki --post -n 654654 --wakka blam -- next -k
```
You should get:
```
Args: { verbose: 2,
  id: [ '5', '10' ],
  post: true,
  num: '654654',
  path: 'beep',
  dest: 'boop' }
Unnamed: [ 'wiki' ]
Unknown: { wakka: 'blam' }
Overflow: [ 'next', '-k' ]
```

Or just see the help text:
```bash
./parse.js --help
```

```
Usage: parse.js [OPTIONS...] <PATH> <DEST>
Parse args and display, with PATH and DEST as just...things

Options:
  -h, --help     show this help message and exit
  -i, --id       use item id(s) for request
  -n, --num      number of items to retrieve
  -p, --post     send POST request instead of GET
  -v, --verbose  show parsed request parameters
```

## Returned object

Let's call it `parsed`. Any options you specify in `options()`, and any named positional arguments in `named()`, will, if given values on the command line, be present in `parsed` as own, enumerable properties. Additional (unnamed) positional arguments are available as an array at `parsed._`. Extra (unknown) options and their values are in a POO at `parsed.$`. Overflow arguments — anything given after `--` on the command line — are in an array at `parsed['--']`. Invalid options (missing values, unknown short options, multiply-specified single options) are at `parsed['?']` (unless you're running in `strict()` mode, in which case the usage message and validation error are printed to `stderr` and the process exits).

The properties `_`, `$`, `?`, and `--` are non-enumerable, as well, so you can safely iterate over `parsed` and not accidently pollute something else with extra stuff.

## Option types

You've got `bool`, `count`, `string`, and `array`. **Arghs** does no type conversions on its own, assuming you'll know better, except for splitting the `--option=val1,val2,val3` syntax into an array of `['val1', 'val2', 'val3']`. If `string` options are specified multiple times, the latest value wins, and an error is added to `parsed['?']` for that option name. (For `bool` options, the error is also added, but overwriting `true` with `true` is less useful.)

Options not given on the command line are not present as properties in `parsed`. However, *named* arguments not given are explicitly set in `parsed` with a value of `undefined`. Unknown options given with long syntax (`--option`) are assumed to consume the following argument as a value (the following *non-hyphenated* argument, that is — if the next argument begins with `--`, it's considered invalid). Unknown options with short syntax (`-o`) are ignored and the error added.

## Option syntax

Full options are given with a `--` prefix, as in `--option`. Options of type `bool` and `count` consume no additional arguments, where `string` and `array` options consume the next non-hyphenated argument as their value (`--option value` for strings, or `--option value1 --option value2` for arrays), or can be given in contiguous form using '=' (as in `--option=value` for strings, or `--option=value1,value2` for arrays). By default, unknown options are considered strings, and are converted to arrays if given multiple times.

Short options, as in `-o`, are accepted if there is a corresponding entry in `aliases()`. Bool and count options can be combined, as in `-bcc`. String and array options consume the next non-hyphenated argument (`-o value` for strings, `-o value1 -o value2` for arrays). Note: short options cannot use the '=' syntax, so `-o=value` is invalid.

## Have fun (and stop writing argument parsers)!
