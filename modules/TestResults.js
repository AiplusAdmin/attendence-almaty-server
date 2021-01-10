const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const TestResults = sequelize.define('TestResults',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	SubmitDate:{
		type: Sequelize.DATE,
		allowNull: false
	},
	TestDate:{
		type: Sequelize.DATE,
		allowNull: false
	},
	TestSubjectId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	TeacherId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	Score:{
		type: Sequelize.INTEGER,
		allowNull: false
	}
});

module.exports = TestResults;