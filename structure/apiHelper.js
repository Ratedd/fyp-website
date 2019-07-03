const fetch = require('node-fetch');

const apiHelper = {
	verifyAccount: (inputUsername, inputPassword) => new Promise((resolve, reject) => {
		const data = {
			username: inputUsername,
			password: inputPassword
		};
		fetch(`${process.env.API_BASE_LINK}/api/verifyaccount`, { method: 'POST', body: JSON.stringify(data) })
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => {
				reject(err);
			});
	}),
	getSubscribers: () => new Promise((resolve, reject) => {
		fetch(`${process.env.API_BASE_LINK}/api/getsubscribers`)
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	}),
	sendAnnouncement: (data, message) => new Promise((resolve, reject) => {
		data.forEach(subscriber => {
			setTimeout(() => {
				fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage?chat_id=${subscriber.id}&text=${message}`, { method: 'POST' })
					.then(res => res.json())
					.catch(err => reject(err));
			}, 2000);
		});
		resolve(true);
	}),
	getEvents: () => new Promise((resolve, reject) => {
		fetch(`${process.env.API_BASE_LINK}/api/events`)
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	}),
	getEventByUUID: uuid => new Promise((resolve, reject) => {
		fetch(`${process.env.API_BASE_LINK}/api/event/${uuid}`)
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	}),
	getWorkshops: () => new Promise((resolve, reject) => {
		fetch(`${process.env.API_BASE_LINK}/api/workshops`)
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	}),
	getWorkshopByUUID: uuid => new Promise((resolve, reject) => {
		fetch(`${process.env.API_BASE_LINK}/api/workshop/${uuid}/true`)
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	}),
	addWorkshop: data => new Promise((resolve, reject) => {
		fetch(`${process.env.API_BASE_LINK}/api/addworkshop`, { method: 'POST', body: JSON.stringify(data) })
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	})
};

module.exports = apiHelper;
