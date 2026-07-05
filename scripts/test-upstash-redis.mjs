/**
 * Smoke-test Upstash Redis connectivity (uses UPSTASH_REDIS_REST_* from env).
 * Run: node --env-file=.env.local scripts/test-upstash-redis.mjs
 * Or:  node --env-file=.env scripts/test-upstash-redis.mjs
 */

import { Redis } from '@upstash/redis';
import { domainIndexKey } from '../lib/cache/redisKeys.js';
import { REDIS_TTL } from '../lib/cache/redisTtl.js';

const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const redis = new Redis({ url, token, automaticDeserialization: false });
const probeKey = domainIndexKey('__upstash_probe__');

try {
  await redis.set(probeKey, 'ok', { ex: 30 });
  const value = await redis.get(probeKey);
  await redis.del(probeKey);

  if (value !== 'ok') {
    console.error('Upstash probe failed: unexpected value', value);
    process.exit(1);
  }

  const count = await redis.incr(`${probeKey}:rl`);
  await redis.expire(`${probeKey}:rl`, REDIS_TTL.rateLimitBucket);
  await redis.del(`${probeKey}:rl`);

  console.log('Upstash Redis OK');
  console.log('  REST URL:', url);
  console.log('  Domain index TTL:', REDIS_TTL.domainIndex, 's');
  console.log('  Rate limit bucket TTL:', REDIS_TTL.rateLimitBucket, 's');
} catch (error) {
  console.error('Upstash Redis FAILED:', error?.message || error);
  process.exit(1);
}
