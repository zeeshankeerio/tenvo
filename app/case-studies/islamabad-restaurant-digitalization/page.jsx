'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Users, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import {
  MARKETING_CONTAINER,
  MARKETING_SECTION,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';
import CTASection from '@/components/marketing/sections/CTASection';

export default function IslamabadRestaurantCase() {
  return (
    <MarketingLayout>
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

      <section className={cn(MARKETING_SECTION, 'bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                Restaurant
              </span>
              <span className="text-sm font-medium text-neutral-500">
                Single location • Islamabad, Pakistan
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Flavors Restaurant: Paper Tickets to Digital POS
            </h1>

            <p className="mb-8 text-xl font-medium leading-relaxed text-neutral-600">
              From lost orders to instant kitchen coordination in one month
            </p>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-orange-600">Zero</div>
                <p className="text-sm font-semibold text-neutral-700">Lost tickets</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-orange-600">25%</div>
                <p className="text-sm font-semibold text-neutral-700">Faster table turnover</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-orange-600">Minutes</div>
                <p className="text-sm font-semibold text-neutral-700">End-of-day reconciliation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(MARKETING_SECTION, 'bg-white')}>
        <div className={cn(MARKETING_CONTAINER, 'mx-auto max-w-4xl')}>
          <div className="mb-12 grid gap-8 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-neutral-900">About the Business</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed text-neutral-600">
                <strong>Flavors Restaurant</strong> is a 50-seat casual dining restaurant in Islamabad's F-7 sector, specializing in Pakistani and continental cuisine. Open since 2019, they serve 200+ customers daily during peak hours.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Team & Scale</h3>
              </div>
              <ul className="space-y-2 text-sm font-medium text-neutral-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  3 chefs + 5 waiters + 2 cashiers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  120+ menu items
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  PKR 2M monthly revenue
                </li>
              </ul>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Challenge</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              Flavors Restaurant operated the traditional way: handwritten paper tickets passed from waiters to kitchen. During dinner rush, chaos erupted. Tickets got lost, orders were delayed, customers complained, and daily reconciliation took hours of manual counting.
            </p>

            <div className="my-8 rounded-2xl border-2 border-red-100 bg-red-50/30 p-6">
              <h4 className="mb-3 text-base font-bold text-neutral-900">Daily Pain Points:</h4>
              <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                <li>❌ Paper tickets lost between front desk and kitchen</li>
                <li>❌ No visibility of order status or prep time</li>
                <li>❌ Kitchen overwhelmed during peak hours</li>
                <li>❌ Waiters constantly checking order status</li>
                <li>❌ Wrong items delivered to tables</li>
                <li>❌ 2-3 hours for end-of-day cash reconciliation</li>
              </ul>
            </div>

            <blockquote className="my-8 border-l-4 border-orange-500 bg-orange-50/30 p-6 italic">
              <p className="text-lg font-medium text-neutral-800">
                "Paper tickets were a nightmare. During dinner rush, orders got lost, kitchen staff screamed for clarity, and customers waited 45 minutes for simple dishes. We needed a digital system that actually worked."
              </p>
              <footer className="mt-4 text-sm font-bold text-neutral-900">
                — Hamza Malik, General Manager
              </footer>
            </blockquote>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The TENVO Restaurant POS</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              TENVO's restaurant-specific POS was deployed with kitchen display integration:
            </p>

            <div className="my-8 space-y-4">
              {[
                {
                  title: 'Digital Order Entry',
                  desc: 'Waiters enter orders on tablets at tables. Items instantly appear on kitchen display screens with table numbers and special instructions.',
                },
                {
                  title: 'Kitchen Display System',
                  desc: 'Two kitchen screens show active orders by prep time. Chefs tap items when complete, and front desk sees live status.',
                },
                {
                  title: 'Table Management',
                  desc: 'Floor plan shows table occupancy, order status (pending/preparing/ready), and time elapsed. One tap to merge or split tables.',
                },
                {
                  title: 'Instant Billing',
                  desc: 'Front desk generates bills instantly. No manual calculations, automatic GST, and receipt printing in seconds.',
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4 rounded-xl border border-orange-200 bg-orange-50/20 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="mb-1 font-bold text-neutral-900">{step.title}</h4>
                    <p className="text-sm font-medium text-neutral-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">Implementation & Training</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              The switch from paper to digital took 10 days:
            </p>

            <div className="my-8 rounded-2xl border border-orange-200 bg-orange-50/20 p-6">
              <ul className="space-y-3 text-sm font-semibold text-neutral-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <span><strong>Week 1:</strong> Menu digitization (120 items with modifiers), tablet setup, kitchen display installation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <span><strong>Day 8-9:</strong> Staff training - 2 hours for waiters, 1 hour for chefs, 3 hours for cashiers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <span><strong>Day 10:</strong> Go-live with TENVO support staff on-site for lunch and dinner shifts</span>
                </li>
              </ul>
            </div>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Results</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              Within the first month, Flavors Restaurant saw dramatic improvements:
            </p>

            <div className="my-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
                <TrendingUp className="mb-3 h-8 w-8 text-emerald-600" />
                <h4 className="mb-2 text-lg font-bold text-neutral-900">Customer Experience</h4>
                <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                  <li>✓ Zero lost orders</li>
                  <li>✓ 35% faster order delivery</li>
                  <li>✓ 25% faster table turnover</li>
                  <li>✓ Real-time order status for customers</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
                <Clock className="mb-3 h-8 w-8 text-emerald-600" />
                <h4 className="mb-2 text-lg font-bold text-neutral-900">Operations</h4>
                <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                  <li>✓ 5 minutes daily reconciliation (was 2-3 hours)</li>
                  <li>✓ Kitchen prep time visibility</li>
                  <li>✓ Accurate sales reports by item, table, shift</li>
                  <li>✓ No more waiter-kitchen conflicts</li>
                </ul>
              </div>
            </div>

            <blockquote className="my-8 border-l-4 border-emerald-500 bg-emerald-50/30 p-6 italic">
              <p className="text-lg font-medium text-neutral-800">
                "The transformation was incredible. Kitchen sees orders instantly, we track table status in real-time, and daily reports show exactly what sold. Our customer complaints dropped by 70%. Best investment we made."
              </p>
              <footer className="mt-4 text-sm font-bold text-neutral-900">
                — Hamza Malik, 2 months after going live
              </footer>
            </blockquote>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">What&apos;s Next</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              Flavors Restaurant is now launching online ordering for takeaway and delivery using TENVO&apos;s branded storefront module. Orders from the website will flow directly into the same kitchen display system, creating a unified order management experience.
            </p>
          </div>
        </div>
      </section>

      <section className={cn(MARKETING_SECTION, 'bg-neutral-50')}>
        <div className={MARKETING_CONTAINER}>
          <h2 className="mb-8 text-center text-2xl font-semibold text-neutral-900">
            More Success Stories
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/case-studies/karachi-boutique-transformation"
              className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all hover:border-brand-primary hover:shadow-lg"
            >
              <span className="mb-3 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
                Fashion Retail
              </span>
              <h3 className="mb-2 text-xl font-semibold text-neutral-900 group-hover:text-brand-primary">
                Karachi Boutique: Multi-Location Transformation
              </h3>
              <p className="text-sm font-medium text-neutral-600">
                From Excel chaos to unified inventory across 3 outlets in 72 hours.
              </p>
            </Link>

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
                How a pharmacy chain passed FBR audit with automated compliance.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        variant="centered"
        title="Ready to digitize your restaurant operations?"
        subtitle="See how TENVO's restaurant POS can transform your service speed."
        primaryCTA={{ text: 'Start free', href: '/register' }}
        secondaryCTA={{ text: 'Book a meeting', href: '/contact' }}
      />
    </MarketingLayout>
  );
}
