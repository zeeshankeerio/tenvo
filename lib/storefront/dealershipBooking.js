/**
 * Unified dealership booking + contact intents (Sehgal + VINCAR).
 * Single source for homepage booking strip, contact form subjects, and product CTAs.
 */
import { isSehgalShowroomProfile, SEHGAL_LOCATIONS } from '@/lib/storefront/dealershipShowroomProfile';
import { getDealershipServices } from '@/lib/storefront/autoDealership';

/** @typedef {{ id: string; subject: string; label: string; title: string; subtitle: string; messagePlaceholder: string; icon: string; showOnStrip?: boolean }} BookingIntent */

const CORE_BOOKING_INTENTS = {
  testdrive: {
    subject: 'testdrive',
    label: 'Test drive',
    title: 'Schedule a test drive',
    subtitle: 'Pick a date and tell us which model you would like to experience at our showroom.',
    messagePlaceholder: 'Preferred showroom, date, time, and any special requests.',
    icon: 'car',
    showOnStrip: true,
  },
  visit: {
    subject: 'visit',
    label: 'Showroom visit',
    title: 'Book a showroom visit',
    subtitle: 'Plan a visit with our sales team for a guided walkthrough of inventory and services.',
    messagePlaceholder: 'Preferred branch, date, time, and what you are looking for.',
    icon: 'map',
    showOnStrip: true,
  },
  sell: {
    subject: 'sell',
    label: 'Sell / trade-in',
    title: 'Value my car',
    subtitle: 'Share your vehicle details for a trade-in or sell valuation from our team.',
    messagePlaceholder: 'Make, model, year, mileage, registration city, and condition.',
    icon: 'gauge',
    showOnStrip: true,
  },
  finance: {
    subject: 'finance',
    label: 'Finance',
    title: 'Finance inquiry',
    subtitle: 'Get competitive rates and fast approval options for your next car.',
    messagePlaceholder: 'Vehicle of interest, loan amount, down payment, and preferred tenure.',
    icon: 'percent',
    showOnStrip: true,
  },
  buy: {
    subject: 'buy',
    label: 'Buy inquiry',
    title: 'Buy inquiry',
    subtitle: 'Tell us which vehicle you are interested in and we will get back to you.',
    messagePlaceholder: 'Model, colour preference, budget, and timeline to purchase.',
    icon: 'tag',
    showOnStrip: false,
  },
};

const SEHGAL_BOOKING_INTENTS = {
  ppf: {
    subject: 'ppf',
    label: 'PPF quote',
    title: 'PPF installation inquiry',
    subtitle: 'Color or transparent paint protection film, installed by certified specialists.',
    messagePlaceholder: 'Vehicle make/model, color choice, coverage area, and preferred branch.',
    icon: 'shield',
    showOnStrip: true,
  },
  conversion: {
    subject: 'conversion',
    title: 'Body conversion inquiry',
    label: 'Conversion quote',
    subtitle: 'Hilux, Prado, Fortuner, Land Cruiser, and luxury conversion packages.',
    messagePlaceholder: 'Base vehicle, target style, painted or unpainted, and timeline.',
    icon: 'wrench',
    showOnStrip: true,
  },
  service: {
    subject: 'service',
    label: 'Service booking',
    title: 'Service & modification booking',
    subtitle: 'Book installation for accessories, audio, lighting, or modification work.',
    messagePlaceholder: 'Vehicle details, parts or service needed, and preferred appointment date.',
    icon: 'calendar',
    showOnStrip: false,
  },
};

const VINCAR_BOOKING_INTENTS = {
  leasing: {
    subject: 'leasing',
    label: 'Leasing',
    title: 'Leasing inquiry',
    subtitle: 'Flexible personal and fleet leasing plans tailored to your needs.',
    messagePlaceholder: 'Vehicle type, lease duration, and estimated monthly budget.',
    icon: 'calendar',
    showOnStrip: true,
  },
  insurance: {
    subject: 'insurance',
    label: 'Insurance',
    title: 'Insurance inquiry',
    subtitle: 'Comprehensive cover arranged in-house with competitive premiums.',
    messagePlaceholder: 'Vehicle details and current policy expiry if applicable.',
    icon: 'shield',
    showOnStrip: true,
  },
};

/**
 * @param {{ country?: string; settings?: object }} business
 * @param {object} [settings]
 */
export function getDealershipBookingIntents(business = {}, settings = {}) {
  const sehgal = isSehgalShowroomProfile(business, settings);
  return {
    ...CORE_BOOKING_INTENTS,
    ...(sehgal ? SEHGAL_BOOKING_INTENTS : VINCAR_BOOKING_INTENTS),
    general: {
      subject: 'general',
      label: 'General inquiry',
      title: 'Contact us',
      subtitle: 'Send us a message and our team will respond shortly.',
      messagePlaceholder: 'How can we help?',
      icon: 'message',
      showOnStrip: false,
    },
  };
}

/**
 * @param {string} base
 * @param {{ country?: string; settings?: object }} business
 * @param {object} [settings]
 */
export function getDealershipBookingStripItems(base, business = {}, settings = {}) {
  const intents = getDealershipBookingIntents(business, settings);
  return Object.entries(intents)
    .filter(([, intent]) => intent.showOnStrip)
    .map(([id, intent]) => ({
      id,
      label: intent.label,
      href: `${base}/contact?${id}=1`,
      icon: intent.icon,
    }));
}

