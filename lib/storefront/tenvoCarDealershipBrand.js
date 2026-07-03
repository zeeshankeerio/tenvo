/**
 * Tenvo Car Dealership (TCD) brand assets for vehicle-dealership showroom template.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { isTenvoVehiclesShowroomProfile } from '@/lib/storefront/dealershipShowroomProfile';

/** Public SVG monogram — works on light and dark headers/footers. */
export const TCD_LOGO_PATH = '/storefront/tenvo-car-dealership-tcd.svg';

const LEGACY_SHOWROOM_LOGO = /sehgalmotorsports\.pk/i;

/**
 * Resolve storefront logo for Tenvo Car Dealership demos and registrations.
 * Replaces legacy third-party showroom logos with the TCD monogram.
 *
 * @param {object} [business]
 * @param {object} [settings]
 * @param {string | null | undefined} [logoUrl]
 * @returns {string | null | undefined}
 */
export function resolveTcdDealershipLogo(business, settings, logoUrl) {
  const category = resolveDomainKey(business?.category);
  if (!isAutoDealershipStore(category)) {
    return logoUrl ?? business?.logo_url ?? null;
  }

  const candidate = logoUrl ?? business?.logo_url ?? null;
  if (!isTenvoVehiclesShowroomProfile(business, settings)) {
    return candidate;
  }
  if (!candidate || LEGACY_SHOWROOM_LOGO.test(String(candidate))) {
    return TCD_LOGO_PATH;
  }
  return candidate;
}
