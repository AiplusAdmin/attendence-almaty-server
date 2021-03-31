const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const HashMap = require('hashmap');
const Promise = require('bluebird');
const xlsx = require('xlsx');

const sequelize = require('../databases/index').sequelize;
const bot = require('../scripts/aiplusOnlineBotFunctions');
const api = require('../api/api');
const StudentsHistoryNotification = require('../modules/StudentsHistoryNotification');
const TestResults = require('../modules/TestResults');


const key = {
    "domain": process.env.DOMAIN,
    "apikey": process.env.APIKEY
};

router.post('/online', async (req,res) => {
	var cl = new String(req.body.params.class);
	var branch = req.body.params.branch;
	var branchQuery = '';
	if(branch == 'КО' || branch == 'РО')
		branchQuery = `AND st."Branch" = :branch`;
	
	var query = `SELECT ext."Id",st."StudentId", tgs."ChatId"
		FROM public."Students" as st
		LEFT JOIN public."ExtraFields" as ext ON ext."ClientId" = st."ClientId"
		LEFT JOIN public."TelegramStudents" as tgs ON tgs."ClientId" = st."ClientId"
		WHERE ext."Online" = true AND st."Class" = :class AND tgs."ChatId" IS NOT NULL ${branchQuery}`;
	
	var students = await sequelize.query(query,{
		replacements:{class: cl,branch: branch},
		type: QueryTypes.SELECT
	});

	bot.OnlineLessons(req.body.params,students);
});

router.post('/intensiv', async (req,res) => {
	var schools = req.body.params.school;
	var schoolQuery = '';
	var n = schools.length;
	if(n == 1)
		schoolQuery = `AND st."School" LIKE '%${schools[0]}%'`;
	else if(n == 5){
		schoolQuery = '';
	}else{
		var i = 0;
		schools.map(function(school){
			if(i == 0){
				schoolQuery += `AND st."School" LIKE '%${school}%'`;
			} else {
				schoolQuery += ` OR st."School" LIKE '%${school}%'`;
			}
			i++;
		});
	}
	var branch = req.body.params.branch;
	var branchQuery = '';
	if(branch == 'КО' || branch == 'РО')
		branchQuery = `AND st."Branch" = :branch`;
	
	var query = `SELECT ext."Id",st."StudentId", tgs."ChatId"
		FROM public."Students" as st
		LEFT JOIN public."ExtraFields" as ext ON ext."ClientId" = st."ClientId"
		LEFT JOIN public."TelegramStudents" as tgs ON tgs."ClientId" = st."ClientId"
		WHERE ext."Online" = true AND tgs."ChatId" IS NOT NULL ${branchQuery} ${schoolQuery}`;
	
	var students = await sequelize.query(query,{
		replacements:{branch: branch},
		type: QueryTypes.SELECT
	});

	bot.IntensivLessons(req.body.params,students);
});

router.post('/attendance', async (req,res) => {
	var params = 'EdUnitOfficeOrCompanyId='+req.body.params.school.SchoolId+'&dateFrom='+req.body.params.date+'&dateTo='+req.body.params.date+'&TestTypeCategoryName=Attendance list&TestTypeName='+encodeURIComponent('Домашнее задание');
	var response = await api.get(key.domain,'GetEdUnitTestResults',params,key.apikey);
	var hash = new HashMap();
	var promise = await response.data.map(function(test){
		return new Promise(async function(resolve){
			if(!hash.has(test.StudentClientId)){
				var history = await StudentsHistoryNotification.findOne({
					attributes: ['Id'],
					where:{
						ClientId: test.StudentClientId,
						GroupId: test.EdUnitId,
						LessonDay: req.body.params.date.substr(0, 10)
					}
				});
				if(history == null){
					var obj = new Object();
					obj.EdUnitName = test.EdUnitName;
					obj.comment =  test.CommentText;
					obj.Skills = test.Skills;
					obj.GroupId = test.EdUnitId;
					var value = new Array();
					value.push(obj);
					hash.set(test.StudentClientId, value);
				}
			} else {
				var history = await StudentsHistoryNotification.findOne({
					attributes: ['Id'],
					where:{
						ClientId: test.StudentClientId,
						GroupId: test.EdUnitId,
						LessonDay: req.body.params.date
					}
				});
				if(history == null){
					var value = hash.get(test.StudentClientId);
					var obj = new Object();
					obj.EdUnitName = test.EdUnitName;
					obj.comment =  test.CommentText;
					obj.Skills = test.Skills;
					obj.GroupId = test.EdUnitId;
					value.push(obj);
					hash.set(test.StudentClientId, value);
				}
			}
			resolve(true);
		});
	});
	await Promise.all(promise);
	var keys = hash.keys();
	var telegrams = [];
	if(keys.length){
		query = `SELECT st."LastName" || ' ' || st."FirstName" as "FullName",st."ClientId",tgst."ChatId",st."Language"
		FROM public."TelegramStudents" as tgst 
		LEFT JOIN public."Students" as st ON st."ClientId" = tgst."ClientId"
		WHERE tgst."ClientId" IN (:students)`;
		telegrams = await sequelize.query(query,{
			replacements:{students: keys},
			type: QueryTypes.SELECT
		});
	}

	bot.Attendance(req.body.params,hash,telegrams);
});

