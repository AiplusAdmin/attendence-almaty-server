const Sequelize = require('sequelize');

const dbConfig = require('../config/db.config');

const sequelize = new Sequelize(
	dbConfig.DB,
	dbConfig.USER,
	dbConfig.PASSWORD,
	{
		host: dbConfig.HOST,
		dialect: dbConfig.dialect,
		pool: {
			max: dbConfig.pool.max,
			min: dbConfig.pool.min,
			require: dbConfig.pool.require,
			idle: dbConfig.pool.idle
		}
	}
);

const Op = sequelize.Op;

module.exports = {
	sequelize,
	Op
}