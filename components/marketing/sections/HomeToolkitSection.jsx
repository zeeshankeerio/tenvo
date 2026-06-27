'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Layers,
  Package,
  Receipt,
  Workflow,
} from 'lucide-react';
import { HOME_TOOLKIT_TABS } from '@/lib/marketing/homeVisualThemes';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

const TAB_ICONS = {
  inventory: Package,
  warehouse: Layers,
  selling: Globe,
  fulfillment: Workflow,
  accounting: Receipt,
};

const TAB_COPY = {
  inventory: {
    eyebrow: 'Clear item tracking',
    heading: 'Never lose track of a single item again.',
    body: 'Organize products by size, color, or material. Track expiry dates and serial numbers so you always know what is on shelf and what must move first.',
    points: [
      { title: 'Create custom bundles', desc: 'Combine items into gift sets or kits.' },
      { title: 'Smart pricing updates', desc: 'Adjust sell price when supplier costs change.' },
    ],
    console: [
      ['PRODUCT: Crew Neck Cotton Shirt', 'VARIANT: M / BLACK'],
      ['BATCH: BTC-2026-05A', 'EXPIRY: 2028-05-18'],
      ['SERIAL: SN-9031248011', 'STATUS: Warehouse inward'],
    ],
  },
  warehouse: {
    eyebrow: 'Multi-location control',
    heading: 'Control stock across every hub and shop floor.',
    body: 'Monitor allocations across warehouses and retail locations. Run transfer orders with approvals, transit visibility, and location-level precision.',
    points: [
      { title: 'Transfer approvals', desc: 'Supervisor sign-off before stock moves.' },
      { title: 'Bin-level precision', desc: 'Guide pickers to the right aisle and shelf.' },
    ],
    console: [
      ['FROM: Karachi port yard', 'STATUS: In transit'],
      ['TO: Gulberg central hub', 'ETA: 14 hours'],
      ['IN TRANSIT: 450 units', 'VALUATION: PKR 810,000'],
    ],
  },
  selling: {
    eyebrow: 'Branded storefront (available)',
    heading: 'Your own store is live on day one.',
    body: 'Launch a TENVO-branded storefront with catalog, cart, and checkout. Shopify, Daraz, and WooCommerce connectors are on the roadmap; your hub catalog is the source of truth today.',
    points: [
      { title: 'Public brand store', desc: 'SEO-ready pages under your business domain.' },
      { title: 'Shared catalog', desc: 'POS, hub, and storefront read the same SKUs.' },
    ],
    console: [
      ['STORE: demo-boutique', 'STATUS: Published'],
      ['CHANNEL: TENVO storefront', 'ORDERS: Synced to hub'],
      ['MARKETPLACE SYNC', 'Shopify / Daraz: Roadmap'],
    ],
  },
  fulfillment: {
    eyebrow: 'Order hub',
    heading: 'One queue for web, counter, and B2B orders.',
    body: 'Storefront and POS orders land in the same operational queue. Pack, ship, reconcile, and support customers without retyping line items.',
    points: [
      { title: 'Storefront order tab', desc: 'Fulfill web sales from the hub orders view.' },
      { title: 'Status tracking', desc: 'Processing, shipped, and delivered states.' },
    ],
    console: [
      ['PACKING SLIP', 'ORDER: TNV-SO-8802'],
      ['CARRIER: Courier COD', 'TRACKING: 7731298402'],
      ['LABEL STATUS', 'Printed and dispatched'],
    ],
  },
  accounting: {
    eyebrow: 'Tax-aware finance',
    heading: 'Audit-ready ledgers and GST-aware invoicing.',
    body: 'Generate invoices, track customer balances, and post journals from sales activity. GST configuration and export-friendly summaries are built in; live FBR IRIS sync is on the roadmap.',
    points: [
      { title: 'Tax configuration', desc: 'Regional sales tax rules on invoices.' },
      { title: 'Customer ledgers', desc: 'Invoices, credits, and outstanding AR.' },
    ],
    console: [
      ['GST INVOICE PREVIEW', 'UUID: 2026-TX-10023'],
      ['NET: PKR 124,500', 'GST (18%): PKR 22,410'],
      ['LEDGER SYNC', 'Balance sheet updated'],
    ],
  },
};

export default function HomeToolkitSection() {
  const [activeTab, setActiveTab] = useState('inventory');
  const active = HOME_TOOLKIT_TABS.find((t) => t.id === activeTab) ?? HOME_TOOLKIT_TABS[0];
  const copy = TAB_COPY[activeTab];
  const TabIcon = TAB_ICONS[activeTab];

  return (
    <section className="border-b border-neutral-200/80 bg-white py-10 sm:py-16 lg:py-28">
      <div className={MARKETING_CONTAINER}>
        <div className="mx-auto mb-12 max-w-3xl space-y-4 text-center sm:mb-16">
          <p className={MARKETING_EYEBROW}>Your complete toolkit</p>
          <h2 className={MARKETING_SECTION_HEADING}>One dashboard. Complete control.</h2>
          <p className="text-lg font-medium text-neutral-600">
            Inventory, locations, storefront, fulfilment, and finance in one workspace, the way Zoho and
            Busy operators expect, without stitching five apps together.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-4">
            {HOME_TOOLKIT_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-2xl border p-4 text-left motion-safe:transition-colors sm:p-5',
                    isActive
                      ? tab.accent.activeTab
                      : 'border-neutral-200/80 bg-white hover:border-neutral-300'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-xl p-3',
                      isActive ? tab.accent.icon : tab.accent.iconIdle
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-neutral-900">{tab.title}</h4>
                    <p className="mt-1 text-xs font-medium text-neutral-500">{tab.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-[480px] flex-col rounded-[1.75rem] border border-neutral-200/80 bg-neutral-50 p-5 sm:p-6 lg:col-span-8 lg:p-8">
            <div className="grid flex-1 gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div className={cn('flex items-center gap-2 text-xs font-semibold uppercase tracking-widest', active.accent.eyebrow)}>
                  <Check className="h-4 w-4" aria-hidden />
                  {copy.eyebrow}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-neutral-900 lg:text-3xl">
                  {copy.heading}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-neutral-600">{copy.body}</p>
                <div className="grid gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-1">
                  {copy.points.map((point) => (
                    <div key={point.title} className="flex items-start gap-3">
                      <CheckCircle2 className={cn('mt-0.5 h-5 w-5 shrink-0', active.accent.eyebrow)} aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">{point.title}</p>
                        <p className="text-xs font-medium text-neutral-500">{point.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[200px] overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm lg:min-h-0">
                {active.heroImage ? (
                  <Image
                    src={active.heroImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 360px"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/65 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 p-4">
                  <div className="flex items-center gap-2 text-white">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', active.accent.icon)}>
                      <TabIcon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide">Live demo</span>
                  </div>
                  <Link
                    href={active.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-800"
                  >
                    Open store
                    <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Console live view
                  </span>
                </div>
              </div>
              <div className="space-y-2.5 font-mono text-xs text-neutral-700">
                {copy.console.map(([left, right]) => (
                  <div key={left} className="flex justify-between gap-4 border-b border-neutral-50 pb-1 last:border-0">
                    <span className="truncate">{left}</span>
                    <span className={cn('shrink-0 font-bold', active.accent.eyebrow)}>{right}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
