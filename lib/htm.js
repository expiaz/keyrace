(function (global){

const CACHE = {};

const TEMPLATE = document.createElement('template');

const reg = /(\$_h\[\d+\])/g;

function html(statics) {
	var tpl = CACHE[statics] || (CACHE[statics] = build(statics));
	// eslint-disable-next-line prefer-rest-params
	
	return tpl(this, arguments);
}

/** Create a template function given strings from a tagged template. */
function build(statics) {
	var str = statics[0], i = 1;
	while (i < statics.length) {
		str += '$_h[' + i + ']' + statics[i++];
	}
	// Template string preprocessing:
	// - replace <${Foo}> with <c c@=${Foo}>
	// - replace <x /> with <x></x>
	// - replace <${Foo}>a<//>b with <c c@=${Foo}>a</c>b
	TEMPLATE.innerHTML = str
		.replace(/<(?:(\/)\/|(\/?)(\$_h\[\d+\]))/g, '<$1$2c c@=$3')
		.replace(/<([\w:-]+)(?:\s[^<>]*?)?(\/?)>/g, (str, name, a) => (
			str.replace(/(?:'.*?'|".*?"|([A-Z]))/g, (s, c) => c ? ':::'+c : s) + (a ? '</'+name+'>' : '')
		))
		.trim();

	/* allow multiple root elements
	const rootEls = Array.from((TEMPLATE.content || TEMPLATE).children);
	if (rootEls.length > 1) {
		console.log(a = 'return [' + rootEls.map(walk).join(',') + ']')
		return Function('h', '$_h', a);
	}
	return Function('h', '$_h', 'return ' + walk(rootEls[0]));
	*/
	return Function('h', '$_h', 'return ' + walk((TEMPLATE.content || TEMPLATE).firstChild));
}

/** Traverse a DOM tree and serialize it to hyperscript function calls */
function walk(n) {
	if (n.nodeType != 1) {
		if (n.nodeType === 3 && n.data) return field(n.data, ',');
		return 'null';
	}
	var str = '',
		nodeName = field(n.localName, str),
		sub = '',
		start = ',({';
	for (var i = 0; i < n.attributes.length; i++) {
		var name = n.attributes[i].name;
		var value = n.attributes[i].value;
		if (name === 'c@') {
			nodeName = value;
		}
		else if (name.substring(0,3) === '...') {
			// special tweak
			// to be able to write
			// ... ${{obj}}
			// and not ...${{obj}} that breaks highligthing
			if (name.length === 3 && i + 1 < n.attributes.length) {
				name = '...' + n.attributes[++i].name
			}

			sub = '';
			start = ',Object.assign({';
			str += '},' + name.substring(3) + ',{';
		}
		else {
			str += `${sub}"${name.replace(/:::(\w)/g, (s, i) => i.toUpperCase())}":${value ? field(value, '+') : true}`;
			sub = ',';
		}
	}
	str = 'h(' + nodeName + start + str + '})';
	var child = n.firstChild;
	while (child) {
		str += ',' + walk(child);
		child = child.nextSibling;
	}
	var r = str + ')';
	console.log(r);
	return r;
}

/** Serialize a field to a String or reference for use in generated code. */
function field(value, sep) {
	const matches = value.match(reg);
	let strValue = JSON.stringify(value);
	if (matches != null) {
		if (matches[0] === value) return value;
		strValue = strValue.replace(reg, `"${sep}$1${sep}"`).replace(/"[+,]"/g, '');
		if (sep == ',') strValue = `[${strValue}]`;
	}
	return strValue;
}


// ########################## API

var componentMap = {}

/*
const toJSX = str => str.replace(/<\$\{([A-Z]\w+)\}/g, '<$1').replace(/\$\{/g, '{').replace(/\.\.\./g, '...').replace(/html`/g, '').replace(/>\s+`/g, '>')
*/

function transformComponents(statics) {
	var stats = []
	var args = [stats]

	for (let i = 0; i < statics.length; i++) {
		if (i > 0) {
			args.push(arguments[i])
		}

		let pieces = statics[i].split(/<([A-Z]\w+)/g)

		if (pieces.length === 1) {
			stats.push(statics[i])
			continue
		}

		for (let j = 0; j < pieces.length; j++) {
			if (pieces[j].length) {
				if (j % 2 === 0) {
					// static
					stats.push(pieces[j])
				} else {
					// match
					stats[stats.length - 1] += '<'

					if (!componentMap.hasOwnProperty(pieces[j]))
						throw new Error(`${pieces[j]} is not a registered component\nPlease use htm.use([${pieces[j]}, ...]) to register it`)
						
					args.push(componentMap[pieces[j]])
				}
			}
		}
	}

	return html.apply(this, args)
}

global.htm = {
	use: function (component) {
		if (Array.isArray(component)) component.forEach(this.use)
		else componentMap[component.name] = component
	},
	bind: function (ctx) {
		return transformComponents.bind(ctx)
	}
}

})(typeof module === "object" ? module.exports : window)