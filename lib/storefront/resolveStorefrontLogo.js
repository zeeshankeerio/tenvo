/**
 * Tenant-scoped storefront logo from business settings (businesses.logo_url).
 * TCD monogram applies only to vehicle-dealership showrooms — never other verticals.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { resolveTcdDealershipLogo } from '@/lib/storefront/tenvoCarDealershipBrand';

/**
 * @param {object} [business]
 * @param {object} [settings]
 * @returns {string | null}
 */
export function resolveStorefrontLogo(business, settings) {
  const raw = pickLogoUrl(business, settings);
  if (!raw) return null;

  const category = resolveDomainKey(business?.category);
  if (isAutoDealershipStore(category)) {
    return resolveTcdDealershipLogo(business, settings, raw) || null;
  }

  return raw;
}

/**
 * @param {object} [business]
 * @param {object} [settings]
 * @returns {string | null}
 */
function pickLogoUrl(business, settings) {
  const fromBusiness =
    typeof business?.logo_url === 'string' && business.logo_url.trim()
      ? business.logo_url.trim()
      : null;
  if (fromBusiness) return fromBusiness;

  const storefront = settings?.storefront;
  const fromSettings =
    typeof storefront?.logoUrl === 'string' && storefront.logoUrl.trim()
      ? storefront.logoUrl.trim()
      : typeof settings?.logoUrl === 'string' && settings.logoUrl.trim()
        ? settings.logoUrl.trim()
        : null;
  return fromSettings;
}
