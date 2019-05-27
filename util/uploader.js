const fs = require('fs');
const logger = require('./logger.js');

module.exports = (oPath, nPath, uploadDir) => new Promise((resolve, reject) => {
	if (!fs.existsSync(uploadDir)) {
		fs.mkdir(uploadDir, mkErr => {
			if (mkErr) {
				logger.error('[uploader - mkdir(): 1]\n', mkErr);
				reject(mkErr);
				return;
			}
			fs.readFile(oPath, (readErr, data) => {
				if (readErr) {
					logger.error('[uploader - readFile(): 1]\n', readErr);
					reject(readErr);
					return;
				}
				fs.writeFile(nPath, data, writeErr => {
					if (writeErr) {
						logger.error('[uploader - writeFile(): 1]\n', writeErr);
						reject(writeErr);
						return;
					}
					resolve();
					// fs.unlink(oPath, unlinkErr => {
					// 	if (unlinkErr) {
					// 		logger.error('[uploader - unlink(): 1]\n', unlinkErr);
					// 		reject(unlinkErr);
					// 		return;
					// 	}
					// 	resolve();
					// });
				});
			});
		});
	}
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
			resolve();
			// fs.unlink(oPath, unlinkErr => {
			// 	if (unlinkErr) {
			// 		logger.error('[uploader - unlink(): 2]\n', unlinkErr);
			// 		reject(unlinkErr);
			// 		return;
			// 	}
			// 	resolve();
			// });
		});
	});
});
