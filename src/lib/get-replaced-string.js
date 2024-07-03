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

	replacedString = replacedString.replace(matchFunction, (match, funcName, argsStr) => {
		const name = funcName?.trim();

		if (name && opts.functions.hasOwnProperty(name)) {
			try {
				const args = argsStr?.trim()?.split(matchArguments)?.map(sanitizeArgument) || [];
				const result = opts.functions[name](...args);
				return transformResult(result);
			} catch (e) {
				console.error(name, e);
			}
		}

		return match;
	})

	return replacedString;
}

// match name(), name(arg1, arg2, ...) (([^()]*)\)(?=\s|\$\()/
const matchFunction = /(?:\$\(\s*|^\s*)([\w$][\w]*)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)(?:\s*\))?/g;
const matchArguments = /,\s*(?=(?:[^'"\[\]]|'[^']*'|"[^"]*"|\[[^\]]*\])*$)/g

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

function sanitizeArgument(value) {
	const regex = /^[`'"](.*)[`'"]$/;
	const matches = value.match(regex);
	if (matches) {
		return matches[1]
	}

	return value
}

function transformResult(value) {
	if (typeof value === 'object') {
		if (Array.isArray(value)) {
			return value.map(transformResult)
		} else {
			return `"${JSON.stringify(value)}"`
		}
	}

	return value;
}
