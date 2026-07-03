/**
 * Apply offline / manual SaaS subscription payments (shared by platform admin + approval flow).
 */

import { resolvePlanTier } from '@/lib/config/plans';
import { resolveBillableSku } from '@/lib/payments/billingSku';
import { mergeBusinessSettingsForBilling } from '@/lib/payments/billingActivation';
import { toStripeMinorUnits, normalizeBillingCurrency } from '@/lib/payments/stripeCatalog';

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} params
 * @param {string} params.businessId
 * @param {string|null} [params.planTier]
 * @param {string|null} [params.domainPackageKey]
 * @param {number} [params.extendDays]
 * @param {number|null} [params.amountMinor]
 * @param {number|null} [params.amountMajor]
 * @param {string} [params.currency]
 * @param {string} [params.paymentReference]
 * @param {string} [params.paymentMethod]
 * @param {string} [params.notes]
 * @param {string|null} [params.recordedByUserId]
 * @param {string|null} [params.recordedByEmail]
 * @param {string} [params.source]
 * @param {string|null} [params.requestId]
 */
export async function applyManualSubscriptionPaymentTx(tx, params) {
  const {
    businessId,
    planTier = null,
    domainPackageKey = null,
    extendDays = 30,
    amountMinor = null,
    amountMajor = null,
    currency = 'PKR',
    paymentReference = '',
    paymentMethod = '',
    notes = '',
    recordedByUserId = null,
    recordedByEmail = null,
    source = 'platform_manual_payment',
    requestId = null,
  } = params;

  const biz = await tx.businesses.findUnique({ where: { id: businessId } });
  if (!biz) {
    throw new Error('Business not found');
  }

  const daysRaw = Number(extendDays);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(366 * 3, Math.floor(daysRaw))) : 30;

  const tierHint =
    planTier != null && String(planTier).trim() !== ''
      ? resolvePlanTier(planTier)
      : resolvePlanTier(biz.plan_tier || 'free');

  const packageKey =
    domainPackageKey != null && String(domainPackageKey).trim() !== ''
      ? String(domainPackageKey).trim()
      : null;

  const billable = resolveBillableSku({
    planTier: tierHint,
    domainPackageKey: packageKey,
    currency,
  });

  if (!billable) {
    throw new Error('Invalid plan or domain package for manual payment');
  }

  const { activation } = billable;

  const resolved = resolvePlanTier(activation.planTier);
  if (resolved === 'free') {
    throw new Error('Manual payment requires a paid tier or domain package');
  }

  const now = new Date();
  let from = now;
  if (biz.plan_expires_at && new Date(biz.plan_expires_at) > from) {
    from = new Date(biz.plan_expires_at);
  }
  const newExpires = new Date(from);
  newExpires.setDate(newExpires.getDate() + days);

  const cur = normalizeBillingCurrency(currency);
  let minor =
    amountMinor != null && amountMinor !== '' && Number.isFinite(Number(amountMinor))
      ? Math.round(Number(amountMinor))
      : null;
  if (minor == null && amountMajor != null && Number.isFinite(Number(amountMajor))) {
    minor = toStripeMinorUnits(Number(amountMajor), cur);
  }

  const nextSettings = mergeBusinessSettingsForBilling(
    biz.settings,
    activation.settingsPatch
  );

  await tx.businesses.update({
    where: { id: businessId },
    data: {
      ...activation.quota,
      settings: nextSettings,
      plan_expires_at: newExpires,
      stripe_subscription_status: 'manual_payment_active',
      updated_at: new Date(),
    },
  });

  await tx.subscription_history.create({
    data: {
      business_id: businessId,
      plan_tier: activation.quota.plan_tier,
      status: 'manual_payment_received',
      stripe_subscription_id: biz.stripe_subscription_id,
      amount_minor: minor != null && Number.isFinite(minor) ? minor : null,
      currency: (currency && String(currency).slice(0, 10).toUpperCase()) || 'PKR',
      metadata: {
        source,
        extend_days: days,
        payment_reference: String(paymentReference || '').slice(0, 500),
        payment_method: String(paymentMethod || '').slice(0, 64),
        notes: String(notes || '').slice(0, 2000),
        domain_package_key: activation.domainPackageKey,
        billing_kind: packageKey ? 'domain_package' : 'plan',
        request_id: requestId,
        recorded_by_user_id: recordedByUserId,
        recorded_by_email: recordedByEmail,
      },
    },
  });

  return {
    businessId,
    planTier: activation.quota.plan_tier,
    domainPackageKey: activation.domainPackageKey,
    planExpiresAt: newExpires.toISOString(),
    extendDays: days,
  };
}
