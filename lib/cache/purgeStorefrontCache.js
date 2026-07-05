import 'server-only';

import { revalidateTag } from 'next/cache';

/** Next.js 16 — stale-while-revalidate profile for tag invalidation. */
const DATA_CACHE_LIFE = 'max';

/**
 * Purge Next.js Data Cache entry for a storefront tag.
 * @param {string} tag
 */
export function purgeStorefrontDataCacheTag(tag) {
  if (!tag) return;
  revalidateTag(tag, DATA_CACHE_LIFE);
}

/**
 * Purge Vercel Runtime Cache + CDN layers for a tag (Vercel production only).
 * @param {string} tag
 */
export async function purgeStorefrontRuntimeCacheTag(tag) {
  if (!tag || process.env.VERCEL !== '1') return;
  try {
    const { invalidateByTag } = await import('@vercel/functions');
    await invalidateByTag(tag);
  } catch (error) {
    console.warn('[purgeStorefrontRuntimeCacheTag]', error?.message);
  }
}

/**
 * Full storefront cache purge — Data Cache (all hosts) + Runtime/CDN on Vercel.
 * @param {string} tag
 */
export async function purgeStorefrontCacheTag(tag) {
  purgeStorefrontDataCacheTag(tag);
  await purgeStorefrontRuntimeCacheTag(tag);
}

/**
 * Fire-and-forget runtime purge (safe from sync mutation handlers).
 * @param {string} tag
 */
export function purgeStorefrontCacheTagAsync(tag) {
  void purgeStorefrontRuntimeCacheTag(tag);
}
