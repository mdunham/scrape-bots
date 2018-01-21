/**
 * Scrape Bot
 * 
 * 
 * @author Matthew Dunham <matt@hotcoffeydesign.com>
 */

/**
 * Main execution loop
 */
(function (casper) {

	var
	
			/**
			 * Array of Products
			 * 
			 * @var array
			 */
			categoryPages = require('sitemap.json'),
			
			/**
			 * Array of links to scrape
			 * 
			 * @type array
			 */
			dataOutput = [],
			
			productData = {},
			
			/**
			 * Setup each site to be scanned
			 * 
			 * @returns void
			 */
			init = function () {
				for (var categoryName in categoryPages) {
					processCategory.call(this, categoryName, categoryPages[categoryName], false);
				}
			},
			
			/** 
			 * Iterate over categories
			 * 
			 * @param string categoryName
			 * @param object category
			 * @returns object
			 */
			processCategory = function (categoryName, category, parentIndex) {
				var that = this;
				that.echo('Scraping Category: ' + categoryName + ' - url: ' + category['url']);
				that.thenOpen(category['url'], function () {
					try {
						var
							// read sub categories thumbnails by url
							getSubThumbs = function (subCategories, parentIndex) {
								if (Object.keys(subCategories).length) {
									var thumbByUrl = that.evaluate(function(){
										var thumbByUrl = {};
										[].map.call(document.querySelectorAll('div.SubCategoryListGrid ul.ProdictList li:not(.RowDivider) a:first-child'), function (element) {
											thumbByUrl[element.getAttribute('href')] = element.querySelector(':scope img').getAttribute('src');
										});
										return thumbByUrl;
									});
									
									for (var subCategoryName in subCategories) {
										if (thumbByUrl.hasOwnProperty(subCategories[subCategoryName]['url'])) {
											subCategories[subCategoryName]['thumb'] = thumbByUrl[subCategories[subCategoryName]['url']];
										}
										processCategory.call(that, subCategoryName, subCategories[subCategoryName], parentIndex);
									}
								}
							},
							
							/**
							 * Unique key for products
							 * 
							 * @returns string}
							 */
							_key = function(){
								return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) +
									   Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) +
									   Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) +
									   Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
							},
							
							/**
							 * Process a single product
							 * 
							 * @param string product_url
							 * @returns string
							 */
							getProduct = function(product_url) {
								var key = _key();
								
								casper.thenOpen(product_url, function(){
									casper.echo('Parsing product at key ' + key);
									productData[key] = casper.evaluate(function(){
										var prod = {
											'name': document.querySelector('h1.title').innerHTML.trim(),
											'retail_price': document.querySelector('div.RetailPrice strike') !== null ? document.querySelector('div.RetailPrice strike').innerText.replace('$', '').replace(/,/g, '') : false,
											'price': document.querySelector('em.ProductPrice') !== null ? document.querySelector('em.ProductPrice').innerText.replace('$', '').replace(/,/g, '') : false,
											'images': [],
											'attributes': [],
											'description': document.querySelector('#ProductDescription > div').innerHTML.trim(),
											'videos': document.querySelector('#VideoContainer') !== null ? document.querySelector('#VideoContainer').innerHTML.trim() : false,
											'sku': document.querySelector('div.ProductSKU div.Value').innerText.trim()
										};

										[].map.call(document.querySelectorAll('div.productOptionViewSelect > div'), function(element){
											var ret = {
												'label': element.querySelector(':scope span').innerText,
												'options': []
											};

											var options = element.querySelector(':scope select').options;

											for (var i = 0; i < options.length; i++)
												ret.options.push({
													'attribute_id': options[i].value,
													'value': options[i].innerHTML.trim()
												});

											prod.attributes.push({
												'type': 'select',
												'data': ret
											});
										});

										[].map.call(document.querySelectorAll('div.productAttributeConfigurableEntryCheckbox'), function(element){
											var ret = {
												'label': element.querySelector(':scope div.productAttributeLabel span').innerText,
												'attribute_id': element.querySelector(':scope div.productAttributeValue input[type="hidden"]').getAttribute('name'),
												'value': element.querySelector(':scope div.productAttributeValue input[type="checkbox"]').getAttribute('value')
											};

											prod.attributes.push({
												'type': 'checkbox',
												'data': ret
											});
										});

										[].map.call(document.querySelectorAll('a[href="javascript:void(0);"][rel]'), function(element){
											var imgs = JSON.parse(element.getAttribute('rel'));
											prod.images.push(imgs.largeimage);
										});

										return prod;
									});
									
								});
								
								return key;
							},
							
							// Find all the product urls and their thumbnail img
							getProducts = function() {
								var products = that.evaluate(function(){
									var products = [];

									[].map.call(document.querySelectorAll('#CategoryContent ul.ProductList li div.ProductImage a'), function (element) {
										products.push({
											'url': element.getAttribute('href'),
											'thumb': element.querySelector(':scope img').getAttribute('src')
										});
									});
									
									return products;
								});
								
								for (var i = 0; i < products.length; i++) {
									casper.echo('Product URL: ' + products[i].url);
									products[i].key = getProduct(products[i].url);
								}
								
								return products;
							};
							
							
						getSubThumbs.call(that, category['sub'], dataOutput.push({
								'categoryName': categoryName,
								'categoryImg': category['thumb'],
								'categoryUrl': category['url'],
								'productList': getProducts(),
								'parentIndex': parentIndex
							}) - 1
						);

					} catch (e) {
						casper.echo("ERROR: " + e);
						casper.exit();
					}
				});
			},

			/**
			 * Reports back errors
			 * 
			 * @returns void
			 */
			reportErrors = function (f, d) {
				var ret = null;
				try {
					ret = f.apply(d);
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
				casper.echo('Console: ' + msg);
			})
			
			// Load failed
			.on('load.failed', function (msg) {
				casper.echo('Failed site: ' + casper.getCurrentUrl());
			})

			// First web page to load
			.start().then(init)

			// Execute
			.run(function () {
				var output = {}, getCat = function(data, slug) { slug.unshift(dataOutput[i].categoryName); if (data.parentIndex !== false) return getCat(dataOutput[data.parentIndex], slug); else return slug.join(' | '); };
		
				for (var i = 0; i < dataOutput.length; i++) {
					dataOutput[i].categorySlug = getCat(dataOutput[i], []); 
					for (var p = 0; p > dataOutput[i].productList.length; p++) {
						console.log('before');
						console.log(dataOutput[i].productList[p]);
						console.log('Find key: ' + dataOutput[i].productList[p].key + ' Found: ');
						console.log(productData[dataOutput[i].productList[p].key]);
						dataOutput[i].productList[p].scraped = productData[dataOutput[i].productList[p].key];
						console.log('after');
						console.log(dataOutput[i].productList[p]);
					}
				}
				
				casper.echo(JSON.stringify(dataOutput));
				casper.echo(JSON.stringify(productData));
				//require('fs').write('scrape-output.json', JSON.stringify(output), 'w');
				casper.wait(500, function(){
					
					casper.echo('looping').exit();
				});
			});

})(require('casper').create({
	verbose: true,
	logLevel: 'debug',
	pageSettings: {
		loadImages: false, // do not load images
		loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
	}
}));

