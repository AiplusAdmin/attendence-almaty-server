require('./config/passport-config');

const express = require('express');
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const services = require('./routes/services');
const cors = require('cors');

const port = 3000;

const app = express();
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use("/",services);

app.listen(port,function(){
    console.log("Server started on port " + port);
});