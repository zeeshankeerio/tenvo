/**
 * Remove all tenant/business data. Preserves auth users (user, session, account, verification, twoFactor).
 */
import { createPool } from './pool.mjs';

const PRESERVED_TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'twoFactor',
  'platform_feature_flags',
  'platform_feature_flag_overrides',
];

/**
 * @param {{ confirm?: boolean, keepDomains?: string[] }} options
 */
export async function purgeAllBusinessData(options = {}) {
  if (!options.confirm) {
    throw new Error(
      'Refusing to purge without confirmation. Pass --confirm PURGE_ALL_BUSINESS_DATA'
    );
  }

  const pool = createPool();
  const client = await pool.connect();

  try {
    const before = await client.query('SELECT COUNT(*)::int AS c FROM businesses');
    const count = before.rows[0]?.c ?? 0;

    if (options.keepDomains?.length) {
      const domains = options.keepDomains.map((d) => String(d).trim().toLowerCase()).filter(Boolean);
      await client.query(
        `DELETE FROM businesses WHERE LOWER(domain) <> ALL($1::text[])`,
        [domains]
      );
      console.log(`Removed businesses except domains: ${domains.join(', ')}`);
    } else {
      await client.query('DELETE FROM businesses');
      console.log(`Deleted ${count} business(es) and cascaded tenant data.`);
    }

    const after = await client.query('SELECT COUNT(*)::int AS c FROM businesses');
    console.log(`Businesses remaining: ${after.rows[0]?.c ?? 0}`);
    console.log(`Preserved auth/platform tables: ${PRESERVED_TABLES.join(', ')}`);

    return { deleted: count - (after.rows[0]?.c ?? 0), remaining: after.rows[0]?.c ?? 0 };
  } finally {
    client.release();
    await pool.end();
  }
}
