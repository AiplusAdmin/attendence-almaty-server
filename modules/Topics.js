const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Topics = sequelize.define('Topics',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	Name:{
		type: Sequelize.STRING,
		allowNull: false
	},
	Class:{
		type: Sequelize.STRING,
		allowNull: false
	},
	SubjectId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	createdAt:{
		type: Sequelize.DATE
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	Branch:{
		type: Sequelize.STRING,
		allowNull: false
	},
	LevelId:{
		type: Sequelize.INTEGER
	},
	Priority:{
		type: Sequelize.INTEGER
	}
});

module.exports = Topics;