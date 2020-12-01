const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const TelegramStudents = sequelize.define('TelegramStudents',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Role:{
		type: Sequelize.STRING,
		allowNull: false
	},
	ChatId:{
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

module.exports = TelegramStudents;