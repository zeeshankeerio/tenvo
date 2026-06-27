/**
 * Shared Resend / transactional email configuration checks.
 */

/** @returns {'resend' | 'console' | 'misconfigured'} */
export function getEmailDeliveryMode() {
  const hasKey = Boolean(process.env.RESEND_API_KEY?.trim());
  if (!hasKey) {
    return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'console';
  }
  return 'resend';
}

/**
 * Fail fast in production when email cannot be delivered.
 * @throws {Error}
 */
export function assertEmailDeliveryReady() {
  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new Error(
      'RESEND_API_KEY is required in production. Add it in your hosting environment.'
    );
  }
  if (!process.env.RESEND_FROM?.trim()) {
    throw new Error(
      'RESEND_FROM is required in production (e.g. TENVO <hello@your-verified-domain.com>). Verify the domain in Resend.'
    );
  }
}

/**
 * User-safe hint when OTP send fails (no secrets).
 * @param {string} [rawError]
 */
export function mapEmailDeliveryError(rawError) {
  const msg = String(rawError || '').toLowerCase();
  if (msg.includes('resend_from') || msg.includes('verified domain') || msg.includes('domain')) {
    return 'Email could not be sent, sender domain may be unverified. Contact support.';
  }
  if (msg.includes('resend_api_key') || msg.includes('not configured')) {
    return 'Email service is not configured. Contact support or try again later.';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return 'That email address looks invalid. Check for typos and try again.';
  }
  return 'We could not send the verification code. Check spam, wait a minute, then resend.';
}
