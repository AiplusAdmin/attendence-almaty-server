const express = require('express');
const router = express.Router();

const Tests = require('../modules/Tests');


//query all data
router.get('/', async (req,res) => {
	try{
		console.log(req.query);
		var testcategoryid = req.query.testcategoryid;
		const tests = await Tests.findAll({
			attributes: ['Id','Name'],
			where: {
				TestCategoryId: testcategoryid
			}
		});
		res.json({
			status: 200,
			data: tests,
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