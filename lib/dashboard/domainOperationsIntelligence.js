/**
 * Domain-aware Operations tab — vertical KPI definitions, labels, and layout hints.
 * Uses regional business context + domain knowledge for accurate, market-aware copy.
 */

import { resolveDomainKey } from '@/lib/config/domainKeyAliases.js';
import { getDomainConfig, isHospitality, isManufacturingRelevant, isMembershipRelevant } from '@/lib/config/domains.js';
import { hasStorefrontBookingVertical } from '@/lib/storefront/storefrontBooking.js';
import {
  getBusinessRegionalPack,
  resolveBusinessCountryIso,
} from '@/lib/utils/businessRegionalContext.js';

/** @typedef {'pharmacy_desk'|'clinical_ops'|'showroom'|'hospitality'|'online_store'|'parts_desk'|'manufacturing'|'operations'} OperationsMode */

/** @type {Record<string, OperationsMode>} */
const CATEGORY_MODE = {
  pharmacy: 'pharmacy_desk',
  'dental-clinic': 'clinical_ops',
  'veterinary-clinic': 'clinical_ops',
  'medical-clinic': 'clinical_ops',
  veterinary: 'clinical_ops',
  'salon-spa': 'clinical_ops',
  'beauty-salon': 'clinical_ops',
  'spa-wellness': 'clinical_ops',
  'gym-fitness': 'clinical_ops',
  'sports-club': 'clinical_ops',
  'yoga-studio': 'clinical_ops',
  'fitness-gym': 'clinical_ops',
  'vehicle-dealership': 'showroom',
  'auto-marketplace': 'showroom',
  furniture: 'showroom',
  'auto-parts': 'parts_desk',
  'restaurant-cafe': 'hospitality',
  'bakery-confectionery': 'hospitality',
  'hotel-guesthouse': 'hospitality',
  garments: 'online_store',
  'boutique-fashion': 'online_store',
  'textile-wholesale': 'online_store',
  supermarket: 'online_store',
  grocery: 'online_store',
  electronics: 'online_store',
  'retail-shop': 'online_store',
};

/** Category-specific tab labels (override mode default). */
const CATEGORY_TAB_LABELS = {
  pharmacy: 'Pharmacy desk',
  'auto-parts': 'Parts desk',
  garments: 'Retail pulse',
  'boutique-fashion': 'Boutique pulse',
  'textile-wholesale': 'Wholesale pulse',
  supermarket: 'Store ops',
  grocery: 'Store ops',
  electronics: 'Store ops',
  furniture: 'Showroom',
  'vehicle-dealership': 'Showroom',
  'auto-marketplace': 'Marketplace',
  'gym-fitness': 'Member ops',
  'sports-club': 'Member ops',
  'yoga-studio': 'Member ops',
  'hotel-guesthouse': 'Guest ops',
};

const MODE_LABELS = {
  pharmacy_desk: 'Pharmacy desk',
  clinical_ops: 'Clinical ops',
  showroom: 'Showroom',
  hospitality: 'Floor ops',
  online_store: 'Online store',
  parts_desk: 'Parts desk',
  manufacturing: 'Production',
  operations: 'Operations',
};

const MODE_GUIDANCE = {
  pharmacy_desk:
    'Rx requests, near-expiry stock, and online orders in one queue. Fulfillment detail lives under Orders and Stock.',
  clinical_ops:
    'Service visits, booking requests, and consumable alerts. Full customer records stay under Customers.',
  membership_ops:
    'Active members, renewals, and pending enrollments. Plans and perks sync from membership inventory SKUs.',
  showroom:
    'Showroom leads, high-value units, and booking requests. Inventory depth stays on the Stock tab.',
  hospitality:
    'Open floor orders and covers proxy. Kitchen and table management stay in Restaurant.',
  online_store:
    'Storefront funnel, leads, and channel split. Deep sales analytics stay on Sales and Reports.',
  parts_desk:
    'Counter walk-ins, workshop accounts, and online parts orders. Stock detail stays on Inventory.',
  manufacturing:
    'Production WIP, floor output, and channel sales. BOM detail stays in Manufacturing.',
  operations:
    'Pending requests, storefront orders, and channel mix for this period. Financial KPIs stay on Overview.',
};

const SERVICE_UNITS = new Set(['procedure', 'visit', 'service', 'case', 'session']);

/**
 * @param {string} countryIso
 * @param {OperationsMode} mode
 */
