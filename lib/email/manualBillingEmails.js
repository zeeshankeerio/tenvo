import { sendTransactionalEmail } from './resend';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { getDomainPackage } from '@/lib/config/domainPackages';

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://app.tenvo.app').replace(/\/$/, '');
}

function resolveBillingNotifyEmails() {
  const support = process.env.TENVO_BILLING_SUPPORT_EMAIL?.trim();
  if (support) return [support];

  const owners = (process.env.PLATFORM_OWNER_EMAILS || process.env.PLATFORM_OWNER_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return owners.length ? owners : [];
}

function describeSku({ planTier, domainPackageKey }) {
  if (domainPackageKey) {
    const pkg = getDomainPackage(domainPackageKey);
    return pkg?.name ? `${pkg.name} (${domainPackageKey})` : domainPackageKey;
  }
  const tier = resolvePlanTier(planTier || 'free');
  return PLAN_TIERS[tier]?.name || tier;
}

async function safeSend(payload) {
  try {
    if (!payload.to || (Array.isArray(payload.to) && !payload.to.length)) return { skipped: true };
    return await sendTransactionalEmail(payload);
  } catch (error) {
    console.error('[manualBillingEmails]', error);
    return { error };
  }
}

/**
 * Notify platform billing team when an owner submits offline payment proof.
 */
export async function sendManualPaymentSubmittedToPlatformEmail({
  businessName,
  businessDomain,
  businessId,
  paymentReference,
  paymentMethod,
  planTier,
  domainPackageKey,
  amountMajor,
  currency = 'PKR',
  submittedByEmail,
}) {
  const recipients = resolveBillingNotifyEmails();
  if (!recipients.length) return { skipped: true, reason: 'no_recipients' };

  const sku = describeSku({ planTier, domainPackageKey });
  const amountLine =
    amountMajor != null && Number.isFinite(Number(amountMajor))
      ? `<p><strong>Amount:</strong> ${currency} ${Number(amountMajor).toLocaleString()}</p>`
      : '';

  return safeSend({
    to: recipients,
    subject: `[Billing] Offline payment submitted — ${businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #065f46;">Manual payment pending review</h2>
        <p>A business owner submitted an offline payment for verification.</p>
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Business:</strong> ${businessName}</p>
          <p><strong>Domain:</strong> ${businessDomain || '—'}</p>
          <p><strong>Business ID:</strong> ${businessId}</p>
          <p><strong>SKU:</strong> ${sku}</p>
          <p><strong>Reference:</strong> ${paymentReference}</p>
          <p><strong>Method:</strong> ${paymentMethod || '—'}</p>
          ${amountLine}
          <p><strong>Submitted by:</strong> ${submittedByEmail || '—'}</p>
        </div>
        <p>Review in Platform Admin → Businesses → Details → Manual payment.</p>
      </div>
    `,
  });
}

/**
 * Notify owner when offline payment is approved and access is activated.
 */
export async function sendManualPaymentApprovedToOwnerEmail({
  to,
  businessName,
  businessDomain,
  planTier,
  domainPackageKey,
  planExpiresAt,
  paymentReference,
}) {
  const sku = describeSku({ planTier, domainPackageKey });
  const expiry = planExpiresAt ? new Date(planExpiresAt).toLocaleDateString() : '—';
  const hubUrl = businessDomain
    ? `${appBaseUrl()}/business/${businessDomain}?tab=settings`
    : `${appBaseUrl()}/business`;

  return safeSend({
    to,
    subject: `Your Tenvo subscription is active — ${sku}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #065f46;">Payment verified</h2>
        <p>Hi ${businessName},</p>
        <p>We verified your offline payment (reference <strong>${paymentReference}</strong>) and activated <strong>${sku}</strong>.</p>
        <p>Access is active through <strong>${expiry}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${hubUrl}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Open workspace
          </a>
        </p>
      </div>
    `,
  });
}

/**
 * Notify owner when offline payment request is rejected.
 */
export async function sendManualPaymentRejectedToOwnerEmail({
  to,
  businessName,
  paymentReference,
  reviewNotes,
}) {
  const support =
    process.env.TENVO_BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'support@tenvo.app';

  return safeSend({
    to,
    subject: 'Update on your offline payment submission',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #92400e;">Payment could not be verified</h2>
        <p>Hi ${businessName},</p>
        <p>We could not verify your payment reference <strong>${paymentReference}</strong>.</p>
        ${
          reviewNotes
            ? `<p style="background: #fffbeb; padding: 12px; border-radius: 6px;"><strong>Note:</strong> ${reviewNotes}</p>`
            : ''
        }
        <p>You may submit again with the correct transaction ID or contact us at ${support}.</p>
      </div>
    `,
  });
}
