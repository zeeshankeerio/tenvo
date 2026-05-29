import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications';
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

main();
