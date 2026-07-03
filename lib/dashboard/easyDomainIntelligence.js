/**
 * Domain-aware intelligence for Easy mode dashboard — vertical playbooks, tab guidance, KPI labels.
 */

import { resolveDomainKey } from '@/lib/config/domainKeyAliases.js';
import { isMembershipRelevant } from '@/lib/config/domains.js';

const VERTICAL_PLAYBOOKS = {
  pharmacy: {
    stockFocus: 'FEFO and expiry-first picking on regulated SKUs.',
    salesFocus: 'Track batch-level velocity; margin erodes quickly on near-expiry stock.',
    accountsFocus: 'Watch scheme/discount leakage and cold-chain write-offs.',
    actionTab: 'inventory',
  },
  'dental-clinic': {
    stockFocus: 'Sterile consumables and implant stock need batch/expiry discipline.',
    salesFocus: 'Chair-time revenue should be read alongside consumable cost per procedure.',
    accountsFocus: 'Reconcile clinical stock separately from retail lines.',
    actionTab: 'inventory',
  },
  'veterinary-clinic': {
    stockFocus: 'Vaccines and cold-chain items need minimum shelf-life on receipt.',
    salesFocus: 'Vaccination and revisit bundles drive repeat visits.',
    accountsFocus: 'Bundle reminders with receivables follow-up.',
    actionTab: 'customers',
  },
  'gym-fitness': {
    stockFocus: 'Supplements and retail attach — members expect in-club shop perks on plan SKUs.',
    salesFocus: 'Membership renewals and trial conversions drive recurring revenue; track expiring members weekly.',
    accountsFocus: 'Auto-renew invoices and COD membership orders — reconcile storefront vs hub enrollments.',
    actionTab: 'memberships',
  },
  'spa-wellness': {
    stockFocus: 'Retail care lines and session packs — align stock to booked services.',
    salesFocus: 'Package renewals and add-on treatments; watch pending online enrollments until paid.',
    accountsFocus: 'Prepaid packages vs walk-in retail — segment receivables by member status.',
    actionTab: 'memberships',
  },
  'beauty-salon': {
    stockFocus: 'Professional color and care lines — sell-through per stylist.',
    salesFocus: 'Retail attach rate on services lifts margin in peak wedding/Eid seasons.',
    accountsFocus: 'Package prepayments vs retail mix.',
    actionTab: 'campaigns',
  },
  'yoga-studio': {
    stockFocus: 'Mats, props, and retail wellness lines tied to class packs.',
    salesFocus: 'Class packs and monthly memberships — monitor trial-to-member conversion.',
    accountsFocus: 'Prepaid packs vs drop-in revenue; chase renewals before expiry.',
    actionTab: 'memberships',
  },
  'sports-club': {
    stockFocus: 'Pro shop and facility consumables aligned to member traffic.',
    salesFocus: 'Season passes and family plans — track pending storefront enrollments.',
    accountsFocus: 'Recurring billing and event deposits — reconcile member AR separately.',
    actionTab: 'memberships',
  },
  'hotel-guesthouse': {
    stockFocus: 'Guest amenities and F&B pars — low stock blocks service quality.',
    salesFocus: 'Member/guest packages and length-of-stay bundles drive occupancy.',
    accountsFocus: 'Deposits and prepaid guest packages vs walk-in folios.',
    actionTab: 'memberships',
  },
  garments: {
    stockFocus: 'Size/color matrix — restock core sizes before seasonal peaks.',
    salesFocus: 'Full-price sell-through before markdown windows.',
    accountsFocus: 'Wholesale vs retail receivable cycles differ — segment AR.',
    actionTab: 'inventory',
  },
  'boutique-fashion': {
    stockFocus: 'Limited runs — depth on hero SKUs, breadth on accessories.',
    salesFocus: 'Collection drops spike demand; watch return rate on fit-sensitive items.',
    accountsFocus: 'Layaway and partial payments affect open AR.',
    actionTab: 'inventory',
  },
  'textile-wholesale': {
    stockFocus: 'Roll/bale tracking and MOQ-led replenishment.',
    salesFocus: 'Bulk order cadence — align procurement to loom/lead times.',
    accountsFocus: 'Long credit cycles — prioritize overdue wholesale accounts.',
    actionTab: 'invoices',
  },
  'auto-parts': {
    stockFocus: 'Fast-moving filters, brakes, and lubricants by vehicle make.',
    salesFocus: 'Counter walk-ins vs workshop accounts — watch basket size by category.',
    accountsFocus: 'Workshop credit limits and overdue jobber accounts.',
    actionTab: 'inventory',
  },
  'vehicle-dealership': {
    stockFocus: 'Each unit is high value — days-in-stock and holding cost matter.',
    salesFocus: 'Pipeline: inquiries, test drives, deposits, delivered units.',
    accountsFocus: 'Floor-plan financing and deposit receivables.',
    actionTab: 'inventory',
  },
  restaurant: {
    stockFocus: 'High perishability — daily pars and waste % are leading indicators.',
    salesFocus: 'Covers × average ticket; peak meal periods drive staffing and prep.',
    accountsFocus: 'Food cost % vs revenue — tighten on rising ingredient spend.',
    actionTab: 'inventory',
  },
  supermarket: {
    stockFocus: 'Category managers own replenishment — focus on top 20% SKUs.',
    salesFocus: 'Promo lifts and shrink — compare units sold vs margin.',
    accountsFocus: 'Supplier rebates and short-dated clearance impact net margin.',
    actionTab: 'reports',
  },
  furniture: {
    stockFocus: 'High cube / low velocity — floor models tie up cash; track days-in-stock.',
    salesFocus: 'Delivery-led sales — deposits and open orders matter as much as walk-ins.',
    accountsFocus: 'Custom orders and partial payments extend receivable cycles.',
    actionTab: 'inventory',
  },
  electronics: {
    stockFocus: 'Serialized and warranty SKUs — match serials before dispatch.',
    salesFocus: 'Attach rate on accessories lifts margin on thin hardware spreads.',
    accountsFocus: 'Scheme discounts and trade-in adjustments affect net margin.',
    actionTab: 'inventory',
  },
  grocery: {
    stockFocus: 'Daily pars on perishables — shrink and waste are margin leaks.',
    salesFocus: 'Basket size and promo lifts on staples drive footfall.',
    accountsFocus: 'Supplier rebates and short-dated markdowns affect net P&L.',
    actionTab: 'inventory',
  },
};