/**
 * @param {{ country?: string; settings?: object }} business
 * @param {object} [settings]
 */
export function getDealershipBookingSubjectOptions(business = {}, settings = {}) {
  const intents = getDealershipBookingIntents(business, settings);
  const order = isSehgalShowroomProfile(business, settings)
    ? ['testdrive', 'visit', 'buy', 'sell', 'finance', 'ppf', 'conversion', 'service', 'general']
    : ['testdrive', 'visit', 'buy', 'sell', 'finance', 'leasing', 'insurance', 'general'];

  return order
    .filter((key) => intents[key])
    .map((key) => ({ value: intents[key].subject, label: intents[key].label }));
}

/**
 * @param {URLSearchParams | { get: (k: string) => string | null }} searchParams
 * @param {{ country?: string; settings?: object }} business
 * @param {object} [settings]
 */
export function resolveDealershipBookingIntent(searchParams, business = {}, settings = {}) {
  const intents = getDealershipBookingIntents(business, settings);
  for (const key of Object.keys(intents)) {
    if (searchParams.get(key) === '1' || searchParams.get('intent') === key) {
      return { key, ...intents[key] };
    }
  }
  const vehicle = searchParams.get('vehicle');
  if (vehicle) {
    return {
      key: 'buy',
      ...intents.buy,
      vehiclePrefill: vehicle,
    };
  }
  return null;
}

export const BOOKING_TIME_SLOTS = [
  { id: 'morning', label: 'Morning (10 am - 12 pm)' },
  { id: 'afternoon', label: 'Afternoon (12 pm - 4 pm)' },
  { id: 'evening', label: 'Evening (4 pm - 7 pm)' },
];

/**
 * @param {{ country?: string; settings?: object }} business
 * @param {object} [settings]
 */
export function getDealershipShowroomLocations(business = {}, settings = {}) {
  if (!isSehgalShowroomProfile(business, settings)) {
    return [
      { id: 'alexandra', label: 'Alexandra showroom' },
      { id: 'lengkee', label: 'Leng Kee showroom' },
    ];
  }
  return SEHGAL_LOCATIONS.map((loc) => ({ id: loc.id, label: loc.label }));
}

/**
 * @param {string} base
 * @param {{ country?: string; settings?: object }} business
 * @param {object} [settings]
 */
export function getDealershipUnifiedServices(base, business = {}, settings = {}) {
  const sehgal = isSehgalShowroomProfile(business, settings);
  const products = `${base}/products`;
  const core = getDealershipServices(base);

  if (!sehgal) {
    return core;
  }

  const byId = new Map(core.map((s) => [s.id, s]));
  const extras = [
    {
      id: 'ppf',
      title: 'PPF installation',
      subtitle: 'Color and transparent paint protection film',
      href: `${base}/contact?ppf=1`,
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'conversion',
      title: 'Body conversions',
      subtitle: 'Hilux, Prado, Fortuner, and luxury packages',
      href: `${base}/contact?conversion=1`,
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'autostore',
      title: 'Auto store',
      subtitle: 'Parts, accessories, and car care with nationwide delivery',
      href: `${products}?category=Auto+Store`,
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80&auto=format&fit=crop',
    },
    {
      id: 'service',
      title: 'Service booking',
      subtitle: 'Installations, modifications, and workshop appointments',
      href: `${base}/contact?service=1`,
      image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80&auto=format&fit=crop',
    },
  ];

  for (const item of extras) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return ['new', 'preowned', 'financing', 'ppf', 'conversion', 'autostore', 'service']
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, 6);
}

/**
 * @param {ReturnType<import('@/lib/storefront/autoDealership').partitionShowroomCatalog>} partition
 */
export function getDealershipInventoryTabs(partition) {
  const unique = (list) => {
    const seen = new Set();
    const out = [];
    for (const p of list || []) {
      const key = String(p.id || p.sku || p.name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };

  const tabs = [
    { id: 'all', label: 'All', items: unique(partition.vehicles) },
    { id: 'new', label: 'New', items: unique(partition.newCars) },
    { id: 'used', label: 'Used', items: unique(partition.preOwned) },
  ];

  if (partition.luxury?.length) {
    tabs.push({ id: 'luxury', label: 'Luxury', items: unique(partition.luxury) });
  }
  if (partition.imported?.length) {
    tabs.push({ id: 'imported', label: 'Imported', items: unique(partition.imported) });
  }

  return tabs.filter((t) => t.items.length > 0);
}

export const DEALERSHIP_CONTACT_SUBJECTS = new Set([
  'general', 'testdrive', 'visit', 'sell', 'finance', 'leasing', 'insurance', 'buy',
  'ppf', 'conversion', 'service',
]);

/**
 * @param {Array<Record<string, unknown>>} onSale
 * @param {Array<Record<string, unknown>>} bestSellers
 */
export function filterSaleExcludingBestSellers(onSale, bestSellers) {
  const bestKeys = new Set(
    (bestSellers || []).map((p) => String(p.id || p.sku || p.name))
  );
  return (onSale || []).filter((p) => !bestKeys.has(String(p.id || p.sku || p.name)));
}

/**
 * @param {string} base
 * @param {'testdrive' | 'buy' | 'finance'} action
 * @param {string} vehicleName
 */
export function buildVehicleBookingHref(base, action, vehicleName) {
  const params = new URLSearchParams({ [action]: '1' });
  if (vehicleName) params.set('vehicle', vehicleName);
  return `${base}/contact?${params.toString()}`;
}
