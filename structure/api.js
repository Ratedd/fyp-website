const fetch = require('node-fetch');

const api = {
	verifyAccount: (username, password) => new Promise((resolve, reject) => {
		fetch('http://localhost:3000/index').then(res => resolve(res.text()));
	})
};

module.exports = api;
