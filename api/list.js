export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        const { userId, number, rarity, price } = req.body;
        if (!userId || !number || !price) return res.status(400).json({ error: 'userId, number, price required' });
        const priceNum = parseInt(price);
        if (isNaN(priceNum) || priceNum < 5 || priceNum > 100000) return res.status(400).json({ error: 'Price must be 5-100000' });

        const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=inventory`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const users = await userRes.json();
        if (!users || users.length === 0) return res.status(404).json({ error: 'User not found' });

        const inventory = users[0].inventory || [];
        const itemIndex = inventory.findIndex(item => item.number === number);
        if (itemIndex === -1) return res.status(400).json({ error: 'Number not in inventory' });

        // ✅ Ставим флаг onMarket вместо удаления
        inventory[itemIndex].onMarket = true;
        inventory[itemIndex].marketPrice = priceNum;

        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventory })
        });

        await fetch(`${SUPABASE_URL}/rest/v1/market_lots`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ seller_id: userId, number: number, rarity: rarity || 'common', price: priceNum, status: 'active', created_at: new Date().toISOString() })
        });

        return res.status(200).json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
