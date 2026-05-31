'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, Globe2, Shield, Sparkles, Users } from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import CommerceAndIntelligenceSection from '@/components/marketing/sections/CommerceAndIntelligenceSection';
import CompetitorComparisonSection from '@/components/marketing/sections/CompetitorComparisonSection';
import CTASection from '@/components/marketing/sections/CTASection';
import { Button } from '@/components/ui/button';

export default function WhyTenvoPage() {
  return (
    <MarketingLayout>
      <Hero
        variant="centered"
        badge="For operators who outgrew patchwork tools"
        title={
          <>
            One intelligent platform for{' '}
            <span className="text-brand-primary">how you actually run the business</span>
          </>
        }
        subtitle="TENVO brings your storefront, checkout, warehouse, accounting, and local compliance into one calm workspace—so small teams move fast and large teams stay audit-ready without paying for a dozen disconnected products."
        primaryCTA={{ text: 'Start free', href: '/register' }}
        secondaryCTA={{ text: 'Book a walkthrough', href: '/demo' }}
      />

      <section className="py-16 lg:py-20 bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-neutral-200 shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
              alt="Team collaborating around operations"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="space-y-6">
            <p className="text-[11px] font-black text-brand-primary uppercase tracking-[0.28em]">Small to enterprise</p>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              From a single outlet to a national footprint—same product philosophy.
            </h2>
            <p className="text-neutral-600 font-medium leading-relaxed">
              Solo founders get sensible defaults and fast setup. Growing brands get multi-location control,
              role-based access, and clear handoffs between sales, warehouse, and finance. Larger groups get the
              rigor they expect around traceability, tax posture, and operational reporting—without forcing IT
              projects every quarter.
            </p>
            <ul className="space-y-4">
              {[
                { icon: Users, t: 'Roles that match real jobs', d: 'Cashier, warehouse, accountant, and owner—each sees what they need, nothing extra.' },
                { icon: Building2, t: 'Scales with your entity structure', d: 'Multiple brands or branches under one disciplined operating model.' },
                { icon: Shield, t: 'Compliance as a daily habit', d: 'Local tax and documentation expectations are part of the workflow—not a weekend catch-up.' },
                { icon: Globe2, t: 'Commerce without chaos', d: 'Your public store, marketplaces, and in-person selling stay aligned to one source of truth.' },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-neutral-900 text-sm">{t}</p>
                    <p className="text-sm text-neutral-500 font-medium mt-0.5">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CommerceAndIntelligenceSection variant="homepage" />

      <section className="py-16 lg:py-24 bg-neutral-50 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="max-w-3xl mb-12">
            <p className="text-[11px] font-black text-brand-primary uppercase tracking-[0.28em]">Compared to stitched-together stacks</p>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight mt-2">
              Why “good enough” tools quietly tax your margin.
            </h2>
            <p className="mt-4 text-neutral-600 font-medium leading-relaxed">
              When your storefront, inventory, and ledger don’t agree, you pay twice: once in lost sales or
              penalties, and again in staff time fixing spreadsheets. TENVO is opinionated about keeping those
              worlds connected so leadership can trust the numbers on Tuesday morning—not only after month-end.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Versus storefront-only platforms',
                body: 'Beautiful checkout is table stakes. TENVO adds depth where operators feel pain: stock truth across channels, cost visibility, and local regulatory context—without exporting everything to a consultant.',
              },
              {
                title: 'Versus sprawling app bundles',
                body: 'More icons on a home screen don’t equal integration. TENVO focuses on a coherent core—inventory, orders, POS, finance, and compliance—so your team isn’t the glue between silos.',
              },
              {
                title: 'What “intelligent” means here',
                body: 'Automation that respects your policies: smarter replenishment signals, guided data cleanup, and soon, assistants that prepare drafts for humans to approve—never black-box decisions on your revenue.',
              },
            ].map((c) => (
              <div key={c.title} className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm hover:border-brand-primary/30 transition-colors">
                <Sparkles className="w-8 h-8 text-brand-primary mb-4" />
                <h3 className="font-black text-lg text-neutral-900">{c.title}</h3>
                <p className="mt-3 text-sm text-neutral-600 font-medium leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" className="font-black rounded-xl border-2">
              <Link href="/pricing" className="inline-flex items-center gap-2">
                View plans <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <CompetitorComparisonSection />

      <CTASection
        variant="split"
        title="Ready to simplify how you sell and operate?"
        subtitle="Bring your team onto one platform built for Pakistani realities—and keep your ambition global."
        primaryCTA={{ text: 'Create your workspace', href: '/register' }}
        secondaryCTA={{ text: 'Talk to sales', href: '/contact' }}
      />
    </MarketingLayout>
  );
}
