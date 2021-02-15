const express = require('express');
const router = express.Router();

const Registers = require('../modules/Registers');

//add
router.post('/', async (req,res) => {
	var { TeacherId, GroupId, GroupName, Time, LessonDate, WeekDays, SubmitDay, SubmitTime, IsSubmitted, IsStudentAdd, IsOperator,SchoolId } = req.body;
	try{
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
			IsOperator,
			SchoolId
		},{
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId']
		});
		if(newRegister){
			res.json({
				result: 'ok',
				data: newRegister
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавление Регистра провалено.'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавление Регистра провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { TeacherId, GroupId, GroupName, Time, LessonDate, WeekDays, SubmitDay, SubmitTime, IsSubmitted, IsStudentAdd, IsOperator,SchoolId,Fine } = req.body;
	try{
		var registers = await Registers.findAll({
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator','SchoolId','Fine'],
			where: {
				Id
			}
		});
		if(registers.length > 0){
			registers.map(async (register) =>{
				await register.update({
					TeacherId: TeacherId ? TeacherId : register.TeacherId,
					GroupId: GroupId ? GroupId : register.GroupId,
					GroupName: GroupName ? GroupName : register.GroupName,
					Time: Time ? Time : register.Time,
					LessonDate: LessonDate ? LessonDate : register.LessonDate,
					WeekDays: WeekDays ? WeekDays : register.WeekDays,
					SubmitDay: SubmitDay ? SubmitDay : register.SubmitDay,
					SubmitTime: SubmitTime ? SubmitTime : register.SubmitTime,
					IsSubmitted: IsSubmitted ? IsSubmitted : register.IsSubmitted,
					IsStudentAdd: IsStudentAdd ? IsStudentAdd : register.IsStudentAdd,
					IsOperator: IsOperator ? IsOperator : register.IsOperator,
					SchoolId: SchoolId ? SchoolId : register.SchoolId,
					Fine: Fine ? Fine: register.Fine 
				});	
			});
			res.json({
				result: 'ok',
				data: registers,
				message: "Обновление Регистров прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление Регистров провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление Регистров провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Registers.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление Регистров успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление Регистров провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const registers = await Registers.findAll({
			fields:['TeacherId','GroupId','GroupName','Time','LessonDate','WeekDays','SubmitDay','SubmitTime','IsSubmitted','IsStudentAdd','IsOperator'],
		});
		res.json({
			result: 'ok',
			data: registers,
			message: 'Выгрузка всех данных успешно'
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: [],
			message: `Выгрузка всех данных провалено. Ошибка : ${error}`
		});
	}
});

module.exports = router;