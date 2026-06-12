'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Headphones,
  Landmark,
} from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import {
  PLAN_TIERS,
  FEATURE_LABELS,
  PRICING_PAGE_MARKETING_FEATURE_ORDER,
  getPlanListPrice,
  getOrderedPlanTierKeys,
} from '@/lib/config/plans';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const TIER_KEYS = getOrderedPlanTierKeys();

/** Limit lines + every enabled feature in `PRICING_PAGE_MARKETING_FEATURE_ORDER` (aligned with PLAN_TIERS). */
function marketingBulletsForTier(tierKey) {
  const t = PLAN_TIERS[tierKey];
  if (!t) return [];
  const L = t.limits;
  const userLine =
    L.max_users === -1
      ? 'Unlimited user seats'
      : `${L.max_users} user seat${L.max_users === 1 ? '' : 's'}`;
  const base = [
    userLine,
    `${L.max_products === -1 ? 'Unlimited' : L.max_products.toLocaleString()} products`,
    `${L.max_warehouses === -1 ? 'Unlimited' : L.max_warehouses} warehouse location${L.max_warehouses === 1 ? '' : 's'}`,
    `${L.max_invoices_per_month === -1 ? 'Unlimited' : L.max_invoices_per_month} invoices per month`,
  ];
  const extras = PRICING_PAGE_MARKETING_FEATURE_ORDER.filter((k) => t.features[k])
    .map((k) => FEATURE_LABELS[k])
    .filter(Boolean);
  return [...base, ...extras];
}

const MATRIX_FEATURES = [
  { label: 'Point of Sale', key: 'pos' },
  { label: 'Restaurant POS', key: 'restaurant_pos' },
  { label: 'Multi-warehouse', key: 'multi_warehouse' },
  { label: 'Batch & serial tracking', key: 'batch_tracking' },
  { label: 'Manufacturing / BOM', key: 'manufacturing' },
  { label: 'Tax / GST compliance', key: 'tax_compliance' },
  { label: 'Fiscal periods', key: 'fiscal_periods' },
  { label: 'Multi-currency & FX', key: 'exchange_rates' },
  { label: 'Loyalty & promotions (CRM)', key: 'loyalty_programs' },
  { label: 'Campaigns & marketing', key: 'campaigns' },
  { label: 'Payroll & HR', key: 'payroll' },
  { label: 'Advanced reports', key: 'advanced_reports' },
  { label: 'AI Analytics', key: 'ai_analytics' },
  { label: 'Approval workflows', key: 'approval_workflows' },
  { label: 'Audit trail', key: 'audit_logs' },
  { label: 'API access', key: 'api_access' },
];

function tierCtaHref({ user, tierKey }) {
  if (tierKey === 'enterprise') {
    return '/demo?source=pricing&planTier=enterprise';
  }
  if (tierKey === 'free') {
    return user ? '/multi-business' : '/register';
  }
  if (user) {
    const q = new URLSearchParams({ topic: 'subscription', planTier: tierKey });
    return `/contact?${q.toString()}`;
  }
  const q = new URLSearchParams({ planTier: tierKey });
  return `/register?${q.toString()}`;
}

function tierCtaLabel(tierKey) {
  if (tierKey === 'free') return 'Get started';
  if (tierKey === 'enterprise') return 'Book demo';
  return 'Choose plan';
}

