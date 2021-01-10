var TelegramBot = require('telegraf');
const Stage = require('telegraf/stage');
var handlers = require('./handlers/botFunctions');
const session = require('telegraf/session');
const QueueBot = require('smart-request-balancer');
const Markup = require('telegraf/markup');


const queueBot = new QueueBot({
	rules:{
		telegramIndividual: {
			rate: 1,    // one message
			limit: 1,   // per second
			priority: 1
		},
		telegramGroup: {
			rate: 20,    // 20 messages
			limit: 60,  // per minute
			priority: 1
		},
		telegramBroadcast: {
			rate: 30,
			limit: 2,
			priority: 2
		}
	},
	default: {                   // Default rules (if provided rule name is not found
		rate: 30,
		limit: 1
	},
	overall:{
		rate: 30,       
		limit: 1
	},
	retryTime: 300,              // Default retry time. Can be configured in retry fn
	ignoreOverallOverheat: false  // Should we ignore overheat of queue itself  
});

const start = handlers.addStartHandler(queueBot);
const create = handlers.addAnotherChild(queueBot);
const del = handlers.addDeleteHandler(queueBot);
const stage = new Stage();



stage.register(start);
stage.register(create);
stage.register(del);

const bot = new TelegramBot(process.env.AIPLUSONLINE_BOT);

bot.use(session());
bot.use(stage.middleware());

bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.command('start', ctx => {
	ctx.scene.enter('start');
});

bot.action('start', ctx => {
	ctx.scene.enter('start');
});

bot.action('create', ctx => {
	console.log('My tut');
	ctx.scene.enter('create');
});

bot.action('delete', ctx => {
	ctx.scene.enter('delete');
});

bot.action('cancel',(ctx) => {
	console.log('Vyshli');
	ctx.reply("Регистрация ученика на ваш номер прошла успешно 	\u{2705}\u{1F38A}\nДля отмены регистрации нажмине на кнопку",Markup.inlineKeyboard([
		Markup.callbackButton("Отменить", "delete")
	]).extra());

	return ctx.scene.leave(); 
});


bot.on('message',(ctx) => {
	var message = `📩 Здравствуйте, вас приветствует чат-бот Айплюс 💐 

	Если у вас возникли вопросы, можете обратиться к своему ментору 🤗`;
	ctx.reply(message);
});

module.exports ={
	bot,
	queueBot
};