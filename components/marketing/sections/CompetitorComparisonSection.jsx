'use client';

import Link from 'next/link';
import { Check, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

function Cell({ value }) {
  if (value === 'yes') {
    return (
      <td className="p-4 text-center">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto">
          <Check className="w-4 h-4" strokeWidth={3} />
        </span>
        <span className="sr-only">Strong fit</span>
      </td>
    );
  }
  if (value === 'partial') {
    return (
      <td className="p-4 text-center">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 mx-auto">
          <Minus className="w-4 h-4" strokeWidth={3} />
        </span>
        <span className="sr-only">Possible with add-ons or workarounds</span>
      </td>
    );
  }
  return (
    <td className="p-4 text-center">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mx-auto">
        <X className="w-4 h-4" strokeWidth={2.5} />
      </span>
      <span className="sr-only">Not a core strength</span>
    </td>
  );
}

/**
 * Outcome-focused comparison — not a feature spec sheet.
 */
export default function CompetitorComparisonSection() {
  return (
    <section className="relative py-20 lg:py-28 border-b border-neutral-200/80 overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=60)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center mb-14 space-y-4">
          <p className="text-[11px] font-black text-brand-primary uppercase tracking-[0.28em]">
            Why teams pick TENVO
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
            Built where commerce, operations, and compliance meet.
          </h2>
          <p className="text-lg text-neutral-600 font-medium leading-relaxed">
            Shopify shines at storefronts. Zoho offers many apps. TENVO is designed for operators who need the
            whole business—not a patchwork of subscriptions—to run smoothly in Pakistan and beyond.
          </p>
        </div>

        <div className="rounded-[2rem] border border-neutral-200/90 bg-white/95 backdrop-blur-sm shadow-[0_30px_80px_-40px_rgba(15,23,42,0.18)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/90">
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase tracking-wider text-neutral-500 w-[36%]">
                    What matters to your business
                  </th>
                  <th className="p-4 lg:p-5 text-center text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    <span className="block">Storefront-first</span>
                    <span className="block text-[9px] font-bold text-neutral-400 normal-case mt-1 tracking-normal">e.g. Shopify-style</span>
                  </th>
                  <th className="p-4 lg:p-5 text-center text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    <span className="block">Multi-app suites</span>
                    <span className="block text-[9px] font-bold text-neutral-400 normal-case mt-1 tracking-normal">e.g. Zoho-style</span>
                  </th>
                  <th className="p-4 lg:p-5 text-center text-[10px] font-black uppercase tracking-wider text-brand-primary bg-brand-50/80">
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
          <p className="px-6 py-3 text-[10px] text-neutral-500 font-bold border-b border-neutral-100 bg-white flex flex-wrap items-center justify-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Strong fit</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-amber-600" /> Add-ons or workarounds common</span>
            <span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-neutral-400" /> Not a core strength</span>
          </p>
          <p className="px-6 py-4 text-[11px] text-neutral-500 font-semibold border-t border-neutral-100 bg-neutral-50/50">
            Illustrative positioning for business buyers; exact needs vary by company size and industry. Our
            team maps your workflows on a short discovery call.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild className="bg-brand-primary hover:bg-brand-primary-dark text-white font-black rounded-xl h-12 px-8 uppercase tracking-wider">
            <Link href="/register">See TENVO on your data</Link>
          </Button>
          <Button asChild variant="outline" className="font-bold rounded-xl h-12 px-8 border-2">
            <Link href="/why-tenvo">Read the full story</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
