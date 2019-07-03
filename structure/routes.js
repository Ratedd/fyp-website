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
let announcementStatus = 0; // 1 = success, 2 = sendAnnouncement error, 3 = getSubscribers error
let addworkshopStatus = 0; // 1 = fs.mkdirSync error, 2 = add workshop to db error, 3 = general fs error, 4 = success
let addeventStatus = 0; // 1 = fs.mkdirSync error, 2 = add workshop to db error, 3 = general fs error, 4 = success

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

	externalRoutes.get('/uploads/workshopThumbnails/*', (req, res) => {
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
		// if (!req.session.user) {
		// 	return res.redirect('/login');
		// }
		// if (!req.session.user.isAdmin) {
		// 	return res.redirect('/');
		// }
		return res.render('admin', { user: req.session.user, announcementStatus, addworkshopStatus });
	});

	externalRoutes.get('/events', (req, res) => {
		apiHelper.getEvents().then(data => {
			logger.info('eventData', data);
			res.render('events', { user: req.session.user, events: data });
		}).catch(err => {
			logger.error('[routes - /events]\n', err);
			return res.redirect('/');
		});
	});

	externalRoutes.get('/addevent', (req, res) => {
		// if (!req.session.user) {
		// 	return res.redirect('/login');
		// }

		// if (!req.session.user.isAdmin) {
		// 	return res.redirect('/');
		// }
		const form = new formidable.IncomingForm();
		form.maxFileSize = 200 * 1024 * 1024;
		form.parse(req, (err, fields, files) => {
			if (err) {
				addeventStatus = 1;
				logger.error('formidable', err);
				return res.redirect('/admin');
			}

			const { path, name } = files.file;
			if (!path || !name) {
				return res.redirect('/admin');
			}
			const uploadDir = Path.join(process.cwd(), '/uploads/');
			const eventThumbDir = Path.join(process.cwd(), '/uploads/', 'eventThumbnails/');
			const newPath = Path.join(process.cwd(), '/uploads/', 'eventThumbnails/', `${name}`);
			const dbPath = `../uploads/eventThumbnails/${name}`;

			const data = {
				eventName: fields.eventName,
				description: fields.eventDesc,
				eventThumbnail: dbPath,
				eventDate: fields.eventDate
			};

			const uploadDirExists = fs.existsSync(uploadDir);
			if (!uploadDirExists) {
				fs.mkdirSync(uploadDir, mkErr => {
					if (mkErr) {
						addeventStatus = 1;
						logger.error('[routes - /addevent: mkDir() - 1]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}
			const eventThumbDirExists = fs.existsSync(eventThumbDir);
			if (!eventThumbDirExists) {
				fs.mkdirSync(eventThumbDir, mkErr => {
					if (mkErr) {
						addeventStatus = 1;
						logger.error('[routes - /addevent: mkDir() - 2]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}

			apiHelper.addWorkshop(data).then(event => {
				logger.info('[routes - /addevent]\n', event);
				uploader(path, newPath).then(() => {
					addeventStatus = 4;
					res.redirect('/admin');
				}).catch(uploadErr => {
					addeventStatus = 3;
					logger.error('[routes - /addevent]\n', uploadErr);
					return res.redirect('/admin');
				});
			}).catch(eventErr => {
				addeventStatus = 2;
				logger.error('[routes - /addevent]\n', eventErr);
				return res.redirect('/admin');
			});
		});
	});

	externalRoutes.get('/event/:id', (req, res) => {
		const { id } = req.params;
		apiHelper.getEventByUUID(id).then(event => {
			logger.info('[routes - /event/:id]\n', event);
			res.render('event', { data: event });
		}).catch(err => {
			logger.error('[routes - /event/:id]\n', err);
			res.redirect('/events');
		});
	});

	externalRoutes.get('/workshop/:id/', (req, res) => {
		const { id } = req.params;
		apiHelper.getWorkshopByUUID(id).then(workshop => {
			logger.info('[routes - /workshop/:id]\n', workshop);
			res.render('workshop', { user: req.session.user, data: workshop.data });
		}).catch(err => {
			logger.error('[routes - /workshop/:id]\n', err);
			res.redirect('/workshops');
		});
	});

	externalRoutes.post('/test', (req, res) => {
		console.log(req.body);
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
		form.parse(req, (err, fields, files) => {
			if (err) {
				addworkshopStatus = 1;
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
			const dbPath = `../uploads/workshopThumbnails/${name}`;

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
						addworkshopStatus = 1;
						logger.error('[routes - /addworkshop: mkDir() - 1]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}
			const workshopThumbDirExists = fs.existsSync(workshopThumbDir);
			if (!workshopThumbDirExists) {
				fs.mkdirSync(workshopThumbDir, mkErr => {
					if (mkErr) {
						addworkshopStatus = 1;
						logger.error('[routes - /addworkshop: mkDir() - 2]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}

			apiHelper.addWorkshop(data).then(workshop => {
				logger.info('[routes - /addworkshop]\n', workshop);
				uploader(path, newPath).then(() => {
					addworkshopStatus = 4;
					res.redirect('/admin');
				}).catch(uploadErr => {
					addworkshopStatus = 3;
					logger.error('[routes - /addworkshop]\n', uploadErr);
					return res.redirect('/admin');
				});
			}).catch(workshopErr => {
				addworkshopStatus = 2;
				logger.error('[routes - /addworkshop]\n', workshopErr);
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
					announcementStatus = 1;
					res.redirect('/admin');
				}
			}).catch(err => {
				announcementStatus = 2;
				logger.error('[routes - /announce - sendAnnouncement()]\n', err);
				res.redirect('/admin');
			});
		}).catch(err => {
			announcementStatus = 3;
			logger.error('[routes - /announce - getSubscribers()]\n', err);
			res.redirect('/admin');
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
						addworkshopStatus = 1;
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
