'use client';

import Link from 'next/link';
import { 
  ShoppingCart, 
  Store, 
  MessageSquare, 
  Globe, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Building2,
  Plug
} from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';

const integrations = [
  {
    name: 'FBR POS / Tax Sync',
    category: 'Compliance',
    icon: ShieldCheck,
    color: 'text-brand-primary',
    bg: 'bg-brand-50',
    border: 'border-brand-200',
    description: 'Direct Tier-1 integration with Federal Board of Revenue. Automatically transmit invoices in real-time to generate FBR invoices with QR codes.',
    status: 'Live',
    features: ['Real-time Invoice Sync', 'SRB / PRA Support', 'Automated Daily Summaries']
  },
  {
    name: 'Shopify',
    category: 'E-Commerce',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Keep your Shopify storefront perfectly synced with your warehouse. Push price updates and pull orders automatically.',
    status: 'Live',
    features: ['Bi-directional Stock Sync', 'Order Import', 'Price List Mapping']
  },
  {
    name: 'Daraz',
    category: 'Marketplace',
    icon: Store,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    description: 'Manage Daraz orders directly inside Tenvo. Avoid stockouts and penalizations by updating your Daraz inventory instantly.',
    status: 'Live',
    features: ['Automated Inventory Sync', 'Order Processing', 'RTS Label Generation']
  },
  {
    name: 'WooCommerce',
    category: 'E-Commerce',
    icon: Globe,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    description: 'Connect your self-hosted WordPress store. Manage products in Tenvo and publish them directly to WooCommerce.',
    status: 'Live',
    features: ['Catalog Sync', 'Variant Mapping', 'Real-time Stock Updates']
  },
  {
    name: 'WhatsApp Business',
    category: 'Communication',
    icon: MessageSquare,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    description: 'Send invoices, payment links, and delivery updates directly to your customers via WhatsApp automatically.',
    status: 'Beta',
    features: ['PDF Invoice Delivery', 'Payment Reminders', 'Order Status Alerts']
  },
  {
    name: 'Bank Feeds',
    category: 'Finance',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Connect your corporate bank accounts via API to pull daily statements and automate the reconciliation process.',
    status: 'Coming Q3',
    features: ['Statement Parsing', 'Auto-Reconciliation', 'Transaction Matching']
  }
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const primaryHref = user ? '/multi-business' : '/register';
  const primaryText = user ? 'GO TO DASHBOARD' : 'START FREE TRIAL';

  return (
    <MarketingLayout transparentNav={false}>
      
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge={{ text: 'Ecosystem Connectivity', icon: 'Plug' }}
        title={
          <>
            Connect Tenvo to your <span className="text-brand-primary">entire stack</span>
          </>
        }
        subtitle="Automate your operations by connecting your e-commerce stores, marketplaces, and compliance agencies directly to your ERP core."
      />

      {/* Grid Section */}
      <section className="bg-neutral-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {integrations.map((integration, idx) => (
              <div key={idx} className="bg-white border border-neutral-200/80 rounded-3xl p-8 hover:border-brand-primary hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${integration.bg} ${integration.border} border flex items-center justify-center`}>
                    <integration.icon className={`w-7 h-7 ${integration.color}`} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                    integration.status === 'Live' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    integration.status === 'Beta' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-neutral-100 text-neutral-600 border border-neutral-200'
                  }`}>
                    {integration.status}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{integration.category}</p>
                    <h3 className="text-2xl font-black text-neutral-900">{integration.name}</h3>
                  </div>
                  <p className="text-sm font-medium text-neutral-600 leading-relaxed">
                    {integration.description}
                  </p>
                </div>

                {/* Features List */}
                <div className="mt-8 pt-6 border-t border-neutral-100 space-y-3">
                  {integration.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary flex-shrink-0" />
                      <span className="text-sm font-semibold text-neutral-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Developer API CTA */}
      <section className="bg-white border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="bg-neutral-900 rounded-[3rem] p-8 sm:p-12 lg:p-16 text-center space-y-6 relative overflow-hidden shadow-2xl">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 space-y-6">
              <Zap className="w-12 h-12 text-amber-400 mx-auto" />
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Need a custom integration?</h2>
              <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-300 font-medium leading-relaxed">
                Our RESTful API and Webhooks allow your development team to connect Tenvo with any proprietary software or legacy system. We also offer dedicated MCP Servers for AI agent access.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 text-base font-black uppercase tracking-[0.15em] shadow-md transition-all border-none">
                  <Link href={primaryHref}>{primaryText}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-2 border-neutral-700 bg-transparent hover:bg-neutral-800 text-white hover:text-white px-8 text-base font-black uppercase tracking-[0.15em] transition-all">
                  <Link href="/contact">TALK TO SALES</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </MarketingLayout>
  );
}
