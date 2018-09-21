var 
	file1 = require('./feedData0.json'),
	file2 = require('./feedData1.json'),
	file3 = require('./feedData2.json'),
	file4 = require('./feedData3.json');
	file5 = require('./feedData4.json'),
	file6 = require('./feedData5.json'),
	file7 = require('./feedData6.json'),
	file8 = require('./feedData7.json');

feed = file1.concat(file2, file3, file4, file5, file6, file7, file8);

require('fs').writeFile('./feed.json', JSON.stringify(feed), (err) => {
  if (err) throw err;
  console.log('The file has been saved!');
});


