"use strict";

var _this = void 0;

var express = require('express');

var router = express.Router();

var handlers = require('../api/handlers');

var api = require('../api/api');

var query = require('../database/query');

var Queue = require('./queue');

var bcrypt = require('bcrypt');

var passport = require('passport');

var generateKey = require('../config/generateKeys');

var jwt = require('jsonwebtoken');

var verifyToken = require('./verifyToken');

var key = {
  "domain": "aiplus",
  "apikey": "VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w"
};

function Weekdays(num) {
  var weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var binary = num.toString(2);
  var binary = binary.split("").reverse().join("");
  var idx = binary.indexOf(1);
  var days = [];

  while (idx != -1) {
    days.push(weekdays[idx]);
    idx = binary.indexOf(1, idx + 1);
  }

  return days.join(',');
}

function Weekday(date) {
  var weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  var day = new Date(date);
  return weekdays[day.getDay()];
} //Get Offices


router.get('/offices', verifyToken, function (req, res) {
  api.get(_this.key.domain, 'GetOffices', '', _this.key.apikey).then(function (data) {
    res.json(data);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
}); //Get Teachers

router.post('/teachers', verifyToken, function (req, res) {
  var params = 'id=' + req.body.teacherId;
  api.get(key.domain, 'GetTeachers', params, key.apikey).then(function (data) {
    res.json(data);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
});
router.post('/login', function _callee(req, res) {
  var remember;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          remember = req.body.remember;
          passport.authenticate('local', function (err, user, info) {
            if (err) res.send({
              status: 400,
              err: err
            });else if (user) {
              var exipersIn = '';
              if (remember) exipersIn = "30 days";else exipersIn = "2h";
              var token = jwt.sign({
                _id: user.teacherId
              }, user.authkey, {
                expiresIn: exipersIn
              });
              res.set('ACCESSTOKEN', token);
              res.set('AUTHTOKEN', user.authkey);
              res.send({
                status: 200,
                teacherId: user.teacherId,
                authtoken: user.authkey,
                accesstoken: token
              });
            } else res.send({
              status: 404,
              message: info.message
            });
          })(req, res);

        case 2:
        case "end":
          return _context.stop();
      }
    }
  });
}); //Get Groups

router.post('/groups', verifyToken, function (req, res) {
  var params = 'types=Group&timeFrom=' + req.body.params.timeFrom + '&timeTo=' + req.body.params.timeTo + '&statuses=Working&officeOrCompanyId=' + req.body.params.officeId + '&teacherId=' + req.body.teacherId;
  var date = Weekday(req.body.params.date);
  api.get(key.domain, 'GetEdUnits', params, key.apikey).then(function (data) {
    if (data.length > 0) {
      var group = new Object();
      var found = false;
      var index = 0;
      data.map(function (groups, ind) {
        if (groups.ScheduleItems[0].BeginTime == req.body.params.timeFrom && groups.ScheduleItems[0].EndTime == req.body.params.timeTo) {
          var weekdays = Weekdays(groups.ScheduleItems[0].Weekdays);

          if (weekdays.includes(date)) {
            found = true;
            index = ind;
          }
        }
      });

      if (found) {
        group.Id = data[index].Id;
        group.name = data[index].Name;
        group.teacher = data[index].ScheduleItems[0].Teacher;
        group.time = data[index].ScheduleItems[0].BeginTime + '-' + data[index].ScheduleItems[0].EndTime;
        group.days = Weekdays(data[index].ScheduleItems[0].Weekdays);
        group.weekdays = data[index].ScheduleItems[0].Weekdays;
        res.json({
          group: group,
          status: true
        });
      } else {
        res.json({
          status: false
        });
      }
    }
  })["catch"](function (err) {
    res.send("error: " + err);
  });
}); //Get Student in Group

