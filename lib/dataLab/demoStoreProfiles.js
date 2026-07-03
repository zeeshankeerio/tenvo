/**
 * Professional storefront metadata for data-lab demo businesses.
 * No placeholder phone numbers, buyers reach the store via the contact page.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { buildUnsplashImageUrl } from '../storefront/unsplashUrl.js';
import { AUTO_PARTS_DEFAULT_SLIDES } from '../storefront/autoPartsArchiveMap.js';
import { TENVO_VEHICLES_ASSETS } from '../storefront/tenvoVehiclesAssets.js';
import { FITNESS_ASSETS } from '../storefront/fitnessStorefront.js';

/** @typedef {{ description: string; address?: string; city: string; businessHours: string; freeShippingThreshold: number; returnPolicyDays: number; announcement: string; accentColor?: string }} DemoStoreProfile */

/** @type {Record<string, Partial<DemoStoreProfile>>} */
const BY_DOMAIN_KEY = {
  textile: {
    description: 'Premium fabrics, unstitched collections, and wholesale textile essentials.',
    city: 'Lahore',
    address: 'Main Boulevard, Gulberg',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 7,
    announcement: 'New seasonal collections, wholesale & retail orders welcome',
    accentColor: '#111827',
  },
  'textile-wholesale': {
    description: 'Premium fabrics, unstitched collections, and wholesale textile essentials.',
    city: 'Lahore',
    address: 'Main Boulevard, Gulberg',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 7,
    announcement: 'New seasonal collections, wholesale & retail orders welcome',
    accentColor: '#111827',
  },
  'retail-shop': {
    description: 'Everyday essentials, gifts, and quality general merchandise.',
    city: 'Karachi',
    address: 'Clifton Block 5',
    businessHours: 'Mon - Sun, 10:00 AM - 10:00 PM',
    freeShippingThreshold: 2500,
    returnPolicyDays: 7,
    announcement: 'Free delivery on qualifying orders across Karachi',
    accentColor: '#2563eb',
  },
  restaurant: {
    description:
      'Freshly prepared meals, combos, and catering with online ordering for delivery or pickup.',
    businessHours: 'Daily, 11:00 AM - 11:00 PM',
    freeShippingThreshold: 1500,
    returnPolicyDays: 0,
    announcement: 'Order online · Live menu · Delivery & pickup',
    accentColor: '#603cba',
  },
  'restaurant-cafe': {
    description:
      'Freshly prepared meals, combos, and catering with online ordering for delivery or pickup.',
    businessHours: 'Daily, 11:00 AM - 11:00 PM',
    freeShippingThreshold: 1500,
    returnPolicyDays: 0,
    announcement: 'Order online · Live menu · Delivery & pickup',
    accentColor: '#603cba',
  },
  pharmacy: {
    description:
      'Tenvo Pharmacy is a licensed online pharmacy in Pakistan offering genuine medicines, OTC products, vitamins, personal care, mother & baby essentials, and medical devices with pharmacist support and nationwide delivery.',
    city: 'Lahore',
    address: 'Johar Town, Block R1, Main Boulevard',
    businessHours: 'Mon - Sat, 9:00 AM - 10:00 PM · Sun, 10:00 AM - 6:00 PM',
    freeShippingThreshold: 2000,
    returnPolicyDays: 7,
    announcement: 'Genuine medicines · Pharmacist on call · Free delivery over Rs 2,000',
    accentColor: '#16a34a',
  },
  'dental-clinic': {
    description: 'Dental care products and clinic essentials, professional-grade treatments.',
    city: 'Lahore',
    address: 'DHA Phase 5',
    businessHours: 'Mon - Sat, 9:00 AM - 6:00 PM',
    freeShippingThreshold: 3000,
    returnPolicyDays: 7,
    announcement: 'Professional dental care, book treatments online',
    accentColor: '#0d9488',
  },
  supermarket: {
    description: 'Groceries, fresh produce, beverages, and daily household essentials.',
    city: 'Karachi',
    address: 'North Nazimabad',
    businessHours: 'Daily, 8:00 AM - 11:00 PM',
    freeShippingThreshold: 3000,
    returnPolicyDays: 3,
    announcement: 'Fresh groceries delivered, best prices on daily essentials',
    accentColor: '#16a34a',
  },
  'hardware-store': {
    description: 'Tools, plumbing, sanitary ware, and building supplies for trade & DIY.',
    city: 'Rawalpindi',
    address: 'Raja Bazaar',
    businessHours: 'Mon - Sat, 9:00 AM - 7:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 14,
    announcement: 'Trade accounts welcome, bulk orders & delivery available',
    accentColor: '#0369a1',
  },
  'hardware-sanitary': {
    description: 'Tools, plumbing, sanitary ware, and building supplies for trade & DIY.',
    city: 'Rawalpindi',
    address: 'Raja Bazaar',
    businessHours: 'Mon - Sat, 9:00 AM - 7:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 14,
    announcement: 'Trade accounts welcome, bulk orders & delivery available',
    accentColor: '#0369a1',
  },
  'auto-parts': {
    description: 'Genuine car accessories, car care products, and auto parts. OEM filters, oils, brakes, and electronics.',
    city: 'Lahore',
    address: 'Main Boulevard, Gulberg',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 3000,
    returnPolicyDays: 14,
    announcement: 'Cash on delivery available. Nationwide shipping on qualifying orders.',
    accentColor: '#cd232a',
    cover_image_url: AUTO_PARTS_DEFAULT_SLIDES[3]?.image || AUTO_PARTS_DEFAULT_SLIDES[0]?.image,
    keywords: 'auto parts, car accessories, car care, OEM parts, filters, engine oil, Pakistan',
    storefront: {
      autoParts: {
        showPromoCards: true,
        showFeaturedCategories: true,
        showFeaturedDeals: true,
        showVehicleBrands: true,
        showTrending: true,
        showTrustSection: true,
        showCategoryRails: true,
        showMarketingBanners: true,
        showBottomCta: false,
        trustTitle: 'Why choose us',
        trustSubtitle: "Pakistan's trusted auto store",
      },
    },
  },
  'vehicle-dealership': {
    description:
      'Tenvo Car Dealership showroom: new and used cars, auto parts, car care, PPF, conversions, and accessories with online booking.',
    city: 'Islamabad',
    address: 'GT Road Al Raas Mall opposite DHA 2, Gate No.1, Islamabad',
    phone: '111 734 425',
    email: 'support@example.com',
    businessHours: 'Daily, 10:00 AM - 7:00 PM',
    freeShippingThreshold: 0,
    returnPolicyDays: 7,
    announcement: 'UAN 111 734 425 · Nationwide shipping · Book test drives online',
    accentColor: '#111827',
    logo_url: '/storefront/tenvo-car-dealership-tcd.svg',
    cover_image_url: TENVO_VEHICLES_ASSETS.hero.vehicles,
    keywords:
      'car dealership, used cars, new cars, auto parts, car care, PPF, vehicle showroom, test drive',
    social: {
      facebook: '',
      instagram: '',
      youtube: '',
      tiktok: '',
    },
    storefront: {
      dealership: {
        profile: 'tenvo-vehicles',
        tagline: 'A tradition of car quality since 1979',
        uan: '111 734 425',
        showTrustStrip: true,
        showMarketingBanners: true,
      },
    },
  },
  'auto-marketplace': {
    description:
      'Tenvo Auto Marketplace demo: new, used, and rental listings, e-shop parts, valuations, and motoring resources on one branded portal.',
    city: 'Singapore',
    address: 'Ubi Techpark',
    businessHours: 'Mon - Sun, 8:00 AM - 10:00 PM',
    freeShippingThreshold: 100,
    returnPolicyDays: 7,
    announcement: 'Tenvo demo portal: explore listings, promotions, and e-shop accessories',
    accentColor: '#E30613',
    storefront: {
      marketplace: {
        heroPromo: {
          eyebrow: 'Tenvo Auto Marketplace',
          title: 'Your next car, one trusted Tenvo portal',
          subtitle:
            'Search new, used, and rental listings, shop parts, and capture leads from a storefront wired to your Tenvo hub.',
          ctaLabel: 'Explore listings',
        },
        coeTicker: {
          label: 'Live demo stock',
          value: '120+ listings',
          change: 'Updated daily',
        },
        showMarketingBanners: true,
        showArticles: true,
        showForum: true,
        showTrustStrip: true,
      },
    },
  },
  sgcarmart: {
    description:
      'Tenvo Auto Marketplace demo: new, used, and rental listings, e-shop parts, valuations, and motoring resources on one branded portal.',
    city: 'Singapore',
    address: 'Ubi Techpark',
    businessHours: 'Mon - Sun, 8:00 AM - 10:00 PM',
    freeShippingThreshold: 100,
    returnPolicyDays: 7,
    announcement: 'Tenvo demo portal: explore listings, promotions, and e-shop accessories',
    accentColor: '#E30613',
    storefront: {
      marketplace: {
        showMarketingBanners: true,
        showArticles: true,
        showForum: true,
        showTrustStrip: true,
      },
    },
  },
  vincar: {
    description: 'Authorised multi-brand dealership, new & pre-owned cars, EVs, finance, leasing, and trade-in.',
    city: 'Singapore',
    address: '24 Leng Kee Road, #01-01, Singapore 159096',
    phone: '+65 6100 2666',
    email: 'enquiries@demo-vincar.sg',
    businessHours: 'Mon - Sun, 9:30 AM - 7:00 PM',
    freeShippingThreshold: 0,
    returnPolicyDays: 0,
    announcement: 'Book a test drive, GAC, Proton, Honda, Toyota & more',
    accentColor: '#D4AF37',
    storefront: {
      dealership: { profile: 'vincar' },
    },
    social: {
      facebook: 'https://facebook.com/vincar',
      instagram: 'https://instagram.com/vincar',
      youtube: 'https://youtube.com/vincar',
    },
  },
  bakery: {
    description: 'Fresh breads, cakes, pastries, and custom celebration orders.',
    city: 'Lahore',
    address: 'MM Alam Road, Gulberg',
    businessHours: 'Daily, 7:00 AM - 10:00 PM',
    freeShippingThreshold: 1200,
    returnPolicyDays: 0,
    announcement: 'Baked fresh daily, same-day delivery in Gulberg',
    accentColor: '#c2410c',
    cover_image_url: buildUnsplashImageUrl('1555507036-ab1f4038808a', { w: 1200 }),
  },
  'bakery-confectionery': {
    description: 'Fresh breads, cakes, pastries, and custom celebration orders.',
    city: 'Lahore',
    address: 'MM Alam Road, Gulberg',
    businessHours: 'Daily, 7:00 AM - 10:00 PM',
    freeShippingThreshold: 1200,
    returnPolicyDays: 0,
    announcement: 'Baked fresh daily, same-day delivery in Gulberg',
    accentColor: '#c2410c',
    cover_image_url: buildUnsplashImageUrl('1555507036-ab1f4038808a', { w: 1200 }),
  },
  boutique: {
    description: 'Women\'s unstitched, pret, western & accessories, new arrivals every week.',
    city: 'Lahore',
    address: 'Mall of Lahore, Main Boulevard',
    businessHours: 'Mon - Sun, 11:00 AM - 9:00 PM',
    freeShippingThreshold: 4999,
    returnPolicyDays: 7,
    announcement: 'Free delivery on orders above Rs 4,999 within Pakistan',
    accentColor: '#0c0a09',
  },
  'boutique-fashion': {
    description: 'Women\'s unstitched, pret, western & accessories, new arrivals every week.',
    city: 'Lahore',
    address: 'Mall of Lahore, Main Boulevard',
    businessHours: 'Mon - Sun, 11:00 AM - 9:00 PM',
    freeShippingThreshold: 4999,
    returnPolicyDays: 7,
    announcement: 'Free delivery on orders above Rs 4,999 within Pakistan',
    accentColor: '#0c0a09',
  },
  garments: {
    description: 'Pakistani brands, imported fashion, and everyday wear for men, women, and kids.',
    city: 'Lahore',
    address: 'Liberty Market, Gulberg',
    businessHours: 'Mon - Sun, 11:00 AM - 9:00 PM',
    freeShippingThreshold: 3999,
    returnPolicyDays: 7,
    announcement: 'Local & imported collections, COD available nationwide',
    accentColor: '#1c1917',
  },
  'textile-mill': {
    description: 'Yarn, finished fabric, and mill supplies for manufacturers and wholesalers.',
    city: 'Faisalabad',
    address: 'Industrial Estate, Jhang Road',
    businessHours: 'Mon - Sat, 8:00 AM - 6:00 PM',
    freeShippingThreshold: 15000,
    returnPolicyDays: 14,
    announcement: 'Bulk yarn & fabric orders, trade accounts welcome',
    accentColor: '#475569',
  },
  electronics: {
    description: 'TVs, appliances, audio, and home electronics with official warranty.',
    city: 'Islamabad',
    address: 'Blue Area',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 7,
    announcement: 'Genuine warranty · EMI available · Nationwide delivery',
    accentColor: '#4f46e5',
  },
  'electronics-goods': {
    description: 'TVs, appliances, audio, and home electronics with official warranty.',
    city: 'Islamabad',
    address: 'Blue Area',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 7,
    announcement: 'Genuine warranty · EMI available · Nationwide delivery',
    accentColor: '#4f46e5',
  },
  mobile: {
    description: 'Latest smartphones, tablets, and accessories, official warranty included.',
    city: 'Lahore',
    address: 'Hafeez Centre, Gulberg III',
    businessHours: 'Mon - Sat, 10:00 AM - 9:00 PM',
    freeShippingThreshold: 3000,
    returnPolicyDays: 7,
    announcement: 'Genuine devices · Trade-in welcome · Fast courier',
    accentColor: '#0f766e',
  },
  'mobile-phone-shop': {
    description: 'Latest smartphones, tablets, and accessories, official warranty included.',
    city: 'Lahore',
    address: 'Hafeez Centre, Gulberg III',
    businessHours: 'Mon - Sat, 10:00 AM - 9:00 PM',
    freeShippingThreshold: 3000,
    returnPolicyDays: 7,
    announcement: 'Genuine devices · Trade-in welcome · Fast courier',
    accentColor: '#0f766e',
  },
  salon: {
    description: 'Salon services, spa packages, and professional beauty products.',
    city: 'Karachi',
    address: 'DHA Phase 6',
    businessHours: 'Tue - Sun, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 2000,
    returnPolicyDays: 0,
    announcement: 'Book treatments online, bridal & party packages available',
    accentColor: '#a21caf',
  },
  'salon-spa': {
    description: 'Salon services, spa packages, and professional beauty products.',
    city: 'Karachi',
    address: 'DHA Phase 6',
    businessHours: 'Tue - Sun, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 2000,
    returnPolicyDays: 0,
    announcement: 'Book treatments online, bridal & party packages available',
    accentColor: '#a21caf',
  },
  vet: {
    description: 'Veterinary care, pet nutrition, grooming essentials, and wellness products.',
    city: 'Dubai',
    address: 'Al Quoz Industrial Area',
    businessHours: 'Mon - Sat, 9:00 AM - 7:00 PM',
    freeShippingThreshold: 150,
    returnPolicyDays: 7,
    announcement: 'Pet wellness products, book consultations online',
    accentColor: '#059669',
  },
  'veterinary-clinic': {
    description: 'Veterinary care, pet nutrition, grooming essentials, and wellness products.',
    city: 'Dubai',
    address: 'Al Quoz Industrial Area',
    businessHours: 'Mon - Sat, 9:00 AM - 7:00 PM',
    freeShippingThreshold: 150,
    returnPolicyDays: 7,
    announcement: 'Pet wellness products, book consultations online',
    accentColor: '#059669',
  },
  'clinics-healthcare': {
    description: 'Outpatient care, diagnostics, and wellness packages from licensed practitioners.',
    city: 'Islamabad',
    address: 'F-10 Markaz',
    businessHours: 'Mon - Sat, 9:00 AM - 8:00 PM',
    freeShippingThreshold: 2500,
    returnPolicyDays: 0,
    announcement: 'Book consultations & health packages online',
    accentColor: '#0369a1',
  },
  furniture: {
    description:
      'Tenvo Furniture Store offers modern sofas, recliners, dining sets, beds, and mattresses with nationwide delivery and assembly on qualifying orders.',
    city: 'Lahore',
    address: 'Gulberg III, Main Boulevard',
    phone: '0339 111 1353',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 50000,
    returnPolicyDays: 14,
    announcement: 'Enjoy up to 35% off selected living & bedroom collections',
    accentColor: '#78350f',
  },
  jewellery: {
    description:
      'Hallmark-certified gold (21K–24K), diamond jewellery, bridal sets, pearls, and sterling silver. Assay certificates, custom sizing, and insured delivery.',
    city: 'Karachi',
    address: 'Zebunissa Street, Saddar Jewellers Market',
    phone: '021 3421 8800',
    businessHours: 'Mon - Sat, 11:00 AM - 8:00 PM',
    freeShippingThreshold: 10000,
    returnPolicyDays: 0,
    announcement: 'Hallmark gold · Bridal & wedding sets · Insured shipping above Rs 10,000',
    accentColor: '#c9a227',
  },
  'gems-jewellery': {
    description:
      'Hallmark-certified gold (21K–24K), diamond jewellery, bridal sets, pearls, and sterling silver. Assay certificates, custom sizing, and insured delivery.',
    city: 'Karachi',
    address: 'Zebunissa Street, Saddar Jewellers Market',
    phone: '021 3421 8800',
    businessHours: 'Mon - Sat, 11:00 AM - 8:00 PM',
    freeShippingThreshold: 10000,
    returnPolicyDays: 0,
    announcement: 'Hallmark gold · Bridal & wedding sets · Insured shipping above Rs 10,000',
    accentColor: '#c9a227',
  },
  'mobile-repairing': {
    description: 'Screen replacements, batteries, and genuine spare parts for all major brands.',
    city: 'Rawalpindi',
    address: 'Commercial Market, Saddar',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 1500,
    returnPolicyDays: 7,
    announcement: 'Same-day repairs · Quality parts · Walk-in & mail-in service',
    accentColor: '#1d4ed8',
  },
  'computer-hardware': {
    description: 'Laptops, desktops, components, and networking for home and office.',
    city: 'Islamabad',
    address: 'Sector G-11 Markaz',
    businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
    freeShippingThreshold: 5000,
    returnPolicyDays: 7,
    announcement: 'Build your PC, expert advice & warranty support',
    accentColor: '#312e81',
  },
  'diagnostic-lab': {
    description: 'Blood tests, imaging referrals, and health screening packages.',
    city: 'Lahore',
    address: 'Model Town Link Road',
    businessHours: 'Mon - Sat, 7:00 AM - 9:00 PM',
    freeShippingThreshold: 0,
    returnPolicyDays: 0,
    announcement: 'Home sample collection available in Lahore',
    accentColor: '#0e7490',
  },
  ecommerce: {
    description: 'Multi-category online shop, fashion, home, and lifestyle with fast checkout.',
    city: 'Karachi',
    address: 'Port Qasim Logistics Hub',
    businessHours: 'Daily, 24/7 online · Support 9 AM - 9 PM',
    freeShippingThreshold: 2500,
    returnPolicyDays: 7,
    announcement: 'Nationwide delivery · Easy returns within 7 days',
    accentColor: '#7c3aed',
  },
  fmcg: {
    description: 'Fast-moving consumer goods, household, personal care, and pantry staples.',
    city: 'Faisalabad',
    address: 'Canal Road Industrial Zone',
    businessHours: 'Mon - Sat, 8:00 AM - 6:00 PM',
    freeShippingThreshold: 4000,
    returnPolicyDays: 3,
    announcement: 'Bulk & retail orders, distributor pricing available',
    accentColor: '#15803d',
  },
  'solar-energy': {
    description: 'Solar panels, inverters, batteries, and installation accessories.',
    city: 'Lahore',
    address: 'Multan Road',
    businessHours: 'Mon - Sat, 9:00 AM - 6:00 PM',
    freeShippingThreshold: 15000,
    returnPolicyDays: 14,
    announcement: 'Net metering support · On-site survey available',
    accentColor: '#ca8a04',
  },
  'bookshop-stationery': {
    description: 'Books, office stationery, school supplies, and art materials.',
    city: 'Islamabad',
    address: 'F-6 Super Market',
    businessHours: 'Mon - Sat, 9:00 AM - 8:00 PM',
    freeShippingThreshold: 1500,
    returnPolicyDays: 7,
    announcement: 'School lists & bulk orders, ask for institutional pricing',
    accentColor: '#4338ca',
  },
  'leather-footwear': {
    description: 'Leather shoes, sandals, bags, and belts, handmade and branded lines.',
    city: 'Sialkot',
    address: 'Defence Road Industrial Area',
    businessHours: 'Mon - Sat, 9:00 AM - 7:00 PM',
    freeShippingThreshold: 3500,
    returnPolicyDays: 14,
    announcement: 'Export-quality leather · Custom sizing available',
    accentColor: '#92400e',
  },
  'gym-fitness': {
    description:
      'Train wild with strength, mobility, and conditioning programs. Shop whey protein, pre-workout, vitamins, and memberships with nationwide supplement delivery.',
    city: 'Karachi',
    address: 'Boat Basin',
    businessHours: 'Daily, 6:00 AM - 10:00 PM',
    freeShippingThreshold: 2000,
    returnPolicyDays: 0,
    announcement: 'Free trial class · Member pricing on supplements · Book PT online',
    accentColor: '#e11d48',
    cover_image_url: FITNESS_ASSETS.heroAthlete,
    keywords:
      'gym, fitness, supplements, whey protein, membership, personal training, pre workout, Karachi',
    storefront: {
      fitness: {
        showTrainers: true,
        showPrograms: true,
        showMemberships: true,
        showBenefits: true,
      },
      booking: {
        meeting_url: '',
      },
    },
  },
};

