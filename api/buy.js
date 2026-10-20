export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    try {
        const { buyerId, lotId } = req.body;

        if (!buyerId || !lotId) {
            return res.status(400).json({ error: 'buyerId, lotId required' });
        }

        // 1. Получить лот
        const lotRes = await fetch(
            `${SUPABASE_URL}/rest/v1/market_lots?id=eq.${lotId}&status=eq.active&select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const lots = await lotRes.json();

        if (!lots || lots.length === 0) {
            return res.status(404).json({ error: 'Lot not found or already sold' });
        }

        const lot = lots[0];

        // 2. Нельзя купить свой же лот
        if (lot.seller_id === buyerId) {
            return res.status(400).json({ error: 'Cannot buy your own lot' });
        }

        // 3. Получить данные покупателя
        const buyerRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?id=eq.${buyerId}&select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const buyers = await buyerRes.json();

        if (!buyers || buyers.length === 0) {
            return res.status(404).json({ error: 'Buyer not found' });
        }

        const buyer = buyers[0];

        // 4. Проверить баланс
        if ((buyer.balance || 0) < lot.price) {
            return res.status(400).json({ error: 'Not enough Namcoin' });
        }

        // 5. Получить данные продавца
        const sellerRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?id=eq.${lot.seller_id}&select=*`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const sellers = await sellerRes.json();

        if (!sellers || sellers.length === 0) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const seller = sellers[0];

        // ===== КОМИССИЯ 10% =====
        const price = parseInt(lot.price);
        const commission = Math.floor(price * 0.1); // 10% сгорает
        const sellerGets = price - commission;      // 90% продавцу

        // 6. Обновить покупателя: списать полную цену + добавить номер
        const newBuyerInventory = [...(buyer.inventory || []), {
            number: lot.number,
            rarity: lot.rarity,
            date: Date.now(),
            bought_from: lot.seller_id,
            price_paid: price
        }];

        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${buyerId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                balance: (buyer.balance || 0) - price,
                inventory: newBuyerInventory
            })
        });

        // ===== ФИКС: УДАЛЯЕМ НОМЕР У ПРОДАВЦА =====
        const sellerInventory = (seller.inventory || []).filter(function(item) {
            return item.number !== lot.number;
        });

        // 7. Обновить продавца: начислить 90% + удалить номер
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${lot.seller_id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                balance: (seller.balance || 0) + sellerGets,
                inventory: sellerInventory
            })
        });

        // 8. Пометить лот как проданный
        await fetch(`${SUPABASE_URL}/rest/v1/market_lots?id=eq.${lotId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'sold',
                buyer_id: buyerId,
                sold_at: new Date().toISOString()
            })
        });

        // 9. Записать в историю
        await fetch(`${SUPABASE_URL}/rest/v1/market_history`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lot_id: lotId,
                number: lot.number,
                rarity: lot.rarity,
                price: price,
                commission: commission,
                seller_got: sellerGets,
                seller_id: lot.seller_id,
                buyer_id: buyerId,
                sold_at: new Date().toISOString()
            })
        });

        return res.status(200).json({
            success: true,
            number: lot.number,
            rarity: lot.rarity,
            price: price,
            commission: commission,
            sellerGot: sellerGets,
            newBalance: (buyer.balance || 0) - price
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
