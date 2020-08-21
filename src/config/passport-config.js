const LocalStrategy = require('passport-local').Strategy;
const query = require('../database/query');
const passport = require('passport');

passport.use(
	new LocalStrategy({usernameField: 'email'},
		async (username, password, done) => {
			try{
				var row = await query.GetTeacherByEmail(username);
				if(row){
					if(!await query.verifyPassword(password,row.password))
						return done(null,false,{message: "Не правильный пароль"});
					else
						return done(null,{teacherId: row.teacherId, authkey: row.authkey});
				}
				else
					return done(null,false,{message: "Такой учетной записи нет"});
			} catch(err) {
				console.log(err);
			}
		}
	)
)
