const express = require('express');
const router = express.Router();

const Students = require('../modules/Students');
//add
router.post('/', async (req,res) => {
	var { StudentId,ClientId,FirstName,LastName,MiddleName,Class} = req.body;
	try{
		var newStudent = await Students.create({
			StudentId,
			ClientId,
			FirstName,
			LastName,
			MiddleName,
			Class
		},{
			fields: ['StudentId','ClientId','FirstName','LastName','MiddleName','Class']
		});
		if(newStudent){
			res.json({
				result: 'ok',
				data: newStudent
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового Ученика провалено'
			});
		}
	} catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового Ученика провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { FirstName,LastName,MiddleName,Class} = req.body;
	try{
		var student = await Students.findOne({
			attributes: ['Id','FirstName','LastName','MiddleName','Class'],
			where: {
				Id
			}
		});
		if(student){
			await student.update({
				FirstName: FirstName ? FirstName : student.FirstName,
				LastName: LastName ? LastName : student.LastName,
				MiddleName: MiddleName ? MiddleName : student.MiddleName,
				Class: Class ? Class : student.Class
			});

			res.json({
				result: 'ok',
				data: student,
				message: "Обновление ученика прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление ученика провалено"
			});
		} 
	}catch(error){
		console.log(error);
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление ученика провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Students.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление ученика успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление ученика провалено. Ошибка: ${error}`
		});
	}
});

//delete
router.delete('/', async (req,res) => {
	try{
		var students = await Students.findAll({
			attributes: ["Id"]
		});
		students.map(async function(student){
			await Students.destroy({
				where: {
					Id: student.Id
				}
			});
		});
		res.json({
			result: 'ok',
			message: 'Удаление ученика успешно',
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление ученика провалено. Ошибка: ${error}`
		});
	}
});
//query all data
router.get('/', async (req,res) => {
	try{
		var students = await Students.findAll({
			attributes: ['Id','StudentId','ClientId','FirstName','LastName','MiddleName','Class']
		});
		
		res.json({
			result: 'ok',
			data: students,
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