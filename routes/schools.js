const express = require('express');
const router = express.Router();

const Schools = require('../modules/Schools');

//add
router.post('/', async (req,res) => {
	var { Name,Location,SchoolId } = req.body;
	try{
		var newSchool = await Schools.create({
			Name,
			Address,
			SchoolId
		},{
			fields: ['Name','Address','SchoolId'],
		});
		if(newSchool){
			res.json({
				result: 'ok',
				data: newSchool
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления новой школы провалено'
			});
		}
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления новой школы провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:id',async (req,res) => {
	const {id} = req.params;
	const { Name,Location,SchoolId } = req.body;
	try{
		var schools = await Roles.findAll({
			attributes: ['Id', 'Name', 'Address', 'SchoolId', 'createdAt', 'updatedAt'],
			where: {
				Id: id
			}
		});
		if(schools.length > 0){
			schools.map(async (school) =>{
				await schools.update({
					Name: Name ? Name : school.Name,
					Location: Address ? Address: school.Address,
					SchoolId: SchoolId ? SchoolId : school.SchoolId
				});	
			});
			res.json({
				result: 'ok',
				data: schools,
				message: "Обновление школ прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление школ провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление школ провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Schools.destroy({
			where: {
				Id: id
			}
		});
		res.json({
			result: 'ok',
			message: 'Удаление школ успешно',
			count: deletedRows
		});
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Удаление школ провалено. Ошибка: ${error}`
		});
	}
});

//query all data
router.get('/', async (req,res) => {
	try{
		const schools = await Schools.findAll({
			attributes: ['Id','Name', 'Address', 'SchoolId']
		});
		res.json({
			result: 'ok',
			data: schools,
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