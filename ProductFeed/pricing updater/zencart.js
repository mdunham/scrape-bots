/**
 * Product Feed Generator for TulsaChain.com
 * 
 * This will process the HTML of a product page, and extract data required for 
 * generating the Google shopping product feed.
 * 
 * @author Matthew Dunham <matt@hotcoffeydesign.com>
 * @copyright All rights reserved by Hot Coffey Design - Dec. 20th, 2017
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
				 * 
				 * @type Object
				 */
				_selectorMap = {
					'products': 'form[action="?target=cart"]',
					'variants': 'table.variants-table tr',
					'product_title': 'h1.title',
					'product_type': '#breadcrumb > ul > li:nth-child(2) > a',
					'image_link': 'div.product-photo img.product-thumbnail',
					'product_price': 'div.product-details-tabs div.price-block ul li span.price',
					'product_sku': '#product-details-tab-description > ul > li.product-sku > span',
					'product_url': 'input[name="returnURL"]',
					'product_id': 'input[name="product_id"]',
					'product_weight': '#product-details-tab-description > ul > li.product-weight > span',
					'variant_map': {
						'part_number': 'td:nth-child(1)',
						'description': 'td:nth-child(2)',
						'brand': 'td:nth-child(3)',
						'weight': 'td:nth-child(4)',
						'price': 'td:nth-child(5)'
					}
				},

				/**
				 * List of products on this page to process
				 * 
				 * @type NodeList
				 */
				products = _query(_selectorMap['products']),

				/**
				 * Lets us know if the variants have been properly mapped for this page
				 * 
				 * @type Object
				 */
				mapped = {
					'part_number': false,
					'description': false,
					'brand': false,
					'weight': false,
					'price': false
				},

				/**
				 * Attempts to build a map to variant data based on the variant header col data
				 * 
				 * @param NodeList variantHeaders
				 * @returns Object Containing the same keys as _selectorMap.variant_map
				 */
				_mapVariants = function(variantHeaders) {
					var 
						dblDesc = false,
						variantMap = _selectorMap['variant_map'];
					
					_forEach(variantHeaders, function(element, index){
						var text = ((element.innerText).trim()).toLowerCase();
						if (-1 !== ['part #', 'name'].indexOf(text) || -1 !== text.indexOf('part n')) {
							mapped.part_number = true;
							variantMap['part_number'] = '> td:nth-child(' + (index + 1) + ')';
						} else if ('weight' === text) {
							mapped.weight = true;
							variantMap['weight'] = '> td:nth-child(' + (index + 1) + ')';
						} else if ('brand' === text) {
							mapped.brand = true;
							variantMap['brand'] = '> td:nth-child(' + (index + 1) + ')';
						} else if ('price' === text) {
							mapped.price = true;
							variantMap['price'] = '> td:nth-child(' + (index + 1) + ')';
						} else if ('description' === text) {
							if (dblDesc) {
								mapped.part_number = true;
								variantMap['part_number'] = variantMap['description'];
							}
							dblDesc = true;
							mapped.description = true;
							variantMap['description'] = '> td:nth-child(' + (index + 1) + ')';
						}
					});
					
					return variantMap;
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
				 * Contains extracted feed data for the current page
				 * 
				 * @type Array
				 */
				feedData = [];

			console.log('Processing page for product feed data');

			// If there are products to process
			if (products.length) {

				// Remove best sellers or they will interfere with Variant Mapping
				_forEach(_query('.block-bestsellers'), function(element){
					element.parentNode.removeChild(element);
				});

				// Loop through each product and extract feedData rows
				_forEach(products, function(element) {
					var 
						// @type NodeList Find any variations displayed under this product
						variants = _subQuery(element, _selectorMap['variants']),

						// @type Array containing parsed data for all variants
						variantData = [],

						// Extract basic product data which is used when no variants are found
						productData = {
							'hasVariants': !!variants.length,
							'id': _getAttr(element, _selectorMap['product_id'], 'value') + '-',
							'sku': _textVal(element, _selectorMap['product_sku']),
							'title': _textVal(element, _selectorMap['product_title']),
							'description': _textVal(element, _selectorMap['product_title']),
							'image_link': _getAttr(element, _selectorMap['image_link'], 'src'),
							'product_type': _getAttr(document, _selectorMap['product_type'], 'href'),
							'brand': 'Tulsa Chain',
							'price': _textVal(element, _selectorMap['product_price']),
							'mpn': _textVal(element, _selectorMap['product_sku']),
							'shipping_weight': _textVal(element, _selectorMap['product_weight']),
							'item_group_id': _textVal(document, _selectorMap['product_type']),
							'url': _getUrl(element),
							'google_product_category': 'Hardware > Hardware Accessories > Chains',
							'adwords_grouping': 'Tulsa Chain - KSP',
							'availability': 'in stock',
							'condition': 'new'
						},

						// Map variant data to the datasource Node scoped to the variant row
						variantMap = _selectorMap['variant_map'],
						variantHeaders = _subQuery(element, _selectorMap['variants'] + ':nth-child(1) > th');

					// Make sure the image link is a full url
					if (productData['image_link']) {
						productData['image_link'] = parseURL(productData['image_link']);
						productData['image_link'] = productData['image_link'].protocol + 
							'//' + productData['image_link'].hostname + productData['image_link'].pathname;
					}
					
					// Prep the rows of data to be added to the feed
					var dataRow = [{
						'id': productData['sku'],
						'title': productData['title'],
						'description': productData['title'] + productData['sku'],
						'product_type': productData['product_type'],
						'url': productData['url'],
						'image_link': productData['image_link'],
						'condition': productData['condition'],
						'availability': productData['availability'],
						'price': productData['price'],
						'brand': productData['brand'],
						'mpn': productData['mpn'],
						'adwords_grouping': productData['adwords_grouping'],
						'shipping_weight': productData['shipping_weight'],
						'item_group_id': productData['item_group_id'],
						'google_product_category': productData['google_product_category']
					}];

					// If variants exist process them and ignore the main product
					if (productData.hasVariants) {
						if (Object.keys(variantMap).length !== (variantHeaders.length - 1)) {
							console.log('Variant header vs mapping count doesn\'t match! - (' + 
							Object.keys(variantMap).length + ' !== ' + (variantHeaders.length - 1));
						}

						variantMap = _mapVariants(variantHeaders);

						_forEach(variants, function(row, index) {
							if ( ! index) return;

							var variant = {};

							for (var dataKey in variantMap) {
								if (mapped[dataKey]) {
									variant[dataKey] = _textVal(row, variantMap[dataKey]);
								} else {
									variant[dataKey] = '';
								}
							}

							variantData.push(variant);
						});
						
						// Remove the default data row
						dataRow = [];
						
						_forEach(variantData, function(variant){
							dataRow.push({
								'id': variant['part_number'],
								'title': productData['title'],
								'description': productData['title'] + variant['part_number'],
								'product_type': productData['product_type'],
								'url': productData['url'],
								'image_link': productData['image_link'],
								'condition': productData['condition'],
								'availability': productData['availability'],
								'price': variant['price'],
								'brand': variant['brand'],
								'mpn': variant['part_number'],
								'adwords_grouping': productData['adwords_grouping'],
								'shipping_weight': variant['weight'] || productData['shipping_weight'],
								'item_group_id': productData['item_group_id'],
								'google_product_category': productData['google_product_category']
							});
						});
					}
					
					
					// Finalize the data rows and add them to the data feed
					while(dataRow.length) {
						var 
							row = dataRow.pop(),
							weight = parseFloat(row.shipping_weight.replace(' lbs')),
							price = parseFloat(row.price.replace('$', ''));
						
						row.id = row.id.trim().substring(0, 50);
						row.title = row.title.trim().substring(0, 150);
						row.brand = row.brand.trim();
						row.description = row.description.trim();
						row.mpn = row.mpn.trim();
						
						if ( ! row['id']) {
							console.log('ERROR: Empty id discovered in a dataRow!');
							continue;
						}
						
						if (weight > 2000) {
							console.log('Ignored product ' + row.title + ' because its ' +
									'weight is over googles limit of 2000 pounds');
							continue;
						}
						
						if (! price) {
							console.log('Ignored product ' + row.title + ' because its ' +
									'price is invalid: ' + typeof price + ' => ' + price);
							continue;
						}
						
						if ( ! row.brand) {
							console.log('No brand for product' + row.title);
							continue;
						}
						
						row.price = price + ' USD';
						
						console.log('New Feed Item: ' + row.title);
						for (var field in row) console.log(field + ': ' + row[field]);
						feedData.push(row);
					}
				});
			} else {
				console.log('No products found');
			}
			
			console.log('Done with page found ' + feedData.length + ' products');

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
				casper.echo('Console: ' + msg, 'INFO');
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

