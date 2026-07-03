/**
 * Apply plan tier + optional domain package entitlements after checkout / manual billing.
 */

import { getPlanTierQuotaUpdateData, resolvePlanTier } from '@/lib/config/plans';
import { buildRegistrationFromDomainPackage } from '@/lib/config/domainPackages';

/**
 * @param {{ planTier?: string | null, domainPackageKey?: string | null }} params
 * @returns {{
 *   quota: { plan_tier: string, plan_seats: number, max_products: number, max_warehouses: number },
 *   settingsPatch: Record<string, unknown>,
 *   domainPackageKey: string | null,
 *   planTier: string,
 * } | null}
 */
export function getBillingActivationPayload({ planTier, domainPackageKey }) {
  const packageKey =
    typeof domainPackageKey === 'string' && domainPackageKey.trim()
      ? domainPackageKey.trim()
      : null;
  const tierHint = planTier ? resolvePlanTier(planTier) : null;

  if (packageKey) {
    const reg = buildRegistrationFromDomainPackage(packageKey, {
      planTier: tierHint && tierHint !== 'free' ? tierHint : undefined,
    });
    if (!reg.package) return null;
    const resolvedTier = resolvePlanTier(reg.planTier);
    return {
      quota: {
        plan_tier: resolvedTier,
        plan_seats: reg.limits.max_users,
        max_products: reg.limits.max_products,
        max_warehouses: reg.limits.max_warehouses,
      },
      settingsPatch: reg.settingsPatch || {},
      domainPackageKey: packageKey,
      planTier: resolvedTier,
    };
  }

  if (!tierHint || tierHint === 'free') return null;
  const quota = getPlanTierQuotaUpdateData(tierHint);
  if (!quota) return null;
  return {
    quota,
    settingsPatch: {},
    domainPackageKey: null,
    planTier: tierHint,
  };
}

/**
 * Merge billing settings patch onto existing `businesses.settings` JSON.
 * @param {unknown} existingSettings
 * @param {Record<string, unknown>} patch
 */
export function mergeBusinessSettingsForBilling(existingSettings, patch) {
  if (!patch || typeof patch !== 'object' || !Object.keys(patch).length) {
    return existingSettings && typeof existingSettings === 'object' && !Array.isArray(existingSettings)
      ? existingSettings
      : {};
  }
  const prev =
    existingSettings && typeof existingSettings === 'object' && !Array.isArray(existingSettings)
      ? { ...existingSettings }
      : {};
  const preservedBilling =
    prev.billing && typeof prev.billing === 'object' && !Array.isArray(prev.billing)
      ? prev.billing
      : undefined;
  const merged = { ...prev, ...patch };
  if (preservedBilling && patch.billing == null) {
    merged.billing = preservedBilling;
  }
  return merged;
}
