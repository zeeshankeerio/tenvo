import { resolvePlanTier } from '@/lib/config/plans';
import { isPosRelevant, isHospitality, isCampaignRelevant } from '@/lib/config/domains';

/**
 * Domain-aware upgrade gap suggestions. Returns the higher-tier modules that
 * are relevant to the business domain but not yet unlocked on the current plan.
 */
export function getDomainGapSuggestions({ category, planTier, domainKnowledge }) {
  const suggestions = [];
  const resolved = resolvePlanTier(planTier);
  const posRelevant = isPosRelevant(category, domainKnowledge);
  const hospitality = isHospitality(category);
  const campaignRelevant = isCampaignRelevant(category, domainKnowledge);
  const manufacturingRelevant = domainKnowledge?.manufacturingEnabled;

  if (posRelevant && resolved === 'free') {
    suggestions.push({
      key: 'pos-starter',
      title: 'POS requires Starter',
      message: 'Upgrade to Starter to enable Point of Sale and Refunds & Returns.',
      requiredPlan: 'starter',
    });
  }

  if (hospitality && (resolved === 'free' || resolved === 'starter')) {
    suggestions.push({
      key: 'hospitality-business',
      title: 'Hospitality Suite',
      message: 'Move to Business plan for restaurant workflows, campaigns, and automation.',
      requiredPlan: 'business',
    });
  }

  if (manufacturingRelevant && (resolved === 'free' || resolved === 'starter')) {
    suggestions.push({
      key: 'manufacturing-professional',
      title: 'Manufacturing requires Professional',
      message: 'Upgrade to Professional for BOM, production orders, and manufacturing analytics.',
      requiredPlan: 'professional',
    });
  }

  if (campaignRelevant && (resolved === 'free' || resolved === 'starter')) {
    suggestions.push({
      key: 'campaigns-professional',
      title: 'Campaigns & Marketing requires Professional',
      message: 'Upgrade to Professional to run campaigns, promotions, and CRM automations.',
      requiredPlan: 'professional',
    });
  }

  return suggestions;
}

/**
 * Compute a single, professional upgrade nudge to surface as a bottom banner.
 *
 * Rules:
 *  - Platform owners never see a nudge.
 *  - Enterprise (top tier) never sees a nudge.
 *  - Trial users get a trial-expiry nudge.
 *  - Free users get a "get started with a paid plan" nudge (domain aware).
 *  - Paid (starter/professional/business) users only get a nudge when there is
 *    a genuinely higher-tier module relevant to their domain.
 *
 * @returns {null | { tone: 'trial'|'upgrade', title: string, message: string, ctaLabel: string }}
 */
export function buildUpgradeNudge({
  isPlatformOwner = false,
  rawPlanTier = 'free',
  isOnTrial = false,
  trialDaysRemaining = 0,
  category,
  domainKnowledge,
}) {
  if (isPlatformOwner) return null;

  const resolved = resolvePlanTier(rawPlanTier);
  if (resolved === 'enterprise') return null;

  const gaps = getDomainGapSuggestions({ category, planTier: rawPlanTier, domainKnowledge });
  const topGap = gaps[0] || null;

  if (isOnTrial) {
    const days = Math.max(0, Number(trialDaysRemaining) || 0);
    return {
      tone: 'trial',
      title: days > 0 ? `Trial — ${days} day${days === 1 ? '' : 's'} left` : 'Your trial is ending',
      message: topGap
        ? topGap.message
        : 'Upgrade to keep your premium modules once the trial ends.',
      ctaLabel: 'Upgrade now',
    };
  }

  if (resolved === 'free') {
    return {
      tone: 'upgrade',
      title: 'Unlock more with a paid plan',
      message: topGap
        ? topGap.message
        : 'Get POS, expenses, CRM and advanced reports with Starter.',
      ctaLabel: 'See plans',
    };
  }

  // Paid but not enterprise: only nudge when a relevant higher-tier module exists.
  if (topGap) {
    return {
      tone: 'upgrade',
      title: topGap.title,
      message: topGap.message,
      ctaLabel: 'Review upgrade',
    };
  }

  return null;
}
