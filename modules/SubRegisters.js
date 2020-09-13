const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const SubRegisters = sequelize.define('SubRegisters',{
	Id:{
		type: Sequelize.BIGINT,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER
	},
	FullName:{
		type: Sequelize.STRING
	},
	Pass:{
		type: Sequelize.BOOLEAN
	},
	Homework:{
		type: Sequelize.INTEGER
	},
	Test:{
		type: Sequelize.INTEGER
	},
	Lesson:{
		type: Sequelize.INTEGER
	},
	Comment:{
		type: Sequelize.TEXT
	},
	Status:{
		type: Sequelize.BOOLEAN
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	RegisterId:{
		type: Sequelize.BIGINT
	}
});

module.exports = SubRegisters;