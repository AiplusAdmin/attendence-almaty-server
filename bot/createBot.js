var TelegramBot = require('telegraf');
const session = require('telegraf/session');

const bot = new TelegramBot(process.env.OPERATOR_BOT);

bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.use(session());

module.exports = bot;