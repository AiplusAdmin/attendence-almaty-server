const cron = require('node-cron');
const Registers = require('../modules/Registers');
const Subregisters = require('../modules/SubRegisters');
const api = require('../api/api');
const Promise = require('bluebird');

const key = {
    "domain":"aiplus",
    "apikey":"VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w"
};

var crontohh = cron.schedule('*/2 * * * *',async () => {
	try{
		var registers = await Registers.findAll({
			fields:['Id','TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
			where:{
				IsSubmitted: false
			}
		});
		console.log(registers.length);
		await registers.reduce(async function(previousPromise,register){
			await previousPromise;
			return new Promise(async function(resolve,reject){
				try{
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
						st.Pass = subregister.Pass;
						st.Payable = false;
						params.push(st);
					});

					var response = await api.post(key.domain,'SetStudentPasses',params,key.apikey);
					if(response.status == 200){
						if(subregisters.length > 0){
							var responses = [];
							await subregisters.reduce(async function(previousStudentPromise,student){
								var res = await previousStudentPromise;
								responses.push(res);
								return new Promise(async function(resolve,reject){
									if(!student.Status && student.Pass){
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
								});
							},Promise.resolve(true));
							console.log(responses);
							var result = responses.every(elem => elem == true);
							if(result){
								await register.update({
									IsSubmitted: true
								});
							}
						} else {
							await register.update({
								IsSubmitted: true
							});
						}
					}
				}catch(err){
					console.log(err);
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