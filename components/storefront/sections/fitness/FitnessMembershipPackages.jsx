'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Calendar, ExternalLink, ShoppingBag, Sparkles,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { formatCurrency } from '@/lib/currency';
import { useCart } from '@/lib/hooks/storefront/useCart';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { cn } from '@/lib/utils';
import { normalizeProseCopy } from '@/lib/utils/copyTypography';
import {
  FITNESS_ASSETS,
  GYM_MEMBERSHIP_GENDERS,
  resolveGymMembershipPackages,
  resolveFitnessMembershipsCategoryHref,
  resolveFitnessMembershipSectionCopy,
} from '@/lib/storefront/fitnessStorefront';
import { isStorefrontProductUuid } from '@/lib/utils/storefrontProductRef';
import { toast } from 'react-hot-toast';
import { FitnessMarqueeRow } from '@/components/storefront/sections/fitness/FitnessMarqueeRow';

function MembershipPackageCard({ pkg, gender, currency, accent, addingId, onAddToCart }) {
  const isLadies = gender === 'female';

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border p-4 sm:p-5',
        pkg.featured
          ? 'border-rose-500/45 bg-gradient-to-b from-rose-950/45 to-zinc-950/80 shadow-[0_0_32px_rgba(225,29,72,0.14)]'
          : isLadies
            ? 'border-rose-400/20 bg-gradient-to-b from-zinc-950/90 to-black'
            : 'border-white/10 bg-white/[0.03]'
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2">
        {isLadies ? (
          <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-200">
            Ladies section
          </span>
        ) : null}
        {pkg.savings > 0 ? (
          <span
            className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: accent }}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Save {pkg.savings}%
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400/90">
            {pkg.durationLabel}
          </span>
        )}
        {pkg.featured ? (
          <span className="ml-auto rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-200">
            Best value
          </span>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-white sm:text-lg">
          {pkg.durationLabel} pass
        </h3>
        <div className="shrink-0 text-right">
          <span className="block text-xl font-semibold tabular-nums text-white sm:text-[1.65rem]">
            {formatCurrency(pkg.price, currency, { maximumFractionDigits: 0 })}
          </span>
          {pkg.comparePrice && pkg.comparePrice > pkg.price ? (
            <span className="text-xs tabular-nums text-white/40 line-through sm:text-sm">
              {formatCurrency(pkg.comparePrice, currency, { maximumFractionDigits: 0 })}
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-2.5 flex-1 text-xs leading-relaxed text-white/55 line-clamp-3 sm:mt-3 sm:text-sm sm:line-clamp-none">
        {normalizeProseCopy(pkg.description)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-col sm:gap-2">
        <button
          type="button"
          onClick={() => onAddToCart(pkg)}
          disabled={addingId === pkg.id}
          className={cn(
            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold text-white transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 sm:gap-2 sm:px-3 sm:text-sm',
            pkg.featured ? 'shadow-md shadow-rose-950/30' : ''
          )}
          style={{
            background: pkg.featured
              ? `linear-gradient(135deg, ${accent} 0%, #9f1239 100%)`
              : 'rgba(255,255,255,0.12)',
          }}
        >
          <ShoppingBag className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
          <span className="truncate">{addingId === pkg.id ? 'Adding…' : 'Add to cart'}</span>
        </button>
        <a
          href={pkg.bookHref}
          target={pkg.bookExternal ? '_blank' : undefined}
          rel={pkg.bookExternal ? 'noopener noreferrer' : undefined}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-2 py-2.5 text-xs font-semibold text-white/90 transition hover:border-rose-500/40 hover:bg-white/[0.04] hover:text-white active:scale-[0.98] sm:gap-2 sm:px-3 sm:text-sm"
        >
          <Calendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
          <span className="truncate">Book tour</span>
          {pkg.bookExternal ? (
            <ExternalLink className="hidden h-3.5 w-3.5 opacity-60 sm:inline" aria-hidden />
          ) : null}
        </a>
      </div>
    </article>
  );
}

/**
 * Pakistani-style gents / ladies gym packages with duration tiers and booking CTAs.
 */
export function FitnessMembershipPackages({
  products = [],
  storeBase,
  currency = 'PKR',
  accent = '#e11d48',
  meetingUrl,
  businessDomain,
  categories = [],
  settings = {},
  country = '',
}) {
  const { addItem } = useCart();
  const { businessId } = useStorefront();
  const [gender, setGender] = useState('male');
  const [addingId, setAddingId] = useState(null);

  const sectionCopy = useMemo(
    () => resolveFitnessMembershipSectionCopy(settings, businessDomain, { country }),
    [settings, businessDomain, country]
  );

  const { byGender, trial, contactHref, productsUrl } = useMemo(
    () =>
      resolveGymMembershipPackages(products, storeBase, {
        meetingUrl,
        contactHref: `${storeBase}/contact`,
        businessDomain,
      }),
    [products, storeBase, meetingUrl, businessDomain]
  );

  const membershipsHref = resolveFitnessMembershipsCategoryHref(storeBase, categories);
  const activePackages = byGender[gender] || [];
  const alternateGender = gender === 'male' ? 'female' : 'male';
  const alternatePackages = byGender[alternateGender] || [];

  if (!byGender.male.length && !byGender.female.length && !trial) return null;

  const handleAddToCart = async (pkg) => {
    const product = pkg.product;
    if (!product?.id || product.catalog_preview || !isStorefrontProductUuid(product.id)) {
      window.location.href = pkg.productHref;
      return;
    }
    setAddingId(pkg.id);
    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        variantId: product.default_variant_id || null,
        businessId,
      });
      toast.success('Membership added to cart');
      window.dispatchEvent(new Event('toggle-cart'));
    } catch {
      toast.error('Could not add to cart');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-black pb-10 pt-8 sm:pb-14 sm:pt-16"
      id="memberships"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-zinc-900/80 to-transparent lg:h-36"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-16 top-8 hidden h-[min(52vw,420px)] w-[min(52vw,420px)] opacity-[0.18] xl:block">
        <SmartProductImage
          src={FITNESS_ASSETS.pricingAthlete}
          alt=""
          width={420}
          height={500}
          className="h-full w-full object-contain object-bottom"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl sm:mb-10 sm:mx-auto sm:text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400">
            Membership packages
          </p>
          <h2 className="mt-1.5 text-xl font-semibold text-white sm:mt-2 sm:text-3xl">
            {normalizeProseCopy(sectionCopy.title)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55 sm:mt-3 sm:text-base sm:text-white/60">
            {normalizeProseCopy(sectionCopy.subtitle)}
          </p>
        </div>

        <div className="mb-5 sm:mb-10">
          <div
            className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 sm:mx-auto sm:max-w-md lg:inline-flex lg:max-w-none"
            role="tablist"
            aria-label="Membership type"
          >
            {GYM_MEMBERSHIP_GENDERS.map((tab) => {
              const count = (byGender[tab.id] || []).length;
              const selected = gender === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`membership-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`membership-panel-${tab.id}`}
                  onClick={() => setGender(tab.id)}
                  className={cn(
                    'rounded-xl px-2.5 py-2.5 text-left transition active:scale-[0.99] sm:min-w-[148px] sm:px-4 lg:min-w-[168px]',
                    selected
                      ? 'bg-white text-black shadow-lg'
                      : 'text-white/70 hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <span className="block text-[13px] font-semibold leading-tight sm:text-sm">
                      {tab.label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                        selected ? 'bg-black/10 text-black/70' : 'bg-white/10 text-white/50'
                      )}
                    >
                      {count}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-[10px] leading-snug line-clamp-2 sm:line-clamp-none',
                      selected ? 'text-slate-500' : 'text-white/45'
                    )}
                  >
                    {tab.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`membership-panel-${gender}`}
          aria-labelledby={`membership-tab-${gender}`}
          key={gender}
          className="relative"
        >
          {activePackages.length > 0 ? (
            <>
              <FitnessMarqueeRow
                items={activePackages}
                resetKey={gender}
                reverse
                slideClassName="w-[min(86vw,300px)] sm:w-[min(88vw,320px)]"
                renderItem={(pkg) => (
                  <MembershipPackageCard
                    pkg={pkg}
                    gender={gender}
                    currency={currency}
                    accent={accent}
                    addingId={addingId}
                    onAddToCart={handleAddToCart}
                  />
                )}
              />

              <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-4 xl:gap-5">
                {activePackages.map((pkg) => (
                  <MembershipPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    gender={gender}
                    currency={currency}
                    accent={accent}
                    addingId={addingId}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
              <p className="text-sm text-white/70">
                {gender === 'female'
                  ? 'Ladies section plans are being updated.'
                  : 'Gents gym plans are being updated.'}
              </p>
              {alternatePackages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setGender(alternateGender)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-rose-500/40"
                >
                  View {alternateGender === 'female' ? 'ladies' : 'gents'} plans
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:pt-8">
          {trial ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
              <div className="flex items-center gap-3 sm:gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-14 sm:w-14">
                  <SmartProductImage
                    src={trial.image_url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{trial.name}</p>
                  <p className="text-xs text-white/50">
                    {formatCurrency(Number(trial.price), currency, { maximumFractionDigits: 0 })}{' '}
                    · try before you commit
                  </p>
                </div>
              </div>
              <Link
                href={
                  trial.slug
                    ? `${storeBase}/products/${trial.slug}`
                    : `${productsUrl}?search=${encodeURIComponent(String(trial.name || 'Rookie'))}`
                }
                className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-rose-500/50 active:scale-[0.98] sm:w-auto sm:rounded-full"
              >
                Get trial pass <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-center text-xs text-white/45 sm:text-left">
              Book a tour or chat with front desk for student and corporate rates.
            </p>
          )}

          <Link
            href={membershipsHref}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 self-center rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-rose-500/40 active:scale-[0.98] sm:w-auto sm:self-auto sm:rounded-full"
          >
            View all plans <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FitnessMembershipPackages;
