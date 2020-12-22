const Promise = require('bluebird');
const QueueBot = require('smart-request-balancer');

const api = require('../api/api');
const bot = require('../bot/createBot');
const botUtils = require('../bot/botUtils');
const Registers = require('../modules/Registers');

const key = {
    "domain": process.env.DOMAIN,
    "apikey": process.env.APIKEY
};

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

function sendTelegramIND(data,groupId,student){
	var text = '';
	var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${groupId}`;
		
	text = 'Дата урока: ' + data+'\n\n';
	text += 'Найти и добавить ученика в группу\n Ученик: ' + student.FullName + ' в группу: Id: '+ groupId+'\n\n';
	var com = student.Comment?student.Comment:'';
	text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
	queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButton('Ссылка на группу',url))
	.catch(error => {
		console.log(error);
		if (error.response.status === 429) { // We've got 429 - too many requests
			return retry(error.response.data.parameters.retry_after) // usually 300 seconds
		}
		throw error; // throw error further
	}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');			
}

async function setPasses(data,groupId,students){
    var params = new Array();
    students.map(function(student){
        if(student.clientId != -1 && !student.status && !student.delete){
            var st = new Object();
            st.Date = data;
            st.EdUnitId = groupId;
            st.StudentClientId = student.clientid;
            st.Pass = !student.attendence;
            st.Payable = false;
            params.push(st);
        }
	});
	try{
		var response = await api.post(key.domain,'SetStudentPasses',params,key.apikey);

		if(response.status == 200)
			return true;
		else 
			return false;
	}catch(err){
		console.log(err);
		return false;
	}
}

async function setGroupResult(date,groupId,students,register){
	try{
		console.log(register);
		console.log('Начал аттендансе');
		var responses = [];
		await students.reduce(async function(previousPromise,student){
			var res = await previousPromise;
			responses.push(res);
			return new Promise(async function(resolve,reject){
				try{
					await sleep(100);
					if(student.attendence && student.clientid != -1 && !student.status && !student.delete){
						var comment = '';
						var data = new Object();
						data.edUnitId = groupId;
						data.studentClientId = student.clientid;
						data.date = date;
						data.testTypeId = process.env.TEST_TYPE_ID;
						var skills = new Array();
						var skill = new Object();
						skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // Оценка учителя
						skill.score = student.homework;
						skills.push(skill);
						skill = new Object();
						skill.skillId = process.env.TEST_SKILL_ID; // Срез
						skill.score = student.test;
						skills.push(skill);
						skill = new Object();
						skill.skillId = process.env.RANG_SKILL_ID; // Ранг
						skill.score = student.lesson;
						skills.push(skill);
						data.skills = skills;
						if(student.comment){
							comment=student.comment.join('\n');
					//		comment += '\n\n' + homework;
						} /*else {
							comment = homework;
						}*/
						data.commentHtml = comment;
						var response = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
						if(response.status == 200)
							resolve(true);
						else
							reject(false);
					} else {
						resolve(true);
					}
				}catch(err){
					console.log(err);
					sendTelegramIND(date,groupId,student);
					resolve(false);
				}
			});
		},Promise.resolve(true));
		var result = responses.every(elem => elem == true);
		if(result){
			var reg = await Registers.findOne({
				fields:['Id'],
				where: {
					Id: register.Id
				}
			})
			await reg.update({
				IsSubmitted: true
			});
		}
	}catch(error){
		console.log(error);
	}
}

function setAttendance(date,groupId,students,register){
	var pass = setPasses(date,groupId,students);
	console.log('закончил пасс ');
	if(pass){
		setGroupResult(date,groupId,students,register);
	}
}

module.exports = setAttendance;