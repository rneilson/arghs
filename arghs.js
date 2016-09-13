'use strict';

var path = require('path');

// Option types
var MASK_TYPE = 3;
var MASK_MULT = 4;
var OPT_BOOL = 1;
var OPT_STRING = 2;
var OPT_COUNT = MASK_MULT | OPT_BOOL;
var OPT_ARRAY = MASK_MULT | OPT_STRING;

function Arghs (config) {
	if (!(this instanceof Arghs)) {
		return new Arghs(config);
	}

	// Internal storage
	this._options = {};
	this._pnames = {};
	this._compound = camelCaser;
	this._aliases = {};
	this._named = [];
	this._usage = '';
	this._help = false;
	this._desc = {};
	this._strict = {
		named: false,
		unnamed: false,
		unknown: false,
		invalid: false,
	};

	// Default to basic, unadorned usage
	this.usage('Usage: $0 $1 [OPTIONS...]');

	var sections = ['options', 'named', 'aliases', 'usage', 'help', 'strict'];
	for (var i = 0; i < sections.length; i++) {
		var section = sections[i];
		if (config[section]) {
			this[section](config[section]);
		}
	}
}

Arghs.prototype.option = function (optname, opttype, paramname) {
	var pname = false;
	switch (opttype) {
		case 'bool':
			this._options[optname] = OPT_BOOL;
			break;
		case 'count':
			this._options[optname] = OPT_COUNT;
			break;
		case 'string':
			this._options[optname] = OPT_STRING;
			pname = true;
			break;
		case 'array':
			this._options[optname] = OPT_ARRAY;
			pname = true;
			break;
		default:
			throw new Error("Unknown option type for " + optname + ": " + opttype);
	}
	if (pname) {
		this._pnames[optname] = paramname || 'x';
	}
	return this;
}

Arghs.prototype.options = function (optionobj) {
	if (optionobj !== null && typeof optionobj === 'object') {
		var optlist = Object.keys(optionobj);
		for (var i = 0; i < optlist.length; i++) {
			var optname = optlist[i];
			var option = optionobj[optname];
			if (Array.isArray(option)) {
				this.option(optname, option[0], option[1]);
			}
			else {
				this.option(optname, option);
			}
		}
		return this;
	}
	else {
		throw new Error("'options' must be an object");
	}
}

Arghs.prototype.named = function (names) {
	if (Array.isArray(names) || typeof config.named === 'string') {
		if (Array.isArray(names)) {
			for (var i = 0; i < names.length; i++) {
				this._named.push(names[i]);
			}
		}
		else {
			this._named.push(names);
		}
		return this;
	}
	else {
		throw new Error("'named' must be an array or string");
	}
}

Arghs.prototype.alias = function (short, long) {
	if (typeof short !== 'string') {
		throw new Error("Aliases must be strings");
	}
	else if (short.length > 1) {
		throw new Error("Alias '" + short + "' is too long (must be single letter)");
	}
	else if (typeof long !== 'string' || !this._options.hasOwnProperty(long)) {
		throw new Error("Alias '" + short + "' given for invalid option '" + long + "'");
	}
	this._aliases[short] = long;
	return this;
}

Arghs.prototype.aliases = function (aliasobj) {
	if (aliasobj !== null && typeof aliasobj === 'object') {
		var aliaslist = Object.keys(aliasobj);
		var short;
		for (var i = 0; i < aliaslist.length; i++) {
			short = aliaslist[i];
			this.alias(short, aliasobj[short]);
		}
		return this;
	}
	else {
		throw new Error("'aliases' must be an object");
	}
}

Arghs.prototype.compound = function (caser) {
	switch(caser) {
		case 'camelCase':
			this._compound = camelCaser;
			break;
		case 'snake_case':
			this._compound = snake_caser;
			break;
		case 'none':
			this._compound = null;
			break;
		default:
			throw new Error("'compound' must be one of 'camelCase', 'snake_case', or 'none'");
	}
}

Arghs.prototype.usage = function (usagestr) {
	if (typeof usagestr !== 'string') {
		throw new Error("'usage' must be a string");
	}
	// Check for '$0' and/or '$1' substitutions
	usagestr = usagestr.replace('$0', path.basename(process.argv[0])).replace('$1', path.basename(process.argv[1]));
	this._usage = usagestr + '\n';
	return this;
}

Arghs.prototype.help = function (helpval) {
	// Add help option and alias
	this.option('help', 'bool');
	this.alias('h', 'help');
	// Set help string/descriptions
	if (helpval === true || helpval === undefined) {
		// Create help string on demand
		this._help = true;
	}
	else if (helpval !== null && typeof helpval === 'object') {
		// Create help string on demand using given descriptions
		this._help = true;
		this._desc = helpval;
	}
	else if (typeof helpval === 'string') {
		// Prepend usage to given help string
		this._help = helpval + '\n';
	}
	else {
		throw new Error("'help' must be a string, an object, true, or undefined");
	}
	this._desc.help = 'show this help message and exit';
	return this;
}

