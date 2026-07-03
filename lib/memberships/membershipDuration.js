import { getGymMembershipDuration } from '@/lib/storefront/fitnessStorefront';
import { MEMBERSHIP_BILLING_INTERVAL } from '@/lib/memberships/membershipConstants';

/**
 * @param {object} product
 * @param {string | null | undefined} [verticalKey]
 */
export function resolveBillingInterval(product, verticalKey) {
  if (verticalKey === 'gym-fitness') {
    const duration = getGymMembershipDuration(product);
    if (duration === 'monthly') return MEMBERSHIP_BILLING_INTERVAL.MONTHLY;
    if (duration === '3month') return MEMBERSHIP_BILLING_INTERVAL.QUARTERLY;
    if (duration === '6month') return MEMBERSHIP_BILLING_INTERVAL.QUARTERLY;
    if (duration === 'yearly') return MEMBERSHIP_BILLING_INTERVAL.ANNUAL;
    if (duration === 'trial') return MEMBERSHIP_BILLING_INTERVAL.NONE;
  }

  const unit = String(product?.unit || '').toLowerCase();
  if (unit === 'session') return MEMBERSHIP_BILLING_INTERVAL.SESSION_PACK;
  if (unit === 'month') return MEMBERSHIP_BILLING_INTERVAL.MONTHLY;

  const dd = product?.domain_data || {};
  const raw = String(dd.duration || dd.membershiptype || '').toLowerCase();
  if (/annual|yearly/.test(raw)) return MEMBERSHIP_BILLING_INTERVAL.ANNUAL;
  if (/quarter|3.?month/.test(raw)) return MEMBERSHIP_BILLING_INTERVAL.QUARTERLY;
  if (/month/.test(raw)) return MEMBERSHIP_BILLING_INTERVAL.MONTHLY;

  return MEMBERSHIP_BILLING_INTERVAL.MONTHLY;
}

/**
 * @param {Date} start
 * @param {object} product
 * @param {string | null | undefined} [verticalKey]
 */
export function computeMembershipEndsAt(start, product, verticalKey) {
  const interval = resolveBillingInterval(product, verticalKey);
  const end = new Date(start);

  if (verticalKey === 'gym-fitness') {
    const duration = getGymMembershipDuration(product);
    if (duration === 'trial') {
      end.setDate(end.getDate() + 7);
      return end;
    }
    if (duration === 'monthly') {
      end.setMonth(end.getMonth() + 1);
      return end;
    }
    if (duration === '3month') {
      end.setMonth(end.getMonth() + 3);
      return end;
    }
    if (duration === '6month') {
      end.setMonth(end.getMonth() + 6);
      return end;
    }
    if (duration === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
      return end;
    }
  }

  if (interval === MEMBERSHIP_BILLING_INTERVAL.SESSION_PACK) {
    end.setFullYear(end.getFullYear() + 1);
    return end;
  }
  if (interval === MEMBERSHIP_BILLING_INTERVAL.ANNUAL) {
    end.setFullYear(end.getFullYear() + 1);
    return end;
  }
  if (interval === MEMBERSHIP_BILLING_INTERVAL.QUARTERLY) {
    end.setMonth(end.getMonth() + 3);
    return end;
  }
  if (interval === MEMBERSHIP_BILLING_INTERVAL.NONE) {
    end.setDate(end.getDate() + 14);
    return end;
  }

  end.setMonth(end.getMonth() + 1);
  return end;
}

/**
 * @param {object} product
 * @param {string | null | undefined} [verticalKey]
 */
export function computeDurationDays(product, verticalKey) {
  const start = new Date();
  const end = computeMembershipEndsAt(start, product, verticalKey);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Map billing interval → invoice recurring_frequency column.
 * @param {string} interval
 */
export function billingIntervalToRecurringFrequency(interval) {
  switch (interval) {
    case MEMBERSHIP_BILLING_INTERVAL.MONTHLY:
      return 'monthly';
    case MEMBERSHIP_BILLING_INTERVAL.QUARTERLY:
      return 'quarterly';
    case MEMBERSHIP_BILLING_INTERVAL.ANNUAL:
      return 'yearly';
    default:
      return null;
  }
}
