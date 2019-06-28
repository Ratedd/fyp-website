const fs = require('fs');
const logger = require('./logger.js');

module.exports = (oPath, nPath, uploadDir, workshopThumbDir) => new Promise((resolve, reject) => {
	fs.readFile(oPath, (readErr, data) => {
		if (readErr) {
			logger.error('[uploader - readFile(): 2]\n', readErr);
			reject(readErr);
			return;
		}
		fs.writeFile(nPath, data, writeErr => {
			if (writeErr) {
				logger.error('[uploader - writeFile(): 2]\n', writeErr);
				reject(writeErr);
				return;
			}
			fs.unlink(oPath, unlinkErr => {
				if (unlinkErr) {
					logger.error('[uploader - unlink(): 2]\n', unlinkErr);
					reject(unlinkErr);
					return;
				}
				resolve();
			});
		});
	});
});
