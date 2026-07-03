import { Resend } from 'resend';

/**
 * Send campaign outreach email using tenant or platform Resend credentials.
 * Does not require platform RESEND_API_KEY when tenant supplies their own key.
 *
 * @param {{ apiKey: string, from: string, to: string, subject: string, react: import('react').ReactElement, replyTo?: string }} params
 */
export async function sendCampaignOutreachEmail({ apiKey, from, to, subject, react, replyTo }) {
  if (!apiKey?.trim()) {
    return { success: true, skipped: true, error: 'Email provider not configured' };
  }
  if (!from?.trim()) {
    return { success: false, error: 'Sender address (from) is not configured' };
  }

  const resend = new Resend(apiKey.trim());

  try {
    const { data, error } = await resend.emails.send({
      from: from.trim(),
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    return { success: false, error: err?.message || 'Send failed' };
  }
}

/**
 * Test Resend credentials with a minimal API call (domains list).
 * @param {{ apiKey: string }} params
 */
export async function testResendApiKey({ apiKey }) {
  if (!apiKey?.trim()) {
    return { ok: false, error: 'API key is required' };
  }
  try {
    const resend = new Resend(apiKey.trim());
    const { data, error } = await resend.domains.list();
    if (error) {
      return { ok: false, error: error.message };
    }
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, domainCount: count };
  } catch (err) {
    return { ok: false, error: err?.message || 'Connection failed' };
  }
}
