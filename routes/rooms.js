const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');


const Rooms = require('../modules/Rooms');
const sequelize = require('../databases/index').sequelize;
//add
router.post('/', async (req,res) => {
	var { SchoolId,Room } = req.body;
	try{
		var newRoom = await Rooms.create({
			SchoolId,
			Room
		},{
			fields: ['SchoolId','Room'],
		});
		if(newRoom){
			res.json({
				result: 'ok',
				data: newRoom
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового кабинета провалено'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового кабинета провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:id',async (req,res) => {
	const {id} = req.params;
	const { SchoolId,Room } = req.body;
	try{
		var room = await Rooms.findOne({
			attributes: ['Id', 'SchoolId','Room'],
			where: {
				Id: id
			}
		});
		if(room){
				await room.update({
					SchoolId: SchoolId ? SchoolId : room.SchoolId,
					Room: Room ? Room : room.Room
				});	
			res.json({
				result: 'ok',
				data: rooms,
				message: "Обновление кабинета прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление кабинета провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление кабинета провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Rooms.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление кабинета успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление кабинета провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const query = `SELECT rm."Id",sch."Name" as "School",rm."Room"
		FROM public."Rooms" as rm LEFT JOIN public."Schools" as sch ON sch."SchoolId" = rm."SchoolId"`;
		const rooms = await sequelize.query(query,{
			type: QueryTypes.SELECT
		});
		res.json({
			result: 'ok',
			data: rooms,
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