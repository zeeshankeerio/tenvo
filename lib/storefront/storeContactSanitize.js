/**
 * Detect placeholder / seed contact values that should not appear on public storefronts.
 */

const PLACEHOLDER_PHONE_DIGITS = new Set([
  '923001234567',
  '923004444004',
  '923003333003',
  '923002222002',
  '923001111001',
  '6590000000',
  '971500000000',
]);

/**
 * @param {string | null | undefined} phone
 */
export function isPlaceholderPhone(phone) {
  if (!phone || typeof phone !== 'string') return true;
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 7) return true;
  if (PLACEHOLDER_PHONE_DIGITS.has(digits)) return true;
  if (/^(\d)\1{9,}$/.test(digits)) return true;
  if (/0{6,}$/.test(digits)) return true;
  return false;
}

/**
 * @param {string | null | undefined} email
 */
export function isPlaceholderEmail(email) {
  if (!email || typeof email !== 'string') return true;
  const e = email.trim().toLowerCase();
  if (!e.includes('@')) return true;
  if (e.endsWith('@example.com')) return true;
  if (e.includes('walkin@')) return true;
  if (e.includes('test@') || e.includes('dummy@') || e.includes('fake@')) return true;
  return false;
}

/**
 * Demo storefronts should not expose the platform owner's login email as public support.
 * @param {string | null | undefined} domain
 */
export function isDemoStoreDomain(domain) {
  return String(domain || '').trim().toLowerCase().startsWith('demo-');
}

/**
 * @param {string | null | undefined} phone
 * @param {{ isDemo?: boolean }} [opts]
 */
export function sanitizePublicPhone(phone, opts = {}) {
  if (isPlaceholderPhone(phone)) return '';
  if (opts.isDemo && isPlaceholderPhone(phone)) return '';
  return String(phone).trim();
}

/**
 * @param {string | null | undefined} email
 * @param {{ isDemo?: boolean, domain?: string }} [opts]
 */
export function sanitizePublicEmail(email, opts = {}) {
  if (isPlaceholderEmail(email)) return '';
  if (opts.isDemo || isDemoStoreDomain(opts.domain)) {
    if (isPlaceholderEmail(email)) return '';
  }
  return String(email).trim();
}
