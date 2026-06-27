/**
 * Default storefront + business media for new auto-parts registrations.
 * Mirrors data-lab demo profile in `lib/dataLab/demoStoreProfiles.js`.
 */
import { AUTO_PARTS_DEFAULT_SLIDES } from './autoPartsArchiveMap.js';

export const AUTO_PARTS_REGISTRATION_METADATA = {
  description:
    'Genuine car accessories, car care products, and auto parts. OEM filters, oils, brakes, and electronics.',
  keywords: 'auto parts, car accessories, car care, OEM parts, filters, engine oil, Pakistan',
  announcement: 'Cash on delivery available. Nationwide shipping on qualifying orders.',
  accentColor: '#cd232a',
  freeShippingThreshold: 3000,
  returnPolicyDays: 14,
  businessHours: 'Mon - Sat, 10:00 AM - 8:00 PM',
};

const DEFAULT_COVER =
  AUTO_PARTS_DEFAULT_SLIDES[0]?.image ||
  'https://www.autostore.pk/wp-content/uploads/2026/02/hero2-slide1-bodykit.jpeg';

/**
 * @param {string} businessName
 */
export function buildDefaultAutoPartsStorefrontSettings(businessName = '') {
  const meta = AUTO_PARTS_REGISTRATION_METADATA;
  return {
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
      heroTitle: businessName || 'Auto Parts Store',
      heroSubtitle: meta.description,
    },
    announcement: meta.announcement,
    brand: { primaryColor: meta.accentColor },
    freeShippingThreshold: meta.freeShippingThreshold,
    returnPolicyDays: meta.returnPolicyDays,
    businessHours: meta.businessHours,
  };
}

/** Default business media for new auto-parts registrations. */
export function getDefaultAutoPartsBusinessMedia() {
  return {
    cover_image_url: DEFAULT_COVER,
    keywords: AUTO_PARTS_REGISTRATION_METADATA.keywords,
  };
}