/** Family fallbacks for `--all-domains` long tail */
/** @type {Array<{ match: RegExp; profile: Partial<DemoStoreProfile> }>} */
const FAMILY_PROFILES = [
  {
    match: /mill|manufacturing|steel|ceramic|plastic|chemical|paint|paper|flour|rice|sugar|dairy|poultry|livestock|agriculture|cold-storage|construction/,
    profile: {
      description: 'Industrial supplies, raw materials, and trade quantities for B2B buyers.',
      city: 'Faisalabad',
      address: 'Industrial Estate',
      businessHours: 'Mon - Sat, 8:00 AM - 6:00 PM',
      freeShippingThreshold: 10000,
      returnPolicyDays: 14,
      announcement: 'Bulk orders & trade accounts welcome',
      accentColor: '#475569',
    },
  },
  {
    match: /travel|hotel|event|rent|logistics|courier|transport|real-estate/,
    profile: {
      description: 'Book services, packages, and reservations with transparent pricing.',
      city: 'Islamabad',
      address: 'Blue Area',
      businessHours: 'Mon - Sat, 9:00 AM - 7:00 PM',
      freeShippingThreshold: 0,
      returnPolicyDays: 0,
      announcement: 'Book online, confirmations by email & SMS',
      accentColor: '#2563eb',
    },
  },
  {
    match: /school|education|library|book-publishing/,
    profile: {
      description: 'Educational materials, courses, and institutional supplies.',
      city: 'Lahore',
      address: 'Garden Town',
      businessHours: 'Mon - Sat, 9:00 AM - 6:00 PM',
      freeShippingThreshold: 2000,
      returnPolicyDays: 7,
      announcement: 'Institutional orders & semester lists supported',
      accentColor: '#4f46e5',
    },
  },
  {
    match: /tyre|electrical|industrial-parts|petrol|wholesale/,
    profile: {
      description: 'Trade parts, consumables, and wholesale quantities for businesses.',
      city: 'Karachi',
      address: 'SITE Industrial Area',
      businessHours: 'Mon - Sat, 8:00 AM - 7:00 PM',
      freeShippingThreshold: 8000,
      returnPolicyDays: 14,
      announcement: 'Fleet & trade pricing, delivery across Sindh',
      accentColor: '#1e40af',
    },
  },
];

