'use client';

import Link from 'next/link';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import FeaturesGrid from '@/components/marketing/sections/FeaturesGrid';
import OperationsFlow from '@/components/marketing/sections/OperationsFlow';
import CommerceAndIntelligenceSection from '@/components/marketing/sections/CommerceAndIntelligenceSection';
import CTASection from '@/components/marketing/sections/CTASection';
import { marketingContent } from '@/lib/marketing/content';

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge="Enterprise Capabilities"
        title={
          <>
            Everything You Need to <br />
            <span className="text-brand-primary">Run Your Business</span>
          </>
        }
        subtitle="Storefront, POS, warehouses, accounting, and Pakistan-ready compliance in one platform—so operators are not paying for a patchwork of global apps that were never designed together."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register'
        }}
        secondaryCTA={{
          text: 'Why TENVO vs others',
          href: '/why-tenvo'
        }}
      />

      {/* Core Features */}
      <FeaturesGrid 
        variant="grid"
        title="Core ERP Capabilities"
        subtitle="Integrated modules that work together seamlessly"
        features={marketingContent.features}
      />

      {/* Operations Flow */}
      <OperationsFlow />

      <CommerceAndIntelligenceSection variant="compact" />

      {/* Advanced Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.3em]">Advanced Features</h2>
            <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">Built for Scale</h3>
            <p className="text-lg text-gray-500 font-medium">
              Enterprise-grade features that grow with your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <FeatureDetail
              title="Multi-Warehouse Management"
              description="Manage inventory across unlimited locations with real-time synchronization, inter-warehouse transfers, and location-specific pricing."
              features={[
                'Unlimited warehouse locations',
                'Real-time stock synchronization',
                'Inter-warehouse transfers',
                'Location-specific pricing',
                'Warehouse performance analytics'
              ]}
            />
            <FeatureDetail
              title="Manufacturing & BOM"
              description="Complete manufacturing management with Bill of Materials, work orders, production planning, and shop floor control."
              features={[
                'Multi-level Bill of Materials',
                'Work order management',
                'Production planning & scheduling',
                'Shop floor control',
                'Manufacturing cost tracking'
              ]}
            />
            <FeatureDetail
              title="Advanced Accounting"
              description="Full double-entry accounting with chart of accounts, journal entries, financial statements, and multi-currency support."
              features={[
                'Double-entry bookkeeping',
                'Customizable chart of accounts',
                'Multi-currency support',
                'Financial statements (P&L, Balance Sheet, Cash Flow)',
                'Bank reconciliation'
              ]}
            />
            <FeatureDetail
              title="Tax Compliance"
              description="Automated tax calculations and reporting for FBR, SRB, and PRA with built-in compliance rules for Pakistan."
              features={[
                'FBR Tier-1 compliant',
                'Automated GST/Sales Tax',
                'Withholding tax calculations',
                'Tax return generation',
                'Audit trail for tax authorities'
              ]}
            />
            <FeatureDetail
              title="Branded storefront & checkout"
              description="Launch a customer-facing shop that reflects your brand, with catalog, cart, checkout, and post-purchase pages aligned to your live stock and fulfilment rules."
              features={[
                'Domain-ready brand presence',
                'Same stock as POS and wholesale',
                'Order flow into one operations hub',
                'Customer-friendly policies & FAQs',
                'Designed for Pakistan-first journeys'
              ]}
            />
            <FeatureDetail
              title="POS, tables & kitchen coordination"
              description="Serve walk-in retail alongside cafés and dining—roles, permissions, and selling surfaces tuned for how mixed-format businesses actually operate."
              features={[
                'Fast in-store checkout',
                'Table-service and hospitality roles',
                'Kitchen and service handoffs',
                'Returns and voids with audit context',
                'Offline-friendly retail patterns'
              ]}
            />
          </div>
          <p className="text-center mt-12 text-sm text-gray-500 font-medium max-w-2xl mx-auto">
            See how TENVO compares to stitched storefront and suite stacks for business buyers on{' '}
            <Link href="/why-tenvo" className="text-brand-primary font-black hover:underline">Why TENVO</Link>.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection 
        variant="split"
        title="Ready to Transform Your Business?"
        subtitle="Join thousands of businesses already using TENVO to streamline their operations."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register'
        }}
        secondaryCTA={{
          text: 'View Pricing',
          href: '/pricing'
        }}
      />
    </MarketingLayout>
  );
}

function FeatureDetail({ title, description, features }) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
      <h4 className="text-2xl font-black text-gray-900 mb-3">{title}</h4>
      <p className="text-gray-500 font-medium mb-6">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <svg className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
