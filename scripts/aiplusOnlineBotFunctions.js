var support = require('../scripts/support');
var TelegramStudents = require('../modules/TelegramStudents');
var StudentsHistoryNotification = require('../modules/StudentsHistoryNotification');
var aiplusOnlineBot = require('../bot/createAiplusOnlineBot');

function notificationGroup(group,students){
	students.map(async student => {
		if(student.attendence){
			var message = support.notificationMessage(group,student);
			var telegram = await TelegramStudents.findAll({
				attributes: ['ChatId'],
				where: {
					ClientId: student.clientid		
				}
			});
			if(telegram.length == 1){
				aiplusOnlineBot.queueBot.request((retry) => 
					aiplusOnlineBot.bot.telegram.sendMessage(telegram[0].ChatId,message)
					.then(async ()=> {
						await StudentsHistoryNotification.create({
							ClientId: student.clientid,
							GroupId: group.Id,
							LessonDay: group.date.substr(0, 10),
							notificatedDay: group.submitDay.substr(0, 10)
						},{
							fields:['ClientId','GroupId','LessonDay','notificatedDay']
						});
					})
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
				}),telegram[0].ChatId,'telegramIndividual');
			} else if(telegram.length > 1){
				var history = null;
				telegram.map(function(user){
					aiplusOnlineBot.queueBot.request((retry) => 
						aiplusOnlineBot.bot.telegram.sendMessage(user.ChatId,message)
						.then(async ()=> {
							if(history == null){
								history = await StudentsHistoryNotification.create({
									ClientId: student.clientid,
									GroupId: group.Id,
									LessonDay: group.date.substr(0, 10),
									notificatedDay: group.submitDay.substr(0, 10)
								},{
									fields:['ClientId','GroupId','LessonDay','notificatedDay']
								});
							}
						})
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),user.ChatId,'telegramBroadcast');
				});
			} else {
				console.log('Нет в телеге');
			}
		}		
	});
}

module.exports = {
	notificationGroup
}
