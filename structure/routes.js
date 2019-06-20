const bodyParser = require('body-parser');
const server = require('./server.js');
const apiHelper = require('./apiHelper.js');
const logger = require('../util/logger.js');
const formidable = require('formidable');
const uploader = require('../util/uploader.js');
const Path = require('path');
const _ = require('lodash');
const querystring = require('querystring');
let loggedIn;
let failed = 0;

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
		res.render('index', { user: loggedIn });
	});

	externalRoutes.get('/login', (req, res) => {
		if (!loggedIn) {
			return res.render('login', { loginFailed: failed });
		}
		res.redirect('/dashboard');
	});

	externalRoutes.get('/admin', (req, res) => {
		if (!loggedIn) {
			return res.redirect('/login');
		}
		if (loggedIn.isAdmin) {
			return res.render('admin', { user: loggedIn });
		}
		return res.redirect('/');
	});

	externalRoutes.get('/upload', (req, res) => {
		if (!loggedIn) {
			return res.redirect('/login');
		}
		res.render('upload');
	});

	externalRoutes.post('/announce', (req, res) => {
		if (!loggedIn) {
			return res.redirect('/login');
		}
		const { message } = req.body;
		const stringMessage = _.toString(message);
		const qsMessage = querystring.escape(stringMessage);
		apiHelper.getSubscribers().then(data => {
			apiHelper.sendAnnouncement(data, qsMessage).then(done => {
				if (done) {
					res.status(200).redirect('/');
				}
			}).catch(err => {
				logger.error(err);
				res.status(500).redirect('/');
			});
		}).catch(err => {
			logger.error(err);
			res.status(500).redirect('/');
		});
	});

	externalRoutes.post('/upload_file', (req, res) => {
		if (!loggedIn) {
			return res.redirect('/login');
		}
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
		failed = 2;
		res.redirect('/login');
		// const { username, password } = req.body;
		// if (!username && !password) {
		// 	io.emit('field_empty', 'Please enter username and/or password');
		// 	return res.redirect('/login');
		// }
		// apiHelper.verifyAccount(username, password).then(data => {
		// 	if (data) {
		// 		loggedIn = data;
		// 		res.redirect('/dashboard');
		// 	} else {
		// 		io.emit('authentication', 'Invalid username and/or password');
		// 		return res.redirect('/login');
		// 	}
		// });
	});

	return externalRoutes;
};

module.exports = routes();
