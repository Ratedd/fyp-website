const fetch = require('node-fetch');

const api = {
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
				fetch(`https://api.telegram.org/bot784702199:AAGVh6-L9oQXraAZJTvmn-yhH8qUD384ZH8/sendMessage?chat_id=${subscriber.id}&text=${message}`, { method: 'POST' }).then(res => res.text());
			}, 2000);
		});
	})
};

module.exports = api;
