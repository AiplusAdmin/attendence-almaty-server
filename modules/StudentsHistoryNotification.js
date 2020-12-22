const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const StudentsHistoryNotification = sequelize.define('StudentsHistoryNotification',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	GroupId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	LessonDay:{
		type: Sequelize.DATE,
		allowNull: false
	},
	NotificatedDay:{
		type: Sequelize.DATE,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = StudentsHistoryNotification;