const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8546026847:AAHpj-UM-8fSHkoEP6vN4tlMvqqterNl8f0';
const GAME_URL = 'https://numb123.vercel.app';
const API_BASE = 'https://numb123.vercel.app';

// Твой ID (только для пересылки, игроки его не видят)
const ADMIN_ID = 5775905262; 

const bot = new TelegramBot(TOKEN);

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') {
            const host = req.headers.host;
            const webhookUrl = 'https://' + host + '/api/webhook';
            await bot.setWebHook(webhookUrl);
            return res.status(200).send('✅ NumAve Bot работает. Webhook: ' + webhookUrl);
        }

        if (req.method === 'POST') {
            const update = req.body;

            // 1. ОПЛАТА STARS
            if (update.message && update.message.successful_payment) {
                const payment = update.message.successful_payment;
                const userId = 'tg_' + update.message.from.id;
                try {
                    const userRes = await fetch(API_BASE + '/api/user?userId=' + userId);
                    const userData = await userRes.json();
                    const newBalance = (userData.balance || 0) + 200;
                    
                    await fetch(API_BASE + '/api/user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userId, balance: newBalance })
                    });
                    
                    await bot.sendMessage(update.message.chat.id, '✅ Оплата получена! +200 NC зачислено на ваш баланс.');
                    await bot.sendMessage(ADMIN_ID, '💰 Новая оплата от ID: ' + userId + ' на ' + payment.total_amount + ' Stars.');
                } catch (e) {
                    console.error('Payment error:', e);
                }
                return res.status(200).send('OK');
            }

            // 2. ОТВЕТ ИГРОКУ (когда ты делаешь реплай на сообщение бота)
            if (update.message && update.message.reply_to_message && update.message.from.id === ADMIN_ID) {
                const originalMessage = update.message.reply_to_message.text;
                if (originalMessage && originalMessage.includes('ID:')) {
                    const match = originalMessage.match(/ID:\s*(\d+)/);
                    if (match && match[1]) {
                        const targetUserId = match[1];
                        try {
                            await bot.sendMessage(targetUserId, '💬 Ответ поддержки:\n\n' + update.message.text);
                            await bot.sendMessage(ADMIN_ID, '✅ Ответ отправлен игроку ' + targetUserId);
                        } catch (e) {
                            await bot.sendMessage(ADMIN_ID, '❌ Ошибка: игрок заблокировал бота.');
                        }
                    }
                }
                return res.status(200).send('OK');
            }

            // 3. КОМАНДА /START И КНОПКИ ПОД НЕЙ
            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
                const chatId = update.message.chat.id;
                const firstName = update.message.from.first_name || 'друг';
                
                // Вот здесь создаются ДВЕ кнопки
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎮 Играть', web_app: { url: GAME_URL } }],
                        [{ text: '🆘 Поддержка', callback_data: 'support' }]
                    ]
                };

                await bot.sendMessage(chatId, '👋 Добро пожаловать в NumAve, ' + firstName + '!\n\n👇 Нажми кнопку чтобы начать или обратись в поддержку.', { reply_markup: keyboard });
                return res.status(200).send('OK');
            }

            // 4. НАЖАТИЕ НА КНОПКУ "ПОДДЕРЖКА"
            if (update.callback_query && update.callback_query.data === 'support') {
                await bot.answerCallbackQuery(update.callback_query.id);
                await bot.sendMessage(update.callback_query.message.chat.id, '🆘 Напишите ваш вопрос прямо сюда одним сообщением. Мы ответим вам в этом чате.');
                return res.status(200).send('OK');
            }

            // 5. ПЕРЕСЫЛКА СООБЩЕНИЙ ТЕБЕ
            if (update.message && update.message.text && update.message.from.id !== ADMIN_ID) {
                const user = update.message.from;
                const userName = user.first_name || 'Игрок';
                const userId = user.id;
                
                try {
                    const adminText = '📩 Сообщение от: ' + userName + '\nID: ' + userId + '\n\n' + update.message.text + '\n\n👇 Чтобы ответить, сделайте свайп влево на этом сообщении.';
                    await bot.sendMessage(ADMIN_ID, adminText);
                    await bot.sendMessage(update.message.chat.id, '✅ Сообщение отправлено в поддержку. Мы ответим здесь.');
                } catch (e) {
                    console.error('Support error:', e);
                }
                
                return res.status(200).send('OK');
            }

            return res.status(200).send('OK');
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('Error:', error);
        return res.status(200).send('OK');
    }
};
