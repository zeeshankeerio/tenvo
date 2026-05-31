'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  ChefHat,
  LayoutGrid,
  MonitorSmartphone,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const IMG = {
  storefront:
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
  pos: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80',
  restaurant:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  orders:
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
};

/**
 * Storefront, POS, hospitality, orders, automation & roadmap — business-first copy.
 */
export default function CommerceAndIntelligenceSection({ variant = 'homepage' }) {
  const isCompact = variant === 'compact';

  return (
    <section
      className={`relative border-b border-neutral-200/80 overflow-hidden ${
        isCompact ? 'py-16 lg:py-20 bg-white' : 'py-20 lg:py-28 bg-neutral-950 text-white'
      }`}
    >
      {!isCompact && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(227,66,66,0.22),transparent)]" />
      )}

      <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 ${isCompact ? '' : ''}`}>
        <div className={`max-w-3xl ${isCompact ? 'mb-12' : 'mb-14 lg:mb-16'}`}>
          <p
            className={`text-[11px] font-black uppercase tracking-[0.28em] mb-4 ${
              isCompact ? 'text-brand-primary' : 'text-brand-primary'
            }`}
          >
            Storefront · POS · Hospitality
          </p>
          <h2
            className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight ${
              isCompact ? 'text-neutral-900' : 'text-white'
            }`}
          >
            Sell everywhere your customers are—without juggling five different systems.
          </h2>
          <p
            className={`mt-4 text-lg font-medium leading-relaxed ${
              isCompact ? 'text-neutral-600' : 'text-neutral-300'
            }`}
          >
            Your online brand store, in-store checkout, and café or restaurant service share one live view of
            products, pricing, and fulfilment. Stock moves once; your team stays aligned from first click to
            final delivery.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
          <article className="lg:col-span-5 group relative min-h-[280px] rounded-[2rem] border border-white/10 bg-neutral-900/60 overflow-hidden shadow-[0_40px_100px_-40px_rgba(0,0,0,0.65)]">
            <Image
              src={IMG.storefront}
              alt=""
              fill
              className="object-cover opacity-55 transition duration-700 group-hover:scale-105 group-hover:opacity-65"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8 lg:p-10">
              <div className="flex items-center gap-2 text-white/90 mb-3">
                <Store className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Public brand store</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Branded online storefront</h3>
              <p className="mt-2 text-sm text-neutral-200 font-medium leading-relaxed max-w-md">
                Launch a professional shop under your business name. Catalog, cart, checkout, and customer
                care pages work together so web sales feel as trustworthy as walking into your flagship outlet.
              </p>
            </div>
          </article>

          <article className="lg:col-span-7 group relative min-h-[280px] rounded-[2rem] border border-white/10 bg-neutral-900/60 overflow-hidden shadow-[0_40px_100px_-40px_rgba(0,0,0,0.65)]">
            <Image
              src={IMG.pos}
              alt=""
              fill
              className="object-cover opacity-50 transition duration-700 group-hover:scale-105 group-hover:opacity-60"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/45 to-transparent" />
            <div className="relative h-full flex flex-col justify-center p-8 lg:p-10 max-w-xl">
              <div className="flex items-center gap-2 text-white/90 mb-3">
                <MonitorSmartphone className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Retail & checkout</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">POS that speaks the same language as your back office</h3>
              <p className="mt-2 text-sm text-neutral-200 font-medium leading-relaxed">
                Ring up sales, returns, and exchanges at the counter while inventory and accounts stay accurate.
                Built for busy shops that cannot afford “end-of-day surprises” or mismatched stock between the
                till and the warehouse.
              </p>
            </div>
          </article>

          <article className="lg:col-span-4 group relative min-h-[260px] rounded-[2rem] border border-white/10 bg-neutral-900/60 overflow-hidden">
            <Image
              src={IMG.restaurant}
              alt=""
              fill
              className="object-cover opacity-45 transition duration-700 group-hover:scale-105 group-hover:opacity-55"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8">
              <div className="flex items-center gap-2 text-white/90 mb-2">
                <ChefHat className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cafés & dining</span>
              </div>
              <h3 className="text-xl font-black text-white">Hospitality-ready workflows</h3>
              <p className="mt-2 text-xs text-neutral-200 font-semibold leading-relaxed">
                Tables, kitchen coordination, and front-of-house selling connect to the same product and
                revenue picture as retail—ideal for growing food brands that also sell retail or online.
              </p>
            </div>
          </article>

          <article className="lg:col-span-4 group relative min-h-[260px] rounded-[2rem] border border-white/10 bg-neutral-900/60 overflow-hidden">
            <Image
              src={IMG.orders}
              alt=""
              fill
              className="object-cover opacity-45 transition duration-700 group-hover:scale-105 group-hover:opacity-55"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8">
              <div className="flex items-center gap-2 text-white/90 mb-2">
                <Truck className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Order hub</span>
              </div>
              <h3 className="text-xl font-black text-white">One place for every order</h3>
              <p className="mt-2 text-xs text-neutral-200 font-semibold leading-relaxed">
                Web orders, counter sales, and B2B requests flow into a single operational queue—pack, ship,
                reconcile, and support customers without switching tools or retyping data.
              </p>
            </div>
          </article>

          <article
            className={`lg:col-span-4 rounded-[2rem] border p-8 flex flex-col justify-between ${
              isCompact
                ? 'border-neutral-200 bg-gradient-to-br from-brand-50 to-white'
                : 'border-brand-primary/30 bg-gradient-to-br from-brand-primary/20 to-neutral-900'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-3 text-brand-primary">
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Automation</span>
              </div>
              <h3 className={`text-xl font-black tracking-tight ${isCompact ? 'text-neutral-900' : 'text-white'}`}>
                Guided setup & ongoing management
              </h3>
              <p
                className={`mt-2 text-xs font-semibold leading-relaxed ${
                  isCompact ? 'text-neutral-600' : 'text-neutral-200'
                }`}
              >
                Industry presets, bulk onboarding from spreadsheets, and sensible defaults mean you spend less
                time configuring—and more time selling. Your storefront and channels stay aligned as you grow.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${
                  isCompact
                    ? 'bg-white text-brand-primary border-brand-primary/20'
                    : 'bg-white/10 text-white border-white/10'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Auto-provisioned store
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border ${
                  isCompact
                    ? 'bg-white text-brand-primary border-brand-primary/20'
                    : 'bg-white/10 text-white border-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Smart restock signals
              </span>
            </div>
          </article>
        </div>

        {/* Roadmap strip */}
        <div
          className={`mt-10 rounded-[2rem] border p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 ${
            isCompact
              ? 'border-neutral-200 bg-neutral-50'
              : 'border-white/10 bg-white/[0.04] backdrop-blur-md'
          }`}
        >
          <div className="flex items-start gap-4 max-w-2xl">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isCompact ? 'bg-brand-primary text-white' : 'bg-brand-primary text-white'
              }`}
            >
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isCompact ? 'text-neutral-900' : 'text-white'}`}>
                Agentic improvements — on the way
              </h3>
              <p
                className={`mt-1 text-sm font-medium leading-relaxed ${
                  isCompact ? 'text-neutral-600' : 'text-neutral-300'
                }`}
              >
                Soon, TENVO will surface proactive suggestions across purchasing, compliance checks, and
                customer follow-ups—always under your control, with clear explanations so your team trusts every
                recommendation.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="shrink-0 bg-brand-primary hover:bg-brand-primary-dark text-white font-black rounded-xl h-12 px-6 uppercase tracking-wider"
          >
            <Link href="/register" className="inline-flex items-center gap-2">
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
