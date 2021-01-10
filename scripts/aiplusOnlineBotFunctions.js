var support = require('../scripts/support');
var TelegramStudents = require('../modules/TelegramStudents');
var StudentsHistoryNotification = require('../modules/StudentsHistoryNotification');
var aiplusOnlineBot = require('../bot/createAiplusOnlineBot');
var botUtils = require('../bot/botUtils');

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

function OnlineLessons(links,students){
	students.map(function(student){
		message = 'Текс';
		var btns = [];
		var obj = new Object();
		links.testLinks.map(function(test){
			if(test.text && test.link && test.id){
				obj = {};
				obj.text = test.text;
				obj.url = `${test.link}?${test.id}=${student.StudentId}`;
				btns.push([obj]);
			}
		});
		links.videoLinks.map(function(video){
			if(video.text && video.link){
				obj = {};
				obj.text = video.text;
				obj.url = video.link;
				btns.push([obj]);
			}
		});
		btns.push([{text:'Домашнее задание',url:links.homework}]);
		btns.push([{text:'Ответ на домашнее задание',url:links.answer}]);
	
		aiplusOnlineBot.queueBot.request((retry) =>
			aiplusOnlineBot.bot.telegram.sendMessage(student.ChatId,message,botUtils.buildUrlButton(btns))
			.then()
			.catch(error => {
				console.log("error\n" + error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
		}),student.ChatId,'telegramBroadcast');
	});
}

function IntensivLessons(links,students){
	students.map(function(student){
		message = 'Текс';
		var btns = [];
		var obj = new Object();
		links.testLinks.map(function(test){
			if(test.text && test.link && test.id){
				obj = {};
				obj.text = test.text;
				obj.url = `${test.link}?${test.id}=${student.StudentId}`;
				btns.push([obj]);
			}
		});
		links.videoLinks.map(function(video){
			if(video.text && video.link){
				obj = {};
				obj.text = video.text;
				obj.url = video.link;
				btns.push([obj]);
			}
		});
	
		aiplusOnlineBot.queueBot.request((retry) =>
			aiplusOnlineBot.bot.telegram.sendMessage(student.ChatId,message,botUtils.buildUrlButton(btns))
			.then()
			.catch(error => {
				console.log("error\n" + error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
		}),student.ChatId,'telegramBroadcast');
	});
}

function Attendance(params,hash,telegrams){
	telegrams.map(function(telegram){
		var tests = hash.get(telegram.ClientId);
		var message = support.messageDay(tests,telegram.Language,telegram.FullName,params.date);
		aiplusOnlineBot.queueBot.request((retry) =>
			aiplusOnlineBot.bot.telegram.sendMessage(telegram.ChatId,message)
			.then()
			.catch(error => {
				console.log("error\n" + error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
		}),telegram.ChatId,'telegramBroadcast');
	});
}

function PersonalTests(date,hash,telegrams){
	telegrams.map(function(telegram){
		var tests = hash.get(telegram.ClientId);
		var message = support.personalMessage(tests,date);
		aiplusOnlineBot.queueBot.request((retry) =>
			aiplusOnlineBot.bot.telegram.sendMessage(telegram.ChatId,message)
			.then()
			.catch(error => {
				console.log("error\n" + error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
		}),telegram.ChatId,'telegramBroadcast');
	});
}

function Notification(message,telegrams){
	telegrams.map(function(telegram){
		aiplusOnlineBot.queueBot.request((retry) =>
			aiplusOnlineBot.bot.telegram.sendMessage(telegram.ChatId,message)
			.then()
			.catch(error => {
				console.log("error\n" + error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
		}),telegram.ChatId,'telegramBroadcast');
	});
}

function Intensiv(hash,telegrams){
	telegrams.map(function(telegram){
		var arr = hash.get(telegram.StudentId);
		messageHeader = '';
		messageBody = '';
		arr.map(el => {
			switch(el.TestSubjectId){
				case 5:
					messageBody += `Математика: ${el.Score} из 40 \n`;
					break;
				case 6:
					messageBody += `Количественные характеристики : ${el.Score} из 60 \n`;
					break;
				case 7:
					messageBody += `Английский язык : ${el.Score} из 20 \n`;
					break;
				case 8:
					messageBody += `Казахский язык : ${el.Score} из 20 \n`;
					break;
				case 9:
					messageBody += `Русский язык : ${el.Score} из 20 \n`;
					break;
				default:
					break;
			}
		});
		console.log(messageBody);
	});
}
module.exports = {
	notificationGroup,
	OnlineLessons,
	IntensivLessons,
	Attendance,
	PersonalTests,
	Notification,
	Intensiv
}
