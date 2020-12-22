const express = require('express');
const router = express.Router();

const Levels = require('../modules/Levels');

//add
router.post('/', async (req,res) => {
	var { Name } = req.body;
	try{
		var newLevel = await Levels.create({
			Name
		},{
			fields: ['Name'],
		});
		if(newLevel){
			res.json({
				result: 'ok',
				data: newLevel
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
		var levels = await Levels.findAll({
			attributes: ['Id', 'Name', 'createdAt', 'updatedAt'],
			where: {
				Id: id
			}
		});
		if(levels.length > 0){
			levels.map(async (level) =>{
				await level.update({
					Name: Name ? Name : level.Name
				});	
			});
			res.json({
				result: 'ok',
				data: levels,
				message: "Обновление уровней прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление уровней провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление уровней провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Levels.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление уровней успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление уровней провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const levels = await Levels.findAll({
			attributes: ['Id','Name']
		});
		res.json({
			result: 'ok',
			data: levels,
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