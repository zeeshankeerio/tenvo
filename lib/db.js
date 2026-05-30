import 'server-only';
import fs from 'fs';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createTenantExtension } from '@/lib/prisma/tenantExtension';

const globalForDb = global;

/**
 * Postgres `ssl` option for `pg.Pool`.
 * - Local URLs (no TLS hints): SSL off.
 * - Hosted DBs (sslmode, known hosts, or DATABASE_SSL_CA_PATH): TLS on with verification by default.
 * - DATABASE_SSL_INSECURE=true or sslmode=no-verify: weak TLS (dev only).
 */
function getPoolSsl() {
  if (!process.env.DATABASE_URL) return false;
  if (process.env.DATABASE_SSL_DISABLE === 'true') return false;

  const url = process.env.DATABASE_URL.toLowerCase();
  const useTls =
    url.includes('sslmode=require') ||
    url.includes('sslmode=verify-full') ||
    url.includes('sslmode=no-verify') ||
    url.includes('.neon.tech') ||
    url.includes('supabase.co') ||
    url.includes('amazonaws.com') ||
    Boolean(process.env.DATABASE_SSL_CA_PATH);

  if (!useTls) return false;

  if (process.env.DATABASE_SSL_INSECURE === 'true' || url.includes('sslmode=no-verify')) {
    return { rejectUnauthorized: false };
  }

  const caPath = process.env.DATABASE_SSL_CA_PATH;
  if (caPath) {
    try {
      const ca = fs.readFileSync(caPath, 'utf8');
      return { rejectUnauthorized: true, ca };
    } catch (e) {
      console.error('[db] Failed to read DATABASE_SSL_CA_PATH:', caPath, e);
      throw e;
    }
  }

  return { rejectUnauthorized: true };
}

const pool =
  globalForDb.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy',
    ssl: getPoolSsl(),
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 20000,
    maxUses: 7500,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;

const prismaBase =
  globalForDb.prismaBase ||
  (() => {
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== 'production') globalForDb.prismaBase = prismaBase;

const db =
  globalForDb.prisma ||
  (() => {
    return prismaBase.$extends(createTenantExtension());
  })();

if (process.env.NODE_ENV !== 'production') globalForDb.prisma = db;

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export { pool, db, prismaBase };
export { withBusinessContext, getTenantBusinessId } from '@/lib/prisma/tenantExtension';
export default pool;