import { STOREFRONT_COD_METHOD } from '@/lib/storefront/storefrontPaymentEligibility';

const COD_FALLBACK = [{ ...STOREFRONT_COD_METHOD }];

/**
 * Load eligible payment methods for storefront checkout (public API).
 * Always returns at least COD so payment step never blocks on empty config.
 * @param {string} businessDomain
 */
export async function fetchStorefrontPaymentMethods(businessDomain) {
  if (!businessDomain) return COD_FALLBACK;

  try {
    const response = await fetch(
      `/api/storefront/${encodeURIComponent(businessDomain)}/payment-methods`,
      { cache: 'no-store' }
    );
    const data = await response.json().catch(() => ({}));
    if (data.success && Array.isArray(data.methods)) {
      return data.methods;
    }
  } catch {
    /* fall through to COD */
  }

  return COD_FALLBACK;
}

export { COD_FALLBACK as STOREFRONT_COD_FALLBACK };
