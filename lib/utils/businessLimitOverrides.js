/**
 * Per-tenant plan limit overrides (`businesses.settings.limit_overrides`).
 * DB columns `plan_seats`, `max_products`, `max_warehouses` take precedence for those keys
 * (see `getBusinessPlan` in `lib/auth/planGuard.js`).
 */

import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';

/** Limit keys from `PLAN_TIERS.*.limits` — used by admin UI and guards. */
export const PLAN_LIMIT_OVERRIDE_KEYS = Object.freeze(
  Object.keys(PLAN_TIERS.free.limits)
);

export const LIMIT_OVERRIDE_LABELS = {
  max_users: 'Users (seats)',
  max_products: 'Products',
  max_customers: 'Customers',
  max_vendors: 'Vendors',
  max_warehouses: 'Warehouses',
  max_invoices_per_month: 'Monthly invoices',
  max_pos_terminals: 'POS terminals',
  max_storage_mb: 'Storage (MB)',
  max_branches: 'Branches',
};

const DB_COLUMN_LIMIT_KEYS = new Set(['max_users', 'max_products', 'max_warehouses']);

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatPlanLimitValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n === -1) return 'Unlimited';
  return String(n);
}

/**
 * @param {unknown} settings
 * @returns {Record<string, unknown>}
 */
function parseSettingsObject(settings) {
  if (!settings) return {};
  if (typeof settings === 'string') {
    try {
      const parsed = JSON.parse(settings);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
}

/**
 * Resolve tier defaults, settings overrides, and effective limits for display/guards.
 *
 * @param {{ plan_tier?: string, plan_seats?: number|null, max_products?: number|null, max_warehouses?: number|null, settings?: unknown }} business
 */
export function resolveEffectiveBusinessLimits(business) {
  const tier = resolvePlanTier(business?.plan_tier || 'free');
  const tierDefaults = { ...(PLAN_TIERS[tier]?.limits || {}) };
  const settingsObj = parseSettingsObject(business?.settings);
  const rawSettingsOverrides =
    settingsObj.limit_overrides && typeof settingsObj.limit_overrides === 'object'
      ? settingsObj.limit_overrides
      : {};

  const parsedSettingsOverrides = Object.fromEntries(
    Object.entries(rawSettingsOverrides)
      .map(([k, v]) => [k, Number(v)])
      .filter(([, v]) => Number.isFinite(v) && v >= -1)
  );

  const effective = { ...tierDefaults, ...parsedSettingsOverrides };

  if (business?.plan_seats != null && Number.isFinite(Number(business.plan_seats))) {
    effective.max_users = Number(business.plan_seats);
  }
  if (business?.max_products != null && Number.isFinite(Number(business.max_products))) {
    effective.max_products = Number(business.max_products);
  }
  if (business?.max_warehouses != null && Number.isFinite(Number(business.max_warehouses))) {
    effective.max_warehouses = Number(business.max_warehouses);
  }

  const overriddenKeys = {};
  for (const key of PLAN_LIMIT_OVERRIDE_KEYS) {
    if (effective[key] !== tierDefaults[key]) {
      overriddenKeys[key] = effective[key];
    }
  }

  return {
    tier,
    tierDefaults,
    effective,
    overriddenKeys,
    settingsOverrides: parsedSettingsOverrides,
  };
}

/**
 * @param {unknown} prevSettings
 * @param {Record<string, number|string|null|undefined>} limitOverrides - empty/null clears a key
 */
export function mergeLimitOverridesIntoBusinessSettings(prevSettings, limitOverrides = {}) {
  const prev = parseSettingsObject(prevSettings);
  const existing =
    prev.limit_overrides && typeof prev.limit_overrides === 'object'
      ? { ...prev.limit_overrides }
      : {};

  for (const key of PLAN_LIMIT_OVERRIDE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(limitOverrides, key)) continue;
    const raw = limitOverrides[key];
    if (raw === null || raw === undefined || raw === '') {
      delete existing[key];
      continue;
    }
    const num = Number(raw);
    if (Number.isFinite(num) && num >= -1) {
      existing[key] = num;
    }
  }

  // DB-backed keys are stored on columns, not settings JSON
  for (const key of DB_COLUMN_LIMIT_KEYS) {
    delete existing[key];
  }

  const next = { ...prev };
  if (Object.keys(existing).length === 0) {
    delete next.limit_overrides;
  } else {
    next.limit_overrides = existing;
  }

  return { nextSettings: next, limitOverrides: existing };
}

/**
 * Parse admin form payload into numeric overrides and DB column updates.
 *
 * @param {string} planTier
 * @param {Record<string, string|number|null|undefined>} formValues
 */
export function parseAdminLimitOverridePayload(planTier, formValues) {
  const tier = resolvePlanTier(planTier || 'free');
  const tierDefaults = PLAN_TIERS[tier]?.limits || {};
  const settingsPatch = {};
  const dbColumns = {};

  for (const key of PLAN_LIMIT_OVERRIDE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(formValues, key)) continue;
    const raw = formValues[key];
    if (raw === null || raw === undefined || raw === '') {
      settingsPatch[key] = null;
      if (key === 'max_users') dbColumns.plan_seats = tierDefaults.max_users;
      else if (key === 'max_products') dbColumns.max_products = tierDefaults.max_products;
      else if (key === 'max_warehouses') dbColumns.max_warehouses = tierDefaults.max_warehouses;
      continue;
    }

    const num = Number(raw);
    if (!Number.isFinite(num) || num < -1) continue;

    if (key === 'max_users') dbColumns.plan_seats = num;
    else if (key === 'max_products') dbColumns.max_products = num;
    else if (key === 'max_warehouses') dbColumns.max_warehouses = num;
    else settingsPatch[key] = num;
  }

  return { settingsPatch, dbColumns, tierDefaults };
}
