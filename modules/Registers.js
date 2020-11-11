const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Registers = sequelize.define('Registers',{
	Id:{
		type: Sequelize.BIGINT,
		allowNull: false,
		primaryKey: true
	},
	LevelTest:{
		type: Sequelize.STRING
	},
	RoomId:{
		type: Sequelize.INTEGER
	},
	TeacherId:{
		type: Sequelize.INTEGER
	},
	GroupId:{
		type: Sequelize.INTEGER
	},
	GroupName:{
		type: Sequelize.STRING
	},
	Time:{
		type: Sequelize.STRING
	},
	LessonDate:{
		type: Sequelize.DATE
	},
	WeekDays:{
		type: Sequelize.STRING
	},
	SubmitDay:{
		type: Sequelize.DATE
	},
	SubmitTime:{
		type: Sequelize.STRING
	},
	IsSubmitted:{
		type: Sequelize.BOOLEAN
	},
	IsStudentAdd:{
		type: Sequelize.BOOLEAN
	},
	IsOperator:{
		type: Sequelize.BOOLEAN
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	SchoolId:{
		type: Sequelize.INTEGER
	}
});

module.exports = Registers;