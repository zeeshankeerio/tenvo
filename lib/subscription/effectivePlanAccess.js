/**
 * Effective plan access — merges base `PLAN_TIERS` feature flags with optional
 * per-tenant packaging overrides stored on `businesses.settings.packaging`.
 *
 * @see docs/MODULAR_PACKAGING_AND_DASHBOARD_MATRIX.md
 */

import { planHasFeature, resolvePlanTier } from '@/lib/config/plans';

/**
 * @typedef {{ mode?: 'tier' | 'custom', feature_overrides?: Record<string, boolean> }} PackagingSettingsV1
 */

/**
 * @param {unknown} settings - `businesses.settings` JSON
 * @returns {PackagingSettingsV1 | null}
 */
export function getPackagingFromSettings(settings) {
  if (!settings || typeof settings !== 'object') return null;
  const raw = /** @type {Record<string, unknown>} */ (settings).packaging;
  if (!raw || typeof raw !== 'object') return null;
  const mode = raw.mode === 'custom' ? 'custom' : 'tier';
  const fo = raw.feature_overrides;
  const feature_overrides =
    fo && typeof fo === 'object' && !Array.isArray(fo)
      ? /** @type {Record<string, boolean>} */ (
          Object.fromEntries(
            Object.entries(fo).map(([k, v]) => [k, Boolean(v)])
          )
        )
      : undefined;
  return { mode, ...(feature_overrides ? { feature_overrides } : {}) };
}

/**
 * Base tier flags + optional owner packaging + optional platform admin overrides.
 * Precedence: owner custom packaging → platform_feature_flag_overrides → plan tier.
 *
 * @param {string} planTier
 * @param {string} featureKey
 * @param {unknown} [settings] - businesses.settings
 * @param {Record<string, boolean>} [platformOverrides] - from `loadPlatformFeatureOverridesForBusiness`
 * @returns {boolean}
 */
export function planHasFeatureWithPackaging(planTier, featureKey, settings, platformOverrides) {
  const tier = resolvePlanTier(planTier || 'free');
  const pkg = getPackagingFromSettings(settings);
  if (pkg?.mode === 'custom' && pkg.feature_overrides && Object.prototype.hasOwnProperty.call(pkg.feature_overrides, featureKey)) {
    return Boolean(pkg.feature_overrides[featureKey]);
  }
  if (platformOverrides && Object.prototype.hasOwnProperty.call(platformOverrides, featureKey)) {
    return Boolean(platformOverrides[featureKey]);
  }
  return planHasFeature(tier, featureKey);
}