/**
 * @param {string} category
 * @param {Record<string, unknown>|null|undefined} domainKnowledge
 * @param {Record<string, unknown>|null|undefined} business
 */
export function resolveEasyDomainProfile(category, domainKnowledge, business) {
  const key = resolveDomainKey(String(category || '').trim());
  const dk = domainKnowledge && typeof domainKnowledge === 'object' ? domainKnowledge : {};
  const intel = dk.intelligence && typeof dk.intelligence === 'object' ? dk.intelligence : {};
  const playbook = VERTICAL_PLAYBOOKS[key] || VERTICAL_PLAYBOOKS[category] || null;

  return {
    category: key,
    name: String(dk.name || category),
    icon: dk.icon,
    country: business?.country ? String(business.country) : null,
    intelligence: intel,
    playbook,
    batchTracking: Boolean(dk.batchTrackingEnabled),
    expiryTracking: Boolean(dk.expiryTrackingEnabled),
    serialTracking: Boolean(dk.serialTrackingEnabled),
    multiLocation: Boolean(dk.multiLocationEnabled),
    manufacturing: Boolean(dk.manufacturingEnabled),
    serviceMode: Boolean(dk.serviceMode),
    retailMode: dk.retailMode !== false,
    reorderEnabled: dk.reorderEnabled !== false,
    leadTime: Number(intel.leadTime) || 14,
    minOrderQuantity: Number(intel.minOrderQuantity) || 1,
    shelfLife: Number(intel.shelfLife) || 365,
    seasonality: String(intel.seasonality || 'medium'),
    perishability: String(intel.perishability || 'low'),
    demandVolatility: Number(intel.demandVolatility) || 0.5,
    peakMonths: Array.isArray(intel.peakMonths) ? intel.peakMonths : [],
    membershipVertical: isMembershipRelevant(key),
  };
}

