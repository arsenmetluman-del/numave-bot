const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8546026847:AAH_pznjiozig_HCvS7pgiOKz8EZD1XL0to';
const GAME_URL = 'https://numb123.vercel.app';
const VERCEL_URL = 'https://numave-bot.vercel.app';

const bot = new TelegramBot(TOKEN);

// Настройка Webhook — только один раз
async function setupWebhook() {
    try {
        await bot.setWebHook(`${VERCEL_URL}/api/webhook`);
        console.log('✅ Webhook установлен:', `${VERCEL_URL}/api/webhook`);
    } catch (e) {
        console.log('❌ Ошибка Webhook:', e.message);
    }
}

// Обработка /start
async function handleStart(msg) {
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

    try {
        await bot.sendMessage(chatId, text, { reply_markup: keyboard });
    } catch (e) {
        console.log('❌ Ошибка отправки:', e.message);
    }
}

// Основной обработчик (Vercel вызывает эту функцию)
module.exports = async (req, res) => {
    try {
        // Если GET-запрос — настраиваем Webhook
        if (req.method === 'GET') {
            await setupWebhook();
            return res.status(200).send('✅ NumAve Bot работает');
        }

        // Если POST — обрабатываем сообщение от Telegram
        if (req.method === 'POST') {
            const update = req.body;

            if (update.message && update.message.text === '/start') {
                await handleStart(update.message);
            }

            return res.status(200).send('OK');
        }

        res.status(405).send('Method not allowed');
    } catch (error) {
        console.log('❌ Ошибка:', error.message);
        res.status(500).send('Error');
    }
};
