/**
 * Pricing Data
 * Pricing tiers and calculations
 */

import { getBookMeetingHref } from '@/lib/marketing/salesLinks';

export const pricingTiers = [
  {
    id: "starter",
    name: "Starter",
    price: {
      amount: 0,
      currency: "PKR",
      period: "month"
    },
    features: [
      "Up to 100 products",
      "1 user account",
      "Basic inventory tracking",
      "Email support",
      "Mobile app access",
      "Basic reports"
    ],
    ctaText: "Start Free",
    ctaHref: "/register?plan=starter",
    highlighted: false,
    popular: false
  },
  {
    id: "professional",
    name: "Professional",
    price: {
      amount: 4999,
      currency: "PKR",
      period: "month"
    },
    annualPrice: {
      amount: 47990,  // 20% discount
      currency: "PKR",
      period: "year"
    },
    features: [
      "Unlimited products",
      "5 user accounts",
      "Multi-warehouse support",
      "FBR compliance automation",
      "Priority support",
      "Advanced analytics",
      "API access",
      "Custom reports",
      "Urdu language support",
      "JazzCash/EasyPaisa integration"
    ],
    ctaText: "Start 14-Day Trial",
    ctaHref: "/register?plan=professional",
    highlighted: true,
    popular: true,
    badge: "Most Popular"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: {
      amount: null,  // Custom pricing
      currency: "PKR",
      period: "month"
    },
    features: [
      "Everything in Professional",
      "Unlimited users",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone support",
      "SLA guarantee",
      "On-premise deployment option",
      "Custom training",
      "White-label options",
      "Advanced security features"
    ],
    ctaText: "Book a meeting",
    ctaHref: getBookMeetingHref(),
    highlighted: false,
    popular: false
  }
];

/**
 * Get pricing tier by ID
 * @param {string} id - Tier ID
 * @returns {Object|undefined} Pricing tier
 */
export function getPricingTier(id) {
  return pricingTiers.find(tier => tier.id === id);
}

/**
 * Calculate annual savings
 * @param {number} monthlyAmount - Monthly price
 * @returns {number} Annual savings amount
 */
export function calculateAnnualSavings(monthlyAmount) {
  const annualMonthly = monthlyAmount * 12;
  const annualDiscounted = annualMonthly * 0.8;  // 20% discount
  return annualMonthly - annualDiscounted;
}

/**
 * Format price for display
 * @param {number|null} amount - Price amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted price
 */
export function formatPrice(amount, currency = 'PKR') {
  if (amount === null) {
    return 'Custom Pricing';
  }
  
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get annual price with discount
 * @param {number} monthlyAmount - Monthly price
 * @param {number} discountPercent - Discount percentage (default 20)
 * @returns {number} Annual price with discount
 */
export function getAnnualPrice(monthlyAmount, discountPercent = 20) {
  const annualMonthly = monthlyAmount * 12;
  return annualMonthly * (1 - discountPercent / 100);
}
