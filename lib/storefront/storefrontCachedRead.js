import 'server-only';

import { unstable_cache } from 'next/cache';

/** @typedef {{ success?: boolean }} StorefrontActionResult */

/**
 * Next.js unstable_cache stores return values including failures.
 * Throw on unsuccessful action results so transient errors are not cached.
 *
 * @template T
 * @param {() => Promise<T>} fetchFn
 * @param {string[]} keyParts
 * @param {{ tags: string[], revalidate: number }} options
 * @returns {Promise<T>}
 */
export async function cacheStorefrontRead(fetchFn, keyParts, options) {
  try {
    return await unstable_cache(
      async () => {
        const result = await fetchFn();
        if (result && typeof result === 'object' && result.success === false) {
          throw new StorefrontCacheSkipError(result);
        }
        return result;
      },
      keyParts,
      options
    )();
  } catch (error) {
    if (error instanceof StorefrontCacheSkipError) {
      return /** @type {T} */ (error.result);
    }
    throw error;
  }
}

export class StorefrontCacheSkipError extends Error {
  /** @param {StorefrontActionResult} result */
  constructor(result) {
    super(result?.error || result?.code || 'Storefront cache skip');
    this.name = 'StorefrontCacheSkipError';
    this.result = result;
  }
}
