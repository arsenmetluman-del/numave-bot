export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const H = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY };

    try {
        if (req.method === 'GET') {
            const { userId } = req.query;
            if (!userId) return res.status(400).json({ error: 'userId required' });

            const r = await fetch(SUPABASE_URL + '/rest/v1/market_trades?to_user_id=eq.' + userId + '&status=eq.pending&select=*&order=created_at.desc', { headers: H });
            const trades = await r.json();
            return res.status(200).json({ trades: trades || [] });
        }

        if (req.method === 'POST') {
            const { action, fromUserId, fromNumber, fromRarity, toLotId, tradeId } = req.body;

            if (action === 'create') {
                if (!fromUserId || !toLotId || !fromNumber) return res.status(400).json({ error: 'missing fields' });

                const lotR = await fetch(SUPABASE_URL + '/rest/v1/market_lots?id=eq.' + toLotId + '&status=eq.active&select=*', { headers: H });
                const lots = await lotR.json();
                if (!lots || lots.length === 0) return res.status(404).json({ error: 'lot not found' });
                const lot = lots[0];

                if (lot.seller_id === fromUserId) return res.status(400).json({ error: 'cannot trade with yourself' });

                const existR = await fetch(SUPABASE_URL + '/rest/v1/market_trades?from_user_id=eq.' + fromUserId + '&to_lot_id=eq.' + toLotId + '&status=eq.pending&select=id', { headers: H });
                const existing = await existR.json();
                if (existing && existing.length > 0) return res.status(400).json({ error: 'trade already exists' });

                await fetch(SUPABASE_URL + '/rest/v1/market_trades', {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, H),
                    body: JSON.stringify({
                        from_user_id: fromUserId,
                        to_user_id: lot.seller_id,
                        from_number: fromNumber,
                        from_rarity: fromRarity,
                        to_lot_id: toLotId,
                        to_number: lot.number,
                        to_rarity: lot.rarity,
                        status: 'pending'
                    })
                });

                return res.status(200).json({ success: true });
            }

            if (action === 'accept') {
                if (!tradeId) return res.status(400).json({ error: 'tradeId required' });

                const trR = await fetch(SUPABASE_URL + '/rest/v1/market_trades?id=eq.' + tradeId + '&status=eq.pending&select=*', { headers: H });
                const trades = await trR.json();
                if (!trades || trades.length === 0) return res.status(404).json({ error: 'trade not found' });
                const trade = trades[0];

                const uR = await fetch(SUPABASE_URL + '/rest/v1/users?id=in.(' + trade.from_user_id + ',' + trade.to_user_id + ')&select=*', { headers: H });
                const users = await uR.json();
                const fromUser = users.find(function(u){ return u.id === trade.from_user_id; });
                const toUser = users.find(function(u){ return u.id === trade.to_user_id; });
                if (!fromUser || !toUser) return res.status(404).json({ error: 'users not found' });

                const fromInv = (fromUser.inventory || []).filter(function(i){ return i.number !== trade.from_number; });
                const toInv = (toUser.inventory || []).filter(function(i){ return i.number !== trade.to_number; });

                fromInv.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2,7), number: trade.to_number, rarity: trade.to_rarity, date: Date.now(), onMarket: false });
                toInv.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2,7), number: trade.from_number, rarity: trade.from_rarity, date: Date.now(), onMarket: false });

                await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + trade.from_user_id, {
                    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
                    body: JSON.stringify({ inventory: fromInv })
                });
                await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + trade.to_user_id, {
                    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
                    body: JSON.stringify({ inventory: toInv })
                });
                await fetch(SUPABASE_URL + '/rest/v1/market_lots?id=eq.' + trade.to_lot_id, {
                    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
                    body: JSON.stringify({ status: 'sold', buyer_id: trade.from_user_id, sold_at: new Date().toISOString() })
                });
                await fetch(SUPABASE_URL + '/rest/v1/market_trades?id=eq.' + tradeId, {
                    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
                    body: JSON.stringify({ status: 'accepted', resolved_at: new Date().toISOString() })
                });

                return res.status(200).json({ success: true });
            }

            if (action === 'reject') {
                if (!tradeId) return res.status(400).json({ error: 'tradeId required' });
                await fetch(SUPABASE_URL + '/rest/v1/market_trades?id=eq.' + tradeId, {
                    method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
                    body: JSON.stringify({ status: 'rejected', resolved_at: new Date().toISOString() })
                });
                return res.status(200).json({ success: true });
            }

            return res.status(400).json({ error: 'unknown action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
