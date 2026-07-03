import { resolveMembershipVerticalKey } from '@/lib/memberships/membershipVertical';

/** Human-readable benefit labels for hub UI. */
export const MEMBERSHIP_BENEFIT_LABELS = Object.freeze({
  discount_percent: 'Shop discount (%)',
  class_credits: 'Class / session credits',
  loyalty_multiplier: 'Loyalty points multiplier',
});

/**
 * Vertical-specific operational guidance for membership businesses.
 * @param {string | null | undefined} verticalKey
 */
export function getMembershipVerticalPlaybook(verticalKey) {
  const key = verticalKey || 'gym-fitness';
  /** @type {Record<string, { headline: string; tips: string[] }>} */
  const playbooks = {
    'gym-fitness': {
      headline: 'Gym & fitness membership ops',
      tips: [
        'Sync supplement SKUs with member discount perks so storefront pricing matches in-club benefits.',
        'Review expiring members weekly — trial-to-annual conversion peaks after 21 days.',
        'Pause (do not cancel) when renewal invoices are overdue; resume on payment to keep history.',
      ],
    },
    'spa-wellness': {
      headline: 'Spa & wellness packages',
      tips: [
        'Align session-pack inventory with booked services before peak weekends.',
        'Pending storefront enrollments need payment before perks apply at checkout.',
        'Track paused members separately from cancelled — they often return after travel seasons.',
      ],
    },
    'beauty-salon': {
      headline: 'Salon memberships & packages',
      tips: [
        'Bundle retail attach (color, care lines) with membership shop discounts.',
        'Chase renewals before wedding and Eid peaks when appointment demand spikes.',
        'Use member-only promos for loyal clients buying take-home care kits.',
      ],
    },
    'dental-clinic': {
      headline: 'Clinical membership plans',
      tips: [
        'Keep consumable stock aligned to enrolled plan procedures.',
        'Separate clinical membership AR from retail receivables in follow-up.',
        'Document pause reasons — long freezes may need re-enrollment per policy.',
      ],
    },
    'yoga-studio': {
      headline: 'Studio class packs',
      tips: [
        'Monitor class credit benefits against attendance — low usage predicts churn.',
        'Promote annual plans before seasonal dips (summer / holidays).',
        'Retail props and mats sell best when tied to member shop discounts.',
      ],
    },
    'sports-club': {
      headline: 'Club season passes',
      tips: [
        'Family plans drive retention — flag expiring secondary members on the same account.',
        'Pro-shop perks lift margin when linked to active membership status.',
        'Reconcile event deposits separately from recurring membership billing.',
      ],
    },
    'hotel-guesthouse': {
      headline: 'Guest & member packages',
      tips: [
        'Prepaid stay packages behave like memberships — track expiry and renewal windows.',
        'Segment walk-in folios from member rate enrollments in collections.',
        'Pause long-stay members during off-season rather than cancelling prepaid value.',
      ],
    },
  };

  return playbooks[key] || playbooks['gym-fitness'];
}

/**
 * Build hub intelligence payload from raw counters.
 * @param {object} input
 */
export function buildMembershipInsights(input) {
  const {
    stats = {},
    overdueRenewals = 0,
    paymentFailedPaused = 0,
    verticalKey = null,
    currency = 'PKR',
  } = input;

  const active = Number(stats.active_count || 0);
  const pending = Number(stats.pending_count || 0);
  const paused = Number(stats.paused_count || 0);
  const expiringSoon = Number(stats.expiring_soon || 0);

  /** @type {Array<{ id: string; severity: 'info' | 'warning' | 'critical'; title: string; detail: string; actionTab?: string }>} */
  const alerts = [];

  if (pending > 0) {
    alerts.push({
      id: 'pending_activation',
      severity: 'warning',
      title: `${pending} pending activation`,
      detail: 'Storefront or COD orders awaiting payment or hub confirmation.',
      actionTab: 'memberships',
    });
  }

  if (expiringSoon > 0) {
    alerts.push({
      id: 'expiring_soon',
      severity: expiringSoon >= 5 ? 'critical' : 'warning',
      title: `${expiringSoon} expiring within 14 days`,
      detail: 'Reach out before auto-renew invoices or grace periods lapse.',
      actionTab: 'memberships',
    });
  }

  if (overdueRenewals > 0) {
    alerts.push({
      id: 'overdue_renewals',
      severity: 'critical',
      title: `${overdueRenewals} overdue renewal invoice${overdueRenewals === 1 ? '' : 's'}`,
      detail: 'Members may be auto-paused when unpaid past the grace window.',
      actionTab: 'invoices',
    });
  }

  if (paymentFailedPaused > 0) {
    alerts.push({
      id: 'payment_failed_paused',
      severity: 'warning',
      title: `${paymentFailedPaused} paused for failed payment`,
      detail: 'Resume when the renewal invoice is collected.',
      actionTab: 'memberships',
    });
  }

  if (active > 0 && expiringSoon === 0 && overdueRenewals === 0 && pending === 0) {
    alerts.push({
      id: 'healthy_base',
      severity: 'info',
      title: `${active} active member${active === 1 ? '' : 's'}`,
      detail: `Membership base looks stable in ${currency}. Keep perks synced to inventory plans.`,
      actionTab: 'memberships',
    });
  }

  const playbook = getMembershipVerticalPlaybook(verticalKey);

  return {
    stats: { active, pending, paused, expiringSoon, overdueRenewals, paymentFailedPaused },
    alerts,
    playbook,
    healthScore: computeMembershipHealthScore({
      active,
      pending,
      expiringSoon,
      overdueRenewals,
      paymentFailedPaused,
    }),
  };
}

function computeMembershipHealthScore({ active, pending, expiringSoon, overdueRenewals, paymentFailedPaused }) {
  if (active === 0 && pending === 0) return null;
  let score = 100;
  score -= Math.min(30, overdueRenewals * 10);
  score -= Math.min(20, paymentFailedPaused * 5);
  score -= Math.min(25, expiringSoon * 3);
  score -= Math.min(15, pending * 3);
  return Math.max(0, Math.min(100, score));
}

/**
 * Format a benefit row for display.
 * @param {{ benefit_type: string; value?: Record<string, unknown> }} benefit
 */
export function formatBenefitSummary(benefit) {
  const type = benefit.benefit_type;
  const value = benefit.value || {};
  if (type === 'discount_percent') {
    const pct = Number(value.percent || 0);
    return pct > 0 ? `${pct}% off shop purchases` : 'Shop discount';
  }
  if (type === 'class_credits') {
    const credits = Number(value.credits || 0);
    return credits > 0 ? `${credits} class credits` : 'Class credits';
  }
  if (type === 'loyalty_multiplier') {
    const mult = Number(value.multiplier || value.mult || 0);
    return mult > 0 ? `${mult}x loyalty points` : 'Loyalty multiplier';
  }
  return MEMBERSHIP_BENEFIT_LABELS[type] || type;
}
