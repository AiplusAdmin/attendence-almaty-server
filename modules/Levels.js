const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Levels = sequelize.define('Levels',{
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

module.exports = Levels;