function buildRegionalComplianceHint(countryIso, mode) {
  const iso = String(countryIso || 'PK').toUpperCase();
  if (mode === 'pharmacy_desk' && iso === 'PK') {
    return 'Pakistan pharmacy: verify Schedule H/X and FBR record-keeping on regulated lines.';
  }
  if (iso === 'PK' && (mode === 'online_store' || mode === 'parts_desk')) {
    return 'Pakistan GST on taxable goods — reconcile storefront and invoice channels.';
  }
  if (iso === 'SG' && mode === 'showroom') {
    return 'Singapore: COE and listing copy on storefront are owner-managed, not live LTA feeds.';
  }
  return null;
}

/**
 * @param {string} category
 * @param {Record<string, unknown>|null|undefined} domainKnowledge
 * @param {Record<string, unknown>|null|undefined} [business]
 */
export function resolveOperationsProfile(category, domainKnowledge, business) {
  const key = resolveDomainKey(String(category || '').trim());
  const dk = domainKnowledge && typeof domainKnowledge === 'object' ? domainKnowledge : {};
  const serviceMode = Boolean(dk.serviceMode);
  const retailMode = dk.retailMode !== false;
  const expiryTracking = Boolean(dk.expiryTrackingEnabled);
  const batchTracking = Boolean(dk.batchTrackingEnabled);
  const manufacturing = Boolean(dk.manufacturingEnabled) || isManufacturingRelevant(key, dk);
  const hospitality = isHospitality(key);
  const countryIso = resolveBusinessCountryIso(business);
  const regionalPack = getBusinessRegionalPack(business);
  const domainConfig = getDomainConfig(key);
  const labelOverrides =
    domainConfig?.label_overrides && typeof domainConfig.label_overrides === 'object'
      ? domainConfig.label_overrides
      : {};

  let mode = CATEGORY_MODE[key] || 'operations';
  if (manufacturing && mode === 'operations') mode = 'manufacturing';
  else if (mode === 'operations' && serviceMode) mode = 'clinical_ops';
  else if (mode === 'operations' && retailMode && !serviceMode) mode = 'online_store';

  const tabLabel =
    CATEGORY_TAB_LABELS[key] || MODE_LABELS[mode] || MODE_LABELS.operations;

  const customerLabel =
    (typeof labelOverrides.customer === 'string' && labelOverrides.customer) ||
    (mode === 'pharmacy_desk' || mode === 'clinical_ops' ? 'Patients / clients' : 'Customers');

  return {
    category: key,
    mode,
    tabLabel,
    serviceMode,
    retailMode,
    expiryTracking,
    batchTracking,
    manufacturing,
    hospitality,
    bookingVertical: hasStorefrontBookingVertical(key),
    customerLabel,
    countryIso,
    countryName: regionalPack.countryName,
    currency: regionalPack.currency,
    taxLabel: regionalPack.taxLabel,
    locale: regionalPack.locale,
    regionalHint: buildRegionalComplianceHint(countryIso, mode),
    showPharmacy: mode === 'pharmacy_desk' || key === 'pharmacy',
    showClinical: mode === 'clinical_ops',
    showShowroom: mode === 'showroom',
    showHospitality: hospitality || mode === 'hospitality',
    showParts: mode === 'parts_desk',
    showManufacturing: manufacturing,
    showStorefront:
      retailMode ||
      mode === 'online_store' ||
      mode === 'pharmacy_desk' ||
      mode === 'showroom' ||
      mode === 'parts_desk',
    showServiceMix:
      serviceMode || mode === 'pharmacy_desk' || mode === 'clinical_ops' || mode === 'parts_desk',
    showExpiry: expiryTracking || mode === 'pharmacy_desk' || batchTracking,
    showVisitors: retailMode || mode !== 'clinical_ops',
    showMembership: isMembershipRelevant(key),
  };
}

/**
 * @param {ReturnType<typeof resolveOperationsProfile>} profile
 */
export function getOperationsTabGuidance(profile) {
  if (profile.showMembership) {
    const base = MODE_GUIDANCE.membership_ops;
    if (profile.regionalHint) return `${base} ${profile.regionalHint}`;
    return base;
  }
  const base = MODE_GUIDANCE[profile.mode] || MODE_GUIDANCE.operations;
  if (profile.regionalHint) return `${base} ${profile.regionalHint}`;
  return base;
}

