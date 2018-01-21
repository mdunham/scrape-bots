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
 * Pass the global feedData array when processing more than one page at a time.
 * 
 * @type Array
 */
(function(feedData){
	
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
				console.log('Unable to locate ' + selector, element);
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
				console.log('Unable to locate ' + selector, element);
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
				'price': 'td:nth-child(5)',
			}
        },
		
		/**
		 * List of products on this page to process
		 * 
		 * @type NodeList
		 */
		products = _query(_selectorMap['products']),
		
		/**
		 * Attempts to build a map to variant data based on the variant header col data
		 * 
		 * @param NodeList variantHeaders
		 * @returns Object Containing the same keys as _selectorMap.variant_map
		 */
		_mapVariants = function(variantHeaders) {
			var variantMap = _selectorMap['variant_map'];
			
			_forEach(variantHeaders, function(element, index){
				var text = ((element.innerText).trim()).toLowerCase();
				if (-1 !== ['part number', 'part #', 'name'].indexOf(text)) {
					variantMap['part_number'] = '> td:nth-child(' + (index + 1) + ')';
				} else if ('weight' === text) {
					variantMap['weight'] = '> td:nth-child(' + (index + 1) + ')';
				} else if ('brand' === text) {
					variantMap['brand'] = '> td:nth-child(' + (index + 1) + ')';
				} else if ('price' === text) {
					variantMap['price'] = '> td:nth-child(' + (index + 1) + ')';
				} else if ('description' === text) {
					variantMap['description'] = '> td:nth-child(' + (index + 1) + ')';
				}
			});
			
			return variantMap;
		},
		
		/**
		 * Process the output from a product page
		 * 
		 * @return int The total number of dataFeed rows extracted from the document
		 */
		procesPage = function(document) {
			var count = 0;
			
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
							'brand': '',
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
								variant[dataKey] = _textVal(row, variantMap[dataKey]);
							}

							variantData.push(variant);
						});

						_forEach(variantData, function(variant){
							feedData.push({
								'id': productData['id'] + variant['part_number'],
								'title': productData['title'] + ' ' + variant['part_number'],
								'description': productData['title'],
								'product_type': productData['product_type'],
								'url': productData['url'],
								'image_link': productData['image_link'],
								'condition': productData['condition'],
								'availability': productData['availability'],
								'price': variant['price'] + ' USD',
								'brand': variant['brand'],
								'mpn': variant['part_number'],
								'adwords_grouping': productData['adwords_grouping'],
								'shipping_weight': variant['weight'] || productData['shipping_weight'],
								'adult': 'no',
								'item_group_id': productData['item_group_id'],
								'google_product_category': productData['google_product_category']
							});
							count++;
						});
					} else {
						feedData.push({
							'id': productData['id'] + productData['sku'],
							'title': productData['title'] + ' ' + productData['sku'],
							'description': productData['title'],
							'product_type': productData['product_type'],
							'url': productData['url'],
							'image_link': productData['image_link'],
							'condition': productData['condition'],
							'availability': productData['availability'],
							'price': productData['price'] + ' USD',
							'brand': productData['brand'],
							'mpn': productData['mpn'],
							'adwords_grouping': productData['adwords_grouping'],
							'shipping_weight': productData['shipping_weight'],
							'adult': 'no',
							'item_group_id': productData['item_group_id'],
							'google_product_category': productData['google_product_category']
						});
						count++;
					}
				});
			} else {
				console.log('No products found?!?!');
			}
			
			return count;
		},
		
		/**
		 * Start the main crawl
		 * 
		 * @returns void
		 */
		startCrawl = function(crawlUrls) {
			var
				xhrCache = [],
				loadNext = function() {
					if (crawlUrls.length) {
						crawl(crawlUrls.pop());
					} else {
						console.log('All URL\'s have been processed! :-)', feedData);
					}
				},
				crawl = function(url) {
					var index = xhrCache.length;
					
					xhrCache.push(new XMLHttpRequest());
					xhrCache[index].open('GET', url);
					xhrCache[index].responseType = 'document';
			
					xhrCache[index].onload = function() {
						if (this.status === 200) {
							console.log('Extracted ' + procesPage(this.responseXML) + 
									' products from ' + url);
						} else {
							console.log('Error Loading Crawl Page: Server returned HTTP'
								+ ' status code ' + this.status + ' when loading ' + url);
						}
						delete xhrCache[index];
						loadNext();
					}
					
					xhrCache[index].onerror = function() {
						console.log('Error loading url - ' + url, xhrCache);
						delete xhrCache[index];
						loadNext();
					}

					console.log('Sending request for ' + url);
					xhrCache[index].send();
					
				};
				
			if (crawlUrls.length) {
				//if (xhrCache.length < 2) {
					crawl(crawlUrls.pop());
				//}
			}
		},
		
		/**
		 * Load an XML sitemap and extract all urls that have a weekly update frequency
		 * 
		 * @param String xmlSitemapUrl
		 * @returns void
		 */
		loadCrawlLinks = function(xmlSitemapUrl){
			var 
				crawlUrls = [],
				xhr = new XMLHttpRequest(),
				process = function(data) {
					for (var i = 0, uris = data.querySelectorAll('url'); i < uris.length; i++) {
						var
						   url = uris[i].querySelector('loc').innerHTML,
						   freq = uris[i].querySelector('changefreq').innerHTML;

					   if (freq === 'weekly') {
						   crawlUrls.push(url);
					   }
				   }
				   
				   console.log('Identified ' + crawlUrls.length + ' pages to crawl');
				   console.log(JSON.stringify(crawlUrls));//startCrawl(crawlUrls);
				};
				
			xhr.open('GET', xmlSitemapUrl);
			xhr.responseType = 'document';
			
			xhr.onload = function() {
				if (xhr.status === 200) {
					process(this.responseXML);
				} else {
					console.log('loadCrawlLinks Error: Sitemap request received HTTP code'
							+ ' ' + xhr.status + ' - xmlSitemapUrl: ' + xmlSitemapUrl);
				}
			}
			
			xhr.send();
		};
	
	console.log('HCD Bot Starting: Google Product Feeds');
	loadCrawlLinks('https://tulsachain.com/?target=sitemap&index=1');
	
})([]);