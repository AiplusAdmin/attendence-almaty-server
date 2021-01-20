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
	console.log(req.body);
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
		else if(user){
			var exipersIn = '';
			if (remember)
				exipersIn = "30 days";
			else 
				exipersIn = "12h";
			const token = jwt.sign({_id: user.teacherId}, user.authkey,{expiresIn: exipersIn});
			res.set('ACCESSTOKEN',token);
			res.set('AUTHTOKEN',user.authkey);
			console.log(user);
			res.json({
				status: 200, 
				data: {
					teacherId: user.teacherId,
					roleId: user.roleId, 
					authtoken: user.authkey, 
					accesstoken: token,
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

//Get Student in Group
router.post('/groupstudents',verifyToken, (req, res) => {
	console.log(req.body);
	if(req.body.groupId == undefined){
		res.json({
			status: 401,
			data: []
		});
	} else {
		var teacherId = req.body.teacherId;
		var params = 'edUnitId=' + req.body.groupId;
		api.get(key.domain,'GetEdUnitStudents',params,key.apikey)
			.then(async (response) => {
				if(response.status === 200){
					var students = new Array();
					var groupName = response.data[0]?support.getSubject(response.data[0].EdUnitName):null;
					console.log(groupName);
					
					await response.data.reduce(async (previousPromise,student) => {
						await previousPromise;
						return new Promise(async function(resolve,reject){
							if((student.StudyUnits == undefined && student.BeginDate <= req.body.date) || student.EndDate >= req.body.date){
								var obj = new Object();
								obj.clientid = student.StudentClientId;
								obj.name = student.StudentName;
								obj.status = false;
								obj.attendence = false;
								obj.aibaks = 0;
								obj.icon = 'mdi-close-thick';
								if(teacherId == 4288 || teacherId == 154 || teacherId == 9517 || teacherId == 4425|| teacherId == 13964 || teacherId ==5425 || teacherId == 2136){
									var hh = await api.get(key.domain,'GetStudents','clientId='+student.StudentClientId,key.apikey);
									var fields = hh.data[0].ExtraFields?hh.data[0].ExtraFields:[];
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
									obj.dynamics.sort(function(a){
										if(a.Value)
											return -1;
										
										return 0;
									});
									console.log(obj.dynamics);
									students.push(obj); 
								}else {
									students.push(obj); 

								}
								}
							resolve(true);
						});
					},Promise.resolve(true));

					console.log('Закончили');
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
			},{
				fields:['Change','LevelTest','RoomId','SubTeacherId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Aibucks']
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
				fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status']
			});
			if(result.length > 0){
				new Promise(async (resolve) => {
					try{
						await hh(LessonDate,GroupId,students,newRegister);
						console.log('закончил');
						resolve(true);
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

router.post('/addtogroup', (req, res) => {
	var params = new Object();
	params.edUnitId = req.body.group.Id;
    params.StudentClientId = req.body.clientId;
    params.begin = req.body.group.date;
    params.weekdays = req.body.group.weekdays;
	params.status = 'Normal';
	console.log(params);
    api.post(key.domain,'AddEdUnitStudent',params,key.apikey)
    .then((response) => {
		console.log('res',response);
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

router.post('/addregister',async (req,res) => {
	try{
		var TeacherId = req.body.teacherId;
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
		var newRegister = await Registers.create({
				LevelTest,
				RoomId,
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
				SchoolId	
			},{
				fields:['LevelTest','RoomId','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId']
		});
		if(newRegister){
			var promise = req.body.students.map(async function(student){
				return new Promise(async function(resolve,resject){
					try{
						var comment = '';
						if(!student.delete){
							if(student.comment){
								student.comment.map(function(com){
									comment+=com+'\n';
								});
							}
							var newSubRegisters = await SubRegisters.create({
								RegisterId: newRegister.Id,
								ClientId: student.clientid,
								FullName: student.name,
								Pass: student.attendence,
								Homework: student.attendence?student.homework:-1,
								Test: student.attendence?student.test:-1,
								Lesson: student.attendence?student.lesson:-1,
								Comment: comment,
								Status: student.status
							},{
								fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status']
							});
							if(newSubRegisters){
								resolve(true);
							} else {
								resolve(false);
							}
						}
					}catch(err){
						console.log(err);
						resolve(false);
					}
				});
			});
			var responses = await Promise.all(promise);
			var ok = responses.every(elem => elem == true);
			if(ok){
				new Promise(async (resolve) => {
					await hh(date,groupId,students,newRegister);
					console.log("Я закончил пулить в hh");
					resolve(true);
				});

				res.json({
					status: 200,
					message: 'OK',
					data: newRegister
				});
			} else {
				res.json({
					status: 500,
					message: 'Error'
				});
			}
		}
	}catch(error){
		console.log(error);
		res.json({
			status: 500,
			message: 'Error'
		});
	}
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
router.post('/addstudentexample', (req, res) => {
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
					console.log(newStudent);
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

router.post('/addofficeexample', (req, res) => {
	api.get(key.domain,'GetOffices','',key.apikey)
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
					console.log('Record',record);
					var newSchool = await Schools.create({
						Name: record.Name,
						Address: record.Address,
						SchoolId: record.Id
					},{
						fields: ['Name','Address','SchoolId']
					});
					console.log('Добавили');
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

router.post('/addroomexample', (req, res) => {
	var workbook = xlsx.readFile('алматы кабинеты.xlsx',{cellDates: true});
	var sheetName = workbook.SheetNames[0];
	var worksheet = workbook.Sheets[sheetName];
	var data = xlsx.utils.sheet_to_json(worksheet);
	data.map(async function(record){
		try{
			record['Кабинеты'] = String(record['Кабинеты']);
			console.log(record);
			var room = await Rooms.findOne({
				attributes: ['Id','SchoolId','Room'],
				where:{
					SchoolId: record['Филлал'],
					Room: record['Кабинеты']
				}
			});
			if(room === null){
				console.log('Record',record);
				var newRoom = await Rooms.create({
					SchoolId: record['Филлал'],
					Room: record['Кабинеты']
				},{
					fields: ['SchoolId','Room'],
				});
				console.log('Добавили');
			} else {
				console.log('Есть');
			}
		}catch(error){
			console.log(error);
		}
	});
	res.send('ok');
});

router.post('/addtopicsexample',(req,res) => {
	try{
		var workbook = xlsx.readFile('7 класс темы.xlsx',{cellDates: true});
		var sheetName = workbook.SheetNames[0];
		var worksheet = workbook.Sheets[sheetName];
		var data = xlsx.utils.sheet_to_json(worksheet);
		data.map(async function(record){
			try{
				var Class = record['Класс'].toString();
				var Name = record['Темы'];
				var SubjectId = record['Предмет'];
				var Branch = record['Отделение'];
				var LevelId = record['Уровень'] ? record['Уровень']:null;
				console.log(record);
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
						LevelId
					},{
						fields: ['Class','Name','SubjectId','Branch','LevelId'],
					});
					console.log('Добавили');
				} else {
					console.log('Есть');
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

router.post('/sendmessagetelegram',(req,res) => {
	var text = '';
	var url = `https://${process.env.DOMAIN}.t8s.ru/Learner/Group/${req.body.group.Id}`;
	if(req.body.group.change){
		text+='Была замена : \n Заменяющий преподаватель: ' + req.body.teacherName + '\nЗаменяемый преподаватель: ' + req.body.group.teacher + '\n Дата замены: '+ req.body.group.date +'\nгруппа: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n\n';
		queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButton('Ссылка на группу',url))
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
			text = 'Дата урока: ' + req.body.group.date+'\n\n';
			text += 'Убрать ученик с группы\n Ученик: ' + student.name + ' с группы: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n';
			queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButton('Ссылка на группу',url))
			.catch(error => {
				console.log(error);
				if (error.response.status === 429) { // We've got 429 - too many requests
						return retry(error.response.data.parameters.retry_after) // usually 300 seconds
				}
				throw error; // throw error further
			}),process.env.OPERATOR_GROUP_CHATID,'telegramGroup');
		}else if(student.status && student.attendence){
			
			text = 'Дата урока: ' + req.body.group.date+'\n\n';
			text += 'Найти и добавить ученика в группу\n Ученик: ' + student.name + ' в группу: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n';
			var com = student.comment?student.comment:'';
			text += 'Аттендансе студента :\nФИО : ' + student.name + '\nД/з: ' + student.homework + '\nСрез: ' + student.test+'\nРанг: ' + student.lesson+'\nКомментарии: ' + com+'\n\n\n';
			queueBot.request((retry) => bot.telegram.sendMessage(process.env.OPERATOR_GROUP_CHATID,text,botUtils.buildUrlButton('Ссылка на группу',url))
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

router.post('/addteacherexample', (req, res) => {
   api.get(key.domain,'GetTeachers','',key.apikey)
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
							} else {
								console.log('Есть');
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
		console.log(req);
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
			console.log(mailOptions);
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
				FROM "Students" WHERE "LastName" like :lastname or "FirstName" like :lastname AND ("Class" = :class1 OR "Class" = :class2) LIMIT 10;`;
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
				FROM "Students" WHERE "LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename AND ("Class" = :class1 OR "Class" = :class2) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,middlename:middlename,class1:kl[0],class2:kl[1]},
					type: QueryTypes.SELECT
				});
				res.send({status: 200, data: students});
			}
		}else {
			if(arr.length == 0){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" LIMIT 10;`;
				students = await sequelize.query(query,{
					type: QueryTypes.SELECT
				});
				console.log(students);
				res.send({status: 200, data: students});
			} else if(arr.length  == 1){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE LOWER("LastName") like :lastname OR LOWER("FirstName") like :lastname LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{lastname: lastname},
					type: QueryTypes.SELECT
				});
				console.log(students);

				res.send({status: 200, data: students});
			} else if(arr.length == 2){
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE ((LOWER("LastName") like :lastname AND LOWER("FirstName") like :firstname) OR (LOWER("LastName") like :firstname AND LOWER("FirstName") like :lastname)) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname},
					type: QueryTypes.SELECT
				});
				console.log(students);

				res.send({status: 200, data: students});
			}else {
				query = `SELECT "ClientId",TRIM("LastName" || ' ' || "FirstName" || ' ' || "MiddleName") as "FullName"
				FROM "Students" WHERE  "LastName" like :lastname AND "FirstName" like :firstname AND "MiddleName" like :middlename AND ("Class" = :class) LIMIT 10;`;
				students = await sequelize.query(query,{
					replacements:{firstname: firstname,lastname:lastname,middlename:middlename,class:kl[0]},
					type: QueryTypes.SELECT
				});
				console.log(students);

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
			fields:['GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
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
		var query = `SELECT "ClientId","FullName","Pass",
		concat(subregisters."Homework",' / ',query."avghomework") as Homework,
		concat(subregisters."Test",' / ',query."avgtest") as Test,
		concat(subregisters."Lesson",' / ',query."avglesson") as Lesson,
		"Comment"
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
		reg."SubmitDay", reg."SubmitTime",reg."LevelTest",rom."Room",reg."Aibucks",
		CASE 
			WHEN reg."GroupName" like '%RO%' THEN 'RO'
			WHEN reg."GroupName" like '%KO%' THEN 'KO'
		END AS "Branch", concat(teach."LastName",' ',teach."FirstName") as "FullName", concat(subteach."LastName",' ',subteach."FirstName") as "SubFullName",
		SUM(CASE WHEN subregAll."Pass" = :pass THEN 1 ELSE 0 END) as "Passed",COUNT(subregAll."Id") as "All", sch."Name"
		FROM public."Registers" as reg
		LEFT JOIN public."Teachers" as teach ON reg."TeacherId" = teach."TeacherId"
		LEFT JOIN public."Teachers" as subteach ON reg."SubTeacherId" = subteach."TeacherId"
		LEFT JOIN public."SubRegisters" as subregAll ON reg."Id" = subregAll."RegisterId"
		LEFT JOIN public."Schools" as sch ON reg."SchoolId" = sch."SchoolId"
		LEFT JOIN public."Rooms" as rom ON rom."Id" = reg."RoomId"
		WHERE reg."LessonDate" BETWEEN :dateFrom AND :dateTo
		GROUP BY reg."Id",teach."LastName",teach."FirstName",sch."Name",rom."Room",subteach."LastName",subteach."FirstName";`;
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
		console.log(room);
		if(room.length > 0){
			console.log(room);
			var obj = {};
			var lastroom = {};
			lastroom.Id = room[0].Id;
			lastroom.Room = room[0].Room;
			obj.room = lastroom;
			obj.level = room[0].LevelTest;
			res.send({status: 200, data: obj});	
		}else{
			console.log('hey');
			res.send({status: 404, data: null});
		}
	}catch(error){
		console.log(error);
        res.send({status: 500,data: null});
	}
});

router.get('/gettestsubjects',async (req,res) => {
	try{
		console.log(req.query);
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
			console.log('hey');
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
		console.log(req.query);
		var Class = req.query.klass;
		var Branch = req.query.branch;
		var LevelId = req.query.level ? req.query.level:null;
		var SubjectName = req.query.subject;
		var query = ``;
		var topics = [];
		if(LevelId){
			query = `SELECT tp."Id", ROW_NUMBER() OVER() || '. ' || tp."Name" as "Name"
			FROM public."Topics" as tp
			LEFT JOIN public."Subjects" as sbj ON  tp."SubjectId" = sbj."Id"
			WHERE tp."Class" = :Class AND (tp."Branch" = :Branch OR tp."Branch" = 'КОРО') AND tp."LevelId" = :LevelId AND sbj."Name" = :SubjectName;`
			topics =  await sequelize.query(query,{
				replacements:{Class: Class,Branch:Branch,LevelId:LevelId,SubjectName:SubjectName},
				type: QueryTypes.SELECT
			});
		} else {
			query = `SELECT tp."Id", ROW_NUMBER() OVER() || '. ' || tp."Name" as "Name"
			FROM public."Topics" as tp
			LEFT JOIN public."Subjects" as sbj ON  tp."SubjectId" = sbj."Id"
			WHERE tp."Class" = :Class AND (tp."Branch" = :Branch OR tp."Branch" = 'КОРО') AND tp."LevelId" is NULL AND sbj."Name" = :SubjectName;`
			topics =  await sequelize.query(query,{
				replacements:{Class: Class,Branch:Branch,SubjectName:SubjectName},
				type: QueryTypes.SELECT
			});
		}
		console.log('Length',topics.length);
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
		console.log(items);
		res.send({status: 200, data: {headers: headers,items: items}});
	}catch(err){
		console.log(err);
	}
});

module.exports = router;