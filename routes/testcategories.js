const express = require('express');
const router = express.Router();

const TestCategories = require('../modules/TestCategories');


//query all data
router.get('/', async (req,res) => {
	try{
		const testCategories = await TestCategories.findAll({
			attributes: ['Id','Name']
		});
		res.json({
			status: 200,
			data: testCategories,
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