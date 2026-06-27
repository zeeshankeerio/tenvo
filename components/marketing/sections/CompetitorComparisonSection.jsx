'use client';

import Link from 'next/link';
import { Check, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MARKETING_CONTAINER, MARKETING_SECTION_LOOSE } from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

const rows = [
  {
    label: 'One subscription for store, POS, inventory & finance',
    shopify: 'partial',
    zoho: 'yes',
    tenvo: 'yes',
  },
  {
    label: 'Pakistan tax & regulatory workflows built-in',
    shopify: 'no',
    zoho: 'partial',
    tenvo: 'yes',
  },
  {
    label: 'Deep warehouse, batches & manufacturing context',
    shopify: 'no',
    zoho: 'partial',
    tenvo: 'yes',
  },
  {
    label: 'Branded customer storefront under your business',
    shopify: 'yes',
    zoho: 'partial',
    tenvo: 'yes',
  },
  {
    label: 'Excel-friendly bulk onboarding for real catalogs',
    shopify: 'partial',
    zoho: 'partial',
    tenvo: 'yes',
  },
  {
    label: 'Local payments & logistics partners in the flow',
    shopify: 'partial',
    zoho: 'partial',
    tenvo: 'yes',
  },
];

function ValueBadge({ value, compact = false }) {
  const size = compact ? 'h-8 w-8' : 'h-9 w-9';
  if (value === 'yes') {
    return (
      <span className={cn('inline-flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600', size)}>
        <Check className="w-4 h-4" strokeWidth={3} />
      </span>
    );
  }
  if (value === 'partial') {
    return (
      <span className={cn('inline-flex items-center justify-center rounded-full bg-amber-50 text-amber-600', size)}>
        <Minus className="w-4 h-4" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-neutral-100 text-neutral-400', size)}>
      <X className="w-4 h-4" strokeWidth={2.5} />
    </span>
  );
}

function Cell({ value }) {
  if (value === 'yes') {
    return (
      <td className="p-3 sm:p-4 lg:p-5 text-center">
        <ValueBadge value={value} />
        <span className="sr-only">Strong fit</span>
      </td>
    );
  }
  if (value === 'partial') {
    return (
      <td className="p-3 sm:p-4 lg:p-5 text-center">
        <ValueBadge value={value} />
        <span className="sr-only">Possible with add-ons or workarounds</span>
      </td>
    );
  }
  return (
    <td className="p-3 sm:p-4 lg:p-5 text-center">
      <ValueBadge value={value} />
      <span className="sr-only">Not a core strength</span>
    </td>
  );
}

/**
 * Outcome-focused comparison (not a feature spec sheet).
 */
export default function CompetitorComparisonSection() {
  const columns = [
    { key: 'shopify', label: 'Storefront-first', sub: 'e.g. Shopify-style' },
    { key: 'zoho', label: 'Multi-app suites', sub: 'e.g. Zoho-style' },
    { key: 'tenvo', label: 'TENVO', sub: null, highlight: true },
  ];

  return (
    <section className={cn('relative overflow-hidden border-b border-neutral-200/80 bg-white', MARKETING_SECTION_LOOSE)}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=60)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className={cn('relative', MARKETING_CONTAINER)}>
        <div className="mx-auto mb-8 max-w-3xl space-y-3 text-center sm:mb-12 sm:space-y-4 lg:mb-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-primary sm:text-[11px] sm:tracking-[0.28em]">
            Why teams pick TENVO
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl lg:text-5xl">
            Built where commerce, operations, and compliance meet.
          </h2>
          <p className="text-base font-medium leading-relaxed text-neutral-600 sm:text-lg">
            Shopify shines at storefronts. Zoho offers many apps. TENVO is designed for operators who need the
            whole business, not a patchwork of subscriptions, to run smoothly in Pakistan and beyond.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.18)] backdrop-blur-sm sm:rounded-[2rem]">
          {/* Mobile card list */}
          <div className="divide-y divide-neutral-100 md:hidden">
            {rows.map((row) => (
              <div key={row.label} className="space-y-3 p-4">
                <p className="text-sm font-bold leading-snug text-neutral-900">{row.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center',
                        col.highlight ? 'border-brand-200 bg-brand-50/60' : 'border-neutral-100 bg-neutral-50/50'
                      )}
                    >
                      <ValueBadge value={row[col.key]} compact />
                      <span className={cn('text-[9px] font-semibold uppercase leading-tight tracking-wide', col.highlight ? 'text-brand-primary' : 'text-neutral-500')}>
                        {col.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/90">
                  <th className="p-4 lg:p-5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 w-[36%]">
                    What matters to your business
                  </th>
                  <th className="p-4 lg:p-5 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    <span className="block">Storefront-first</span>
                    <span className="block text-[9px] font-bold text-neutral-400 normal-case mt-1 tracking-normal">e.g. Shopify-style</span>
                  </th>
                  <th className="p-4 lg:p-5 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    <span className="block">Multi-app suites</span>
                    <span className="block text-[9px] font-bold text-neutral-400 normal-case mt-1 tracking-normal">e.g. Zoho-style</span>
                  </th>
                  <th className="p-4 lg:p-5 text-center text-[10px] font-semibold uppercase tracking-wider text-brand-primary bg-brand-50/80">
                    TENVO
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 lg:p-5 text-sm font-bold text-neutral-900 leading-snug">{row.label}</td>
                    <Cell value={row.shopify} />
                    <Cell value={row.zoho} />
                    <Cell value={row.tenvo} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap items-center justify-center gap-3 border-b border-neutral-100 bg-white px-4 py-3 text-[10px] font-bold text-neutral-500 sm:gap-4 sm:px-6">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Strong fit</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-amber-600" /> Add-ons or workarounds common</span>
            <span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-neutral-400" /> Not a core strength</span>
          </p>
          <p className="border-t border-neutral-100 bg-neutral-50/50 px-4 py-3 text-[11px] font-semibold text-neutral-500 sm:px-6 sm:py-4">
            Illustrative positioning for business buyers; exact needs vary by company size and industry. Our
            team maps your workflows on a short discovery call.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center sm:gap-4">
          <Button asChild className="h-11 rounded-xl bg-brand-primary px-6 font-semibold uppercase tracking-wider text-white hover:bg-brand-primary-dark sm:h-12 sm:px-8">
            <Link href="/register">See TENVO on your data</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl border-2 px-6 font-bold sm:h-12 sm:px-8">
            <Link href="/why-tenvo">Read the full story</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
