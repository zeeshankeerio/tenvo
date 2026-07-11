/**
 * Domain-specific commercial packages — presets for vertical SKUs.
 *
 * Each package combines:
 * - supported vertical keys (`garments`, `textile-wholesale`, …)
 * - recommended SaaS plan tier + optional limit bumps
 * - optional `settings.packaging` custom feature overrides
 * - marketing metadata for `/solutions/*` pages
 *
 * Runtime access still flows through `planHasFeatureWithPackaging` and plan limits;
 * domain packages are applied at registration or by platform admin.
 *
 * @see docs/MODULAR_PACKAGING_AND_DASHBOARD_MATRIX.md
 * @see lib/subscription/effectivePlanAccess.js
 */

import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { mergePackagingIntoBusinessSettings } from '@/lib/utils/businessPackagingSettings';
import { applyRegistrationVerticalPackaging } from '@/lib/onboarding/registrationVerticalPackaging.js';
import {
  CLOTHING_COMMERCE_FEATURE_OVERRIDES,
  PHARMACY_COMMERCE_FEATURE_OVERRIDES,
  AUTO_PARTS_COMMERCE_FEATURE_OVERRIDES,
  VEHICLE_SHOWROOM_FEATURE_OVERRIDES,
  FURNITURE_COMMERCE_FEATURE_OVERRIDES,
  FITNESS_COMMERCE_FEATURE_OVERRIDES,
} from '@/lib/config/domainPackageFeatures';

export {
  CLOTHING_COMMERCE_FEATURE_OVERRIDES,
  PHARMACY_COMMERCE_FEATURE_OVERRIDES,
  AUTO_PARTS_COMMERCE_FEATURE_OVERRIDES,
  VEHICLE_SHOWROOM_FEATURE_OVERRIDES,
  FURNITURE_COMMERCE_FEATURE_OVERRIDES,
  FITNESS_COMMERCE_FEATURE_OVERRIDES,
} from '@/lib/config/domainPackageFeatures';

/** @typedef {'shipped' | 'partial' | 'roadmap'} DomainCapabilityStatus */

/**
 * @typedef {Object} DomainPackageModule
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string[]} bullets
 * @property {DomainCapabilityStatus} [status]
 */

/**
 * @typedef {Object} DomainPackageDefinition
 * @property {string} key
 * @property {string} slug
 * @property {string} name
 * @property {string} tagline
 * @property {string} summary
 * @property {string[]} verticals
 * @property {string} defaultVertical
 * @property {string} recommendedPlanTier
 * @property {Record<string, number>} [limitOverrides]
 * @property {{ mode: 'tier' | 'custom', feature_overrides?: Record<string, boolean> }} packaging
 * @property {{ price_pkr: number, price_usd: number, billing?: string, badge?: string | null }} pricing
 * @property {string} marketingPath
 * @property {string} [demoStoreDomain]
 * @property {DomainPackageModule[]} moduleGroups
 * @property {Array<{ question: string, answer: string }>} faqs
 * @property {string[]} competitorNotes
 * @property {Array<{ key: string, label: string, desc: string }>} [verticalPresets]
 */

/**
 * Canonical domain package catalog. Add new vertical SKUs here.
 * @type {Record<string, DomainPackageDefinition>}
 */
