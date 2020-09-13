const express = require('express');

const roles = require('./roles');

const app = express();

app.use('/roles',roles);


module.exports = app;
