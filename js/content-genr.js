var upstaged = {
	blocks: [],
	scripts: [
		'js/showdown.js',
		'js/prettify.js'
	],
	styles: [
		'themes/dexygen.css',
		'themes/code.css'
	],
	plugins: {
		gist: function(gistId, element){
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
	},
	traverseChildNodes: function(node) {
		var next;

		if (node.nodeType === 1) {

			// (Element node)
			if (node = node.firstChild) {
				do {
					// Recursively call traverseChildNodes on each child node
					next = node.nextSibling;
					this.traverseChildNodes(node);
				} while(node = next);
			}

		} else if (node.nodeType === 3) {

			// (Text node)
			node.data.replace(/\[(\w+):([^\]]+)\]/g, function(match, plugin, value) {
			
				if(this.plugins[plugin]) {

					if(value = this.plugins[plugin](value, node)) {
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
	},
	afterRender: function() {},
	fireWhenReady: function(callback) {
		var timeout, b=4;

		if (typeof window.Showdown != 'undefined') {
			this.render(this.markdownContent);
			this.afterRender();
		} else {
			timeout = setTimeout(function() {
				upstaged.fireWhenReady(upstaged.afterRender())
			}, 100);
		}
	},
	loadScript: function(src) {
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.async = true;
		s.src = src;
		var head = document.getElementsByTagName('head')[0];
		head.appendChild(s);
	},
	loadStyle: function(href, media) {
		var s = document.createElement('link');
		s.type = 'text/css';
		s.media = media || 'all';
		s.rel = 'stylesheet';
		s.href = href;
		var head = document.getElementsByTagName('head')[0];
		head.appendChild(s);
	},
	loadBlock: function(file, selector) {
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
	},
	render: function(markdownContent) {
		// Attach an ID (based on URL) to the body container for CSS reasons
		var id = window.location.pathname.replace(/\W+/g, '-').replace(/^\-|\-$/g, '');

		this.body.id = id || 'index';

		var converter = new Showdown.converter({extensions: ['github', 'prettify', 'table'] });

		// Convert to HTML
		var html = converter.makeHtml(markdownContent);

		// Basic HTML5 shell wrapped in a div
		this.body.innerHTML = '<div class="wrapper">\
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
		for (var file in this.blocks) {
			this.loadBlock(file, this.blocks[file]);
		}

		// Allow plugins to process shortcode embeds
		this.traverseChildNodes(this.body);

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
	},
	run: function (options) {
		for (var option in options) {
			upstaged[option] = options[option];
		}
		
		// Load the article
		this.body = document.getElementsByTagName("body")[0];

		// Save the markdown for after we load the parser
		this.markdownContent = this.body.innerHTML;

		// Empty the content in case it takes a while to parse the markdown (leaves a blank screen)
		this.body.innerHTML = '<div class="spinner"></div>';

		var stylePath, scriptPath; // Prepend this.pathPrefix to these, if it exists
		
		// Load styles first
		for (var i = this.styles.length - 1; i >= 0; i--) {
			stylePath = this.pathPrefix ? this.pathPrefix + this.styles[i] : this.styles[i];
			this.loadStyle(stylePath);
		}

		for (var i = this.scripts.length - 1; i >= 0; i--) {
			scriptPath = this.pathPrefix ? this.pathPrefix + this.scripts[i] : this.scripts[i];
			this.loadScript(scriptPath);
		}
		
		this.fireWhenReady();
		
		// If you want to *see* the pritty AJAX-spinner do this instead...
		//setTimeout(this.fireWhenReady, 1000);
	}
};