/**
 * OSHA Test Utility
 * 
 * This script will save 30 hours of your life
 * 
 * Run this from the command-line: casperjs main.js
 * 
 * @author Matthew Dunham <matt@hotcoffeydesign.com>
 */

/**
 * Main execution loop
 */
(function(casper){
	
	var

		/**
		 * Process a page
		 * 
		 * @returns void
		 */
		login = function(){
			casper.waitForSelector('#LoginControlObject_UsernameTextBox', function(){
				this.fillSelectors('form', {
					'#LoginControlObject_UsernameTextBox': 'Bcg5',
					'#LoginControlObject_PasswordTextBox': 'Shane123'
				}, true);
				
				this.wait(5000, resumeCourse);
			});
		},
		
		/**
		 * Click the resume course button
		 * 
		 * @returns void
		 */
		resumeCourse = function() {
			this
				.withFrame('mainContent', function(){
					if (this.exists('#ResumeCourse')) {
						this.evaluate(function(){
							document.querySelector('#ResumeCourse').click();
						});
						this.wait(3000, detectQuiz);
					} else {
						this.echo('No resume course?');
						this.exit();
					}
				});
		},
		
		/**
		 * Detect if we are on a story or a quiz page
		 * 
		 * @returns void
		 */
		detectQuiz = function() {
			this.echo('detecting quiz');
			var reload = false;
				var time = false;
				if (this.exists('#TimeRemainingClock')) {
					time = this.getHTML('#TimeRemainingClock', false);
				}
				if (this.exists('#reviewNextLink')) {
					var link = this.getElementInfo('#reviewNextLink');
					if ( ! link.visible) {
						this.withFrame(0, function() {
							this.withFrame('scormdriver_content', function(){
								this.evaluate(function(){
									try {
										for (var i = 0; i < 350; i++) player.setSlideIndex(i);
									} catch (e) {}
								});
							});
						});
						reload = true;
					} else {
						if (time && time === '00:00:00') {
							this.click('#reviewNextLink');
							this.wait(3000, runQuiz);
						} else if (time) {
							this.echo('Time til finished: ' + time);
							this.wait(10000, detectQuiz);
						}
					}
				} else if (time) {
					this.withFrame(0, function() {
						this.withFrame('scormdriver_content', function(){
							this.evaluate(function(){
								try {
									for (var i = 0; i < 450; i++) player.setSlideIndex(i);
								} catch (e) {}
							});
						});
					});
					reload = true;
				}
			
			if (reload) {
				this.wait(8000, function(){
					this.reload();
					this.wait(8000, detectQuiz);
				});
			}
		},
		
		/**
		 * Take the quiz
		 * 
		 * @returns void
		 */
		runQuiz = function(){
			if ( ! this.exists('table[class="qinput"]')) {
				this.wait(8000, function(){
					this.reload();
					this.wait(8000, detectQuiz);
				});
			} else {
				this.evaluate(function(){
					[].map.call(document.querySelectorAll('table[class="qinput"]'), function(table) {
						var 
							radios = table.querySelectorAll(':scope input[type="radio"]'),
							hidden = table.querySelectorAll(':scope input[type="hidden"]'),
							answer = hidden && hidden.length ? parseInt(hidden[1].getAttribute('value')) : false;
						console.log(hidden[1].getAttribute('value'));
						if ( ! isNaN(answer)) {
							answer--;
							radios[answer].click();
						} else {
							console.error('Answer is not a number: ' + answer);
						}
					});
				});

				this.click('#eomsubmit');
				this.wait(4000, function(){
					this.click('input[type="submit"]');
					this.wait(4000, detectQuiz);
				});
			}
		};
		
	// The first casperjs action
	casper.start('https://home.uceusa.com/Courses/LoggedOut.aspx', login);
	casper.run(function(){
		this.echo('All done?');
	});
	
})(require('casper').create({
	verbose: true,
	logLevel: 'debug',
	pageSettings: {
        loadImages:  false,        // do not load images
        loadPlugins: false         // do not load NPAPI plugins (Flash, Silverlight, ...)
    }
}));

