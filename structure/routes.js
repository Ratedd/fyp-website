const bodyParser = require('body-parser');
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
const csvp = require('../util/csv-parser.js');
let failed = 0;
let announcementStatus = 0; // 1 = success, 2 = sendAnnouncement error, 3 = getSubscribers error
let addworkshopStatus = 0; // 1 = fs.mkdirSync error, 2 = add workshop to db error, 3 = general fs error, 4 = success
let addeventStatus = 0; // 1 = fs.mkdirSync error, 2 = add workshop to db error, 3 = general fs error, 4 = success
let registrationStatus = 0;

const routes = () => {
	const externalRoutes = require('express').Router(); // eslint-disable-line new-cap

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

	externalRoutes.get('/uploads/workshopThumbnails/*', (req, res) => {
		res.sendFile(req.originalUrl, { root: './' });
	});

	externalRoutes.get('/uploads/eventThumbnails/*', (req, res) => {
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

	externalRoutes.get('/register', (req, res) => {
		if (!req.session.user) {
			return res.render('register', { user: req.session.user });
		}

		res.redirect('/');
	});

	externalRoutes.post('/register_account', (req, res) => {
		if (req.session.user) {
			return res.redirect('/');
		}
		const { username, password, name } = req.body;
		apiHelper.createAccount(username, password, name).then(data => {
			logger.info('[routes - /register_account]\n', data);
			return res.redirect('/login');
		}).catch(err => {
			logger.error('[routes - /register_account]\n', err);
			return res.redirect('/register');
		});
	});

	externalRoutes.get('/admin', (req, res) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}
		if (!req.session.user.isAdmin) {
			return res.redirect('/');
		}
		apiHelper.getWorkshopAddedByUserID(req.session.user.uuid).then(workshopData => {
			logger.info('[routes - /admin]\n', workshopData);
			apiHelper.getEventAddedByUserID(req.session.user.uuid).then(eventData => {
				logger.info('[routes - /admin]\n', eventData);
				return res.render('admin', { user: req.session.user, announcementStatus, addworkshopStatus, addeventStatus, workshops: workshopData, events: eventData });
			}).catch(err => {
				logger.error('[routes - /admin]\n', err);
				return res.redirect('/');
			});
		}).catch(err => {
			logger.error('[routes - /admin]\n', err);
			return res.redirect('/');
		});
	});

	externalRoutes.get('/events', (req, res) => {
		apiHelper.getEvents().then(data => {
			logger.info('[routes - /events]\n', data);
			res.render('events', { user: req.session.user, events: data });
		}).catch(err => {
			logger.error('[routes - /events]\n', err);
			return res.redirect('/');
		});
	});

	externalRoutes.get('/addevent', (req, res) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}

		if (!req.session.user.isAdmin) {
			return res.redirect('/');
		}
		const form = new formidable.IncomingForm();
		form.maxFileSize = 200 * 1024 * 1024;
		form.parse(req, (err, fields, files) => {
			if (err) {
				addeventStatus = 1;
				logger.error('[routes - /addevent | Formidable]', err);
				return res.redirect('/admin');
			}

			const { path, name } = files.file;
			if (!path || !name) {
				return res.redirect('/admin');
			}
			const eventThumbDir = Path.join(process.cwd(), '/uploads/', 'eventThumbnails/');
			const newPath = Path.join(process.cwd(), '/uploads/', 'eventThumbnails/', `${name}`);
			const dbPath = `../uploads/eventThumbnails/${name}`;

			const data = {
				eventName: fields.eventName,
				description: fields.eventDesc,
				eventThumbnail: dbPath,
				eventDate: fields.eventDate,
				addedByAdmin: req.session.user.uuid
			};

			const eventThumbDirExists = fs.existsSync(eventThumbDir);
			if (!eventThumbDirExists) {
				fs.mkdirSync(eventThumbDir, { recursive: true }, mkErr => {
					if (mkErr) {
						addeventStatus = 1;
						logger.error('[routes - /addevent: mkDir()]\n', mkErr);
						return res.redirect('/admin');
					}
				});
			}
			apiHelper.addEvent(data).then(event => {
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
			res.render('event', { user: req.session.user, data: event.data, registrationStatus });
		}).catch(err => {
			logger.error('[routes - /event/:id]\n', err);
			res.redirect('/events');
		});
	});

	externalRoutes.get('/workshop/:id/', (req, res) => {
		const { id } = req.params;
		apiHelper.getWorkshopByUUID(id).then(workshop => {
			logger.info('[routes - /workshop/:id]\n', workshop);
			res.render('workshop', { user: req.session.user, data: workshop.data, registrationStatus });
		}).catch(err => {
			logger.error('[routes - /workshop/:id]\n', err);
			res.redirect('/workshops');
		});
	});

	externalRoutes.get('/workshops', (req, res) => {
		apiHelper.getWorkshops().then(data => {
			logger.info('[routes - /workshops]\n', data);
			res.render('workshops', { user: req.session.user, workshops: data });
		}).catch(err => {
			logger.error('[routes - /events]\n', err);
			return res.redirect('/');
		});
	});

	externalRoutes.post('/addworkshop', (req, res) => {
		if (!req.session.user) {
			return res.redirect('/login');
		}

		if (!req.session.user.isAdmin) {
			return res.redirect('/');
		}
		const form = new formidable.IncomingForm();
		form.maxFileSize = 200 * 1024 * 1024;
		form.parse(req, (err, fields, files) => {
			if (err) {
				addworkshopStatus = 1;
				logger.error('[routes - /addworkshop | Formidable]', err);
				return res.redirect('/admin');
			}

			const { path, name } = files.file;
			if (!path || !name) {
				return res.redirect('/admin');
			}
			const workshopThumbDir = Path.join(process.cwd(), '/uploads/', 'workshopThumbnails/');
			const newPath = Path.join(process.cwd(), '/uploads/', 'workshopThumbnails/', `${name}`);
			const dbPath = `../uploads/workshopThumbnails/${name}`;

			const data = {
				workshopName: fields.workshopName,
				description: fields.workshopDesc,
				workshopThumbnail: dbPath,
				workshopDate: fields.workshopDate,
				addedByAdmin: req.session.user.uuid
			};

			const workshopThumbDirExists = fs.existsSync(workshopThumbDir);
			if (!workshopThumbDirExists) {
				fs.mkdirSync(workshopThumbDir, { recursive: true }, mkErr => {
					if (mkErr) {
						addworkshopStatus = 1;
						logger.error('[routes - /addworkshop: mkDir()]\n', mkErr);
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
			const { uuid, workshopOrEvent } = fields;
			const classification = parseInt(workshopOrEvent, 10) === 1 ? 'workshop' : 'event';

			if (err) {
				registrationStatus = 2;
				logger.error('[routes - /upload_file | Formidable]', err);
				return res.redirect(`/${classification}/${uuid}`);
			}

			const { path, name } = files.file;
			if (!path || !name) {
				return res.redirect(`/${classification}/${uuid}`);
			}
			const uploadPath = Path.join(process.cwd(), '/uploads/', 'registration/', `${classification}/`, `${uuid}`);
			const newPath = Path.join(process.cwd(), '/uploads/', 'registration/', `${classification}/`, `${uuid}/`, `${name}`);

			const uploadDirExists = fs.existsSync(uploadPath);
			if (!uploadDirExists) {
				fs.mkdirSync(uploadPath, { recursive: true }, mkErr => {
					if (mkErr) {
						registrationStatus = 3;
						logger.error('[routes - /upload_file: mkDir()]\n', mkErr);
						return res.redirect(`/${classification}/${uuid}`);
					}
				});
			}

			uploader(path, newPath).then(() => {
				csvp(newPath).then(csvData => {
					apiHelper.addWorkshopAttendance(uuid, csvData).then(done => {
						if (done.code && done.code === 'BadRequest') {
							logger.info('[routes - /upload_file]\n', done);
							registrationStatus = 5;
							return res.redirect(`/${classification}/${uuid}`);
						}
						logger.info('[routes - /upload_file]\n', done);
						registrationStatus = 1;
						return res.redirect(`/${classification}/${uuid}`);
					}).catch(err => {
						logger.error('[routes - /upload_file]\n', err);
						return res.redirect(`/${classification}/${uuid}`);
					});
				}).catch(err => {
					logger.error('[routes - /upload_file]\n', err);
					return res.redirect(`/${classification}/${uuid}`);
				});
			}).catch(uploadErr => {
				registrationStatus = 3;
				logger.error('[routes - /addworkshop]\n', uploadErr);
				return res.redirect(`/${classification}/${uuid}`);
			});
		});
	});

	externalRoutes.get('/attendance/:workshopOrEvent/:id', (req, res) => {
		const { workshopOrEvent, id } = req.params;
		if (workshopOrEvent === 'workshop') {
			apiHelper.getWorkshopAttendanceByUUID(id).then(data => {
				logger.info('[routes - /attendance/:workshopOrEvent/:id]\n', data);
				return res.render('attendance', { user: req.session.user, data });
			}).catch(err => {
				logger.error('[routes - /attendance/:workshopOrEvent/:id]\n', err);
				return res.redirect('/admin');
			});
		}
	});

	externalRoutes.post('/login_verification', (req, res) => {
		const { username, password } = req.body;
		if (!username && !password) {
			failed = 3;
			return res.redirect('/login');
		}
		apiHelper.verifyAccount(username, password).then(data => {
			if (data && data.uuid) {
				req.session.user = data;
				res.redirect('/');
			} else {
				failed = 1;
				return res.redirect('/login');
			}
		});
	});

	externalRoutes.get('/logout', (req, res) => {
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
