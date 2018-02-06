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
			
			// Find all product id's from the product listings page
//			var product_ids = this.evaluate(function(){
//				var t = [];
//				__utils__.findAll('a').map(function(a){
//					a = a.getAttribute('href');
//					console.log(a);
//					if ((typeof a) !== 'undefined' && a.indexOf('/AWSProducts/') === 0)
//						t.push(a.split('/')[2]);
//				});
//				return t;
//			});

			var html = this.getHTML(),
				ids  = html.match(/\/\d+\//g);
	
			// Iterate products and retrieve information
			for (var i = 0; i < ids.length; i++) {
				products.push(ids[i].slice(1, -1));
//				(function(id){
//					casper.thenOpen('http://www.tulsachain.com/asccustompages/products.asp?productid=' + id, function(){
//						products.push(this.evaluate(function(){
//							var p = [];
//							__utils__.findAll('select option').map(function(opt){
//								p.push({ value: opt.getAttribute('value'), text: opt.innerHTML});
//							});
//							return p;
//						}));
//					});
//				})(ids[i].slice(1, -1));
			}
			
			this.echo(JSON.stringify(products));
			this.exit(0);
		},
		
		/**
		 * Process all products
		 * 
		 * @returns void
		 */
		processProducts = function(){
//			
//			
//			var prodLinks = [];
//			casper
//				.start('http://www.tulsachain.com/asccustompages/htmlcataloga/')
//				.then(function(){
//					prodLinks = this.evaluate(function(){
//						var p = [];
//						__utils__.findAll('td[align="top"] a').map(function(a){
//							p.push({
//								href: a.getAttribute('href'),
//								title: a.innerText
//							});
//						});
//						return p;
//					});
//					
//					for (var i = 0; i < prodLinks.length; i++) {
//						(function(index){
//							// TODO: Process each product link and scrape info
//						})(i);
//					}
//					
//				});
			require('utils').dump(products);
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
	
	// Start of execution
	casper
	
		// Listener for console messages
		.on('remote.message', function(msg) { this.echo(msg); })

		// First web page to load
		.start('http://www.tulsachain.com/asccustompages/htmlcataloga/', process)
	
		// Execute
		.run(processProducts);
	
})(require('casper').create({
	verbose: true,
	logLevel: 'debug',
	pageSettings: {
        loadImages:  false,        // do not load images
        loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
    }
}));

