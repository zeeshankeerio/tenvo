/**
 * Tenvo Vehicles — world-class vehicle-dealership public storefront template.
 * Owner overrides via Hub → Store Settings → Showroom (settings.storefront.dealership).
 */
import {
  TENVO_VEHICLES_ASSETS,
  TENVO_VEHICLES_METADATA,
  tenvoVehiclesCdn,
} from '@/lib/storefront/tenvoVehiclesAssets';
import { TCD_LOGO_PATH } from '@/lib/storefront/tenvoCarDealershipBrand';
import {
  SHOWROOM_BODY_TYPES,
  SHOWROOM_BRANDS,
  SHOWROOM_ENGINE_SIZES,
  SHOWROOM_PRICE_BANDS_PKR,
  SHOWROOM_POPULAR_CATEGORIES,
  SHOWROOM_ABOUT_BLOCKS,
  SEHGAL_LOCATIONS,
  getShowroomNavLinks,
  getShowroomFooterColumns,
} from '@/lib/storefront/dealershipShowroomProfile';

export const TENVO_VEHICLES_PROFILE_KEY = 'tenvo-vehicles';
/** @deprecated Use TENVO_VEHICLES_PROFILE_KEY */
export const LEGACY_SEHGAL_PROFILE_KEY = 'sehgal-showroom';

/**
 * @param {object} [settings]
 */
export function getDealershipConfig(settings = {}) {
  const raw = settings?.storefront?.dealership || {};
  const slides = Array.isArray(raw.heroSlides) ? raw.heroSlides : null;
  const banners = Array.isArray(raw.marketingBanners) ? raw.marketingBanners : null;

  return {
    profile: raw.profile || TENVO_VEHICLES_PROFILE_KEY,
    tagline: raw.tagline || 'A tradition of car quality since 1979',
    welcomeTitle:
      raw.welcomeTitle || 'Welcome to your ultimate car destination',
    uan: raw.uan || raw.phone || null,
    uanTel: raw.uanTel || null,
    showTrustStrip: raw.showTrustStrip !== false,
    showMarketingBanners: raw.showMarketingBanners !== false,
    videoUrl: raw.videoUrl || '',
    trustStrip: {
      hours: raw.trustStrip?.hours || '10 am - 07 pm',
      shippingLabel: raw.trustStrip?.shippingLabel || 'Nationwide shipping',
      ratingLabel: raw.trustStrip?.ratingLabel || '4.5+ Google ratings',
    },
    heroSlides: slides,
    marketingBanners: banners,
    aboutBlocks: Array.isArray(raw.aboutBlocks) ? raw.aboutBlocks : null,
    locations: Array.isArray(raw.locations) ? raw.locations : null,
  };
}

/**
 * Default hero slides (overridable per store).
 * @param {string} base
 */
export function getDefaultTenvoVehiclesHeroSlides(base) {
  const products = `${base}/products`;
  const a = TENVO_VEHICLES_ASSETS;
  return [
    {
      eyebrow: 'Nationwide shipping',
      title: 'Premium car accessories for every journey',
      subtitle:
        'Shop thousands of auto parts, car care, and modification essentials with delivery across your region.',
      image: a.hero.accessories,
      badge: '4.5+ Google Ratings',
      ctaLabel: 'Shop now',
      ctaHref: `${products}?category=Auto+Store`,
    },
    {
      eyebrow: 'Car care',
      title: 'Best car care products',
      subtitle:
        'Detailing kits, shampoos, compounds, and microfiber trusted by drivers nationwide.',
      image: a.hero.carCare,
      ctaLabel: 'Browse car care',
      ctaHref: `${products}?category=Car+Care`,
    },
    {
      eyebrow: 'Modifications',
      title: 'Top car modification essentials',
      subtitle:
        'Body kits, grills, LED upgrades, and conversion parts from your trusted automotive hub.',
      image: a.hero.modifications,
      badge: '4.5+ Google Ratings',
      ctaLabel: 'Shop modifications',
      ctaHref: `${products}?category=Modifications`,
    },
    {
      eyebrow: 'New & used cars',
      title: 'Buy, sell, and exchange with confidence',
      subtitle:
        'New cars, certified used inventory, and fair trade-in valuations from one trusted showroom.',
      image: a.hero.vehicles,
      vehicleImage: a.vehicles.hiluxRevo,
      ctaLabel: 'Browse cars',
      ctaHref: `${products}?category=All+Cars`,
    },
  ];
}

