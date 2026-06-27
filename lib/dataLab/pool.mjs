import pg from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add it to .env.local');
  }
  return url;
}

export function createPool() {
  const connectionString = getDatabaseUrl();
  const ssl =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false };
  return new pg.Pool({ connectionString, ssl });
}

/** @param {import('pg').PoolClient} client */
export async function withTransaction(client, fn) {
  await client.query('BEGIN');
  try {
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}
