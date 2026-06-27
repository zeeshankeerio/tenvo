'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  ChefHat,
  ExternalLink,
  LayoutGrid,
  MonitorSmartphone,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getDemoStoreHeroByDomain,
  getDemoStoreHref,
} from '@/lib/marketing/demoStoreGalleryMeta';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_H2,
  MARKETING_LEAD,
  MARKETING_SECTION_LOOSE,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

const DEMO = {
  storefront: 'demo-boutique',
  pos: 'demo-supermarket',
  restaurant: 'demo-restaurant',
  orders: 'demo-pharmacy',
};

const PILLARS = [
  {
    id: 'storefront',
    icon: Store,
    eyebrow: 'Public brand store',
    title: 'Branded online storefront',
    description:
      'Launch a professional shop under your business name. Catalog, cart, checkout, and customer care pages ship on day one with regional tax and currency defaults.',
    demoDomain: DEMO.storefront,
    demoName: 'Boutique demo',
    className: 'lg:col-span-5',
    imageClassName: 'aspect-[5/4] sm:aspect-[4/3]',
  },
  {
    id: 'pos',
    icon: MonitorSmartphone,
    eyebrow: 'Retail & checkout',
    title: 'POS aligned with your back office',
    description:
      'Ring up sales, returns, and exchanges at the counter while inventory and accounts stay in sync. Built for busy shops that cannot afford end-of-day stock surprises.',
    demoDomain: DEMO.pos,
    demoName: 'Supermarket demo',
    className: 'lg:col-span-7',
    imageClassName: 'aspect-[5/4] sm:aspect-[16/10]',
  },
  {
    id: 'restaurant',
    icon: ChefHat,
    eyebrow: 'Cafés & dining',
    title: 'Hospitality-ready workflows',
    description:
      'Table service, kitchen coordination, and front-of-house selling connect to the same product and revenue picture as retail. Kitchen display on supported Business+ plans.',
    demoDomain: DEMO.restaurant,
    demoName: 'Kitchen demo',
    className: 'lg:col-span-4',
    imageClassName: 'aspect-[4/3]',
  },
  {
    id: 'orders',
    icon: Truck,
    eyebrow: 'Order hub',
    title: 'One queue for every channel',
    description:
      'Web orders, counter sales, and B2B requests flow into a single operational queue. Pack, ship, reconcile, and support customers without retyping data.',
    demoDomain: DEMO.orders,
    demoName: 'Pharmacy demo',
    className: 'lg:col-span-4',
    imageClassName: 'aspect-[4/3]',
  },
];

function CommercePillarCard({ pillar }) {
  const Icon = pillar.icon;
  const heroImage = getDemoStoreHeroByDomain(pillar.demoDomain);
  const demoHref = getDemoStoreHref(pillar.demoDomain);

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm',
        'motion-safe:transition-shadow motion-safe:duration-300 motion-safe:hover:shadow-md',
        pillar.className
      )}
    >
      <div className={cn('relative w-full overflow-hidden bg-slate-100', pillar.imageClassName)}>
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{pillar.eyebrow}</span>
          </div>
          <Link
            href={demoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-800 shadow-sm motion-safe:transition-colors hover:bg-white"
          >
            {pillar.demoName}
            <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{pillar.title}</h3>
        <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-slate-600">{pillar.description}</p>
      </div>
    </article>
  );
}

/**
 * Storefront, POS, hospitality, orders, automation: business-first copy with live demo imagery.
 */
export default function CommerceAndIntelligenceSection({ variant = 'homepage' }) {
  const isCompact = variant === 'compact';

  return (
    <section
      className={cn(
        'relative overflow-hidden border-b border-slate-200/80',
        isCompact ? 'bg-white py-14 sm:py-16' : cn(MARKETING_SECTION_LOOSE, 'bg-gradient-to-b from-white via-slate-50/80 to-white')
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,rgba(210,43,43,0.07),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(99,102,241,0.05),transparent_50%)]"
        aria-hidden
      />

      <div className={MARKETING_CONTAINER}>
        <div className={cn('relative max-w-3xl', isCompact ? 'mb-8 sm:mb-10' : 'mb-10 sm:mb-12 lg:mb-14')}>
          <p className={cn('mb-3 text-brand-primary sm:mb-4', MARKETING_EYEBROW)}>Storefront · POS · Hospitality</p>
          <h2 className={cn(MARKETING_H2, 'text-slate-900')}>
            Sell everywhere your customers are, without juggling five different systems.
          </h2>
          <p className={cn('mt-3 sm:mt-4', MARKETING_LEAD)}>
            Your online brand store, in-store checkout, and café or restaurant service share one product catalog.
            Pricing and fulfilment stay aligned when your team uses the same hub. Confirm multi-location stock rules
            with onboarding.
          </p>
          <Link
            href="/demo"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary underline-offset-2 hover:underline"
          >
            Browse live demo stores
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="relative grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-12">
          {PILLARS.map((pillar) => (
            <CommercePillarCard key={pillar.id} pillar={pillar} />
          ))}

          <article className="flex flex-col justify-between rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-indigo-50/40 p-6 shadow-sm lg:col-span-4 sm:p-7">
            <div>
              <div className="mb-3 flex items-center gap-2 text-brand-primary">
                <LayoutGrid className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Automation</span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                Guided setup and ongoing management
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                Industry presets, spreadsheet import, and sensible defaults mean less time configuring and more time
                selling. Your storefront and channels stay aligned as you grow.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200/80 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-primary">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                Auto-provisioned store
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-200/80 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Smart restock signals
              </span>
            </div>
          </article>
        </div>

        <div className="relative mt-8 flex flex-col gap-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:mt-10 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-2xl items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-white">
              <Bot className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">Roadmap</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                Agentic improvements: on the way
              </h3>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                Soon, TENVO will surface proactive suggestions across purchasing, compliance checks, and customer
                follow-ups, always under your control, with clear explanations so your team trusts every
                recommendation.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="h-12 shrink-0 rounded-xl bg-brand-primary px-6 font-semibold uppercase tracking-wider text-white hover:bg-brand-primary-dark"
          >
            <Link href="/register" className="inline-flex items-center gap-2">
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <p className="relative mt-6 text-center text-xs font-semibold text-slate-500">
          <Link
            href="/solutions/marketing-crm"
            className="font-semibold text-brand-primary underline-offset-2 hover:underline"
          >
            Campaigns, loyalty and analytics
          </Link>{' '}
          use the same customer and order data as this stack.
        </p>
      </div>
    </section>
  );
}
