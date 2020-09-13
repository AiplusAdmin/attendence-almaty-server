const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Roles = require('./Roles');
const Contacts = require('./Contacts');

const Employees = sequelize.define('Employees',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
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
	RoleId:{
		type: Sequelize.INTEGER
	},
	ContactId:{
		type: Sequelize.INTEGER
	},
	Email: {
		type: Sequelize.STRING,
		unique: true
	},
	Password: {
		type: Sequelize.STRING
	},
	createdAt: {
		type: Sequelize.DATE, 
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	AUTH: {
		type: Sequelize.TEXT,
		allowNull: false
	},
	EmployeeId:{
		type: Sequelize.UUID,
		allowNull: false,
		unique: true
	}
});

Roles.hasMany(Employees,{ foreignKey: 'RoleId', sourceKey: 'Id'});
Employees.belongsTo(Roles,{ foreignKey:'RoleId', targetKey: 'Id'});

Contacts.hasMany(Employees,{ foreignKey: 'ContactId', sourceKey: 'Id'});
Employees.belongsTo(Contacts,{ foreignKey:'ContactId', targetKey: 'Id'});

module.exports = Employees;

