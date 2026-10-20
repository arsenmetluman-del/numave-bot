export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        // Найти игрока или создать
        const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        let users = await userRes.json();

        if (!users || users.length === 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ id: userId, balance: 0, spins_free: 50, inventory: [], total_spins: 0 })
            });
            users = [{ id: userId, balance: 49, spins_free: 50, inventory: [], total_spins: 0 }];
        }

        const user = users[0];
        
        // Проверка прокрутов
        if (user.spins_free <= 0 && user.balance < 1) {
            return res.status(400).json({ error: 'Not enough spins' });
        }

        // Списать
        const newSpinsFree = user.spins_free > 0 ? user.spins_free - 1 : user.spins_free;
        const newBalance = user.spins_free > 0 ? user.balance : user.balance - 1;

        // ===== НОВЫЕ ШАНСЫ =====
        // Обычный 90%, Редкий 7.8%, Эпический 2%, Легендарный 0.2%
        const rand = Math.random() * 100;
        let rarity;
        if (rand <= 90) rarity = 'common';
        else if (rand <= 97.8) rarity = 'rare';
        else if (rand <= 99.8) rarity = 'epic';
        else rarity = 'legendary';

        // Номер
        const number = generatePhoneNumber(rarity);

        // Обновить
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spins_free: newSpinsFree,
                balance: newBalance,
                total_spins: (user.total_spins || 0) + 1
            })
        });

        res.status(200).json({ number, rarity });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

function generatePhoneNumber(rarity) {
    const operators = ['900','901','902','903','904','905','906','908','909','910','911','912','913','914','915','916','917','918','919','920','921','922','923','924','925','926','927','928','929','930','931','932','933','934','935','936','937','938','939','950','951','952','953','954','955','956','957','958','959'];
    const lucky = ['777','333','999','888','555','111'];
    const rnd = (a,b) => Math.floor(a + Math.random() * (b - a + 1));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const pad = (n,l) => String(n).padStart(l, '0');
    
    let code, p1, p2, p3;
    
    if (rarity === 'legendary') {
        code = pick(['777','999','333','888','111']);
        p1 = pick(['991','191','119','771','717','177','331','313','133','881','818','188']);
        const pair = pick(['19','91','17','71','13','31','18','81','15','51']);
        p2 = pair; p3 = pair;
    } else if (rarity === 'epic') {
        code = Math.random() < 0.5 ? pick(['333','777','999','888','555','111']) : pick(operators);
        p1 = Math.random() < 0.6 ? pick(['100','200','300','500','700','900','111','222','333']) : String(rnd(100,999));
        p2 = Math.random() < 0.6 ? pick(['10','20','30','50','70','90','11','22','33']) : pad(rnd(1,99),2);
        p3 = Math.random() < 0.6 ? pick(['10','20','30','50','70','90','11','22','33']) : pad(rnd(1,99),2);
    } else if (rarity === 'rare') {
        code = pick(operators);
        p1 = String(rnd(100,999));
        const pair = pick(['11','22','33','44','55','66','77','88','99','00']);
        p2 = Math.random() < 0.5 ? pair : pad(rnd(1,99),2);
        p3 = Math.random() < 0.5 ? pair : pad(rnd(1,99),2);
    } else {
        code = pick(operators);
        p1 = String(rnd(100,999));
        p2 = pad(rnd(1,99),2);
        p3 = pad(rnd(1,99),2);
    }
    
    return `+7 (${code}) ${p1}-${p2}-${p3}`;
}
