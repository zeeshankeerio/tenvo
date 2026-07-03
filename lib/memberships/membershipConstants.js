/** Tenant customer membership lifecycle — not platform SaaS billing. */

export const MEMBERSHIP_STATUS = Object.freeze({
  TRIAL: 'trial',
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

export const MEMBERSHIP_SOURCE = Object.freeze({
  STOREFRONT: 'storefront',
  POS: 'pos',
  HUB: 'hub',
  IMPORT: 'import',
});

export const MEMBERSHIP_BILLING_INTERVAL = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
  SESSION_PACK: 'session_pack',
  INSTALLMENT: 'installment',
  NONE: 'none',
});

export const MEMBERSHIP_EVENT = Object.freeze({
  ENROLLED: 'enrolled',
  ACTIVATED: 'activated',
  RENEWED: 'renewed',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PAYMENT_FAILED: 'payment_failed',
  UPGRADED: 'upgraded',
  RECURRING_INVOICE_CREATED: 'recurring_invoice_created',
});

export const ACTIVE_MEMBERSHIP_STATUSES = Object.freeze([
  MEMBERSHIP_STATUS.TRIAL,
  MEMBERSHIP_STATUS.PENDING,
  MEMBERSHIP_STATUS.ACTIVE,
  MEMBERSHIP_STATUS.PAUSED,
]);
