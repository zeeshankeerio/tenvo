import { resolveDomainKey } from '@/lib/config/domainKeyAliases';

/**
 * Vertical keys that use the shared membership enrollment engine.
 * To add a vertical: append here, extend `membershipProductDetection.js` heuristics,
 * and optionally add storefront section config under `settings.storefront.{vertical}`.
 */
export const MEMBERSHIP_VERTICAL_KEYS = Object.freeze([
  'gym-fitness',
  'spa-wellness',
  'beauty-salon',
  'dental-clinic',
  'hotel-guesthouse',
  'sports-club',
  'yoga-studio',
]);

const MEMBERSHIP_VERTICAL_SET = new Set(MEMBERSHIP_VERTICAL_KEYS);

/**
 * @param {string | null | undefined} category
 */
export function resolveMembershipVerticalKey(category) {
  const key = resolveDomainKey(category || '');
  return MEMBERSHIP_VERTICAL_SET.has(key) ? key : null;
}

/**
 * @param {string | null | undefined} category
 */
export function isMembershipVertical(category) {
  return Boolean(resolveMembershipVerticalKey(category));
}

/**
 * Merge tenant settings with vertical defaults.
 * @param {{ category?: string; settings?: Record<string, unknown> | null }} business
 */
export function getMembershipConfig(business) {
  const verticalKey = resolveMembershipVerticalKey(business?.category);
  const raw =
    business?.settings &&
    typeof business.settings === 'object' &&
    !Array.isArray(business.settings)
      ? /** @type {Record<string, unknown>} */ (business.settings)
      : {};
  const storefront =
    raw.storefront && typeof raw.storefront === 'object' ? raw.storefront : {};
  const memberships =
    raw.memberships && typeof raw.memberships === 'object' ? raw.memberships : {};

  return {
    verticalKey,
    enabled: Boolean(verticalKey),
    renewalGraceDays: Number(memberships.renewalGraceDays ?? 7),
    autoPauseOnFailedPayment: memberships.autoPauseOnFailedPayment !== false,
    freezeMaxDays: Number(memberships.freezeMaxDays ?? 30),
    defaultAutoRenew: memberships.defaultAutoRenew !== false,
    storefront,
  };
}
