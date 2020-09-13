const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Contacts = sequelize.define('Contacts',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true,
	},
	Mobile:{
		type: Sequelize.STRING,
	},
	Phone:{
		type: Sequelize.STRING
	},
	Email:{
		type: Sequelize.STRING
	},
	Address:{
		type: Sequelize.STRING
	},
	createdAt: {
		type: Sequelize.DATE, 
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = Contacts;