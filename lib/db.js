import 'server-only';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Optimized connection pool for enterprise load
const globalForDb = global;

const pool = globalForDb.pgPool || new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Enterprise pool settings
    max: 20,                   // Balanced for Supabase connection limits
    idleTimeoutMillis: 60000,   // Wait longer before closing idle connections
    connectionTimeoutMillis: 20000, // Increased to 20s to prevent Supabase timeout errors
    maxUses: 7500,             // Close and replace connection after 7500 uses to prevent memory leaks
});

if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool;

// Prisma Client with pg-adapter for edge-compatibility and better connection management
const db = globalForDb.prisma || (() => {
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
})();

if (process.env.NODE_ENV !== 'production') globalForDb.prisma = db;

// Helper for debugging pool exhaustion
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export { pool, db };
export default pool;

