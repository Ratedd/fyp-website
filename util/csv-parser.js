const fs = require('fs');
const parse = require('csv-parse');

module.exports = filePath => new Promise((resolve, reject) => {
	const csvData = [];
	fs.createReadStream(filePath)
		.pipe(parse({ delimiter: ',' }))
		.on('data', csvRow => {
			csvData.push(csvRow);
		})
		.on('end', () => {
			resolve(csvData[0]);
		})
		.on('error', err => {
			reject(err);
		});
});
