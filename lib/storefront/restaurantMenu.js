/**
 * Restaurant digital menu — category sidebar, order modes, and layout helpers.
 * Isolated to elevated `restaurant-cafe` storefronts.
 */
import {
  Star,
  UtensilsCrossed,
  Cake,
  Sandwich,
  Coffee,
  Flame,
  Soup,
  Salad,
  Pizza,
  Beef,
} from 'lucide-react';
import { RESTAURANT_ORDER_MODES } from '@/lib/storefront/restaurantStorefront';

/** Lucide icons keyed by normalized category slug / alias. */
export const RESTAURANT_MENU_ICON_MAP = {
  popular: Star,
  featured: Star,
  deals: Flame,
  starter: Soup,
  starters: Soup,
  appetizer: Soup,
  appetizers: Soup,
  soup: Soup,
  salad: Salad,
  salads: Salad,
  dessert: Cake,
  desserts: Cake,
  sweets: Cake,
  'fast-food': Sandwich,
  fastfood: Sandwich,
  burger: Sandwich,
  burgers: Sandwich,
  pizza: Pizza,
  'main-course': UtensilsCrossed,
  main: UtensilsCrossed,
  mains: UtensilsCrossed,
  karahi: Beef,
  bbq: Flame,
  grill: Flame,
  beverage: Coffee,
  beverages: Coffee,
  drinks: Coffee,
  drink: Coffee,
};

export const RESTAURANT_MENU_THEME = {
  pageBg: '#f4f4f5',
  panelBg: '#ffffff',
  panelBorder: '#e4e4e7',
  text: '#18181b',
  textMuted: '#71717a',
  searchBg: '#ffffff',
  cartCta: '#dc2626',
  accentFallback: '#dc2626',
};

/**
 * @param {string | null | undefined} slugOrLabel
 */
