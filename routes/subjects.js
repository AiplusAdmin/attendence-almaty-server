const express = require('express');
const router = express.Router();

const Subjects = require('../modules/Subjects');

//add
router.post('/', async (req,res) => {
	var { Name } = req.body;
	try{
		var newSubject = await Subjects.create({
			Name
		},{
			fields: ['Name'],
		});
		if(newSubject){
			res.json({
				result: 'ok',
				data: newSubject
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового предмета провалено'
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
		var subjects = await Subjects.findAll({
			attributes: ['Id', 'Name', 'createdAt', 'updatedAt'],
			where: {
				Id: id
			}
		});
		if(subjects.length > 0){
			subjects.map(async (subject) =>{
				await subject.update({
					Name: Name ? Name : subject.Name
				});	
			});
			res.json({
				result: 'ok',
				data: subjects,
				message: "Обновление предмета прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление предмета провалено"
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
		var deletedRows = await Subjects.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление предмета успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление предмета провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const subjects = await Subjects.findAll({
			attributes: ['Id','Name','createdAt','updatedAt']
		});
		res.json({
			result: 'ok',
			data: subjects,
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