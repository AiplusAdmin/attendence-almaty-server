const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const TestCategories = sequelize.define('TestCategories',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	Name:{
		type: Sequelize.STRING,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = TestCategories;