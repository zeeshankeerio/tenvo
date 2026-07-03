/**
 * Offline / manual SaaS payment requests stored on `businesses.settings.billing`.
 * Owner submits → platform admin approves → `applyManualSubscriptionPayment`.
 */

import { randomUUID } from 'crypto';

/** @typedef {'pending' | 'approved' | 'rejected'} ManualPaymentRequestStatus */

/**
 * @typedef {Object} ManualPaymentRequest
 * @property {string} id
 * @property {ManualPaymentRequestStatus} status
 * @property {string} [planTier]
 * @property {string | null} [domainPackageKey]
 * @property {string} paymentReference
 * @property {string} [paymentMethod]
 * @property {number | null} [amountMajor]
 * @property {string} [currency]
 * @property {string} [notes]
 * @property {string} submittedAt
 * @property {string} [submittedByUserId]
 * @property {string} [submittedByEmail]
 * @property {string} [reviewedAt]
 * @property {string} [reviewedByUserId]
 * @property {string} [reviewNotes]
 */

export const MANUAL_PAYMENT_METHODS = Object.freeze([
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash / in person' },
  { value: 'other', label: 'Other' },
]);

/**
 * @param {unknown} settings
 * @returns {{ pending: ManualPaymentRequest | null, history: ManualPaymentRequest[] }}
 */
export function getManualPaymentRequestState(settings) {
  const billing =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? /** @type {Record<string, unknown>} */ (settings).billing
      : null;
  const rawBilling =
    billing && typeof billing === 'object' && !Array.isArray(billing) ? billing : {};
  const pending = normalizeRequest(rawBilling.pending_manual_payment);
  const history = Array.isArray(rawBilling.manual_payment_history)
    ? rawBilling.manual_payment_history.map(normalizeRequest).filter(Boolean)
    : [];
  return { pending, history };
}

/**
 * @param {unknown} raw
 * @returns {ManualPaymentRequest | null}
 */
function normalizeRequest(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const r = /** @type {Record<string, unknown>} */ (raw);
  const status = r.status;
  if (status !== 'pending' && status !== 'approved' && status !== 'rejected') return null;
  return {
    id: String(r.id || ''),
    status,
    planTier: r.planTier ? String(r.planTier) : undefined,
    domainPackageKey: r.domainPackageKey ? String(r.domainPackageKey) : null,
    paymentReference: String(r.paymentReference || ''),
    paymentMethod: r.paymentMethod ? String(r.paymentMethod) : undefined,
    amountMajor:
      r.amountMajor != null && Number.isFinite(Number(r.amountMajor))
        ? Number(r.amountMajor)
        : null,
    currency: r.currency ? String(r.currency) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    submittedAt: r.submittedAt ? String(r.submittedAt) : new Date().toISOString(),
    submittedByUserId: r.submittedByUserId ? String(r.submittedByUserId) : undefined,
    submittedByEmail: r.submittedByEmail ? String(r.submittedByEmail) : undefined,
    reviewedAt: r.reviewedAt ? String(r.reviewedAt) : undefined,
    reviewedByUserId: r.reviewedByUserId ? String(r.reviewedByUserId) : undefined,
    reviewNotes: r.reviewNotes ? String(r.reviewNotes) : undefined,
  };
}

/**
 * @param {unknown} prevSettings
 * @param {ManualPaymentRequest} request
 */
export function mergePendingManualPaymentRequest(prevSettings, request) {
  const prev =
    prevSettings && typeof prevSettings === 'object' && !Array.isArray(prevSettings)
      ? { ...prevSettings }
      : {};
  const billingRaw = prev.billing;
  const billing =
    billingRaw && typeof billingRaw === 'object' && !Array.isArray(billingRaw)
      ? { ...billingRaw }
      : {};
  return {
    ...prev,
    billing: {
      ...billing,
      pending_manual_payment: request,
    },
  };
}

/**
 * @param {unknown} prevSettings
 * @param {ManualPaymentRequest} resolvedRequest
 */
export function resolveManualPaymentRequest(prevSettings, resolvedRequest) {
  const prev =
    prevSettings && typeof prevSettings === 'object' && !Array.isArray(prevSettings)
      ? { ...prevSettings }
      : {};
  const billingRaw = prev.billing;
  const billing =
    billingRaw && typeof billingRaw === 'object' && !Array.isArray(billingRaw)
      ? { ...billingRaw }
      : {};
  const history = Array.isArray(billing.manual_payment_history)
    ? [...billing.manual_payment_history]
    : [];
  history.unshift(resolvedRequest);
  return {
    ...prev,
    billing: {
      ...billing,
      pending_manual_payment: null,
      manual_payment_history: history.slice(0, 20),
    },
  };
}

/**
 * @param {object} params
 * @returns {ManualPaymentRequest}
 */
export function buildPendingManualPaymentRequest({
  planTier,
  domainPackageKey,
  paymentReference,
  paymentMethod,
  amountMajor,
  currency,
  notes,
  submittedByUserId,
  submittedByEmail,
}) {
  return {
    id: randomUUID(),
    status: 'pending',
    planTier: planTier || undefined,
    domainPackageKey: domainPackageKey || null,
    paymentReference: String(paymentReference || '').trim(),
    paymentMethod: paymentMethod || 'other',
    amountMajor: amountMajor != null && Number.isFinite(Number(amountMajor)) ? Number(amountMajor) : null,
    currency: (currency || 'PKR').toUpperCase().slice(0, 10),
    notes: notes ? String(notes).slice(0, 2000) : undefined,
    submittedAt: new Date().toISOString(),
    submittedByUserId,
    submittedByEmail,
  };
}

/**
 * @param {{ pending: import('./manualPaymentRequests.js').ManualPaymentRequest | null, history: import('./manualPaymentRequests.js').ManualPaymentRequest[] }} state
 * @param {string} paymentReference
 */
export function isPaymentReferenceAlreadyUsed(state, paymentReference) {
  const ref = String(paymentReference || '').trim().toLowerCase();
  if (ref.length < 4) return false;
  const { pending, history } = state;
  if (pending?.status === 'pending' && pending.paymentReference?.trim().toLowerCase() === ref) {
    return true;
  }
  return history.some(
    (row) =>
      row.status === 'approved' &&
      row.paymentReference?.trim().toLowerCase() === ref
  );
}

export function getManualPaymentPayeeInstructions() {
  return {
    jazzcash: process.env.TENVO_MANUAL_PAYMENT_JAZZCASH || '',
    easypaisa: process.env.TENVO_MANUAL_PAYMENT_EASYPAISA || '',
    bank: process.env.TENVO_MANUAL_PAYMENT_BANK || '',
    supportEmail: process.env.TENVO_BILLING_SUPPORT_EMAIL || process.env.SUPPORT_EMAIL || '',
  };
}
