const express = require('express');
const router = express.Router();

const VoksresTests = require('../modules/VoksresTests');

//add
router.post('/', async (req,res) => {
	var { ClientId,Subject,LessonDay,SubmitDay,Score } = req.body;
	try{
		var newVoksresTest = await VoksresTests.create({
			ClientId,
			Subject,
			LessonDay,
			SubmitDay,
			Score
		},{
			fields: ['ClientId','Subject','LessonDay','SubmitDay','Score'],
		});
		if(newVoksresTest){
			res.json({
				result: 'ok',
				data: newVoksresTest
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового воскрес тест провалено'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового воскрес тест провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:id',async (req,res) => {
	const {id} = req.params;
	const { Subject,LessonDay,SubmitDay,Score } = req.body;
	try{
		var voksrestests = await VoksresTests.findAll({
			attributes: ['Id','ClientId','Subject','LessonDay','SubmitDay','Score'],
			where: {
				Id: id
			}
		});
		if(voksrestests.length > 0){
			voksrestests.map(async (voksrestest) =>{
				await voksrestest.update({
					Subject: Subject ? Subject : voksrestest.Subject,
					LessonDay: LessonDay ? LessonDay : voksrestest.LessonDay,
					SubmitDay: SubmitDay ? SubmitDay : voksrestest.SubmitDay,
					Score: Score ? Score : voksrestest.Score
				});	
			});
			res.json({
				result: 'ok',
				data: voksrestests,
				message: "Обновление воскрес тест прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление воскрес тест провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление воскрес тест провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await VoksresTests.destroy({
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
		const voksrestests = await VoksresTests.findAll({
			attributes: ['Id','ClientId','Subject','LessonDay','SubmitDay','Score']
		});
		res.json({
			result: 'ok',
			data: voksrestests,
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