/**
 * Build KPI tile definitions from a loaded snapshot (client-safe).
 * @param {ReturnType<typeof resolveOperationsProfile>} profile
 * @param {Record<string, unknown>} snapshot
 * @param {{ formatCurrency: (n: number) => string }} formatters
 */
export function buildOperationsKpiTiles(profile, snapshot, formatters) {
  const { formatCurrency } = formatters;
  const sf = /** @type {Record<string, unknown>} */ (snapshot.storefront || {});
  const contacts = /** @type {Record<string, unknown>} */ (snapshot.contacts || {});
  const pharmacy = /** @type {Record<string, unknown>} */ (snapshot.pharmacy || {});
  const hospitality = /** @type {Record<string, unknown>} */ (snapshot.hospitality || {});
  const manufacturing = /** @type {Record<string, unknown>} */ (snapshot.manufacturing || {});
  const serviceMix = /** @type {Record<string, unknown>} */ (snapshot.serviceMix || {});
  const collections = /** @type {Record<string, unknown>} */ (snapshot.collections || {});
  const memberships = /** @type {Record<string, unknown>} */ (snapshot.memberships || {});

  const rxPending =
    Number(contacts.prescriptionPending || 0) + Number(contacts.refillPending || 0);
  const bookingPending = Number(contacts.leadPending || 0);
  const visitors = Number(sf.visitors || 0);
  const storeOrders = Number(sf.ordersTotal || 0);
  const conversionPct =
    visitors > 0 ? (storeOrders / visitors) * 100 : null;

  /** @type {Array<{ id: string; label: string; value: string | number; hint: string; actionTab?: string; tone?: string }>} */
  const tiles = [];

  if (profile.showManufacturing) {
    tiles.push({
      id: 'wip_orders',
      label: 'Production WIP',
      value: Number(manufacturing.openWip || 0),
      hint: `${Number(manufacturing.completed || 0)} completed in period`,
      actionTab: 'manufacturing',
      tone: Number(manufacturing.openWip || 0) > 0 ? 'text-amber-700' : undefined,
    });
  }

  if (profile.showPharmacy) {
    tiles.push({
      id: 'rx_requests',
      label: 'Rx / refill requests',
      value: rxPending,
      hint: 'New contact queue',
      actionTab: 'orders',
      tone: rxPending > 0 ? 'text-amber-700' : undefined,
    });
    if (profile.showExpiry) {
      tiles.push({
        id: 'near_expiry',
        label: 'Near expiry',
        value: Number(pharmacy.nearExpiryBatches || 0),
        hint: 'Batches inside 90 days',
        actionTab: 'inventory',
        tone: Number(pharmacy.criticalExpiryBatches || 0) > 0 ? 'text-rose-700' : undefined,
      });
    }
  }

  if (profile.showClinical && !profile.showPharmacy) {
    tiles.push({
      id: 'booking_requests',
      label: 'Booking requests',
      value: bookingPending,
      hint: 'Appointment / visit queue',
      actionTab: 'customers',
      tone: bookingPending > 0 ? 'text-amber-700' : undefined,
    });
    if (!profile.showMembership) {
      tiles.push({
        id: 'service_revenue',
        label: 'Service revenue',
        value: formatCurrency(Number(serviceMix.serviceRevenue || 0)),
        hint: 'Procedures & visits',
        actionTab: 'invoices',
      });
    }
  }

  if (profile.showMembership && Object.keys(memberships).length > 0) {
    tiles.push({
      id: 'active_members',
      label: 'Active members',
      value: Number(memberships.activeCount || 0),
      hint: `${Number(memberships.pendingCount || 0)} pending activation`,
      actionTab: 'memberships',
    });
    tiles.push({
      id: 'expiring_members',
      label: 'Expiring (14d)',
      value: Number(memberships.expiringSoon || 0),
      hint: 'Renewals and follow-ups',
      actionTab: 'memberships',
      tone: Number(memberships.expiringSoon || 0) > 0 ? 'text-amber-700' : undefined,
    });
    if (Number(memberships.overdueRenewals || 0) > 0) {
      tiles.push({
        id: 'overdue_member_renewals',
        label: 'Overdue renewals',
        value: Number(memberships.overdueRenewals || 0),
        hint: 'Unpaid renewal invoices past grace',
        actionTab: 'invoices',
        tone: 'text-rose-700',
      });
    }
    tiles.push({
      id: 'membership_online_orders',
      label: 'Online orders',
      value: storeOrders,
      hint: `${Number(sf.ordersPending || 0)} pending fulfilment`,
      actionTab: 'orders',
    });
  }

  if (profile.showShowroom) {
    tiles.push({
      id: 'showroom_leads',
      label: 'Showroom leads',
      value: bookingPending + Number(contacts.generalPending || 0),
      hint: 'Bookings & inquiries',
      actionTab: 'customers',
    });
  }

  if (profile.showParts) {
    tiles.push({
      id: 'parts_leads',
      label: 'Parts inquiries',
      value: Number(contacts.pendingCount || 0),
      hint: 'Contact & wholesale queue',
      actionTab: 'orders',
    });
  }

  if (profile.showStorefront) {
    if (profile.showVisitors && (visitors > 0 || sf.visitorsTracked)) {
      tiles.push({
        id: 'visitors',
        label: 'Store visitors',
        value: visitors,
        hint: sf.visitorsTracked ? 'Tracked sessions' : 'Browse the public store to populate',
      });
      tiles.push({
        id: 'conversion',
        label: 'Order conversion',
        value: conversionPct !== null ? `${conversionPct.toFixed(1)}%` : '—',
        hint: 'Orders / visitors',
      });
    }
    tiles.push({
      id: 'store_orders',
      label: profile.showParts ? 'Online orders' : 'Online orders',
      value: storeOrders,
      hint: `${Number(sf.ordersPending || 0)} pending fulfilment`,
      actionTab: 'orders',
      tone: Number(sf.ordersPending || 0) > 0 ? 'text-amber-700' : undefined,
    });
    tiles.push({
      id: 'store_revenue',
      label: 'Store revenue',
      value: formatCurrency(Number(sf.revenue || 0)),
      hint: 'Storefront channel',
      actionTab: 'orders',
    });
  }

  if (profile.showHospitality) {
    tiles.push({
      id: 'floor_orders',
      label: 'Open floor orders',
      value: Number(hospitality.openOrders || 0),
      hint: 'Restaurant / cafe',
      actionTab: 'restaurant',
    });
    tiles.push({
      id: 'covers_revenue',
      label: 'Floor revenue',
      value: formatCurrency(Number(hospitality.revenue || 0)),
      hint: 'Completed & open tickets',
      actionTab: 'restaurant',
    });
  }

  if (!profile.showPharmacy && !profile.showClinical && !profile.showParts) {
    tiles.push({
      id: 'open_requests',
      label: 'Open requests',
      value: Number(contacts.pendingCount || 0),
      hint: 'Store contact queue',
      actionTab: 'orders',
      tone: Number(contacts.pendingCount || 0) > 0 ? 'text-amber-700' : undefined,
    });
  }

  tiles.push({
    id: 'patients_customers',
    label: profile.customerLabel,
    value: Number(snapshot.activeBuyers || 0),
    hint: 'Active in period',
    actionTab: 'customers',
  });

  tiles.push({
    id: 'collections',
    label: 'Collections',
    value: formatCurrency(Number(collections.total || 0)),
    hint: `Paid hub + store (${profile.taxLabel || 'tax'} aware)`,
    actionTab: 'invoices',
  });

  return dedupeTiles(tiles).slice(0, 6);
}

/**
 * @param {Array<{ id: string; label: string; value: string | number; hint: string; actionTab?: string; tone?: string }>} tiles
 */
function dedupeTiles(tiles) {
  const seen = new Set();
  return tiles.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function resolveOperationsBadgeCount(snapshot) {
  const sf = /** @type {Record<string, unknown>} */ (snapshot?.storefront || {});
  const contacts = /** @type {Record<string, unknown>} */ (snapshot?.contacts || {});
  const mfg = /** @type {Record<string, unknown>} */ (snapshot?.manufacturing || {});
  const pending =
    Number(sf.ordersPending || 0) +
    Number(contacts.pendingCount || 0) +
    Number(contacts.prescriptionPending || 0) +
    Number(contacts.refillPending || 0) +
    Number(mfg.openWip || 0);
  return pending > 0 ? pending : null;
}

/**
 * @param {string|null|undefined} unit
 */
export function isServiceUnit(unit) {
  return SERVICE_UNITS.has(String(unit || '').trim().toLowerCase());
}

export { SERVICE_UNITS };
