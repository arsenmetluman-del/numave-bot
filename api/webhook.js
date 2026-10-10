const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8546026847:AAFCt8NGAVYn2XVtPOsxiXiDacVklqJFQGk';
const GAME_URL = 'https://numb123-38hs.vercel.app';

const bot = new TelegramBot(TOKEN);

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') {
            const host = req.headers.host;
            const webhookUrl = `https://${host}/api/webhook`;
            await bot.setWebHook(webhookUrl);
            return res.status(200).send('✅ NumAve Bot работает. Webhook: ' + webhookUrl);
        }

        if (req.method === 'POST') {
            const update = req.body;

            if (update.message && update.message.text === '/start') {
                const chatId = update.message.chat.id;
                const firstName = update.message.from.first_name || 'друг';

                const text = '👋 Добро пожаловать в NumAve, ' + firstName + '!\n\n' +
                    '🎲 Крутите номера, собирайте редкие,\n' +
                    '💎 обменивайте на Namcoin.\n\n' +
                    '👇 Нажми кнопку чтобы начать играть';

                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎮 Играть', web_app: { url: GAME_URL } }]
                    ]
                };

                await bot.sendMessage(chatId, text, { reply_markup: keyboard });
            }

            return res.status(200).send('OK');
        }

        res.status(405).send('Method not allowed');
    } catch (error) {
        console.log('Ошибка:', error.message);
        res.status(200).send('OK');
    }
};