const DEFAULT_PROFILE = {
  description: 'Quality products with secure checkout and reliable service.',
  city: 'Lahore',
  businessHours: 'Mon - Sat, 9:00 AM - 6:00 PM',
  freeShippingThreshold: 2000,
  returnPolicyDays: 7,
  announcement: 'Shop online, secure checkout & reliable delivery',
  accentColor: '#2563eb',
};

/**
 * @param {string} domainKey
 */
function resolveProfileBase(domainKey) {
  const normalized = String(domainKey || '').trim();
  const resolved = resolveDomainKey(normalized);
  return (
    BY_DOMAIN_KEY[normalized] ||
    BY_DOMAIN_KEY[resolved] ||
    FAMILY_PROFILES.find((f) => f.match.test(resolved))?.profile ||
    DEFAULT_PROFILE
  );
}

/**
 * @param {string} domainKey
 * @param {{ countryName?: string; currency?: string }} [regional]
 * @param {string} [businessName]
 */
export function getDemoStorefrontProfile(domainKey, regional = {}, businessName = '') {
  const base = resolveProfileBase(domainKey);
  const country = regional.countryName || 'Pakistan';
  const currency = regional.currency || 'PKR';

  let freeShippingThreshold = base.freeShippingThreshold ?? DEFAULT_PROFILE.freeShippingThreshold;
  if (currency === 'SGD' && freeShippingThreshold > 500) freeShippingThreshold = 150;
  if (currency === 'AED' && freeShippingThreshold > 500) freeShippingThreshold = 200;

  const city = base.city || country;
  const businessHours = base.businessHours || DEFAULT_PROFILE.businessHours;

  return {
    description: base.description || `${businessName}, online store.`,
    address: base.address || null,
    city,
    country,
    businessHours,
    freeShippingThreshold,
    returnPolicyDays: base.returnPolicyDays ?? DEFAULT_PROFILE.returnPolicyDays,
    announcement: base.announcement || DEFAULT_PROFILE.announcement,
    accentColor: base.accentColor || DEFAULT_PROFILE.accentColor,
    logo_url: base.logo_url || null,
    cover_image_url: base.cover_image_url || null,
    keywords: base.keywords || null,
    storefront: base.storefront || null,
    contact: {
      address: base.address || null,
      city,
      country,
      businessHours,
      phone: base.phone || null,
      email: base.email || null,
      published: true,
    },
  };
}
