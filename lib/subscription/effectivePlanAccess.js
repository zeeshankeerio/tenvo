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
 * Base tier flags + optional `settings.packaging.feature_overrides` for keys present in overrides.
 * When `mode !== 'custom'`, overrides are ignored.
 *
 * @param {string} planTier
 * @param {string} featureKey
 * @param {unknown} [settings] - businesses.settings
 * @returns {boolean}
 */
export function planHasFeatureWithPackaging(planTier, featureKey, settings) {
  const tier = resolvePlanTier(planTier || 'free');
  const pkg = getPackagingFromSettings(settings);
  if (pkg?.mode === 'custom' && pkg.feature_overrides && Object.prototype.hasOwnProperty.call(pkg.feature_overrides, featureKey)) {
    return Boolean(pkg.feature_overrides[featureKey]);
  }
  return planHasFeature(tier, featureKey);
}
