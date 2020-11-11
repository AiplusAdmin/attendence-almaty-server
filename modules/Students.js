const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const SubRegisters = require('./SubRegisters');

const Students = sequelize.define('Students',{
	Id:{
		type: Sequelize.BIGINT,
		allowNull: false,
		primaryKey: true
	},
	Class:{
		type: Sequelize.STRING
	},
	StudentId:{
		type: Sequelize.INTEGER
	},
	ClientId:{
		type: Sequelize.INTEGER
	},
	FirstName: {
		type: Sequelize.STRING
	},
	LastName: {
		type: Sequelize.STRING
	},
	MiddleName: {
		type: Sequelize.STRING
	},
	createdAt: {
		type: Sequelize.DATE, 
	},
	updatedAt:{
		type: Sequelize.DATE
	}
});



SubRegisters.hasMany(Students,{ foreignKey: 'ClientId', sourceKey: 'ClientId'});
Students.belongsTo(SubRegisters,{ foreignKey:'ClientId', targetKey: 'ClientId'});

module.exports = Students;

