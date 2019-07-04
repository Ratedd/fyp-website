const fs = require('fs');
const parse = require('csv-parse');

module.exports = filePath => {
	const csvData = [];
	fs.createReadStream(filePath)
		.pipe(parse({ delimiter: ',' }))
		.on('data', csvRow => {
			console.log(csvRow);
			csvData.push(csvRow);
		})
		.on('end', () => {
			console.log(csvData);
		});
};
