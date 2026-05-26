require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`
  SELECT b.business_name, p.name,
    p.price, p.mrp,
    COALESCE(NULLIF(p.mrp::numeric, 0), NULLIF(p.price::numeric, 0), p.price) as display_price,
    CASE WHEN p.mrp > p.price AND p.mrp > 0 AND p.price > 0 THEN p.mrp ELSE NULL END as auto_compare_price
  FROM products p
  JOIN businesses b ON b.id = p.business_id
  WHERE p.is_active = true AND p.mrp > 0
  ORDER BY b.business_name, p.name
  LIMIT 20
`).then(r => {
  console.log('\n💰 mrp/price display logic test:');
  console.log('─'.repeat(90));
  r.rows.forEach(p => {
    console.log(
      `${p.business_name.substring(0,15).padEnd(16)} ${p.name.substring(0,25).padEnd(27)}` +
      ` price=${String(p.price).padEnd(8)} mrp=${String(p.mrp).padEnd(8)}` +
      ` display=${String(p.display_price).padEnd(8)} compare=${p.auto_compare_price || '(none)'}`
    );
  });
  if (!r.rows.length) console.log('  No products with mrp > 0 found.');
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
