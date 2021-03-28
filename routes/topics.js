const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');

const Topics = require('../modules/Topics');
const sequelize = require('../databases/index').sequelize;
//add
router.post('/', async (req,res) => {
	var { Name,Class,Branch,LevelId,Priority,SubjectId } = req.body;
	try{
		var newTopic = await Topics.create({
			Name,
			Class,
			Branch,
			LevelId,
			Priority,
			SubjectId
		},{
			fields: ['Name','Class','Branch','LevelId','Priority','SubjectId'],
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
	const { Name,Class,Branch,LevelId,Priority,SubjectId  } = req.body;
	try{
		var topic = await Topics.findOne({
			attributes: ['Id','Name','Class','Branch','LevelId','Priority','SubjectId'],
			where: {
				Id: id
			}
		});
		if(topic){
				await topic.update({
					Name: Name ? Name : topic.Name,
					Class: Class ? Class : topic.Class,
					Branch: Branch ? Branch : topic.Branch,
					LevelId: LevelId ? LevelId : topic.LevelId,
					Priority: Priority ? Priority : topic.Priority,
					SubjectId: SubjectId ? SubjectId : topic.SubjectId,
				});	
			res.json({
				result: 'ok',
				data: topic,
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
		const query = `SELECT tp."Id", tp."Name", tp."Class",tp."Branch", tp."Priority", sb."Name" as "Subject", lvl."Name" as "Level"
		FROM public."Topics" as tp
		LEFT JOIN public."Subjects" as sb ON sb."Id" = tp."SubjectId"
		LEFT JOIN public."Levels" as lvl ON lvl."Id" = tp."LevelId"`;

		const topics = await sequelize.query(query,{
			type: QueryTypes.SELECT
		});
		res.json({
			result: 'ok',
			data: topics,
			message: 'Выгрузка всех данных успешно'
		});
	}catch(error){
		console.log(error);
		res.json({
			result: 'failed',
			data: [],
			message: `Выгрузка всех данных провалено. Ошибка : ${error}`
		});
	}
});

module.exports = router;