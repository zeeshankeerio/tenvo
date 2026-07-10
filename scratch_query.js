import { pool } from './lib/db.js';

async function run() {
  const result = await pool.query('SELECT id, business_name, domain, category, is_active FROM businesses LIMIT 20');
  console.log(result.rows);
  process.exit(0);
}

run().catch(console.error);