/**
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 */
export function buildDomainCapabilityBadges(profile) {
  const badges = [];
  if (profile.expiryTracking) badges.push({ label: 'Expiry tracking', tone: 'amber' });
  if (profile.batchTracking) badges.push({ label: 'Batch tracking', tone: 'slate' });
  if (profile.serialTracking) badges.push({ label: 'Serial / warranty', tone: 'slate' });
  if (profile.multiLocation) badges.push({ label: 'Multi-location', tone: 'cyan' });
  if (profile.manufacturing) badges.push({ label: 'Manufacturing', tone: 'indigo' });
  if (profile.serviceMode) badges.push({ label: 'Service-led', tone: 'emerald' });
  if (profile.membershipVertical) badges.push({ label: 'Memberships', tone: 'violet' });
  return badges;
}

/**
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 */
export function buildDomainSeasonBadge(profile) {
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const isPeak = profile.peakMonths.includes(currentMonth);
  if (isPeak) {
    return { label: `Peak season · ${currentMonth}`, tone: 'warning' };
  }
  if (profile.peakMonths.length > 0) {
    return { label: `Next peak · ${profile.peakMonths[0]}`, tone: 'secondary' };
  }
  if (profile.seasonality === 'high') {
    return { label: 'High seasonality vertical', tone: 'secondary' };
  }
  return null;
}

/**
 * Tab-specific coaching line for the active vertical.
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 * @param {'overview'|'sales'|'accounts'|'stock'|'customers'|'insights'|'operations'} tab
 */
export function getDomainTabGuidance(profile, tab) {
  const pb = profile.playbook;
  const intel = profile.intelligence;

  const generic = {
    overview: `Operating as ${profile.name}. Use tabs below to audit sales, accounts, stock, and customers for this period.`,
    sales: 'Review paid vs open documents and top movers to spot demand shifts early.',
    accounts: 'Receivables and period spend together show cash health — chase overdue before adding stock.',
    stock: profile.serviceMode
      ? 'Consumables and supply stock — low counts here can block service delivery.'
      : 'Safety stock and coverage days protect against stock-outs on movers.',
    customers: 'Repeat buyers and revenue per customer signal retention quality.',
    insights: 'Combine vertical intelligence with live alerts to prioritize the next action.',
    operations: profile.membershipVertical
      ? 'Member enrollments, renewals, and storefront orders. Open the Memberships tab for expiring plans.'
      : 'Storefront funnel, service queue, and domain-specific requests. Financial KPIs stay on Overview.',
  };

  if (!pb) {
    if (tab === 'stock' && profile.expiryTracking) {
      return 'Expiry-tracked vertical — prioritize FEFO picks and near-expiry clearance.';
    }
    if (tab === 'stock' && Number(intel.demandVolatility) > 0.6) {
      return 'Volatile demand — widen buffers on A-class SKUs and shorten reorder review cycles.';
    }
    return generic[tab] || generic.overview;
  }

  const map = {
    overview: `${profile.name}: ${pb.salesFocus}`,
    sales: pb.salesFocus,
    accounts: pb.accountsFocus,
    stock: pb.stockFocus,
    customers: 'Grow repeat visits — top customers and paid ratio show account health.',
    insights: `${pb.stockFocus} ${pb.salesFocus}`,
    operations: profile.membershipVertical
      ? 'Member enrollments, renewals, and storefront orders. Open the Memberships tab for expiring plans.'
      : `${pb.salesFocus} Review open requests before chasing new demand.`,
  };
  return map[tab] || generic[tab];
}

/**
 * Extra vertical insights merged ahead of operational alerts.
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 * @param {Record<string, unknown>} metrics
 */
