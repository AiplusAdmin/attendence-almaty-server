const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Aibukcs = sequelize.define('Aibukcs',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Aibukcs:{
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

module.exports = Aibukcs;