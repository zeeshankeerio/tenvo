import 'server-only';

import { Redis as UpstashRedis } from '@upstash/redis';

/**
 * Distributed Redis — Upstash REST (serverless/Vercel) or ioredis TCP (VPC ElastiCache).
 *
 * Upstash (recommended on Vercel): UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * @see https://upstash.com/docs/redis/howto/connect-client
 *
 * VPC ElastiCache: REDIS_ENABLED=true + REDIS_URL on compute in the same VPC.
 *
 * Use Redis only for small, high-churn keys (domain index, rate limits). Storefront
 * catalog and settings stay in Next.js Data Cache + Vercel Runtime Cache to preserve
 * Upstash free-tier storage (256 MB) and command budget.
 */

/** @type {import('@upstash/redis').Redis | null} */
let upstashClient = null;

/** @type {import('ioredis').default | null} */
let ioredisClient = null;

/** @type {boolean} */
let connectFailed = false;

/**
 * @returns {boolean}
 */
export function hasUpstashRedis() {
  if (process.env.REDIS_DISABLED === 'true') return false;
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/**
 * @returns {boolean}
 */
export function isVpcRedisConfigured() {
  if (process.env.REDIS_DISABLED === 'true') return false;
  if (process.env.REDIS_ENABLED !== 'true') return false;
  return Boolean(process.env.REDIS_URL?.trim());
}

/**
 * @returns {boolean}
 */
export function isRedisConfigured() {
  return hasUpstashRedis() || isVpcRedisConfigured();
}

/**
 * @returns {import('@upstash/redis').Redis | null}
 */
function getUpstashClient() {
  if (!hasUpstashRedis() || connectFailed) return null;
  if (upstashClient) return upstashClient;

  upstashClient = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL.trim(),
    token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
    automaticDeserialization: false,
  });
  return upstashClient;
}

/**
 * @param {string} redisUrl
 * @returns {{ host: string; port: number; tls: boolean; password?: string }}
 */
export function parseRedisUrl(redisUrl) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    tls: url.protocol === 'rediss:' || url.protocol === 'redis:',
    password: url.password || undefined,
  };
}

/**
 * Lazy singleton — ioredis single-node (not Cluster; Upstash/ElastiCache Serverless use one endpoint).
 * @returns {Promise<import('ioredis').default | null>}
 */
export async function getRedisClient() {
  if (!isVpcRedisConfigured() || connectFailed) return null;
  if (ioredisClient) return ioredisClient;

  try {
    const Redis = (await import('ioredis')).default;
    const url = process.env.REDIS_URL.trim();

    ioredisClient = new Redis(url, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      ...(url.startsWith('rediss://') ? { tls: {} } : {}),
    });

    ioredisClient.on('error', (err) => {
      console.warn('[redis] ioredis error:', err?.message || err);
    });

    await ioredisClient.connect();
    return ioredisClient;
  } catch (error) {
    connectFailed = true;
    ioredisClient = null;
    console.warn('[redis] ioredis unavailable:', error?.message);
    return null;
  }
}

/**
 * @param {string} key
 * @returns {Promise<string | null>}
 */
export async function redisGet(key) {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      const value = await upstash.get(key);
      if (value == null) return null;
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return null;
    }
  }

  const client = await getRedisClient();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 * @param {number} ttlSec
 */
export async function redisSetEx(key, value, ttlSec) {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      await upstash.set(key, value, { ex: ttlSec });
      return true;
    } catch {
      return false;
    }
  }

  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.set(key, value, 'EX', ttlSec);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 */
export async function redisDel(key) {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      await upstash.del(key);
      return true;
    } catch {
      return false;
    }
  }

  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 */
export async function redisIncr(key) {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      return await upstash.incr(key);
    } catch {
      return null;
    }
  }

  const client = await getRedisClient();
  if (!client) return null;
  try {
    return await client.incr(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {number} ttlSec
 */
export async function redisExpire(key, ttlSec) {
  const upstash = getUpstashClient();
  if (upstash) {
    try {
      await upstash.expire(key, ttlSec);
      return true;
    } catch {
      return false;
    }
  }

  const client = await getRedisClient();
  if (!client) return false;
  try {
    await client.expire(key, ttlSec);
    return true;
  } catch {
    return false;
  }
}
