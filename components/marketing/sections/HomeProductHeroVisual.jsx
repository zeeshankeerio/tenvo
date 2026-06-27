'use client';

import {
  BarChart3,
  Check,
  CheckCircle2,
  MonitorSmartphone,
  Package,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Product-led hero visual: hub dashboard mock + floating POS / storefront cards.
 * CSS-only (no missing screenshot assets); Calendly-style gentle float motion.
 */
export default function HomeProductHeroVisual({ className }) {
  return (
    <div
      className={cn('relative mx-auto w-full max-w-[min(36rem,100%)] lg:max-w-none', className)}
      aria-hidden
    >
      {/* Main dashboard frame */}
      <div className="animate-float-gentle relative z-10 overflow-hidden rounded-[1.5rem] border border-neutral-200/80 bg-white shadow-[0_30px_90px_-30px_rgba(15,23,42,0.28)] sm:rounded-[1.75rem]">
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/90 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            TENVO Hub
          </span>
        </div>

        <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr]">
          {/* Sidebar */}
          <div className="space-y-2 border-r border-neutral-100 bg-neutral-50/60 p-2.5 sm:p-3">
            {[Store, Package, BarChart3, MonitorSmartphone].map((Icon, i) => (
              <div
                key={i}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9',
                  i === 0 ? 'bg-brand-primary text-white shadow-sm' : 'bg-white text-neutral-400'
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            ))}
          </div>

          {/* Dashboard body */}
          <div className="space-y-3 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Today
                </p>
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">
                  Operations overview
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                Live
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Revenue', value: 'PKR 142k', tone: 'text-brand-primary' },
                { label: 'Orders', value: '38', tone: 'text-neutral-900' },
                { label: 'Low stock', value: '4', tone: 'text-amber-600' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-2 py-2 sm:px-2.5"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-neutral-400 sm:text-[9px]">
                    {kpi.label}
                  </p>
                  <p className={cn('text-xs font-semibold tabular-nums sm:text-sm', kpi.tone)}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-100 bg-white p-2.5 sm:p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-neutral-700">Sales trend</p>
                <p className="text-[9px] font-medium text-emerald-600">+12%</p>
              </div>
              <div className="flex h-14 items-end gap-1 sm:h-16">
                {[35, 52, 44, 68, 58, 82, 74].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-brand-primary/80 to-brand-primary/30"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-white px-2.5 py-2 sm:px-3">
              <div className="grid grid-cols-4 border-b border-neutral-50 pb-1 text-[8px] font-semibold uppercase text-neutral-400">
                <span>SKU</span>
                <span className="text-center">Qty</span>
                <span className="text-center">Tax</span>
                <span className="text-right">Amt</span>
              </div>
              <div className="grid grid-cols-4 items-center pt-1.5 text-[9px] font-medium text-neutral-700 sm:text-[10px]">
                <span className="truncate">Cotton Shirt</span>
                <span className="text-center">8</span>
                <span className="text-center text-emerald-600">18%</span>
                <span className="text-right text-brand-primary">76k</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating POS card */}
      <div className="animate-float-gentle-delayed pointer-events-none absolute -left-2 top-[8%] z-20 w-[9.5rem] rounded-xl border border-neutral-200/90 bg-white p-3 shadow-lg sm:-left-4 sm:w-[11rem]">
        <div className="mb-1.5 flex items-center gap-1.5">
          <MonitorSmartphone className="h-3.5 w-3.5 text-brand-primary" />
          <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
            POS
          </span>
        </div>
        <p className="text-xs font-semibold text-neutral-900">Counter sale</p>
        <p className="text-[10px] font-medium text-neutral-500">PKR 4,250 · GST applied</p>
      </div>

      {/* Floating storefront card */}
      <div className="animate-float-gentle-slow pointer-events-none absolute -right-1 top-[22%] z-20 w-[10rem] rounded-xl border border-neutral-200/90 bg-white p-3 shadow-lg sm:-right-3 sm:w-[11.5rem]">
        <div className="mb-1.5 flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
          <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
            Storefront
          </span>
        </div>
        <p className="text-xs font-semibold text-neutral-900">Web order #208</p>
        <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
          <Check className="h-3 w-3" /> Paid · Ready to ship
        </p>
      </div>

      {/* Floating dispatch card — desktop */}
      <div className="animate-float-gentle pointer-events-none absolute -bottom-2 right-[6%] z-20 hidden w-[10.5rem] items-center gap-2.5 rounded-xl border border-neutral-200/90 bg-white p-3 shadow-md sm:flex">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Truck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-neutral-900">Dispatch queued</p>
          <p className="text-[9px] font-medium text-blue-600">AWB assigned</p>
        </div>
      </div>

      {/* Floating audit pill — desktop */}
      <div className="animate-float-gentle-delayed pointer-events-none absolute bottom-[18%] left-[4%] z-20 hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 shadow-sm sm:flex">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-[9px] font-semibold text-emerald-800">Books reconciled</span>
      </div>
    </div>
  );
}
