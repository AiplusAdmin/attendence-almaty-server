const express = require('express');
const router = express.Router();

const KolHarTests = require('../modules/KolHarTests');

//add
router.post('/', async (req,res) => {
	var { ClientId,LessonDay,SubmitDay,Score } = req.body;
	try{
		var newKolHarTest = await KolHarTests.create({
			ClientId,
			LessonDay,
			SubmitDay,
			Score
		},{
			fields: ['ClientId','LessonDay','SubmitDay','Score'],
		});
		if(newKolHarTest){
			res.json({
				result: 'ok',
				data: newKolHarTest
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового кол тест провалено'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового кол тест провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:id',async (req,res) => {
	const {id} = req.params;
	const { LessonDay,SubmitDay,Score } = req.body;
	try{
		var kolhartests = await KolHarTests.findAll({
			attributes: ['Id','ClientId','LessonDay','SubmitDay','Score'],
			where: {
				Id: id
			}
		});
		if(kolhartests.length > 0){
			kolhartests.map(async (kolhartest) =>{
				await kolhartest.update({
					LessonDay: LessonDay ? LessonDay : kolhartest.LessonDay,
					SubmitDay: SubmitDay ? SubmitDay : kolhartest.SubmitDay,
					Score: Score ? Score : kolhartest.Score
				});	
			});
			res.json({
				result: 'ok',
				data: kolhartests,
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
		var deletedRows = await KolHarTests.destroy({
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
		const kolhartests = await KolHarTests.findAll({
			attributes: ['Id','ClientId','LessonDay','SubmitDay','Score']
		});
		res.json({
			result: 'ok',
			data: kolhartests,
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