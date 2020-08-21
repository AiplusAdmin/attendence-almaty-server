const connection = require('./connection');
const Promise = require('bluebird');
const bcrypt = require('bcrypt');

function AddStudent(student){
    connection.insert('student',{
        studentId: student.studentId,
        clientId: student.clientId,
        fullName: student.fullName,
        branch: student.branch,
        klass: student.klass
    },function(err,id){
        console.log(id);
    });
}

function AddTeacher(teacher){
    connection.insert('teacher',{
        teacherId: teacher.teacherId,
        fullName: teacher.fullName,
        subject: teacher.subject,
        email: teacher.email,
		password: teacher.password,
		authkey: teacher.authkey
    },function(err,id){
		if(err)
			console.log(err);
		else
			return id;
	});
}

function AddRegister(register,students){
    connection.insert('register',{
        teacherId: register.teacherId,
        groupId: register.groupId,
        groupName: register.groupName,
        time: register.time,
        lessonDate: register.lessonDate,
        weekDays: register.weekDays,
        submitDay: register.submitDay,
        submitTime: register.submitTime,
        isSubmitted: register.isSubmitted,
        isStudentAdd: register.isStudentAdd,
        isOperator: register.isOperator
    }, function(err,id){
        if(err){
            console.log("Error",err);
        } else {
            students.map(function(student){
                if(student.attendence){
                    connection.insert('subsidiary_register',{
                        registerId: id,
                        clientId: student.clientid,
                        fullName: student.name,
                        pass: student.attendence,
                        homework: student.attendence?student.homework:-1,
                        test: student.attendence?student.test:-1,
                        lesson: student.attendence?student.lesson:-1,
                        point: student.attendence?student.point:-1,
                        comment: student.attendence?student.comment:-1,
                        status: student.status
                    }, function(err,value){
                        if(err){
                            console.log("Error",err);
                        }else {
                            console.log(value);
                        }
                    });
                }
            });
        }
    });
}

function GetRegisterAmount(teacherId,groupId,lessonDate){
    return new Promise((resolve,reject) => {
        connection.queryValue("SELECT count(*) FROM register WHERE teacherId = ? AND groupId = ? AND lessonDate=?",[teacherId,groupId,lessonDate],
        function(err,amount){
                if(err){
                    console.log ('Error: ',err);
                    reject(err);
                } else {
                    resolve(amount);
                }
        });
    });
}

function GetRegister(teacherId){
    return new Promise((resolve,reject) => {
        connection.select('register','*',{teacherId: teacherId}, function(err, results){
            if(err){
                console.log('Error',err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

function GetRegisterDetails(registerId){
    return new Promise((resolve,reject) => {
        connection.select('subsidiary_register','*',{registerId: registerId}, function(err, results){
            if(err){
                console.log('Error',err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

function SearchTeacher(str){
    return new Promise((resolve,reject) => {
        connection.select('teacher','fullName,teacherId',{fullName: str},function(err,results){
            if(err){
                console.log('Error',err);
                reject(err);
            }else{
                resolve(results);
            }
        });
    });
}

function GetTeacherByTeacherId(teacherId){
    return new Promise((resolve,reject) => {
        connection.select('teacher','fullName,teacherId',{teacherId: teacherId},function(err,results){
            if(err){
                console.log('Error',err);
                reject(err);
            }else{
                resolve(results);
            }
        });
    });
}

function GetTeacher(email, password){
    return new Promise((resolve, reject) => {
        connection.select('teacher','teacherId',{email:email, password: password},function(err, results){
            if(err){
                console.log('Error',err);
                reject(err);
            }else{
                resolve(results);
            }
        });
    });
}

function GetTeacherByEmail(email){
    return new Promise((resolve, reject) => {
        connection.queryRow('SELECT teacherId,password,authkey FROM teacher WHERE email=?',[email],function(err, results){
            if(err){
                console.log('Error',err);
                reject(err);
            }else{
                resolve(results);
            }
        });
    });
}

async function verifyPassword(password,userPassword){
	
	return await bcrypt.compare(password,userPassword);
}

module.exports = {
    AddStudent,
    AddTeacher,
    GetRegisterAmount,
    AddRegister,
    SearchTeacher,
    GetRegister,
    GetRegisterDetails,
    GetTeacher,
	GetTeacherByEmail,
	GetTeacherByTeacherId,
	verifyPassword
}