/**
 * Canonical Better Auth / Google OAuth origins for server config.
 * Mobile browsers often hit apex (tenvo.store) while Google Console only lists www — keep both in sync.
 */

function trimUrl(url) {
  const s = String(url || '').trim();
  return s ? s.replace(/\/$/, '') : '';
}

/** Server canonical base URL (no trailing slash). */
export function resolveAuthCanonicalBaseURL() {
  return (
    trimUrl(process.env.BETTER_AUTH_URL) ||
    trimUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    trimUrl(process.env.NEXT_PUBLIC_BETTER_AUTH_URL) ||
    undefined
  );
}

function originFromUrlish(value) {
  const raw = trimUrl(value);
  if (!raw) return null;
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/** Host + optional port (no protocol), e.g. www.tenvo.store or localhost:3000 */
function hostFromOrigin(origin) {
  if (!origin) return null;
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function addWwwPair(origins, origin) {
  if (!origin) return;
  origins.add(origin);
  try {
    const u = new URL(origin);
    const { hostname, protocol, port } = u;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return;
    if (hostname.startsWith('www.')) {
      const apex = hostname.slice(4);
      origins.add(`${protocol}//${apex}${port ? `:${port}` : ''}`);
    } else {
      origins.add(`${protocol}//www.${hostname}${port ? `:${port}` : ''}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Origins allowed for callbackURL / post-OAuth redirects (Better Auth origin check).
 * @returns {string[]}
 */
export function resolveAuthTrustedOrigins() {
  const origins = new Set();

  for (const key of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  ]) {
    addWwwPair(origins, originFromUrlish(key));
  }

  const extra = String(process.env.BETTER_AUTH_TRUSTED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const entry of extra) {
    if (entry.includes('://')) {
      addWwwPair(origins, entry);
    } else {
      addWwwPair(origins, `https://${entry}`);
      addWwwPair(origins, `http://${entry}`);
    }
  }

  addWwwPair(origins, 'http://localhost:3000');
  addWwwPair(origins, 'http://127.0.0.1:3000');

  return [...origins];
}

/** Fixed Google redirect URI — must match Google Cloud Console exactly. */
export function resolveGoogleOAuthRedirectURI() {
  const base = resolveAuthCanonicalBaseURL();
  return base ? `${base}/api/auth/callback/google` : undefined;
}

/**
 * Host patterns for Better Auth dynamic baseURL (redirect_uri follows request host when allowed).
 * @returns {string[] | null}
 */
export function resolveBetterAuthAllowedHosts() {
  const fromEnv = String(process.env.BETTER_AUTH_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;

  const hosts = new Set();
  for (const origin of resolveAuthTrustedOrigins()) {
    const h = hostFromOrigin(origin);
    if (h) hosts.add(h);
  }
  const list = [...hosts];
  return list.length > 0 ? list : null;
}

/**
 * Redirect apex host to canonical www in production (cookie + OAuth consistency).
 * @param {string} requestHost
 * @returns {string | null} canonical host to redirect to, or null
 */
export function resolveCanonicalHostRedirect(requestHost) {
  const canonical = resolveAuthCanonicalBaseURL();
  if (!canonical || process.env.NODE_ENV !== 'production') return null;
  const reqHost = String(requestHost || '').trim().toLowerCase();
  if (!reqHost) return null;

  try {
    const canonicalHost = new URL(canonical).host.toLowerCase();
    if (reqHost === canonicalHost) return null;
    if (canonicalHost.startsWith('www.')) {
      const apex = canonicalHost.slice(4);
      if (reqHost === apex) return canonicalHost;
    }
  } catch {
    return null;
  }
  return null;
}
