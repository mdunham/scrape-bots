/**
 * Mass WordPress Updater
 * 
 * Run from CLI: casperjs --ignore-ssl-errors=true wp-mass-update.js --url=mustangbroncosfootball.com --user=developer --pass='Freshbrew!@#)(*'
 * 
 * if url is not passed from CLI it will use the siteList variable below
 * 
 * @requires CasperJs - npm install casperjs -g
 * @author Matthew Dunham <matt@hotcoffeydesign.com>
 */

/**
 * Main execution loop
 */
(function (casper) {

	var
	
			/**
			 * List of urls to try
			 * 
			 * @var array
			 */
			siteList = [],
			//siteList = ['americanbussales.net','aprilwight.com','archeryoutbreak.com','arrow-group.com','autodistinctions.com','billings.construction','bixbyqbclub.com','blackfinxp.com','buffalonickelcrossfit.com','capstonebuildersllc.com','ccandmike.com','classiccigarsowasso.com','coachcuz.com','coachingu.com','countrysidepest.com','cozorthomes.com','crappiekillerdave.com','crossroadschurchjenks.com','cscso.com','csmlawgroup.com','divorcetulsa.com','drandreachiro.com','dratkinstulsa.com','drscottyoung.com','ECONOMY.SUPPLY','ECONOMYSUPPLY.US','ECONOMYSUPPLYOK.CO','ECONOMYSUPPLYOK.US','elitestaging.design','encinos3d.com','fliptalknetwork.com','goodiescateringok.com','greenacresodfarm.com','greenphoenixok.com','hotcoffeydesign.com','infinitytulsa.com','jenkspom.com','judyjames.com','katiewileyhomes.com','kelliecoffey.com','kwenchersliquor.com','lakemobileservices.com','launchhumanresources.com','maybelleandco.com','metrostructural.com','moxymed.me','murphywallbedusa.com','mustangbroncosfootball.com','neworleans.documart.com','nutrigreentulsa.com','okunitedallstars.com','onehopepoolgiveaway.com','pediatricsofbartlesville.com','pillboxok.com','pineridgeofficepark.com','pmchomes.com','portland.documart.com','power-play.net','reclinatagroup.com','renrealtyok.com','roccjenks.org','roofscapesexteriors.com','silexinteriors.com','southerndemo.co','southernmomma.net','southtulsairrigation.co','spectacular-homes.com','t-townsouthfitness.com','theatreartstulsa.com','thepawspaok.com','thunderpressure.com','titanqualityroofing.com','topcleaninc.com','tpucare.com','triovarx.com','truckingbootcamp.com','tulsaroofing.com','xtremebattingcages.com'],
			
			/**
			 * List of viewports sizes to capture
			 * 
			 * @type Array [width, height]
			 */
			viewports = [
				[1600, 1600]
			],
			
			/**
			 * Capture the home page of the site
			 *
			 * @return void
			 */
			captureIndex = function(url, tag) {
				tag = '';
				// Load the index page
				casper.thenOpen('http://' + url, function() {
					casper.wait(5000, function(){
						for (var index = 0; index < viewports.length; index++) {
							var 
								d = new Date(),
								viewport = viewports[index], 
								width = viewport[0], 
								height = viewport[1],
								filename = url+'-'+width+'x'+height+'_'+d.getMonth()+'-'+d.getDate()+'-'+d.getYear()+'-'+(d.getHours()+1)+'-'+d.getMinutes()+'_'+tag+'.png';

							casper.viewport(width, height);

							casper.echo('Capturing ' + url + ' @ ' + width + 'x' + height);
							casper.capture('archives/' +  filename).wait(1000);
							// casper.echo('Captured Screen: ' + 'archives/' + url + '/' + filename, 'INFO');
						}
					});
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
					ret = f(d);
				} catch (e) {
					casper.echo("ERROR: " + e);
					casper.exit();
				}
				return ret;
			};

		// Start of execution
		casper

			// Listener for console messages
			.on('remote.message', function(msg) {
				casper.echo('Console: ' + msg);
			})
			
			// Load failed
			.on('load.failed', function(msg) {
				casper.echo('Failed site: ' + casper.getCurrentUrl());
				nextSite();
			})
			
			// Capture all page initializations
			//.on('page.initialized', onPageInit)

			// Get the event chain rolling
			.start()
			
			.then(function(){
				reportErrors(function(){
					casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');
					
					siteList = casper.cli.get('url') ? [casper.cli.get('url')] : siteList;
					
					while (siteList.length) {
						reportErrors(captureIndex, siteList.pop());
					}
				});
			})

			// Execute
			.run(function(){
				casper.echo('Complete!');
				casper.exit();
			});

})(require('casper').create({
	verbose: true,
	logLevel: 'debug',
	pageSettings: {
		loadImages: true,
		loadPlugins: true 
	}
}));