export function resolveRestaurantMenuIcon(slugOrLabel) {
  const key = String(slugOrLabel || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return RESTAURANT_MENU_ICON_MAP[key] || UtensilsCrossed;
}

/**
 * Build sidebar nav items from tenant categories + curated shortcuts.
 * @param {object[]} categories
 * @param {string} storeBase
 * @param {{ featured?: boolean }} [opts]
 */
export function buildRestaurantMenuNavItems(categories = [], storeBase, opts = {}) {
  const productsUrl = `${storeBase}/products`;
  const items = [
    {
      id: 'popular',
      label: 'Popular',
      slug: '',
      href: `${productsUrl}?sort=popularity`,
      icon: Star,
      featured: true,
    },
  ];

  const seen = new Set(['popular']);
  for (const cat of categories) {
    const slug = cat.slug || String(cat.name || '').toLowerCase().replace(/\s+/g, '-');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    items.push({
      id: slug,
      label: cat.name || slug,
      slug,
      href: `${productsUrl}?category=${encodeURIComponent(slug)}`,
      icon: resolveRestaurantMenuIcon(slug) || resolveRestaurantMenuIcon(cat.name),
    });
  }

  if (opts.includeDeals !== false) {
    items.push({
      id: 'deals',
      label: 'Deals',
      slug: 'deals',
      href: `${productsUrl}?onSale=true`,
      icon: Flame,
    });
  }

  return items;
}

/**
 * @param {string | null | undefined} orderMode
 */
export function resolveRestaurantOrderModes(orderModes) {
  return Array.isArray(orderModes) && orderModes.length ? orderModes : RESTAURANT_ORDER_MODES;
}

export function normalizeRestaurantOrderMode(mode) {
  const m = String(mode || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
  if (m === 'takeaway' || m === 'take-away' || m === 'pickup' || m === 'collection') {
    return m === 'pickup' || m === 'take-away' || m === 'takeaway' ? 'collection' : m;
  }
  if (m === 'dinein' || m === 'dine_in') return 'dine-in';
  if (['delivery', 'collection', 'dine-in'].includes(m)) return m;
  return 'delivery';
}

/**
 * Checkout steps for restaurant storefront by order mode.
 * @param {string} orderMode
 */
export function getRestaurantCheckoutSteps(orderMode) {
  if (isRestaurantPickupOrder(orderMode)) {
    return [
      { id: 'information', label: 'Details' },
      { id: 'payment', label: 'Payment' },
      { id: 'review', label: 'Review' },
    ];
  }
  return [
    { id: 'information', label: 'Contact' },
    { id: 'shipping', label: 'Delivery' },
    { id: 'payment', label: 'Payment' },
    { id: 'review', label: 'Review' },
  ];
}

/**
 * Delivery / service fee for restaurant carts (pickup and dine-in are always free).
 */
export function resolveRestaurantShippingCost({
  orderMode,
  subtotal = 0,
  freeShippingThreshold = 2000,
  deliveryFee = 150,
  expressFee = 300,
  shippingMethod = 'standard',
} = {}) {
  if (isRestaurantPickupOrder(orderMode)) return 0;
  if (shippingMethod === 'pickup') return 0;
  if (shippingMethod === 'express') return expressFee;
  return subtotal >= freeShippingThreshold ? 0 : deliveryFee;
}

/**
 * Cart / checkout summary label for the fee row.
 * @param {string} orderMode
 */
export function getRestaurantFeeLabel(orderMode) {
  const mode = normalizeRestaurantOrderMode(orderMode);
  if (mode === 'dine-in') return 'Dine-in service';
  if (mode === 'collection') return 'Takeaway';
  return 'Delivery';
}

/**
 * Map restaurant order mode to storefront checkout shipping method.
 * @param {string} orderMode — delivery | collection | dine-in
 */
export function restaurantOrderModeToShipping(orderMode) {
  const mode = normalizeRestaurantOrderMode(orderMode);
  if (mode === 'delivery') return 'standard';
  return 'pickup';
}

/**
 * Human label for order mode on cart / checkout.
 * @param {string} orderMode
 * @param {object[]} [modes]
 */
export function restaurantOrderModeLabel(orderMode, modes = RESTAURANT_ORDER_MODES) {
  const mode = normalizeRestaurantOrderMode(orderMode);
  const found = modes.find((m) => m.id === mode);
  return found?.label || mode || 'Delivery';
}

/**
 * @param {string} businessId
 */
export function getRestaurantOrderModeStorageKey(businessId) {
  return businessId ? `tenvo_restaurant_order_mode_${businessId}` : 'tenvo_restaurant_order_mode';
}

/**
 * @param {string | null | undefined} orderMode
 */
export function isRestaurantPickupOrder(orderMode) {
  const mode = normalizeRestaurantOrderMode(orderMode);
  return mode === 'collection' || mode === 'dine-in';
}

/**
 * Build human-readable order notes for kitchen / hub routing.
 * @param {{ orderMode?: string; tableNumber?: string; orderNotes?: string; orderModeLabel?: string }} params
 */
export function buildRestaurantOrderNotes({
  orderMode,
  tableNumber,
  orderNotes,
  orderModeLabel,
} = {}) {
  const mode = normalizeRestaurantOrderMode(orderMode);
  const parts = [];
  if (mode) {
    const label = orderModeLabel || restaurantOrderModeLabel(mode);
    parts.push(`Order type: ${label}`);
  }
  if (mode === 'dine-in' && tableNumber?.trim()) {
    parts.push(`Table: ${tableNumber.trim()}`);
  }
  if (orderNotes?.trim()) {
    parts.push(`Notes: ${orderNotes.trim()}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Pickup / dine-in placeholder address for orders API validation.
 * @param {object} business
 * @param {string} orderMode
 * @param {string} [tableNumber]
 */
export function buildRestaurantPickupAddress(business, orderMode, tableNumber) {
  const mode = normalizeRestaurantOrderMode(orderMode);
  const storeName = business?.business_name || 'Restaurant';
  const city = business?.city || 'Pickup';
  if (mode === 'dine-in') {
    const table = tableNumber?.trim();
    return {
      address: table ? `Dine-in · Table ${table}` : `Dine-in · ${storeName}`,
      city,
      postalCode: '00000',
      country: business?.country || 'PK',
    };
  }
  return {
    address: `Takeaway pickup · ${storeName}`,
    city,
    postalCode: '00000',
    country: business?.country || 'PK',
  };
}

/** Shared Tailwind tokens for restaurant dark surfaces (homepage hero). */
export const RESTAURANT_UI = {
  page: 'bg-[#0a0a0a] text-neutral-100',
  card: 'rounded-2xl border border-neutral-800 bg-[#141414] shadow-lg shadow-black/25',
  cardHover: 'transition duration-300 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/30',
  input:
    'border-neutral-700 bg-[#1c1c1c] text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:ring-neutral-600',
  muted: 'text-neutral-400',
  heading: 'text-white font-semibold',
  divider: 'border-neutral-800',
};

/** Light cart / checkout surfaces — matches menu page. */
export const RESTAURANT_CHECKOUT_UI = {
  page: 'bg-zinc-100 text-zinc-900',
  card: 'rounded-2xl border border-zinc-200 bg-white shadow-sm',
  cardHover: 'transition duration-300 hover:border-zinc-300 hover:shadow-md',
  input:
    'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-zinc-300',
  muted: 'text-zinc-500',
  heading: 'text-zinc-900 font-semibold',
  divider: 'border-zinc-200',
  summaryCard: 'rounded-2xl border border-zinc-200 bg-white shadow-sm',
};