export const DOMAIN_PACKAGES = Object.freeze({
  'clothing-commerce': {
    key: 'clothing-commerce',
    slug: 'clothing-commerce',
    name: 'Clothing & Textile Commerce Suite',
    tagline: 'Online store, retail POS, and wholesale in one stock picture',
    summary:
      'Built for Pakistani and regional fashion operators running a branded storefront, showroom POS, and B2B wholesale desk from the same catalog. Size/color variants, seasonal collections, price lists, thaan-aware inventory, and campaign tools without stitching Shopify, Busy, and spreadsheets together.',
    verticals: ['garments', 'boutique-fashion', 'textile-wholesale', 'textile-mill'],
    defaultVertical: 'garments',
    recommendedPlanTier: 'business',
    limitOverrides: {
      max_users: 20,
      max_products: 25000,
      max_customers: 8000,
      max_vendors: 3000,
      max_warehouses: 12,
      max_invoices_per_month: 15000,
      max_pos_terminals: 8,
      max_storage_mb: 8000,
      max_branches: 8,
    },
    packaging: {
      mode: 'custom',
      feature_overrides: { ...CLOTHING_COMMERCE_FEATURE_OVERRIDES },
    },
    pricing: {
      price_pkr: 12999,
      price_usd: 45,
      billing: 'monthly',
      badge: 'Vertical suite',
    },
    marketingPath: '/solutions/clothing-commerce',
    demoStoreDomain: 'demo-textile',
    moduleGroups: [
      {
        id: 'catalog',
        title: 'Fashion catalog & variants',
        body:
          'Size/color matrix, designer and season fields, fabric sourcing, and rich PK clothing seed catalogs on registration. Excel bulk import for large seasonal drops.',
        bullets: [
          'Variant-aware storefront and hub inventory',
          'Season, collection, and stitching status fields',
          'PK brand presets and demo boutique storefront',
        ],
        status: 'shipped',
      },
      {
        id: 'channels',
        title: 'Three channels, one ledger',
        body:
          'Public online store, in-store POS, and wholesale quotations share stock, tax, and customer credit without duplicate SKU lists.',
        bullets: [
          'Branded storefront with cart and checkout',
          'Retail POS with barcode lookup',
          'B2B quotes, sales orders, and delivery challans',
        ],
        status: 'shipped',
      },
      {
        id: 'wholesale',
        title: 'Wholesale & trade pricing',
        body:
          'Separate price lists for retail, dealer, and export buyers. Credit limits, broker-friendly customer fields, and thaan/meter units for fabric wholesalers.',
        bullets: [
          'Dynamic price lists (Professional+ base, enabled in suite)',
          'Customer credit limits and ledger (udhaar)',
          'Textile units: suit, thaan, meter, gaz',
        ],
        status: 'shipped',
      },
      {
        id: 'operations',
        title: 'Multi-location & seasonal stock',
        body:
          'Warehouse, showroom, and online fulfilment locations with transfers. Batch/thaan tracking for fabric rolls. Smart restock signals tuned for Eid and wedding peaks.',
        bullets: [
          'Multi-warehouse with inter-location transfers',
          'Batch tracking for fabric thaan (wholesale vertical)',
          'Industry Insights and AI restock (Business tier)',
        ],
        status: 'partial',
      },
      {
        id: 'growth',
        title: 'Campaigns & loyalty',
        body:
          'Run Eid previews, loyalty rewards, and segmented outreach from the same order history as your storefront and POS, not a disconnected email tool.',
        bullets: [
          'Loyalty and promotions hub',
          'Campaign segments on Business+',
          'Abandoned cart recovery (when configured)',
        ],
        status: 'partial',
      },
      {
        id: 'compliance',
        title: 'Tax & audit trail',
        body:
          'GST configuration, provincial tax fields, further-tax awareness for unregistered buyers, and fiscal periods for year-end close. FBR IRIS live filing remains roadmap.',
        bullets: [
          'Sales tax on invoices and POS receipts',
          'Fiscal periods and GL posting',
          'Approval workflows for high discounts',
        ],
        status: 'partial',
      },
    ],
    faqs: [
      {
        question: 'Which business types fit this suite?',
        answer:
          'Fashion retailers, designer boutiques, garment brands, and textile wholesalers who sell online and offline. Choose garments or boutique-fashion for ready-to-wear; textile-wholesale for fabric/than trade.',
      },
      {
        question: 'How is this different from generic Business tier?',
        answer:
          'Same core platform, but the suite pre-enables the module mix clothing operators need (POS + storefront + price lists + campaigns + multi-warehouse), bumps catalog limits, and registers you with the right vertical preset and demo storefront.',
      },
      {
        question: 'Do you support size/color matrices?',
        answer:
          'Yes. Product variants power storefront selection and hub inventory. Domain fields capture season, fabric, stitching status, and designer metadata.',
      },
      {
        question: 'Can I run wholesale-only without POS?',
        answer:
          'Yes. Platform admins or owners can adjust module packaging after signup. This suite defaults to full omni-channel because most large clothing groups run retail and wholesale together.',
      },
      {
        question: 'Is manufacturing included?',
        answer:
          'Basic BOM and production orders are enabled for in-house stitching units. Full shop-floor MES is roadmap; confirm scope on a demo if you run a large production floor.',
      },
    ],
    competitorNotes: [
      'Shopify excels at storefront apps but lacks native wholesale ledgers and Pakistani tax depth.',
      'Busy/Odoo-style ERPs handle wholesale but often need separate e-commerce and campaign tools.',
      'Tenvo keeps catalog, POS, B2B quotes, and campaigns in one hub with clothing-specific presets.',
    ],
  },

  'pharmacy-commerce': {
    key: 'pharmacy-commerce',
    slug: 'pharmacy-commerce',
    name: 'Pharmacy & Wellness Commerce Suite',
    tagline: 'Licensed counter, online OTC catalog, and expiry-aware stock',
    summary:
      'Built for licensed pharmacies and wellness retailers running counter POS, home delivery, and repeat-order outreach. Batch expiry tracking, pharmacist support workflows, GST-compliant receipts, and an elevated pharmacy storefront without juggling a separate e-commerce app and spreadsheet stock.',
    verticals: ['pharmacy'],
    defaultVertical: 'pharmacy',
    recommendedPlanTier: 'business',
    limitOverrides: {
      max_users: 18,
      max_products: 18000,
      max_customers: 12000,
      max_vendors: 1500,
      max_warehouses: 8,
      max_invoices_per_month: 20000,
      max_pos_terminals: 6,
      max_storage_mb: 6000,
      max_branches: 6,
    },
    packaging: {
      mode: 'custom',
      feature_overrides: { ...PHARMACY_COMMERCE_FEATURE_OVERRIDES },
    },
    pricing: {
      price_pkr: 11999,
      price_usd: 42,
      billing: 'monthly',
      badge: 'Pharmacy suite',
    },
    marketingPath: '/solutions/pharmacy-commerce',
    demoStoreDomain: 'demo-pharmacy',
    moduleGroups: [
      {
        id: 'pharmacy',
        title: 'Pharmacy catalog & compliance',
        body:
          'OTC, wellness, and device categories with batch expiry, GST fields, and elevated pharmacy storefront templates on registration.',
        bullets: [
          'Expiry-aware batch tracking',
          'Pharmacy storefront with category rails',
          'Genuine-medicine trust copy and delivery thresholds',
        ],
        status: 'shipped',
      },
      {
        id: 'channels',
        title: 'Counter + online fulfilment',
        body:
          'Walk-in POS and web orders share one stock ledger. Hub fulfils delivery and pickup from the same locations.',
        bullets: [
          'Barcode POS with tax receipts',
          'Storefront cart and checkout',
          'Low-stock and expiry alerts in dashboard',
        ],
        status: 'shipped',
      },
      {
        id: 'service',
        title: 'Care, refills & support',
        body:
          'Appointment booking for pharmacist consults, helpdesk tickets, and feedback surveys, aligned with repeat-order campaigns.',
        bullets: [
          'Appointment booking module',
          'Helpdesk and feedback surveys',
          'Email campaigns and abandoned cart recovery',
        ],
        status: 'partial',
      },
      {
        id: 'compliance',
        title: 'Tax & audit',
        body:
          'Sales tax on invoices and POS, fiscal periods, and approval workflows for high discounts. Prescription verification APIs remain roadmap.',
        bullets: [
          'GST on hub invoices and POS',
          'Fiscal periods and GL posting',
          'Audit logs and approval workflows',
        ],
        status: 'partial',
      },
    ],
    faqs: [
      {
        question: 'Is this for licensed pharmacies only?',
        answer:
          'The suite is designed for licensed pharmacy and wellness retail operators. OTC and general wellness catalogs are supported today; prescription routing integrations are sales-assisted.',
      },
      {
        question: 'How do you handle expiry dates?',
        answer:
          'Batch tracking is enabled in the suite packaging so you can record expiry per batch and surface low-stock and industry insights in the hub.',
      },
      {
        question: 'Can I run delivery and counter together?',
        answer:
          'Yes. Storefront orders and POS sales decrement the same product and location stock. Configure free-delivery thresholds in storefront settings.',
      },
    ],
    competitorNotes: [
      'Standalone pharmacy e-commerce apps rarely include counter POS and wholesale purchase ledgers.',
      'Generic ERPs lack pharmacy storefront templates and refill-oriented campaigns.',
      'Tenvo wires elevated pharmacy UX, batch stock, and hub fulfilment in one tenant.',
    ],
  },

  'auto-parts-commerce': {
    key: 'auto-parts-commerce',
    slug: 'auto-parts-commerce',
    name: 'Auto Parts & Accessories Suite',
    tagline: 'Parts finder storefront, trade counter, and multi-branch stock',
    summary:
      'For auto parts retailers and distributors selling OEM and aftermarket SKUs online and over the counter. Vehicle-aware storefront search, serial and batch tracking, workshop price lists, and supplier quotes without a separate catalog CMS and POS.',
    verticals: ['auto-parts'],
    defaultVertical: 'auto-parts',
    recommendedPlanTier: 'business',
    limitOverrides: {
      max_users: 22,
      max_products: 35000,
      max_customers: 6000,
      max_vendors: 4000,
      max_warehouses: 15,
      max_invoices_per_month: 18000,
      max_pos_terminals: 10,
      max_storage_mb: 9000,
      max_branches: 10,
    },
    packaging: {
      mode: 'custom',
      feature_overrides: { ...AUTO_PARTS_COMMERCE_FEATURE_OVERRIDES },
    },
    pricing: {
      price_pkr: 13999,
      price_usd: 48,
      billing: 'monthly',
      badge: 'Auto parts suite',
    },
    marketingPath: '/solutions/auto-parts-commerce',
    demoStoreDomain: 'demo-autoparts',
    moduleGroups: [
      {
        id: 'parts',
        title: 'Parts finder & catalog',
        body:
          'Immersive parts-finder hero, category rails, and vehicle-brand filters on the public storefront. Rich auto-parts seed catalog on registration.',
        bullets: [
          'Vehicle / part search hero',
          'OEM-style category and brand rails',
          'Semantic search for large SKU lists',
        ],
        status: 'shipped',
      },
      {
        id: 'channels',
        title: 'Counter & e-shop',
        body:
          'Workshop counter POS with barcode lookup plus online cart checkout, one stock picture across branches.',
        bullets: [
          'Trade counter POS and refunds',
          'Storefront orders in hub fulfilment',
          'Barcode scanning at POS',
        ],
        status: 'shipped',
      },
      {
        id: 'wholesale',
        title: 'Workshop & trade pricing',
        body:
          'Price lists for workshops, supplier quotes for imports, and delivery challans for bulk supply runs.',
        bullets: [
          'Dynamic price lists',
          'Supplier quote comparison',
          'Delivery challans for B2B runs',
        ],
        status: 'shipped',
      },
      {
        id: 'inventory',
        title: 'Serials, batches & branches',
        body:
          'Serial tracking for electronics, batch lots for oils and fluids, and multi-warehouse transfers between branches.',
        bullets: [
          'Serial and batch tracking',
          'Multi-warehouse transfers',
          'AI restock signals for fast movers',
        ],
        status: 'partial',
      },
    ],
    faqs: [
      {
        question: 'Does the storefront include a parts finder?',
        answer:
          'Yes. The auto-parts vertical uses an immersive finder hero (vehicle, VIN, and part search) on the public store, wired to the same catalog you manage in the hub.',
      },
      {
        question: 'Can workshops buy on credit?',
        answer:
          'Customer credit limits and ledger (udhaar) are supported. Trade price lists can be assigned per customer segment.',
      },
      {
        question: 'Is this the same as the vehicle dealership suite?',
        answer:
          'No. This suite targets parts and accessories retailers. Vehicle listings and test-drive booking are in the Vehicle Showroom suite.',
      },
    ],
    competitorNotes: [
      'Marketplace templates focus on listings, not parts SKUs and workshop counter workflows.',
      'Shopify auto apps add cost per site and rarely include native POS and purchase ledgers.',
      'Tenvo combines parts-finder storefront, POS, and wholesale supply in one hub.',
    ],
  },

  'vehicle-showroom': {
    key: 'vehicle-showroom',
    slug: 'vehicle-showroom',
    name: 'Vehicle Showroom & Dealership Suite',
    tagline: 'List vehicles, book test drives, and sell parts online',
    summary:
      'For single-brand dealerships and showrooms listing new and used vehicles, booking test drives, and running an accessories e-shop. Lead capture, live chat, and showroom POS share one CRM, not a separate DMS, website, and parts catalog.',
    verticals: ['vehicle-dealership'],
    defaultVertical: 'vehicle-dealership',
    recommendedPlanTier: 'business',
    limitOverrides: {
      max_users: 20,
      max_products: 8000,
      max_customers: 15000,
      max_vendors: 2000,
      max_warehouses: 8,
      max_invoices_per_month: 8000,
      max_pos_terminals: 6,
      max_storage_mb: 7000,
      max_branches: 6,
    },
    packaging: {
      mode: 'custom',
      feature_overrides: { ...VEHICLE_SHOWROOM_FEATURE_OVERRIDES },
    },
    pricing: {
      price_pkr: 14999,
      price_usd: 52,
      billing: 'monthly',
      badge: 'Dealership suite',
    },
    marketingPath: '/solutions/vehicle-showroom',
    demoStoreDomain: 'demo-showroom',
    moduleGroups: [
      {
        id: 'showroom',
        title: 'Vehicle listings & showroom',
        body:
          'Dealership storefront with make, model, condition, and body-type filters. Demo showroom profile with booking CTAs and trust strip.',
        bullets: [
          'Vehicle listing catalog with domain fields',
          'Test-drive and contact booking CTAs',
          'Showroom hero and marketing banners',
        ],
        status: 'shipped',
      },
      {
        id: 'growth',
        title: 'Leads, chat & campaigns',
        body:
          'Capture web leads, nurture with email campaigns, and respond via live chat, tied to the same customer record as showroom walk-ins.',
        bullets: [
          'Lead capture forms and nurture',
          'Live chat on storefront',
          'Marketing automation and email campaigns',
        ],
        status: 'partial',
      },
      {
        id: 'channels',
        title: 'Parts shop & POS',
        body:
          'Accessories, car care, and PPF products on the same site as vehicle listings. Counter POS for showroom add-ons.',
        bullets: [
          'E-shop collections alongside listings',
          'POS for accessories and services',
          'Customer portal for order history',
        ],
        status: 'shipped',
      },
      {
        id: 'operations',
        title: 'Stock & governance',
        body:
          'Serial tracking for VIN-linked units, multi-location stock for parts, and approval workflows for high discounts on vehicle deals.',
        bullets: [
          'Serial tracking for vehicle units',
          'Multi-warehouse parts stock',
          'Approval workflows for discounts',
        ],
        status: 'partial',
      },
    ],
    faqs: [
      {
        question: 'Can I list both new and used vehicles?',
        answer:
          'Yes. Products use automotive domain fields (make, model, condition, fuel, body type) and appear in storefront filters.',
      },
      {
        question: 'How do test drives work?',
        answer:
          'Appointment booking is enabled in the suite. Owners configure meeting URLs in storefront settings; platform Calendly is never used for tenant booking.',
      },
      {
        question: 'Is this a multi-dealer marketplace?',
        answer:
          'This suite is for a single-brand dealership. Multi-seller portals use the separate auto-marketplace vertical.',
      },
    ],
    competitorNotes: [
      'Listing-only sites lack parts POS and purchase accounting.',
      'DMS tools rarely include branded e-commerce and campaign automation.',
      'Tenvo unifies listings, booking, parts shop, and hub ledgers for one dealership brand.',
    ],
  },

  'furniture-commerce': {
    key: 'furniture-commerce',
    slug: 'furniture-commerce',
    name: 'Furniture & Home Commerce Suite',
    tagline: 'Showroom collections, delivery challans, and large-ticket checkout',
    summary:
      'For furniture and home retailers selling sofas, beds, dining sets, and décor online and in showroom. Elevated furniture storefront, appointment booking for showroom visits, stock reservations for made-to-order lines, and delivery challans for bulky fulfilment.',
    verticals: ['furniture'],
    defaultVertical: 'furniture',
    recommendedPlanTier: 'business',
    limitOverrides: {
      max_users: 18,
      max_products: 12000,
      max_customers: 10000,
      max_vendors: 2000,
      max_warehouses: 10,
      max_invoices_per_month: 12000,
      max_pos_terminals: 6,
      max_storage_mb: 7000,
      max_branches: 6,
    },
    packaging: {
      mode: 'custom',
      feature_overrides: { ...FURNITURE_COMMERCE_FEATURE_OVERRIDES },
    },
    pricing: {
      price_pkr: 12499,
      price_usd: 44,
      billing: 'monthly',
      badge: 'Home & furniture suite',
    },
    marketingPath: '/solutions/furniture-commerce',
    demoStoreDomain: 'demo-furniture',
    moduleGroups: [
      {
        id: 'furniture',
        title: 'Collections & elevated store',
        body:
          'Room-inspired catalog, collection pages, and furniture-elevated hero on registration. Demo furniture archive seed for day-one credibility.',
        bullets: [
          'Living, bedroom, and dining collections',
          'Elevated furniture storefront template',
          'High-ticket checkout and delivery thresholds',
        ],
        status: 'shipped',
      },
      {
        id: 'channels',
        title: 'Showroom & online',
        body:
          'Showroom POS for deposits and walk-in quotes plus web cart checkout, same availability across channels.',
        bullets: [
          'Showroom POS and quotations',
          'Storefront orders with assembly notes',
          'Abandoned cart recovery for big-ticket carts',
        ],
        status: 'shipped',
      },
      {
        id: 'delivery',
        title: 'Bulky fulfilment',
        body:
          'Delivery challans, stock reservations for custom orders, and multi-warehouse stock for display vs warehouse units.',
        bullets: [
          'Delivery challans for dispatch',
          'Stock reservations for made-to-order',
          'Multi-warehouse display vs stock rooms',
        ],
        status: 'shipped',
      },
      {
        id: 'growth',
        title: 'Appointments & campaigns',
        body:
          'Book showroom visits, run seasonal sales campaigns, and loyalty for repeat buyers of accessories and mattresses.',
        bullets: [
          'Appointment booking for showroom',
          'Campaigns and loyalty programs',
          'Price lists for interior trade',
        ],
        status: 'partial',
      },
    ],
    faqs: [
      {
        question: 'Do you support made-to-order furniture?',
        answer:
          'Stock reservations and quotations are enabled so you can hold capacity and collect deposits before fulfilment.',
      },
      {
        question: 'How does delivery work for large items?',
        answer:
          'Configure free-delivery thresholds and use delivery challans from the hub when dispatching bulky orders.',
      },
      {
        question: 'Is assembly scheduling included?',
        answer:
          'Appointment booking covers showroom visits today. Dedicated assembly crew scheduling is roadmap; confirm on a demo.',
      },
    ],
    competitorNotes: [
      'Furniture SaaS storefronts often lack native POS and purchase accounting.',
      'Generic ERPs miss room-collection UX and large-ticket cart recovery.',
      'Tenvo pairs elevated furniture storefronts with showroom POS and delivery workflows.',
    ],
  },

  'fitness-commerce': {
    key: 'fitness-commerce',
    slug: 'fitness-commerce',
    name: 'Gym & Fitness Commerce Suite',
    tagline: 'Supplements shop, memberships, and coach booking on one dark storefront',
    summary:
      'Built for gyms and fitness retailers selling supplements online, memberships at the front desk, and personal training by appointment. Elevated fitness storefront with archive supplement catalog, Wild Programs hero, membership SKUs, tenant meeting URL booking, and counter POS without a separate Shopify stack and paper sign-up sheets.',
    verticals: ['gym-fitness'],
    defaultVertical: 'gym-fitness',
    recommendedPlanTier: 'business',
    limitOverrides: {
      max_users: 20,
      max_products: 15000,
      max_customers: 12000,
      max_vendors: 2000,
      max_warehouses: 8,
      max_invoices_per_month: 15000,
      max_pos_terminals: 6,
      max_storage_mb: 7000,
      max_branches: 6,
    },
    packaging: {
      mode: 'custom',
      feature_overrides: { ...FITNESS_COMMERCE_FEATURE_OVERRIDES },
    },
    pricing: {
      price_pkr: 11999,
      price_usd: 42,
      billing: 'monthly',
      badge: 'Gym & fitness suite',
    },
    marketingPath: '/solutions/fitness-commerce',
    demoStoreDomain: 'demo-fitness',
    moduleGroups: [
      {
        id: 'storefront',
        title: 'Elevated fitness storefront',
        body:
          'Dark immersive hero, supplement category rails, membership tiers, and coach profiles. Rich gym-fitness seed catalog from archive references on registration.',
        bullets: [
          'Supplements catalog with real product imagery',
          'Membership and class SKUs on day one',
          'Wild Programs hero with male/female poses',
        ],
        status: 'shipped',
      },
      {
        id: 'channels',
        title: 'Front desk & online shop',
        body:
          'Sell whey, pre-workout, and accessories at the counter and on the web from one stock ledger. Hub fulfils pickup and delivery orders.',
        bullets: [
          'Barcode POS for supplement counter',
          'Storefront cart and checkout',
          'Multi-warehouse stock for shop vs floor',
        ],
        status: 'shipped',
      },
      {
        id: 'coaching',
        title: 'Coaching & appointments',
        body:
          'Book personal training, nutrition consults, and trial passes via tenant meeting URLs and contact flows wired to hub operations.',
        bullets: [
          'Calendly-style booking strip on storefront',
          'PT packs and class passes as products',
          'Contact queue in domain operations hub',
        ],
        status: 'shipped',
      },
      {
        id: 'growth',
        title: 'Retention & campaigns',
        body:
          'Loyalty for repeat supplement buyers, seasonal challenge campaigns, and abandoned cart recovery for online stacks.',
        bullets: [
          'Loyalty programs and campaigns',
          'Abandoned cart recovery',
          'AI restock for fast-moving SKUs',
        ],
        status: 'partial',
      },
    ],
    faqs: [
      {
        question: 'Does this include a full gym access control system?',
        answer:
          'Membership products, POS, and booking are shipped today. Turnstile and biometric access integrations are sales-assisted roadmap items.',
      },
      {
        question: 'Can I sell supplements and memberships together?',
        answer:
          'Yes. The suite seeds supplement categories and membership SKUs. Member pricing and bundles can be configured in hub price lists.',
      },
      {
        question: 'How does coach booking work?',
        answer:
          'Owners set a tenant meeting URL in Store Settings. The fitness storefront surfaces Book CTAs and a booking strip without using the platform sales calendar.',
      },
    ],
    competitorNotes: [
      'Gym management apps often lack a credible supplement e-commerce storefront.',
      'Supplement-only Shopify themes miss membership POS and coach scheduling.',
      'Tenvo pairs elevated fitness UX, archive supplement catalog, and hub fulfilment in one tenant.',
    ],
  },
});

