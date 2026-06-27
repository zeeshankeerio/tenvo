/**
 * Storefront setup completeness, guides owners to publish accurate public store data.
 */

/**
 * @param {{
 *   enabled?: boolean;
 *   storeDomain?: string | null;
 *   description?: string;
 *   logoUrl?: string;
 *   products?: { active?: number };
 *   publicEmail?: string;
 *   phone?: string;
 *   address?: string;
 *   city?: string;
 *   country?: string;
 *   businessHours?: string;
 *   freeShippingThreshold?: number;
 * }} state
 */
export function getStoreSetupStatus(state) {
  /** @type {Array<{ id: string; label: string; done: boolean; tab?: string; required?: boolean }>} */
  const checks = [
    {
      id: 'domain',
      label: 'Store URL (slug) configured',
      done: Boolean(state.storeDomain?.trim()),
      tab: 'domain',
      required: true,
    },
    {
      id: 'description',
      label: 'Store description added',
      done: Boolean(state.description?.trim()),
      tab: 'content',
      required: true,
    },
    {
      id: 'contact',
      label: 'Public phone or support email',
      done: Boolean(state.publicEmail?.trim() || state.phone?.trim()),
      tab: 'content',
      required: true,
    },
    {
      id: 'location',
      label: 'City or address for customers',
      done: Boolean(state.city?.trim() || state.address?.trim()),
      tab: 'content',
      required: false,
    },
    {
      id: 'hours',
      label: 'Business hours listed',
      done: Boolean(state.businessHours?.trim()),
      tab: 'content',
      required: false,
    },
    {
      id: 'logo',
      label: 'Store logo uploaded',
      done: Boolean(state.logoUrl?.trim()),
      tab: 'branding',
      required: false,
    },
    {
      id: 'products',
      label: 'At least one active product',
      done: Number(state.products?.active ?? 0) > 0,
      tab: 'domain',
      required: true,
    },
    {
      id: 'shipping',
      label: 'Shipping threshold set',
      done: state.freeShippingThreshold != null && state.freeShippingThreshold >= 0,
      tab: 'shipping',
      required: false,
    },
  ];

  const required = checks.filter((c) => c.required);
  const requiredDone = required.filter((c) => c.done).length;
  const allDone = checks.filter((c) => c.done).length;
  const percent = Math.round((allDone / checks.length) * 100);
  const readyToLaunch = required.every((c) => c.done) && state.enabled !== false;

  return {
    checks,
    percent,
    requiredDone,
    requiredTotal: required.length,
    readyToLaunch,
    nextSteps: checks.filter((c) => !c.done).slice(0, 3),
  };
}
