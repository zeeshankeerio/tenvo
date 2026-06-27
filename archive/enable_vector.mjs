import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log("Vector extension enabled successfully");
  } catch (err) {
    console.error("Error enabling vector extension:", err);
  } finally {
    await client.end();
  }
}

main();
