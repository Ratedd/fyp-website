const bodyParser = require('body-parser');
const server = require('./server.js');
const session = require('express-session');
const DynamoDBStore = require('connect-dynamodb')(session);
const apiHelper = require('./apiHelper.js');
const logger = require('../util/logger.js');
const formidable = require('formidable');
const uploader = require('../util/uploader.js');
const Path = require('path');
const _ = require('lodash');
const querystring = require('querystring');
const fs = require('fs');
let failed = 0;
let fileUploadError = 0; // 1 = fs.mkdirSync error, 2 = add workshop to db error, 3 = uploader error

const routes = () => {
	const externalRoutes = require('express').Router(); // eslint-disable-line new-cap
	const io = server.getSocketIO();

	externalRoutes.use(session({
		secret: 'alumni',
		resave: true,
		saveUninitialized: false,
		store: new DynamoDBStore({
			AWSConfigJSON: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
				region: process.env.AWS_REGION
			}
		})
	}));

	externalRoutes.use(bodyParser.urlencoded({ extended: true }));

	externalRoutes.get('/js/*', (req, res) => {
		res.sendFile(req.originalUrl, { root: './' });
	});

	externalRoutes.get('/css/*', (req, res) => {
		res.sendFile(req.originalUrl, { root: './' });
	});

	externalRoutes.get('/', (req, res) => {
		res.render('index', { user: req.session.user });
	});

	externalRoutes.get('/login', (req, res) => {
		if (!req.session.user) {
			return res.render('login', { user: req.session.user, loginFailed: failed });
		}

		if (!req.session.user.isAdmin) {
			return res.redirect('/');
		}
		res.redirect('/admin');
	});

	externalRoutes.get('/admin', (req, res) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}
		if (!req.session.user.isAdmin) {
			return res.redirect('/');
		}
		return res.render('admin', { user: req.session.user });
	});

	externalRoutes.get('/events', (req, res) => {
		apiHelper.getEvents().then(data => res.render('events', { user: req.session.user, events: data })).catch(err => {
			logger.error('[routes - /events]\n', err);
			return res.redirect('/');
		});
	});

	externalRoutes.get('/workshops', (req, res) => {
		apiHelper.getWorkshops().then(data => {
			logger.info('workshopData', data);
			res.render('workshops', { user: req.session.user, workshops: data });
		}).catch(err => {
			logger.error('[routes - /events]\n', err);
			return res.redirect('/');
		});
	});

	externalRoutes.post('/addworkshop', (req, res) => {
		// if (!req.session.user) {
		// 	return res.redirect('/login');
		// }

		// if (!req.session.user.isAdmin) {
		// 	return res.redirect('/');
		// }
		const form = new formidable.IncomingForm();
		form.maxFileSize = 200 * 1024 * 1024;
		form.parse(req, async (err, fields, files) => {
			if (err) {
				fileUploadError = 1;
				logger.error('formidable', err);
				return res.redirect('/admin');
			}

			const { path, name } = files.file;
			if (!path || !name) {
				return res.redirect('/admin');
			}
			const uploadDir = Path.join(process.cwd(), '/uploads/');
			const workshopThumbDir = Path.join(process.cwd(), '/uploads/', 'workshopThumbnails/');
			const newPath = Path.join(process.cwd(), '/uploads/', 'workshopThumbnails/', `${name}`);
			const dbPath = Path.join('..', '/uploads/', 'workshopThumbnails', `${name}`);

			const data = {
				workshopName: fields.workshopName,
				description: fields.workshopDesc,
				workshopThumbnail: dbPath,
				workshopDate: fields.workshopDate
			};

			const uploadDirExists = fs.existsSync(uploadDir);
			if (!uploadDirExists) {
				fs.mkdirSync(uploadDir, mkErr => {
					if (mkErr) {
						fileUploadError = 1;
						logger.error('[routes - /addworkshop: mkDir() - 1]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}
			const workshopThumbDirExists = fs.existsSync(workshopThumbDir);
			if (!workshopThumbDirExists) {
				fs.mkdirSync(workshopThumbDir, mkErr => {
					if (mkErr) {
						fileUploadError = 1;
						logger.error('[routes - /addworkshop: mkDir() - 2]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}

			apiHelper.addWorkshop(data).then(workshop => {
				logger.info('[routes - /addworkshop]\n', workshop);
			}).catch(workshopErr => {
				fileUploadError = 2;
				logger.error('[routes - /addworkshop]\n', workshopErr);
				return res.redirect('/admin');
			});

			uploader(path, newPath).then(() => res.redirect('/admin')).catch(uploadErr => {
				fileUploadError = 3;
				logger.error('[routes - /addworkshop]\n', uploadErr);
				return res.redirect('/admin');
			});
		});
	});

	externalRoutes.get('/upload', (req, res) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}
		res.render('upload');
	});

	externalRoutes.post('/announce', (req, res) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}
		if (!req.session.user.isAdmin) {
			return res.redirect('/');
		}
		const { message } = req.body;
		if (!message) {
			return res.redirect('/admin', { user: req.session.user });
		}
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
		if (!req.session.user) {
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

			const uploadDirExists = fs.existsSync(uploadDir);
			if (!uploadDirExists) {
				fs.mkdirSync(uploadDir, mkErr => {
					if (mkErr) {
						fileUploadError = 1;
						logger.error('[routes - /addworkshop: mkDir() - 1]\n', mkErr);
						return res.redirect('/');
					}
				});
			}

			uploader(path, newPath).then(() => {
				res.status(200).redirect('/');
			}).catch(uploadErr => {
				logger.error('[routes - /upload_file]\n', uploadErr);
				res.status(500).redirect('/login');
			});
		});
	});

	externalRoutes.post('/login_verification', (req, res) => {
		if (!req.session.user) {
			req.session.user = {
				uuid: '123',
				username: 'test',
				isAdmin: false
			};
		}
		res.redirect('/');
		// const { username, password } = req.body;
		// if (!username && !password) {
		// 	failed = 3;
		// 	return res.redirect('/login');
		// }
		// apiHelper.verifyAccount(username, password).then(data => {
		// 	if (data) {
		// 		req.session.user = data;
		// 		res.redirect('/');
		// 	} else {
		// 		failed = 1;
		// 		return res.redirect('/login');
		// 	}
		// });
	});

	externalRoutes.post('/logout', (req, res) => {
		if (req.session.user) {
			req.session.destroy(err => {
				if (err) {
					logger.error('[routes - /logout]\n', err);
				}
			});
			failed = 4;
		}
		return res.redirect('/login');
	});

	return externalRoutes;
};

module.exports = routes();
