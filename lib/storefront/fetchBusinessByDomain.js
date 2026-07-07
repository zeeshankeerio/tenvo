import 'server-only';

import { cache } from 'react';
import { actionFailure } from '@/lib/actions/_shared/result';
import {
  loadStorefrontBusinessShell,
  normalizeStorefrontDomainSegment,
} from '@/lib/tenancy/resolveStorefrontBusiness';
import {
  storefrontBusinessTag,
  STOREFRONT_BUSINESS_SHELL_CACHE_KEY,
  STOREFRONT_BUSINESS_REVALIDATE_SEC,
} from '@/lib/storefront/storefrontCacheTags';
import { cacheStorefrontRead } from '@/lib/storefront/storefrontCachedRead';

/**
 * Cached storefront business resolver for RSC + lightweight API reads.
 * React cache() dedupes within a request; unstable_cache shares across requests.
 */
export const fetchBusinessByDomain = cache(async (domain) => {
  if (!domain || typeof domain !== 'string') {
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  const normalized = normalizeStorefrontDomainSegment(domain);
  if (!normalized) {
    return actionFailure('INVALID_DOMAIN', 'Domain parameter is required and must be a string');
  }

  return cacheStorefrontRead(
    () => loadStorefrontBusinessShell(normalized),
    [STOREFRONT_BUSINESS_SHELL_CACHE_KEY, normalized],
    {
      tags: [storefrontBusinessTag(normalized), 'storefront-business'],
      revalidate: STOREFRONT_BUSINESS_REVALIDATE_SEC,
    }
  );
});