export function buildVerticalInsightCards(profile, metrics = {}) {
  const cards = [];
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const isPeak = profile.peakMonths.includes(currentMonth);
  const reminders = metrics.reminders || {};
  const coverageDays = Number(metrics.coverageDays) || 0;
  const revenueTrend = Number(metrics.revenueTrend) || 0;

  if (profile.playbook) {
    cards.push({
      title: `${profile.name} playbook`,
      text: profile.playbook.stockFocus,
      tone: 'indigo',
      actionTab: profile.playbook.actionTab,
    });
  }

  if (profile.membershipVertical) {
    cards.push({
      title: 'Membership lifecycle',
      text: 'Sell plans via storefront, POS, or hub enroll. Pending enrollments activate when payment clears; renewals use scheduled billing.',
      tone: 'violet',
      actionTab: 'memberships',
    });
  }

  if (isPeak) {
    cards.push({
      title: 'Peak season active',
      text: `${currentMonth} is a peak month for ${profile.name}. Add ${profile.perishability === 'high' ? '25%' : '15–20%'} safety stock on top movers and staff replenishment.`,
      tone: 'amber',
      actionTab: 'inventory',
    });
  } else if (profile.peakMonths.length > 0) {
    cards.push({
      title: 'Seasonal prep',
      text: `Next peak: ${profile.peakMonths[0]}. Order ${profile.leadTime} days ahead using current sell-through.`,
      tone: 'slate',
      actionTab: 'purchases',
    });
  }

  if (profile.expiryTracking) {
    cards.push({
      title: 'Expiry discipline',
      text: `Regulated or dated stock — run FEFO picks and clear items inside ${Math.min(profile.shelfLife, 90)}-day windows.`,
      tone: 'rose',
      actionTab: 'inventory',
    });
  }

  if (profile.perishability === 'high' && coverageDays > 0 && coverageDays < 14) {
    cards.push({
      title: 'Perishable coverage',
      text: `Estimated ${coverageDays} days of cover — high perishability vertical needs daily par review.`,
      tone: 'amber',
      actionTab: 'inventory',
    });
  }

  if (profile.serialTracking && (reminders.lowStock ?? 0) > 0) {
    cards.push({
      title: 'Serialized SKU alert',
      text: 'Low stock on serialized items — verify warranty units and open RMAs before reordering.',
      tone: 'indigo',
      actionTab: 'inventory',
    });
  }

  if (profile.manufacturing && revenueTrend > 0) {
    cards.push({
      title: 'Production demand',
      text: 'Sales are up — check BOM availability and WIP before promising delivery dates.',
      tone: 'emerald',
      actionTab: 'manufacturing',
    });
  }

  if (profile.serviceMode && revenueTrend <= 0) {
    cards.push({
      title: 'Service utilization',
      text: 'Revenue softened — review appointment fill rate, packages, and follow-up outreach.',
      tone: 'slate',
      actionTab: 'customers',
    });
  }

  return cards;
}

/**
 * Domain-aware KPI labels for overview / sales / stock tiles.
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 */
export function getDomainKpiLabels(profile) {
  const unitsSold =
    profile.category === 'vehicle-dealership' || profile.category === 'auto-marketplace'
      ? 'Units moved'
      : profile.serviceMode
        ? 'Line items'
        : 'Units sold';

  const inventoryLabel = profile.serviceMode ? 'Supplies value' : 'Inventory value';
  const stockTabTitle = profile.expiryTracking ? 'Expiry-aware stock' : 'Stock & coverage';
  const ordersLabel = profile.serviceMode ? 'Jobs / orders' : 'Orders';

  return { unitsSold, inventoryLabel, stockTabTitle, ordersLabel };
}

/**
 * Merge vertical + operational insights, de-duplicated by title.
 * @param {Array<{title:string,text:string,tone:string,actionTab:string}>} operational
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 * @param {Record<string, unknown>} metrics
 */
export function mergeDomainInsights(operational, profile, metrics) {
  const vertical = buildVerticalInsightCards(profile, metrics);
  const seen = new Set();
  const merged = [];
  for (const row of [...vertical, ...operational]) {
    if (seen.has(row.title)) continue;
    seen.add(row.title);
    merged.push(row);
  }
  return merged;
}

/**
 * Insights most relevant to a dashboard tab.
 */
