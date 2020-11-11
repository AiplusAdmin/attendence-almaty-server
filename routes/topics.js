const express = require('express');
const router = express.Router();

const Topics = require('../modules/Topics');

//add
router.post('/', async (req,res) => {
	var { Name,Class } = req.body;
	try{
		var newTopic = await Topics.create({
			Name
		},{
			fields: ['Name','Class'],
		});
		if(newTopic){
			res.json({
				result: 'ok',
				data: newTopic
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления новой темы провалено'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления новой темы провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:id',async (req,res) => {
	const {id} = req.params;
	const { Name,Class } = req.body;
	try{
		var topics = await Topics.findAll({
			attributes: ['Id', 'Name','Class','createdAt', 'updatedAt'],
			where: {
				Id: id
			}
		});
		if(topics.length > 0){
			topics.map(async (topic) =>{
				await role.update({
					Name: Name ? Name : topic.Name,
					Name: Class ? Class : topic.Class
				});	
			});
			res.json({
				result: 'ok',
				data: topics,
				message: "Обновление темы прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление темы провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление темы провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Topics.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление темы успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление темы провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const topics = await Topics.findAll({
			attributes: ['Id','Name','Class','createdAt','updatedAt']
		});
		res.json({
			result: 'ok',
			data: topics,
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