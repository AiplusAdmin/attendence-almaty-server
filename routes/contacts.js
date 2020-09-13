const express = require('express');
const router = express.Router();

const Contacts = require('../modules/Contacts');

//add
router.post('/', async (req,res) => {
	var { Mobile, Phone, Email, Address } = req.body;
	try{
		var newContact = await Contacts.create({
			Mobile,
			Phone,
			Email,
			Address
		},{
			fields:['Mobile','Phone','Email','Address']
		});
		if(newContact){
			res.json({
				result: 'ok',
				data: newContact
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавление контактов провалено.'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавление контактов провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { Mobile, Phone, Email, Address } = req.body;
	try{
		var contacts = await Contacts.findAll({
			attributes: ['Id','Mobile','Phone','Email','Address'],
			where: {
				Id
			}
		});
		if(contacts.length > 0){
			contacts.map(async (contact) =>{
				await contact.update({
					Mobile: Mobile ? Mobile : contact.Mobile,
					Phone: Phone ? Phone : contact.Phone,
					Email: Email ? Email : contact.Email,
					Address: Address ? Address : contact.Address
				});	
			});
			res.json({
				result: 'ok',
				data: contacts,
				message: "Обновление контактов прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление контактов провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление контактов провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Contacts.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление Контактов успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление Контактов провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const contacs = await Contacts.findAll({
			attributes: ['Id', 'Mobile','Phone','Email','Address'],
		});
		res.json({
			result: 'ok',
			data: contacs,
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