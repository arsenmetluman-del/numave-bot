const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '8546026847:AAHpj-UM-8fSHkoEP6vN4tlMvqqterNl8f0';
const GAME_URL = 'https://numb123.vercel.app';
const API_BASE = 'https://numb123.vercel.app';
const ADMIN_ID = 5775905262;

const bot = new TelegramBot(TOKEN);

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') {
            const host = req.headers.host;
            const webhookUrl = 'https://' + host + '/api/webhook';
            await bot.setWebHook(webhookUrl);
            return res.status(200).send('✅ Работает');
        }
        if (req.method === 'POST') {
            const update = req.body;

            if (update.message && update.message.successful_payment) {
                const userId = 'tg_' + update.message.from.id;
                try {
                    const userRes = await fetch(API_BASE + '/api/user?userId=' + userId);
                    const userData = await userRes.json();
                    await fetch(API_BASE + '/api/user', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userId, balance: (userData.balance || 0) + 200 })
                    });
                    await bot.sendMessage(update.message.chat.id, '✅ Оплата получена! +200 NC.');
                } catch (e) {}
                return res.status(200).send('OK');
            }

            if (update.message && update.message.reply_to_message && update.message.from.id === ADMIN_ID) {
                const originalMessage = update.message.reply_to_message.text;
                if (originalMessage && originalMessage.includes('ID:')) {
                    const match = originalMessage.match(/ID:\s*(\d+)/);
                    if (match && match[1]) {
                        try { await bot.sendMessage(match[1], '💬 Ответ поддержки:\n\n' + update.message.text); } catch (e) {}
                    }
                }
                return res.status(200).send('OK');
            }

            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
                const chatId = update.message.chat.id;
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎮 Играть', web_app: { url: GAME_URL } }],
                        [{ text: '🆘 Поддержка', callback_data: 'support' }]
                    ]
                };
                await bot.sendMessage(chatId, '👋 Добро пожаловать!\n👇 Нажми кнопку чтобы начать.', { reply_markup: keyboard });
                return res.status(200).send('OK');
            }

            if (update.callback_query && update.callback_query.data === 'support') {
                await bot.answerCallbackQuery(update.callback_query.id);
                await bot.sendMessage(update.callback_query.message.chat.id, '🆘 Напишите ваш вопрос прямо сюда.');
                return res.status(200).send('OK');
            }

            if (update.message && update.message.text && update.message.from.id !== ADMIN_ID) {
                const userId = update.message.from.id;
                await bot.sendMessage(ADMIN_ID, '📩 Сообщение от ID: ' + userId + '\n\n' + update.message.text + '\n\n👇 Свайп влево, чтобы ответить.');
                await bot.sendMessage(update.message.chat.id, '✅ Отправлено в поддержку.');
                return res.status(200).send('OK');
            }
            return res.status(200).send('OK');
        }
        return res.status(200).send('OK');
    } catch (error) { return res.status(200).send('OK'); }
};
