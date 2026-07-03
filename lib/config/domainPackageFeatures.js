/**
 * Domain package feature overrides — validated against `PLAN_FEATURE_TOGGLE_KEYS`.
 * Custom packaging only needs keys that differ from the package `recommendedPlanTier`.
 */

import { PLAN_FEATURE_TOGGLE_KEYS, PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';

/**
 * @param {string} baseTier
 * @param {Record<string, boolean>} desired
 * @returns {Record<string, boolean>}
 */
export function buildDomainPackageFeatureOverrides(baseTier, desired) {
  const tier = resolvePlanTier(baseTier || 'business');
  const base = PLAN_TIERS[tier]?.features || {};
  const allowed = new Set(PLAN_FEATURE_TOGGLE_KEYS);
  /** @type {Record<string, boolean>} */
  const overrides = {};

  for (const [key, value] of Object.entries(desired)) {
    if (!allowed.has(key)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[domainPackageFeatures] unknown feature key: ${key}`);
      }
      continue;
    }
    const want = Boolean(value);
    const hasBase = Object.prototype.hasOwnProperty.call(base, key);
    const baseVal = hasBase ? Boolean(base[key]) : false;
    if (want !== baseVal) {
      overrides[key] = want;
    }
  }

  return overrides;
}

/**
 * Marketing / billing UI: enabled highlights from a desired feature map.
 * @param {Record<string, boolean>} desired
 * @param {string[]} keys
 */
export function pickEnabledPackageFeatures(desired, keys) {
  return keys.filter((k) => desired[k] === true);
}

/** @param {Record<string, boolean>} overrides */
function withBusinessDefaults(overrides) {
  return buildDomainPackageFeatureOverrides('business', overrides);
}

/** Clothing — omni-channel fashion; no restaurant or shop-floor HR by default. */
const CLOTHING_DESIRED = {
  restaurant_pos: false,
  restaurant_kds: false,
  serial_tracking: false,
  payroll: false,
  attendance_tracking: false,
  shift_scheduling: false,
  multi_domain: false,
  white_label: false,
  custom_workflows: false,
  manufacturing: true,
  batch_tracking: true,
  price_lists: true,
  campaigns: true,
  loyalty_programs: true,
  ai_restock: true,
  ai_forecasting: true,
  approval_workflows: true,
  storefront_orders: true,
  sales_hub: true,
  webhook_integrations: true,
  api_access: true,
};

/** Pharmacy — expiry batches, counter POS, online Rx-adjacent catalog; no F&B or MES. */
const PHARMACY_DESIRED = {
  restaurant_pos: false,
  restaurant_kds: false,
  manufacturing: false,
  payroll: false,
  attendance_tracking: false,
  shift_scheduling: false,
  batch_tracking: true,
  serial_tracking: true,
  multi_warehouse: true,
  barcode_scanning: true,
  pos: true,
  pos_refunds: true,
  storefront_orders: true,
  sales_hub: true,
  tax_compliance: true,
  appointment_booking: true,
  helpdesk_tickets: true,
  feedback_surveys: true,
  marketing_automation: true,
  email_campaigns: true,
  abandoned_cart_recovery: true,
  review_requests: true,
  loyalty_programs: true,
  campaigns: true,
  ai_restock: true,
  ai_anomaly_detection: true,
  genai_product_descriptions: true,
  approval_workflows: true,
  audit_logs: true,
};

/** Auto parts — VIN/part fitment catalog, trade counter, serials; no restaurant or payroll. */
const AUTO_PARTS_DESIRED = {
  restaurant_pos: false,
  restaurant_kds: false,
  manufacturing: false,
  payroll: false,
  attendance_tracking: false,
  shift_scheduling: false,
  serial_tracking: true,
  batch_tracking: true,
  multi_warehouse: true,
  barcode_scanning: true,
  pos: true,
  storefront_orders: true,
  sales_hub: true,
  price_lists: true,
  supplier_quotes: true,
  delivery_challans: true,
  semantic_search: true,
  ai_restock: true,
  ai_forecasting: true,
  campaigns: true,
  loyalty_programs: true,
  webhook_integrations: true,
  api_access: true,
};

/** Vehicle showroom — listings, test-drive booking, parts shop; not a parts-only warehouse ERP. */
const SHOWROOM_DESIRED = {
  restaurant_pos: false,
  restaurant_kds: false,
  manufacturing: false,
  payroll: false,
  attendance_tracking: false,
  shift_scheduling: false,
  batch_tracking: false,
  serial_tracking: true,
  storefront_orders: true,
  sales_hub: true,
  appointment_booking: true,
  lead_capture_forms: true,
  lead_nurturing: true,
  live_chat: true,
  customer_portal: true,
  campaigns: true,
  marketing_automation: true,
  email_campaigns: true,
  abandoned_cart_recovery: true,
  pos: true,
  pos_refunds: true,
  multi_warehouse: true,
  price_lists: true,
  approval_workflows: true,
  ai_analytics: true,
};

/** Furniture — bulky goods, delivery challans, showroom appointments; no restaurant. */
const FURNITURE_DESIRED = {
  restaurant_pos: false,
  restaurant_kds: false,
  manufacturing: false,
  payroll: false,
  attendance_tracking: false,
  shift_scheduling: false,
  multi_warehouse: true,
  delivery_challans: true,
  stock_reservations: true,
  storefront_orders: true,
  sales_hub: true,
  pos: true,
  pos_refunds: true,
  appointment_booking: true,
  abandoned_cart_recovery: true,
  campaigns: true,
  loyalty_programs: true,
  price_lists: true,
  ai_restock: true,
  approval_workflows: true,
};

export const CLOTHING_COMMERCE_FEATURE_OVERRIDES = Object.freeze(
  withBusinessDefaults(CLOTHING_DESIRED)
);
export const PHARMACY_COMMERCE_FEATURE_OVERRIDES = Object.freeze(
  withBusinessDefaults(PHARMACY_DESIRED)
);
export const AUTO_PARTS_COMMERCE_FEATURE_OVERRIDES = Object.freeze(
  withBusinessDefaults(AUTO_PARTS_DESIRED)
);
export const VEHICLE_SHOWROOM_FEATURE_OVERRIDES = Object.freeze(
  withBusinessDefaults(SHOWROOM_DESIRED)
);
export const FURNITURE_COMMERCE_FEATURE_OVERRIDES = Object.freeze(
  withBusinessDefaults(FURNITURE_DESIRED)
);

/** Gym — supplements e-shop, memberships, coach booking; no restaurant or manufacturing. */
const FITNESS_DESIRED = {
  restaurant_pos: false,
  restaurant_kds: false,
  manufacturing: false,
  payroll: false,
  attendance_tracking: false,
  shift_scheduling: false,
  batch_tracking: true,
  multi_warehouse: true,
  barcode_scanning: true,
  pos: true,
  pos_refunds: true,
  storefront_orders: true,
  sales_hub: true,
  appointment_booking: true,
  helpdesk_tickets: true,
  feedback_surveys: true,
  marketing_automation: true,
  email_campaigns: true,
  abandoned_cart_recovery: true,
  review_requests: true,
  loyalty_programs: true,
  membership_management: true,
  campaigns: true,
  price_lists: true,
  ai_restock: true,
  ai_forecasting: true,
  approval_workflows: true,
  webhook_integrations: true,
};

export const FITNESS_COMMERCE_FEATURE_OVERRIDES = Object.freeze(
  withBusinessDefaults(FITNESS_DESIRED)
);

export const CLOTHING_COMMERCE_HIGHLIGHTS = pickEnabledPackageFeatures(CLOTHING_DESIRED, [
  'multi_warehouse',
  'price_lists',
  'batch_tracking',
  'campaigns',
  'loyalty_programs',
  'ai_restock',
  'approval_workflows',
  'storefront_orders',
]);

export const PHARMACY_COMMERCE_HIGHLIGHTS = pickEnabledPackageFeatures(PHARMACY_DESIRED, [
  'batch_tracking',
  'storefront_orders',
  'pos',
  'appointment_booking',
  'helpdesk_tickets',
  'abandoned_cart_recovery',
  'ai_anomaly_detection',
  'tax_compliance',
]);

export const AUTO_PARTS_COMMERCE_HIGHLIGHTS = pickEnabledPackageFeatures(AUTO_PARTS_DESIRED, [
  'serial_tracking',
  'semantic_search',
  'price_lists',
  'supplier_quotes',
  'multi_warehouse',
  'storefront_orders',
  'ai_restock',
  'barcode_scanning',
]);

export const VEHICLE_SHOWROOM_HIGHLIGHTS = pickEnabledPackageFeatures(SHOWROOM_DESIRED, [
  'appointment_booking',
  'lead_capture_forms',
  'live_chat',
  'storefront_orders',
  'serial_tracking',
  'campaigns',
  'customer_portal',
  'pos',
]);

export const FURNITURE_COMMERCE_HIGHLIGHTS = pickEnabledPackageFeatures(FURNITURE_DESIRED, [
  'delivery_challans',
  'multi_warehouse',
  'appointment_booking',
  'storefront_orders',
  'abandoned_cart_recovery',
  'stock_reservations',
  'campaigns',
  'pos',
]);

export const FITNESS_COMMERCE_HIGHLIGHTS = pickEnabledPackageFeatures(FITNESS_DESIRED, [
  'appointment_booking',
  'storefront_orders',
  'pos',
  'loyalty_programs',
  'abandoned_cart_recovery',
  'campaigns',
  'ai_restock',
  'batch_tracking',
]);
