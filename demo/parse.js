#!/usr/bin/env node
'use strict';

var parsed = require('../../arghs')({
  named: ['path', 'dest'],
  options: {
    'default-user': 'bool',
    'id': ['array', 'id'],
    'num': ['string', 'n'],
    'post': 'bool',
    'user-id': 'string',
    'verbose': 'count',
  },
  aliases: {
    'd': 'default-user',
    'i': 'id',
    'n': 'num',
    'p': 'post',
    'u': 'user-id',
    'v': 'verbose'
  },
  help: {
    'default-user': 'use default user for request',
    'id': 'use item id(s) for request',
    'num': 'number of items to retrieve',
    'post': 'send POST request instead of GET',
    'user-id': 'use this user id for request',
    'verbose': 'show parsed request parameters'
  },
  strict: {
    unknown: false,
    unnamed: false,
    invalid: true
  },
  usage: 'Usage: $1 [OPTIONS...] <PATH> <DEST>\nParse args and display, with PATH and DEST as just...things'
}).parse();

console.log('Args:', parsed);
console.log('Unnamed:', parsed._);
console.log('Unknown:', parsed.$);
console.log('Overflow:', parsed['--']);
