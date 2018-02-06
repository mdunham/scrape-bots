/**
 * TulsaChains Product Scraper
 * 
 * This file will connect to tulsachain.com and retrieve all product information
 * 
 * Run this from the command-line: casperjs tc-scraper.js
 * 
 * @author Matthew Dunham <matt@hotcoffeydesign.com>
 */

/**
 * Main execution loop
 */
(function(casper){
	
	var
	
		/**
		 * Array of categories
		 * 
		 * @var array
		 */
		categories = require('old_cats.json'),		
		/**
		 * Array of new categories
		 * 
		 * @var array
		 */
		newCategories = require('new_cats.json'),
		
		badIds = require('bad.json'),
		
		/**
		 * Array of product data
		 * 
		 * @var array
		 */
		products = require('products.json'),
		
		// TODO: REMOVE THIS CRUD
		log = [],
		
		/**
		 * Used to fix products
		 * 
		 * @type array
		 */
		fix_log = require('fix_log.json'),
		
		/**
		 * Array of links to all categories
		 * 
		 * @var array
		 */
		catLinks = require('cats.json'),
		
		/**
		 * Array of category images
		 * 
		 * @type object
		 */
		catImgs = {},
		
		/**
		 * Array of product ids
		 * 
		 * @var array
		 */
		product_ids = require('pids.json'),	
		
		/**
		 * List of new products and their associated IDs
		 * 
		 * @type object
		 */
		newProds = require('subprods.json'),
		
		/**
		 * New Old Products
		 * 
		 * @type object
		 */
		oldProds = require('product_data3.json'),
		
		/**
		 * Category HTML imported from old store
		 * 
		 * @type object
		 */
		newCatHtml = require('cat_html.json'),
		
		/**
		 * Mapping of old categories to new
		 * 
		 * @type Object From JSON
		 */
		oldToNew = require('old_to_new.json'),
		
		/**
		 * Loging to the old stores backend
		 * 
		 * @returns void
		 */
		thenLogin = function(){
			this.fillSelectors('form', {
				'input[name="username"]': 'tulsachain',
				'input[name="password"]': 'Laclede129'
			}, true);
			
			casper.wait(2000, function(){
				this
					.thenOpen('https://ambitiouswebssl.com/tulsachain/asccart/admin/categories/catDisplay.asp?storeid=39&cartID=')
					.waitForSelector('input[value="Show Images"]', function(){
						this.click('input[value="Show Images"]');
						this.wait(2000, findSingles);
					})
			});
		},
		
		/**
		 * Retrieves the HTML associated to each category
		 * 
		 * @returns void
		 */
		getCatHtml = function(){ 
			var output = {};
			for (var oldId in oldToNew) {
				(function(newId){
					output[newId] = false;
					casper	
						.thenOpen('https://ambitiouswebssl.com/tulsachain/asccart/admin/categories/editCategory.asp?storeID=39&Categoryid=' + oldId, function(){
							output[newId] = this.evaluate(function(){
								var sel = document.querySelector('select[name="db_productincludepage"]');
								if (sel.selectedIndex)
									return 'http://www.tulsachain.com/ASCCUSTOMINCLUDES/' + sel.options[sel.selectedIndex].value;
								else 
									return false;
							});
							
							if (output[newId]) {
								casper.thenOpen(output[newId], function(){
									output[newId] = this.evaluate(function(){
										return document.querySelector('body').innerHTML;
									});
									casper.echo('HTML Retrieved for ' + oldId, 'INFO');
								});
							} else {
								casper.echo('No HTML found for ' + oldId, 'NOTICE');
							}							
						});
				})(oldToNew[oldId]);
			}
			
			casper.echo('Saving Output...', 'NOTICE');
			casper.wait(3000, function(){
				require('fs').write('cat_html.json', JSON.stringify(output), 'w');
				casper.echo('Saved', 'INFO');
			});
		},
		
		/**
		 * Add the scraped category HTML to the category
		 * 
		 * @returns void
		 */
		addCatHtml = function(){ 
			for (var newId in newCatHtml) {
				if (newCatHtml[newId])
					(function(html){
						if (html)
							casper	
								.thenOpen('http://173.236.74.246/admin.php?target=category&id=' + newId, function(){
									if (this.exists('.page-not-found')) return;
									this.evaluate(function(full){
										try {
											tinyMCE.get('description').setContent(full);
											document.querySelector('button.submit').removeAttribute('disabled'); document.querySelector('button.submit').className = 'submit';
										} catch(e){}
									}, html);
									
									this.click('button.submit');
									this.wait(1000, function(){});
								});
					})(newCatHtml[newId]);
			}
		},
		
		/**
		 * Searchs all categories for categories that only contain one product
		 * 
		 * @returns void
		 */
		findSingles = function(){ 
			casper.echo('FINDING SINGLES', 'WARNING');
			var output = [];
			for (var key in newCategories) {
				(function(id){
					casper	
						.thenOpen('http://173.236.74.246/admin.php?target=categories&id=' + id, function(){
							if ( ! this.exists('.ui-sortable a[href^="admin.php?target=category_products&id"]')) return;

							var tmp = this.evaluate(function(){
								try {
									var output = [];
									[].map.call(document.querySelectorAll('.ui-sortable a[href^="admin.php?target=category_products&id"]'), function (ele) {
										var id = ele.getAttribute('href').replace('admin.php?target=category_products&id=', '');
										if (parseInt(ele.textContent) === 1)
											output.push(id);
									});
									return output;
								} catch(e){ return []; }
							});
							while (tmp.length) {
								output.push('http://173.236.74.246/admin.php?target=categories&id=' + tmp.pop());
							}
						});
				})(newCategories[key]);
			}
			
			casper.echo('Saving Output...', 'NOTICE');
			casper.wait(3000, function(){
				require('fs').write('singles.txt', output.join("\n"), 'w');
				casper.echo('Saved', 'INFO');
			});
		},
		
		/**
		 * Finds products with messed up variants
		 * 
		 * @returns void
		 */
		findBadAtts = function(){ 
			casper.echo('findBadAtts', 'WARNING');
			var output = [], bads = [], single = [];
			for (var i = 0; i < product_ids.length; i++) {
				(function(id){
					casper	
						.thenOpen('http://173.236.74.246/admin.php?page=attributes&target=product&product_id=' + id, function(){
							if ( ! casper.exists('.line .editable .value')) {
								casper.echo('No attributes for ' + id, 'WARNING');
								output.push('http://173.236.74.246/admin.php?page=info&target=product&product_id=' + id);
								single.push(id);
								return;
							}

							var bad = casper.evaluate(function(){
								try {
									if (document.querySelectorAll('.line .editable .value').length == 2) {
										if (document.querySelectorAll('.line .editable .value')[0].textContent.trim() == document.querySelectorAll('.line .editable .value')[1].textContent.trim()) {
											return true;
										}
									} else {
										return false;
									}
								} catch(e){ return true; }
							});
							
							if (bad) {
								casper.echo(id + ' is bad', 'WARNING');
								output.push('http://173.236.74.246/admin.php?page=attributes&target=product&product_id=' + id);
								bads.push(id);
							}
							
						});
				})(product_ids[i]);
			}
			
			casper.echo('Saving Output...', 'NOTICE');
			casper.wait(3000, function(){
				require('fs').write('bad.txt', output.join("\n"), 'w');
				require('fs').write('bad.json', JSON.stringify(bads), 'w');
				require('fs').write('single.json', JSON.stringify(single), 'w');
				casper.echo('Saved', 'INFO');
			});
		},
		
		/**
		 * Process all category images
		 * 
		 * @return void
		 */
		getCatImg = function() {			
			for (var i = 0; i < catLinks.length; i++) {
				(function(link){
					casper.thenOpen(link, function(){
						var id = link.replace('https://ambitiouswebssl.com/tulsachain/asccart/admin/categories/catDisplay.asp?categoryid=', '').replace('&storeid=39', '');
						casper.echo('Processing images for category id #' + id);
						if (casper.exists('img[src^="http://www.tulsachain.com/asccustompages/CategoryImages/"]')) {
							catImgs[categories[id]] = casper.evaluate(function(id){
								var ret = {};
								[].map.call(document.querySelectorAll('img[alt]'), function(img){ 
									ret[img.getAttribute('alt')] = img.getAttribute('src').replace('http://www.tulsachain.com/asccustompages/CategoryImages', 'http://www.tulsachain.com/asccustompages/UploadedFiles/CategoryImages'); 
								});
								return ret;
							}, id);
							casper.echo('Captured ' + catImgs[categories[id]].length + ' images for #' + id, 'INFO');
						} else {
							casper.echo('No images found for #' + id, 'ERROR');
							casper.capture('pics/' + id + '.png');
						}
					});
				})(catLinks[i]);
			}
			
			
			
			//[].map.call(document.querySelectorAll('img[alt]'), function(img){ console.log(img.getAttribute('alt') + ' - ' + img.getAttribute('src').replace('http://www.tulsachain.com/asccustompages/CategoryImages', 'http://www.tulsachain.com/asccustompages/UploadedFiles/CategoryImages')); });
		},
		
		/**
		 * Process all categories
		 * 
		 * @return void
		 */
		processCategories = function(){
			casper.thenOpen('http://173.236.74.246/k.php', function(){
				categories = this.evaluate(function(){
					var elements = document.querySelectorAll('body > ul > li'),
						recursive = function(elems){
							console.log(elems);
							var p = [];
							[].map.call(elems, function(element){
							   var title = element.querySelector('a > strong').innerText;
							   var subs = element.querySelectorAll(':scope > ul > li');
							   console.log(title);
							   p.push({title: title, subs: (((typeof subs) !== 'undefined') ? recursive(subs) : [])});
						   });
						   return p;
					};
					return recursive(elements);
				});
				this.echo(this.getHTML());
				require('utils').dump(categories);
				this.wait(13000, function(){
					casper.exit();
				});
				
			});
		},
		
		/**
		 * Process all products
		 * 
		 * @returns void
		 */
		processProducts = function(){
			for (var i = 0; i < product_ids.length; i++) {
				(function(id){
					products[id] = {};
					casper
						
						.thenOpen('https://ambitiouswebssl.com/tulsachain/asccart/admin/Products/editproduct.asp?productid=' + id, function(){
							var id = this.getElementAttribute('input[name="hdnID"]', 'value'); 
							products[id].name = this.getElementAttribute('input[name="db_ProductName"]', 'value').trim(); 
							products[id].price = this.getElementAttribute('input[name^="PP~"]', 'value').trim(); 
							products[id].weight = this.getElementAttribute('input[name="db_ProductWeight"]', 'value').trim(); 
							products[id].description = this.getElementAttribute('textarea[name="db_ProductDescription"]', 'value'); 
							products[id].html = this.evaluate(function(){
								var sel = document.querySelector('select[name="db_productincludepage"]');
								if (sel.selectedIndex)
									return 'http://www.tulsachain.com/ASCCUSTOMINCLUDES/' + sel.options[sel.selectedIndex].value;
								else 
									return false;
							});
							
							if (products[id].html) this.thenOpen(products[id].html, function(){
								products[id].html = this.evaluate(function(){
									return document.querySelector('body').innerHTML;
								});
								this.echo('HTML Retrieved for ' + id + ': ' + products[id].html);
							});
							casper.echo('Processing product: ' + products[id].name + ' (' + id + ')', 'INFO');
							products[id].cat_id = this.getElementAttribute('input[name="prodCategory_1"]', 'value');
							
						})
						.thenOpen('https://ambitiouswebssl.com/tulsachain/asccart/admin/Products/addattribute.asp?productid=' + id, function(){
							
							if (this.exists('a[href*="addattributevalues.asp?attributeid"]')) {
								casper.thenClick('a[href*="addattributevalues.asp?attributeid"]', function(){
									if (this.exists('input[name="productid"]')) {
										var id = this.getElementAttribute('input[name="productid"]', 'value'); 
										if (typeof id == 'undefined' || ! id) return;
										this.echo('Retrieving attributes for ' + id);
										products[id].subs = this.evaluate(function(id){
											var matrix = [],
												ii = 0; 
											try {
												if (document.querySelectorAll('tr[onmouseover] td:nth-of-type(2)').length && document.querySelectorAll('tr[onmouseover] td:nth-of-type(4) input').length) {
													[].map.call(document.querySelectorAll('tr[onmouseover] td:nth-of-type(2)'), function(ele) { matrix.push({ title: ele.innerText.trim() }); }); 
													ii = 0; 
													[].map.call(document.querySelectorAll('tr[onmouseover] td:nth-of-type(4) input'), function(ele) { matrix[ii].price = ele.value; ii++ }); 
													ii = 0; 
													[].map.call(document.querySelectorAll('tr[onmouseover] td:nth-of-type(7) input'), function(ele) { matrix[ii].weight = ele.value; ii++ });
												}
												//for (var ti = 0; ti <= ii; ti++) ret.push(matrix[ti]);
											} catch(e) {}
											console.log('Evaluating complete for ' + id);
											return matrix;
										}, id);
									} else {
										products[id].subs = [];
									}

									casper.echo('Processed ' + products[id].subs.length + ' sub products for (' + id + ')', 'INFO');
								});
							}

						})
						.thenOpen('http://www.tulsachain.com/asccart/productimages.asp?productid=' + id, function(){
							products[id].images = this.evaluate(function(){
								console.log('Processing images');
								var imgs = [], ii = 0, ims = document.querySelectorAll('img');
								if (ims.length)
									[].map.call(ims, function(ele){
										ii++;
										if (ii === 1) return;
										imgs.push('http://www.tulsachain.com' + ele.getAttribute('src'));
									});
								return imgs;
							});
							casper.echo('Processed ' + products[id].images.length + ' images for (' + id + ')', 'INFO');
							require('fs').write('product_data3.json', JSON.stringify(products), 'w');
						});
				})(product_ids[i]);
			}
		},
		
		/**
		 * Processes a single product
		 * 
		 * @param object product
		 * @returns void
		 */
		addProducts = function(){
			for (var key in products) {
				if ( ! products.hasOwnProperty(key)) continue;
				(function(product){
					var 
						category = categories[product.cat_id];

					if ( ! category) {
						this.echo('Unable to locate a category for', 'ERROR');
						require('utils').dump(product);
						return;
					}
					
					if (category.indexOf(' >>> ')) {
						var cat_arr = category.split(' >>> ');
						category = '';
						for (var rep = 1; rep < cat_arr.length; rep++) category = '---' + category;
						category = category + cat_arr.pop();
					}
					
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=add_product')  //http://173.236.74.246/admin.php?target=product&product_id=4059&page=attributes
						.waitForSelector('input[name="name"]', function(){
							
								this.fillSelectors('form[action="admin.php?target=product"]',{
									'input[name="name"]': product.name,
//									'#brief-description': product.description,
//									'#description': product.html,
									'#categories': newCategories[category]
								}, false);
								
								this.evaluate(function(brief, full){
									try {
										tinyMCE.get('brief-description').setContent(brief);
										tinyMCE.get('description').setContent(full);
									} catch(e){}
								}, product.description, product.html);

								if (product.images.length) {
									this.click('a.via-url');
									this.click('input[name="copy-to-file"]');
									this.sendKeys('textarea[name="url"]', product.images[0]);
									this.click('.via-url-popup button');
								} 
								this.click('button.submit');
								
								this.waitForSelector('a[href$="page=attributes"]', function(){}, function(){ this.capture('help.png'); });
								//if (product.subs.length) {
									//this.waitForSelector('a[href$="page=attributes"]', function(){
//										this.click('a[href$="page=attributes"]').waitForSelector('button.main', function(){
//											this.click('button.main');
//											this.sendKeys('input[name="newValue[-2][name]"]', 'Name');
//											for (var i = 0; i < product.subs; i++) {
//												if ( ! i) {
//													this.click('input[name$="[multiple]"]');
//													this.sendKeys('input[name="newValue[-2][value][0]"]', product.subs[i].title);
//													this.fillSelectors('form', {
//														'input[name="newValue[-2][price][0]"]': product.subs[i].price,
//														'input[name="newValue[-2][weight][0]"]': product.subs[i].weight
//													}, false);
//												} else { 
//	//												this.sendKeys('input[name="newValue[-2][value][NEW_ID]"]', product.subs[i].title);
//	//												var nIn = (i + 2) * -1, obj = {};
//	//												obj['input[name="newValue[-2][price][' + nIn + ']"]'] = product.subs[i].price;
//	//												obj['input[name="newValue[-2][weight][' + nIn + ']"]'] = product.subs[i].weight;
//	//												this.fillSelectors('form', obj, false);
//												}
//											}
										//	this.click('button.submit');
									//	})
									//});
								///}
							
						});
				})(products[key]);
			}
		},
		
		/**
		 * Add a cateogry
		 * 
		 * @returns void
		 */
		addCat = function(cateogry) {
			casper.click('button.create-inline');
			casper.echo('Adding cat: ' + cateogry.title);
			casper.sendKeys('#new-n1-name', cateogry.title);
			casper.click('button.submit');
			casper.waitForSelector('button.create-inline', function(){
				this.echo('Added: ' + cateogry.title);
				addCat(categories.shift());
			});
		},
		
		/**
		 * Called after the process is compolete
		 * 
		 * @returns void
		 */
		complete = function(){
			casper
				.start('http://173.236.74.246/admin.php')
				.waitForSelector('input[name="login"]', function(){
					this.fillSelectors('form', {
						'input[name="login"]': 'david@hotcoffeydesign.com',
						'input[name="password"]': 'HCD2014!@#'
					}, true);
				})
				.waitForSelector('a[title="Categories"]', function(){
					this.click('a[title="Categories"]');
				}).waitForSelector('button.create-inline', function(){
					addCat(categories.shift());
				});
			
			casper.run(function(){
				this.exit();
			});
		},
		
		/**
		 * Reports back errors
		 * 
		 * @returns void
		 */
		reportErrors= function(f) {
			var ret = null;
			try {
			  ret = f();
			} catch (e) {
			  casper.echo("ERROR: " + e);
			  casper.exit();
			}
			return ret;
		  },
		
		/**
		 * Add attributes
		 */
		addSubs = function(){
			for (var i = 0; i < badIds.length; i++) {
				(function(id){
					var prod = false;
					for (var o = 0; o < fix_log.length; o++) {
						if (fix_log[o].id == id) {
							prod = fix_log[o];
							break;
						}
					}
					if ( ! prod) {
						casper.echo('Couldnt find id ' + id + ' in the fix log');
						return;
					}
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=product&product_id=' + prod.id + '&page=attributes')
						.waitForSelector('button.main', function(){ reportErrors(function(){
							casper.click('button.main');
							var sub = false;
							casper.sendKeys('input[name="newValue[-2][name]"]', 'Name');
							casper.echo('Naming attribute');
							for (var i = 0; i < prod.subs.length; i++) {
								if ( ! i) {
									casper.echo('Clicking on multi-value');
									casper.click('input[name$="[multiple]"]');
									casper.echo('Adding attribute: ' + prod.subs[i].title);
									if (casper.exists('input[name="newValue[-2][value][0]"]') && prod.subs[i].title) {
										casper.sendKeys('input[name="newValue[-2][value][0]"]', prod.subs[i].title);
										sub = true;
									}

								} else { 
									casper.echo('Adding attribute: ' + prod.subs[i].title);
									if (casper.exists('input[name="newValue[-2][value][NEW_ID]"]')) {
										casper.sendKeys('input[name="newValue[-2][value][NEW_ID]"]' , prod.subs[i].title);
										sub = true;
									}
									//var nIn = (i + 2) * -1, obj = {};
									//this.sendKeys('input[name="newValue[-2][price][' + nIn + ']"]', prod.subs[i].price);
									//this.sendKeys('input[name="newValue[-2][weight][' + nIn + ']"]', prod.subs[i].weight);
								}
							}
							//this.capture('input' + ii + '.png');
							if (sub) casper.click('button.submit');
							casper.then(function(){
								//this.capture('saveinput' + ii + '.png');
							});
			  
			  //casper.exit();
			})}, function(){});
				})(badIds[i]);
			}
		},
		
		/**
		 * Add variants based on attributes
		 * 
		 * @returns void
		 */
		addVariants = function(){
			for (var i = 0; i < badIds.length; i++) {
				(function(id){
					if ( id <= 3036 ) return;
					var prod = false;
					for (var o = 0; o < fix_log.length; o++) {
						if (fix_log[o].id == id) {
							prod = fix_log[o];
							break;
						}
					}
					if ( ! prod) {
						casper.echo('Couldnt find id ' + id + ' in the fix log');
						return;
					}
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=product&product_id=' + prod.id + '&page=variants')
						.then(function(){ 
							try {
								if (this.exists('input[type="checkbox"][name^="attr["]')) {
									this.click('input[type="checkbox"][name^="attr["]');
									this.click('a.create-variants');
								}
							} catch (e) {
								casper.echo("ERROR: " + e);
							}})
//						.waitForSelector('tr td:nth-of-type(3) span.value', function(){ 
//							try {	
//								for (var i = 0; i < prod.subs.length; i++) {
//									this.echo('Starting hunt...');
//									this.echo('ID = ' + this.evaluate(function(title, price, weight){
//										var id = [].map.call(document.querySelectorAll('tr td:nth-of-type(3) span.value'),function(x) {
//											if (x.textContent == title) {
//												return x.parentNode.parentNode.parentNode.parentNode.getAttribute('data-id');
//											}
//										});
//										if (id) {
//											console.log('input[name="data[' + id.replace('.', '') + '][price]"]||' +price);
//											console.log('input[name="data[' + id.replace('.', '') + '][weight]"]||' + weight);
//											return id;
//										}
//									}, prod.subs[i].title, prod.subs[i].price, prod.subs[i].weight));
//								}
//								
//								//this.click('button.submit');
//								
//							} catch (e) {
//								casper.echo("ERROR: " + e);
//							}}, function(){});
				})(badIds[i]);
			}
		},
		
		removeAtts = function(){
			for (var ii = 0; ii < badIds.length; ii++) {
				(function(prod){
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=product&product_id=' + prod + '&page=attributes')
						.then(function(){ 
							reportErrors(function(){
//								var rep = casper.evaluate(function(){
//									[].map.call(document.querySelectorAll('input[type="checkbox"][name^="delete["]'), function(e){
//										e.click();
//									});
//									
//									return document.querySelectorAll('input[type="checkbox"][name^="delete["]').length
//								})
//								
//								
//								casper.echo(prod.id + ' has ' + rep + ' attributes');
								if (casper.exists('input[type="checkbox"][name^="delete["]')) {
									casper.click('input[type="checkbox"][name^="delete["]');
									casper.evaluate(function(){
										try {
											document.querySelector('button.submit').removeAttribute('disabled'); document.querySelector('button.submit').className = 'submit';
										} catch(e){}
									});
									
									casper.click('button.submit');
									casper.wait(1000, function(){});
									casper.echo('Deleted one', 'INFO');
								} else {
									casper.echo('No checkboxes found.');
								}
							});
						});
				})(badIds[ii]);
			}
		},
		
		/**
		 * Checking variants
		 * 
		 */
		checkVariants = function(){
			for (var ii = 0; ii < newProds.length; ii++) {
				(function(prod){
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=product&product_id=' + prod.id + '&page=variants')
						.then(function(){ 
							reportErrors(function(){
								if (typeof prod.subs === 'undefined') prod.subs = [];
								if ( ! casper.exists('tr td:nth-of-type(3) span.value') && prod.subs.length) {
									log.push({
										id: prod.id,
										missing: 'all',
										subs: prod.subs
									});
								} else if (casper.exists('tr td:nth-of-type(3) span.value')) {
									var subs = casper.evaluate(function(){
										var subs = [];

										for (var i = 0; i < document.querySelectorAll('tr td:nth-of-type(3) span.value').length; i++) {
											subs.push({
												title: document.querySelectorAll('tr td:nth-of-type(3) span.value')[i].innerText,
												price: document.querySelectorAll('input[name$="[price]"]')[i].getAttribute('value'),
												weight:document.querySelectorAll('input[name$="[weight]"]')[i].getAttribute('value'),
											});
										}
										
										return subs;
									});
									
									if (subs.length != prod.subs.length) {
										log.push({
											id: prod.id,
											missing: 'some',
											subs: prod.subs,
											found: subs
										});
									} else {
										//[].map.call()
									}
								}
								
							})
						});
				})(newProds[ii]);
			}
		},
		
		/**
		 * Add variants based on attributes
		 * 
		 * @returns void
		 */
		fixVariants = function(){
			for (var ii = 0; ii < badIds.length; ii++) {
				(function(id){
					var prod = false;
					for (var o = 0; o < fix_log.length; o++) {
						if (fix_log[o].id == id) {
							prod = fix_log[o];
							break;
						}
					}
					if ( ! prod) {
						casper.echo('Couldnt find id ' + id + ' in the fix log');
						return;
					}
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=product&product_id=' + prod.id + '&page=variants')
						.then(function(){ 
							if ( ! casper.exists('tr td:nth-of-type(3) span.value')) return;
							
							var fields = casper.evaluate(function(){
								var ret = [];
								
								[].map.call(document.querySelectorAll('input[name$="[price]"]'), function(sku){ 
									ret.push(sku.getAttribute('id').replace('price', ''));
								});
								
								return ret;
							});
							
							for (var i = 0; i < prod.subs.length; i++) {
								if (casper.exists('#' + fields[i + 1] + 'price')) {
									casper.sendKeys('#' + fields[i + 1] + 'price', prod.subs[i].price);
									casper.sendKeys('#' + fields[i + 1] + 'weight', prod.subs[i].weight);
								}
							}
							
							
							casper.click('button.regular-main-button');
							casper.wait(1000, function(){ casper.capture('testing.png'); });
							
//							try {	
//								for (var i = 0; i < prod.subs.length; i++) {
//									this.echo('Starting hunt...');
//									this.echo('ID = ' + this.evaluate(function(title, price, weight){
//										var id = [].map.call(document.querySelectorAll('tr td:nth-of-type(3) span.value'),function(x) {
//											if (x.textContent == title) {
//												return x.parentNode.parentNode.parentNode.parentNode.getAttribute('data-id');
//											}
//										});
//										if (id) {
//											console.log('input[name="data[' + id.replace('.', '') + '][price]"]||' +price);
//											console.log('input[name="data[' + id.replace('.', '') + '][weight]"]||' + weight);
//											return id;
//										}
//									}, prod.subs[i].title, prod.subs[i].price, prod.subs[i].weight));
//								}
//								
//								//this.click('button.submit');
//								
//							} catch (e) {
//								casper.echo("ERROR: " + e);
//							}
						});
				})(badIds[ii]);
			}
		},
		
	noInv = function(){
			for (var ii = 0; ii < newProds.length; ii++) {
				(function(prod){
					casper
						.thenOpen('http://173.236.74.246/admin.php?target=product&product_id=' + prod.id + '&page=inventory')
						.then(function(){ 
							if ( ! casper.exists('#enabled')) return;
							
						
							
							this.click('label[for="enabled"]');
							this.wait(200, function(){
								this.click('button.regular-main-button');
							})
							
//							try {	
//								for (var i = 0; i < prod.subs.length; i++) {
//									this.echo('Starting hunt...');
//									this.echo('ID = ' + this.evaluate(function(title, price, weight){
//										var id = [].map.call(document.querySelectorAll('tr td:nth-of-type(3) span.value'),function(x) {
//											if (x.textContent == title) {
//												return x.parentNode.parentNode.parentNode.parentNode.getAttribute('data-id');
//											}
//										});
//										if (id) {
//											console.log('input[name="data[' + id.replace('.', '') + '][price]"]||' +price);
//											console.log('input[name="data[' + id.replace('.', '') + '][weight]"]||' + weight);
//											return id;
//										}
//									}, prod.subs[i].title, prod.subs[i].price, prod.subs[i].weight));
//								}
//								
//								//this.click('button.submit');
//								
//							} catch (e) {
//								casper.echo("ERROR: " + e);
//							}
						});
				})(newProds[ii]);
			}
	};
	
//	casper.echo('Starting process...');
//
//var ids = {};
//for (var old_id in categories) {
//	var nc = '', cat = categories[old_id];
//	
//	if (cat.indexOf(' >>> ')) {
//		var spl = cat.split(' >>> ');
//		for (var i = 1; i < spl.length; i++) {
//			nc = nc + '---';
//		}
//		nc = nc + spl.pop().trim();
//	} else {
//		nc = nc + cat.trim();
//	}
//	
//	if (newCategories[nc]) {
//		ids[old_id] = newCategories[nc];
//		casper.echo('Successfully located ' + nc + ' - ' + old_id + ' = ' + newCategories[nc], 'INFO');
//	} else {
//		casper.echo('Unable to locate "' + nc + '" for old id: ' + old_id + ' -> ' + newCategories[nc], 'ERROR');
//	}
//}
//
//casper.echo(JSON.stringify(ids));
//
//casper.exit();

//		var total = 0, good = 0, matches = [];
//
//		for (var i = 0; i < newProds.length; i++) {
//			total++;
//			for (var key in products) {
//				if (products[key].name == newProds[i].name) {
//					matches.push({
//						id: newProds[i].id,
//						subs: products[key].subs
//					});
//					good++;
//				}
//			}
//		}
//		casper.echo(JSON.stringify(matches));
//		casper.echo('=========================');
//		casper.echo('Total #: ' + newProds.length + ' with ' + good + ' matches and ' + (total - good) + ' bad matches');

//var title = '1 1/2" Wide Handle Ratchet Strap w/ Built in Handle Bar loop & S-Hook',
//	oldProd;
//	
//
//for (var i in oldProds) {
//	if (oldProds[i].name == title) {
//		if (oldProd) casper.echo('Found another match for ' + title, 'COMMENT');
//		oldProd = oldProds[i];
//	}
//}
//
//if (oldProd) {
//	casper.echo('Found ' + title, 'INFO');
//} else {
//	casper.echo('Could not find ' + title, 'ERROR');
//}
//
//title = '10 Ton Fixed Spreader Beam';
//oldProd = false;
//
//for (var i in oldProds) {
//	if (oldProds[i].name == title) {
//		if (oldProd) casper.echo('Found another match for ' + title, 'COMMENT');
//		oldProd = oldProds[i];
//	}
//}
//
//if (oldProd) {
//	casper.echo('Found ' + title, 'INFO');
//} else {
//	casper.echo('Could not find ' + title, 'ERROR');
//}
//
//title = '20 Ton Fixed Spreader Beam';
//oldProd = false;
//
//for (var i in oldProds) {
//	if (oldProds[i].name == title) {
//		if (oldProd) casper.echo('Found another match for ' + title, 'COMMENT');
//		oldProd = oldProds[i];
//	}
//}
//
//if (oldProd) {
//	casper.echo('Found ' + title, 'INFO');
//} else {
//	casper.echo('Could not find ' + title, 'ERROR');
//}



	// Start of execution
	casper
	
		// Listener for console messages
//		.on('remote.message', function(msg) { if (msg.indexOf('this.') === 0) {
//				if (typeof log[this.getCurrentUrl()] == 'undefined')
//					log[this.getCurrentUrl()] = [];
//				log[this.getCurrentUrl()] .push(msg);
//				this.echo('Adding ' + msg + ' to URL ' + this.getCurrentUrl());
//				
//				require('fs').write('vars.json', JSON.stringify(log), 'w');
//	}})

		// Listener for console messages
		//.on('complete.error', function(msg) {  })

		// First web page to load
		//.start('https://ambitiouswebssl.com/tulsachain/asccart/admin/inclogin.asp', thenLogin) //For scraping
		.start('http://173.236.74.246/admin.php')

		.waitForSelector('input[name="login"]', function(){
			this
				.fillSelectors('form', {
					'input[name="login"]': 'david@hotcoffeydesign.com',
					'input[name="password"]': 'HCD2014!@#'
				}, true);
				
			this.waitForSelector('#profiler-messages', fixVariants);
		})
//
//		// Execute
		.run(function(){
			//require('fs').write('product_data2.json', JSON.stringify(products), 'w');
			//require('fs').write('fix_log.json', JSON.stringify(log), 'w');
//			require('utils').dump(log);
//			casper.wait(3000, function(){
//				
//			});
			casper.echo('Done').exit();
		});
	
})(require('casper').create({
	verbose: true,
	logLevel: 'debug',
	pageSettings: {
        loadImages:  false,        // do not load images
        loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
    }
}));

