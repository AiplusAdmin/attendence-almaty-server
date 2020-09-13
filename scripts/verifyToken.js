const jwt = require('jsonwebtoken');

function auth(req, res, next){
	const token = req.header('Authorization');
	const accessToken = req.header('Authtoken');

	if(!token) 
		return res.send({status: 401, message: 'Access Denied'});

	try{
		const verified = jwt.verify(token, accessToken);
		req.user = verified;
		next();
	}catch (err){
		res.send({status: 400, message: 'Invalid Token'});
	}
}

module.exports = auth;