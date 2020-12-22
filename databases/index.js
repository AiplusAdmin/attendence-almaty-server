const Sequelize = require('sequelize');


const sequelize = new Sequelize(
	process.env.DB,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		dialect: 'postgres',
		pool: {
			max: 10,
			min: 0,
			acquire: 30000,
			idle: 10000
		}
	}
);

const Op = sequelize.Op;

module.exports = {
	sequelize,
	Op
}