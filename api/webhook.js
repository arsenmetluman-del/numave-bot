const TelegramBot = require('node-telegram-bot-api');

// ⚠️ ТОКЕН — твой из @BotFather
const TOKEN = '8546026847:AAHpj-UM-8fSHkoEP6vN4tlMvqqterNl8f0';
const GAME_URL = 'https://numb123.vercel.app';
const API_BASE = 'https://numb123.vercel.app';
const ADMIN_ID = '5775905262'; // Твой ID для поддержки

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

            // ===== ОБРАБОТКА ОПЛАТЫ STARS =====
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
                    await bot.sendMessage(ADMIN_ID, '💰 Новая оплата!\nИгрок: ' + userId + '\nСумма: ' + payment.total_amount + ' Stars');
                } catch (e) {
                    console.error('Payment error:', e);
                }
                return res.status(200).send('OK');
            }

            // ===== КОМАНДА /START =====
            if (update.message && update.message.text && update.message.text.startsWith('/start')) {
                const chatId = update.message.chat.id;
                const firstName = update.message.from.first_name || 'друг';
                const userId = 'tg_' + update.message.from.id;

                const text = update.message.text;
                const parts = text.split(' ');
                let refBonusMsg = '';

                if (parts.length > 1 && parts[1].startsWith('ref_')) {
                    const referrerId = parts[1].replace('ref_', '');

                    if (referrerId !== userId) {
                        try {
                            const checkUser = await fetch(API_BASE + '/api/user?userId=' + userId);
                            const userData = await checkUser.json();

                            const isNewUser = !userData || userData.total_spins === 0;

                            if (isNewUser) {
                                await fetch(API_BASE + '/api/user', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        userId: userId,
                                        balance: (userData.balance || 0) + 20
                                    })
                                });

                                const refUserRes = await fetch(API_BASE + '/api/user?userId=' + referrerId);
                                const refUser = await refUserRes.json();
                                if (refUser && !refUser.error) {
                                    await fetch(API_BASE + '/api/user', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            userId: referrerId,
                                            balance: (refUser.balance || 0) + 20
                                        })
                                    });
                                }

                                refBonusMsg = '\n\n🎁 Вы пришли по приглашению!\n💎 +20 Namcoin вам и пригласившему!';
                            } else {
                                refBonusMsg = '\n\n👋 Рады видеть снова!';
                            }
                        } catch (e) {
                            console.error('Ref error:', e);
                        }
                    }
                }

                const message = '👋 Добро пожаловать в NumAve, ' + firstName + '!\n\n' +
                    '📱 Крутите номера, собирайте редкие,\n' +
                    '💎 обменивайте на Namcoin.' + refBonusMsg + '\n\n' +
                    '👇 Нажми кнопку чтобы начать играть';

                const keyboard = {
                    inline_keyboard: [
                        [{ text: '🎮 Играть', web_app: { url: GAME_URL } }]
                    ]
                };

                await bot.sendMessage(chatId, message, { reply_markup: keyboard });
                return res.status(200).send('OK');
            }

            // ===== КОМАНДА /HELP (ПОДДЕРЖКА) =====
            if (update.message && update.message.text === '/help') {
                const chatId = update.message.chat.id;
                await bot.sendMessage(chatId, '🆘 Поддержка NumAve\n\nНапишите ваш вопрос прямо сюда, и мы ответим вам в этом чате.\n\nПожалуйста, опишите проблему подробно: что вы делали, что пошло не так, приложите скриншот, если возможно.');
                return res.status(200).send('OK');
            }

            // ===== ПЕРЕСЫЛКА СООБЩЕНИЙ В ПОДДЕРЖКУ =====
            if (update.message && update.message.text && !update.message.text.startsWith('/')) {
                const user = update.message.from;
                const userName = user.first_name || user.username || 'Игрок';
                const userId = user.id;
                
                try {
                    await bot.sendMessage(ADMIN_ID, 
                        '📩 Сообщение в поддержку:\n\n' +
                        '👤 От: ' + userName + ' (@' + (user.username || 'нет') + ')\n' +
                        '🆔 ID: ' + userId + '\n\n' +
                        '💬 ' + update.message.text
                    );
                    await bot.sendMessage(update.message.chat.id, '✅ Сообщение отправлено в поддержку. Мы ответим вам здесь.');
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
