const crypto = require('crypto');

function generateKeys(){
	
	const key = crypto.randomBytes(64).toString('hex');

	return key;
}

module.exports = generateKeys;
