'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Plug,
  CreditCard,
  Mail,
  ShieldCheck,
  MessageSquare,
  ShoppingCart,
  Store,
  Globe,
  Building2,
  Code2,
} from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MARKETING_CONTAINER, MARKETING_SECTION_LOOSE } from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';
import Hero from '@/components/marketing/sections/Hero';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import {
  INTEGRATIONS_CATALOG,
  CAPABILITY_STATUS_LABEL,
  CAPABILITY_STATUS_STYLE,
  MARKETING_DISCLAIMERS,
} from '@/lib/marketing/capabilities';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';

const ICON_BY_NAME = {
  Stripe: CreditCard,
  NOWPayments: CreditCard,
  Resend: Mail,
  'Pakistani tax configuration': ShieldCheck,
  'JazzCash & EasyPaisa': CreditCard,
  WhatsApp: MessageSquare,
  Shopify: ShoppingCart,
  Daraz: Store,
  WooCommerce: Globe,
  'REST API & webhooks': Code2,
  'Bank feeds': Building2,
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const primaryHref = user ? '/multi-business' : '/register';
  const primaryText = user ? 'GO TO DASHBOARD' : 'START FREE TRIAL';

  const shipped = INTEGRATIONS_CATALOG.filter((i) => i.status === 'shipped');
  const partial = INTEGRATIONS_CATALOG.filter((i) => i.status === 'partial');
  const roadmap = INTEGRATIONS_CATALOG.filter((i) => i.status === 'roadmap');

  return (
    <MarketingLayout transparentNav={false}>
      <Hero
        variant="centered"
        badge={{ text: 'Honest integration map', icon: 'Plug' }}
        title={
          <>
            What connects to TENVO <span className="text-brand-primary">today</span>
          </>
        }
        subtitle="We label each integration Available, Partial, or Roadmap so your team knows what ships in the product versus what requires configuration or is still in development."
      />

      <section className={cn(MARKETING_SECTION_LOOSE, 'border-b border-neutral-200/80 bg-white')}>
        <div className={MARKETING_CONTAINER}>
          <p className="mx-auto max-w-3xl text-center text-sm font-medium leading-relaxed text-neutral-600">
            {MARKETING_DISCLAIMERS.fbr} Prefer TENVO&apos;s built-in storefront and POS when external marketplace connectors are on the roadmap.
          </p>
        </div>
      </section>

      <IntegrationSection title="Available now" items={shipped} />
      <IntegrationSection title="Partial - configure or scope with us" items={partial} muted />
      <IntegrationSection title="Roadmap" items={roadmap} muted />

      <section className={cn(MARKETING_SECTION_LOOSE, 'border-b border-neutral-200/80 bg-white')}>
        <div className={`${MARKETING_CONTAINER} max-w-5xl`}>
          <div className="relative space-y-5 overflow-hidden rounded-2xl bg-neutral-900 p-6 text-center shadow-2xl sm:space-y-6 sm:rounded-[3rem] sm:p-10 lg:p-16">
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary opacity-20 blur-[100px]" />
            <div className="relative z-10 space-y-6">
              <Zap className="mx-auto h-12 w-12 text-amber-400" />
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Need a custom integration?</h2>
              <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 sm:text-base">
                Business+ includes API access and webhook flags in the product. Talk to sales for bespoke connectors, legacy ERP bridges, or pilot marketplace sync.
              </p>
              <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 rounded-xl border-none bg-brand-primary px-8 text-base font-semibold uppercase tracking-[0.15em] text-white shadow-md transition-all hover:bg-brand-primary-dark">
                  <Link href={primaryHref}>{primaryText}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-2 border-neutral-700 bg-transparent px-8 text-base font-semibold uppercase tracking-[0.15em] text-white transition-all hover:bg-neutral-800 hover:text-white">
                  <MarketingCtaLink href={getBookMeetingHref()}>Talk to sales</MarketingCtaLink>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

function IntegrationSection({ title, items, muted = false }) {
  if (!items.length) return null;

  return (
    <section className={cn(MARKETING_SECTION_LOOSE, muted ? 'bg-neutral-50' : 'bg-white')}>
      <div className={MARKETING_CONTAINER}>
        <h2 className="mb-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-primary sm:mb-8">{title}</h2>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {items.map((integration) => {
            const Icon = ICON_BY_NAME[integration.name] || Plug;
            return (
              <article
                key={integration.name}
                className="group flex h-full flex-col rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all duration-300 hover:border-brand-primary hover:shadow-xl sm:rounded-3xl sm:p-6 lg:p-8"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
                    <Icon className="h-7 w-7 text-brand-primary" />
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider',
                      CAPABILITY_STATUS_STYLE[integration.status]
                    )}
                  >
                    {CAPABILITY_STATUS_LABEL[integration.status]}
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">{integration.category}</p>
                    <h3 className="text-2xl font-semibold text-neutral-900">{integration.name}</h3>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-neutral-600">{integration.description}</p>
                </div>
                <ul className="mt-8 space-y-3 border-t border-neutral-100 pt-6">
                  {integration.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-primary" />
                      <span className="text-sm font-semibold text-neutral-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