/** @returns {DomainPackageDefinition[]} */
export function listDomainPackages() {
  return Object.values(DOMAIN_PACKAGES);
}

/**
 * @param {string | null | undefined} key
 * @returns {DomainPackageDefinition | null}
 */
export function getDomainPackage(key) {
  if (!key || typeof key !== 'string') return null;
  return DOMAIN_PACKAGES[key.trim()] || null;
}

/**
 * Resolve package by marketing slug (`/solutions/[slug]`).
 * @param {string | null | undefined} slug
 */
export function getDomainPackageBySlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const normalized = slug.trim();
  return (
    DOMAIN_PACKAGES[normalized] ||
    listDomainPackages().find((p) => p.slug === normalized) ||
    null
  );
}

/**
 * Best package for a registration vertical (first match wins).
 * @param {string | null | undefined} verticalKey
 * @returns {DomainPackageDefinition | null}
 */
export function resolveDomainPackageForVertical(verticalKey) {
  if (!verticalKey) return null;
  const canonical = resolveDomainKey(String(verticalKey).trim());
  return (
    listDomainPackages().find((pkg) =>
      pkg.verticals.some((v) => resolveDomainKey(v) === canonical)
    ) || null
  );
}

/**
 * Merge limit overrides onto a plan tier's defaults (only known limit keys).
 * @param {string} planTier
 * @param {Record<string, number> | undefined} limitOverrides
 */
