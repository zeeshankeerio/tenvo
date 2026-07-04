'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Building2, Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { Button } from '@/components/ui/button';
import {
  MARKETING_CONTAINER,
  MARKETING_SECTION,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';
import CTASection from '@/components/marketing/sections/CTASection';

export default function KarachiBoutiqueCaseStudy() {
  return (
    <MarketingLayout>
      {/* Header */}
      <section className="border-b border-neutral-200/80 bg-white py-6">
        <div className={MARKETING_CONTAINER}>
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to case studies
          </Link>
        </div>
      </section>

      {/* Hero */}
      <section className={cn(MARKETING_SECTION, 'bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary">
                Fashion Retail
              </span>
              <span className="text-sm font-medium text-neutral-500">
                3 locations • Karachi, Pakistan
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              How Khan Fashion Boutique unified inventory across 3 outlets
            </h1>

            <p className="mb-8 text-xl font-medium leading-relaxed text-neutral-600">
              From Excel chaos to real-time multi-location visibility in 72 hours
            </p>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-brand-primary">40%</div>
                <p className="text-sm font-semibold text-neutral-700">
                  Faster stock reconciliation
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-brand-primary">3 days</div>
                <p className="text-sm font-semibold text-neutral-700">
                  Complete implementation
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-brand-primary">99%</div>
                <p className="text-sm font-semibold text-neutral-700">
                  Stock accuracy rate
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Overview */}
      <section className={cn(MARKETING_SECTION, 'bg-white')}>
        <div className={cn(MARKETING_CONTAINER, 'mx-auto max-w-4xl')}>
          <div className="mb-12 grid gap-8 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-brand-primary" />
                <h3 className="text-lg font-semibold text-neutral-900">About the Business</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed text-neutral-600">
                <strong>Khan Fashion Boutique</strong> operates three retail locations in Karachi, specializing in Pakistani and Western women's clothing. Founded in 2018, they've grown from a single shop to a small chain serving 500+ customers monthly.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-brand-primary" />
                <h3 className="text-lg font-semibold text-neutral-900">Team & Scale</h3>
              </div>
              <ul className="space-y-2 text-sm font-medium text-neutral-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                  8 staff members across 3 locations
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                  2,500+ clothing items in inventory
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                  PKR 1.5M monthly revenue
                </li>
              </ul>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Challenge</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              As Khan Fashion Boutique expanded to three locations, owner Ayesha Khan faced a growing inventory nightmare. Each outlet maintained its own Excel spreadsheet, staff made phone calls to check stock at other branches, and month-end reconciliation took two full days of manual work.
            </p>

            <div className="my-8 rounded-2xl border-2 border-red-100 bg-red-50/30 p-6">
              <h4 className="mb-3 text-base font-bold text-neutral-900">Key Pain Points:</h4>
              <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                <li>❌ No real-time visibility across locations</li>
                <li>❌ Customers asking for items that were actually in stock at another branch</li>
                <li>❌ Frequent stock-outs of popular sizes and colors</li>
                <li>❌ Hours spent on daily phone calls between outlets</li>
                <li>❌ Excel files getting corrupted or out of sync</li>
                <li>❌ Lost sales due to inventory confusion</li>
              </ul>
            </div>

            <blockquote className="my-8 border-l-4 border-brand-primary bg-brand-50/30 p-6 italic">
              <p className="text-lg font-medium text-neutral-800">
                "We were drowning in Excel sheets and losing track of inventory between our three outlets. Staff would tell customers an item was out of stock, only to find it sitting at another branch. The phone calls alone were eating up hours every day."
              </p>
              <footer className="mt-4 text-sm font-bold text-neutral-900">
                — Ayesha Khan, Owner, Khan Fashion Boutique
              </footer>
            </blockquote>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Solution</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              After a demo session, Ayesha decided to migrate to TENVO. The implementation took just 72 hours:
            </p>

            <div className="my-8 space-y-4">
              <div className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-primary">
                  1
                </div>
                <div>
                  <h4 className="mb-1 font-bold text-neutral-900">Day 1: Data Migration</h4>
                  <p className="text-sm font-medium text-neutral-600">
                    TENVO's migration team imported all three Excel files (2,500 products). Duplicate SKUs were flagged and resolved. All three locations went live on the same database.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-primary">
                  2
                </div>
                <div>
                  <h4 className="mb-1 font-bold text-neutral-900">Day 2: Staff Training</h4>
                  <p className="text-sm font-medium text-neutral-600">
                    2-hour training session for all 8 staff members. Hands-on practice with checking stock, transferring items between branches, and processing sales.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-primary">
                  3
                </div>
                <div>
                  <h4 className="mb-1 font-bold text-neutral-900">Day 3: Go Live</h4>
                  <p className="text-sm font-medium text-neutral-600">
                    All three outlets processed their first sales through TENVO. Stock levels synced instantly. Inter-branch transfer requests replaced phone calls.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Results</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              Within the first month, Khan Fashion Boutique saw dramatic improvements:
            </p>

            <div className="my-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
                <TrendingUp className="mb-3 h-8 w-8 text-emerald-600" />
                <h4 className="mb-2 text-lg font-bold text-neutral-900">Operational Efficiency</h4>
                <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                  <li>✓ 40% faster month-end reconciliation</li>
                  <li>✓ Zero phone calls between branches</li>
                  <li>✓ 99% stock accuracy across locations</li>
                  <li>✓ Same-day inter-branch transfers</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
                <Clock className="mb-3 h-8 w-8 text-emerald-600" />
                <h4 className="mb-2 text-lg font-bold text-neutral-900">Time Savings</h4>
                <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                  <li>✓ 10 hours/week saved on stock checks</li>
                  <li>✓ 2 days to 4 hours: month-end close</li>
                  <li>✓ Instant stock visibility for staff</li>
                  <li>✓ Automated transfer documentation</li>
                </ul>
              </div>
            </div>

            <blockquote className="my-8 border-l-4 border-emerald-500 bg-emerald-50/30 p-6 italic">
              <p className="text-lg font-medium text-neutral-800">
                "TENVO unified everything in one dashboard. Now stock moves are instant and we catch discrepancies before month-end. My staff can focus on customers instead of hunting through spreadsheets. Best decision we made this year."
              </p>
              <footer className="mt-4 text-sm font-bold text-neutral-900">
                — Ayesha Khan, 3 months after going live
              </footer>
            </blockquote>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">Technology Stack</h2>
            <div className="my-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
              <ul className="grid gap-4 sm:grid-cols-2">
                <li className="text-sm font-semibold text-neutral-700">
                  <span className="font-bold text-brand-primary">Plan:</span> Professional
                </li>
                <li className="text-sm font-semibold text-neutral-700">
                  <span className="font-bold text-brand-primary">Features Used:</span> Multi-location inventory
                </li>
                <li className="text-sm font-semibold text-neutral-700">
                  <span className="font-bold text-brand-primary">Integrations:</span> Excel import, inter-branch transfers
                </li>
                <li className="text-sm font-semibold text-neutral-700">
                  <span className="font-bold text-brand-primary">Users:</span> 8 staff members
                </li>
              </ul>
            </div>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">What&apos;s Next</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              Khan Fashion Boutique is now exploring TENVO&apos;s branded storefront module to launch online ordering for customers. With their inventory already unified, adding e-commerce will be a straightforward next step.
            </p>
          </div>
        </div>
      </section>

      {/* Related Case Studies */}
      <section className={cn(MARKETING_SECTION, 'bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <h2 className="mb-8 text-center text-2xl font-semibold text-neutral-900">
            More Success Stories
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/case-studies/lahore-pharmacy-compliance"
              className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:border-brand-primary hover:shadow-lg"
            >
              <span className="mb-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Pharmacy
              </span>
              <h3 className="mb-2 text-xl font-semibold text-neutral-900 group-hover:text-brand-primary">
                Lahore Pharmacy: FBR Compliance & Batch Tracking
              </h3>
              <p className="text-sm font-medium text-neutral-600">
                How a pharmacy chain passed FBR audit with TENVO's batch tracking and automated GST calculations.
              </p>
            </Link>

            <Link
              href="/case-studies/islamabad-restaurant-digitalization"
              className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:border-brand-primary hover:shadow-lg"
            >
              <span className="mb-3 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                Restaurant
              </span>
              <h3 className="mb-2 text-xl font-semibold text-neutral-900 group-hover:text-brand-primary">
                Islamabad Restaurant: Paper to Digital POS
              </h3>
              <p className="text-sm font-medium text-neutral-600">
                From lost tickets to instant kitchen coordination. 25% faster table turnover in first month.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        variant="centered"
        title="Ready to transform your operations?"
        subtitle="See how TENVO can help your business achieve similar results."
        primaryCTA={{ text: 'Start free', href: '/register' }}
        secondaryCTA={{ text: 'Book a meeting', href: '/contact' }}
      />
    </MarketingLayout>
  );
}
