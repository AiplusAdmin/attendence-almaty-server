const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth:{
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS
	}
});

function sendMail(mailOptions){
	transporter.sendMail(mailOptions, function(error,data){
		if(error){
			console.log(error);
		} else {
			console.log(data);
		}
	});
}

module.exports = sendMail;