/**
 * Hub campaigns workspace: honest channel availability (aligned with capabilities.js).
 */

/** @returns {'ready' | 'partial' | 'roadmap'} */
export function getEmailCampaignDeliveryStatus() {
  if (process.env.RESEND_API_KEY?.trim()) return 'ready';
  return process.env.NODE_ENV === 'production' ? 'partial' : 'partial';
}

/**
 * Client-side delivery status when owner integration summary is known.
 * @param {{ configured?: boolean, usesTenantKey?: boolean, usesPlatformKey?: boolean } | null | undefined} emailDelivery
 * @returns {'ready' | 'partial'}
 */
export function getEmailCampaignDeliveryStatusForOwner(emailDelivery) {
  if (emailDelivery?.configured) return 'ready';
  return 'partial';
}

export const CAMPAIGN_CHANNEL_COPY = {
  email: {
    label: 'Email',
    status: 'partial',
    hint: 'Sends through Resend when you add your API key under Integrations or the platform default is configured.',
  },
  whatsapp: {
    label: 'WhatsApp',
    status: 'roadmap',
    hint: 'WhatsApp Business API automation is on the roadmap. Use email or export segment contacts for wa.me links today.',
  },
  notification: {
    label: 'In-app notification',
    status: 'partial',
    hint: 'Creates hub notifications for staff when customer accounts are not linked. Customer push is roadmap.',
  },
};

export function getCampaignWorkspaceNotice(emailDelivery) {
  const email =
    emailDelivery != null
      ? getEmailCampaignDeliveryStatusForOwner(emailDelivery)
      : getEmailCampaignDeliveryStatus();

  if (email === 'ready') {
    const source = emailDelivery?.usesTenantKey
      ? 'your Resend integration'
      : emailDelivery?.usesPlatformKey
        ? 'platform Resend'
        : 'Resend';
    return `Email outreach sends via ${source}. WhatsApp API automation is on the roadmap.`;
  }
  return 'Configure email under Integrations (your Resend key) or ask your admin about platform delivery. WhatsApp API automation is on the roadmap.';
}
