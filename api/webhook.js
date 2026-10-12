const TelegramBot = require('node-telegram-bot-api');

// ⚠️ ТОКЕН — вставь свой из @BotFather
const TOKEN = '8546026847:AAGY6ak0bzzY1Kw5-tOPSRBhmeX8lgQnf9c';
const GAME_URL = 'https://numb123.vercel.app';
const API_BASE = 'https://numb123.vercel.app';

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
                                        balance: (userData.balance || 49) + 20
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
                                            balance: (refUser.balance || 49) + 20
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
            }

            return res.status(200).send('OK');
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('Error:', error);
        return res.status(200).send('OK');
    }
};
