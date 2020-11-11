const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Rooms = sequelize.define('Rooms',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	SchoolId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Room:{
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

module.exports = Rooms;