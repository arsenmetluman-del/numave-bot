export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        const { type } = req.query;
        const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,name,balance,inventory,total_spins,last_seen&limit=100`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const users = await usersRes.json();
        if (!users || users.length === 0) return res.status(200).json({ top: [], type: type || 'namcoin' });

        const now = new Date();
        let sorted = users.map(u => {
            let isOnline = false;
            if (u.last_seen) {
                const diff = (now - new Date(u.last_seen)) / 1000 / 60;
                isOnline = diff <= 5;
            }
            let score = 0, legendaryCount = 0;
            (u.inventory || []).forEach(item => {
                if (item.rarity === 'legendary') { score += 50; legendaryCount++; }
                else if (item.rarity === 'epic') score += 20;
                else if (item.rarity === 'rare') score += 5;
            });
            return {
                id: u.id, name: u.name, balance: u.balance || 0, total_spins: u.total_spins || 0,
                numbers_count: (u.inventory || []).length, legendary_count: legendaryCount,
                score: score, is_online: isOnline,
                best_number: (u.inventory && u.inventory.length > 0) ? u.inventory[0].number : null
            };
        });

        if (type === 'rare') sorted.sort((a, b) => b.score - a.score);
        else sorted.sort((a, b) => b.balance - a.balance);

        return res.status(200).json({ top: sorted.slice(0, 10), type: type || 'namcoin' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
