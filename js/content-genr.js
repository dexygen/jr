/*
 * Master Top Global Root Base Special Parent Object.... thingy
 */
var upstaged = {
	/*
	 * You can define content blocks to display in your theme
	 */
	blocks : {
		//'footer.html' : 'footer',
		//'header.html' : 'header'
	},
	styles : [
		// Choose a theme CSS
		'themes/default.css',
		//'themes/simple.css',
		// Plus the code CSS if you have a programming blog
		'themes/code.css',
	],
	scripts : [
		'js/showdown.js',
		'js/prettify.js'
		// if you want jQuery or some other library for a plugin
		// '//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js'
	],
};

upstaged.pathPrefix = "../content-genr/upstaged/"; // Gets prepended to script/style path

// Plugins are defined below
upstaged.body = null;
upstaged.markdownContent = null;
upstaged.plugins = {}

/**
 * Upstaged Plugins go here
 */
upstaged.plugins.date = function(value) {
	try {
		var date = new Date(Date.parse(value));
		if(date) {
			return date.toLocaleDateString("i");
		}
	} catch (e) {
		console.log(e);
	}
}

upstaged.plugins.time = function(value) {
	try {
		var date = new Date(Date.parse(value));
		if(date) {
			return date.toLocaleTimeString("i");
		}
	} catch (e) {
		console.log(e);
	}
}

upstaged.plugins.gist = function(gistId, element){
	var callbackName = "gist_callback";
	window[callbackName] = function (gistData) {
		
		delete window[callbackName];
		var html = '<link rel="stylesheet" href="' + gistData.stylesheet + '"></link>';
		html += gistData.div;

		var gistContainer = document.createElement('div');
		gistContainer.innerHTML = html;

		element.parentNode.replaceChild(gistContainer, element);
	};

	var script = document.createElement("script");
	script.setAttribute("src", "https://gist.github.com/" + gistId + ".json?callback=" + callbackName);
	document.body.appendChild(script);
}


/**
 * CAREFUL WITH THE MAGIC BELOW ↓
 * @todo cleanup
 */

/**
 * Used to replace short codes in articles with strings or DOM elements
 */
upstaged.traverseChildNodes = function(node) {
	var next;

	if (node.nodeType === 1) {

		// (Element node)
		if (node = node.firstChild) {
			do {
				// Recursively call traverseChildNodes on each child node
				next = node.nextSibling;
				upstaged.traverseChildNodes(node);
			} while(node = next);
		}

	} else if (node.nodeType === 3) {

		// (Text node)
		node.data.replace(/\[(\w+):([^\]]+)\]/g, function(match, plugin, value) {
		
			if(upstaged.plugins[plugin]) {

				if(value = upstaged.plugins[plugin](value, node)) {
					if(typeof value === "string") {
						node.data = node.data.replace(match, value);
					} else if(typeof value === "Node") {
						node.parentNode.insertBefore(value, node);
						node.parentNode.removeChild(node);
					}
				}
			}
		});
	}
};

/*
 * The last item we are loading is the showdown.js
 * file which contains the Showdown parser. So,
 * keep testing for it until it loads!
 *
 * This isn't quite a good idea... but it works.
 */
upstaged.fireWhenReady = function(callback) {
	var timeout, b=4;

	if (typeof window.Showdown != 'undefined') {
		upstaged.run(upstaged.markdownContent);
		callback();
	} else {
		timeout = setTimeout(function() {upstaged.fireWhenReady(callback)}, 100);
	}
};

// Also: http://stackoverflow.com/a/7719185/99923
upstaged.loadScript = function(src) {
	var s = document.createElement('script');
	s.type = 'text/javascript';
	s.async = true;
	s.src = src;
	var head = document.getElementsByTagName('head')[0];
	head.appendChild(s);
};

upstaged.loadStyle = function(href, media) {
	var s = document.createElement('link');
	s.type = 'text/css';
	s.media = media || 'all';
	s.rel = 'stylesheet';
	s.href = href;
	var head = document.getElementsByTagName('head')[0];
	head.appendChild(s);
};

upstaged.loadBlock = function(file, selector) {
	ajax(file, function(html) {
		if( ! html) {
			html = 'error loading ' + file;
		}

		if(selector.substring(0,1) == '.') {
			// IE 8+ = document.querySelector(selector);
			var el = document.getElementsByClassName(selector.substring(1))[0];
		} else {
			var el = document.getElementsByTagName(selector)[0];
		}

		var e = document.createElement('div');
		e.innerHTML = html;
		while(e.firstChild) { el.appendChild(e.firstChild); }
	});
}

