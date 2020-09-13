const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const Op = require('sequelize').Op;
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const uniqueRandom = require('unique-random');

const verifyToken = require('../scripts/verifyToken');
const generateKey = require('../scripts/generateKeys');
const Queue = require('../scripts/queue');
const api = require('../api/api');
const Registers = require('../modules/Registers');
const SubRegisters = require('../modules/SubRegisters');
const sequelize = require('../databases/index').sequelize;
const Teachers = require('../modules/Teachers');
const Contacts = require('../modules/Contacts');
const Students = require('../modules/Students');
const sendMail = require('../scripts/gmail');

const key = {
    "domain":"aiplus",
    "apikey":"VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w"
};


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

//Get Offices
router.get('/offices',verifyToken, (req, res) => {
    api.get(this.key.domain,'GetOffices','',this.key.apikey)
        .then((data) => {
            res.json(data);
        })
        .catch(err =>{
            res.send("error: " + err);
        });
});

//Get Teachers
router.post('/teacher',verifyToken,(req, res) => {
	console.log(req.body);
    var params = 'id='+req.body.teacherId;
    api.get(key.domain,'GetTeachers',params,key.apikey)
        .then((data) => {
            res.json(data);
        })
        .catch(err =>{
            res.send("error: " + err);
        });
});

router.post('/login', async (req, res) => {
	var remember = req.body.remember;
	passport.authenticate('local',(err,user,info) => {
		console.log(user);
		if(err)
			res.send({status: 400,err});
		else if(user){
			var exipersIn = '';
			if (remember)
				exipersIn = "30 days";
			else 
				exipersIn = "2h";
			const token = jwt.sign({_id: user.teacherId}, user.authkey,{expiresIn: exipersIn});
			
			res.set('ACCESSTOKEN',token);
			res.set('AUTHTOKEN',user.authkey);
			res.send({status: 200, teacherId: user.teacherId,roleId: user.roleId, authtoken: user.authkey, accesstoken: token});
		} else
			res.send({status: 404, message: info.message});
	})(req,res);
});

//Get Groups
router.post('/groups',verifyToken, (req, res) => {
    var params = 'types=Group&timeFrom='+req.body.params.timeFrom+'&timeTo='+req.body.params.timeTo+'&statuses=Working&officeOrCompanyId='+req.body.params.officeId+'&teacherId='+req.body.teacherId;
    var date = Weekday(req.body.params.date);
    api.get(key.domain,'GetEdUnits',params,key.apikey)
        .then((data) => {
            if(data.length>0){
				var group = new Object();
				var found = false;
				var index = 0;
				data.map(function(groups,ind){
					if(groups.ScheduleItems[0].BeginTime == req.body.params.timeFrom && groups.ScheduleItems[0].EndTime == req.body.params.timeTo){
						var weekdays = Weekdays(groups.ScheduleItems[0].Weekdays);
						if(weekdays.includes(date)){
							found = true;
							index = ind;
						}
					}
				});
				if(found){
					group.Id = data[index].Id;
					group.name = data[index].Name;
					group.teacher = data[index].ScheduleItems[0].Teacher;
					group.time = data[index].ScheduleItems[0].BeginTime + '-' + data[index].ScheduleItems[0].EndTime;
					group.days = Weekdays(data[index].ScheduleItems[0].Weekdays);
					group.weekdays = data[index].ScheduleItems[0].Weekdays;
					
					res.json({group: group, status: true});
				} else {
					res.json({status: false});
				}
            }
           
        })
        .catch(err =>{
            res.send("error: " + err);
        });
});

//Get Student in Group
router.post('/groupstudents',verifyToken, (req, res) => {
    var params = 'edUnitId=' + req.body.groupId;
    api.get(key.domain,'GetEdUnitStudents',params,key.apikey)
        .then((data) => {
			var students = new Array();
            data.map((student) => {
                if(student.StudyUnits == undefined && student.BeginDate < req.body.date){
                    var obj = new Object();
                    obj.clientid = student.StudentClientId;
                    obj.name = student.StudentName;
                    obj.status = false;
                    obj.attendence = false;
                    students.push(obj);
                }
            });
            return res.send(students);
        })
        .catch(err =>{
            res.send("error: " + err);
        });
});

//Get Student
router.post('/student',verifyToken, async (req,res) => {
	try{
		var fullname = req.body.student.value.split(' ');
		var student = await Students.findOne({
			where:{
				LastName: fullname[0],
				FirstName: fullname[1],
				MiddleName: fullname[2]?fullname[2]:null
			},
			attributes: ['ClientId']
		});
		if(student === null){
			res.json(null)
		} else {
			res.json(student.ClientId);
		}
	}catch(error){
		console.log(error);
		res.send("error: " + error);

	}
});

