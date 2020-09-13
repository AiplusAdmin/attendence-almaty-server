const bcrypt = require('bcrypt');

async function verifyPassword(password,userPassword){
	
	return await bcrypt.compare(password,userPassword);
}

module.exports = verifyPassword;