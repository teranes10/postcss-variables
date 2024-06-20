// tooling
import getClosestVariable from './get-closest-variable';
import manageUnresolved from './manage-unresolved';

// return content with its variables replaced by the corresponding values of a node
export default function getReplacedString(string, node, opts) {
	let replacedString = string.replace(
		matchVariables,
		(match, before, name1, name2, name3) => {
			// conditionally return an (unescaped) match
			if (before === '\\') {
				return match.slice(1);
			}

			// the first matching variable name
			const name = name1 || name2 || name3;

			// the closest variable value
			const value = getClosestVariable(name, node.parent, opts);

			// if a variable has not been resolved
			if (undefined === value) {
				manageUnresolved(node, opts, name, `Could not resolve the variable "$${name}" within "${string}"`);

				return match;
			}

			// the stringified value
			const stringifiedValue = `${before}${stringify(value)}`;

			return stringifiedValue;
		}
	);

	const {name, args} = isFunctionCall(replacedString) || {};
	if (name && opts.functions.hasOwnProperty(name)) {
		try{
			replacedString = opts.functions[name](...args);
		}catch(e){
			console.error(name, e);
		}
	}

	return replacedString;
}

function isFunctionCall(string) {
	const match = matchFunctionCall.exec(string);
	if (!match) {
		return undefined;
	}

	// Extract the function name and arguments string from the capturing groups
	const functionName = match[1].trim();
	const argsString = match[2].trim();

	// Split the arguments string by comma, taking care of possible spaces around commas
	const args = argsString ? argsString.split(/\s*,\s*/) : [];

	return { name: functionName, args };
}

// match name(), name(arg1, arg2, ...)
const matchFunctionCall = /^\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(([^()]*)\)\s*;?\s*$/;

// match all $name, $(name), and #{$name} variables (and catch the character before it)
const matchVariables = /(.?)(?:\$([A-z][\w-]*)|\$\(([A-z][\w-]*)\)|#\{\$([A-z][\w-]*)\})/g;

// return a sass stringified variable
const stringify = object => Array.isArray(object)
	? `(${object.map(stringify).join(',')})`
: Object(object) === object
	? `(${Object.keys(object).map(
		key => `${key}:${stringify(object[key])}`
	).join(',')})`
: String(object);
