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
							
						});
				})(newProds[ii]);
			}
	};
	

	// Start of execution
	casper
	
		// Listener for console messages
		.on('remote.message', function(msg) {  })
		.on('complete.error', function(msg) {  })

		.start('http://173.236.74.246/admin.php')
		.waitForSelector('input[name="login"]', function(){
			this
				.fillSelectors('form', {
					'input[name="login"]': 'david@hotcoffeydesign.com',
					'input[name="password"]': 'HCD2014!@#'
				}, true);
				
			this.waitForSelector('#profiler-messages', fixVariants);
		})

		.run(function(){
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

