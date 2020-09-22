const express = require('express');
const router = express.Router();

const Roles = require('../modules/Roles');

//add
router.post('/', async (req,res) => {
	var { Name } = req.body;
	try{
		var newRole = await Roles.create({
			Name
		},{
			fields: ['Name'],
		});
		if(newRole){
			res.json({
				result: 'ok',
				data: newRole
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового роля провалено'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового роля провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:id',async (req,res) => {
	const {id} = req.params;
	const { Name } = req.body;
	try{
		var roles = await Roles.findAll({
			attributes: ['Id', 'Name', 'createdAt', 'updatedAt'],
			where: {
				Id: id
			}
		});
		if(roles.length > 0){
			roles.map(async (role) =>{
				await role.update({
					Name: Name ? Name : role.Name
				});	
			});
			res.json({
				result: 'ok',
				data: roles,
				message: "Обновление ролей прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление ролей провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление ролей провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Roles.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление ролей успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление ролей провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const roles = await Roles.findAll({
			attributes: ['Id','Name','createdAt','updatedAt']
		});
		res.json({
			result: 'ok',
			data: roles,
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