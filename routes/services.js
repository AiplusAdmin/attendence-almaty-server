const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const Op = require('sequelize').Op;
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const uniqueRandom = require('unique-random');
const QueueBot = require('smart-request-balancer');
const xlsx = require('xlsx');
const HashMap = require('hashmap');

const verifyToken = require('../scripts/verifyToken');
const generateKey = require('../scripts/generateKeys');
const api = require('../api/api');
const Registers = require('../modules/Registers');
const SubRegisters = require('../modules/SubRegisters');
const sequelize = require('../databases/index').sequelize;
const Teachers = require('../modules/Teachers');
const Contacts = require('../modules/Contacts');
const Students = require('../modules/Students');
const Schools = require('../modules/Schools');
const Rooms = require('../modules/Rooms');
const TestResults = require('../modules/TestResults');
//const ExtraFields = require('../modules/ExtraFields');
const Topics = require('../modules/Topics');
const VoksresTests = require('../modules/VoksresTests');
const KolHarTests = require('../modules/KolHarTests');
const sendMail = require('../scripts/gmail');
const bot = require('../bot/createBot');
const botUtils = require('../bot/botUtils');
const verifyPassword = require('../scripts/verifyPassword');
const hh = require('../scripts/hh');
const support = require('../scripts/support');
const { resolve, reject } = require('bluebird');
//const aiplusOnlineBot = require('../scripts/aiplusOnlineBotFunctions');

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

function Weekdays(num){
    var weekdays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
	var binary = num.toString(2);
	var binary = binary.split("").reverse().join("");
    var idx = binary.indexOf(1);
	var days =[];
    while(idx!=-1){
        days.push(weekdays[idx]);
        idx = binary.indexOf(1, idx + 1);
    }
    return days.join(',');
}

function Weekday(date){
    var weekdays = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    var day = new Date(date);

    return weekdays[day.getDay()];
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    });
}

function compareTime(time1,time2){
	var b1 = time1.begin.split(':');
	var b2 = time2.begin.split(':');
	var begin1 = b1[0]*60 + b1[1]*1;
	var begin2 = b2[0]*60 + b2[1]*1;

	if(begin1 < begin2)
		return -1;
	else if(begin1 > begin2)
		return 1;
	else if(begin1 == begin2){
		var e1 =  time1.end.split(':');
		var e2 =  time2.end.split(':');

		var end1 = e1[0]*60 + e1[1]*1;
		var end2 = e2[0]*60 + e2[1]*1;

		if(end1 < end2)
			return -1;
		else if(end1 > end2)
			return 1;
		else 
			return 0
	}
}