router.post('/personal/attendance', async (req,res) => {
	const query = `SELECT st."LastName" || ' ' || st."FirstName" as "FullName",st."ClientId",tgst."ChatId",st."Language"
	FROM public."Students" as st 
	LEFT JOIN public."TelegramStudents" as tgst ON tgst."ClientId" = st."ClientId"
	WHERE st."StudentId" = :studentId`;

	var telegrams = await sequelize.query(query,{
		replacements:{studentId: params.studentId},
		type: QueryTypes.SELECT
	});

	if(telegrams.length > 0){
		var params = 'dateFrom='+req.body.params.from+'&dateTo='+req.body.params.to+'&studentClientId='+student.ClientId+'&TestTypeCategoryName=Attendance list&TestTypeName='+encodeURIComponent('Домашнее задание');
		var response = await api.get(key.domain,'GetEdUnitTestResults',params,key.apikey);
		var hash = new HashMap();
		var promise = await response.data.map(function(test){
			return new Promise(async function(resolve){
				if(!hash.has(test.StudentClientId)){
					var history = await StudentsHistoryNotification.findOne({
						attributes: ['Id'],
						where:{
							ClientId: test.StudentClientId,
							GroupId: test.EdUnitId,
							LessonDay: req.body.params.date.substr(0, 10)
						}
					});
					if(history == null){
						var obj = new Object();
						obj.EdUnitName = test.EdUnitName;
						obj.comment =  test.CommentText;
						obj.Skills = test.Skills;
						obj.GroupId = test.EdUnitId;
						var value = new Array();
						value.push(obj);
						hash.set(test.StudentClientId, value);
					}
				} else {
					var history = await StudentsHistoryNotification.findOne({
						attributes: ['Id'],
						where:{
							ClientId: test.StudentClientId,
							GroupId: test.EdUnitId,
							LessonDay: req.body.params.date
						}
					});
					if(history == null){
						var value = hash.get(test.StudentClientId);
						var obj = new Object();
						obj.EdUnitName = test.EdUnitName;
						obj.comment =  test.CommentText;
						obj.Skills = test.Skills;
						obj.GroupId = test.EdUnitId;
						value.push(obj);
						hash.set(test.StudentClientId, value);
					}
				}
				resolve(true);
			});
		});
		await Promise.all(promise);

		bot.Attendance(req.body.params,hash,telegrams);
	}
});

router.post('/personal/tests', async (req,res)=>{
	try{
		var params = 'from='+req.body.params.date+'&to=' + req.body.params.date;
		var response = await api.get(key.domain,'GetPersonalTestResults',params,key.apikey);
		var query = '';
		var telegrams = [];
		var hash = new HashMap();
		var promise = await response.data.map(function(test){
			return new Promise(async function(resolve){
				if(!hash.has(test.StudentClientId)){
					hash.set(test.StudentClientId, test);					
				} else {
					var value = hash.get(test.StudentClientId);
					hash.set(test.StudentClientId, test);
				}
				resolve(true);
			});
		});
		await Promise.all(promise);
		var students = hash.keys();

		if(students.length > 0){
			query = `SELECT st."LastName" || ' ' || st."FirstName" as "FullName",st."ClientId",tgst."ChatId",st."Language"
			FROM public."TelegramStudents" as tgst 
			LEFT JOIN public."Students" as st ON st."ClientId" = tgst."ClientId"
			WHERE tgst."ClientId" IN (:students)`;
			telegrams = await sequelize.query(query,{
				replacements:{students: students},
				type: QueryTypes.SELECT
			});

			bot.PersonalTests(req.body.params.date,hash,telegrams);
		}

	}catch(err){
		console.log(err);
	}
});