Arghs.prototype._makeHelp = function (descobj) {
	var prefix = '  ';
	var maxlen = 0;
	var helpstr = 'Options:\n';
	var aliases = {};
	var lines = [];
	var opt, ostr, str, keys, i;

	// First create reverse mapping of options -> aliases
	keys = Object.keys(this._aliases);
	for (i = 0; i < keys.length; i++) {
		str = keys[i];
		opt = this._aliases[str];
		aliases[opt] = str;
	}

	// Get and sort option keys
	keys = Object.keys(this._options).sort();
	// Now add options to output array
	for (i = 0; i < keys.length; i++) {
		opt = keys[i];
		ostr = opt;
		// Add parameter name if string/array
		if (this._pnames.hasOwnProperty(opt)) {
			ostr += ' <' + this._pnames[opt] + '>';
		}
		// Construct option string
		if (aliases.hasOwnProperty(opt)) {
			str = prefix + '-' + aliases[opt] + ', --' + ostr;
		}
		else {
			str = prefix + '    --' + ostr;
		}
		// Get max length for descriptions later
		maxlen = str.length > maxlen ? str.length : maxlen;
		// Push string to output array
		lines.push(str);
	}

	// Now append each string to final (keys and lines should be same length)
	for (i = 0; i < keys.length; i++) {
		opt = keys[i];
		str = lines[i];
		// Pad to maxlen
		str += ' '.repeat(maxlen - str.length);
		// Add description
		if (descobj.hasOwnProperty(opt)) {
			str += prefix + descobj[opt];
		}
		else {
			switch (this._options[opt]) {
				case OPT_BOOL:
					str += prefix + '[bool]';
					break;
				case OPT_COUNT:
					str += prefix + '[count]';
					break;
				case OPT_STRING:
					str += prefix + '[string]';
					break;
				case OPT_ARRAY:
					str += prefix + '[array]';
					break;
			}
		}
		// Append to final string
		helpstr += str + '\n';
	}

	return helpstr;
}

Arghs.prototype.strict = function (restrict) {
	if (restrict === undefined) {
		restrict = {
			named: true,
			unnamed: true,
			unknown: true,
			invalid: true
		};
	}
	else if (restrict === null || typeof restrict !== 'object') {
		throw new Error("'strict' must be an object or undefined");
	}
	this._strict.named = (restrict.named === true) ? true : false;
	this._strict.unnamed = (restrict.unnamed === true) ? true : false;
	this._strict.unknown = (restrict.unknown === true) ? true : false;
	this._strict.invalid = (restrict.invalid === true) ? true : false;
	return this;
}

Arghs.prototype.exitWith = function (exitwith) {
	var code = 1;
	var str = this._usage;
	if (exitwith === true) {
		str += (str ? '\n' : '') + ((typeof this._help === 'string') ? this._help : this._makeHelp(this._desc));
		code = 0;
	}
	else {
		if (this._help) {
			str += (str ? '\n' : '') + 'Specify --help for available options\n';
		}
		if (typeof exitwith === 'string') {
			str += (str ? '\n' : '') + exitwith + ((exitwith.endsWith('\n')) ? '' : '\n');
		}
		else if (typeof exitwith === 'number') {
			code = exitwith;
		}
	}
	process.stderr.write(str);
	process.exit(code);
}