upstaged.run = function(markdownContent) {

	// Attach an ID (based on URL) to the body container for CSS reasons
	var id = window.location.pathname.replace(/\W+/g, '-').replace(/^\-|\-$/g, '');

	upstaged.body.id = id || 'index';

	var converter = new Showdown.converter({extensions: ['github', 'prettify', 'table'] });

	// Convert to HTML
	var html = converter.makeHtml(markdownContent);

	// Basic HTML5 shell wrapped in a div
	upstaged.body.innerHTML = '<div class="wrapper">\
		<header></header>\
		<main role="main">\
			<article>' + html + '</article>\
		</main>\
		<footer></footer>\
	</div>';

	// Find all background images and put them in the right elements
	var images = document.getElementsByTagName('main')[0].getElementsByTagName('img');

	// Put all "background" images in their repective DOM elements
	for (var i = images.length - 1; i >= 0; i--) {
		
		var img = images[i];

		// BG images have the format "_[elementname]"
		if(img.alt.substring(0,1) == '_') {

			// Look for that DOM element
			var el = document.getElementsByTagName(img.alt.substring(1))[0];
			if(el) {

				el.style.backgroundImage = 'url(' + img.src + ')';
				el.className += ' background_image';

				// We don't need this anymore
				img.parentNode.removeChild(img);
			}
		}
	}

	// Load content blocks and inject them where needed
	for (var file in upstaged.blocks) {
		upstaged.loadBlock(file, upstaged.blocks[file]);
	}

	// Allow plugins to process shortcode embeds
	upstaged.traverseChildNodes(upstaged.body);

	// Look for dates in Header elements
	for (var x in {'h2':0,'h3':0,'h4':0,'h5':0}) {
		var headers = document.getElementsByTagName(x);
		for (var i = headers.length - 1; i >= 0; i--) {
			if(Date.parse(headers[i].innerHTML.replace(/(th|st|nd|rd)/g, ''))) {
				headers[i].className += ' date';
			}
		}
	}

	// Set the title for browser tabs (not Search Engines)
	var el = document.getElementsByTagName('h1');
	if(el.length && el[0]) {
		document.title = el[0].innerHTML;
	}

	// Highlight any code out there (wait for it to load)
	setTimeout(function() { prettyPrint(); }, 500);
};

/**
 * Tiny AJAX request Object
 * @see https://github.com/Xeoncross/kb_javascript_framework/blob/master/kB.js#L30
 */
function ajax(url, callback, data)
{
	var x = new(window.ActiveXObject||XMLHttpRequest)('Microsoft.XMLHTTP');
	x.open(data ? 'POST' : 'GET', url, 1);
	x.setRequestHeader('X-Requested-With','XMLHttpRequest');
	x.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	x.onreadystatechange = function() {
		x.readyState > 3 && callback && callback(x.responseText, x);
	};
	x.send(data);
};


upstaged.initiateRun = function (options) {
	// Load the article
	upstaged.body = document.getElementsByTagName("body")[0];

	// Save the markdown for after we load the parser
	upstaged.markdownContent = upstaged.body.innerHTML;

	// Empty the content in case it takes a while to parse the markdown (leaves a blank screen)
	upstaged.body.innerHTML = '<div class="spinner"></div>';

	var stylePath, scriptPath; // Prepend upstaged.pathPrefix to these, if it exists
	
	// Load styles first
	for (var i = upstaged.styles.length - 1; i >= 0; i--) {
        stylePath = upstaged.pathPrefix ? upstaged.pathPrefix + upstaged.styles[i] : upstaged.styles[i];
        upstaged.loadStyle(stylePath);
	}

	for (var i = upstaged.scripts.length - 1; i >= 0; i--) {
        scriptPath = upstaged.pathPrefix ? upstaged.pathPrefix + upstaged.scripts[i] : upstaged.scripts[i];
        upstaged.loadScript(scriptPath);
	}

	var callback = options.callback || function() {};
	upstaged.fireWhenReady(callback);
	
	// If you want to *see* the pritty AJAX-spinner do this instead...
	//setTimeout(upstaged.fireWhenReady, 1000);
};