function sendTelegramIND(register,student){
	var text;
	var url = 'https://'+process.env.DOMAIN+'.t8s.ru/Learner/Group/'+register.GroupId;
	text = 'НЕ СДЕЛАННАЯ ЗАДАЧА !!!\n';
	text += '\nДата урока: ' + register.LessonDate+'\n\n';
	text += 'Найти и добавить ученика в группу\n Ученик: ' + student.FullName + ' в группу: Id: '+ register.GroupId + '\nГруппа: '+ register.GroupName+'\nПреподаватель: '+register.TeacherId+'\nВремя: ' + register.Time + '\nДни: '+ register.WeekDays+ '\n\n';
	var com = student.Comment?student.Comment:'';
	text += 'Аттендансе студента :\nФИО : ' + student.FullName + '\nД/з: ' + student.Homework + '\nСрез: ' + student.Test+'\nРанг: ' + student.Lesson+'\nКомментарии: ' + com+'\n\n\n';
	queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
	.catch(error => {
		console.log(error);
		if (error.response.status === 429) { // We've got 429 - too many requests
			return retry(error.response.data.parameters.retry_after) // usually 300 seconds
		}
		throw error; // throw error further
	}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');		
}

//Get Offices
router.get('/offices',verifyToken, (req, res) => {
    api.get(this.key.domain,'GetOffices','',this.key.apikey)
        .then((response) => {
			res.json(response);
        })
        .catch(err =>{
            res.json({
				status: 410,
				data: []
			});
        });
});

//Get Teachers
router.post('/teacher',verifyToken,(req, res) => {
	var params = 'id='+req.body.teacherId;
    api.get(key.domain,'GetTeachers',params,key.apikey)
        .then((response) => {
			res.json(response);    
		})
        .catch(err =>{
            res.json({
				status: 410,
				data: []
			}); 
        });
});

//Log In to System
router.post('/login', async (req, res) => {
	var remember = req.body.remember;
	passport.authenticate('local',(err,user,info) => {
		if(err)
			res.send({status: 400,message: 'Error'});
		
		if(user){
			var exipersIn = '';
			var exp = '';
			if (remember){
				exipersIn = "30 days";
				var now = new Date();
				now.setDate(now.getDate() + 30);
				exp = now.getTime();
			}else{
				exipersIn = "2 days";
				var now = new Date();
				now.setDate(now.getDate() + 2);
				exp = now.getTime();
			} 
				
			const token = jwt.sign({_id: user.teacherId}, process.env.SECRET_KEY,{expiresIn: exipersIn});
			
			res.header('Authorization',token);
			res.json({
				status: 200, 
				data: {
					teacherId: user.teacherId,
					roleId: user.roleId, 
					accesstoken: token,
					exp: exp,
					firstname: user.firstname,
					lastname: user.lastname
				}
			});
		} else
			res.send({status: 404, message: info.message});
	})(req,res);
});

//Get Groups
router.post('/groups',verifyToken, (req, res) => {
	if(req.body.teacherId == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var params = 'types=Group&timeFrom='+req.body.params.timeFrom+'&timeTo='+req.body.params.timeTo+'&statuses=Working&officeOrCompanyId='+req.body.params.officeId+'&teacherId='+req.body.teacherId;
		var date = Weekday(req.body.params.date);
    	api.get(key.domain,'GetEdUnits',params,key.apikey)
        .then((response) => {
            if(response.status === 200){
				var found = false;
				var i = -1;
				var j = -1;
				response.data.map(function(groups,index){
					groups.ScheduleItems.map(function(ScheduleItem,ind){
						if(ScheduleItem.BeginTime == req.body.params.timeFrom && ScheduleItem.EndTime == req.body.params.timeTo && !ScheduleItem.EndDate){
							var weekdays = Weekdays(ScheduleItem.Weekdays);
							if(weekdays.includes(date)){
								found = true;
								i = index;
								j = ind;
							}
						}
					});
				});
		
				if(found){
					var group = new Object();
					group.Id = response.data[i].Id;
					group.name = response.data[i].Name;
					group.subject = support.Capitalize(support.subjectName(response.data[i].Name));
					group.symbol = support.getSubject(response.data[i].Name);
					group.branch = support.getBranch(response.data[i].Name);
					group.klass = support.getClass(response.data[i].Name);
					group.teacher = response.data[i].ScheduleItems[j].Teacher;
					group.time = response.data[i].ScheduleItems[j].BeginTime + '-' + response.data[i].ScheduleItems[j].EndTime;
					group.days = Weekdays(response.data[i].ScheduleItems[j].Weekdays);
					var array = group.days.split(',');
					group.inweek = array.length;
					group.weekdays = response.data[i].ScheduleItems[j].Weekdays;
					
					res.json({status: 200,data: group});
				} else {
					res.json({status: 200,data:{}});
				}
            } else {
				res.json({
					status: 410,
					data: []
				});
			}
        })
        .catch(err =>{
			console.log(err);
            res.json({
				status: 410,
				data: []
			});
        });
	}
});

//Get Groups of Office
router.post('/officegoups',verifyToken, (req, res) => {
	if(req.body.teacherId == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var date = new Date().toISOString().substr(0, 10);
		var params = 'types=Group&dateFrom='+date+'&dateTo='+date+'&statuses=Working&officeOrCompanyId='+req.body.office.Id+'&teacherId='+req.body.teacherId;
    	api.get(key.domain,'GetEdUnits',params,key.apikey)
        .then((response) => {
            if(response.status === 200){
				var officegroups = [];
				response.data.map(function(group){
					var gr = new Object();
					gr.Id = group.Id;
					gr.name = group.Name;
					gr.subject = support.Capitalize(support.subjectName(group.Name));
					gr.symbol = support.getSubject(group.Name);
					gr.branch = support.getBranch(group.Name);
					gr.klass = support.getClass(group.Name);
						
					group.ScheduleItems.map(function(ScheduleItem){
						
						gr.teacher = ScheduleItem.Teacher;
						gr.begin = ScheduleItem.BeginTime;
						gr.end =  ScheduleItem.EndTime;
						gr.time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
						gr.days = Weekdays(ScheduleItem.Weekdays);
						var array = gr.days.split(',');
						gr.inweek = array.length;
						gr.weekdays = ScheduleItem.Weekdays;
					});
					officegroups.push(gr);
				});
				officegroups.sort(compareTime);

				res.json({status: 200,data: officegroups});
            } else {
				res.json({
					status: 410,
					data: []
				});
			}
        })
        .catch(err =>{
			console.log(err);
            res.json({
				status: 410,
				data: []
			});
        });
	}
});

//Get Student in Group
router.post('/groupstudents',verifyToken, (req, res) => {
	if(req.body.group.Id == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var params = 'edUnitId=' + req.body.group.Id;
		api.get(key.domain,'GetEdUnitStudents',params,key.apikey)
			.then(async (response) => {
				if(response.status === 200){
					var students = new Array();
					var groupName = response.data[0]?support.getSubject(response.data[0].EdUnitName):null;
					await response.data.reduce(async (previousPromise,student) => {
						await previousPromise;
						return new Promise(async function(resolve,reject){
							if((student.StudyUnits == undefined && student.BeginDate <= req.body.group.date) || student.EndDate >= req.body.group.date){
								
								var obj = new Object();
								obj.clientid = student.StudentClientId;
								obj.name = student.StudentName;
								obj.status = false;
								obj.attendence = false;
								obj.aibaks = 0;
								obj.icon = 'mdi-close-thick';

								var hh = await api.get(key.domain,'GetStudents','clientId='+student.StudentClientId,key.apikey);
								var fields = hh.data[0].ExtraFields?hh.data[0].ExtraFields:[];
								if(hh.data[0].VisitDateTime){
									var date1 = new Date(hh.data[0].VisitDateTime);
									var date2 = new Date(req.body.group.date);
									const diffTime = date1.getTime() - date2.getTime();
									if(diffTime <= 0)
										obj.lessonleft = 0;
									else {
										var array = req.body.group.days.split(',');
										var d = array.findIndex(el => el == support.getWeekDay(req.body.group.date));
										const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
										var inweek = Math.round(diffDays/7);
										obj.lessonleft = (inweek*req.body.group.inweek) - d;
									}
								}

								obj.dynamics = [];
								
								fields.map(field => {
									if(field.Name == 'Статус рейтинга')
										obj.loyalty = field.Value == 'Потенциальный возврат'?0:field.Value == 'ТОП'?2:1;
	
									if(field.Name == 'Мат динамика' || field.Name == 'Англ динамика' || field.Name == 'Каз динамика' || field.Name == 'Рус динамика'){
										
										var Name = field.Name == 'Мат динамика' ?'M':field.Name == 'Англ динамика' ? 'E':field.Name == 'Рус динамика' ?'R':'K';
										var object = {};
										var arr = obj.dynamics.filter(dynamic => dynamic.Name == Name);
							
										if(arr.length == 1){
											
											var index = obj.dynamics.findIndex(dynamic => dynamic.Name == Name);
											var object = arr[0];
												
											if(groupName == object.Name){
													
												field.Value = field.Value.replace(',','.');
												object.Value = Math.round((Math.abs(field.Value) + Number.EPSILON) * 100) / 100;
											
												if(field.Value >= 0){
													object.progress = 'mdi-arrow-up';
												} else {
													object.progress = 'mdi-arrow-down';
												}
											}
											
											obj.dynamics[index] = object;	
										
										}else {
											
											var object = {};
											object.Name = Name;
	
											if(groupName == object.Name){
												
												field.Value = field.Value.replace(',','.');
												object.Value = `${(Math.round((Math.abs(field.Value) + Number.EPSILON) * 100) / 100)}%`;
												
												if(field.Value >= 0){
													object.progress = 'mdi-chevron-up';
													object.iconcolor = 'green';
												} else {
													object.progress = 'mdi-chevron-down';
													object.iconcolor = 'red';
												}
											}
	
											obj.dynamics.push(object);
										}
									}
									
									if(field.Name == 'Мат рейтинг' || field.Name == 'Каз рейтинг' || field.Name == 'Рус рейтинг' || field.Name == 'Англ рейтинг'){
											
										var Name = field.Name == 'Мат рейтинг' ?'M':field.Name == 'Англ рейтинг' ? 'E':field.Name == 'Рус рейтинг' ?'R':'K';
										var arr = obj.dynamics.filter(dynamic => dynamic.Name == Name);
										
										if(arr.length == 1){
												
											var index = obj.dynamics.findIndex(dynamic => dynamic.Name == Name);
											var object = arr[0];
											field.Value = field.Value.replace(',','.');
											
											if(field.Value >= 7.5 && field.Value <= 10)
												object.class = 'group_good';
											else if(field.Value >= 5 && field.Value <= 7.5)
												object.class = 'group_norm';
											else
												object.class = 'group_bad';
												
												obj.dynamics[index] = object;	
								
										} else {
							
											var object = {};
											object.Name = Name;
											field.Value = field.Value.replace(',','.');
				
											if(field.Value >= 7.5 && field.Value <= 10)
												object.class = 'group_good';
											else if(field.Value >= 5 && field.Value <= 7.5)
												object.class = 'group_norm';
											else
												object.class = 'group_bad';
	
											obj.dynamics.push(object);

										}
									}
								});
							
								students.push(obj); 
							}
						
							resolve(true);
						});
					},Promise.resolve(true));

					students = support.getMentorNumber(students);
					res.send({
						status: 200,
						data: students
					});
				} else {
					res.json({
						status: 410,
						data: []
					});
				}
			})
			.catch(err =>{
				console.log(err);
				res.json({
					status: 410,
					data: []
				});
			});
	}
});

//Get Student
router.post('/student',verifyToken, async (req,res) => {
	try{
		var fullname = req.body.student.value.split(' ');
		var student = await Students.findOne({
			where:{
				LastName: fullname[0],
				FirstName: fullname[1],
				MiddleName: fullname[2]?fullname[2]:''
			},
			attributes: ['ClientId']
		});
		if(student === null){
			res.json({
				status: 404,
				message: 'Ученика нет'
			});
		} else {
			res.json({
				status: 200,
				data: student.ClientId
			});
		}
	}catch(error){
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

//Add student passes
router.post('/setpasses',verifyToken, (req, res) => {
    var data = req.body.date;
    var groupId = req.body.groupId;
    var students = req.body.students;
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
    api.post(key.domain,'SetStudentPasses',params,key.apikey)
    .then((response) => {
		res.json(response);
	})
    .catch(err =>{
		console.log(err);		
        res.json({
			status: 500,
			message: 'Error'
		});
    });
});

//add attendence test
router.post('/setattendence', async (req, res) => { 
	try{
		var students = req.body.students;
		var group  = req.body.group;
		var TeacherId = req.body.group.teacherId;
		var SubTeacherId = req.body.group.subteacherId;
		var Change = req.body.group.change;
		var GroupId = req.body.group.Id;
		var GroupName = req.body.group.name;
		var Time = req.body.group.time;
		var LessonDate = req.body.group.date.substr(0, 10);
		var WeekDays = req.body.group.days;
		var SubmitDay = req.body.submitDay.substr(0, 10);
		var SubmitTime = req.body.submitTime;
		var IsSubmitted = req.body.isSubmitted;
		var IsStudentAdd = req.body.group.isStudentAdd ? req.body.group.isStudentAdd:false;
		var IsOperator = req.body.group.isOperator ? req.body.group.isOperator:false;
		var SchoolId = req.body.group.officeId;
		var RoomId = req.body.group.roomId;
		var LevelTest = req.body.group.level;
		var Aibucks = req.body.Aibucks?req.body.Aibucks:null;
		var TopicId = req.body.topic ? req.body.topic.Id: null;
		var homework = req.body.homework ? req.body.homework : null;
		var kolhar = req.body.kolhar;
		var foskres = req.body.foskres;
		var subject = req.body.group.subject;
		var HomeWorkComment = '';
	/*	if(homework){
			var topic = req.body.topic ? req.body.topic.Name: null;
			var homeworkLevel = homework.level ? homework.level: null;
			var homeworkText = homework.text ? homework.text : null;
			if(topic){
				HomeWorkComment += 'Тема урока : ' + topic + '\n';
			}
			if(homeworkText){
				HomeWorkComment += 'Домашнее задание на следующий урок : \n';
				if(homeworkLevel){
					HomeWorkComment += 'Уровень : ' + homeworkLevel.join(', ') + '\n';
				} 
				HomeWorkComment += 'Домашнее задание : ' + homeworkText;
			}
		}*/
		var newRegister = await Registers.create({
				Change,
				LevelTest,
				RoomId,
				SubTeacherId,
				TeacherId,
				GroupId,
				GroupName,
				Time,
				LessonDate,
				WeekDays,
				SubmitDay,
				SubmitTime,
				IsSubmitted,
				IsStudentAdd,
				IsOperator,
				SchoolId,
				Aibucks,
				TopicId
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId']
		});
		if(newRegister){ 
			var subregisters = [];
			var voksrestests = [];
			var kolhartest = [];
			students.map(function(student){
				if(!student.delete){
					var obj = {};
					var kolobj = {};
					var voksresobj = {};
					var comment = '';
					if(student.comment){
						comment = student.comment.join('\n');
					//	comment += '\n\n' + HomeWorkComment;
					}
					/*else {
						comment = HomeWorkComment;
					}*/

					obj.RegisterId = newRegister.Id;
					obj.ClientId = student.clientid;
					obj.FullName = student.name;
					obj.Pass = student.attendence;
					obj.Homework = student.attendence?student.homework:-1;
					obj.Test = student.attendence?student.test:-1;
					obj.Lesson = student.attendence?student.lesson:-1;
					obj.Comment = comment;
					obj.Status = student.status;
					obj.isWatched = student.iswatched ? student.iswatched:false;
					obj.Aibucks = student.aibaks ? student.aibaks : 0;
	
					if(kolhar && student.attendence){
						kolobj.ClientId = student.clientid;
						kolobj.Score = student.kolhar;
						kolobj.LessonDay = LessonDate;
						kolobj.SubmitDay = SubmitDay;

						kolhartest.push(kolobj);
					}

					if(foskres && student.attendence){
						voksresobj.ClientId = student.clientid;
						voksresobj.Score = student.foskres;
						voksresobj.Subject = subject;
						voksresobj.LessonDay = LessonDate;
						voksresobj.SubmitDay = SubmitDay;

						voksrestests.push(voksresobj);
					}

					subregisters.push(obj);
				}
			});
			if(kolhar){
				KolHarTests.bulkCreate(kolhartest,{
					fields: ['ClientId','LessonDay','SubmitDay','Score']
				});
			}
			
			if(foskres){
				VoksresTests.bulkCreate(voksrestests,{
					fields: ['ClientId','Subject','LessonDay','SubmitDay','Score']
				});
			}

			var result = await SubRegisters.bulkCreate(subregisters,{
				fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
			});
			if(result.length > 0){
				new Promise(async (resolve) => {
					try{
						await hh(LessonDate,GroupId,students,newRegister);
						resolve(true);
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
				new Promise(async (resolve) =>{
					try{
						if(group.change){
							var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
							var text = '';
							text+='Была замена : \n Заменяющий преподаватель: ' + req.body.teacherName + '\nЗаменяемый преподаватель: ' + group.teacher + '\n Дата замены: '+ group.date +'\nгруппа: Id: '+ group.Id + '\nГруппа: '+ group.name+'\nПреподаватель: '+group.teacher+'\nВремя: ' + group.time + '\nДни: '+ group.days+ '\n\n\n';
							queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
							.catch(error => {
								console.log(error);
								if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
								}
								throw error; // throw error further
							}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
						}
						
						
						var deleteStudents = [];
						var addStudents = [];
						students.map(async function(student){
							if(student.delete){
								deleteStudents.push(student.name);
							}
							
							if(student.status && student.attendence){
								addStudents.push(student.name)
							}
						});
						await sleep(1000);
						if(deleteStudents.length > 0){
							var text = '';
							var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
							text = 'Дата урока: ' + group.date+'\n\n';
							text += 'Убрать учеников с группы\n\n Группа: \nId: '+ group.Id + '\nИмя: '+group.name+'\nПреподаватель: '+group.teacher+'\nВремя: ' + group.time + '\nДни: '+ group.days+ '\n\n';
							var sts = deleteStudents.join('\n');
							text += 'Список Учеников:\n' + sts;
							queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
							.catch(error => {
								console.log(error);
								if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
								}
								throw error; // throw error further
							}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
						}
						await sleep(1000);
						if(addStudents.length > 0){
							var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${group.Id}`;
							var text = '';
							text = 'Дата урока: ' + group.date+'\n\n';
							text += 'Найти и добавить учеников в группу\n\n Группа:\nId: '+ group.Id + '\nИмя: '+ group.name+'\nПреподаватель: '+group.teacher+'\nВремя: ' + group.time + '\nДни: '+ group.days+ '\n\n';
							var sts = addStudents.join('\n');
							text += 'Список Учеников:\n' + sts;
							queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
							.catch(error => {
								console.log(error);
								if (error.response.status === 429) { // We've got 429 - too many requests
									return retry(error.response.data.parameters.retry_after) // usually 300 seconds
								}
								throw error; // throw error further
							}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
						}
					}catch(err){
						console.log(err);
						resolve(true);
					}
				});
			/*	new Promise(resolve => {
					try{
						aiplusOnlineBot.notificationGroup(group, students);
						resolve(true);
					}catch(err){
						console.log(err);
						resolve(true);
					}
				})*/
				res.json({
					status: 200,
					message: 'OK'				
				});
			}else {
				res.json({
					status: 500,
					message: 'Error'
				});
			}
		}else {
			res.json({
				status: 500,
				message: 'Error'
			});
		}
	}catch(error){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
	/*try{
		var responses = [];
		await students.reduce(async function(previousPromise,student){
			var res = await previousPromise;
			responses.push(res);
			return new Promise(async function(resolve,reject){
				if(student.attendence && student.clientid != -1 && !student.status && !student.delete){
					var comment = '';
					var data = new Object();
					data.edUnitId = groupId;
					data.studentClientId = student.clientid;
					data.date = date;
					data.testTypeId = 339;
					var skills = new Array();
					var skill = new Object();
					skill.skillId = 29; // Оценка учителя
					skill.score = student.homework;
					skills.push(skill);
					skill = new Object();
					skill.skillId = 33; // Срез
					skill.score = student.test;
					skills.push(skill);
					skill = new Object();
					skill.skillId = 34; // Ранг
					skill.score = student.lesson;
					skills.push(skill);
					data.skills = skills;
					if(student.comment){
						student.comment.map(function(com){
							comment+=com+'\n';
						});
					}
					data.commentHtml = comment;
					var response = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
					if(response.status == 200)
						resolve(true);
					else
						reject(false);
				} else {
					resolve(true);
				}
			});
		},Promise.resolve(true));
		var result = responses.every(elem => elem == true);
		if(result){
			res.json({
				status: 200,
				message: 'OK'
			});
		} else {
			res.json({
				status: 410,
				message: 'Error'
			});
		}
	}catch(error){
		res.json({
			status: 410,
			message: 'Error'
		});	
	}*/

});


// send message to telegram group
router.post('/sendmessagetelegram',(req,res) => {
	var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${req.body.group.Id}`;
	if(req.body.group.change){
		var text = '';
		text+='Была замена : \n Заменяющий преподаватель: ' + req.body.teacherName + '\nЗаменяемый преподаватель: ' + req.body.group.teacher + '\n Дата замены: '+ req.body.group.date +'\nгруппа: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n\n';
		queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
		.catch(error => {
			console.log(error);
			if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
			}
			throw error; // throw error further
		}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
	}

	req.body.students.map(async function(student){
		if(student.delete){
			var text = '';
			text = 'Дата урока: ' + req.body.group.date+'\n\n';
			text += 'Убрать ученик с группы\n Ученик: ' + student.name + ' с группы: \nId: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n';
			queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
			.catch(error => {
				console.log(error);
				if (error.response.status === 429) { // We've got 429 - too many requests
						return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
			}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
		}
		
		if(student.status && student.attendence){
			var text = '';
			text = 'Дата урока: ' + req.body.group.date+'\n\n';
			text += 'Найти и добавить ученика в группу\n Ученик: ' + student.name + ' в группу: \nId: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n';
			var com = student.comment?student.comment:'';
			text += 'Аттендансе студента :\nФИО : ' + student.name + '\nД/з: ' + student.homework + '\nСрез: ' + student.test+'\nРанг: ' + student.lesson+'\nКомментарии: ' + com+'\n\n\n';
			queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButtonOne('Ссылка на группу',url))
			.catch(error => {
				console.log(error);
				if (error.response.status === 429) { // We've got 429 - too many requests
					return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
			}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
		}
	});
});


//add student to group
router.post('/addtogroup', (req, res) => {
	var params = new Object();
	params.edUnitId = req.body.group.Id;
    params.StudentClientId = req.body.clientId;
    params.begin = req.body.group.date;
    params.weekdays = req.body.group.weekdays;
	params.status = 'Normal';
    api.post(key.domain,'AddEdUnitStudent',params,key.apikey)
    .then((response) => {
		res.json(response);
    })
    .catch(err =>{
		console.log(err);
        res.json({
			status: 410, 
			message:  'Error'
		});
    });
});


/*router.post('/addstudentexample', (req, res) => {
	var params = "statuses="+encodeURIComponent('АДАПТАЦИОННЫЙ ПЕРИОД,Занимается,Заморозка,Регистрация');
	api.get(key.domain,'GetStudents',params,key.apikey)
	.then((data) => {
        data.data.map(async function(record){
			try{
				var student = await Students.findOne({
					attributes: ['ClientId'],
					where:{
						StudentId: record.Id
					}
				});
				var klass = 'Нет';
				var branch = 'Нет';
				var school = record.OfficesAndCompanies ? record.OfficesAndCompanies.map(el => el.Name).join(',') : 'Нет';
				var online = 0;
				var timeIntesiv = null;
				var timeStudy = '';
				if(record.Status == 'Онлайн обучение')
					online = 1;
				
				if(record.ExtraFields){
					record.ExtraFields.find(function(record){
						if(record.Name == 'КЛАСС')
							klass = record.Value;
						if(record.Name == 'Отделение')
							branch = record.Value;
						if(record.Name == 'Online' && record.Value == 'Да')
							online = 1;
						if(record.Name == 'Время обучения')
							timeStudy = record.Value;
						if(record.Name == 'Время интенсива')
							timeIntesiv = record.Value;
					});
				}
				var language = branch == 'КО'? 'KAZ' : 'RUS';
				var intensiv = klass == '6' ? 1: 0;
				if(timeIntesiv == 'Отказались')
					intensiv = 0;
				if(timeIntesiv == null && klass == '6'){
					if(timeStudy == 'Утро')
						timeIntesiv = '09:00';
					else if(timeStudy == 'Вечер')
						timeIntesiv = '16:00';
					
					console.log('hey',timeIntesiv);
				}else if(timeIntesiv && klass == '6')
					console.log('suka',timeIntesiv);
				
				if(student === null){
					await Students.create({
						Class: klass,
						StudentId: record.Id,
						ClientId: record.ClientId,
						FirstName: record.FirstName,
						LastName: record.LastName,
						MiddleName: record.MiddleName?record.MiddleName:'',
						School: school,
						Branch: branch,
						Language: language
					},{
						fields: ['Class','StudentId','ClientId','FirstName','LastName','MiddleName','School','Branch','Language']
					});
					await ExtraFields.create({
						ClientId: record.ClientId,
						Aibucks: 0,
						Online: online,
						Intensiv: intensiv,
						OnlineSended : 0,
						IntensivSended: 0,
						TimeIntensiv: timeIntesiv
					},{
						fields: ['ClientId','Aibucks','Online','Intensiv','OnlineSended','IntensivSended','TimeIntensiv']
					});
				} else {
					console.log('Есть');
				}
			}catch(error){
				console.log(error);
			}
        });
        res.send("ok");
    });
});
*/

//add students from hh
router.post('/addstudentexample', (req, res) => {
	var params = "take=7000&statuses="+encodeURIComponent('АДАПТАЦИОННЫЙ ПЕРИОД,Занимается,Заморозка,Регистрация');
	api.get(key.domain,'GetStudents',params,key.apikey)
	.then((data) => {
        data.data.map(async function(record){
			try{
				var student = await Students.findOne({
					attributes: ['ClientId'],
					where:{
						StudentId: record.Id
					}
				});
				var klass = 'Нет';
				if(record.ExtraFields){
					record.ExtraFields.find(function(record){
						if(record.Name == 'КЛАСС')
							klass = record.Value;
					});
				}
				if(student === null){
					var newStudent = await Students.create({
						Class: klass,
						StudentId: record.Id,
						ClientId: record.ClientId,
						FirstName: record.FirstName,
						LastName: record.LastName,
						MiddleName: record.MiddleName?record.MiddleName:''
					},{
						fields: ['Class','StudentId','ClientId','FirstName','LastName','MiddleName']
					});
				}
			}catch(error){
				console.log(error);
			}
        });
        res.send("ok");
    });
});

//add offices from hh
router.post('/addofficeexample', (req, res) => {
	api.get(key.domain,'GetOffices','take=7000',key.apikey)
	.then((data) => {
        data.data.map(async function(record){
			try{
				var school = await Schools.findOne({
					attributes: ['SchoolId'],
					where:{
						SchoolId: record.Id
					}
				});
				if(school === null){
					var newSchool = await Schools.create({
						Name: record.Name,
						Address: record.Address,
						SchoolId: record.Id
					},{
						fields: ['Name','Address','SchoolId']
					});
				}
			}catch(error){
				console.log(error);
			}
        });
        res.send("ok");
    });
});


//add rooms to attendance online
router.post('/addroomexample', (req, res) => {
	var workbook = xlsx.readFile(path.join(__dirname,'../алматы кабинеты.xlsx'),{cellDates: true});
	var sheetName = workbook.SheetNames[0];
	var worksheet = workbook.Sheets[sheetName];
	var data = xlsx.utils.sheet_to_json(worksheet);
	data.map(async function(record){
		try{
			record['Кабинеты'] = String(record['Кабинеты']);
			var room = await Rooms.findOne({
				attributes: ['Id','SchoolId','Room'],
				where:{
					SchoolId: record['Id'],
					Room: record['Кабинеты']
				}
			});
			if(room === null){
				await Rooms.create({
					SchoolId: record['Филлал'],
					Room: record['Кабинеты']
				},{
					fields: ['SchoolId','Room'],
				});
			} 
		}catch(error){
			console.log(error);
		}
	});
	res.send('ok');
});

//add topics 
router.post('/addtopicsexample',(req,res) => {
	try{
		var workbook = xlsx.readFile(path.join(__dirname,'../xlsx.xlsx'),{cellDates: true});
		var sheetName = workbook.SheetNames[0];
		var worksheet = workbook.Sheets[sheetName];
		var data = xlsx.utils.sheet_to_json(worksheet);
		data.map(async function(record){
			try{
				var Class = record['Класс'].toString();
				var Name = record['Темы'];
				var SubjectId = record['Предмет'];
				var Branch = record['Отделение'].trim();
				var LevelId = record['Уровень'] ? record['Уровень']:null;
				var Priority = record['Счет'];
				var topic = await Topics.findOne({
					attributes: ['Id','Class','Name','SubjectId','Branch','LevelId'],
					where:{
						Class,
						Name,
						SubjectId,
						Branch,
						LevelId
					}
				});
				if(topic === null){
					var newTopic = await Topics.create({
						Class,
						Name,
						SubjectId,
						Branch,
						LevelId,
						Priority
					},{
						fields: ['Class','Name','SubjectId','Branch','LevelId','Priority'],
					});
				} else {
					topic.update({
						Priority: Priority,
						Branch: Branch
					});
				}
			}catch(error){
				console.log(error);
			}
		});
		res.send('ok');
	}catch(err){
		console.log(err);
	}
});

router.post('/addteacherexample', (req, res) => {
   api.get(key.domain,'GetTeachers','take=7000',key.apikey)
   .then((data) => {
        data.data.map(async function(record){
				try{
					if(record.Status == 'Работает' || record.Status == 'Стажировка/Обучалка'){
						try{
							var teacher = await Teachers.findOne({
								attributes: ['TeacherId'],
								where:{
									TeacherId: record.Id
								}
							});
							if(teacher === null) {
								if(record.EMail){
									var newContact = await Contacts.create({
										Mobile: record.Mobile,
										Email: record.EMail
									},{
										fields:['Mobile','Email']
									});
									if(newContact){
										try{
												var email = record.EMail.toLowerCase();
												var pass =  await bcrypt.hash('123456',10);
												var auth = generateKey();
												var newTeacher = await Teachers.create({
													TeacherId: record.Id,
													FirstName: record.FirstName,
													LastName: record.LastName,
													ContactId: newContact.Id,
													Email: email,
													Password: pass,
													AUTH: auth,
													RoleId: 2
												},{
													fields: ['TeacherId','FirstName','LastName','ContactId','Email','Password','AUTH','RoleId']
												});
											
										}catch(error){
											console.log(error);
										}
									}
								}
							}
						}catch(err){
							console.log(err);
						}
					}
				} catch(err){
					console.log(err);
				}
        });
        res.send("ok");
    });
});

router.post('/registeramount',verifyToken,async (req,res) => {
	try{
		var date = new Date( req.body.lessonDate);
		var registers = await Registers.findOne({
			attributes:['Id'],
			where:{
				[Op.and]:[
					{GroupId: req.body.groupId},
					{LessonDate:date}				
				]
			}
		});
		if(registers === null)
			res.send({
				status: 200,
				message: 'OK'
			});
		else
			res.send({
				status: 410,
				message: 'Уже заполнен'
			});
	}catch(error){
		console.log(error);
		res.send({
			status: 500,
			message: 'Error'
		});
	}
});

router.post('/sendmail',verifyToken, async(req,res) => {
	try{
		var teacher = await Teachers.findAll({
			attributes: ['Email'],
			where:{
				TeacherId: req.body.Id
			}
		});
		if(teacher){
			const random = uniqueRandom(1000, 9999);
			var code = random();
			var mailOptions = {
				from: 'aiplus.almaty@gmail.com',
				to: teacher[0].Email,
				cc: process.env.CC_MAIL,
				subject : 'Замена преподавателя',
				text: 'Никому не говорите : ' + code
			}
			sendMail(mailOptions);
			
			res.json({status: 200, data: code});
		} else {
			res.json({status: 500, message: 'Error'});
		}
	}catch(error){
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

router.post('/editpersonal',verifyToken,async (req,res) => {
	var params = req.body;
	try{
		var teacher = await Teachers.findOne({
			attributes:['Id','FirstName','LastName','MiddleName','Password'],
			where:{
				TeacherId: params.teacherId		
			}
		});
	
		if((params.oldPass == null && params.newPass == null) || (params.oldPass != null &&  params.newPass != null && await verifyPassword(params.oldPass,teacher.Password))){
			var fullname = params.fio?params.fio.split(' '):[];
			var pass =  params.newPass ? await bcrypt.hash(params.newPass,10): null;

			fullname = fullname.map(function(name){
				
				return support.Capitalize(name);
			});
			
			if(teacher != null){
				await teacher.update({
					FirstName: fullname[1] ? fullname[1] : teacher.FirstName,
					LastName: fullname[0] ? fullname[0] : teacher.LastName,
					MiddleName: fullname[2] ? fullname[2] : teacher.MiddleName,
					Password: pass ? pass : teacher.Password
				});

				res.json({
					status: 200,
					data: fullname
				});
			} else {
				res.send({
					status: 500,
					message: 'Ошибка'
				});
			}
		} else {
			res.json({
				status: 402,
				message: 'Не подходит пароль'
			});
		}
	}catch(err){
		console.log(err);
		res.send({
			status: 500,
			message: 'Ошибка'
		});
	}
	
});

router.get('/searchteacher',verifyToken, async (req, res) => {
	try{
		var val = '%'+req.query.value+'%'
		var query = `SELECT concat("LastName",' ',"FirstName") as "FullName", "TeacherId"
		FROM "Teachers" WHERE "FirstName" like :val OR "LastName" like :val LIMIT 10;`;
		var teachers = await sequelize.query(query,{
			replacements:{val: val},
			type: QueryTypes.SELECT
		});
		res.send({status: 200,data: teachers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/searchstudent',verifyToken, async (req, res) => {
	try{
		
		var value = req.query.value.trim().toLowerCase();
		var arr = value.toString().split(' ');
		var arr1 = value.toString().split(' ');
		var firstname = arr[1] ? '%'+arr[1]+'%':'%%';
		var lastname  = arr[0] ? '%'+arr[0]+'%':'%%';
		arr1.splice(0,2);
		var s = arr1.join(' ');
		
		var middlename = s ? '%'+s+'%':'%%';
		var klass = support.getClass(req.query.group);
		var kl = klass.split('-');
		var query = [];
		
		if(kl.length > 1){
			if(arr.length == 0){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ("Class" = :class1 OR "Class" = :class2) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{class1:kl[0],class2:kl[1]},
					type: QueryTypes.SELECT
				});
				res.send({status: 200, data: students});
			} else if(arr.length  == 1){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ("LastName" like :lastname or "FirstName" like :lastname) AND ("Class" = :class1 OR "Class" = :class2) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{lastname: lastname,class1:kl[0],class2:kl[1]},
					type: QueryTypes.SELECT
				});
				res.send({status: 200, data: students});
			} else if(arr.length == 2){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE (("LastName" like :lastname AND "FirstName" like :firstname) OR ("LastName" like :firstname AND "FirstName" like :lastname)) AND ("Class" = :class1 OR "Class" = :class2) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,class1:kl[0],class2:kl[1]},
					type: QueryTypes.SELECT
				});
				res.send({status: 200, data: students});
			}else {
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ("LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename) AND ("Class" = :class1 OR "Class" = :class2) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,middlename:middlename,class1:kl[0],class2:kl[1]},
					type: QueryTypes.SELECT
				});
				res.send({status: 200, data: students});
			}
		}else {
			if(arr.length == 0){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ("Class" = :class) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{class:kl[0]},
					type: QueryTypes.SELECT
				});
				res.send({status: 200, data: students});
			} else if(arr.length  == 1){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE (LOWER("LastName") like :lastname OR LOWER("FirstName") like :lastname) AND ("Class" = :class) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{lastname: lastname,class:kl[0]},
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			} else if(arr.length == 2){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ((LOWER("LastName") like :lastname AND LOWER("FirstName") like :firstname) OR (LOWER("LastName") like :firstname AND LOWER("FirstName") like :lastname)) AND ("Class" = :class) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,class:kl[0]},
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			}else {
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE  ("LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename) AND ("Class" = :class) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,middlename:middlename,class:kl[0]},
					type: QueryTypes.SELECT
				});

				res.send({status: 200, data: students});
			}
		}
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/subteacher',verifyToken, async (req, res) => {
	try{
		var fullname = req.query.FullName.split(' ');
		var LastName = fullname[0];
		var FirstName = fullname[1];

		var teacher = await Teachers.findOne({
			attributes: ['TeacherId',[sequelize.fn("concat",sequelize.col("LastName")," ",sequelize.col("FirstName")),"FullName"]],
			where:{
				LastName,
				FirstName
			}
		});
		if(teacher === null)
			res.send({
				status: 404,
				message: 'Такого преподавателя нет'
			});
		else
			res.json({
				status: 200,
				data: teacher
			});
	}catch(error){
		console.log(error);
        res.send({
			status: 500,
			message: 'Error'
		});
	}
});

router.get('/getregister',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date(req.query.dateFrom);
		var dateTo = new Date(req.query.dateTo);
		var registers = await Registers.findAll({
			fields:['GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','Fine'],
			where:{
				[Op.and]:[
					{TeacherId: req.query.teacherId},
					{LessonDate: {[Op.between]:[dateFrom,dateTo]}}
				]
			}
		});	
		
		res.send({status: 200, data: registers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getregisterdetails',verifyToken,async (req, res) => {
	try{
		var dateFrom = new Date('2020-09-02');
		var dateTo = new Date('2020-09-09');
		var registerId = req.query.registerId;
		var query = `SELECT "ClientId","FullName","Pass","Aibucks",
		concat(subregisters."Homework",' / ',query."avghomework") as Homework,
		concat(subregisters."Test",' / ',query."avgtest") as Test,
		concat(subregisters."Lesson",' / ',query."avglesson") as Lesson,
		"Comment",subregisters."Aibucks"
		FROM "SubRegisters" as subregisters LEFT JOIN 
		(SELECT "ClientId" as clint,round(AVG("Homework"),2) as AvgHomework,round(AVG("Test"),2) as AvgTest,round(AVG("Lesson"),2) as AvgLesson
		FROM "SubRegisters",
		(SELECT "Id" FROM "Registers" WHERE "LessonDate" BETWEEN :dateFrom AND :dateTo) as subquery
		WHERE "RegisterId" = subquery."Id" AND "Pass"=true GROUP BY "ClientId") as query
		ON subregisters."ClientId" = query."clint" WHERE subregisters."RegisterId" = :registerId`;
		var subregisters = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, registerId: registerId},
			type: QueryTypes.SELECT
		});

		res.send({status: 200, data: subregisters});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getuniqueregister',verifyToken,async (req, res) => {
	try{
		const query = `SELECT DISTINCT "GroupId", "GroupName", "Time", "WeekDays", concat("FirstName",' ',"LastName") as Teacher
		FROM "Registers" as registers
		LEFT JOIN "Teachers" as teachers
		ON registers."TeacherId" = teachers."TeacherId";`
		var registers = await sequelize.query(query,{type: QueryTypes.SELECT});
		
		res.send({status: 200, data: registers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getsubregistersavg',verifyToken,async (req, res) => {
	try{
		const query = `SELECT "ClientId","FullName","Pass",query."avghomework" as "Homework",
		query."avgtest" as "Test",
		query."avglesson" as "Lesson"
		FROM "SubRegisters" as subregisters LEFT JOIN 
		(SELECT "ClientId" as clint,round(AVG("Homework"),2) as AvgHomework,round(AVG("Test"),2)
		as AvgTest,round(AVG("Lesson"),2) as AvgLesson
		FROM "SubRegisters",
		(SELECT "Id" FROM "Registers" WHERE "LessonDate" BETWEEN '2020-09-02' AND '2020-09-09') as subquery
		WHERE "RegisterId" = subquery."Id" AND "Pass"=true GROUP BY "ClientId") as query
		ON subregisters."ClientId" = query."clint" WHERE subregisters."RegisterId" = (SELECT "Id"
		FROM public."Registers" 
		WHERE "LessonDate" = (SELECT MAX("LessonDate") FROM "Registers") AND "GroupId" = :groupId);`
		var subregisters = await sequelize.query(query,{
			replacements:{groupId: req.query.groupId},
			type: QueryTypes.SELECT
		});
		
		res.send({status: 200, data: subregisters});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getdayregisters',async(req,res) => {
	try{
		var dateFrom = new Date(req.query.dateFrom);
		var dateTo = new Date(req.query.dateTo);
		const query = `SELECT reg."Id", reg."GroupName", reg."Time", reg."LessonDate", reg."WeekDays",
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",reg."Online",top."Name" as "Topic",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name", reg."Fine"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		LEFT JOIN public."Topics" as top ON top."Id" = reg."TopicId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName",top."Name";`;
		var registers = await sequelize.query(query,{
			replacements:{dateFrom: dateFrom,dateTo: dateTo, pass:true},
			type: QueryTypes.SELECT
		});

		registers.map(function(register){
			var subject = support.subjectName(register.GroupName);
			register.Subject = subject;
		});

		res.send({status: 200, data: registers});
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.get('/getofficerooms',async (req,res) => {
	try{
		var officeId = req.query.officeId;
		var rooms = await Rooms.findAll({
			attributes: ['Id','Room'],
			where:{
				SchoolId: officeId
			}
		});
		if(rooms.length > 0){
			res.send({status: 200, data: rooms});
		} else {
			res.send({status: 200, data: []});
		}
	}catch(err){
		console.log(err);
		res.send({status: 200, data: []});
	}
});

router.get('/lastlessonroom',async (req,res) => {
	try{
		var groupId = req.query.groupId;

		const query = `SELECT rom."Id",rom."Room",reg."LevelTest" FROM public."Registers" as reg
		LEFT JOIN public."Rooms" as rom ON reg."RoomId" = rom."Id"
		WHERE reg."LessonDate" = 
		(
		SELECT MAX("LessonDate")
		FROM public."Registers" WHERE "GroupId" = :groupId
		) LIMIT 1;`;
		var room = await sequelize.query(query,{
			replacements:{groupId: groupId},
			type: QueryTypes.SELECT
		});
		if(room.length > 0){
			var obj = {};
			var lastroom = {};
			lastroom.Id = room[0].Id;
			lastroom.Room = room[0].Room;
			obj.room = lastroom;
			obj.level = room[0].LevelTest;
			res.send({status: 200, data: obj});	
		}else{
			res.send({status: 404, data: null});
		}
	}catch(error){
        res.send({status: 500,data: null});
	}
});

router.get('/gettestsubjects',async (req,res) => {
	try{
		var testId = req.query.testId;

		const query = `SELECT tsb."Id",sb."Name", tsb."MaxScore"
		FROM public."TestSubjects" tsb
		LEFT JOIN public."Subjects" sb ON sb."Id" = tsb."SubjectId"
		WHERE "TestId" = :testId`;
		var testsubjects = await sequelize.query(query,{
			replacements:{testId: testId},
			type: QueryTypes.SELECT
		});
	
		if(testsubjects.length > 0){
			res.send({status: 200, data: testsubjects});	
		}else{
			res.send({status: 404, data: null});
		}
	}catch(error){
		console.log(error);
        res.send({status: 500,data: null});
	}
});

router.get('/searchstudenttest',verifyToken, async (req, res) => {
	try{
		
		var arr = req.query.value.split(' ');
		var firstname = arr[1] ? '%'+arr[1]+'%':'%%';
		var lastname  = arr[0] ? '%'+arr[0]+'%':'%%';
		var middlename = arr[2] ? '%'+arr[2]+'%':'%%';
		
		var query = `SELECT "StudentId",concat("LastName",' ',"FirstName",' ',"MiddleName") as "FullName"
		FROM "Students" WHERE "LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename`;
		var students = await sequelize.query(query,{
			replacements:{firstname: firstname,lastname:lastname,middlename:middlename},
			type: QueryTypes.SELECT
		});
		res.send({status: 200, data: students});	
	}catch(error){
		console.log(error);
        res.send({status: 500,data: []});
	}
});

router.post('/setpersonaltests',async (req,res)=>{
	try{
		var today = new Date();
		var day = today.getFullYear()+'-'+("0" + (today.getMonth()+1)).slice(-2)+'-'+("0" + today.getDate()).slice(-2);
		var students = req.body.students;
		var personalTest = req.body.personalTest;
		var teacherId = req.body.teacherId;
		var testresults = [];
		students.map(function(student){
			student.testSubjects.map(function(testsubject){
				var obj = {};
				obj.StudentId = student.value.StudentId;
				obj.TestSubjectId = testsubject.Id;
				obj.TeacherId = teacherId;
				obj.Score = testsubject.Score;
				obj.TestDate = personalTest.date;
				obj.SubmitDate = day;
				testresults.push(obj);
			});
		});
	
		var result = await TestResults.bulkCreate(testresults,{
			fields:['StudentId','TestSubjectId','TeacherId','Score','TestDate','SubmitDate']
		});

		if(result.length > 0){
			res.json({
				status: 200,
				message: 'OK'				
			});
		}else {
			res.json({
				status: 500,
				message: 'Error'
			});
		}
	}catch(err){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
});

router.get('/gettopics',async (req,res) => {
	try{
		var Class = req.query.klass;
		var Branch = req.query.branch;
		var LevelId = req.query.level ? req.query.level:null;
		var SubjectName = req.query.subject;
		var query = ``;
		var topics = [];
		if(LevelId){
			query = `SELECT tp."Id", tp."Priority" || '. ' || tp."Name" as "Name"
			FROM public."Topics" as tp
			LEFT JOIN public."Subjects" as sbj ON  tp."SubjectId" = sbj."Id"
			WHERE tp."Class" = :Class AND (tp."Branch" = :Branch OR tp."Branch" = 'КОРО') AND tp."LevelId" = :LevelId AND sbj."Name" = :SubjectName ORDER BY tp."Priority";`
			topics =  await sequelize.query(query,{
				replacements:{Class: Class,Branch:Branch,LevelId:LevelId,SubjectName:SubjectName},
				type: QueryTypes.SELECT
			});
		} else {
			query = `SELECT tp."Id", tp."Priority" || '. ' || tp."Name" as "Name"
			FROM public."Topics" as tp
			LEFT JOIN public."Subjects" as sbj ON  tp."SubjectId" = sbj."Id"
			WHERE tp."Class" = :Class AND (tp."Branch" = :Branch OR tp."Branch" = 'КОРО') AND tp."LevelId" is NULL AND sbj."Name" = :SubjectName ORDER BY tp."Priority";`
			topics =  await sequelize.query(query,{
				replacements:{Class: Class,Branch:Branch,SubjectName:SubjectName},
				type: QueryTypes.SELECT
			});
		}
	//	console.log('Length',topics.length);
		res.send({status: 200, data: topics});	
	}catch(err){
		console.log(err);
	}
	

});

router.get('/getpersonaltestteacher', async (req,res) => {
	try{
		var teacherId = req.query.teacherId;
		var dateFrom = req.query.dateFrom;
		var dateTo = req.query.dateTo;
		var testId = req.query.testId;
		var query = `SELECT DISTINCT sub."ClientId"
		FROM "SubRegisters" as sub
		LEFT JOIN "Registers" as reg ON sub."RegisterId" = reg."Id"
		WHERE  reg."TeacherId" = :teacherId AND (reg."Change" = false OR reg."Change" IS NULL);`;

		var students = await sequelize.query(query,{
			replacements:{teacherId: teacherId},
			type: QueryTypes.SELECT
		});  
		
		var str_studenst = students.map(e => e.ClientId);
		query = `SELECT sb."Id", sb."Name"
		FROM public."Subjects" as sb
		LEFT JOIN public."TestSubjects" as tsb ON tsb."SubjectId" = sb."Id"
		WHERE tsb."TestId" = :testId`;
		var subjects = await sequelize.query(query,{
			replacements:{testId: testId},
			type: QueryTypes.SELECT
		});  

		var headers = [{ text: 'Ученик', value: 'Student', filterable: true},{text: 'Дата', value: 'TestDate'}];
		subjects.map((subject)=>{
			var obj = {};
			obj.text = subject.Name;
			obj.value = 'Name'+subject.Id;
			headers.push(obj);
		});
		query = `SELECT st."ClientId",st."LastName" || ' ' || st."FirstName" as "FullName", sb."Id", "Score",tsb."MinScore","TestDate"
		FROM public."TestResults" as res
		LEFT JOIN public."Students" as st ON st."ClientId" = res."ClientId"
		LEFT JOIN public."TestSubjects" as tsb ON tsb."Id" = res."TestSubjectId"
		LEFT JOIN public."Subjects" as sb ON sb."Id" = tsb."SubjectId"
		WHERE tsb."TestId" = :testId AND res."TestDate" BETWEEN :from AND :to AND res."ClientId" IN (:students);`
		var tests = await sequelize.query(query,{
			replacements:{testId: testId,from: dateFrom,to:dateTo,students: str_studenst},
			type: QueryTypes.SELECT
		}); 
		var items = [];
		str_studenst.map(function(clientId){
			var filters = tests.filter(test => test.ClientId == clientId);
			if(filters.length > 0){
				var set = new Set();
				filters.filter((value,index) => {
					set.add(value.TestDate);
				});
				
				var days = Array.from(set);
				days.map(function(day){
					var item = {};
					item['Student'] = filters[0].FullName;
					item['TestDate'] = day;
					filters.map(function(filter){
						if(filter.TestDate == day)
							item['Name'+filter.Id] = filter.Score;
					});
					items.push(item);
				});
				
			}
		});
		res.send({status: 200, data: {headers: headers,items: items}});
	}catch(err){
		console.log(err);
	}
});

router.get('/gettablecolumns', async (req,res) => {
	try{
		var table = req.query.Table;
		
		var query = `SELECT column_name,data_type FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = :table;`;

		var columns = await sequelize.query(query,{
			replacements:{table: table},
			type: QueryTypes.SELECT
		});  
		var headers = [];
		columns.map(function(column){
			headers.push({
				text: column.column_name,
				value: column.column_name
			});
		});

		headers.push({
			text: 'Actions', 
			value: 'actions'
		});

		query = `SELECT * FROM public."${table}";`;

		var items = await sequelize.query(query,{
			type: QueryTypes.SELECT
		}); 
		res.send({status: 200, data: {headers:headers, items: items}});
	}catch(err){
		console.log(err);
	}
});

router.post('/cronatt', async (req,res) => {
	try{
		var date = '2021-04-06';
		var params = `dateFrom=${date}&dateTo=${date}&TestTypeCategoryName=Attendance list&TestTypeName=${encodeURIComponent('Домашнее задание')}&take=7000`;
		var response = await api.get(key.domain,'GetEdUnitTestResults',params,key.apikey);
		res.send(response);
	}catch(err){
		console.log(err);
	}
});


router.post('/telegramtohh', async(req,res) => {
	try{
		var date = new Date(req.body.date);
		var registers = await Registers.findAll({
			fields:['Id','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
			where:{
				LessonDate: date,
				IsStudentAdd: true
			}
		});

		var n = registers.length;
		var i = 0;
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
					i++;
					await sleep(100);
					var subregisters = await SubRegisters.findAll({
						fields:['Id','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status'],
						where:{
							RegisterId: register.Id,
							Status: true
						}
					});
					if(subregisters.length > 0){
						await subregisters.reduce(async function(previousStudentPromise,student){
							await previousStudentPromise;							
							return new Promise(async function(resolve,reject){
								try{
									var data = new Object();
									data.edUnitId = register.GroupId;
									data.studentClientId = student.ClientId;
									data.date = register.LessonDate;
									data.testTypeId = process.env.TEST_TYPE_ID;
									var skills = new Array();
									var skill = new Object();
									skill.skillId = process.env.SCORE_TEACHER_SKILL_ID; // Оценка учителя
									skill.score = student.Homework;
									skills.push(skill);
									skill = new Object();
									skill.skillId = process.env.TEST_SKILL_ID; // Срез
									skill.score = student.Test;
									skills.push(skill);
									skill = new Object();
									skill.skillId = process.env.RANG_SKILL_ID; // Ранг
									skill.score = student.Lesson;
									skills.push(skill);
									data.skills = skills;
									data.commentHtml = student.Comment;
									var res = await api.post(key.domain,'AddEditEdUnitTestResult',data,key.apikey);
				
									if(res.status == 200){
										await student.update({
											Status: false
										});
										resolve(true);
									}else{
										resolve(true);
									}									
								}catch(err){
									await sleep(100);
									sendTelegramIND(register,student);
									resolve(true);
								}
							});
						},Promise.resolve(true));
						resolve(true);
					} else {
						resolve(true);
					}
				}catch(err){
					console.log(err);
					resolve(true);
				}
			});
		},Promise.resolve(true));

		res.send('ok');
	}catch(err){
		console.log(err);
	}
});

router.post('/hhtoonline', async(req,res) => {
	try{
		var date = req.body.date;

		var hashmap = new HashMap();
		var params = `dateFrom=${date}&dateTo=${date}&TestTypeCategoryName=Attendance list&TestTypeName=${encodeURIComponent('Домашнее задание')}&take=7000`;
		var EdUnitTestResults = await api.get(key.domain,'GetEdUnitTestResults',params,key.apikey);
		var attendances = EdUnitTestResults.data;

		attendances.map(function(attendance){
			if(hashmap.has(attendance.EdUnitId)){
				var group = hashmap.get(attendance.EdUnitId);

				if(!group.students.has(attendance.StudentClientId)){
					var obj = {};
					obj.StudentName = attendance.StudentName;
					obj.Skills = attendance.Skills;
					obj.com = attendance.CommentText ? attendance.CommentText : '';
					
					group.students.set(attendance.StudentClientId,obj);
					hashmap.set(attendance.EdUnitId,group);
				}
			}else{
				var map = new HashMap();
				var obj = {};
				obj.StudentName = attendance.StudentName;
				obj.Skills = attendance.Skills;
				obj.com = attendance.CommentText ? attendance.CommentText : '';
				map.set(attendance.StudentClientId,obj);

				var group = {};
				group.EdUnitId = attendance.EdUnitId;
				group.EdUnitName = attendance.EdUnitName;
				group.students = map;
				
				hashmap.set(attendance.EdUnitId,group);
			}
		});

		var groups = hashmap.keys();
		
		var check = new Date(date);
		var yesterday = new Date();
		
		yesterday.setDate(check.getDate()-1);
		yesterday = new Date(yesterday.toISOString().substr(0,10));

		await groups.reduce(async function(previousPromise,id){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				await sleep(100);
				try{
					
					var param = `id=${id}`;
					var EdUnits = await api.get(key.domain,'GetEdUnits',param,key.apikey);
	
					var group = EdUnits.data;
					
					var obj = hashmap.get(id);

					
					obj.OfficeOrCompanyId = group[0].OfficeOrCompanyId;

					if(group[0].ScheduleItems.length == 1){
						obj.mainTeacherId = group[0].ScheduleItems[0].TeacherIds[0];
						obj.Time = group[0].ScheduleItems[0].BeginTime + '-' + group[0].ScheduleItems[0].EndTime;
						obj.Weekdays = Weekdays(group[0].ScheduleItems[0].Weekdays);
					}else {
						group[0].ScheduleItems.map(function(ScheduleItem){
							if(ScheduleItem.EndDate){
								var from = new Date(ScheduleItem.BeginDate);
								var to = new Date(ScheduleItem.EndDate);
								if( check > from && check < to && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
								if( check.getTime() === from.getTime() && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;	
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
								if( check.getTime() === to.getTime() && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
							}
						});

						group[0].ScheduleItems.map(function(ScheduleItem){
							if(!ScheduleItem.EndDate  && !obj.mainTeacherId ){
								obj.mainTeacherId = ScheduleItem.TeacherIds[0];
								obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;
								obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
							}
						});
					
						group[0].ScheduleItems.map(function(ScheduleItem){
							if(ScheduleItem.EndDate){
								var from = new Date(ScheduleItem.BeginDate);
								var to = new Date(ScheduleItem.EndDate);
								
								
								if(check.getTime() === to.getTime() && check.getTime() === from.getTime()){
									obj.change = true;
									obj.subTeacherId = ScheduleItem.TeacherIds[0];
								}

								if(yesterday.getTime() === to.getTime() && !obj.mainTeacherId){
									obj.mainTeacherId = ScheduleItem.TeacherIds[0];
									obj.Time = ScheduleItem.BeginTime + '-' + ScheduleItem.EndTime;	
									obj.Weekdays = Weekdays(ScheduleItem.Weekdays);
								} 
							}
						});
					}
					
					hashmap.set(id,obj);
					resolve(true);
				}catch(err){
					console.log(err);
				}
			});
		},Promise.resolve(true));

		groups = hashmap.keys();

		var i = 0;
		var responses = [];
	
		await groups.reduce(async function(previousPromise ,id){
			await previousPromise;
			return new Promise(async function(resolve, reject){
				try{
					var obj = hashmap.get(id);
					if(obj.mainTeacherId){
						if(!obj.subTeacherId){
							var register = await Registers.findOne({
								attributes:['Id','GroupName','Time','LessonDate','WeekDays'],
								where:{
									[Op.and]:[
										{TeacherId: obj.mainTeacherId},
										{GroupId: obj.EdUnitId},
										{LessonDate:check}				
									]
								}
							});
							
							if(register === null){
								var Change = false;
								var LevelTest = 'Нет';
								var SubTeacherId = null;
								var TeacherId = obj.mainTeacherId;
								var GroupId = obj.EdUnitId;
								var GroupName = obj.EdUnitName;
								var Time = obj.Time;
								var LessonDate = date;
								var WeekDays = obj.Weekdays;
								var SubmitDay = new Date().toISOString().substr(0,10);
								var SubmitTime = '00:00:00';
								var IsSubmitted = true;
								var IsStudentAdd = false;
								var IsOperator = false;
								var SchoolId = obj.OfficeOrCompanyId;
								var Aibucks = 0;
								var TopicId = null;
								var RoomId = null;
								var Online = false;
								register = await Registers.create({
									Change,
									LevelTest,
									RoomId,
									SubTeacherId,
									TeacherId,
									GroupId,
									GroupName,
									Time,
									LessonDate,
									WeekDays,
									SubmitDay,
									SubmitTime,
									IsSubmitted,
									IsStudentAdd,
									IsOperator,
									SchoolId,
									Aibucks,
									TopicId,
									Online
								},{
									fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId','Online']
								});

								if(register){
									var subregisters = [];

									var students = obj.students;
									var keys = students.keys();
									
									keys.map(function(studid){
										var student = students.get(studid);
										var subreg = {};
										subreg.ClientId = studid;
										subreg.FullName = student.StudentName;
										subreg.RegisterId = register.Id;
										subreg.Pass = true;
										subreg.Status = false;
										subreg.isWatched = false;
										subreg.Aibucks = 0;
										student.Skills.map(function(skill){
											if(skill.SkillName == 'Срез'){
												subreg.Test = skill.Score;
											}else if(skill.SkillName == 'Оценка учителя'){
												subreg.Homework = skill.Score;
											}else if(skill.SkillName == 'Ранг'){
												subreg.Lesson = skill.Score;
											}
										});

										subregisters.push(subreg);
									});

									var result = await SubRegisters.bulkCreate(subregisters,{
										fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
									});
								}
							}
						} else {
							var register = await Registers.findOne({
								attributes:['Id','GroupName','Time','LessonDate','WeekDays'],
								where:{
									[Op.and]:[
										{
											[Op.or]:[
												{TeacherId: obj.subTeacherId},
												{TeacherId: obj.mainTeacherId},
											]
										},
										{GroupId: obj.EdUnitId},
										{LessonDate:check}				
									]
								}
							});
							
							if(register === null){
								var Change = false;
								var LevelTest = 'Нет';
								var SubTeacherId = obj.mainTeacherId;;
								var TeacherId = obj.subTeacherId;
								var GroupId = obj.EdUnitId;
								var GroupName = obj.EdUnitName;
								var Time = obj.Time;
								var LessonDate = date;
								var WeekDays = obj.Weekdays;
								var SubmitDay = new Date().toISOString().substr(0,10);
								var SubmitTime = '00:00:00';
								var IsSubmitted = true;
								var IsStudentAdd = false;
								var IsOperator = false;
								var SchoolId = obj.OfficeOrCompanyId;
								var Aibucks = 0;
								var TopicId = null;
								var RoomId = null;
								var Online = false;
								register = await Registers.create({
									Change,
									LevelTest,
									RoomId,
									SubTeacherId,
									TeacherId,
									GroupId,
									GroupName,
									Time,
									LessonDate,
									WeekDays,
									SubmitDay,
									SubmitTime,
									IsSubmitted,
									IsStudentAdd,
									IsOperator,
									SchoolId,
									Aibucks,
									TopicId,
									Online
								},{
									fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks','TopicId','Online']
								});

								if(register){
									var subregisters = [];

									var students = obj.students;
									var keys = students.keys();
									
									keys.map(function(studid){
										var student = students.get(studid);
										var subreg = {};
										subreg.ClientId = studid;
										subreg.FullName = student.StudentName;
										subreg.RegisterId = register.Id;
										subreg.Pass = true;
										subreg.Status = false;
										subreg.isWatched = false;
										subreg.Aibucks = 0;
										student.Skills.map(function(skill){
											if(skill.SkillName == 'Срез'){
												subreg.Test = skill.Score;
											}else if(skill.SkillName == 'Оценка учителя'){
												subreg.Homework = skill.Score;
											}else if(skill.SkillName == 'Ранг'){
												subreg.Lesson = skill.Score;
											}
										});

										subregisters.push(subreg);
									});

									var result = await SubRegisters.bulkCreate(subregisters,{
										fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status','isWatched','Aibucks']
									});
								}
							}
						}
					}else{
						responses.push(obj);
						i++;
					}
					resolve(true);
				}catch(err){
					console.log(err);
				}
			});	
		},Promise.resolve(true));

		res.send({status: "OK", data: responses});
	}catch(err){
		console.log(err);
	}
});

module.exports = router;