import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'businesses'
    `);
    console.log('Columns in businesses:');
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    pool.end();
  }
}

main();
