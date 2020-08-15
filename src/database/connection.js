const mysql = require('mysql');
const mysqlUtilities = require('mysql-utilities');
const config = require('../config/database.json');

const connection = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
});

connection.connect();

mysqlUtilities.upgrade(connection);
mysqlUtilities.introspection(connection);

module.exports = connection;