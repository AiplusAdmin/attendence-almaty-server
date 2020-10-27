const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
const { QueryTypes } = require('sequelize');

const sequelize = require('../databases/index').sequelize;
const verifyPassword = require('../scripts/verifyPassword');

async function GetTeacher(email){
	try{
		const query = `SELECT "EmployeeId" as UserId , "Email", "Password", "AUTH", "RoleId","FirstName","LastName"
		FROM "Employees" 
		WHERE "Email" = :email
		UNION SELECT "TeacherId" as UserId , "Email", "Password", "AUTH", "RoleId","FirstName","LastName"
		FROM "Teachers" WHERE "Email" = :email;`;
		var users = await sequelize.query(query,{
			replacements:{email: email.toLowerCase()},
			type: QueryTypes.SELECT
		});
		if(users.length == 1)
			return users[0];
		else
			return null;
	}catch(error){
		console.log(`Ошибка при выгрузке учителя по email. Ошибка ${error}`);
		return null;
	}
}

function initialize(passport){
	const authenticateUser = async (username, password, done) => {
		try{
			console.log(username);
			var row = await GetTeacher(username);
			if(row){
				if(!await verifyPassword(password,row.Password))
					return done(null,false,{message: "Не правильный пароль"});
				else
					return done(null,{teacherId: row.userid,roleId: row.RoleId, authkey: row.AUTH,firstname: row.FirstName,lastname:row.LastName});
			}
			else
				return done(null,false,{message: "Такой учетной записи нет"});
		} catch(err) {
			console.log(err);
		}
	}

	passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUser));
}

module.exports = initialize;




