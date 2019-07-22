const axios = require('axios');
const logger = require('../util/logger.js');

const apiHelper = {
	createAccount: (inputUsername, inputPassword, inputName) => new Promise((resolve, reject) => {
		axios.post(`${process.env.API_BASE_LINK}/api/createaccount`, {
			username: inputUsername,
			password: inputPassword,
			name: inputName
		}).then(response => {
			logger.info('[apiHelper - /api/createaccount]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/createaccount]\n', err);
			reject(err);
		});
	}),
	verifyAccount: (inputUsername, inputPassword) => new Promise((resolve, reject) => {
		axios.post(`${process.env.API_BASE_LINK}/api/verifyaccount`, {
			username: inputUsername,
			password: inputPassword
		}).then(response => {
			logger.info('[apiHelper - /api/verifyaccount]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/verifyaccount]\n', err);
			reject(err);
		});
	}),
	getSubscribers: () => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/getsubscribers`).then(response => {
			logger.info('[apiHelper - /api/getsubscribers]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/getsubscribers]\n', err);
			reject(err);
		});
	}),
	sendAnnouncement: (data, message) => new Promise((resolve, reject) => {
		data.forEach(subscriber => {
			setTimeout(() => {
				axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${subscriber.id}&text=${message}`).then(response => {
					logger.info('[apiHelper - sendAnnouncement(data, message)]\n', response.data);
				}).catch(err => {
					logger.error('[apiHelper - sendAnnouncement(data, message)]\n', err);
					reject(err);
				});
			}, 2000);
		});
		resolve(true);
	}),
	getEvents: () => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/events`).then(response => {
			logger.info('[apiHelper - /api/events]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/events]\n', err);
			reject(err);
		});
	}),
	getEventByUUID: uuid => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/event/${uuid}`).then(response => {
			logger.info('[apiHelper - /api/event/:uuid]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/event/:uuid]\n', err);
			reject(err);
		});
	}),
	addEvent: data => new Promise((resolve, reject) => {
		axios.post(`${process.env.API_BASE_LINK}/api/addevent`, data).then(response => {
			logger.info('[apiHelper - /api/addevent]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/addevent]\n', err);
			reject(err);
		});
	}),
	getEventAttendanceByUUID: uuid => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/geteventattendance/${uuid}`).then(response => {
			logger.info('[apiHelper - /api/getworkshopattendance]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/getworkshopattendance]\n', err);
			reject(err);
		});
	}),
	getEventAddedByUserID: userId => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/events/${userId}`).then(response => {
			logger.info('[apiHelper - /api/events/:userId]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/events/:userId]\n', err);
			reject(err);
		});
	}),
	getWorkshops: () => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/workshops`).then(response => {
			logger.info('[apiHelper - /api/workshops]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/events/:userId]\n', err);
			reject(err);
		});
	}),
	getWorkshopByUUID: uuid => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/workshop/${uuid}`).then(response => {
			logger.info('[apiHelper - /api/workshop/:uuid]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/workshop/:uuid]\n', err);
			reject(err);
		});
	}),
	addWorkshop: data => new Promise((resolve, reject) => {
		axios.post(`${process.env.API_BASE_LINK}/api/addworkshop`, data).then(response => {
			logger.info('[apiHelper - /api/addworkshop]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/addworkshop]\n', err);
			reject(err);
		});
	}),
	addAttendance: (classification, uuid, csvData, WEname) => new Promise((resolve, reject) => {
		let data;
		if (classification === 'workshop') {
			data = {
				uuid,
				details: csvData,
				workshopName: WEname
			};
		} else {
			data = {
				uuid,
				details: csvData,
				eventName: WEname
			};
		}
		axios.post(`${process.env.API_BASE_LINK}/api/add${classification}attendance`, data).then(response => {
			logger.info(`[apiHelper - /api/add${classification}attendance]\n`, response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error(`[apiHelper - /api/add${classification}attendance]\n`, err);
			reject(err);
		});
	}),
	getWorkshopAttendanceByUUID: uuid => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/getworkshopattendance/${uuid}`).then(response => {
			logger.info('[apiHelper - /api/getworkshopattendance]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/getworkshopattendance]\n', err);
			reject(err);
		});
	}),
	getWorkshopAddedByUserID: userId => new Promise((resolve, reject) => {
		axios.get(`${process.env.API_BASE_LINK}/api/workshops/${userId}`).then(response => {
			logger.info('[apiHelper - /api/workshops/:userId]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/workshops/:userId]\n', err);
			reject(err);
		});
	}),
	deleteWorkshop: (userId, workshopId) => new Promise((resolve, reject) => {
		axios.delete(`${process.env.API_BASE_LINK}/api/workshop/${userId}/${workshopId}`).then(response => {
			logger.info('[apiHelper - /api/workshop/:userId/:workshopId]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/workshop/:userId/:workshopId]\n', err);
			reject(err);
		});
	}),
	deleteEvent: (userId, eventId) => new Promise((resolve, reject) => {
		axios.delete(`${process.env.API_BASE_LINK}/api/event/${userId}/${eventId}`).then(response => {
			logger.info('[apiHelper - /api/event/:userId/:eventId]\n', response.data);
			resolve(response.data);
		}).catch(err => {
			logger.error('[apiHelper - /api/event/:userId/:eventId]\n', err);
			reject(err);
		});
	})
};

module.exports = apiHelper;
