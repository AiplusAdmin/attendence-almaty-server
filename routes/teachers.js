const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { QueryTypes } = require('sequelize');

const Teachers = require('../modules/Teachers');
const Contacts = require('../modules/Contacts');
const sequelize = require('../databases/index').sequelize;
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
	const { FirstName,LastName,MiddleName,ContactId,Email,Mobile, Phone, Mail, Address} = req.body;
	try{
		var teacher = await Teachers.findOne({
			attributes: ['Id','FirstName','LastName','MiddleName','Email'],
			where: {
				Id
			}
		});
		if(teacher){
			await teacher.update({
				FirstName: FirstName ? FirstName : teacher.FirstName,
				LastName: LastName ? LastName : teacher.LastName,
				MiddleName: MiddleName ? MiddleName : teacher.MiddleName,
				Email: Email ? Email : teacher.Email
			});	
			var contact = await Contacts.findOne({
				attributes: ['Id','Mobile','Phone','Email','Address'],
				where: {
					Id: ContactId
				}
			});
			await contact.update({
				Mobile: Mobile ? Mobile : contact.Mobile,
				Phone: Phone ? Phone : contact.Phone,
				Email: Mail ? Mail : contact.Email,
				Address: Address ? Address : contact.Address
			});	

			res.json({
				result: 'ok',
				data: teacher,
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
		console.log(error);
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
		var teacher = await Teachers.findOne({
			attributes: ['ContactId'],
			where: {
				Id: id
			}
		});

		Contacts.destroy({
			where: {
				Id: teacher.ContactId
			}
		});

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
		const query = `SELECT tch."Id",tch."TeacherId",tch."FirstName",tch."LastName",tch."MiddleName",tch."Email",ct."Id" as "ContactId",ct."Mobile",ct."Phone",ct."Email" as "Mail",ct."Address"
		FROM public."Teachers" as tch LEFT JOIN public."Contacts" as ct ON ct."Id" = tch."ContactId"`;
		const teachers = await sequelize.query(query,{
			type: QueryTypes.SELECT
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