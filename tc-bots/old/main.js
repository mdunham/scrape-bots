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
		categories = [],
		
		/**
		 * Array of product data
		 * 
		 * @var array
		 */
		products = [],
		
		/**
		 * Process a page
		 * 
		 * @returns void
		 */
		process = function(){
			categories = this.evaluate(function(){
				var t = [];
				__utils__.findAll('a.menunav').map(function(a){
					t.push({href: 'http://tulsachain.com' + a.getAttribute('href'), title: a.innerText, subcats: []});
				});
				
				return t;
			});
			for (var i = 0; i < categories.length; i++) {
				(function(index){
					casper.thenOpen(categories[index].href, function(){
						categories[index].subcats = this.evaluate(function(){
							var p = [];
							__utils__.findAll('table[bordercolor="white"] td[valign="top"] a').map(function(a){
								p.push({ href: 'http://tulsachain.com' + a.getAttribute('href'), title: a.innerText});
							});
							return p;
						});
					});
				})(i);
			}
		},
		
		/**
		 * Process all products
		 * 
		 * @returns void
		 */
		processProducts = function(){
			var prodLinks = [];
			casper
				.start('http://www.tulsachain.com/asccustompages/htmlcataloga/')
				.then(function(){
					prodLinks = this.evaluate(function(){
						var p = [];
						__utils__.findAll('td[align="top"] a').map(function(a){
							p.push({
								href: a.getAttribute('href'),
								title: a.innerText
							});
						});
						return p;
					});
					
					for (var i = 0; i < prodLinks.length; i++) {
						(function(index){
							// TODO: Process each product link and scrape info
						})(i);
					}
					
				});
			require('utils').dump(categories);
			this.exit();
		},
		
		/**
		 * Processes a single product
		 * 
		 * @param object product
		 * @returns void
		 */
		processProduct = function(product){
			
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
			casper.start('http://173.236.74.246/admin.php')
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
		};
	
	// The first casperjs action
	casper.start('http://tulsachain.com', process);
	casper.run(processProducts);
	
})(require('casper').create({
	verbose: true,
	logLevel: 'debug',
	pageSettings: {
        loadImages:  false,        // do not load images
        loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
    }
}));

