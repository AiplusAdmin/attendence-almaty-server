const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const Teachers = require('../modules/Teachers');
const Contacts = require('../modules/Contacts');
const generateKey = require('../scripts/generateKeys');
//add
router.post('/', async (req,res) => {
	var { TeacherId,FirstName,LastName,MiddleName,ContactId,Email,password,RoleId} = req.body;
	try{
		var Password = await bcrypt.hash(password,10);
		var AUTH = generateKey();
		var newTeacher = await Teachers.create({
			TeacherId,
			FirstName,
			LastName,
			MiddleName,
			ContactId,
			Email,
			Password,
			AUTH,
			RoleId
		},{
			fields: ['TeacherId','FirstName','LastName','MiddleName','ContactId','Email','Password','AUTH','RoleId']
		});
		if(newTeacher){
			res.json({
				result: 'ok',
				data: newTeacher
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового Преподавателя провалено'
			});
		}
	} catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового Преподавателя провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { FirstName,LastName,MiddleName,ContactId,Email} = req.body;
	try{
		var teachers = await Teachers.findAll({
			attributes: ['Id','FirstName','LastName','MiddleName','ContactId','Email'],
			where: {
				Id
			}
		});
		if(teachers.length > 0){
			teachers.map(async (teacher) =>{
				await teacher.update({
					FirstName: FirstName ? FirstName : teacher.FirstName,
					LastName: LastName ? LastName : teacher.LastName,
					MiddleName: MiddleName ? MiddleName : teacher.MiddleName,
					ContactId: ContactId ? ContactId : teacher.ContactId,
					Email: Email ? Email : teacher.Email
				});	
			});
			res.json({
				result: 'ok',
				data: teachers,
				message: "Обновление Преподователя прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление Преподователя провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление Преподователя провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Teachers.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление Препродавтеля успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление Препродавтеля провалено. Ошибка: ${error}`
		});
	}
});

//delete
router.delete('/', async (req,res) => {
	const { id } = req.params;
	try{
		var teachers = await Teachers.findAll({
			attributes: ["Id", "ContactId"]
		});
		teachers.map(async function(teacher){
			await Teachers.destroy({
				where: {
					Id: teacher.Id
				}
			});
			await Contacts.destroy({
				where: {
					Id: teacher.ContactId
				}
			});
		});
		res.json({
			result: 'ok',
			message: 'Удаление Препродавтеля успешно',
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление Препродавтеля провалено. Ошибка: ${error}`
		});
	}
});
//query all data
router.get('/', async (req,res) => {
	try{
		const teachers = await Teachers.findAll({
			attributes: ['Id','FirstName','LastName','MiddleName','ContactId','Email'],
		});
		res.json({
			result: 'ok',
			data: teachers,
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