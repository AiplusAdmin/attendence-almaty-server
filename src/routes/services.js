var express = require('express');
var router = express.Router();
var handlers = require('../api/handlers');
var api = require('../api/api');
var query = require('../database/query');
var Queue = require('./queue');
var passport = require('passport');
var initializePassport = require('../config/passport-config');

var key = {
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
router.get('/offices', (req, res) => {
    api.get(this.key.domain,'GetOffices','',this.key.apikey)
        .then((data) => {
            res.json(data);
        })
        .catch(err =>{
            res.send("error: " + err);
        });
});

//Get Teachers
router.post('/teachers', (req, res) => {
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
	var result = await query.GetTeacherByEmail(req.body.email);
	if(result){
		if(result.password == req.body.password){
			res.send({status: true, message: '', teacherId: result.teacherId});
		} else {
			res.send({status: false, message: 'Пароль не правильный'});
		}
	} else {
		res.send({status: false, message: 'Такой учетной записи нет'});
	}
})

//Get Groups
router.post('/groups', (req, res) => {
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
router.post('/groupstudents', (req, res) => {
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
router.get('/student', (req,res) => {
    var params = 'term='+encodeURIComponent(req.query.value);
    api.get(key.domain,'GetStudents',params,key.apikey)
        .then((data) => {
            res.json(data.length > 0 ? data[0].ClientId:null);
        })
        .catch(err =>{
            res.send("error: " + err);
        })
});

//Add student passes
router.post('/setpasses', (req, res) => {
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
    api.post(key,'SetStudentPasses',params)
    .then((response) => {
        res.send({status:response.status, statusText: response.statusText});
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

//add attendence test
router.post('/setattendence', (req, res) => {
    var date = req.body.date;
    var groupId = req.body.groupId;
    var students = req.body.students;
    var queue = new Queue();
    students.map(function(student){
        if(student.attendence && student.clientId != -1){
            var data = new Object();
            data.edUnitId = groupId;
            data.studentClientId = student.clientid;
            data.date = date;
            data.testTypeId = 290;
            var skills = new Array();
            var skill = new Object();
            skill.skillId = 29;
            skill.score = student.homework;
            skills.push(skill);
            skill = new Object();
            skill.skillId = 33;
            skill.score = student.test;
            skills.push(skill);
            skill = new Object();
            skill.skillId = 34;
            skill.score = student.point;
            skills.push(skill);
            skill = new Object();
            skill.skillId = 39;
            skill.score = 30;
            skills.push(skill);
            data.skills = skills;
            data.commentHtml = student.comment;
            queue.add(data);
        }
    });
});

router.post('/addtogroup', (req, res) => {
	var params = new Object();
	console.log(req);
    params.edUnitId = req.body.group.Id;
    params.studentClientId = req.body.clientId;
    params.begin = req.body.group.date;
    params.weekdays = req.body.group.weekdays;
    params.status = 'Normal';
    api.post(key,'AddEdUnitStudent',params)
    .then((status) => {
        res.sendStatus(status);
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

router.post('/addregister',(req,res) => {
    var register = new Object();
    register.teacherId = req.body.params.teacherId;
    register.groupId = req.body.params.group.id;
    register.groupName = req.body.params.group.name;
    register.time = req.body.params.group.time;
    register.lessonDate = req.body.params.lessonDate;
    register.weekDays = req.body.params.group.days;
    register.submitDay = req.body.params.submitDay;
    register.submitTime = req.body.params.submitTime;
    register.isSubmitted = req.body.params.isSubmitted;
    register.isStudentAdd = req.body.params.isStudentAdd;
    register.isOperator = req.body.params.isOperator;
    var students = req.body.params.students;
    query.AddRegister(register,students);
});

router.post('/addstudentexample', (req, res) => {
    var params = "statuses="+encodeURIComponent('АДАПТАЦИОННЫЙ ПЕРИОД,Занимается,Заморозка,Регистрация');
   api.get('aiplus','GetStudents',params,'VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w')
   .then((data) => {
        data.map(function(record){
            var st = new Object();
            st.studentId = record.Id;
            st.clientId = record.ClientId;
            st.fullName = record.LastName + ' ' + record.FirstName;
            st.klass = '';
            st.branch = '';
            if(record.ExtraFields !=  undefined){
                record.ExtraFields.map(function(field){
                    if(field.Name == 'КЛАСС'){
                        st.klass = field.Value;
                    }
                    if(field.Name == 'Отделение'){
                        st.branch = field.Value;
                    }
                });
            }
            query.AddStudent(st);
        });
        res.send("ok");
    });
});

router.post('/addteacherexample', (req, res) => {
   api.get('aiplus','GetTeachers','','VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w')
   .then((data) => {
        data.map(function(record){
            if(record.Status == 'Работает'){
            var tch = new Object();
            tch.teacherId = record.Id;
            tch.fullName = record.LastName + ' ' + record.FirstName;
            tch.subject = 'не известно';
            tch.email = record.EMail != undefined ? record.EMail : '';
            tch.password = '123456';
            query.AddTeacher(tch);
            }
        });
        res.send("ok");
    });
});

router.post('/registeramount', (req,res) => {
    query.GetRegisterAmount(req.body.teacherId, req.body.groupId,req.body.lessonDate)
    .then((col) => {
        if(col == 0){
            res.send(true);
        }else{
            res.send(false);
        }
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});


router.get('/searchteacher', (req, res) => {
    query.SearchTeacher(req.query.value)
    .then((results) => {
        res.send(results);
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

router.get('/teacher/:teacherId', (req, res) => {
    query.GetTeacherByTeacherId(req.params.teacherId)
    .then((results) => {
        res.send(results);
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

router.get('/getregister', (req, res) => {
    query.GetRegister(req.query.teacherId)
    .then((results) => {
        res.send(results);
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

router.get('/getregisterdetails', (req, res) => {
    query.GetRegisterDetails(req.query.registerId)
    .then((results) => {
        res.send(results);
    })
    .catch(err =>{
        res.send("error: " + err);
    });
});

module.exports = router;