import 'server-only';

import { notFound } from 'next/navigation';

/**
 * Resolve storefront business for RSC pages.
 * Returns null when the store is disabled (layout renders unavailable UI).
 * Calls notFound() for unknown domains.
 *
 * @param {import('@/lib/actions/_shared/result').ActionResult} result
 */
export function guardStorefrontBusiness(result) {
  if (result?.success) return result;
  if (result?.code === 'STOREFRONT_DISABLED') return null;
  notFound();
}

export function isStorefrontDisabledResult(result) {
  return result?.code === 'STOREFRONT_DISABLED';
}
