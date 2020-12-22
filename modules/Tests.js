const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Tests = sequelize.define('Tests',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	Name:{
		type: Sequelize.STRING,
		allowNull: false
	},
	TestCategoryId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = Tests;