/**
 * @param {string} base
 */
export function getDefaultTenvoVehiclesMarketingBanners(base) {
  const products = `${base}/products`;
  const c = TENVO_VEHICLES_ASSETS.collections;
  return [
    {
      id: 'car-care',
      title: 'Best car care products',
      subtitle: 'Detailing, shampoo, compounds, and microfiber',
      image: TENVO_VEHICLES_ASSETS.collections.carCare || TENVO_VEHICLES_ASSETS.hero.carCare,
      href: `${products}?category=Car+Care`,
      badge: 'Car Care',
    },
    {
      id: 'accessories',
      title: 'Premium car accessories',
      subtitle: '15,000+ parts with nationwide delivery',
      image: TENVO_VEHICLES_ASSETS.hero.accessories,
      href: `${products}?category=Auto+Store`,
      badge: 'Auto Store',
    },
    {
      id: 'used-cars',
      title: 'Certified used cars',
      subtitle: 'Inspect, finance, and drive away',
      image: c.usedCars,
      href: `${products}?condition=pre-owned`,
      badge: 'All Cars',
    },
    {
      id: 'ppf',
      title: 'Paint protection film',
      subtitle: 'Color & transparent PPF installed by specialists',
      image: c.ppf,
      href: `${products}?category=PPF`,
      badge: 'PPF',
    },
    {
      id: 'conversions',
      title: 'Body conversions',
      subtitle: 'Hilux, Prado, Fortuner, and luxury packages',
      image: c.conversions,
      href: `${products}?category=Conversions`,
      badge: 'Conversions',
    },
    {
      id: 'new-cars',
      title: 'Brand-new cars',
      subtitle: 'Latest models with warranty and finance options',
      image: TENVO_VEHICLES_ASSETS.hero.vehicles,
      href: `${products}?condition=new`,
      badge: 'New Cars',
    },
  ];
}

/**
 * Merged hero slides: owner settings → defaults.
 * @param {string} base
 * @param {object} [settings]
 */
export function resolveTenvoVehiclesHeroSlides(base, settings = {}) {
  const cfg = getDealershipConfig(settings);
  const defaults = getDefaultTenvoVehiclesHeroSlides(base);
  if (!cfg.heroSlides?.length) return defaults;
  return cfg.heroSlides.map((slide, i) => ({
    ...defaults[i % defaults.length],
    ...slide,
    image: slide.image || defaults[i % defaults.length]?.image,
  }));
}

/**
 * @param {string} base
 * @param {object} [settings]
 */
export function resolveTenvoVehiclesMarketingBanners(base, settings = {}) {
  const cfg = getDealershipConfig(settings);
  const defaults = getDefaultTenvoVehiclesMarketingBanners(base);
  if (!cfg.marketingBanners?.length) return defaults;
  return cfg.marketingBanners.map((banner, i) => ({
    ...defaults[i % defaults.length],
    ...banner,
    image: banner.image || defaults[i % defaults.length]?.image,
  }));
}

/**
 * Default storefront JSON merged on vehicle-dealership registration.
 * @param {string} businessName
 */
export function buildDefaultDealershipStorefrontSettings(businessName = '') {
  return {
    storefront: {
      dealership: {
        profile: TENVO_VEHICLES_PROFILE_KEY,
        tagline: 'Your trusted automotive partner',
        welcomeTitle: businessName
          ? `Welcome to ${businessName}`
          : 'Welcome to your ultimate car destination',
        showTrustStrip: true,
        showMarketingBanners: true,
      },
      heroTitle: businessName || 'Tenvo Vehicles',
      heroSubtitle: TENVO_VEHICLES_METADATA.description,
    },
    announcement: 'Book test drives & showroom visits online',
    brand: { primaryColor: '#111827' },
  };
}

/**
 * Default business media for new vehicle-dealership registrations.
 */
export function getDefaultDealershipBusinessMedia() {
  return {
    logo_url: TCD_LOGO_PATH,
    cover_image_url: TENVO_VEHICLES_ASSETS.hero.accessories,
    keywords: TENVO_VEHICLES_METADATA.keywords,
  };
}
