const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Tests = sequelize.define('Tests',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	SubjectId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	MinScore:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	MaxScore:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	TestId:{
		type: Sequelize.INTEGER,
		allowNull: false
	}
});

module.exports = Tests;