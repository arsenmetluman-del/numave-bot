const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '8546026847:AAHpj-UM-8fSHkoEP6vN4tlMvqqterNl8f0';
const GAME_URL = 'https://numb123.vercel.app';
const API_BASE = 'https://numb123.vercel.app';
const ADMIN_ID = 5775905262;

const bot = new TelegramBot(TOKEN);

// Временное хранилище тех, кто нажал "Поддержка"
const supportUsers = new Set();

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

            // 1. Оплата
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

            // 2. Ответ админа (поддержка)
            if (update.message && update.message.reply_to_message && update.message.from.id === ADMIN_ID) {
                const originalMessage = update.message.reply_to_message.text;
                if (originalMessage && originalMessage.includes('ID:')) {
                    const match = originalMessage.match(/ID:\s*(\d+)/);
                    if (match && match[1]) {
                        try { 
                            await bot.sendMessage(match[1], '💬 Ответ поддержки:\n\n' + update.message.text); 
                        } catch (e) {}
                    }
                }
                return res.status(200).send('OK');
            }

            // 3. Команда /start
            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
                const chatId = update.message.chat.id;
                supportUsers.delete(chatId); // Сбрасываем режим поддержки
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎮 Играть', web_app: { url: GAME_URL } }],
                        [{ text: '🆘 Поддержка', callback_data: 'support' }]
                    ]
                };
                const startText = `👋 Добро пожаловать в игру!\n\nЗдесь ты можешь крутить барабан, собирать редкие числа и продавать их на маркете.\n👇 Нажми кнопку ниже, чтобы начать!`;
                await bot.sendMessage(chatId, startText, { reply_markup: keyboard });
                return res.status(200).send('OK');
            }

            // 4. Нажатие кнопки "Поддержка"
            if (update.callback_query && update.callback_query.data === 'support') {
                const chatId = update.callback_query.message.chat.id;
                supportUsers.add(chatId); // Включаем режим поддержки
                await bot.answerCallbackQuery(update.callback_query.id);
                await bot.sendMessage(chatId, '🆘 Напишите ваш вопрос прямо сюда. Мы скоро ответим!');
                return res.status(200).send('OK');
            }

            // 5. Обычные сообщения
            if (update.message && update.message.text && update.message.from.id !== ADMIN_ID) {
                const chatId = update.message.chat.id;
                
                // Если пользователь нажал "Поддержка" - отправляем админу
                if (supportUsers.has(chatId)) {
                    await bot.sendMessage(ADMIN_ID, '📩 Сообщение от ID: ' + chatId + '\n\n' + update.message.text + '\n\n👇 Свайп влево, чтобы ответить.');
                    await bot.sendMessage(chatId, '✅ Отправлено в поддержку. Ожидайте ответа.');
                    supportUsers.delete(chatId); // Выключаем режим после отправки
                } else {
                    // Если просто пишет боту что-то не по делу
                    await bot.sendMessage(chatId, '🤖 Я тебя не понимаю. Нажми /start, чтобы открыть меню.');
                }
                return res.status(200).send('OK');
            }
            return res.status(200).send('OK');
        }
        return res.status(200).send('OK');
    } catch (error) { 
        return res.status(200).send('OK'); 
    }
};
