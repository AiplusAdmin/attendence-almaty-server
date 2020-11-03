require('./config/passport-config');

const createError = require('http-errors');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rfs = require('rotating-file-stream') 
const cors = require('cors');
const passport = require('passport');
const flash = require('express-flash');

const initializePassport = require('./config/passport-config');
const services = require('./routes/services');
const roles = require('./routes/roles');
const contacts = require('./routes/contacts');
const teachers = require('./routes/teachers');
const employees = require('./routes/employees');
const registers = require('./routes/registers');
const subregisters = require('./routes/subregisters');
const schools = require('./routes/schools');
const bot = require('./bot/createBot');
const cron = require('./scripts/cron');

const app = express();
initializePassport(passport);

var accessLogStream = rfs.createStream('access.log', {
	interval: '1M', // rotate monthsly
	path: path.join(__dirname, 'logs')
});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cors());
app.use(flash());
app.use(cookieParser());
app.use(morgan('combined',{ stream: accessLogStream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());
app.use(passport.session());

//routers
app.use('/roles',roles);
app.use('/contacts',contacts);
app.use('/teachers',teachers);
app.use('/employees',employees);
app.use('/registers',registers);
app.use('/subregisters',subregisters);
app.use('/schools',schools);
app.use('/',services);

//start bot
//bot.launch();
//start cron
//cron.start();
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
