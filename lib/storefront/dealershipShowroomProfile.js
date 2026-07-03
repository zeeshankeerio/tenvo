/**
 * Tenvo Vehicles showroom profile defaults for vehicle-dealership vertical.
 * Reference layout inspired by modern automotive retail (nav, filters, locations).
 */

import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import {
  getDefaultTenvoVehiclesHeroSlides,
  getDealershipConfig,
} from '@/lib/storefront/tenvoVehiclesTemplate';

export const SHOWROOM_PROFILE_KEY = 'tenvo-vehicles';
/** @deprecated Alias for legacy demo seeds */
export const LEGACY_SHOWROOM_PROFILE_KEY = 'sehgal-showroom';

export const SEHGAL_UAN = '111 734 425';
export const SEHGAL_UAN_TEL = '051111734425';

export const SEHGAL_LOCATIONS = [
  {
    id: 'islamabad',
    label: 'Islamabad Flagship',
    address: 'GT Road Al Raas Mall opposite DHA 2, Gate No.1, Islamabad 45730',
  },
  {
    id: 'rawalpindi',
    label: 'Rawalpindi HQ',
    address: '148/4-A Sehgal Plaza, Murree Rd, Saddar, Rawalpindi 46000',
  },
];

/** Primary showroom nav (desktop bar). */
export function getShowroomPrimaryNavLinks(base) {
  const products = `${base}/products`;
  return [
    { id: 'inventory', label: 'Inventory', href: `${base}#inventory` },
    { id: 'new', label: 'New cars', href: `${products}?condition=new` },
    { id: 'used', label: 'Used cars', href: `${products}?condition=pre-owned` },
    { id: 'auto-store', label: 'Auto store', href: `${products}?category=Auto+Store` },
    { id: 'services', label: 'Services', href: `${base}#services` },
    { id: 'book', label: 'Book visit', href: `${base}#book` },
  ];
}

/** Overflow / mobile-only showroom links. */
export function getShowroomSecondaryNavLinks(base) {
  const products = `${base}/products`;
  return [
    { id: 'all-cars', label: 'All cars', href: `${products}?category=All+Cars` },
    { id: 'luxury', label: 'Luxury', href: `${products}?category=Luxury` },
    { id: 'bikes', label: 'Bikes', href: `${products}?category=Bikes` },
    { id: 'ppf', label: 'PPF', href: `${products}?category=PPF` },
    { id: 'conversions', label: 'Conversions', href: `${products}?category=Conversions` },
    { id: 'window-films', label: 'Window films', href: `${products}?category=Window+Films` },
    { id: 'sale', label: 'Sale', href: `${products}?sale=1` },
    { id: 'newsroom', label: 'News', href: `${base}#newsroom` },
    { id: 'contact', label: 'Contact', href: `${base}/contact` },
  ];
}

/** @type {Array<{ id: string; label: string; href: string; mega?: boolean }>} */
export function getShowroomNavLinks(base) {
  return [...getShowroomPrimaryNavLinks(base), ...getShowroomSecondaryNavLinks(base)];
}

export const SHOWROOM_BRANDS = [
  { id: 'toyota', name: 'Toyota', logoText: 'TOYOTA' },
  { id: 'honda', name: 'Honda', logoText: 'HONDA' },
  { id: 'hyundai', name: 'Hyundai', logoText: 'HYUNDAI' },
  { id: 'suzuki', name: 'Suzuki', logoText: 'SUZUKI' },
  { id: 'kia', name: 'Kia', logoText: 'KIA' },
  { id: 'audi', name: 'Audi', logoText: 'AUDI' },
  { id: 'bmw', name: 'BMW', logoText: 'BMW' },
  { id: 'mercedes', name: 'Mercedes-Benz', logoText: 'MB' },
  { id: 'haval', name: 'Haval', logoText: 'HAVAL' },
  { id: 'tesla', name: 'Tesla', logoText: 'TESLA' },
  { id: 'lexus', name: 'Lexus', logoText: 'LEXUS' },
  { id: 'ford', name: 'Ford', logoText: 'FORD' },
  { id: 'land-rover', name: 'Land Rover', logoText: 'LR' },
  { id: 'peugeot', name: 'Peugeot', logoText: 'PEUGEOT' },
  { id: 'mg', name: 'MG', logoText: 'MG' },
  { id: 'changan', name: 'Changan', logoText: 'CHANGAN' },
];