router.post('/groupstudents', verifyToken, function (req, res) {
  var params = 'edUnitId=' + req.body.groupId;
  api.get(key.domain, 'GetEdUnitStudents', params, key.apikey).then(function (data) {
    var students = new Array();
    data.map(function (student) {
      if (student.StudyUnits == undefined && student.BeginDate < req.body.date) {
        var obj = new Object();
        obj.clientid = student.StudentClientId;
        obj.name = student.StudentName;
        obj.status = false;
        obj.attendence = false;
        students.push(obj);
      }
    });
    return res.send(students);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
}); //Get Student

router.get('/student', verifyToken, function (req, res) {
  var params = 'term=' + encodeURIComponent(req.query.value);
  api.get(key.domain, 'GetStudents', params, key.apikey).then(function (data) {
    res.json(data.length > 0 ? data[0].ClientId : null);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
}); //Add student passes

router.post('/setpasses', verifyToken, function (req, res) {
  var data = req.body.date;
  var groupId = req.body.groupId;
  var students = req.body.students;
  var params = new Array();
  students.map(function (student) {
    if (student.clientId != -1) {
      var st = new Object();
      st.Date = data;
      st.EdUnitId = groupId;
      st.StudentClientId = student.clientid;
      st.Pass = !student.attendence;
      st.Payable = false;
      params.push(st);
    }
  });
  api.post(key.domain, 'SetStudentPasses', params, key.apikey).then(function (response) {
    res.send({
      status: response.status,
      statusText: response.statusText
    });
  })["catch"](function (err) {
    res.send("error: " + err);
  });
}); //add attendence test

router.post('/setattendence', verifyToken, function (req, res) {
  var date = req.body.date;
  var groupId = req.body.groupId;
  var students = req.body.students;
  var queue = new Queue();

  try {
    students.map(function (student) {
      if (student.attendence && student.clientId != -1) {
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
        skill = new Object();
        skill.skillId = 39; // Комментарий

        skill.score = 30;
        skills.push(skill);
        data.skills = skills;
        data.commentHtml = student.comment;
        queue.add(data);
      }
    });
    res.send({
      status: true
    });
  } catch (_unused) {
    res.send({
      status: false
    });
  }
});
router.post('/addtogroup', verifyToken, function (req, res) {
  var params = new Object();
  params.edUnitId = req.body.group.Id;
  params.studentClientId = req.body.clientId;
  params.begin = req.body.group.date;
  params.weekdays = req.body.group.weekdays;
  params.status = 'Normal';
  api.post(key.domain, 'AddEdUnitStudent', params, key.apikey).then(function (status) {
    if (status.status == 200 && status.statusText == 'OK') res.send({
      status: 200,
      message: 'OK'
    });
  })["catch"](function (err) {
    res.send({
      status: 500,
      error: err
    });
  });
});
router.post('/addregister', verifyToken, function (req, res) {
  var register = new Object();
  register.teacherId = req.body.teacherId;
  register.groupId = req.body.group.Id;
  register.groupName = req.body.group.name;
  register.time = req.body.group.time;
  register.lessonDate = req.body.group.date;
  register.weekDays = req.body.group.days;
  register.submitDay = req.body.submitDay;
  register.submitTime = req.body.submitTime;
  register.isSubmitted = req.body.isSubmitted;
  register.isStudentAdd = req.body.group.isStudentAdd ? req.body.group.isStudentAdd : false;
  register.isOperator = req.body.group.isOperator ? req.body.group.isOperator : false;
  var students = req.body.students;
  query.AddRegister(register, students);
});
router.post('/addstudentexample', verifyToken, function (req, res) {
  var params = "statuses=" + encodeURIComponent('АДАПТАЦИОННЫЙ ПЕРИОД,Занимается,Заморозка,Регистрация');
  api.get('aiplus', 'GetStudents', params, 'VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w').then(function (data) {
    data.map(function (record) {
      var st = new Object();
      st.studentId = record.Id;
      st.clientId = record.ClientId;
      st.fullName = record.LastName + ' ' + record.FirstName;
      st.klass = '';
      st.branch = '';

      if (record.ExtraFields != undefined) {
        record.ExtraFields.map(function (field) {
          if (field.Name == 'КЛАСС') {
            st.klass = field.Value;
          }

          if (field.Name == 'Отделение') {
            st.branch = field.Value;
          }
        });
      }

      query.AddStudent(st);
    });
    res.send("ok");
  });
});
router.post('/getauthkey', function (req, res) {
  var params = new Object();
  params.login = "0.sd.amocrm@gmail.com";
  params.password = "n6J}P,hx4QX{28kg";
  api.post(key.domain, 'GetMemberAuthKey', params, key.apikey).then(function (data) {
    console.log(data);
    res.send(data.data);
  })["catch"](function (err) {
    res.send({
      status: 500,
      error: err
    });
  });
});
router.post('/sendpersonalmessage', function (req, res) {
  var text = '';

  if (req.body.group.change) {
    text += 'Была замена : \n Заменяющий преподаватель: ' + req.body.teacherName + '\nЗаменяемый преподаватель: ' + req.body.group.teacher + '\n Дата замены: ' + req.body.group.date + '\nгруппа: Id: ' + req.body.group.Id + '\nГруппа: ' + req.body.group.name + '\nПреподаватель: ' + req.body.group.teacher + '\nВремя: ' + req.body.group.time + '\nДни: ' + req.body.group.days + '\n\n\n';
  }

  if (req.body.group.isOperator) {
    req.body.students.map(function (student) {
      if (student.status && student.clientid == -1) {
        text += 'Найти и добавить ученика в группу\n Ученик: ' + student.name + ' в группу: Id: ' + req.body.group.Id + '\nГруппа: ' + req.body.group.name + '\nПреподаватель: ' + req.body.group.teacher + '\nВремя: ' + req.body.group.time + '\nДни: ' + req.body.group.days + '\n\n';
        text += 'Аттендансе студента :\nФИО : ' + student.name + '\nД/з: ' + student.homework + '\nСрез: ' + student.test + '\nРанг: ' + student.lesson + '\nКомментарии: ' + student.comment + '\n\n\n';
      }

      if (student.status && student.clientid != -1) {
        text += 'Добавить Ученика: ' + student.name + ' в группу: Id: ' + req.body.group.Id + '\nГруппа: ' + req.body.group.name + '\nПреподаватель: ' + req.body.group.teacher + '\nВремя: ' + req.body.group.time + '\nДни: ' + req.body.group.days + '\n\n';
        text += 'Аттендансе студента :\nФИО : ' + student.name + '\nД/з: ' + student.homework + '\nСрез: ' + student.test + '\nРанг: ' + student.lesson + '\nКомментарии: ' + student.comment + '\n\n\n';
      }
    });
  }

  var params = new Object(); //params.authkey = 'VdqvXSXu/q1DWiLefLBUiugWL5fYnx5b394FJv4TGTPagu2dyu00brliDcg6C6/Z';

  params.collocutorId = 11358;
  params.text = text;
  api.post('aiplus', 'AddPersonalMessage', params, 'VdqvXSXu/q1DWiLefLBUiugWL5fYnx5b394FJv4TGTPagu2dyu00brliDcg6C6/Z').then(function (data) {
    console.log(data.data);
    res.send(data);
  })["catch"](function (err) {
    res.send({
      status: 500,
      error: err
    });
  });
});
router.post('/addteacherexample', function (req, res) {
  api.get('aiplus', 'GetTeachers', '', 'VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w').then(function (data) {
    data.map(function _callee2(record) {
      var tch, teacherId;
      return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;

              if (!(record.Status == 'Работает')) {
                _context2.next = 13;
                break;
              }

              tch = new Object();
              tch.teacherId = record.Id;
              tch.fullName = record.LastName + ' ' + record.FirstName;
              tch.subject = 'не известно';
              tch.email = record.EMail != undefined ? record.EMail : '';
              _context2.next = 9;
              return regeneratorRuntime.awrap(bcrypt.hash('123456', 10));

            case 9:
              tch.password = _context2.sent;
              tch.authkey = generateKey();
              teacherId = query.AddTeacher(tch);
              console.log(teacherId);

            case 13:
              _context2.next = 18;
              break;

            case 15:
              _context2.prev = 15;
              _context2.t0 = _context2["catch"](0);
              console.log(_context2.t0);

            case 18:
            case "end":
              return _context2.stop();
          }
        }
      }, null, null, [[0, 15]]);
    });
    res.send("ok");
  });
});
router.post('/registeramount', verifyToken, function (req, res) {
  query.GetRegisterAmount(req.body.groupId, req.body.lessonDate).then(function (col) {
    if (col == 0) {
      res.send(true);
    } else {
      res.send(false);
    }
  })["catch"](function (err) {
    res.send("error: " + err);
  });
});
router.get('/searchteacher', verifyToken, function (req, res) {
  query.SearchTeacher(req.query.value).then(function (results) {
    res.send(results);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
});
router.get('/teacher/:teacherId', verifyToken, function (req, res) {
  query.GetTeacherByTeacherId(req.params.teacherId).then(function (results) {
    res.send(results);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
});
router.get('/getregister', verifyToken, function (req, res) {
  query.GetRegister(req.query.teacherId, req.query.date + '*').then(function (results) {
    res.send(results);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
});
router.get('/getregisterdetails', verifyToken, function (req, res) {
  console.log(req.query.registerId);
  query.GetRegisterDetails(req.query.registerId).then(function (results) {
    res.send(results);
  })["catch"](function (err) {
    res.send("error: " + err);
  });
});
module.exports = router;