'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Calculator,
  Layers,
  FileSpreadsheet,
  Cpu,
  Receipt,
  Info,
  DollarSign
} from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';

// --- DATA DEFINITION FOR PRICING ---
const planFeatures = {
  free: [
    '20 Orders & Shipments / month',
    '1 Warehouse Location',
    'Basic Product Catalog (up to 100 SKUs)',
    'Smart Quick Add Modal',
    'Pre-configured Industry Templates',
    'Basic Excel Mode (100 rows import/mo)',
    'Standard inventory reports',
    '1 User Account',
  ],
  basic: [
    '1,000 Orders & Shipments / month',
    '2 Warehouse Locations',
    'Unlimited Product Catalog & SKUs',
    'Batch & Expiry Tracking (FIFO/LIFO/WAC)',
    'Full Excel Mode (Native upload, 5K rows/mo)',
    'FBR Sales Tax Compliance (GST 18%)',
    'Daraz Marketplace & WooCommerce Sync',
    '3 User Accounts (Basic Roles)',
  ],
  standard: [
    '5,000 Orders & Shipments / month',
    '5 Warehouse Locations',
    'Serial Number Tracking & History Logs',
    'Inter-Warehouse Transfers & Approval Workflows',
    'Shopify API direct integration',
    'Smart Restock Engine (AI Reorder alerts)',
    'Custom Product Price Lists per Client Class',
    '10 User Accounts (Advanced Permissions)',
  ],
  premium: [
    '25,000 Orders & Shipments / month',
    'Unlimited Warehouse Locations',
    'Manufacturing Module (BOM & COGM logs)',
    'Multi-Business Governance (up to 3 entities)',
    'AI-powered Demand Forecasting & Dead Stock detection',
    'Urdu UI dashboard toggle support',
    'Local Dedicated Cloud & Offline POS sync',
    'Unlimited Users',
  ],
  custom: [
    'Unlimited Orders & Shipments / month',
    'Unlimited Warehouse Locations',
    'Unlimited Business Entities & Brands',
    'Custom FBR Tier-1 dedicated integration',
    'Custom MCP Server for secure AI database access',
    'Dedicated 1-on-1 Customer Success Manager',
    '99.99% Priority SLA support contract',
    'Full custom ERP migration & database mapping',
  ],
};

const planCosts = {
  pkr: {
    monthly: { free: 0, basic: 4500, standard: 12500, premium: 28000, custom: 'Custom' },
    yearly: { free: 0, basic: 3600, standard: 9900, premium: 22000, custom: 'Custom' },
  },
  usd: {
    monthly: { free: 0, basic: 19, standard: 49, premium: 119, custom: 'Custom' },
    yearly: { free: 0, basic: 15, standard: 39, premium: 95, custom: 'Custom' },
  },
  inr: {
    monthly: { free: 0, basic: 1499, standard: 3999, premium: 8999, custom: 'Custom' },
    yearly: { free: 0, basic: 1199, standard: 3199, premium: 7199, custom: 'Custom' },
  },
  aed: {
    monthly: { free: 0, basic: 69, standard: 179, premium: 439, custom: 'Custom' },
    yearly: { free: 0, basic: 55, standard: 145, premium: 349, custom: 'Custom' },
  }
};

const currencySymbols = {
  pkr: 'Rs. ',
  usd: '$',
  inr: '₹',
  aed: 'AED '
};

