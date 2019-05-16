const fetch = require('node-fetch');

const api = {
	verifyAccount: (inputUsername, inputPassword) => new Promise((resolve, reject) => {
		const data = {
			username: inputUsername,
			password: inputPassword
		};
		fetch('http://localhost:3000/api/getaccount', { method: 'POST', body: JSON.stringify(data) })
			.then(res => res.json())
			.then(json => resolve(json))
			.catch(err => {
				reject(err);
			});
	})
};

module.exports = api;
