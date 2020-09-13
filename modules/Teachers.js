const Sequelize = require('sequelize');
const sequelize = require('../databases/index').sequelize;

const Contacts = require('./Contacts');
const Roles = require('./Roles');

const Teachers = sequelize.define('Teachers',{
	Id:{
		type: Sequelize.INTEGER,
		allowNull: false,
		primaryKey: true
	},
	TeacherId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	FirstName: {
		type: Sequelize.STRING,
		allowNull: false
	},
	LastName: {
		type: Sequelize.STRING,
		allowNull: false
	},
	MiddleName: {
		type: Sequelize.STRING
	},
	ContactId:{
		type: Sequelize.INTEGER,
		allowNull: false
	},
	Email: {
		type: Sequelize.STRING,
		allowNull: false
	},
	Password: {
		type: Sequelize.STRING,
		allowNull: false
	},
	createdAt: {
		type: Sequelize.DATE, 
		defaultValue: Sequelize.NOW,
		allowNull: false
	},
	updatedAt:{
		type: Sequelize.DATE
	},
	AUTH: {
		type: Sequelize.TEXT,
		allowNull: false
	},
	RoleId: {
		type: Sequelize.INTEGER,
		allowNull: false
	}
});

Contacts.hasMany(Teachers,{ foreignKey: 'ContactId', sourceKey: 'Id'});
Teachers.belongsTo(Contacts,{ foreignKey:'ContactId', targetKey: 'Id'});

Roles.hasMany(Teachers,{ foreignKey: 'RoleId', sourceKey: 'Id'});
Teachers.belongsTo(Roles,{ foreignKey:'RoleId', targetKey: 'Id'});

module.exports = Teachers;

