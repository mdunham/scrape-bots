/**
 * Product Scrape
 * 
 * This will process the HTML of a product page, and extract data required for 
 * generating the Google shopping product feed.
 * 
 * @author Matthew Dunham <matt@hotcoffeydesign.com>
 * @copyright All rights reserved by Hot Coffey Design
 */

/**
 * Main execution loop
 */
(function(casper){
	
	var
	
		/**
		 * Array of urls to crawl
		 * 
		 * @var array
		 */
		crawlUrls = require('crawlUrls.json'),
		
		/**
		 * This is where the product feed data is stored
		 * 
		 * @type Array
		 */
		feedData = [],
		
		/**
		 * This method is used with Casper.evaluate() to extract feed data from a page
		 * 
		 * @returns Array
		 */
		evaluateProduct = function() {
			
			var

				/**
				 * Query Selector All
				 * 
				 * @param String selector
				 * @returns NodeList
				 */
				_query = function(selector) {
					return document.querySelectorAll(selector);
				},

				/**
				 * Query Selector All From Scope
				 * 
				 * @param Node element
				 * @param String selector
				 * @returns NodeList
				 */
				_subQuery = function(element, selector) {
					return element.querySelectorAll(':scope ' + selector);
				},

				/**
				 * Extract the text from a tag
				 * 
				 * @param Node element
				 * @param String selector
				 * @returns String
				 */
				_textVal = function(element, selector) {
					var ele = element.querySelector(':scope ' + selector);

					if (null === ele) {
						console.log('Unable to locate ' + selector);
						return '';
					} else {
						return (ele.innerText).trim();
					}
				},

				/**
				 * Get a products absolute url or the current url
				 * 
				 * @param Node element
				 * @returns String
				 */
				_getUrl = function(element) {
					var uri = _getAttr(element, _selectorMap['product_url'], 'value'); 
					return (uri && 'https://tulsachain.com/' + uri.replace(/^\//, '')) || window.location.href;
				},

				/**
				 * Get thevalue of an elements attribute
				 * 
				 * @param Node element
				 * @param String selector
				 * @param String attr
				 * @returns String
				 */ 
				_getAttr = function(element, selector, attr) {
					var ele = element.querySelector(':scope ' + selector);

					if (null === ele) {
						console.log('Unable to locate ' + selector);
						return '';
					} else {
						return (ele.getAttribute(attr)).trim();
					}
				},

				/**
				 * Shorthand for [].map.call
				 * 
				 * @param String selector
				 * @param Function callback
				 * @returns void
				 */
				_forEach = function(array, callback) {
					[].map.call(array, callback);
				},

				/**
				 * Map product data attributes to the datasource Node's selector
				 * post_title	post_name	post_status	sku	downloadable	virtual	visibility	stock	stock_status	backorders	manage_stock	regular_price	sale_price	tax_status	tax:product_type	tax:product_cat
				 * @type Object
				 */
				_dataMap = {
					'post_title': '',
					'post_name': '',
					'post_status': 'publish',
					'sku': '',
					'downloadable': 'no',
					'virtual': 'no',
					'visibility': 'visible',
					'stock': '',
					'stock_status': '',
					'backorders': '',
					'manage_stock': '',
					'regular_price': '',
					'sale_price': '',
					'weight': '',
					'length': '',
					'width': '',
					'height': '',
					'tax_status': '',
					'tax_class': '',
					'tax:product_type': '',
					'tax:product_cat': '',
					'tax:product_brand': ''
				},

				/**
				 * Helper function for parsing urls into parts
				 * 
				 * @param String url
				 * @returns Object
				 */	
				parseURL = function(url) {
					var 
						parser = document.createElement('a'),
						searchObject = {},
						queries, split, i;

					parser.href = url;

					queries = parser.search.replace(/^\?/, '').split('&');
					
					for (i = 0; i < queries.length; i++) {
						split = queries[i].split('=');
						searchObject[split[0]] = split[1];
					}
					
					return {
						protocol: parser.protocol,
						host: parser.host,
						hostname: parser.hostname,
						port: parser.port,
						pathname: parser.pathname,
						search: parser.search,
						searchObject: searchObject,
						hash: parser.hash
					};
				},
				
				/**
				 * Checks to see if the current page has a product
				 * 
				 * @type bool
				 */
				productExists = !_query('#productInfoNoProductMainContent').length,
				
				/**
				 * Contains extracted feed data for the current page
				 * 
				 * @type Array
				 */
				feedData = [];

			console.log('Processing page for product feed data');

			// If there are products to process
			if (productExists) {
				
				var 
					
					// Product Name
					name = _textVal(document, '#productName'),
						
					// Full size product image
					image = _getAttr(document, '#productMainImage img', 'src'),
					
					// Product price
					price = (_textVal(document, '#productPrices') || 'error').replace('$', ''),
					
					// Description if present
					description = _textVal(document, '#productDescription') || '',
						
					// List of extra data like model and stock level
					metaUl = _query('ul#productDetailsList li'),
					
					// The current breadcrum reading
					category = _textVal(document, '#navBreadCrumb'),
					
					// Default for stock level
					stockLvl = '',
						
					// Default for model
					model = '';
				
				
				// Correct image path
				if (image) {
					image = 'https://fatboytactical.net/' + image;
				}
			
				// Check if the categroy is readable
				if (-1 !== category.indexOf('::')) {
					category = category.split('::');
					category.shift();
					category = category.map(function(txt){ return txt.trim(); });
					category = category.join('>');
				} else {
					category = 'Unknown';
				}

				// Process the meta data like model and stock
				_forEach(metaUl, function(li){
					var txt = li.innerText;
					if (-1 !== txt.indexOf('Units in Stock')) {
						stockLvl = txt.replace(' Units in Stock', '').trim();
					} else if (0 === txt.indexOf('Model: ')) {
						model = txt.replace('Model: ', '').trim();
					}
				});
				
				// Compile the product data
				feedData.push({
					'post_title': name,
					'post_name': name.toLowerCase().replace(/\W+s\'/g, "").replace(/ /g, '-'),
					'post_status': 'publish',
					'sku': '',
					'downloadable': 'no',
					'virtual': 'no',
					'visibility': 'visible',
					'stock': stockLvl,
					'stock_status': 'instock',
					'backorders': 'no',
					'manage_stock': stockLvl ? 'yes' : 'no',
					'regular_price': price,
					'sale_price': '',
					'weight': '',
					'length': '',
					'width': '',
					'height': '',
					'tax_status': 'taxable',
					'tax_class': '',
					'tax:product_type': 'simple',
					'tax:product_cat': category,
					'tax:product_brand': model
				});
				
				console.log('Found - ' + name + ' ($' + price + ')');
			} else {
				console.log('No product found - ' + window.location.href);
			}
			
			console.log('returning ' + feedData.length);
			return feedData;
		},
		
		/**
		 * Process all products
		 * 
		 * @returns void
		 */
		crawlStart = function(){
			casper.echo(crawlUrls.length + ' urls total to crawl');
			while (crawlUrls.length) {
				casper.thenOpen(crawlUrls.pop(), function() {
					casper.wait(5000, function() {
						reportErrors(function() {
							feedData = feedData.concat(casper.evaluate(evaluateProduct));
						});
					});
				});
			}
		},
		
		/**
		 * Reports back errors
		 * 
		 * @returns void
		 */
		reportErrors = function (f) {
			var ret = null;
			try {
				ret = f();
			} catch (e) {
				casper.echo("ERROR: " + e);
				casper.exit();
			}
			return ret;
		};
	
	// Start of execution
	casper
	
		// Listener for console messages
		.on('remote.message', function (msg) {
			if (msg && -1 === msg.indexOf('[obj') && -1 === msg.indexOf('displayed insecure content from'))
				casper.echo(msg, (-1 !== msg.indexOf('Done') || -1 !== msg.indexOf('New F')) ? 'INFO' : (-1 !== msg.indexOf('Ignored')) ? 'ERROR' : '');
		})

		// Load failed
		.on('load.failed', function (msg) {
			casper.echo('Failed site: ' + casper.getCurrentUrl());
		})
		
		.start().then(function(){ casper.echo('Crawl starting...'); reportErrors(crawlStart); })
		
		// Execute
		.run(function(){
			casper.echo('Done! Saving feedData.json...');
			require('fs').write('feedData.json', JSON.stringify(feedData), 'w');
			casper.echo(JSON.stringify(feedData));
			casper.exit(0);
		});
	
})(require('casper').create({
	verbose: false,
	pageSettings: {
        loadImages:  false,        // do not load images
        loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
    }
}));

