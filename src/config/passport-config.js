const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, GetTeacherByEmail){
    const authenticateUser = (email,password, done) => {
        const user = GetTeacherByEmail(email);
        console.log(user);
        if(user == null){
            return done(null, false,{message: 'No user with than email'});
        }

        try{
            if(password == user.password){
                return done(null, user);
            } else {
                return done(null, false, {message: 'Password incorrect'});
            }
        }catch(e){
            return done(e);
        }
    }

    passport.use(new LocalStrategy({ usernameField: 'email'}), authenticateUser);
    passport.serializeUser((user,done)=> {});
    passport.deserializeUser((id,done)=> {})

}

module.exports = {
    initialize
}