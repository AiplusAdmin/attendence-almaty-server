const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const ExtraFields = sequelize.define('ExtraFields',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Aibucks:{
		type: Sequelize.INTEGER,
	},
	Online:{
		type: Sequelize.BOOLEAN,
	},
	Intensiv: {
		type: Sequelize.BOOLEAN,
	},
	OnlineSended: {
		type: Sequelize.BOOLEAN,
	},
	IntensivSended: {
		type: Sequelize.BOOLEAN,
	},
	TimeIntensiv:{
		type: Sequelize.STRING
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = ExtraFields;