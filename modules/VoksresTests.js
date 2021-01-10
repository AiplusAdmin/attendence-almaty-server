const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const VoskresTests = sequelize.define('VoskresTests',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Subject:{
		type: Sequelize.STRING
	},
	LessonDay:{
		type: Sequelize.DATE
	},
	SubmitDay:{
		type: Sequelize.DATE
	},
	Score:{
		type: Sequelize.INTEGER
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = VoskresTests;