const bodyParser = require('body-parser');
const server = require('./server.js');
const api = require('./apiHelper.js');
const logger = require('../util/logger.js');
const formidable = require('formidable');
const uploader = require('../util/uploader.js');
const Path = require('path');
const _ = require('lodash');
const querystring = require('querystring');
let loggedIn;

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

	externalRoutes.get('/dashboard', (req, res) => {
		res.sendFile('/views/dashboard.html', { root: './' });
	});

	externalRoutes.get('/upload', (req, res) => {
		res.sendFile('/views/upload.html', { root: './' });
	});

	externalRoutes.post('/announce', (req, res) => {
		const { message } = req.body;
		const stringMessage = _.toString(message);
		const qsMessage = querystring.encode(stringMessage);
		return console.log(qsMessage);
		api.getSubscribers().then(data => {
			api.sendAnnouncement(data).then(done => {

			}).catch(err => {

			});
		}).catch(err => {
			logger.error(err);
		});
	});

	externalRoutes.post('/upload_file', (req, res) => {
		const form = new formidable.IncomingForm();
		form.maxFileSize = 200 * 1024 * 1024;
		form.parse(req, (err, fields, files) => {
			if (err) {
				io.emit('file_upload_err', { message: 'File too big' });
				return res.redirect('/upload');
			}
			const { path, name } = files.file;
			const pName = fields.name;
			if (!path || !name || !pName) {
				res.status(200).redirect('/');
				return;
			}
			const uploadDir = Path.join(process.cwd(), '/uploads');
			const newPath = Path.join(process.cwd(), '/uploads/', `${pName}_${name}`);

			uploader(path, newPath, uploadDir).then(() => {
				res.status(200).redirect('/');
			}).catch(uploadErr => {
				logger.error('[routes - /upload_file]\n', uploadErr);
				res.status(500).redirect('/login');
			});
		});
	});

	externalRoutes.post('/login_verification', (req, res) => {
		const { username, password } = req.body;
		if (!username && !password) {
			io.emit('field_empty', 'Please enter username and/or password');
			return res.redirect('/login');
		}
		api.verifyAccount(username, password).then(data => {
			if (data) {
				loggedIn = data;
				res.redirect('/dashboard');
			} else {
				io.emit('authentication', 'Invalid username and/or password');
				return res.redirect('/login');
			}
		});
	});

	return externalRoutes;
};

module.exports = routes();
