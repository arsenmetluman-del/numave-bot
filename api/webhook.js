const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '8546026847:AAGAVauAlKE82oriwCY_ZD3v8mE6g3A2VRE'; // Твой НОВЫЙ токен
const GAME_URL = 'https://numave-bot.vercel.app/game.html';
const API_BASE = 'https://numave-bot.vercel.app';
const ADMIN_ID = 5775905262;

const STARS_PRICE = 50;
const NC_REWARD = 200;

const bot = new TelegramBot(TOKEN);
const supportUsers = new Set(); // Запоминаем, кто нажал "Поддержка"

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') {
            await bot.setWebHook('https://' + req.headers.host + '/api/webhook');
            return res.status(200).send('✅ Работает');
        }

        if (req.method === 'POST') {
            const update = req.body;

            // 1. АВТО-ОПЛАТА ЗВЁЗДАМИ
            if (update.message && update.message.successful_payment) {
                const payment = update.message.successful_payment;
                const userId = 'tg_' + update.message.from.id;
                const chatId = update.message.chat.id;
                if (payment.currency === 'XTR' && payment.total_amount === STARS_PRICE) {
                    try {
                        const userRes = await fetch(API_BASE + '/api/user?userId=' + userId);
                        const userData = await userRes.json();
                        await fetch(API_BASE + '/api/user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: userId, balance: (userData.balance || 0) + NC_REWARD })
                        });
                        await bot.sendMessage(chatId, `✅ Оплата получена!\n⭐ Списано: ${STARS_PRICE} звёзд\n💰 Начислено: +${NC_REWARD} NC`);
                    } catch (e) {}
                }
                return res.status(200).send('OK');
            }

            // 2. ОТВЕТ ПОДДЕРЖКИ (когда ты свайпаешь и отвечаешь на сообщение с ID)
            if (update.message && update.message.reply_to_message && update.message.from.id === ADMIN_ID) {
                const originalMessage = update.message.reply_to_message.text;
                if (originalMessage && originalMessage.includes('ID:')) {
                    const match = originalMessage.match(/ID:\s*(\d+)/);
                    if (match && match[1]) {
                        try { 
                            await bot.sendMessage(match[1], '💬 Ответ поддержки:\n\n' + update.message.text); 
                        } catch (e) {
                            await bot.sendMessage(ADMIN_ID, '❌ Не удалось отправить сообщение пользователю. Возможно, он заблокировал бота.');
                        }
                    }
                }
                return res.status(200).send('OK');
            }

            // 3. КОМАНДА /start
            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
                const chatId = update.message.chat.id;
                supportUsers.delete(chatId); // Сбрасываем режим поддержки
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎮 Играть', web_app: { url: GAME_URL } }],
                        [{ text: '🆘 Поддержка', callback_data: 'support' }]
                    ]
                };
                await bot.sendMessage(chatId, `👋 Добро пожаловать в игру!\n\nКрути барабан, собирай номера и продавай их!`, { reply_markup: keyboard });
                return res.status(200).send('OK');
            }

            // 4. НАЖАТИЕ КНОПКИ "ПОДДЕРЖКА"
            if (update.callback_query && update.callback_query.data === 'support') {
                const chatId = update.callback_query.message.chat.id;
                supportUsers.add(chatId); // Включаем режим ожидания сообщения
                await bot.answerCallbackQuery(update.callback_query.id);
                await bot.sendMessage(chatId, '🆘 Напишите ваш вопрос прямо сюда. Мы скоро ответим!');
                return res.status(200).send('OK');
            }

            // 5. ПОЛЬЗОВАТЕЛЬ ПИШЕТ В ПОДДЕРЖКУ
            if (update.message && update.message.text && update.message.from.id !== ADMIN_ID && !update.message.successful_payment) {
                const chatId = update.message.chat.id;
                
                // Если пользователь нажал кнопку "Поддержка", пересылаем тебе
                if (supportUsers.has(chatId)) {
                    await bot.sendMessage(ADMIN_ID, '📩 Сообщение от ID: ' + chatId + '\n\n' + update.message.text + '\n\n👇 Свайп влево, чтобы ответить.');
                    await bot.sendMessage(chatId, '✅ Отправлено в поддержку. Ожидайте ответа.');
                    supportUsers.delete(chatId); // Выключаем режим после отправки
                } else {
                    // Если пишет что-то не по делу
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