router.post('/notification', async (req,res) => {
	try{
		var schools = req.body.params.school;
		var schoolQuery = '';
		var branch = req.body.params.branch;
		var message = req.body.params.message;
		var i = 0;
		schools.map(function(school){
			if(i == 0){
				schoolQuery += `AND st."School" LIKE '%${school}%'`;
			} else {
				schoolQuery += ` OR st."School" LIKE '%${school}%'`;
			}
			i++;
		});
		var klasses = req.body.params.class;
		var classQuery = '';
		var j = 0;
		klasses.map(function(klass){
			if(j == 0){
				classQuery += `AND st."Class" LIKE '%${klass}%'`;
			} else {
				classQuery += ` OR st."Class" LIKE '%${klass}%'`;
			}
			j++;
		});
		var branchQuery = '';
		if(branch == 'КО' || branch == 'РО')
			branchQuery = `AND st."Branch" = :branch`;
		
			var query = `SELECT tgs."ChatId"
			FROM public."TelegramStudents" as tgs
			LEFT JOIN public."Students" as st ON st."ClientId" = tgs."ClientId"
			WHERE tgs."ChatId" IS NOT NULL ${schoolQuery} ${branchQuery} ${classQuery}`;
		
		var students = await sequelize.query(query,{
			replacements:{branch: branch},
			type: QueryTypes.SELECT
		});

		bot.Notification(message,students);
	}catch(err){
		console.log(err);
	}
});

router.post('/upload', async (req,res) => {
	try{
		//console.log(req.body);
		var day = req.body.day;
		var json = req.body.data;
			var hash = new HashMap();
			json.map(function(data){
				var id = data['ID'];
				if(!isNaN(id)){
					if(hash.has(data['ID'])){
						var arr = hash.get(id);
						var obj = {};
						switch(data['Предмет']){
							case 'М':
								obj.TestSubjectId = 5;
								break;
							case 'Л':
								obj.TestSubjectId = 6;
								break;
							case 'А':
								obj.TestSubjectId = 7;
								break;
							case 'К':
								obj.TestSubjectId = 8;
								break;
							case 'Р':
								obj.TestSubjectId = 9;
								break;
							default:
								break;
						}
						var filter = arr.filter(el => el.TestSubjectId == obj.TestSubjectId);
						if(filter.length > 0){
							console.log(filter);
						} else {
							obj.Score = data['Баллы'];
							obj.TestDate = day;
							obj.SubmitDate = new Date().toISOString().substr(0,10);
							arr.push(obj);
							hash.set(id,arr);
						}
					}else{
						var obj = {};
						var arr = [];
						switch(data['Предмет']){
							case 'М':
								obj.TestSubjectId = 5;
								break;
							case 'Л':
								obj.TestSubjectId = 6;
								break;
							case 'А':
								obj.TestSubjectId = 7;
								break;
							case 'К':
								obj.TestSubjectId = 8;
								break;
							case 'Р':
								obj.TestSubjectId = 9;
								break;
							default:
								break;
						}
						obj.Score = data['Баллы'];
						obj.TestDate = new Date(data['Отметка времени']).toISOString().substr(0,10);
						obj.SubmitDate = new Date().toISOString().substr(0,10);
						arr.push(obj);
						hash.set(id,arr);
					}
				}
			});
			var keys = hash.keys();
			/*var query = `SELECT st."LastName" || ' ' || st."FirstName" as "FullName",st."StudentId",st."ClientId",tgst."ChatId"
			FROM public."Students" as st 
			LEFT JOIN public."TelegramStudents" as tgst ON tgst."ClientId" = st."ClientId"
			WHERE st."StudentId" IN (:students)`;*/
			var query = `SELECT st."LastName" || ' ' || st."FirstName" as "FullName",st."StudentId",st."ClientId"
			FROM public."Students" as st 
			WHERE st."StudentId" IN (:students)`;

			var telegrams = await sequelize.query(query,{
				replacements:{students: keys},
				type: QueryTypes.SELECT
			});
			telegrams.map(async function(telegram){
				var arr = hash.get(telegram.StudentId);
				arr.map(el => el.ClientId = telegram.ClientId);
				await TestResults.bulkCreate(arr,{
					fields:['ClientId','TestSubjectId','Score','TestDate','SubmitDate']
				});
			});
		//	bot.Intensiv(hash,telegrams);
	}catch(err){
		console.log(err);
	}
	
});

router.post('/uploadall', async (req,res) => {
	try{
		//console.log(req.body);
		var json = req.body.data;
		
		
		/*await TestResults.bulkCreate(arr,{
			fields:['ClientId','TestSubjectId','Score','TestDate','SubmitDate']
		});*/
		//	bot.Intensiv(hash,telegrams);
	}catch(err){
		console.log(err);
	}
	
});
module.exports = router;