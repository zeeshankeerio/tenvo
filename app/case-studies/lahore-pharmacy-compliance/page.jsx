'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Users, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import {
  MARKETING_CONTAINER,
  MARKETING_SECTION,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';
import CTASection from '@/components/marketing/sections/CTASection';

export default function LahorePharmacyCase() {
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
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Pharmacy
              </span>
              <span className="text-sm font-medium text-neutral-500">
                5 locations • Lahore, Pakistan
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              Sehat Pharmacy Chain: FBR-Ready Compliance
            </h1>

            <p className="mb-8 text-xl font-medium leading-relaxed text-neutral-600">
              Passed FBR audit smoothly with automated batch tracking and GST calculations
            </p>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-emerald-600">100%</div>
                <p className="text-sm font-semibold text-neutral-700">FBR audit compliance</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-emerald-600">2,000+</div>
                <p className="text-sm font-semibold text-neutral-700">SKUs with batch tracking</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="mb-2 text-3xl font-semibold text-emerald-600">Minutes</div>
                <p className="text-sm font-semibold text-neutral-700">To pull audit reports</p>
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
                <Building2 className="h-6 w-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-neutral-900">About the Business</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed text-neutral-600">
                <strong>Sehat Pharmacy Chain</strong> operates five retail pharmacies across Lahore, serving 1,500+ customers monthly. Established in 2016 by Dr. Rizwan Ahmed, they stock prescription medications, OTC drugs, and health supplements.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-emerald-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Team & Scale</h3>
              </div>
              <ul className="space-y-2 text-sm font-medium text-neutral-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  5 pharmacists + 12 support staff
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  2,000+ pharmaceutical SKUs
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  PKR 3.5M monthly revenue
                </li>
              </ul>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Challenge</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              When Sehat Pharmacy Chain received an FBR audit notice, Dr. Rizwan realized their manual record-keeping was inadequate. Batch numbers were tracked in notebooks, expiry dates in separate spreadsheets, and GST calculations done monthly in Excel with frequent errors.
            </p>

            <div className="my-8 rounded-2xl border-2 border-red-100 bg-red-50/30 p-6">
              <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-neutral-900">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Critical Compliance Gaps:
              </h4>
              <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                <li>❌ No centralized batch number tracking</li>
                <li>❌ Expiry dates tracked manually, prone to errors</li>
                <li>❌ GST calculations done monthly, not per-transaction</li>
                <li>❌ No audit trail for controlled substances</li>
                <li>❌ Days needed to compile regulatory reports</li>
                <li>❌ Risk of FBR penalties for incomplete records</li>
              </ul>
            </div>

            <blockquote className="my-8 border-l-4 border-emerald-500 bg-emerald-50/30 p-6 italic">
              <p className="text-lg font-medium text-neutral-800">
                "FBR compliance was our biggest headache. We had batch numbers in notebooks, expiry dates in spreadsheets, and GST calculated manually. When the audit notice came, I panicked. We needed a proper system immediately."
              </p>
              <footer className="mt-4 text-sm font-bold text-neutral-900">
                — Dr. Rizwan Ahmed, Managing Partner
              </footer>
            </blockquote>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The TENVO Solution</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              TENVO was implemented across all five locations in one week:
            </p>

            <div className="my-8 space-y-4">
              {[
                {
                  title: 'Batch Tracking Migration',
                  desc: 'All 2,000+ products migrated with batch numbers, expiry dates, and manufacturer details. Historical batch records imported from Excel.',
                },
                {
                  title: 'Automated GST Compliance',
                  desc: 'TENVO configured with 18% standard GST rate. Every invoice automatically calculates tax, maintains audit logs, and generates FBR-compliant receipts.',
                },
                {
                  title: 'Expiry Alert System',
                  desc: 'Automated alerts set for 30, 60, and 90 days before expiry. Dashboard shows near-expiry stock with batch-level detail.',
                },
                {
                  title: 'Regulatory Reports',
                  desc: 'One-click reports for FBR audits: purchase ledger, sales register, GST summary, and controlled substance logs.',
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4 rounded-xl border border-emerald-200 bg-emerald-50/20 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="mb-1 font-bold text-neutral-900">{step.title}</h4>
                    <p className="text-sm font-medium text-neutral-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">The Audit Experience</h2>
            <p className="font-medium leading-relaxed text-neutral-700">
              When the FBR team arrived three months later, Sehat Pharmacy was ready:
            </p>

            <div className="my-8 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
              <h4 className="mb-4 flex items-center gap-2 font-bold text-neutral-900">
                <Shield className="h-6 w-6 text-emerald-600" />
                Documents Provided in Real-Time:
              </h4>
              <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                <li>✓ Complete purchase and sales registers</li>
                <li>✓ GST summary with transaction-level detail</li>
                <li>✓ Batch-wise stock reports with expiry dates</li>
                <li>✓ Controlled substance movement logs</li>
                <li>✓ Supplier payment records</li>
                <li>✓ Customer invoice copies (any date range)</li>
              </ul>
            </div>

            <blockquote className="my-8 border-l-4 border-emerald-500 bg-emerald-50/30 p-6 italic">
              <p className="text-lg font-medium text-neutral-800">
                "The FBR audit that I was dreading became a non-event. We pulled every report they asked for in minutes. The auditor even commented on how organized our records were. TENVO&apos;s audit trail gave us complete peace of mind."
              </p>
              <footer className="mt-4 text-sm font-bold text-neutral-900">
                — Dr. Rizwan Ahmed, after successful audit
              </footer>
            </blockquote>

            <h2 className="mb-4 text-2xl font-semibold text-neutral-900">Ongoing Benefits</h2>
            <div className="my-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-6">
                <h4 className="mb-3 text-lg font-bold text-neutral-900">Compliance</h4>
                <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                  <li>✓ 100% GST accuracy on every transaction</li>
                  <li>✓ Complete batch audit trail</li>
                  <li>✓ Automated regulatory reporting</li>
                  <li>✓ Zero compliance penalties</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-6">
                <h4 className="mb-3 text-lg font-bold text-neutral-900">Operations</h4>
                <ul className="space-y-2 text-sm font-semibold text-neutral-700">
                  <li>✓ 40% reduction in expired inventory</li>
                  <li>✓ Instant batch lookup at checkout</li>
                  <li>✓ Automated near-expiry alerts</li>
                  <li>✓ Real-time stock across 5 locations</li>
                </ul>
              </div>
            </div>
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
                From lost tickets to instant kitchen coordination. 25% faster table turnover.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        variant="centered"
        title="Need FBR-compliant inventory management?"
        subtitle="See how TENVO can help your pharmacy achieve regulatory compliance."
        primaryCTA={{ text: 'Start free', href: '/register' }}
        secondaryCTA={{ text: 'Book a meeting', href: '/contact' }}
      />
    </MarketingLayout>
  );
}