export const SHOWROOM_BODY_TYPES = [
  { id: 'suv', label: 'SUV', filter: 'SUV' },
  { id: 'sedan', label: 'Sedan', filter: 'Sedan' },
  { id: 'hatchback', label: 'Hatchback', filter: 'Hatchback' },
  { id: 'mpv', label: 'MPV', filter: 'MPV' },
  { id: 'luxury-suv', label: 'Luxury SUV', filter: 'Luxury SUV' },
  { id: 'luxury-sedan', label: 'Luxury Sedan', filter: 'Luxury Sedan' },
  { id: 'double-cabin', label: 'Double Cabin', filter: 'Double Cabin' },
  { id: 'sports-sedan', label: 'Sports Sedan', filter: 'Sports Sedan' },
  { id: 'convertible', label: 'Convertible', filter: 'Convertible' },
];

export const SHOWROOM_ENGINE_SIZES = [
  '660 CC', '1000 CC', '1200 CC', '1300 CC', '1500 CC', '1600 CC',
  '1800 CC', '2000 CC', '2500 CC', '2700 CC', '2800 CC', '3500 CC',
];

export const SHOWROOM_PRICE_BANDS_PKR = [
  { id: '', label: 'Any price' },
  { id: '0-2000000', label: 'Under Rs 2M', min: 0, max: 2000000 },
  { id: '2000000-5000000', label: 'Rs 2M - 5M', min: 2000000, max: 5000000 },
  { id: '5000000-10000000', label: 'Rs 5M - 10M', min: 5000000, max: 10000000 },
  { id: '10000000+', label: 'Rs 10M+', min: 10000000, max: null },
];

export const SHOWROOM_POPULAR_CATEGORIES = [
  { id: 'car-care', label: 'Car Care Products', hrefQuery: 'category=Car+Care' },
  { id: 'modifications', label: 'Modifications', hrefQuery: 'category=Modifications' },
  { id: 'led', label: 'LED & Lightening', hrefQuery: 'category=LED+%26+Lightening' },
  { id: 'mobile', label: 'Mobile Accessories', hrefQuery: 'category=Mobile+Accessories' },
  { id: 'engine-care', label: 'Engine Care', hrefQuery: 'search=engine+care' },
  { id: 'wheel-tyre', label: 'Wheel & Tyre Care', hrefQuery: 'search=wheel+tyre' },
  { id: 'headlights', label: 'Headlights', hrefQuery: 'search=headlight' },
  { id: 'speakers', label: 'Car Speakers', hrefQuery: 'search=speaker' },
  { id: 'floor-mats', label: 'Floor Mats', hrefQuery: 'category=Car+Mats' },
  { id: 'seat-covers', label: 'Seat Covers', hrefQuery: 'search=seat+cover' },
];

/**
 * @param {string} base
 */
export function getShowroomHeroSlides(base, settings = {}) {
  const cfg = getDealershipConfig(settings);
  const defaults = getDefaultTenvoVehiclesHeroSlides(base);
  if (!cfg.heroSlides?.length) return defaults;
  return cfg.heroSlides.map((slide, i) => ({
    ...defaults[i % defaults.length],
    ...slide,
    image: slide.image || defaults[i % defaults.length]?.image,
  }));
}

/** @type {Array<{ id: string; title: string; body: string }>} */
export const SHOWROOM_ABOUT_BLOCKS = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: 'Four decades of trust, innovation, and performance. With a strong presence in Rawalpindi and Islamabad, we have become a household name among car and bike enthusiasts. Pakistan\'s first and only private SSS (Sales, Service, Spare Parts) dealership.',
  },
  {
    id: 'services',
    title: 'Your all-in-one automotive hub',
    body: 'From new, used, and exchange car sales to modification, upgrade, maintenance, and PPF installation. Facelift conversions to straightforward part replacements, our promise stays the same: no compromise on quality.',
  },
  {
    id: 'offer',
    title: 'From accessories to upgrades',
    body: 'Over 15,000 high-quality products and 150+ local and global brands. Latest accessories, nationwide delivery, skilled modification team, and up-to-date auto prices trusted by millions.',
  },
  {
    id: 'reach',
    title: 'Serving across Pakistan',
    body: 'Headquarters in Saddar Cantt, Rawalpindi, and flagship store on GT Road, Islamabad. Complete automotive solutions with new car sales, used car sales, and car exchange under one trusted name.',
  },
];