export default function PricingPage() {
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState('yearly');
  const [currency, setCurrency] = useState('pkr');
  const [showComparison, setShowComparison] = useState(false);
  const [employees, setEmployees] = useState(3);
  const [monthlyOrders, setMonthlyOrders] = useState(1500);
  const [fbrAuditRisk, setFbrAuditRisk] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const getRoiMultiplier = () => {
    switch (currency) {
      case 'usd':
        return { wage: 8, leakage: 0.6, compliance: 250 };
      default:
        return { wage: 500, leakage: 120, compliance: 50000 };
    }
  };

  const mult = getRoiMultiplier();
  const estimatedHoursSaved = employees * 12;
  const operationalSavings = estimatedHoursSaved * mult.wage;
  const leakSavings = Math.round(monthlyOrders * mult.leakage * 0.15);
  const complianceRiskAvoidance = fbrAuditRisk ? mult.compliance : 0;
  const totalMonthlyROI = operationalSavings + leakSavings + complianceRiskAvoidance;

  const faqs = useMemo(
    () => [
      {
        q: 'Can we pay locally in Pakistan (PKR) or by bank transfer?',
        a: 'Yes. You can subscribe with Stripe when cards are enabled, or pay by bank transfer / local rails. For offline payment, book a demo or contact sales—we activate your plan and record the payment on your account (see Billing FAQ below).',
      },
      {
        q: 'How do demo, manual billing, and Stripe work together?',
        a: 'Self-serve: workspace owners use Settings → Billing with Stripe Checkout when price IDs are configured. Sales-assisted: book a demo, agree on a plan, pay offline—we apply the tier in Platform Admin and record the payment in subscription history (manual_payment_active). Development: BILLING_MODE=manual skips Stripe for testing.',
      },
      {
        q: 'What happens if we exceed plan limits?',
        a: 'We do not hard-stop your live operations on the first overage. You will see upgrade prompts; you can move to the next tier via checkout or contact us for a tailored allowance.',
      },
      {
        q: 'Is there a migration or setup fee?',
        a: 'Standard onboarding and imports are included for annual Professional+ where stated in your order. Enterprise scope is agreed in writing.',
      },
    ],
    []
  );

  return (
    <MarketingLayout transparentNav={false}>
      <section className="bg-white py-16 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-brand-primary">
            <ShieldCheck className="h-4 w-4" />
            Plans aligned with the product
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-tight max-w-4xl mx-auto">
            Same packages everywhere — <br className="hidden sm:inline" />
            register, billing, and checkout.
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-neutral-500 font-medium leading-relaxed">
            Prices and limits come directly from <strong className="text-neutral-800">PLAN_TIERS</strong> (Free, Starter,
            Professional, Business, Enterprise). Pay online with Stripe, offline by agreement, or start with a demo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <div className="bg-neutral-100 border border-neutral-200 p-1 rounded-2xl flex items-center shadow-sm">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all',
                  billingInterval === 'monthly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5',
                  billingInterval === 'yearly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                )}
              >
                Yearly
                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-normal">
                  −15%
                </span>
              </button>
            </div>

            <div className="bg-neutral-100 border border-neutral-200 p-1.5 rounded-2xl flex items-center gap-2.5 shadow-sm">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 pl-3">Show prices in</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white border border-neutral-200 rounded-xl h-9 px-3 text-xs font-bold uppercase tracking-wider text-neutral-800 focus:border-brand-primary focus:outline-none transition-all cursor-pointer"
              >
                <option value="pkr">PKR</option>
                <option value="usd">USD</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Payment rails — Stripe, offline, demo + manual admin */}
      <section className="bg-neutral-50 py-12 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <p className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-8">
            How you can pay
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <CreditCard className="w-8 h-8 text-brand-primary mb-3" />
              <h3 className="font-black text-neutral-900 text-sm uppercase tracking-wide mb-2">Stripe Checkout</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Cards and wallets where Stripe is configured. After checkout, your workspace tier updates automatically
                via webhooks.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <Landmark className="w-8 h-8 text-brand-primary mb-3" />
              <h3 className="font-black text-neutral-900 text-sm uppercase tracking-wide mb-2">Bank / local transfer</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                We can invoice you in PKR or USD. Once funds are confirmed, our team records the subscription payment
                against your business (same entitlement as Stripe).
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <Headphones className="w-8 h-8 text-brand-primary mb-3" />
              <h3 className="font-black text-neutral-900 text-sm uppercase tracking-wide mb-2">Demo → manual activate</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                Book a demo, agree on a package, then we enable your plan and log the payment in Platform Admin (
                <code className="text-[10px] bg-neutral-100 px-1 rounded">recordManualSubscriptionPayment</code>
                ).
              </p>
              <Link href="/demo?source=pricing" className="text-xs font-black text-brand-primary hover:underline">
                Book a demo →
              </Link>
            </div>
          </div>
          <p className="text-center text-[10px] text-neutral-400 mt-8 max-w-2xl mx-auto">
            Logged-in owners can also use <strong>Settings → Billing</strong> in the business hub when Stripe price IDs
            are set. See <code className="text-[10px] bg-neutral-100 px-1 rounded">docs/SUBSCRIPTION_BILLING_FLOW.md</code>{' '}
            and <code className="text-[10px] bg-neutral-100 px-1 rounded">docs/PAYMENTS_ENV_AND_SETUP.md</code>.
          </p>
        </div>
      </section>

      <section className="bg-neutral-50 py-16 lg:py-24 border-b border-neutral-200/80">
        {/* Wider than max-w-7xl so five columns stay one row from lg (1024px) without wrapping */}
        <div className="w-full max-w-[min(100%,92rem)] mx-auto px-4 sm:px-5 lg:px-8 xl:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-stretch gap-3 sm:gap-4">
            {TIER_KEYS.map((tierKey) => {
              const tier = PLAN_TIERS[tierKey];
              const prices = getPlanListPrice(tierKey, { interval: billingInterval });
              const isPopular = tierKey === 'professional';
              const href = tierCtaHref({ user, tierKey });
              const ctaLabel = tierCtaLabel(tierKey);

              return (
                <div
                  key={tierKey}
                  className={cn(
                    'relative min-w-0 rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-4 xl:p-5 flex flex-col h-full border bg-white shadow-sm transition-colors',
                    isPopular
                      ? 'border-2 border-brand-primary ring-2 ring-brand-primary/20 z-10'
                      : 'border-neutral-200/80 hover:border-neutral-300'
                  )}
                >
                  <div className="h-6 shrink-0 flex justify-center mb-1" aria-hidden={!isPopular}>
                    {isPopular ? (
                      <div className="bg-gradient-to-r from-brand-primary to-brand-primary-dark text-white font-bold text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
                        Most popular
                      </div>
                    ) : (
                      <span className="block h-6 w-px opacity-0 pointer-events-none" aria-hidden />
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-h-0 gap-3">
                    <div className="space-y-3 shrink-0">
                      <div className="min-w-0">
                        <h4 className="font-bold text-neutral-900 text-[11px] uppercase tracking-wide">
                          {tier.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 font-medium mt-1 leading-snug hyphens-auto">
                          {tier.tagline}
                        </p>
                      </div>
                      <div className="py-2 border-b border-neutral-100 min-w-0">
                        {tierKey === 'free' ? (
                          <>
                            <span className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight tabular-nums">
                              {currency === 'pkr' ? formatCurrency(0, 'PKR') : formatCurrency(0, 'USD')}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide block mt-1">
                              Forever free
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-black text-neutral-900 block leading-tight tracking-tight tabular-nums break-words">
                              {currency === 'pkr'
                                ? formatCurrency(prices.pkr, 'PKR')
                                : formatCurrency(prices.usd, 'USD')}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide block mt-1">
                              / month{billingInterval === 'yearly' ? ' (billed annually, −15%)' : ''}
                            </span>
                            <span className="text-[10px] text-neutral-500 block mt-1 tabular-nums">
                              {currency === 'pkr'
                                ? `≈ ${formatCurrency(prices.usd, 'USD')} USD`
                                : `≈ ${formatCurrency(prices.pkr, 'PKR')} PKR`}
                            </span>
                            {tierKey === 'enterprise' && (
                              <span className="text-[10px] text-amber-800 font-semibold block mt-2 leading-snug">
                                Volume, SLA, and white-label — final quote after scoping.
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2 pt-0.5 flex-1 min-h-[1rem] min-w-0" role="list">
                      {marketingBulletsForTier(tierKey).map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[10px] lg:text-[11px] text-neutral-600 font-medium leading-snug"
                        >
                          <Check
                            className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-brand-primary flex-shrink-0 mt-0.5"
                            aria-hidden
                          />
                          <span className="min-w-0">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 mt-auto shrink-0 w-full">
                    <Button
                      asChild
                      className={cn(
                        'w-full font-bold rounded-lg lg:rounded-xl min-h-10 lg:min-h-11 h-auto py-2 text-[10px] lg:text-[11px] uppercase tracking-wide whitespace-normal leading-tight px-2',
                        isPopular
                          ? 'bg-brand-primary hover:bg-brand-primary-dark text-white'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                      )}
                    >
                      <Link
                        href={href}
                        className="flex items-center justify-center gap-1.5 text-center"
                        aria-label={tierKey === 'enterprise' ? 'Book enterprise demo' : `${ctaLabel} — ${tier.name}`}
                      >
                        {ctaLabel}
                        {tierKey !== 'free' && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-neutral-50 border-2 border-neutral-200/90 rounded-[2.5rem] p-8 sm:p-12 shadow-sm space-y-10">
            <div className="text-center space-y-3">
              <h3 className="text-2xl sm:text-3xl font-black text-neutral-900">Estimate operational ROI</h3>
              <p className="text-sm text-neutral-500 font-semibold">Illustrative savings from automation and fewer errors.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Staff on ops / billing</label>
                    <span className="text-xs font-bold text-neutral-800">{employees}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={employees}
                    onChange={(e) => setEmployees(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Orders / month</label>
                    <span className="text-xs font-bold text-neutral-800">{monthlyOrders.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="20000"
                    step="500"
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-700 block">Compliance risk factor</label>
                    <span className="text-[10px] text-neutral-400 font-semibold">Include estimated filing / audit risk reduction</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFbrAuditRisk(!fbrAuditRisk)}
                    className={cn('w-12 h-6 rounded-full p-1 transition-all', fbrAuditRisk ? 'bg-brand-primary' : 'bg-neutral-300')}
                  >
                    <div
                      className={cn(
                        'bg-white w-4 h-4 rounded-full shadow-md transition-all',
                        fbrAuditRisk ? 'translate-x-6' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center space-y-4 shadow-sm flex flex-col justify-center">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Monthly savings estimate</p>
                <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                {formatCurrency(totalMonthlyROI, 'PKR')}
              </div>
              <p className="text-[10px] text-neutral-400">Estimate shown in PKR (illustrative).</p>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-semibold">
                  Based on time saved, partial leakage recovery, and optional compliance factor. Not a guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900">Feature matrix by tier</h3>
            <p className="text-sm text-neutral-500 font-semibold">Same capability flags used inside the app.</p>
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="px-6 py-3 bg-white border border-neutral-200 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-800 hover:border-brand-primary inline-flex items-center gap-2 shadow-sm transition-all"
            >
              {showComparison ? 'Hide matrix' : 'Show matrix'}
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-300', showComparison && 'rotate-180')} />
            </button>
          </div>

          {showComparison && (
            <div className="bg-white border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-neutral-100 font-black text-[9px] uppercase tracking-wider text-neutral-400">
                    <th className="p-3 w-[28%]">Capability</th>
                    {TIER_KEYS.map((k) => (
                      <th key={k} className={cn('p-3 text-center', k === 'professional' && 'text-brand-primary')}>
                        {PLAN_TIERS[k]?.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_FEATURES.map((row) => (
                    <tr key={row.key} className="border-b border-neutral-50 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                      <td className="p-3 font-semibold text-neutral-800">{row.label}</td>
                      {TIER_KEYS.map((k) => {
                        const on = !!PLAN_TIERS[k]?.features[row.key];
                        return (
                          <td key={k} className={cn('p-3 text-center', k === 'professional' && 'text-brand-primary font-bold')}>
                            {on ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300 font-black">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Billing & payments FAQ</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">Common questions</h3>
          </div>
          <div className="space-y-4">
            {faqs.map((item, index) => (
              <div key={item.q} className="bg-neutral-50 border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-black text-neutral-800 text-sm sm:text-base pr-4">{item.q}</span>
                  <ChevronDown className={cn('w-5 h-5 text-neutral-400 flex-shrink-0 transition-transform', expandedFaq === index && 'rotate-180')} />
                </button>
                {expandedFaq === index && (
                  <div className="p-6 pt-0 border-t border-neutral-200">
                    <p className="text-xs text-neutral-500 leading-relaxed font-semibold">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="bg-white border border-neutral-200/80 rounded-[3rem] p-8 sm:p-12 lg:p-16 text-center space-y-6 relative overflow-hidden shadow-sm">
            <Building2 className="w-10 h-10 text-brand-primary mx-auto" />
            <h3 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight max-w-4xl mx-auto">Ready when you are</h3>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
              Create a workspace, or talk to us first—we will match you to the right tier and payment method.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 text-base font-black uppercase tracking-[0.12em] shadow-md">
                <Link href={user ? '/multi-business' : '/register'}>Start free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-neutral-300 bg-white px-8 text-base font-black uppercase tracking-[0.12em]">
                <Link href="/demo?source=pricing-footer">Book demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-neutral-300 bg-white px-8 text-base font-black uppercase tracking-[0.12em]">
                <Link href="/contact?topic=subscription">Contact sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
