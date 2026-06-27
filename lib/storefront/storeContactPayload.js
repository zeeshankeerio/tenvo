/**
 * Normalize public storefront contact between hub settings UI and `business_settings.settings`.
 */
import { sanitizePublicEmail, sanitizePublicPhone } from './storeContactSanitize';

/**
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function normalizeContactFromSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...raw };
}

/**
 * Build the contact object persisted to `settings.contact` from hub form state.
 * @param {{
 *   publicEmail?: string;
 *   phone?: string;
 *   whatsapp?: string;
 *   address?: string;
 *   city?: string;
 *   country?: string;
 *   postalCode?: string;
 *   businessHours?: string;
 *   website?: string;
 * }} form
 * @param {Record<string, unknown>} [existing]
 */
export function buildStoreContactPayload(form, existing = {}) {
  const email = String(form.publicEmail ?? form.email ?? '').trim();
  const phone = String(form.phone ?? '').trim();
  const whatsapp = String(form.whatsapp ?? '').trim();
  const address = String(form.address ?? '').trim();
  const city = String(form.city ?? '').trim();
  const country = String(form.country ?? '').trim();
  const postalCode = String(form.postalCode ?? '').trim();
  const businessHours = String(form.businessHours ?? '').trim();
  const website = String(form.website ?? '').trim();

  const hasAny =
    email || phone || whatsapp || address || city || country || postalCode || businessHours || website;

  return {
    ...existing,
    email,
    phone,
    whatsapp,
    address,
    city,
    country,
    postalCode,
    businessHours,
    website,
    published: Boolean(hasAny),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Flatten stored settings + business row into hub form fields.
 * @param {{ business?: Record<string, unknown>; storeSettings?: Record<string, unknown> }} args
 */
export function flattenStoreContactForForm({ business = {}, storeSettings = {} }) {
  const contact = normalizeContactFromSettings(storeSettings.contact);

  return {
    publicEmail: contact.email || '',
    phone: contact.phone || business.phone || '',
    whatsapp: contact.whatsapp || contact.whatsApp || '',
    address: contact.address || business.address || '',
    city: contact.city || business.city || '',
    country: contact.country || business.country || '',
    postalCode: contact.postalCode || contact.postal_code || business.postal_code || '',
    businessHours: storeSettings.businessHours || contact.businessHours || contact.hours || '',
    website: contact.website || business.website || '',
    contactPublished: Boolean(contact.published),
  };
}

/**
 * Sanitized public contact preview for owner UI.
 * @param {ReturnType<typeof buildStoreContactPayload>} contact
 * @param {{ domain?: string }} [opts]
 */
export function previewPublicContact(contact, opts = {}) {
  return {
    email: sanitizePublicEmail(contact.email, { domain: opts.domain }),
    phone: sanitizePublicPhone(contact.phone),
    whatsapp: sanitizePublicPhone(contact.whatsapp),
    city: contact.city || '',
    country: contact.country || '',
    address: contact.address || '',
    businessHours: contact.businessHours || '',
  };
}
