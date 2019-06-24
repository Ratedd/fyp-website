const fetch = require('node-fetch');

const apiHelper = {
	verifyAccount: (inputUsername, inputPassword) => new Promise((resolve, reject) => {
		const data = {
			username: inputUsername,
			password: inputPassword
		};
		fetch('http://localhost:3000/api/verifyaccount', { method: 'POST', body: JSON.stringify(data) })
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => {
				reject(err);
			});
	}),
	getSubscribers: () => new Promise((resolve, reject) => {
		fetch('http://localhost:3000/api/getsubscribers')
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
		fetch('http://localhost:3000/api/events')
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	}),
	getWorkshops: () => new Promise((resolve, reject) => {
		fetch('http://localhost:3000/api/workshops')
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => reject(err));
	})
};

module.exports = apiHelper;
