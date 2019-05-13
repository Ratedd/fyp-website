const express = require('express');
const app = express();
const httpServer = require('http').Server(app); // eslint-disable-line new-cap
const io = require('socket.io')(httpServer);
const logger = require('../util/logger.js');

const server = {
	getSocketIO: () => io,
	startServer: port => {
		const externalRoutes = require('./routes.js');
		app.use('/', externalRoutes);
		httpServer.listen(port, () => {
			logger.info(`Server started on port ${port}`);
		});
	}
};

module.exports = server;
