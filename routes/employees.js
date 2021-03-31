const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const uniqueRandom = require('unique-random');

const Employees = require('../modules/Employees');
const generateKey = require('../scripts/generateKeys');
const random = uniqueRandom(1, 1000);

function generateEmployeeId(employeesId,newId){

	if(!employeesId.includes(newId))
		return newId;

	generateEmployeeId(employeesId,random());
}
//add
router.post('/', async (req,res) => {
	var { FirstName,LastName,MiddleName,RoleId,ContactId,Email,password } = req.body;
	try{
		var employeesId = await Employees.findAll({
			attributes: ['EmployeeId']
		});
		var Password = await bcrypt.hash(password,10); 
		var EmployeeId = generateEmployeeId(employeesId,random());
		var AUTH = generateKey();
		var newEmployee = await Employees.create({
			FirstName,
			LastName,
			MiddleName,
			RoleId,
			ContactId,
			Email,
			Password,
			AUTH,
			EmployeeId
		},{
			fields: ['FirstName','LastName','MiddleName','RoleId','ContactId','Email','Password','AUTH','EmployeeId']
		});
		if(newEmployee){
			res.json({
				result: 'ok',
				data: newEmployee
			});
		}else{
			res.json({
				result: 'failed',
				data: {},
				message: 'Добавления нового сотрудника провалено'
			});
		}
	} catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Добавления нового сотрудника провалено. Ошибка: ${error}`
		});
	}
});

//update
router.put('/:Id',async (req,res) => {
	const {Id} = req.params;
	const { FirstName,LastName,MiddleName,RoleId,Email,password} = req.body;
	try{
		var employees = await Employees.findAll({
			attributes: ['Id','FirstName','LastName','MiddleName','RoleId','Email','Password'],
			where: {
				Id
			}
		});
		var Password = await bcrypt.hash(password,10); 
		if(employees.length > 0){
			employees.map(async (employee) =>{
				await employee.update({
					FirstName: FirstName ? FirstName : employee.FirstName,
					LastName: LastName ? LastName : employee.LastName,
					MiddleName: MiddleName ? MiddleName : employee.MiddleName,
					RoleId: RoleId ? RoleId : employee.RoleId,
					Email: Email ? Email : employee.Email,
					Password: Password? Password: employee.Password
				});	
			});
			res.json({
				result: 'ok',
				data: employees,
				message: "Обновление Сотрудников прошла успешна"
			});
		} else {
			res.json({
				result: 'failed',
				data: {},
				message: "Обновление Сотрудников провалено"
			});
		} 
	}catch(error){
		res.json({
			result: 'failed',
			data: {},
			message: `Обновление Сотрудников провалено. Ошибка: ${error}`
		});	
	}
});


//delete
router.delete('/:id', async (req,res) => {
	const { id } = req.params;
	try{
		var deletedRows = await Contacts.destroy({
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
		const employees = await Employees.findAll({
			attributes: ['Id','FirstName','LastName','MiddleName','RoleId','ContactId','Email'],
		});
		res.json({
			result: 'ok',
			data: employees,
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