Arghs.prototype.parse = function (argv) {
	var args;
	if (argv === undefined) {
		args = process.argv.slice(2);
	}
	else if (typeof argv === 'string') {
		args = argv.split(' ');
	}
	else if (Array.isArray(argv)) {
		args = argv
	}
	else {
		throw new Error("'args' must be undefined, string, or array");
	}

	// Properties _, $, ?, and '--' should be non-enumerable, non-configurable, non-writeable
	var parsed = {};
	Object.defineProperty(parsed, '_',  { value: [] });
	Object.defineProperty(parsed, '$',  { value: {} });
	Object.defineProperty(parsed, '?',  { value: {} });
	Object.defineProperty(parsed, '--',  { value: [] });

	// Slice and dice
	var arg, opt, err;
	while (args.length > 0) {
		arg = args.shift();
		opt = undefined;

		// Check for long forms
		if (arg.startsWith('--')) {
			// Slice off '--'
			arg = arg.substr(2);
			// Check if stopping
			if (arg === '') {
				// Copy remaining args to overflow and stop processing
				Array.prototype.push.apply(parsed['--'], args);
				break;
			}
		}
		// Check for short forms
		else if (arg.startsWith('-')) {
			// Slice off '-'
			arg = arg.substr(1);

			// Pull apart multi-switch arg
			if (arg.length > 1) {
				// Put remaining switches back into queue
				args.unshift('-' + arg.substr(1));
				arg = arg[0];
			}

			// Check for valid alias
			if (this._aliases[arg]) {
				arg = this._aliases[arg];
			}
			else {
				err = 'Unknown short option: -' + arg;
				if (this._strict.unknown) {
					this.exitWith(err);
				}
				parsed['?'][arg] = err;
				continue;
			}
		}
		// Push into arg array and skip rest of processing
		else {
			parsed._.push(arg);
			continue;
		}

		// Check for switch or option
		if (this._options[arg] === OPT_BOOL) {
			// Multiple invocations get overwritten
			if (parsed[arg]) {
				err = 'Multiple invocation of boolean option: --' + arg;
				if (this._strict.invalid) {
					this.exitWith(err);
				}
				parsed['?'][arg] = err;
			}
			parsed[arg] = true;
		}
		else if (this._options[arg] === OPT_COUNT) {
			parsed[arg] = (parsed[arg]) ? parsed[arg] + 1 : true;
		}
		else {
			// Check for option=value
			var idx = arg.indexOf('=');

			if (idx >= 0) {
				opt = arg.substr(idx + 1).split(',');
				arg = arg.substr(0, idx);
			}
			// Consume additional arg
			else if (args.length > 0) {
				opt = args.shift();
				if (opt.startsWith('-')) {
					// Put back additional arg
					args.unshift(opt);
					opt = undefined;
				}
			}

			// Strict mode check
			if (this._strict.unknown && !(this._options.hasOwnProperty(arg))) {
				this.exitWith('Unknown option: --' + arg);
			}

			// Store option in the right place
			if (opt) {
				if (this._options[arg] === OPT_ARRAY) {
					// Multiple options get stored as array regardless
					opt = (Array.isArray(opt)) ? opt : [opt];
					for (var i = 0; i < opt.length; i++) {
						if (Array.isArray(parsed[arg])) {
							parsed[arg].push(opt[i]);
						}
						else {
							parsed[arg] = [opt[i]];
						}
					}
				}
				else if (this._options[arg] === OPT_STRING) {
					// Multiple occurences of single options get overwritten
					if (Array.isArray(opt) || parsed[arg]) {
						err = 'Multiple values for single option: --' + arg;
						if (this._strict.invalid) {
							this.exitWith(err);
						}
						parsed['?'][arg] = err;
						opt = (Array.isArray(opt)) ? opt[opt.length - 1] : opt;
					}
					parsed[arg] = opt;
				}
				else {
					if (this._strict.unknown) {
						this.exitWith('Unknown option: --' + arg);
					}
					// Multiple occurences of unknown options get stored as array
					opt = (Array.isArray(opt)) ? opt : [opt];
					for (var i = 0; i < opt.length; i++) {
						if (Array.isArray(parsed.$[arg])) {
							parsed.$[arg].push(opt[i]);
						}
						else if (parsed.$[arg]) {
							parsed.$[arg] = [parsed.$[arg], opt[i]];
						}
						else {
							parsed.$[arg] = opt[i];
						}
					}
				}
			}
			else {
				// Add to invalid list
				err = 'Missing value for option: --' + arg;
				if (this._strict.invalid) {
					this.exitWith(err);
				}
				parsed['?'][arg] = err;
			}
		}
	}

	// Fixup compound options
	if (this._compound) {
		var str;
		var opts = Object.keys(this._options);
		for (var i = 0; i < opts.length; i++) {
			opt = opts[i];
			str = this._compound(opt);
			if (str !== opt && parsed.hasOwnProperty(opt)) {
				parsed[str] = parsed[opt];
				delete parsed[opt];
			}
		}
		opts = Object.keys(parsed.$);
		for (var i = 0; i < opts.length; i++) {
			opt = opts[i];
			str = this._compound(opt);
			if (str !== opt) {
				parsed.$[str] = parsed.$[opt];
				delete parsed.$[opt];
			}
		}
	}

	// Set named args
	arg = 0;
	for (var i = 0; i < this._named.length; i++) {
		var name = this._compound ? this._compound(this._named[i]) : this._named[i];
		if (parsed._.length > 0) {
			// Pull named arg from positional args, put in parsed object
			parsed[name] = parsed._.shift();
			arg++;
		}
		else {
			// Explicitly include named args in parsed object
			parsed[name] = undefined;
		}
	}

	// Print help string and exit if help enabled
	if (parsed.help && this._help) {
		this.exitWith(true);
	}

	// Check for unnamed args in strict mode
	if (parsed._.length > 0 && this._strict.unnamed) {
		this.exitWith('Received too many arguments: expected ' + this._named.length + ', got ' + (this._named.length + parsed._.length));
	}

	// Check for too few named args in strict mode
	if (this._strict.named && arg < this._named.length) {
		this.exitWith('Received too few arguments: expected ' + this._named.length + ', got ' + arg);
	}

	return parsed;
}

function camelCaser (str) {
	var pcs = str.split('-');
	if (pcs.length < 2) {
		return str;
	}
	for (var i = 1; i < pcs.length; i++) {
		var s = pcs[i];
		pcs[i] = s.charAt(0).toLocaleUpperCase() + s.slice(1).toLocaleLowerCase();
	}
	return pcs.join('');
}

function snake_caser (str) {
	var pcs = str.split('-');
	if (pcs.length < 2) {
		return str;
	}
	for (var i = 1; i < pcs.length; i++) {
		var s = pcs[i];
		pcs[i] = s.charAt(0).toLocaleLowerCase() + s.slice(1);
	}
	return pcs.join('_');
}

module.exports = Arghs;
