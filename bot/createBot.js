var TelegramBot = require('telegraf');
const session = require('telegraf/session');

const bot = new TelegramBot('1302254008:AAGBStuv3C7nW9bQCo2_vothCYWrvEGw7QY');

bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.use(session());

module.exports = bot;