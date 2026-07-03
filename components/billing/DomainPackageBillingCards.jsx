'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Shirt,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Banknote,
  Loader2,
  Sparkles,
  Pill,
  Cog,
  CarFront,
  Sofa,
  Dumbbell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  listDomainPackages,
  mergePlanLimits,
} from '@/lib/config/domainPackages';
import { PLAN_TIERS, resolvePlanTier } from '@/lib/config/plans';
import { listDomainPackageBillableSkus } from '@/lib/payments/billingSku';
import { HUB_BODY, HUB_BODY_MUTED, HUB_CARD_TITLE, STORE_PRICE } from '@/lib/utils/typography';

const PACKAGE_ICONS = {
  'clothing-commerce': Shirt,
  'pharmacy-commerce': Pill,
  'auto-parts-commerce': Cog,
  'vehicle-showroom': CarFront,
  'furniture-commerce': Sofa,
  'fitness-commerce': Dumbbell,
};

function resolveActiveDomainPackageKey(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const key = settings.domain_package?.key;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

/**
 * Vertical commerce suite cards for Settings → Billing (Stripe + offline paths).
 */
export default function DomainPackageBillingCards({
  businessSettings,
  stripeCheckoutAvailable = false,
  devInstantBilling = false,
  busy = false,
  isRedirecting = false,
  onCheckout,
  onPayOffline,
}) {
  const packages = listDomainPackages();
  const billableByKey = useMemo(() => {
    const skus = listDomainPackageBillableSkus({ currency: 'pkr' });
    return Object.fromEntries(skus.map((sku) => [sku.key, sku]));
  }, []);
  const activeKey = resolveActiveDomainPackageKey(businessSettings);
  const showCardCheckout = stripeCheckoutAvailable || devInstantBilling;
  const cardButtonLabel = devInstantBilling && !stripeCheckoutAvailable
    ? 'Apply suite (dev)'
    : 'Pay with card';

  const disabled = busy || isRedirecting;

  if (!packages.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-700">
            Vertical commerce suites
          </p>
          <p className={`${HUB_BODY_MUTED} mt-1 max-w-2xl`}>
            Industry packages bundle the right modules, limits, and storefront defaults for your vertical.
            Includes a recommended plan tier plus custom module access where noted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {packages.map((pkg) => {
          const Icon = PACKAGE_ICONS[pkg.key] || Sparkles;
          const isActive = activeKey === pkg.key;
          const billable = billableByKey[pkg.key];
          const displayPricePkr = billable?.pricePkr ?? pkg.pricing?.price_pkr;
          const limits = mergePlanLimits(pkg.recommendedPlanTier, pkg.limitOverrides);
          const tierLabel = PLAN_TIERS[resolvePlanTier(pkg.recommendedPlanTier)]?.name || pkg.recommendedPlanTier;
          const highlights = (pkg.moduleGroups || []).slice(0, 3).map((m) => m.title);

          return (
            <div
              key={pkg.key}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                isActive
                  ? 'border-violet-400 bg-gradient-to-br from-violet-50/90 to-white ring-1 ring-violet-200'
                  : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3 min-w-0 flex-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={HUB_CARD_TITLE}>{pkg.name}</h4>
                      {pkg.pricing?.badge ? (
                        <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                          {pkg.pricing.badge}
                        </Badge>
                      ) : null}
                      {isActive ? (
                        <Badge className="bg-violet-600 hover:bg-violet-600 text-[10px] font-semibold uppercase tracking-wide">
                          Active on this workspace
                        </Badge>
                      ) : null}
                    </div>
                    <p className={HUB_BODY_MUTED}>{pkg.tagline}</p>
                    <p className={`${STORE_PRICE} text-violet-900`}>
                      PKR {displayPricePkr?.toLocaleString()}
                      <span className="text-sm font-medium text-slate-500">/mo</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      Based on {tierLabel} · {limits.max_users === -1 ? 'Unlimited' : limits.max_users} seats ·{' '}
                      {limits.max_products === -1 ? 'Unlimited' : limits.max_products.toLocaleString()} products ·{' '}
                      {limits.max_warehouses === -1 ? 'Unlimited' : limits.max_warehouses} warehouses
                    </p>
                    {highlights.length ? (
                      <ul className="space-y-1 pt-1">
                        {highlights.map((title) => (
                          <li key={title} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-600 mt-0.5" aria-hidden />
                            {title}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(pkg.verticals || []).slice(0, 4).map((v) => (
                        <span
                          key={v}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {v.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
                  <Button
                    type="button"
                    disabled={disabled || !showCardCheckout}
                    onClick={() => onCheckout?.(pkg.key)}
                    className="w-full lg:w-[220px] font-semibold bg-violet-700 hover:bg-violet-800"
                  >
                    {disabled ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" aria-hidden />
                    )}
                    {cardButtonLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onPayOffline?.(pkg.key)}
                    className="w-full lg:w-[220px] font-semibold border-emerald-200 text-emerald-900 hover:bg-emerald-50"
                  >
                    <Banknote className="h-4 w-4 mr-2" aria-hidden />
                    Pay offline
                  </Button>
                  {pkg.marketingPath ? (
                    <Link
                      href={pkg.marketingPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-800 hover:text-violet-950 py-1"
                    >
                      View full suite details
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { resolveActiveDomainPackageKey };
