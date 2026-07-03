/** Benefit types stored in `membership_benefits.benefit_type`. */
export const MEMBERSHIP_BENEFIT_TYPE = Object.freeze({
  DISCOUNT_PERCENT: 'discount_percent',
  CLASS_CREDITS: 'class_credits',
  LOYALTY_MULTIPLIER: 'loyalty_multiplier',
});

/**
 * Derive plan benefits from product / plan domain rules (fitness seed uses supplement copy in description).
 * @param {Record<string, unknown> | null | undefined} domainRules
 */
export function extractBenefitsFromDomainRules(domainRules) {
  const dd = domainRules && typeof domainRules === 'object' ? domainRules : {};
  /** @type {Array<{ benefit_type: string; value: Record<string, unknown> }>} */
  const benefits = [];

  const rawPct =
    dd.supplement_discount ??
    dd.supplementDiscount ??
    dd.member_discount ??
    dd.memberDiscount ??
    dd.discount_percent ??
    dd.discountPercent;

  const pct = Number(rawPct);
  if (Number.isFinite(pct) && pct > 0) {
    benefits.push({
      benefit_type: MEMBERSHIP_BENEFIT_TYPE.DISCOUNT_PERCENT,
      value: {
        percent: Math.min(pct, 100),
        scope: 'shop',
        label: 'Member shop discount',
      },
    });
  }

  const credits = Number(dd.class_credits ?? dd.classCredits);
  if (Number.isFinite(credits) && credits > 0) {
    benefits.push({
      benefit_type: MEMBERSHIP_BENEFIT_TYPE.CLASS_CREDITS,
      value: { credits, label: 'Class / session credits' },
    });
  }

  return benefits;
}
