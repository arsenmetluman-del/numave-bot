const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8546026847:AAH_pznjiozig_HCvS7pgiOKz8EZD1XL0to';
const GAME_URL = 'https://numb123.vercel.app';

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'друг';

    const text = '👋 Добро пожаловать в NumAve, ' + firstName + '!\n\n' +
        '🎲 Крутите номера, собирайте редкие,\n' +
        '💎 обменивайте на Namcoin.\n\n' +
        '👇 Нажми кнопку чтобы начать играть';

    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: '🎮 Играть',
                    web_app: { url: GAME_URL }
                }
            ]
        ]
    };

    bot.sendMessage(chatId, text, {
        reply_markup: keyboard
    });
});

bot.on('polling_error', (error) => {
    console.log('Ошибка:', error.message);
});

console.log('✅ NumAve Bot запущен');
