#!/usr/bin/env node
'use strict';

var parsed = require('../../arghs')({
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
		unnamed: false,
		unknown: false,
		invalid: true
	},
	usage: 'Usage: $1 [OPTIONS...] <PATH> <DEST>\nParse args and display, with PATH and DEST as just...things'
}).parse();

// console.log('Original args:', process.argv.slice(2));
console.log('Args:', parsed);
console.log('Unnamed:', parsed._);
console.log('Unknown:', parsed.$);
console.log('Overflow:', parsed['--']);
// console.log('Invalid:');
// var invalid = Object.keys(parsed['?']);
// for (var i = 0; i < invalid.length; i++) {
// 	console.log('    ' + parsed['?'][invalid[i]]);
// }
