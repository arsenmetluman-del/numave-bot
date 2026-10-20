export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        const { rarity, sort, limit } = req.query;

        // Базовая выборка
        let url = `${SUPABASE_URL}/rest/v1/market_lots?status=eq.active&select=*`;

        // Фильтр по редкости
        if (rarity && rarity !== 'all') {
            url += `&rarity=eq.${rarity}`;
        }

        // Сортировка
        if (sort === 'cheap') {
            url += '&order=price.asc';
        } else if (sort === 'expensive') {
            url += '&order=price.desc';
        } else {
            url += '&order=created_at.desc';
        }

        // Лимит
        const maxLimit = Math.min(parseInt(limit) || 50, 100);
        url += `&limit=${maxLimit}`;

        const lotsRes = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const lots = await lotsRes.json();

        if (!lots || lots.length === 0) {
            return res.status(200).json({ lots: [], total: 0 });
        }

        // Получить информацию о продавцах
        const sellerIds = [...new Set(lots.map(l => l.seller_id))];
        const sellersRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?id=in.(${sellerIds.join(',')})&select=id,total_spins,inventory`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const sellers = await sellersRes.json();

        const sellersMap = {};
        sellers.forEach(s => {
            sellersMap[s.id] = {
                id: s.id,
                total_spins: s.total_spins || 0,
                numbers_count: (s.inventory || []).length
            };
        });

        // Обогатить лоты данными продавцов
        const enrichedLots = lots.map(lot => ({
            ...lot,
            seller: sellersMap[lot.seller_id] || { id: lot.seller_id, total_spins: 0, numbers_count: 0 }
        }));

        return res.status(200).json({ lots: enrichedLots, total: enrichedLots.length });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
