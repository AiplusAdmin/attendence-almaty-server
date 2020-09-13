const express = require('express');
const router = express.Router();

const SubRegisters = require('../modules/SubRegisters');

//add
router.post('/', async (req,res) => {
	var { RegisterId, ClientId, FullName, Pass, Homework, Test, Lesson, Comment, Status } = req.body;
	try{
		var newSubregister = await SubRegisters.create({
			RegisterId,
			ClientId,
			FullName,
			Pass,
			Homework,
			Test,
			Lesson,
			Comment,
			Status
		},{
			fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status']
		});
		if(newSubregister){
			res.json({
				result: 'ok',
				data: newSubregister
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавление Аттендансов провалено.'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавление Аттендансов провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { RegisterId, ClientId, FullName, Pass, Homework, Test, Lesson, Comment, Status } = req.body;
	try{
		var subregisters = await SubRegisters.findAll({
			fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status'],
			where: {
				Id
			}
		});
		if(subregisters.length > 0){
			subregisters.map(async (subregister) =>{
				await subregister.update({
					RegisterId: RegisterId ? RegisterId : subregister.RegisterId,
					ClientId: ClientId ? ClientId : subregister.ClientId,
					FullName: FullName ? FullName : subregister.FullName,
					Pass: Pass ? Pass : subregister.Pass,
					Homework: Homework ? Homework : subregister.Homework,
					Test: Test ? Test : subregister.Test,
					Lesson: Lesson ? Lesson : subregister.Lesson,
					Comment: Comment ? Comment : subregister.Comment,
					Status: Status ? Status : subregister.Status
				});	
			});
			res.json({
				result: 'ok',
				data: subregisters,
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
		var deletedRows = await SubRegisters.destroy({
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
		const subregistes = await SubRegisters.findAll({
			fields:['RegisterId','ClientId','FullName','Pass','Homework','Test','Lesson','Comment','Status'],
		});
		res.json({
			result: 'ok',
			data: subregistes,
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