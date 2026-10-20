export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        if (req.method === 'GET') {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: 'userId required' });

            const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=*`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            let users = await userRes.json();

            if (!users || users.length === 0) {
                const newUser = {
                    id: userId, balance: 0, spins_free: 50, inventory: [],
                    total_spins: 0, referrals: [], name: null, last_bonus_date: null,
                    tasks: { spins: 0, claimed: 0, sold: 0, claimedFlags: {} },
                    streak: 0, last_visit_date: null, last_seen: new Date().toISOString(),
                    timer_end: null
                };
                await fetch(`${SUPABASE_URL}/rest/v1/users`, {
                    method: 'POST',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                    body: JSON.stringify(newUser)
                });
                users = [newUser];
            } else {
                await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ last_seen: new Date().toISOString() })
                });
            }
            return res.status(200).json(users[0]);
        }

        if (req.method === 'POST') {
            const { userId, balance, spins_free, inventory, total_spins, referrals, name, last_bonus_date, tasks, streak, last_visit_date, timer_end } = req.body;
            if (!userId) return res.status(400).json({ error: 'userId required' });

            const updateData = { last_seen: new Date().toISOString() };
            if (balance !== undefined) updateData.balance = balance;
            if (spins_free !== undefined) updateData.spins_free = spins_free;
            if (inventory !== undefined) updateData.inventory = inventory;
            if (total_spins !== undefined) updateData.total_spins = total_spins;
            if (referrals !== undefined) updateData.referrals = referrals;
            if (name !== undefined) updateData.name = name;
            if (last_bonus_date !== undefined) updateData.last_bonus_date = last_bonus_date;
            if (tasks !== undefined) updateData.tasks = tasks;
            if (streak !== undefined) updateData.streak = streak;
            if (last_visit_date !== undefined) updateData.last_visit_date = last_visit_date;
            if (timer_end !== undefined) updateData.timer_end = timer_end;  // ✅ ДОБАВЛЕНО

            await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            return res.status(200).json({ success: true });
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
