export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        const { userId, rarity, limit } = req.query;

        // Базовая выборка
        let url = `${SUPABASE_URL}/rest/v1/market_history?select=*`;

        // Фильтр по редкости
        if (rarity && rarity !== 'all') {
            url += `&rarity=eq.${rarity}`;
        }

        // Сортировка — свежие сверху
        url += '&order=sold_at.desc';

        // Лимит
        const maxLimit = Math.min(parseInt(limit) || 30, 100);
        url += `&limit=${maxLimit}`;

        const historyRes = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const history = await historyRes.json();

        if (!history || history.length === 0) {
            return res.status(200).json({ history: [], total: 0, userStats: null });
        }

        // Статистика игрока (если передан userId)
        let userStats = null;
        if (userId) {
            const userHistory = history.filter(h => h.buyer_id === userId || h.seller_id === userId);

            const bought = userHistory.filter(h => h.buyer_id === userId);
            const sold = userHistory.filter(h => h.seller_id === userId);

            userStats = {
                bought_count: bought.length,
                sold_count: sold.length,
                total_spent: bought.reduce((sum, h) => sum + (h.price || 0), 0),
                total_earned: sold.reduce((sum, h) => sum + (h.price || 0), 0)
            };
        }

        return res.status(200).json({
            history,
            total: history.length,
            userStats
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
