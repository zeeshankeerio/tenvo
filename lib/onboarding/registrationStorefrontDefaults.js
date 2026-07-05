/**
 * Per-vertical storefront + business media defaults applied on registration.
 * Covers 60+ domains via demo profile families; dedicated templates override where needed.
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { getDemoStorefrontProfile } from '../dataLab/demoStoreProfiles.js';
import {
  buildDefaultAutoPartsStorefrontSettings,
  getDefaultAutoPartsBusinessMedia,
  AUTO_PARTS_REGISTRATION_METADATA,
} from '../storefront/autoPartsOnboarding.js';
import {
  buildDefaultDealershipStorefrontSettings,
  getDefaultDealershipBusinessMedia,
} from '../storefront/tenvoVehiclesTemplate.js';
import { TENVO_VEHICLES_METADATA } from '../storefront/tenvoVehiclesAssets.js';
import { getDefaultStorefrontBookingSeed, STOREFRONT_BOOKING_VERTICALS } from '../storefront/storefrontBooking.js';
import { PK_CLOTHING_REGISTRATION_VERTICALS, isSupermarketRegistrationVertical, shouldSeedRichCatalogOnRegistration } from './registrationRichVerticals.js';
import { getSupermarketFamilyProfileExtras } from '../dataLab/supermarketArchiveSeed.js';
import { buildDefaultFashionEditorialStorefrontSeed, FASHION_EDITORIAL_CANONICALS } from '../storefront/fashionEditorial.js';

const PK_CLOTHING_COD_INSTRUCTIONS =
  'Pay when your order arrives. Cash on delivery available across Pakistan.';

/**
 * @param {Record<string, unknown> | null | undefined} media
 */
function pickBusinessMedia(media) {
  if (!media) return {};
  return Object.fromEntries(
    Object.entries({
      logo_url: media.logo_url,
      cover_image_url: media.cover_image_url,
      keywords: media.keywords,
    }).filter(([, value]) => value != null && value !== '')
  );
}

/**
 * @param {{
 *   domainKey: string,
 *   businessName: string,
 *   regional: { countryName: string; countryCode: string; currency: string; locale: string },
 *   trimmedDescription?: string | null,
 *   domainPackageKey?: string | null,
 * }} params
 */
export function resolveRegistrationStorefrontDefaults({
  domainKey,
  businessName,
  regional,
  trimmedDescription = null,
  domainPackageKey = null,
}) {
  const canonical = resolveDomainKey(domainKey);
  const regionalCtx = {
    countryName: regional.countryName,
    currency: regional.currency,
  };

  if (canonical === 'vehicle-dealership') {
    const vertical = buildDefaultDealershipStorefrontSettings(businessName);
    const description = trimmedDescription || TENVO_VEHICLES_METADATA.description;
    return {
      businessDescription: description,
      businessMedia: pickBusinessMedia(getDefaultDealershipBusinessMedia()),
      heroSubtitle: description,
      paymentCodInstructions: null,
      storefrontExtras: {
        announcement: vertical.announcement,
        brand: vertical.brand,
        storefront: {
          ...vertical.storefront,
          ...getDefaultStorefrontBookingSeed(),
        },
      },
    };
  }

  if (canonical === 'auto-parts') {
    const vertical = buildDefaultAutoPartsStorefrontSettings(businessName);
    const description = trimmedDescription || AUTO_PARTS_REGISTRATION_METADATA.description;
    return {
      businessDescription: description,
      businessMedia: pickBusinessMedia(getDefaultAutoPartsBusinessMedia()),
      heroSubtitle: description,
      paymentCodInstructions:
        'Pay when your order arrives. Cash on delivery available nationwide.',
      storefrontExtras: {
        announcement: vertical.announcement,
        brand: vertical.brand,
        freeShippingThreshold: vertical.freeShippingThreshold,
        returnPolicyDays: vertical.returnPolicyDays,
        businessHours: vertical.businessHours,
        storefront: vertical.storefront,
      },
    };
  }

  if (isSupermarketRegistrationVertical(canonical)) {
    const profile = getDemoStorefrontProfile(domainKey, regionalCtx, businessName);
    const family = getSupermarketFamilyProfileExtras();
    const description = trimmedDescription || profile.description;
    return {
      businessDescription: description,
      businessMedia: pickBusinessMedia({
        cover_image_url: profile.cover_image_url || family.cover_image_url,
        keywords: profile.keywords,
      }),
      heroSubtitle: description,
      paymentCodInstructions: 'Pay when your order arrives. Cash on delivery available.',
      storefrontExtras: {
        announcement: profile.announcement,
        brand: { primaryColor: profile.accentColor || family.accentColor },
        freeShippingThreshold: profile.freeShippingThreshold ?? 3000,
        returnPolicyDays: profile.returnPolicyDays ?? 3,
        businessHours: profile.businessHours,
        storefront: {
          ...(family.storefront || {}),
          ...(profile.storefront || {}),
        },
      },
    };
  }

  const profile = getDemoStorefrontProfile(domainKey, regionalCtx, businessName);
  const description = trimmedDescription || profile.description;
  const bookingSeed = STOREFRONT_BOOKING_VERTICALS.includes(canonical)
    ? getDefaultStorefrontBookingSeed()
    : {};
  const pkClothingCod =
    regional.countryCode === 'PK' && PK_CLOTHING_REGISTRATION_VERTICALS.has(canonical)
      ? PK_CLOTHING_COD_INSTRUCTIONS
      : null;
  const fashionEditorialSeed =
    FASHION_EDITORIAL_CANONICALS.has(canonical) &&
    shouldSeedRichCatalogOnRegistration(canonical, regional.countryCode, { domainPackageKey })
      ? buildDefaultFashionEditorialStorefrontSeed()
      : {};

  return {
    businessDescription: description,
    businessMedia: pickBusinessMedia(profile),
    heroSubtitle: description,
    paymentCodInstructions: pkClothingCod,
    storefrontExtras: {
      announcement: profile.announcement,
      brand: { primaryColor: profile.accentColor },
      freeShippingThreshold: profile.freeShippingThreshold,
      returnPolicyDays: profile.returnPolicyDays,
      businessHours: profile.businessHours,
      storefront: {
        ...(profile.storefront || {}),
        ...bookingSeed,
        ...fashionEditorialSeed,
      },
    },
  };
}
