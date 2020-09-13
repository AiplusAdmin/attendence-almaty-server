const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth:{
		user:'aiplus.almaty@gmail.com',
		pass:'Carl8Sub'
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