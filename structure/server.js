const express = require('express');
const app = express();
const httpServer = require('http').Server(app);
const logger = require('../util/logger.js');
const helmet = require('helmet');

const server = {
	startServer: port => {
		const externalRoutes = require('./routes.js');
		app.set('view engine', 'ejs');
		app.use(helmet());
		app.use('/', externalRoutes);
		httpServer.listen(port, () => {
			logger.info(`Server started on port ${port}`);
		});
	}
};

module.exports = server;