const comparisonMatrix = [
  {
    category: 'Inventory Control',
    features: [
      { name: 'Smart SKU Generation', free: true, basic: true, standard: true, premium: true, custom: true },
      { name: 'Variants & Item Grouping', free: true, basic: true, standard: true, premium: true, custom: true },
      { name: 'Pre-configured Templates', free: true, basic: true, standard: true, premium: true, custom: true },
      { name: 'Batch & Expiry tracking', free: false, basic: true, standard: true, premium: true, custom: true },
      { name: 'Costing Methods (FIFO/LIFO/WAC)', free: false, basic: true, standard: true, premium: true, custom: true },
      { name: 'Serial Number Tracking', free: false, basic: false, standard: true, premium: true, custom: true },
      { name: 'Composite Items & Bundling', free: false, basic: false, standard: true, premium: true, custom: true },
      { name: 'Manufacturing & BOM module', free: false, basic: false, standard: false, premium: true, custom: true },
    ]
  },
  {
    category: 'Warehousing & Logistics',
    features: [
      { name: 'Warehouse Locations', free: '1 Location', basic: '2 Locations', standard: '5 Locations', premium: 'Unlimited', custom: 'Unlimited' },
      { name: 'Basic Stock Adjustments', free: true, basic: true, standard: true, premium: true, custom: true },
      { name: 'Excel Mode Sheet Importing', free: 'Basic (100 rows)', basic: 'Full (5,000 rows)', standard: 'Full (Unlimited)', premium: 'Full (Unlimited)', custom: 'Full (Unlimited)' },
      { name: 'Inter-Warehouse Transfers', free: false, basic: false, standard: true, premium: true, custom: true },
      { name: 'Transfer Approval Logs', free: false, basic: false, standard: 'Supervisor Approval', premium: 'Multi-stage Workflow', custom: 'Custom Workflow' },
      { name: 'Offline POS Syncing', free: false, basic: false, standard: false, premium: true, custom: true },
    ]
  },
  {
    category: 'Sales Channels & Accounting',
    features: [
      { name: 'Orders / Shipments limit', free: '20 / mo', basic: '1,000 / mo', standard: '5,000 / mo', premium: '25,000 / mo', custom: 'Unlimited' },
      { name: 'Daraz API integration', free: false, basic: true, standard: true, premium: true, custom: true },
      { name: 'WooCommerce integration', free: false, basic: true, standard: true, premium: true, custom: true },
      { name: 'Shopify direct integration', free: false, basic: false, standard: true, premium: true, custom: true },
      { name: 'FBR GST 18% Compliance', free: false, basic: true, standard: true, premium: true, custom: true },
      { name: 'Double-entry Accounting', free: false, basic: true, standard: true, premium: true, custom: true },
    ]
  },
  {
    category: 'Intelligence & Management',
    features: [
      { name: 'Standard Reports & Analytics', free: true, basic: true, standard: true, premium: true, custom: true },
      { name: 'Smart Margin-First Pricing', free: false, basic: true, standard: true, premium: true, custom: true },
      { name: 'Smart Restock Alerts (AI)', free: false, basic: false, standard: true, premium: true, custom: true },
      { name: 'Multi-Business Entities', free: '1 Entity', basic: '1 Entity', standard: '1 Entity', premium: 'Up to 3 Entities', custom: 'Unlimited' },
      { name: 'Predictive Demand Forecasts', free: false, basic: false, standard: false, premium: true, custom: true },
      { name: 'Urdu UI toggle support', free: false, basic: false, standard: false, premium: true, custom: true },
      { name: 'Custom MCP Server for AI Agent', free: false, basic: false, standard: false, premium: false, custom: true },
    ]
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const primaryHref = user ? '/multi-business' : '/register';
  
  // --- PRICING CONTROLS STATE ---
  const [billingInterval, setBillingInterval] = useState('yearly'); // 'monthly' | 'yearly'
  const [currency, setCurrency] = useState('pkr'); // 'pkr' | 'usd' | 'inr' | 'aed'
  const [showComparison, setShowComparison] = useState(false);

  // --- ROI CALCULATOR STATE ---
  const [employees, setEmployees] = useState(3);
  const [monthlyOrders, setMonthlyOrders] = useState(1500);
  const [fbrAuditRisk, setFbrAuditRisk] = useState(true);

  // ROI Math
  const getRoiMultiplier = () => {
    switch (currency) {
      case 'usd': return { wage: 8, leakage: 0.6, compliance: 250 };
      case 'inr': return { wage: 150, leakage: 35, compliance: 15000 };
      case 'aed': return { wage: 30, leakage: 2.2, compliance: 900 };
      case 'pkr':
      default:
        return { wage: 500, leakage: 120, compliance: 50000 };
    }
  };

  const mult = getRoiMultiplier();
  const estimatedHoursSaved = employees * 12; // 12 hours saved per clerk per month
  const operationalSavings = estimatedHoursSaved * mult.wage;
  const leakSavings = Math.round((monthlyOrders * mult.leakage) * 0.15); // 15% recovery on leakage
  const complianceRiskAvoidance = fbrAuditRisk ? mult.compliance : 0;
  const totalMonthlyROI = operationalSavings + leakSavings + complianceRiskAvoidance;

  // --- FAQ STATE ---
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <MarketingLayout transparentNav={false}>
      
      {/* 1. HERO HEADER SECTION - Clean Light Theme, No Gradients */}
      <section className="bg-white py-16 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-brand-primary">
            <ShieldCheck className="h-4 w-4" />
            Clear Plans & Dedicated Value
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-tight max-w-4xl mx-auto">
            Transparent pricing for <br className="hidden sm:inline" />
            serious operational teams.
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-neutral-500 font-medium leading-relaxed">
            Choose the perfect tier configured with TENVO&apos;s intelligent Excel-First, batch tracking, and FBR-certified capabilities. No surprise upgrades or hidden operational limits.
          </p>

          {/* DUAL PRICING TOGGLES (Currency Dropdown + Billing Interval) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            
            {/* Billing Interval Toggle (Monthly vs Yearly) */}
            <div className="bg-neutral-100 border border-neutral-200 p-1 rounded-2xl flex items-center shadow-sm">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  billingInterval === 'yearly'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Yearly
                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-normal">
                  -20%
                </span>
              </button>
            </div>

            {/* Currency Picker Dropdown Menu */}
            <div className="bg-neutral-100 border border-neutral-200 p-1.5 rounded-2xl flex items-center gap-2.5 shadow-sm">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 pl-3">Currency:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white border border-neutral-200 rounded-xl h-9 px-3 text-xs font-bold uppercase tracking-wider text-neutral-800 focus:border-brand-primary focus:outline-none transition-all cursor-pointer"
              >
                <option value="pkr">PKR (Rs.)</option>
                <option value="usd">USD ($)</option>
                <option value="inr">INR (₹)</option>
                <option value="aed">AED (د.إ)</option>
              </select>
            </div>

          </div>
        </div>
      </section>

      {/* 2. PLANS GRID - 5 Tiers (Free, Basic, Standard, Premium, Custom) */}
      <section className="bg-neutral-50 py-16 lg:py-24 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          
          <div className="grid lg:grid-cols-5 gap-6 items-stretch">
            
            {/* PLAN 1: FREE PLAN */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 flex flex-col justify-between hover:border-neutral-300 transition-colors shadow-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-neutral-400 text-xs uppercase tracking-widest">Free</h4>
                  <p className="text-xs text-neutral-500 font-semibold mt-1">For startups & micro-ops</p>
                </div>
                <div className="py-2 border-b border-neutral-100">
                  <span className="text-3xl font-black text-neutral-900">
                    {currencySymbols[currency]}0
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Forever Free</span>
                </div>
                
                {/* Features list */}
                <ul className="space-y-3 pt-2">
                  {planFeatures.free.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-600 font-semibold leading-tight">
                      <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Button asChild className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-xl h-11 text-xs uppercase tracking-wider">
                  <Link href={primaryHref}>Get Started</Link>
                </Button>
              </div>
            </div>

            {/* PLAN 2: BASIC PLAN */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 flex flex-col justify-between hover:border-neutral-300 hover:shadow-lg transition-all duration-300 shadow-sm group">
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-neutral-900 text-xs uppercase tracking-widest">Basic</h4>
                  <p className="text-xs text-neutral-500 font-semibold mt-1">For growing operations</p>
                </div>
                <div className="py-2 border-b border-neutral-100">
                  <span className="text-3xl font-black text-neutral-900">
                    {currencySymbols[currency]}{planCosts[currency][billingInterval].basic.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">
                    per month {billingInterval === 'yearly' && 'billed annually'}
                  </span>
                </div>
                
                {/* Features list */}
                <ul className="space-y-3 pt-2">
                  {planFeatures.basic.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-600 font-semibold leading-tight group/item">
                      <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Button asChild className="w-full bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-900 hover:to-neutral-950 text-white font-black rounded-xl h-11 text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group/btn">
                  <Link href={primaryHref} className="flex items-center justify-center gap-2">
                    Start Trial
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* PLAN 3: STANDARD PLAN (BEST VALUE / FEATURED) */}
            <div className="bg-gradient-to-b from-white to-brand-50/30 border-2 border-brand-primary rounded-3xl p-6 flex flex-col justify-between shadow-lg shadow-brand-primary/10 relative hover:shadow-xl hover:shadow-brand-primary/20 transition-all duration-300 hover:-translate-y-1 group">
              
              {/* Featured Badge */}
              <div className="absolute top-0 right-[10%] -translate-y-1/2 bg-gradient-to-r from-brand-primary to-brand-primary-dark text-white font-black text-[9px] uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                Most Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-brand-primary text-xs uppercase tracking-widest">Standard</h4>
                  <p className="text-xs text-neutral-500 font-semibold mt-1">For scaling warehouses</p>
                </div>
                <div className="py-2 border-b border-neutral-100">
                  <span className="text-3xl font-black text-neutral-900">
                    {currencySymbols[currency]}{planCosts[currency][billingInterval].standard.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">
                    per month {billingInterval === 'yearly' && 'billed annually'}
                  </span>
                </div>
                
                {/* Features list */}
                <ul className="space-y-3 pt-2">
                  {planFeatures.standard.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-800 font-bold leading-tight group/item">
                      <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5 group-hover/item:scale-110 group-hover/item:rotate-3 transition-all" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Button asChild className="w-full bg-gradient-to-r from-brand-primary to-brand-primary-dark hover:from-brand-primary-dark hover:to-brand-primary text-white font-black rounded-xl h-11 text-xs uppercase tracking-wider shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/40 transition-all duration-300 hover:-translate-y-0.5 group/btn">
                  <Link href={primaryHref} className="flex items-center justify-center gap-2">
                    Start Trial
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* PLAN 4: PREMIUM PLAN */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 flex flex-col justify-between hover:border-neutral-300 hover:shadow-lg transition-all duration-300 shadow-sm group">
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-neutral-900 text-xs uppercase tracking-widest">Premium</h4>
                  <p className="text-xs text-neutral-500 font-semibold mt-1">For full enterprise control</p>
                </div>
                <div className="py-2 border-b border-neutral-100">
                  <span className="text-3xl font-black text-neutral-900">
                    {currencySymbols[currency]}{planCosts[currency][billingInterval].premium.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">
                    per month {billingInterval === 'yearly' && 'billed annually'}
                  </span>
                </div>
                
                {/* Features list */}
                <ul className="space-y-3 pt-2">
                  {planFeatures.premium.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-600 font-semibold leading-tight group/item">
                      <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Button asChild className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-black rounded-xl h-11 text-xs uppercase tracking-wider">
                  <Link href={primaryHref}>Start Trial</Link>
                </Button>
              </div>
            </div>

            {/* PLAN 5: CUSTOM PLAN */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 flex flex-col justify-between hover:border-neutral-300 transition-colors shadow-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-neutral-400 text-xs uppercase tracking-widest">Enterprise</h4>
                  <p className="text-xs text-neutral-500 font-semibold mt-1">For customized volume</p>
                </div>
                <div className="py-2 border-b border-neutral-100">
                  <span className="text-3xl font-black text-neutral-900">Custom</span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Bespoke SLA contract</span>
                </div>
                
                {/* Features list */}
                <ul className="space-y-3 pt-2">
                  {planFeatures.custom.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-600 font-semibold leading-tight">
                      <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Button asChild className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black rounded-xl h-11 text-xs uppercase tracking-wider border border-neutral-200">
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. INTERACTIVE ROI SAVINGS CALCULATOR */}
      <section className="bg-white py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-neutral-50 border-2 border-neutral-200/90 rounded-[2.5rem] p-8 sm:p-12 shadow-sm space-y-10">
            
            <div className="text-center space-y-3">
              <h3 className="text-2xl sm:text-3xl font-black text-neutral-900">
                Calculate your TENVO operational ROI.
              </h3>
              <p className="text-sm text-neutral-500 font-semibold">
                See exactly how much money and manual labor hours your team saves by automating operations.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              
              {/* Sliders Box */}
              <div className="space-y-6">
                
                {/* Slider 1: Operators */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Inventory & Billing clerks</label>
                    <span className="text-xs font-bold text-neutral-800">{employees} Operators</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={employees}
                    onChange={(e) => setEmployees(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>

                {/* Slider 2: Orders */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Orders Processed / Month</label>
                    <span className="text-xs font-bold text-neutral-800">{monthlyOrders.toLocaleString()} Orders</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="20000"
                    step="500"
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                </div>

                {/* Switch: FBR Audit Audit Risks */}
                <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-700 block">FBR compliance safety</label>
                    <span className="text-[10px] text-neutral-400 font-semibold">Factor in tax filing audit errors risk reduction</span>
                  </div>
                  <button
                    onClick={() => setFbrAuditRisk(!fbrAuditRisk)}
                    className={`w-12 h-6 rounded-full p-1 transition-all ${fbrAuditRisk ? 'bg-brand-primary' : 'bg-neutral-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-all ${fbrAuditRisk ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

              </div>

              {/* Output Savings Result Box */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center space-y-4 shadow-sm h-full flex flex-col justify-center">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Total Monthly Savings Estimate</p>
                <div className="text-3xl sm:text-4xl font-black text-emerald-600">
                  {currencySymbols[currency]}
                  {totalMonthlyROI.toLocaleString()}
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-semibold">
                  By saving <strong className="text-neutral-800">{estimatedHoursSaved} hours</strong> of operational clerical labor, automating inventory shrinkage leakage, and eliminating human compliance filing mistakes.
                </p>
                <div className="border-t border-neutral-100 pt-4 mt-2">
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Ready to scale with precision
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 4. EXPANDABLE PLATFORM COMPARISON MATRIX (Zoho Clone) */}
      <section className="bg-neutral-50 py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 space-y-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900">
              Compare plans in exhaustive detail.
            </h3>
            <p className="text-sm text-neutral-500 font-semibold">
              Review exactly what capabilities are supported in each plan to find the perfect fit.
            </p>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="px-6 py-3 bg-white border border-neutral-200 rounded-xl text-xs font-black uppercase tracking-wider text-neutral-800 hover:border-brand-primary inline-flex items-center gap-2 shadow-sm transition-all"
            >
              {showComparison ? 'Hide Feature Matrix' : 'Show Complete Feature Matrix'}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showComparison ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showComparison && (
            <div className="bg-white border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 overflow-x-auto shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              
              {comparisonMatrix.map((cat, catIdx) => (
                <div key={catIdx} className={catIdx > 0 ? 'mt-10' : ''}>
                  
                  {/* Category Header */}
                  <h4 className="bg-neutral-50 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-neutral-500 mb-4">
                    {cat.category}
                  </h4>

                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-neutral-100 font-black text-[9px] uppercase tracking-wider text-neutral-400">
                        <th className="p-3 w-[30%]">Capability Name</th>
                        <th className="p-3 text-center">Free</th>
                        <th className="p-3 text-center">Basic</th>
                        <th className="p-3 text-center text-brand-primary">Standard</th>
                        <th className="p-3 text-center">Premium</th>
                        <th className="p-3 text-center">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.features.map((feat, featIdx) => (
                        <tr key={featIdx} className="border-b border-neutral-50 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                          <td className="p-3 font-semibold text-neutral-800">{feat.name}</td>
                          
                          {/* Free cell */}
                          <td className="p-3 text-center">
                            {typeof feat.free === 'boolean' ? (
                              feat.free ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300 font-black">-</span>
                            ) : feat.free}
                          </td>

                          {/* Basic cell */}
                          <td className="p-3 text-center">
                            {typeof feat.basic === 'boolean' ? (
                              feat.basic ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300 font-black">-</span>
                            ) : feat.basic}
                          </td>

                          {/* Standard cell */}
                          <td className="p-3 text-center text-brand-primary font-bold">
                            {typeof feat.standard === 'boolean' ? (
                              feat.standard ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300 font-black">-</span>
                            ) : feat.standard}
                          </td>

                          {/* Premium cell */}
                          <td className="p-3 text-center">
                            {typeof feat.premium === 'boolean' ? (
                              feat.premium ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300 font-black">-</span>
                            ) : feat.premium}
                          </td>

                          {/* Custom cell */}
                          <td className="p-3 text-center">
                            {typeof feat.custom === 'boolean' ? (
                              feat.custom ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300 font-black">-</span>
                            ) : feat.custom}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              ))}

            </div>
          )}

        </div>
      </section>

      {/* 5. PRICING SPECFIC FAQ - Pure Light Theme */}
      <section className="bg-white py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Billing & Payments FAQ</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              Pricing Questions? Answered.
            </h3>
            <p className="text-sm text-neutral-500 font-semibold">
              Read how billing cycles, local tax regulations, and migration setups operate.
            </p>
          </div>

          <div className="space-y-4">
            
            {/* FAQ Item 1 */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">Can we pay locally inside Pakistan in Rupees (PKR)?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 0 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 0 && (
                <div className="p-6 pt-0 border-t border-neutral-200">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    Yes, absolutely! While international platforms force credit card payments in USD causing extreme currency inflation rates and additional bank fees, TENVO natively supports bank transfers, pay orders, and online local card payments directly in PKR. Annual subscription invoices can be paid via direct wire transfer.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">What are the FBR setup costs for Tier-1 retailers?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 1 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 1 && (
                <div className="p-6 pt-0 border-t border-neutral-200">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    FBR sales tax calculations (standard 18% GST) and localized tax reporting exports are fully included for free in our **Basic, Standard, and Premium plans**. If you require custom hardware POS FBR Tier-1 dedicated integration, our technical crew can facilitate custom setup under the Enterprise custom plan.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">Is there a setup or data migration fee?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 2 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 2 && (
                <div className="p-6 pt-0 border-t border-neutral-200">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    Data migration for all custom Excel lists, vendor files, customer databases, and product inventories is **100% free** for all Standard and Premium annual plan clients. A dedicated human migration success manager will coordinate data imports and duplicate SKU verification audits with your warehouse team.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">What happens if we exceed our order limits?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 3 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 3 && (
                <div className="p-6 pt-0 border-t border-neutral-200">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    We will never freeze your live operations or block invoices mid-day if you exceed limits! If your business grows and exceeds the tier&apos;s order limits, our system automatically flags a notification and allows a grace period, letting you gracefully transition to the next plan or contact support for a tailored custom quota adjustment.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* 6. HIGH-IMPACT FINAL CALL-TO-ACTION */}
      <section className="bg-neutral-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          
          <div className="bg-white border border-neutral-200/80 rounded-[3rem] p-8 sm:p-12 lg:p-16 text-center space-y-6 relative overflow-hidden shadow-sm">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.32em]">Start your operational audit</h2>
            <h3 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight max-w-4xl mx-auto">
              Ready to automate your warehouse operations?
            </h3>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
              Sign up today and get 14 days of full Standard plan features for free. Swap spreadsheets for precision order fulfillment.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 text-base font-black uppercase tracking-[0.15em] shadow-md transition-all">
                <Link href={primaryHref}>Start 14-day Free Trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-neutral-300 bg-white hover:border-brand-primary hover:text-brand-primary px-8 text-base font-black uppercase tracking-[0.15em] transition-all">
                <Link href="/demo">Book 1-on-1 Demo Session</Link>
              </Button>
            </div>

            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              No credit card required &bull; Free data imports included &bull; Cancel any time
            </p>
          </div>

        </div>
      </section>

    </MarketingLayout>
  );
}
