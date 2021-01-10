const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const KolHarTests = sequelize.define('KolHarTests',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	ClientId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Score:{
		type: Sequelize.INTEGER
	},
	LessonDay:{
		type: Sequelize.DATE
	},
	SubmitDay:{
		type: Sequelize.DATE
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});

module.exports = KolHarTests;