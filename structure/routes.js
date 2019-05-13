const bodyParser = require('body-parser');
const server = require('./server.js');
const logger = require('../util/logger.js');

const routes = () => {
	const externalRoutes = require('express').Router(); // eslint-disable-line new-cap
	const io = server.getSocketIO();

	externalRoutes.use(bodyParser.urlencoded({ extended: true }));

	externalRoutes.get('/js/*', (req, res) => {
		res.sendFile(req.originalUrl, { root: './' });
	});

	externalRoutes.get('/css/*', (req, res) => {
		res.sendFile(req.originalUrl, { root: './' });
	});

	externalRoutes.get('/', (req, res) => {
		res.sendFile('/views/index.html', { root: './' });
	});

	externalRoutes.get('/login', (req, res) => {
		res.sendFile('/views/login.html', { root: './' });
	});

	externalRoutes.post('/login_verification', (req, res) => {
		const { username, password } = req.body;
	});

	return externalRoutes;
};

module.exports = routes();
