/**
 * Per-package marketing copy for `/solutions/[slug]` pages.
 * Icon fields are Lucide export names (strings), resolved in the client page component.
 */
import {
  CLOTHING_COMMERCE_HIGHLIGHTS,
  PHARMACY_COMMERCE_HIGHLIGHTS,
  AUTO_PARTS_COMMERCE_HIGHLIGHTS,
  VEHICLE_SHOWROOM_HIGHLIGHTS,
  FURNITURE_COMMERCE_HIGHLIGHTS,
  FITNESS_COMMERCE_HIGHLIGHTS,
} from '@/lib/config/domainPackageFeatures';

/** @type {Record<string, object>} */
export const DOMAIN_PACKAGE_SOLUTIONS_CONTENT = {
  'clothing-commerce': {
    heroEyebrow: 'Fashion & textile suite',
    channelsHeading: 'What a large clothing operator actually runs',
    channelsLead:
      'Most scaled fashion groups run a public store, one or more showrooms, and a B2B desk, often with separate price lists per channel.',
    modulesHeading: 'Module mix tuned for fashion & textile',
    modulesLead: 'Honest status labels aligned with product capabilities and plan gates in the hub.',
    highlightFeatures: CLOTHING_COMMERCE_HIGHLIGHTS,
    channelPillars: [
      {
        icon: 'Globe',
        title: 'Online storefront',
        body: 'Branded catalog with variants, filters, cart, and checkout. Orders land in the same hub as showroom sales.',
        accent: 'border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white',
        iconClass: 'bg-violet-600 text-white',
      },
      {
        icon: 'Store',
        title: 'Retail POS',
        body: 'Counter checkout with barcode lookup, loyalty, and thermal receipts. Stock decrements from the same matrix as your web store.',
        accent: 'border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-white',
        iconClass: 'bg-rose-600 text-white',
      },
      {
        icon: 'Shirt',
        title: 'Wholesale desk',
        body: 'Price lists, credit limits, quotations, and delivery challans for dealers and market buyers, without a second ERP.',
        accent: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white',
        iconClass: 'bg-emerald-600 text-white',
      },
    ],
    verticalPresets: [
      { key: 'garments', label: 'Garments & fashion retail', desc: 'Size/color matrix, seasons, omni-channel' },
      { key: 'boutique-fashion', label: 'Designer boutique', desc: 'Collections, stitching types, luxury storefront' },
      { key: 'textile-wholesale', label: 'Textile wholesale', desc: 'Thaan, article/design, broker fields' },
      { key: 'textile-mill', label: 'Textile mill', desc: 'Fabric production, BOM, batch rolls' },
    ],
    faqTitle: 'Clothing commerce suite FAQ',
    ctaTitle: 'Run your next collection on one hub',
  },
  'pharmacy-commerce': {
    heroEyebrow: 'Pharmacy & wellness suite',
    channelsHeading: 'Counter, delivery, and compliant catalog',
    channelsLead:
      'Licensed pharmacies run a regulated product catalog, fast counter sales, and repeat-order delivery, with expiry-aware stock and pharmacist-led support.',
    modulesHeading: 'Module mix tuned for pharmacy operators',
    modulesLead: 'Honest status labels aligned with product capabilities and plan gates in the hub.',
    highlightFeatures: PHARMACY_COMMERCE_HIGHLIGHTS,
    channelPillars: [
      {
        icon: 'Globe',
        title: 'Online pharmacy',
        body: 'OTC, wellness, and repeat-order catalog with branded pharmacy storefront, cart, and hub order fulfilment.',
        accent: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white',
        iconClass: 'bg-emerald-600 text-white',
      },
      {
        icon: 'Store',
        title: 'Counter POS',
        body: 'Barcode lookup, GST receipts, and fast checkout for walk-in customers. Same stock ledger as online orders.',
        accent: 'border-teal-200/80 bg-gradient-to-br from-teal-50/70 to-white',
        iconClass: 'bg-teal-700 text-white',
      },
      {
        icon: 'Stethoscope',
        title: 'Care & support',
        body: 'Appointment booking, helpdesk tickets, and feedback loops for pharmacist consultations and refill reminders.',
        accent: 'border-sky-200/80 bg-gradient-to-br from-sky-50/70 to-white',
        iconClass: 'bg-sky-700 text-white',
      },
    ],
    verticalPresets: [
      { key: 'pharmacy', label: 'Licensed pharmacy', desc: 'Expiry batches, OTC catalog, delivery thresholds' },
    ],
    faqTitle: 'Pharmacy commerce suite FAQ',
    ctaTitle: 'Run your pharmacy on one compliant hub',
  },
  'auto-parts-commerce': {
    heroEyebrow: 'Auto parts & accessories suite',
    channelsHeading: 'Parts counter, e-shop, and trade desk',
    channelsLead:
      'Auto parts retailers combine vehicle-aware search, trade counter sales, and wholesale supply, often across multiple branches and brands.',
    modulesHeading: 'Module mix tuned for parts retailers',
    modulesLead: 'Honest status labels aligned with product capabilities and plan gates in the hub.',
    highlightFeatures: AUTO_PARTS_COMMERCE_HIGHLIGHTS,
    channelPillars: [
      {
        icon: 'Search',
        title: 'Parts finder storefront',
        body: 'Vehicle-aware hero search, category rails, and OEM-style catalog on a branded public store wired to hub inventory.',
        accent: 'border-red-200/80 bg-gradient-to-br from-red-50/70 to-white',
        iconClass: 'bg-red-600 text-white',
      },
      {
        icon: 'Wrench',
        title: 'Trade counter POS',
        body: 'Barcode and part-number lookup, credit accounts for workshops, and thermal receipts at the counter.',
        accent: 'border-zinc-200/80 bg-gradient-to-br from-zinc-50/70 to-white',
        iconClass: 'bg-zinc-800 text-white',
      },
      {
        icon: 'Truck',
        title: 'Wholesale supply',
        body: 'Supplier quotes, price lists for workshops, and multi-warehouse fulfilment for fast-moving SKUs.',
        accent: 'border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white',
        iconClass: 'bg-amber-700 text-white',
      },
    ],
    verticalPresets: [
      { key: 'auto-parts', label: 'Auto parts & accessories', desc: 'Parts finder, OEM filters, multi-brand catalog' },
    ],
    faqTitle: 'Auto parts commerce suite FAQ',
    ctaTitle: 'Stock, sell, and ship parts from one hub',
  },
  'vehicle-showroom': {
    heroEyebrow: 'Vehicle showroom suite',
    channelsHeading: 'Showroom, listings, and aftersales shop',
    channelsLead:
      'Dealerships list vehicles online, book test drives, sell parts and accessories, and run showroom POS without a separate CRM and DMS stack.',
    modulesHeading: 'Module mix tuned for vehicle dealerships',
    modulesLead: 'Honest status labels aligned with product capabilities and plan gates in the hub.',
    highlightFeatures: VEHICLE_SHOWROOM_HIGHLIGHTS,
    channelPillars: [
      {
        icon: 'Car',
        title: 'Digital showroom',
        body: 'Vehicle listings with make, model, condition, and booking CTAs on a branded dealership storefront.',
        accent: 'border-neutral-200/80 bg-gradient-to-br from-neutral-100/70 to-white',
        iconClass: 'bg-neutral-900 text-white',
      },
      {
        icon: 'Calendar',
        title: 'Test drives & leads',
        body: 'Appointment booking, lead capture forms, live chat, and nurture campaigns from the same customer record.',
        accent: 'border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-white',
        iconClass: 'bg-blue-800 text-white',
      },
      {
        icon: 'Wrench',
        title: 'Parts & accessories shop',
        body: 'E-shop for car care, PPF, and accessories with POS checkout and shared customer accounts.',
        accent: 'border-red-200/80 bg-gradient-to-br from-red-50/60 to-white',
        iconClass: 'bg-red-700 text-white',
      },
    ],
    verticalPresets: [
      { key: 'vehicle-dealership', label: 'Single-brand dealership', desc: 'Listings, test drives, parts e-shop, UAN booking' },
    ],
    faqTitle: 'Vehicle showroom suite FAQ',
    ctaTitle: 'List, book, and sell from one dealership hub',
  },
  'furniture-commerce': {
    heroEyebrow: 'Furniture & home suite',
    channelsHeading: 'Showroom, delivery, and large-ticket online',
    channelsLead:
      'Furniture retailers sell high-ticket collections online and in showroom, coordinate delivery challans, and reserve stock for custom orders.',
    modulesHeading: 'Module mix tuned for furniture & home',
    modulesLead: 'Honest status labels aligned with product capabilities and plan gates in the hub.',
    highlightFeatures: FURNITURE_COMMERCE_HIGHLIGHTS,
    channelPillars: [
      {
        icon: 'Home',
        title: 'Elevated storefront',
        body: 'Room-inspired catalog, collection pages, and checkout with delivery thresholds for bulky goods.',
        accent: 'border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white',
        iconClass: 'bg-amber-900 text-white',
      },
      {
        icon: 'Sofa',
        title: 'Showroom POS',
        body: 'In-store quotes, deposits, and barcode lookup. Same stock picture as your web catalog.',
        accent: 'border-stone-200/80 bg-gradient-to-br from-stone-50/70 to-white',
        iconClass: 'bg-stone-800 text-white',
      },
      {
        icon: 'Truck',
        title: 'Delivery & reservations',
        body: 'Delivery challans, stock reservations for made-to-order lines, and multi-warehouse fulfilment.',
        accent: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white',
        iconClass: 'bg-emerald-800 text-white',
      },
    ],
    verticalPresets: [
      { key: 'furniture', label: 'Furniture & home', desc: 'Living, bedroom, dining collections with delivery' },
    ],
    faqTitle: 'Furniture commerce suite FAQ',
    ctaTitle: 'Showcase and deliver furniture from one hub',
  },
  'fitness-commerce': {
    heroEyebrow: 'Gym & fitness suite',
    channelsHeading: 'Supplements, memberships, and coached training',
    channelsLead:
      'Modern gyms run a branded supplement shop, front-desk membership sales, and personal training booked online, often with separate tools for each channel.',
    modulesHeading: 'Module mix tuned for gym & fitness operators',
    modulesLead: 'Honest status labels aligned with product capabilities and plan gates in the hub.',
    highlightFeatures: FITNESS_COMMERCE_HIGHLIGHTS,
    channelPillars: [
      {
        icon: 'Globe',
        title: 'Elevated supplement store',
        body: 'Dark fitness hero, category rails for whey and pre-workout, membership tiers, and coach profiles on a branded public storefront.',
        accent: 'border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-black/5',
        iconClass: 'bg-rose-600 text-white',
      },
      {
        icon: 'Dumbbell',
        title: 'Front desk & POS',
        body: 'Sell memberships, class packs, and counter supplements with barcode lookup and thermal receipts. Same stock as your web shop.',
        accent: 'border-zinc-200/80 bg-gradient-to-br from-zinc-100/70 to-white',
        iconClass: 'bg-zinc-900 text-white',
      },
      {
        icon: 'Calendar',
        title: 'Coaching & booking',
        body: 'Tenant meeting URLs for PT and nutrition consults, contact flows for trial passes, and hub queue for follow-up.',
        accent: 'border-red-200/80 bg-gradient-to-br from-red-50/60 to-white',
        iconClass: 'bg-red-700 text-white',
      },
    ],
    verticalPresets: [
      { key: 'gym-fitness', label: 'Gym & fitness center', desc: 'Supplements, memberships, PT packs, and booking' },
    ],
    faqTitle: 'Gym & fitness commerce suite FAQ',
    ctaTitle: 'Stock, sell, and coach from one fitness hub',
  },
};

/**
 * @param {string} slug
 */
export function getDomainPackageSolutionsContent(slug) {
  return DOMAIN_PACKAGE_SOLUTIONS_CONTENT[slug] || null;
}
