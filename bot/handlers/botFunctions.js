const Markup = require('telegraf/markup');
const WizardScene = require('telegraf/scenes/wizard');
const { QueryTypes } = require('sequelize');
const sequelize = require('../../databases/index').sequelize;
const TelegramStudents = require('../../modules/TelegramStudents');

const botUtils = require('../botUtils');
const api = require('../../api/api');

const key = {
    "domain": process.env.DOMAIN,
    "apikey": process.env.APIKEY
};

function addStartHandler(queueBot){
	const start = new WizardScene('start',
		async (ctx) => {
			try{
				const query = `SELECT tel."RoleId",st."LastName" || ' ' || st."FirstName" as "FullName"
				FROM public."TelegramStudents" as tel
				LEFT JOIN public."Students" as st ON tel."ClientId" = st."ClientId"
				WHERE tel."ChatId" = :chatid`;
				var ChatId = new String(ctx.from.id);
				var users = await sequelize.query(query,{
					replacements:{chatid: ChatId},
					type: QueryTypes.SELECT
				});

				if(users.length > 0){
					var names = '';
					var role = users[0].RoleId;
					users.map(function(user){
						names += user.FullName + '\n';
					});
					if(role == 2){
						queueBot.request((retry) => 
							ctx.reply("Ваш номер зарегистрирован на Ученике - " + names,Markup.inlineKeyboard([
								Markup.callbackButton("Отменить регистрацию", "delete")
							]).extra())
							.catch(error => {
								console.log("error\n" + error);
								if (error.response.status === 429) { // We've got 429 - too many requests
									return retry(error.response.data.parameters.retry_after) // usually 300 seconds
								}
								throw error; // throw error further
						}),ctx.from.id,'telegramIndividual');
					} else {
						if(users.length == 1){
							queueBot.request((retry) => 
								ctx.reply("Ваш номер зарегистрирован на Ученике - " + names,Markup.inlineKeyboard([
									Markup.callbackButton("Отменить регистрацию", "delete"),
									Markup.callbackButton("Добавить другого ребенка", "create")
								]).extra())
								.catch(error => {
									console.log("error\n" + error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
							}),ctx.from.id,'telegramIndividual');
						} else {
							queueBot.request((retry) => 
								ctx.reply("Ваш номер зарегистрирован на Учениках - " + names,Markup.inlineKeyboard([
									Markup.callbackButton("Отменить регистрацию", "delete"),
									Markup.callbackButton("Добавить другого ребенка", "create")
								]).extra())
								.catch(error => {
									console.log("error\n" + error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
							}),ctx.from.id,'telegramIndividual');
						}
					}

					return ctx.scene.leave();
				} else {
					queueBot.request((retry) =>
						ctx.reply("Здравствуйте \u{1F917} Вас приветствует Онлайн Айплюс \u{1F4BB}\nКем вы приходитесь? \u{1F465}",botUtils.getRoleButton())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');
					
					ctx.wizard.state.data = {};
					ctx.wizard.state.data.ChatId = ctx.from.id;
					return ctx.wizard.next();
				}
			}catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "start"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		},
		ctx => {
			try{
				ctx.wizard.state.data.RoleId = ctx.update.callback_query.data;

				queueBot.request((retry) =>
					ctx.reply('Укажите ID ребенка. Если вы не знаете, можете обратиться к вашему ментору \u{1F337}')
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');

				return ctx.wizard.next();
			}catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "start"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		},
		async ctx => {
			try{
				ctx.wizard.state.data.StudentId = ctx.message.text.trim();
				var params = `id=${ctx.wizard.state.data.StudentId}`;
				var result = await api.get(key.domain,'GetStudents',params,key.apikey);
				if(result.status == 200 && result.data.length == 1){
					var data = result.data;
					ctx.wizard.state.data.ClientId = result.data[0].ClientId;
					queueBot.request((retry) =>
						ctx.reply(" ФИ ученика 	\u{1F464} : " +  data[0].LastName  + ' ' +  data[0].FirstName + ". Верно? ",botUtils.YesNo())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');

					return ctx.wizard.next();
				} else {
					queueBot.request((retry) =>
						ctx.reply('Ученик не найдет\u{274C} Обратитесь к ментору.\nЧтобы заново пройти регистрацию нажмите на кнопку',Markup.inlineKeyboard([
							Markup.callbackButton("Регистрация", "start")
						]).extra())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');
					
					return ctx.scene.leave();
				}
			}catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "start"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
			
		},
		async ctx => {
			try{
				ctx.wizard.state.data.Correct = ctx.update.callback_query.data;
				if(ctx.wizard.state.data.Correct == 1){
					users  = await TelegramStudents.findAll({
						attributes: ['Id'],
						where: {
							ClientId :  ctx.wizard.state.data.ClientId
						}
					});
					if(users.length < 4){
						var ClientId = ctx.wizard.state.data.ClientId;
						var ChatId = ctx.wizard.state.data.ChatId;
						var RoleId = ctx.wizard.state.data.RoleId;
						var user = await TelegramStudents.create({
							ClientId,
							ChatId,
							RoleId			
						},{
							fields:['ClientId','ChatId','RoleId']
						});
		
						if(user){
							if(ctx.wizard.state.data.RoleId == 1){
								queueBot.request((retry) =>
									ctx.reply("Регистрация ученика на ваш номер прошла успешно 	\u{2705}\u{1F38A}\nЕсть ли у вас еще ребенок обучающийся в Aiplus?",Markup.inlineKeyboard([
										Markup.callbackButton("Да", "create"),
										Markup.callbackButton("Нет", "cancel"),
									]).extra())
									.catch(error => {
									console.log("error\n" + error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
								}),ctx.from.id,'telegramIndividual');
	
								return ctx.scene.leave();
							}else {
								queueBot.request((retry) =>
									ctx.reply("Регистрация ученика на ваш номер прошла успешно 	\u{2705}\u{1F38A}\nДля отмены регистрации нажмине на кнопку",Markup.inlineKeyboard([
										Markup.callbackButton("Отменить", "delete")
									]).extra())
									.catch(error => {
										console.log("error\n" + error);
										if (error.response.status === 429) { // We've got 429 - too many requests
											return retry(error.response.data.parameters.retry_after) // usually 300 seconds
										}
										throw error; // throw error further
								}),ctx.from.id,'telegramIndividual');
	
								return ctx.scene.leave();
							}
						} else {
							queueBot.request((retry) =>
								ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
									Markup.callbackButton("Регистрация", "start"),
								]).extra())
								.catch(error => {
									console.log("error\n" + error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
								throw error; // throw error further
							}),ctx.from.id,'telegramIndividual');
							
							return ctx.scene.leave();
						}
					}else{
						queueBot.request((retry) =>
						ctx.reply("Количество регистрируемых превысило лимит, обратитесь к вашему ментору. Для того чтобы пройти регистрацию нажмите кнопку",Markup.inlineKeyboard([
							Markup.callbackButton("Регистрация", "start")
						]).extra())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
						}),ctx.from.id,'telegramIndividual');

						return ctx.scene.leave();
					}
				} else {
					return ctx.scene.reenter();
				}
			} catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "start"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		}
	);
	
	return start;
}

function addAnotherChild(queueBot){
	const create = new WizardScene('create',
		ctx => {
			try{
				queueBot.request((retry) =>
					ctx.reply('Укажите ID ребенка. Если вы не знаете, можете обратиться к вашему ментору \u{1F337}')
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');

				ctx.wizard.state.data = {};
				ctx.wizard.state.data.RoleId = 1;
				ctx.wizard.state.data.ChatId = ctx.from.id;
				return ctx.wizard.next();
			}catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "create"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		},
		async ctx => {
			try{
				ctx.wizard.state.data.StudentId = ctx.message.text.trim();
				var params = `id=${ctx.wizard.state.data.StudentId}`;
				var result = await api.get(key.domain,'GetStudents',params,key.apikey);
				if(result.status == 200 && result.data.length == 1){
					var data = result.data;
					ctx.wizard.state.data.ClientId = result.data[0].ClientId;
					queueBot.request((retry) =>	
						ctx.reply(" ФИ ученика 	\u{1F464} : " +  data[0].LastName  + ' ' +  data[0].FirstName + ". Верно? ",botUtils.YesNo())
						.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
						throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');					
					return ctx.wizard.next();
				} else {
					queueBot.request((retry) =>
						ctx.reply('Ученик не найдет\u{274C} Обратитесь к ментору.\nЧтобы заново пройти регистрацию нажмите на кнопку',Markup.inlineKeyboard([
							Markup.callbackButton("Регистрация", "create")
						]).extra())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');
					
					return ctx.scene.leave();
				}
			}catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "create"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		},
		async ctx => {
			try{
				ctx.wizard.state.data.Correct = ctx.update.callback_query.data;
				if(ctx.wizard.state.data.Correct == 1){
					var ClientId = ctx.wizard.state.data.ClientId;
					var ChatId = ctx.wizard.state.data.ChatId;
					var RoleId = 1;
					var user = await TelegramStudents.create({
						ClientId,
						ChatId,
						RoleId			
					},{
						fields:['ClientId','ChatId','RoleId']
					});

					if(user){
						if(ctx.wizard.state.data.RoleId == 1){
							queueBot.request((retry) =>	
								ctx.reply("Регистрация ученика на ваш номер прошла успешно 	\u{2705}\u{1F38A}\nЕсть ли у вас еще ребенок обучающийся в Aiplus?",botUtils.YesNo())
								.catch(error => {
									console.log("error\n" + error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
							}),ctx.from.id,'telegramIndividual');	

							return ctx.wizard.next();
						}else {
							queueBot.request((retry) =>	
								ctx.reply("Регистрация ученика на ваш номер прошла успешно 	\u{2705}\u{1F38A}\nДля отмены регистрации нажмине на кнопку")
								.catch(error => {
									console.log("error\n" + error);
									if (error.response.status === 429) { // We've got 429 - too many requests
										return retry(error.response.data.parameters.retry_after) // usually 300 seconds
									}
									throw error; // throw error further
							}),ctx.from.id,'telegramIndividual');	
							return ctx.scene.leave();
						}
					}
				} else {
					return ctx.scene.reenter();
				}
			} catch(err){
				queueBot.request((retry) =>
					ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
						Markup.callbackButton("Регистрация", "create"),
					]).extra())
					.catch(error => {
						console.log("error\n" + error);
						if (error.response.status === 429) { // We've got 429 - too many requests
							return retry(error.response.data.parameters.retry_after) // usually 300 seconds
						}
					throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		},
		ctx => {
			try{
				ctx.wizard.state.data.hasChild = ctx.update.callback_query.data;
				if(ctx.wizard.state.data.hasChild == 1){
					return ctx.scene.reenter();
				} else {
					queueBot.request((retry) =>	
						ctx.reply("Регистрация ученика на ваш номер прошла успешно 	\u{2705}\u{1F38A}\nДля отмены регистрации нажмине на кнопку",Markup.inlineKeyboard([
							Markup.callbackButton("Отменить", "delete")
						]).extra())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');	
	
					return ctx.scene.leave();
				}
			}catch(err){
				queueBot.request((retry) =>
				ctx.reply("Произошла ошибка чтобы пройти обратно регистрацию нажмите на кнопку",Markup.inlineKeyboard([
					Markup.callbackButton("Регистрация", "create"),
				]).extra())
				.catch(error => {
					console.log("error\n" + error);
					if (error.response.status === 429) { // We've got 429 - too many requests
						return retry(error.response.data.parameters.retry_after) // usually 300 seconds
					}
				throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');
				return ctx.scene.leave();
			}
		}
	);

	return create;
}


function addDeleteHandler(queueBot){
	const del = new WizardScene(
		'delete',
		(ctx) => {	
			queueBot.request((retry) =>	
				ctx.reply('Вы уверены?', botUtils.YesNo())
				.catch(error => {
					console.log("error\n" + error);
					if (error.response.status === 429) { // We've got 429 - too many requests
						return retry(error.response.data.parameters.retry_after) // usually 300 seconds
					}
					throw error; // throw error further
			}),ctx.from.id,'telegramIndividual');	
			
			ctx.wizard.state.data = {};

			return ctx.wizard.next();
		},
		async (ctx) => {
			ctx.wizard.state.data.YesNo = ctx.update.callback_query.data;
			var ChatId = new String(ctx.from.id);
			if(ctx.wizard.state.data.YesNo == 1){
				var deletedRows = await TelegramStudents.destroy({
					where: {
						ChatId
					}
				});
				
				if(deletedRows > 0){
					queueBot.request((retry) =>	
						ctx.reply('На вашем номере отключена функция рассылки.\n\nЧтобы заново пройти регистрацию нажмите на кнопку',Markup.inlineKeyboard([
							Markup.callbackButton("Регистрация", "start")
						]).extra())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');	

				} else {
					queueBot.request((retry) =>	
						ctx.reply('Вас нет в списке рассылок.\n\nЧтобы заново пройти регистрацию нажмите на кнопку',Markup.inlineKeyboard([
							Markup.callbackButton("Регистрация", "start")
						]).extra())
						.catch(error => {
							console.log("error\n" + error);
							if (error.response.status === 429) { // We've got 429 - too many requests
								return retry(error.response.data.parameters.retry_after) // usually 300 seconds
							}
							throw error; // throw error further
					}),ctx.from.id,'telegramIndividual');	
				}
		
				return ctx.scene.leave();
			}else{
				queueBot.request((retry) =>	
					ctx.reply("Отменили удаление")
					.catch(error => {
								console.log("error\n" + error);
								if (error.response.status === 429) { // We've got 429 - too many requests
									return retry(error.response.data.parameters.retry_after) // usually 300 seconds
								}
								throw error; // throw error further
				}),ctx.from.id,'telegramIndividual');	
				
				return ctx.scene.leave();
			}
		}
	);

	return del;
}

module.exports = {
	addStartHandler,
	addAnotherChild,
	addDeleteHandler
}
