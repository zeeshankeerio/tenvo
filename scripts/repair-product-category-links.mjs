/**
 * Backfill product_categories + products.category_id after UUID schema align.
 * Run: bun scripts/repair-product-category-links.mjs [--domain demo-boutique]
 */
import { config } from 'dotenv';
import pg from 'pg';
import { syncProductCategoryLinks } from '../lib/dataLab/catalogSeed.mjs';

config({ path: '.env' });
config({ path: '.env.local', override: true });

const domainFilter = process.argv.includes('--domain')
  ? process.argv[process.argv.indexOf('--domain') + 1]
  : null;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
});

const client = await pool.connect();
try {
  const businesses = await client.query(
    domainFilter
      ? `SELECT id, domain FROM businesses WHERE LOWER(domain) = LOWER($1)`
      : `SELECT DISTINCT b.id, b.domain
         FROM businesses b
         JOIN products p ON p.business_id = b.id
         WHERE (p.is_deleted = false OR p.is_deleted IS NULL)
           AND p.category IS NOT NULL
           AND TRIM(p.category) <> ''
           AND (p.category_id IS NULL OR NOT EXISTS (
             SELECT 1 FROM product_categories c WHERE c.id = p.category_id
           ))
         ORDER BY b.domain`,
    domainFilter ? [domainFilter] : []
  );

  console.log(`Repairing ${businesses.rows.length} business(es)...`);
  for (const row of businesses.rows) {
    const result = await syncProductCategoryLinks(client, row.id);
    console.log(
      `${row.domain}: categories=${result.categoriesUpserted} linked=${result.productsLinked}`
    );
  }
  console.log('Done.');
} finally {
  client.release();
  await pool.end();
}
