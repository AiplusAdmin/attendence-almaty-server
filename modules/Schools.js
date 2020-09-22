const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Schools = sequelize.define('Schools',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	Name:{
		type: Sequelize.STRING,
		allowNull: false
	},
	Address:{
		type: Sequelize.STRING,
	},
	SchoolId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = Schools;