export function filterInsightsForTab(insights, tab) {
  const tabKeywords = {
    sales: ['campaign', 'revenue', 'seasonal', 'peak', 'sales', 'demand', 'production', 'service'],
    accounts: ['expense', 'collections', 'overdue', 'cash', 'margin', 'receivable', 'credit', 'finance'],
    stock: ['restock', 'stock', 'inventory', 'expiry', 'fefo', 'perish', 'shelf', 'batch', 'serial', 'coverage', 'replenish'],
    customers: ['customer', 'retention', 'service utilization', 'repeat', 'visit', 'member'],
    operations: ['store', 'visitor', 'prescription', 'booking', 'appointment', 'request', 'storefront', 'service', 'clinical', 'pharmacy', 'member', 'membership', 'renewal'],
    insights: [],
    overview: [],
  };

  if (tab === 'insights' || tab === 'overview') {
    return insights.slice(0, tab === 'overview' ? 4 : 8);
  }

  const keys = tabKeywords[tab] || [];
  const matched = insights.filter((i) => {
    const blob = `${i.title} ${i.text}`.toLowerCase();
    return keys.some((k) => blob.includes(k));
  });
  return matched.length > 0 ? matched.slice(0, 4) : insights.slice(0, 3);
}

/** Map insight / quick-action ids to Easy dashboard internal tabs (in-page navigation). */
const EASY_INTERNAL_TABS = new Set(['overview', 'sales', 'accounts', 'stock', 'customers', 'insights', 'operations']);
const ACTION_TO_EASY_TAB = {
  inventory: 'stock',
  memberships: 'operations',
};

/**
 * @param {string} actionTab
 * @returns {string|null} Easy tab id when the action should switch tabs in-page
 */
export function resolveEasyTabForAction(actionTab) {
  if (!actionTab) return null;
  if (EASY_INTERNAL_TABS.has(actionTab)) return actionTab;
  if (ACTION_TO_EASY_TAB[actionTab]) return ACTION_TO_EASY_TAB[actionTab];
  return null;
}

/**
 * Vertical stock signals for the Stock tab intelligence strip.
 * @param {ReturnType<typeof resolveEasyDomainProfile>} profile
 * @param {Record<string, unknown>} ctx
 */
export function buildDomainStockSignals(profile, ctx = {}) {
  const coverageDays = Number(ctx.coverageDays) || 0;
  const lowStock = Number(ctx.lowStock) || 0;
  const outOfStock = Number(ctx.outOfStock) || 0;
  const rows = [
    { label: 'Lead time', value: `${profile.leadTime}d`, hint: 'Typical procurement' },
    { label: 'MOQ', value: String(profile.minOrderQuantity), hint: 'Minimum order qty' },
  ];

  if (profile.expiryTracking) {
    rows.push({
      label: 'Shelf life',
      value: `${profile.shelfLife}d`,
      hint: 'FEFO clearance window',
      tone: 'text-amber-700',
    });
  }

  if (profile.perishability === 'high') {
    rows.push({
      label: 'Cover est.',
      value: coverageDays > 365 ? '365+d' : `${coverageDays}d`,
      hint: 'High perishability vertical',
      tone: coverageDays < 14 ? 'text-rose-700' : 'text-amber-700',
    });
  } else if (lowStock > 0) {
    rows.push({
      label: 'Low-stock SKUs',
      value: String(lowStock),
      hint: 'Below safety level',
      tone: 'text-amber-700',
    });
  } else if (outOfStock > 0) {
    rows.push({
      label: 'Out of stock',
      value: String(outOfStock),
      hint: 'Zero-qty catalog rows',
      tone: 'text-rose-700',
    });
  } else if (profile.multiLocation) {
    rows.push({
      label: 'Locations',
      value: 'Multi',
      hint: 'Check transfers before PO',
    });
  }

  return rows.slice(0, 4);
}

/**
 * Badge counts for Easy dashboard tab triggers.
 * @param {Record<string, unknown>} reminders
 * @param {{ operations?: number|null }} [extra]
 */
export function buildEasyTabBadges(reminders = {}, extra = {}) {
  const lowStock = Number(reminders.lowStock) || 0;
  const overdue = Number(reminders.overdueInvoices) || 0;
  const pending = Number(reminders.pendingOrders) || 0;
  const operations = Number(extra.operations) || 0;
  return {
    sales: pending > 0 ? pending : null,
    accounts: overdue > 0 ? overdue : null,
    stock: lowStock > 0 ? lowStock : null,
    operations: operations > 0 ? operations : null,
  };
}