/**
 * @param {string} base
 */
export function getShowroomFooterColumns(base) {
  const products = `${base}/products`;
  return [
    {
      title: 'Explore',
      links: [
        { label: 'Best Sellers', href: `${products}?featured=1` },
        { label: 'New Cars', href: `${products}?condition=new` },
        { label: 'LED & Lighting', href: `${products}?category=LED+%26+Lightening` },
        { label: 'Car Care', href: `${products}?category=Car+Care` },
        { label: 'Gadgets', href: `${products}?category=Gadgets` },
        { label: 'All Cars', href: `${products}?category=All+Cars` },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'About Us', href: `${base}/contact` },
        { label: 'Contact Us', href: `${base}/contact` },
        { label: 'FAQs', href: `${base}/faqs` },
        { label: 'Book Test Drive', href: `${base}/contact?testdrive=1` },
      ],
    },
    {
      title: 'Policies',
      links: [
        { label: 'Privacy Policy', href: `${base}/privacy` },
        { label: 'Terms & Conditions', href: `${base}/terms` },
        { label: 'Returns & Exchange', href: `${base}/returns` },
      ],
    },
    {
      title: 'Contact',
      links: [
        { label: `UAN: ${SEHGAL_UAN}`, href: `tel:${SEHGAL_UAN_TEL}` },
        { label: 'Islamabad showroom', href: `${base}/contact` },
        { label: 'Rawalpindi showroom', href: `${base}/contact` },
      ],
    },
  ];
}

export const SHOWROOM_CONTACT_INTENTS = {
  testdrive: {
    subject: 'testdrive',
    title: 'Schedule a test drive',
    subtitle: 'Tell us which car you want to experience at our Islamabad or Rawalpindi showroom.',
    messagePlaceholder: 'Preferred showroom, date, model, and contact number.',
  },
  sell: {
    subject: 'sell',
    title: 'Sell or exchange your car',
    subtitle: 'Share your vehicle details for a fair valuation and seamless upgrade.',
    messagePlaceholder: 'Make, model, year, mileage, registration city, and condition.',
  },
  finance: {
    subject: 'finance',
    title: 'Car finance inquiry',
    subtitle: 'Competitive financing options for new and used vehicles.',
    messagePlaceholder: 'Vehicle of interest, down payment, and preferred tenure.',
  },
  buy: {
    subject: 'buy',
    title: 'Car purchase inquiry',
    subtitle: 'Interested in a listing? Our team will call you back on UAN 111 734 425.',
    messagePlaceholder: 'Vehicle name, budget, and preferred contact time.',
  },
  ppf: {
    subject: 'ppf',
    title: 'PPF installation inquiry',
    subtitle: 'Color or transparent paint protection film, installed by certified specialists.',
    messagePlaceholder: 'Vehicle make/model, color choice, and preferred branch.',
  },
  conversion: {
    subject: 'conversion',
    title: 'Body conversion inquiry',
    subtitle: 'Hilux, Prado, Fortuner, Land Cruiser, and luxury conversion packages.',
    messagePlaceholder: 'Base vehicle, target style, and timeline.',
  },
};

/**
 * @param {{ country?: string; category?: string; settings?: { storefront?: { dealership?: { profile?: string } } } }} business
 * @returns {'tenvo-vehicles' | 'vincar' | null}
 */
export function resolveShowroomProfile(business = {}) {
  const settings = business.settings || business;
  const profile = settings?.storefront?.dealership?.profile;
  if (profile === 'vincar' || profile === 'singapore') return 'vincar';
  if (profile === LEGACY_SHOWROOM_PROFILE_KEY || profile === SHOWROOM_PROFILE_KEY) {
    return SHOWROOM_PROFILE_KEY;
  }
  const country = String(business.country || '').toLowerCase();
  if (country.includes('singapore') || country === 'sg') return 'vincar';

  const category = resolveDomainKey(business.category);
  if (category === 'vehicle-dealership') {
    return SHOWROOM_PROFILE_KEY;
  }

  return null;
}

export function isTenvoVehiclesShowroomProfile(business, settings = {}) {
  return resolveShowroomProfile({ ...business, settings }) === SHOWROOM_PROFILE_KEY;
}

/** @deprecated Use isTenvoVehiclesShowroomProfile */
export function isSehgalShowroomProfile(business, settings = {}) {
  return isTenvoVehiclesShowroomProfile(business, settings);
}
