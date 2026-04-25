const { Client } = require('pg');

async function seedData() {
    const client = new Client({
        connectionString: "postgresql://postgres.uhzmfcftoqihbpoqskov:Karachi021001123@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        const res = await client.query(`
            SELECT b.id, b.business_name, b.category, b.domain 
            FROM businesses b 
            JOIN "user" u ON b.user_id = u.id 
            WHERE u.email = 'zeeshan.keerio@mindscapeanalytics.com';
        `);
        console.log("Found businesses:", res.rows.length);

        if (res.rows.length === 0) {
            console.log("No business found for this owner.");
            return;
        }

        for (const biz of res.rows) {
            console.log(`Seeding for ${biz.business_name} (${biz.category})...`);

            const dummyProducts = [];

            if (biz.category === 'supermarket' || biz.category === 'retail-shop' || biz.domain?.includes('super-store')) {
                dummyProducts.push(
                    { name: 'Coca Cola 1.5L', sku: 'BEV-001', barcode: '8901234567890', category: 'beverages', price: 150, cost_price: 120, stock: 100, image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&auto=format&fit=crop', is_weight_item: false },
                    { name: 'Lays Classic Chips (Large)', sku: 'SNK-001', barcode: '8901234567891', category: 'snacks', price: 100, cost_price: 80, stock: 150, image_url: 'https://images.unsplash.com/photo-1566478989037-e624b0e253bf?q=80&w=400&auto=format&fit=crop', is_weight_item: false },
                    { name: 'Organic Fresh Milk 1L', sku: 'DAI-001', barcode: '8901234567892', category: 'dairy', price: 220, cost_price: 180, stock: 50, image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=400&auto=format&fit=crop', is_weight_item: false },
                    { name: 'Fresh Red Apples', sku: 'FR-001', barcode: '8901234567893', category: 'fresh', price: 300, cost_price: 200, stock: 30, image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?q=80&w=400&auto=format&fit=crop', is_weight_item: true, unit: 'kg' },
                    { name: 'French Croissant 4-Pack', sku: 'BAK-001', barcode: '8901234567894', category: 'bakery', price: 400, cost_price: 250, stock: 25, image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400&auto=format&fit=crop', is_weight_item: false }
                );
            }

            if (biz.category?.includes('restaurant') || biz.category?.includes('cafe') || biz.category?.includes('hospitality') || biz.domain?.includes('kitchen')) {
                dummyProducts.push(
                    { name: 'Double Cheese Burger', sku: 'M-001', barcode: 'REST-001', category: 'Main Course', price: 850, cost_price: 450, stock: 1000, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop', is_weight_item: false },
                    { name: 'Wood-fired Pepperoni Pizza', sku: 'M-002', barcode: 'REST-002', category: 'Main Course', price: 1450, cost_price: 600, stock: 1000, image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=400&auto=format&fit=crop', is_weight_item: false },
                    { name: 'Chocolate Lava Cake', sku: 'D-001', barcode: 'REST-003', category: 'Desserts', price: 550, cost_price: 200, stock: 1000, image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=400&auto=format&fit=crop', is_weight_item: false },
                    { name: 'Mint Lemonade', sku: 'B-001', barcode: 'REST-004', category: 'Beverages', price: 350, cost_price: 100, stock: 1000, image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=400&auto=format&fit=crop', is_weight_item: false }
                );
            }

            for(const item of dummyProducts) {
                const exists = await client.query('SELECT id FROM products WHERE business_id = $1 AND (sku = $2 OR barcode = $3)', [biz.id, item.sku, item.barcode]);
                if (exists.rows.length === 0) {
                    await client.query(`
                        INSERT INTO products (business_id, name, sku, barcode, category, price, cost_price, stock, image_url, domain_data, tax_percent, is_active, unit)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
                    `, [
                        biz.id, item.name, item.sku, item.barcode, item.category, item.price, item.cost_price, item.stock, item.image_url, 
                        JSON.stringify({ is_weight_item: item.is_weight_item }), 18, item.unit || 'pcs'
                    ]);
                    console.log(`Inserted: ${item.name}`);
                } else {
                    console.log(`Skipped existing: ${item.name}`);
                }
            }
        }
        
    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

seedData();