export function mergePlanLimits(planTier, limitOverrides) {
  const tier = resolvePlanTier(planTier || 'free');
  const base = PLAN_TIERS[tier]?.limits || PLAN_TIERS.free.limits;
  if (!limitOverrides || typeof limitOverrides !== 'object') {
    return { ...base };
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(limitOverrides)) {
    if (key in merged && typeof value === 'number') {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Build registration payload fragments from a domain package.
 *
 * @param {string} packageKey
 * @param {{ planTier?: string, verticalKey?: string }} [options]
 * @returns {{
 *   package: DomainPackageDefinition | null,
 *   planTier: string,
 *   limits: Record<string, number>,
 *   settingsPatch: Record<string, unknown>,
 *   category: string | null,
 * }}
 */
export function buildRegistrationFromDomainPackage(packageKey, options = {}) {
  const pkg = getDomainPackage(packageKey);
  if (!pkg) {
    return {
      package: null,
      planTier: resolvePlanTier(options.planTier || 'free'),
      limits: mergePlanLimits(options.planTier || 'free'),
      settingsPatch: {},
      category: options.verticalKey || null,
    };
  }

  const incomingTier = resolvePlanTier(options.planTier || 'free');
  const recommended = resolvePlanTier(pkg.recommendedPlanTier);
  const planTier =
    (PLAN_TIERS[incomingTier] && incomingTier !== 'free' ? incomingTier : recommended) || recommended;

  const limits = mergePlanLimits(planTier, pkg.limitOverrides);

  const verticalKey = (() => {
    if (!options.verticalKey) return pkg.defaultVertical;
    const incoming = resolveDomainKey(String(options.verticalKey).trim());
    const matched = pkg.verticals.find((v) => resolveDomainKey(v) === incoming);
    return matched || pkg.defaultVertical;
  })();

  let settingsPatch = {
    domain_package: {
      key: pkg.key,
      name: pkg.name,
      applied_at: new Date().toISOString(),
      vertical: verticalKey,
    },
  };

  if (pkg.packaging?.mode === 'custom' && pkg.packaging.feature_overrides) {
    const { nextSettings } = mergePackagingIntoBusinessSettings(settingsPatch, {
      mode: 'custom',
      featureOverrides: pkg.packaging.feature_overrides,
    });
    settingsPatch = nextSettings;
  }

  // Align packaging with vertical knowledge (e.g. textile-wholesale: batch on, manufacturing off).
  settingsPatch = applyRegistrationVerticalPackaging(settingsPatch, verticalKey);

  return {
    package: pkg,
    planTier,
    limits,
    settingsPatch,
    category: verticalKey,
  };
}

/**
 * Registration URL with package + vertical preselection.
 * @param {string} packageKey
 * @param {{ vertical?: string, plan?: string }} [query]
 */
export function getDomainPackageRegisterHref(packageKey, query = {}) {
  const pkg = getDomainPackage(packageKey);
  const params = new URLSearchParams();
  params.set('package', packageKey);
  if (query.vertical) {
    params.set('domain', query.vertical);
  } else if (pkg?.defaultVertical) {
    params.set('domain', pkg.defaultVertical);
  }
  if (query.plan) {
    params.set('plan', query.plan);
  } else if (pkg?.recommendedPlanTier) {
    params.set('plan', pkg.recommendedPlanTier);
  }
  return `/register?${params.toString()}`;
}
