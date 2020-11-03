const cron = require('node-cron');
const Registers = require('../modules/Registers');
const Subregisters = require('../modules/SubRegisters');
const api = require('../api/api');
const Promise = require('bluebird');
const QueueBot = require('smart-request-balancer');

const key = {
    "domain":"aiplus",
    "apikey":"VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w"
};

const bot = require('../bot/createBot');
const botUtils = require('../bot/botUtils');

const queueBot = new QueueBot({
	rules:{
		telegramIndividual: {
			rate: 1,    // one message
			limit: 1,   // per second
			priority: 1
		},
		telegramGroup: {
			rate: 20,    // 20 messages
			limit: 60,  // per minute
			priority: 1
		},
		telegramBroadcast: {
			rate: 30,
			limit: 2,
			priority: 2
		}
	},
	default: {                   // Default rules (if provided rule name is not found
		rate: 30,
		limit: 1
	},
	overall:{
		rate: 30,       
		limit: 1
	},
	retryTime: 300,              // Default retry time. Can be configured in retry fn
	ignoreOverallOverheat: false  // Should we ignore overheat of queue itself  
});

function sleep(ms){
	console.log(`Ждем ${ms}`);
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    });
}

function sendTelegram(register,subregister){
	var text = '';
	var url = 'https://aiplus.t8s.ru/Learner/Group/'+register.GroupId;

		subregister.map(async function(student){
			if(student.Status && student.Pass){
				if(student.ClientId == -1){
					text = 'Дата урока: ' + register.LessonDate+'\n\n';
					text += 'Найти и добавить ученика в группу\n Ученик: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
					var com = student.Comment?student.Comment:'';
					text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
					queueBot.request((retry) => bot.telegram.sendMessage('-386513940',text,botUtils.buildUrlButton('Ссылка на группу',url))
					.catch(error => {
						console.log(error);
						if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),'-386513940','telegramGroup');
				} else {
						text = 'Дата урока: ' + register.LessonDate+'\n\n';
						text += 'Добавить Ученика: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
						var com = student.Comment?student.Comment:'';
						text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
						queueBot.request((retry) => bot.telegram.sendMessage('-386513940',text,botUtils.buildUrlButton('Ссылка на группу',url))
						.catch(error => {
							console.log(error);
							if (error.response.status === 429) { // We've got 429 - too many requests
									return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
						}),'-386513940','telegramGroup');
				}
			}
		});
}

function sendTelegramIND(register,student){
	var text = '';
	var url = 'https://aiplus.t8s.ru/Learner/Group/'+register.GroupId;

		
	text = 'Дата урока: ' + register.LessonDate+'\n\n';
	text += 'Найти и добавить ученика в группу\n Ученик: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
					var com = student.Comment?student.Comment:'';
					text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
					queueBot.request((retry) => bot.telegram.sendMessage('-386513940',text,botUtils.buildUrlButton('Ссылка на группу',url))
					.catch(error => {
						console.log(error);
						if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),'-386513940','telegramGroup');
				
}

var crontohh = cron.schedule('50 23 * * *',async () => {
	try{
		var registers = await Registers.findAll({
			fields:['Id','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
			where:{
				IsSubmitted: false
			}
		});
		console.log(registers.length);
		var i = 0;
		var n = registers.length;
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					i++;
					await sleep(100);
					console.log(i + ' из ' + n);
					var subregisters = await Subregisters.findAll({
						fields:['ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status'],
						where:{
							RegisterId: register.Id
						}
					});
					var params = new Array();
					subregisters.map(function(subregister){
						var st = new Object();
						st.Date = register.LessonDate;
						st.EdUnitId = register.GroupId;
						st.StudentClientId = subregister.ClientId;
						st.Pass = !subregister.Pass;
						st.Payable = false;
						params.push(st);
					});

					if(register.isOperator){
						sendTelegram(register,subregisters);
					}
					var response = await api.post(key.domain,'SetStudentPasses',params,key.apikey);
					if(response.status == 200){
						if(subregisters.length > 0){
							var responses = [];
							await subregisters.reduce(async function(previousStudentPromise,student){
								var res = await previousStudentPromise;
								responses.push(res);
								return new Promise(async function(resolve,reject){
									try{
										
									if(!student.Status && student.Pass && student.ClientId != -1){
										var data = new Object();
										data.edUnitId = register.GroupId;
										data.studentClientId = student.ClientId;
										data.date = register.LessonDate;
										data.testTypeId = 339;
										var skills = new Array();
										var skill = new Object();
										skill.skillId = 29; // Оценка учителя
										skill.score = student.Homework;
										skills.push(skill);
										skill = new Object();
										skill.skillId = 33; // Срез
										skill.score = student.Test;
										skills.push(skill);
										skill = new Object();
										skill.skillId = 34; // Ранг
										skill.score = student.Lesson;
										skills.push(skill);
										data.skills = skills;
										data.commentHtml = student.Comment;
										var res = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
										if(res.status == 200)
											resolve(true);
										else
											reject(false);
									}else{
										resolve(true);
									}
									}catch(err){
										sendTelegramIND(register,student);
										resolve(true);
									}
								});
							},Promise.resolve(true));
							console.log(responses);
							var result = responses.every(elem => elem == true);
							if(result){
								await register.update({
									IsSubmitted: true
								});
								resolve(true);
							}
						} else {
							await register.update({
								IsSubmitted: true
							});
							resolve(true);
						}
					}
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

	}catch(ex){
		console.log(ex);
	}
},{
	scheduled: false,
	timezone: "Asia/Almaty"
});



module.exports = crontohh;