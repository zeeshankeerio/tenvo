/**
 * Tenant storefront meeting / scheduling links (Calendly, etc.).
 *
 * Canonical storage: `business_settings.settings.storefront.booking.meeting_url`
 * (nested under storefront like dealership, pharmacy, and other vertical blocks).
 *
 * Platform sales scheduling uses `getSalesMeetingUrl()` in `lib/marketing/salesLinks.js`
 * only — never read that env for tenant storefront booking CTAs.
 */
import { resolveDomainKey } from '@/lib/config/domainKeyAliases.js';
import { planHasFeatureWithPackaging } from '@/lib/subscription/effectivePlanAccess.js';
import { isAutoDealershipStore } from '@/lib/storefront/autoDealership';
import { isPharmacyElevatedStore } from '@/lib/storefront/pharmacyStorefront';
import { isFurnitureElevatedStore } from '@/lib/storefront/furnitureStorefront';
import { isFitnessElevatedStore } from '@/lib/storefront/fitnessStorefront';
import { isAutoMarketplaceStore } from '@/lib/storefront/autoMarketplace';
import { DEALERSHIP_CONTACT_SUBJECTS } from '@/lib/storefront/dealershipBooking';

/** Verticals with storefront booking / appointment contact flows. */
export const STOREFRONT_BOOKING_VERTICALS = Object.freeze([
  'vehicle-dealership',
  'auto-marketplace',
  'pharmacy',
  'furniture',
  'dental-clinic',
  'beauty-salon',
  'medical-clinic',
  'veterinary',
  'gym-fitness',
  'spa-wellness',
]);

/**
 * @param {string | null | undefined} category
 */
export function hasStorefrontBookingVertical(category) {
  const key = resolveDomainKey(String(category || '').trim());
  return STOREFRONT_BOOKING_VERTICALS.includes(key);
}

/**
 * @param {object} [business]
 */
export function hasAppointmentBookingPlan(business = {}) {
  const settings =
    business?.settings && typeof business.settings === 'object' ? business.settings : {};
  const planTier = business?.plan_tier || business?.planTier || 'free';
  return planHasFeatureWithPackaging(planTier, 'appointment_booking', settings);
}

/**
 * Hub store settings: show meeting URL field when plan + vertical support booking.
 * @param {object} [business]
 * @param {string} [category]
 */
export function canConfigureTenantMeetingUrl(business, category) {
  return hasAppointmentBookingPlan(business) && hasStorefrontBookingVertical(category);
}

/**
 * Plan feature OR vertical booking UX (for broader feature checks).
 * @param {object} [business]
 * @param {string} [category]
 */
export function hasBookingMeetingFeature(business, category) {
  return hasAppointmentBookingPlan(business) || hasStorefrontBookingVertical(category);
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function normalizeTenantMeetingUrl(url) {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

/**
 * @param {object} [settings] business_settings.settings JSON
 * @returns {string | null}
 */
export function readTenantMeetingUrlFromSettings(settings = {}) {
  const raw =
    settings?.storefront?.booking?.meeting_url ??
    settings?.storefront?.booking?.meetingUrl ??
    null;
  return normalizeTenantMeetingUrl(raw);
}

/**
 * @param {object} [_business]
 * @param {object} [settings] business_settings.settings JSON
 * @returns {string | null}
 */
export function getTenantMeetingUrl(_business, settings = {}) {
  return readTenantMeetingUrlFromSettings(settings);
}

/**
 * @param {object} [settings]
 * @returns {{ meetingUrl: string }}
 */
export function getBookingConfig(settings = {}) {
  return {
    meetingUrl: readTenantMeetingUrlFromSettings(settings) || '',
  };
}

/**
 * @param {string} [category]
 * @param {string} [subject]
 */
export function isStorefrontBookingSubject(category, subject) {
  const value = String(subject || '').trim();
  if (!value || value === 'general') return false;

  if (isAutoDealershipStore(category) || isAutoMarketplaceStore(category)) {
    return DEALERSHIP_CONTACT_SUBJECTS.has(value);
  }
  if (isPharmacyElevatedStore(category)) {
    return value === 'prescription' || value === 'refill';
  }
  if (isFurnitureElevatedStore(category)) {
    return value === 'showroom' || value === 'consultation';
  }
  if (isFitnessElevatedStore(category)) {
    return value === 'appointment' || value === 'visit' || value === 'booking';
  }
  if (hasStorefrontBookingVertical(category)) {
    return value === 'appointment' || value === 'visit' || value === 'booking';
  }
  return false;
}

/**
 * Storefront CTAs: tenant URL is set and vertical supports booking flows.
 * @param {object} [business]
 * @param {string} [category]
 * @param {object} [settings]
 */
export function shouldOfferTenantMeetingLink(business, category, settings = {}) {
  if (!getTenantMeetingUrl(business, settings)) return false;
  return hasStorefrontBookingVertical(category);
}

/**
 * Default booking block for registration storefront extras.
 */
export function getDefaultStorefrontBookingSeed() {
  return {
    booking: {
      meeting_url: '',
    },
  };
}