//Add student passes
router.post('/setpasses',verifyToken, (req, res) => {
    var data = req.body.date;
    var groupId = req.body.groupId;
    var students = req.body.students;
    var params = new Array();
    students.map(function(student){
        if(student.clientId != -1){
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
        res.send({status:response.status, statusText: response.statusText});
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

//add attendence test
router.post('/setattendence',verifyToken, (req, res) => {
    var date = req.body.date;
    var groupId = req.body.groupId;
    var students = req.body.students;
	var queue = new Queue();
	try{
		students.map(function(student){
			if(student.attendence && student.clientId != -1){
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
				data.commentHtml = student.comment;
				queue.add(data);
			}
		});
		res.send({status: true});
	}catch(error){
		res.send({status: false});
	}
});

router.post('/addtogroup',verifyToken, (req, res) => {
	var params = new Object();
	params.edUnitId = req.body.group.Id;
    params.studentClientId = req.body.clientId;
    params.begin = req.body.group.date;
    params.weekdays = req.body.group.weekdays;
    params.status = 'Normal';
    api.post(key.domain,'AddEdUnitStudent',params,key.apikey)
    .then((status) => {
		if(status.status == 200 && status.statusText == 'OK')
			res.send({status: 200, message: 'OK'});
    })
    .catch(err =>{
        res.send({status: 500, error:  err});
    });
});

router.post('/addregister',verifyToken,async (req,res) => {
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
		var newRegister = await Registers.create({
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
			IsOperator		
		},{
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator']
		});
		if(newRegister){
			var promise = req.body.students.map(async function(student){
				return new Promise(async function(resolve,resject){
					try{
						var newSubRegisters = await SubRegisters.create({
							RegisterId: newRegister.Id,
							ClientId: student.clientid,
							FullName: student.name,
							Pass: student.attendence,
							Homework: student.attendence?student.homework:-1,
							Test: student.attendence?student.test:-1,
							Lesson: student.attendence?student.lesson:-1,
							Comment: student.attendence?student.comment:-1,
							Status: student.status
						},{
							fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status']
						});
						if(newSubRegisters){
							resolve(true);
						} else {
							resolve(false);
						}
					}catch(err){
						console.log(err);
					}
				});
			});
			var responses = await Promise.all(promise);
			var ok = responses.every(elem => elem == true);
			if(ok){
				res.json({
					result: 'ok'
				});
			}
		}
	}catch(error){
		console.log(error);
		res.json(error);
	}
});

router.post('/addstudentexample', (req, res) => {
	var params = "statuses="+encodeURIComponent('АДАПТАЦИОННЫЙ ПЕРИОД,Занимается,Заморозка,Регистрация,Онлайн обучение');
	api.get('aiplus','GetStudents',params,'VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w')
	.then((data) => {
        data.map(async function(record){
			try{
				var newStudent = await Students.create({
					StudentId: record.Id,
					ClientId: record.ClientId,
					FirstName: record.FirstName,
					LastName: record.LastName,
					MiddleName: record.MiddleName 
				},{
					fields: ['StudentId','ClientId','FirstName','LastName','MiddleName']
				});
				console.log(newStudent);
			}catch(error){
				console.log(error);
			}
        });
        res.send("ok");
    });
});

router.post('/getauthkey',(req,res) => {
	var params = new Object();
	params.login = "0.sd.amocrm@gmail.com";
	params.password = "n6J}P,hx4QX{28kg";
	api.post(key.domain,'GetMemberAuthKey',params,key.apikey)
	.then((data) => {
		console.log(data);
    	res.send(data.data);
	})
	.catch(err =>{
        res.send({status: 500, error:  err});
    });
});

router.post('/sendpersonalmessage',(req,res) => {
	var text = '';
	if(req.body.group.change){
		text+='Была замена : \n Заменяющий преподаватель: ' + req.body.teacherName + '\nЗаменяемый преподаватель: ' + req.body.group.teacher + '\n Дата замены: '+ req.body.group.date +'\nгруппа: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n\n';
	}

	if(req.body.group.isOperator){
		req.body.students.map(student => {
			if(student.status && student.clientid == -1){
				text += 'Найти и добавить ученика в группу\n Ученик: ' + student.name + ' в группу: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n';
				text += 'Аттендансе студента :\nФИО : ' + student.name + '\nД/з: ' + student.homework + '\nСрез: ' + student.test+'\nРанг: ' + student.lesson+'\nКомментарии: ' + student.comment+'\n\n\n';
			}
			if(student.status && student.clientid != -1){
				text += 'Добавить Ученика: ' + student.name + ' в группу: Id: '+ req.body.group.Id + '\nГруппа: '+ req.body.group.name+'\nПреподаватель: '+req.body.group.teacher+'\nВремя: ' + req.body.group.time + '\nДни: '+ req.body.group.days+ '\n\n';
				text += 'Аттендансе студента :\nФИО : ' + student.name + '\nД/з: ' + student.homework + '\nСрез: ' + student.test+'\nРанг: ' + student.lesson+'\nКомментарии: ' + student.comment+'\n\n\n';
			}
		});
	}
	var params = new Object();
	//params.authkey = 'VdqvXSXu/q1DWiLefLBUiugWL5fYnx5b394FJv4TGTPagu2dyu00brliDcg6C6/Z';

	params.collocutorId = 11358;
	params.text = text;
	api.post('aiplus','AddPersonalMessage',params,'VdqvXSXu/q1DWiLefLBUiugWL5fYnx5b394FJv4TGTPagu2dyu00brliDcg6C6/Z')
	.then((data) => {
		console.log(data.data);
		res.send(data);
	})
	.catch(err =>{
        res.send({status: 500, error:  err});
    });
});

router.post('/addteacherexample', (req, res) => {
   api.get('aiplus','GetTeachers','','VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w')
   .then((data) => {
        data.map(async function(record){
				try{
					if(record.Status == 'Работает'){
						try{
							var newContact = await Contacts.create({
								Mobile: record.Mobile,
								Email: record.EMail
							},{
								fields:['Mobile','Email']
							});
							if(newContact){
								try{
									var email = record.EMail != undefined ? record.EMail : '';
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
			res.send(true);
		else
			res.send(false);
	}catch(error){
		res.send(`Ошибка : ${error}`);
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
				subject : 'Замена преподавателя',
				text: 'Никому не говорите : ' + code
			}
			console.log(mailOptions);
			sendMail(mailOptions);
			
			res.send({status: true, code: code});
		} else {
			res.send({status: false});
		}
	}catch(error){
		console.log(error);
	}
});

router.get('/searchteacher',verifyToken, async (req, res) => {
	try{
		var val = '%'+req.query.value+'%'
		var query = `SELECT concat("LastName",' ',"FirstName") as "FullName"
		FROM "Teachers" WHERE "FirstName" like :val OR "LastName" like :val;`;
		var teachers = await sequelize.query(query,{
			replacements:{val: val},
			type: QueryTypes.SELECT
		});
		res.send(teachers);
	}catch(error){
		console.log(error);
        res.send("error: " + error);
	}
});

router.get('/searchstudent',verifyToken, async (req, res) => {
	try{
		var val = '%'+req.query.value+'%'
		var query = `SELECT "ClientId",concat("LastName",' ',"FirstName",' ',"MiddleName") as "FullName"
		FROM "Students" WHERE "FirstName" like :val OR "LastName" like :val OR "MiddleName" like :val;`;
		var students = await sequelize.query(query,{
			replacements:{val: val},
			type: QueryTypes.SELECT
		});
		res.send(students);
	}catch(error){
		console.log(error);
        res.send("error: " + error);
	}
});

router.get('/subteacher',verifyToken, async (req, res) => {
	try{
		var fullname = req.query.FullName.split(' ');
		var LastName = fullname[0];
		var FirstName = fullname[1];

		var teacher = await Teachers.findAll({
			attributes: ['TeacherId',[sequelize.fn("concat",sequelize.col("LastName")," ",sequelize.col("FirstName")),"FullName"]],
			where:{
				LastName,
				FirstName
			}
		});
		if(teacher.length == 1)
			res.send(teacher[0]);
		else
			res.send([]);
	}catch(error){
		console.log(error);
        res.send("error: " + error);

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
		
		res.send(registers);
	}catch(error){
		console.log(error);
		res.send(`Ошибка : ${error}`);
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

		res.send(subregisters);
	}catch(error){
		console.log(error);
		res.send(`Ошибка : ${error}`);
	}
});


router.get('/getuniqueregister',verifyToken,async (req, res) => {
	try{
		const query = `SELECT DISTINCT "GroupId", "GroupName", "Time", "WeekDays", concat("FirstName",' ',"LastName") as Teacher
		FROM "Registers" as registers
		LEFT JOIN "Teachers" as teachers
		ON registers."TeacherId" = teachers."TeacherId";`
		var registers = await sequelize.query(query,{type: QueryTypes.SELECT});
		
		res.send(registers);
	}catch(error){
		console.log(error);
		res.send(`Ошибка : ${error}`);
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
		
		res.send(subregisters);
	}catch(error){
		console.log(error);
		res.send(`Ошибка : ${error}`);
	}
});

module.exports = router;