/**
 * Validates storefront / business `domain` handles used as Better Auth `username`.
 * Must stay aligned with {@link app/register/page.js} `generateSlug` output.
 */

/** Subdomains / routes we must not collide with */
const RESERVED_STORE_HANDLES = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'www',
  'mail',
  'ftp',
  'static',
  'assets',
  'cdn',
  'support',
  'help',
  'status',
  'dashboard',
  'login',
  'register',
  'logout',
  'sign-in',
  'sign-up',
  'multi-business',
  'store',
  'stores',
  'null',
  'undefined',
  'tenvo',
  'system',
  'root',
]);

/**
 * @param {string} raw
 * @returns {boolean}
 */
export function isValidStoreHandleUsername(raw) {
  if (typeof raw !== 'string') return false;
  const u = raw.trim().toLowerCase();
  if (u.length < 3 || u.length > 63) return false;
  if (RESERVED_STORE_HANDLES.has(u)) return false;
  // Slug: segments of [a-z0-9] separated by single hyphens (matches generateSlug)
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(u);
}
