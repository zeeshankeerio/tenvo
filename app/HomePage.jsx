'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  FileSpreadsheet,
  Info,
  Package,
  Receipt,
  Settings,
  Truck,
  X,
} from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import {
  MARKETING_CONTAINER,
  MARKETING_EYEBROW,
  MARKETING_MAIN_BOTTOM_STICKY,
  MARKETING_SECTION_HEADING,
  MARKETING_STAT_VALUE,
} from '@/lib/utils/marketingLayout';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import CommerceAndIntelligenceSection from '@/components/marketing/sections/CommerceAndIntelligenceSection';
import CompetitorComparisonSection from '@/components/marketing/sections/CompetitorComparisonSection';
import HomeHero from '@/components/marketing/sections/HomeHero';
import HomeTrustStrip from '@/components/marketing/sections/HomeTrustStrip';
import HomeProductDemoSection from '@/components/marketing/sections/HomeProductDemoSection';
import HomeIntegrationMarquee from '@/components/marketing/sections/HomeIntegrationMarquee';
import HomeToolkitSection from '@/components/marketing/sections/HomeToolkitSection';
import HomeIndustrySolutionsSection from '@/components/marketing/sections/HomeIndustrySolutionsSection';
import HomeOnboardingPathSection from '@/components/marketing/sections/HomeOnboardingPathSection';
import HomeSecurityTrustSection from '@/components/marketing/sections/HomeSecurityTrustSection';
import { DemoStoreGallery } from '@/components/marketing/sections/DemoStoreGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';
import { trackEvent, EVENTS } from '@/lib/analytics/tracking';
import { cn } from '@/lib/utils';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import {
  ScrollReveal,
  AnimatedCounter,
  ScrollProgress,
  GradientMesh,
  ScrollIndicator,
  CardLift,
  PulseDot,
} from '@/components/marketing/effects/ModernEffects';

export default function Home() {
  const { user } = useAuth();
  const workspaceHref = user ? '/multi-business' : '/register';
  const workspaceCtaMobile = user ? 'Open workspace' : 'Start free';
  const workspaceCtaDesktop = user ? 'Open workspace' : 'Start free';

  const trackHeroCta = (kind, href) => {
    trackEvent(EVENTS.HERO_CTA_CLICK, {
      cta_location: 'home_hero',
      cta_kind: kind,
      cta_destination: href,
    });
  };

  // --- STATE FOR INTERACTIVE COMPONENTS ---
  const [stickyCtaScrollReady, setStickyCtaScrollReady] = useState(false);
  const [stickyCtaDismissed, setStickyCtaDismissed] = useState(false);
  const STICKY_CTA_DISMISS_KEY = 'tenvo_sticky_cta_dismissed_session';

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(STICKY_CTA_DISMISS_KEY) === '1') {
        setStickyCtaDismissed(true);
      }
    } catch {
      /* ignore private mode */
    }
  }, []);

  const dismissStickyCta = () => {
    setStickyCtaDismissed(true);
    try {
      sessionStorage.setItem(STICKY_CTA_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const showStickyCta = stickyCtaScrollReady && !stickyCtaDismissed;

  // Sticky CTA scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setStickyCtaScrollReady(window.scrollY > 600);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cost & Margin Calculator State
  const [calcCost, setCalcCost] = useState(1200);
  const [calcMargin, setCalcMargin] = useState(25);
  const [calcTaxRate, setCalcTaxRate] = useState(18); // FBR standard GST 18%

  // Live calculations
  const marginAmount = Math.round((calcCost * calcMargin) / 100);
  const basePrice = Number(calcCost) + Number(marginAmount);
  const taxAmount = Math.round((basePrice * calcTaxRate) / 100);
  const finalSellingPrice = basePrice + taxAmount;

  // Excel Paste Simulator State
  const [excelRows, setExcelRows] = useState([
    { sku: 'TNV-SH-001', name: 'Cotton Crew Neck Shirt', stock: 120, status: 'pending', error: '' },
    { sku: 'TNV-SH-002', name: 'Premium Denim Jeans', stock: 85, status: 'pending', error: '' },
    { sku: 'TNV-SH-001', name: 'Duplicate Cotton Shirt', stock: 50, status: 'pending', error: '' }, // Intentional duplicate to demonstrate verification
    { sku: 'TNV-SH-004', name: 'Linen Casual Blazer', stock: 40, status: 'pending', error: '' },
  ]);
  const [isSimulatingExcel, setIsSimulatingExcel] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('idle'); // idle, processing, done

  // --- LIVE OPERATIONS TERMINAL STATES ---
  const [activeTerminalTab, setActiveTerminalTab] = useState('stocktake');
  const [scanStatus, setScanStatus] = useState('idle');
  const [jeansStock, setJeansStock] = useState(120);
  const [poStatus, setPoStatus] = useState('idle');
  const [terminalFbrAmount, setTerminalFbrAmount] = useState(25000);
  const [selectedBox, setSelectedBox] = useState('standard');

  const triggerScan = () => {
    setScanStatus('scanning');
    setTimeout(() => {
      setScanStatus('done');
    }, 1500);
  };

  const triggerPO = () => {
    setPoStatus('generating');
    setTimeout(() => {
      setPoStatus('sent');
    }, 1500);
  };

  const runExcelSimulation = () => {
    setIsSimulatingExcel(true);
    setSimulationStatus('processing');

    // Simulate line-by-line smart FBR/SKU validation
    setTimeout(() => {
      setExcelRows(prev => prev.map((row, idx) => {
        if (idx === 2) {
          return { ...row, status: 'failed', error: 'Duplicate SKU detected: TNV-SH-001 is already allocated' };
        }
        return { ...row, status: 'success' };
      }));
      setSimulationStatus('done');
      setIsSimulatingExcel(false);
    }, 2000);
  };

  const resetExcelSimulation = () => {
    setExcelRows([
      { sku: 'TNV-SH-001', name: 'Cotton Crew Neck Shirt', stock: 120, status: 'pending', error: '' },
      { sku: 'TNV-SH-002', name: 'Premium Denim Jeans', stock: 85, status: 'pending', error: '' },
      { sku: 'TNV-SH-001', name: 'Duplicate Cotton Shirt', stock: 50, status: 'pending', error: '' },
      { sku: 'TNV-SH-004', name: 'Linen Casual Blazer', stock: 40, status: 'pending', error: '' },
    ]);
    setSimulationStatus('idle');
  };

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <MarketingLayout transparentNav={true} mainBottomClass={MARKETING_MAIN_BOTTOM_STICKY}>

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* STICKY CTA - mobile: 3-col grid (Book | Trial | Close) + generous pr for assistant FAB; sm+: strip layout */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white shadow-[0_-3px_16px_-6px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out ${showStickyCta ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto grid min-w-0 max-w-7xl grid-cols-1 items-center gap-y-2 px-[max(1rem,env(safe-area-inset-left))] py-2 pr-[calc(5rem+env(safe-area-inset-right,0px))] sm:flex sm:flex-row sm:gap-4 sm:py-2.5 sm:pl-8 sm:pr-[calc(8rem+env(safe-area-inset-right,0px))] md:pl-10 lg:px-12 lg:pr-[calc(10rem+env(safe-area-inset-right,0px))]">
          <div className="hidden min-w-0 flex-1 items-center gap-2.5 sm:flex sm:gap-3">
            <div className="shrink-0 translate-y-px">
              <TenvoTextLogo compact iconClassName="shadow-sm" />
            </div>
            <div className="min-w-0 border-l border-neutral-200 pl-2.5 sm:pl-3">
              <p className="text-[13px] font-bold leading-tight text-neutral-900">Ready to streamline your operations?</p>
              <p className="text-[11px] font-medium leading-snug text-neutral-500">
                Storefront, POS, inventory, and finance in one workspace.
              </p>
            </div>
          </div>

          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:flex-1 sm:justify-end sm:gap-2.5">
            <Button
              asChild
              variant="outline"
              className="h-10 min-w-0 shrink rounded-lg border-neutral-300 px-2 text-[11px] font-bold leading-tight sm:h-9 sm:px-4 sm:text-sm"
            >
              <MarketingCtaLink
                href={getBookMeetingHref()}
                className="block truncate text-center"
                onClick={() => trackHeroCta('sticky_book_meeting', getBookMeetingHref())}
              >
                Book a meeting
              </MarketingCtaLink>
            </Button>
            <Button
              asChild
              className="h-10 min-w-0 shrink rounded-lg bg-brand-primary px-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-white hover:bg-brand-primary-dark sm:h-9 sm:max-w-[13rem] sm:px-4 sm:text-xs"
            >
              <Link
                href={workspaceHref}
                className="block truncate text-center"
                onClick={() => trackHeroCta('sticky_workspace', workspaceHref)}
              >
                {user ? 'Workspace' : 'Start free'}
              </Link>
            </Button>
            <button
              type="button"
              onClick={dismissStickyCta}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200/90 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 sm:h-9 sm:w-9"
              aria-label="Close promotion bar"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden">
        <GradientMesh variant="hero" />
        
        <div className="relative z-10">
          <HomeHero
            workspaceHref={workspaceHref}
            workspaceCtaMobile={workspaceCtaMobile}
            workspaceCtaDesktop={workspaceCtaDesktop}
          />
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <ScrollIndicator />
        </div>
      </section>

      <ScrollReveal direction="fade" threshold={0.3}>
        <HomeTrustStrip />
      </ScrollReveal>

      <ScrollReveal direction="up" threshold={0.2}>
        <CommerceAndIntelligenceSection />
      </ScrollReveal>

      <ScrollReveal direction="up" threshold={0.2}>
        <DemoStoreGallery variant="featured" />
      </ScrollReveal>

      <ScrollReveal direction="up" threshold={0.2}>
        <HomeProductDemoSection />
      </ScrollReveal>

      <ScrollReveal direction="up" threshold={0.2}>
        <CompetitorComparisonSection />
      </ScrollReveal>

      <ScrollReveal direction="up" threshold={0.2}>
        <HomeToolkitSection />
      </ScrollReveal>

      {/* 4. EXCEL-FIRST & SPREADSHEET POWER SIMULATOR */}
      <section className="relative bg-neutral-50 border-b border-neutral-200/80 py-10 sm:py-16 lg:py-28 overflow-hidden">
        <GradientMesh variant="subtle" />
        <div className={cn(MARKETING_CONTAINER, 'relative z-10')}>
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">

            {/* Left Content column */}
            <ScrollReveal direction="left" threshold={0.2} className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-800">
                <FileSpreadsheet className="h-4 w-4" />
                Excel-First Capability
              </div>
              <h3 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
                No more manual data-entry agony.
              </h3>
              <p className="text-base text-neutral-600 font-medium leading-relaxed">
                Most platforms break when you upload an Excel sheet. TENVO has a native, full-screen Excel Mode that lets you copy-paste rows directly from your existing spreadsheets, perform bulk operations, and validates every single cell with crystal clear feedback.
              </p>

              <ul className="space-y-3 font-semibold text-neutral-700">
                {[
                  'Direct Excel (.xlsx) file drag-and-drop',
                  'Real-time cell error reporting (Row & Column)',
                  '100% round-trip validation guarantee',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2 pt-4">
                <Button
                  onClick={runExcelSimulation}
                  disabled={simulationStatus === 'processing'}
                  className="h-11 rounded-xl bg-brand-primary px-5 font-semibold uppercase tracking-wider text-white hover:bg-brand-primary-dark hover:scale-[1.02] active:scale-100 transition-all sm:h-12 sm:rounded-2xl sm:px-6"
                >
                  {simulationStatus === 'processing' ? 'Validating Sheet...' : 'Simulate Excel Upload'}
                </Button>
                {simulationStatus !== 'idle' && (
                  <Button onClick={resetExcelSimulation} variant="ghost" className="ml-0 font-bold text-neutral-500 sm:ml-2">
                    Reset
                  </Button>
                )}
              </div>
            </ScrollReveal>

            {/* Right Simulator column */}
            <ScrollReveal direction="right" threshold={0.2} className="min-w-0 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-6 lg:col-span-7 lg:rounded-[2.5rem]">
              <div className="mb-4 flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-neutral-900 sm:text-lg">Spreadsheet Import Preview</h4>
                  <p className="mt-0.5 text-[11px] font-semibold text-neutral-500 sm:text-xs">Validating 4 lines of imported products</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                  <PulseDot
                    color={simulationStatus === 'idle' ? 'neutral-300' : simulationStatus === 'processing' ? 'amber-400' : 'emerald-500'}
                    size="sm"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 sm:text-xs">
                    {simulationStatus === 'idle' ? 'Ready to parse' :
                      simulationStatus === 'processing' ? 'Validating FBR & SKU' : 'Partial Import Available'}
                  </span>
                </div>
              </div>

              {/* Mobile: card list */}
              <div className="space-y-2.5 lg:hidden">
                {excelRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xl border p-3 transition-colors duration-300',
                      row.status === 'failed' ? 'border-red-200 bg-red-50/40' :
                      row.status === 'success' ? 'border-emerald-200/80 bg-emerald-50/30' :
                      'border-neutral-100 bg-neutral-50/60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-neutral-900">{row.sku}</span>
                      {row.status === 'pending' && <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Pending</span>}
                      {row.status === 'success' && <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Ready</span>}
                      {row.status === 'failed' && <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-700">Error</span>}
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-neutral-800">{row.name}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wide text-neutral-400">Initial stock</span>
                      <span className="font-bold tabular-nums text-neutral-900">{row.stock}</span>
                    </div>
                    {row.error ? <p className="mt-2 text-[10px] font-semibold leading-relaxed text-red-700">{row.error}</p> : null}
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-0 border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      <th className="p-3">SKU Code</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Initial Stock</th>
                      <th className="p-3">Import Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, idx) => (
                      <tr key={idx} className={cn(
                        'border-b border-neutral-100 text-xs font-medium text-neutral-800 transition-colors duration-300',
                        row.status === 'failed' ? 'bg-red-50/30' :
                        row.status === 'success' ? 'bg-emerald-50/20' :
                        'hover:bg-neutral-50'
                      )}>
                        <td className="p-3 font-mono font-bold">{row.sku}</td>
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 font-bold tabular-nums">{row.stock}</td>
                        <td className="p-3">
                          {row.status === 'pending' && <span className="rounded bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Pending</span>}
                          {row.status === 'success' && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Ready</span>}
                          {row.status === 'failed' && <span className="rounded bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-700">Error</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {simulationStatus === 'done' && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 sm:rounded-2xl sm:p-4 animate-fade-in-up">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-red-900">SKU Duplication Error found (Row 3)</h5>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-red-700">
                      TENVO caught a critical SKU collision. Import only the 3 valid rows and download a fixed Excel sheet with highlighted columns to resolve.
                    </p>
                  </div>
                </div>
              )}
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE MARGIN-FIRST PRICING CALCULATOR */}
      <section className="relative bg-white border-b border-neutral-200/80 py-10 sm:py-16 lg:py-28 overflow-hidden">
        <GradientMesh variant="subtle" />
        <div className={cn(MARKETING_CONTAINER, 'relative z-10')}>
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left Interactive Simulator */}
            <ScrollReveal direction="left" threshold={0.2} className="lg:col-span-6 bg-neutral-50 border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 order-2 lg:order-1">
              <h4 className="font-semibold text-neutral-900 text-xl mb-6">Interactive Margin-First Engine</h4>
              <div className="space-y-6">

                <div className="group">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 group-hover:text-brand-primary transition-colors duration-200">Unit Cost (PKR)</label>
                    <span className="text-xs font-mono font-bold text-neutral-800 tabular-nums">PKR {calcCost.toLocaleString()}</span>
                  </div>
                  <input type="range" min="100" max="10000" step="50" value={calcCost}
                    onChange={(e) => setCalcCost(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-1">
                    <span>PKR 100</span><span>PKR 10,000</span>
                  </div>
                </div>

                <div className="group">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 group-hover:text-brand-primary transition-colors duration-200">Target Profit Margin (%)</label>
                    <span className="text-xs font-mono font-bold text-neutral-800 tabular-nums">{calcMargin}%</span>
                  </div>
                  <input type="range" min="5" max="80" step="1" value={calcMargin}
                    onChange={(e) => setCalcMargin(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-1">
                    <span>5%</span><span>80%</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">FBR Sales Tax GST (%)</label>
                    <span className="text-xs font-mono font-bold text-neutral-800 tabular-nums">{calcTaxRate}%</span>
                  </div>
                  <select value={calcTaxRate} onChange={(e) => setCalcTaxRate(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-neutral-200 bg-white rounded-xl text-sm font-bold text-neutral-800 transition-colors hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                    <option value={0}>0% (Tax Exempt / Exports)</option>
                    <option value={15}>15% (Local Sales Tax)</option>
                    <option value={18}>18% (Standard FBR GST)</option>
                  </select>
                </div>

                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between text-xs font-semibold text-neutral-500 border-b border-neutral-100 pb-2">
                    <span>Target Profit Margin</span>
                    <span className="font-semibold tabular-nums text-neutral-800">PKR {marginAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-neutral-500 border-b border-neutral-100 pb-2">
                    <span>FBR Standard GST Tax</span>
                    <span className="font-semibold tabular-nums text-neutral-800">PKR {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold text-neutral-900 pt-1">
                    <span>Final Retail Price</span>
                    <span className={cn(MARKETING_STAT_VALUE, 'text-xl text-brand-primary tabular-nums')}>
                      PKR {finalSellingPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right Content Column */}
            <ScrollReveal direction="right" threshold={0.2} className="lg:col-span-6 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-primary">
                <Receipt className="h-4 w-4" />
                Margin-First Strategy
              </div>
              <h3 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
                Margin-first pricing protects your bottom line.
              </h3>
              <p className="text-base text-neutral-600 font-medium leading-relaxed">
                With inflation and supply chain volatility, inventory cost shifts happen daily in Pakistan. TENVO handles this elegantly. Rather than setting static prices that drift into loss, you define your target profit margin per product category. When vendor cost rises, TENVO recalculates optimal selling prices automatically.
              </p>
              <ul className="space-y-3 font-semibold text-neutral-700">
                {[
                  'Automatic price adjustment based on live product costs',
                  'Built-in local FBR sales tax (GST) calculations',
                  'Real-time margin safety reports on owner dashboards',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-primary shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* 5.5 LIVE WAREHOUSE OPERATIONAL SIMULATOR */}
      <section className="relative bg-white border-b border-neutral-200/80 py-10 sm:py-16 lg:py-28 overflow-hidden">
        <GradientMesh variant="subtle" />
        <div className={cn(MARKETING_CONTAINER, 'relative z-10')}>

          <ScrollReveal direction="up" threshold={0.2}>
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-800">
                <Cpu className="h-4 w-4" /> Live Operational Terminal
              </div>
              <h3 className={MARKETING_SECTION_HEADING}>
                Test drive the TENVO operating system.
              </h3>
              <p className="text-lg text-neutral-500 font-medium">
                We built an advanced operations engine. Interact with the demo terminal below to see Excel import, replenishment drafts, and GST invoice previews.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-12 gap-12 items-stretch">

            {/* Left Controls column */}
            <div className="lg:col-span-4 space-y-3 flex flex-col justify-center">

              {[
                { key: 'stocktake', Icon: Package, label: '1. Scan & Reconcile', desc: 'Simulate stock count audits and damaged inventory adjustments.' },
                { key: 'reorder', Icon: Settings, label: '2. Low Stock â†’ Auto PO', desc: 'Watch the system draft supplier purchase orders when inventory falls low.' },
                { key: 'fbr', Icon: Receipt, label: '3. GST Invoice Preview', desc: 'Receipt-style preview with standard 18% GST math on live invoices.' },
                { key: 'packaging', Icon: Truck, label: '4. Intelligent Packaging', desc: 'Auto-calculate box size limits and print carrier labels (TCS/Leopards).' },
              ].map(({ key, Icon, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setActiveTerminalTab(key)}
                  className={cn(
                    'w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4',
                    activeTerminalTab === key
                      ? 'bg-neutral-50 border-brand-primary shadow-sm scale-[1.01]'
                      : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50/50'
                  )}
                >
                  <div className={cn(
                    'p-3 rounded-xl transition-colors duration-200',
                    activeTerminalTab === key ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-neutral-900">{label}</h4>
                    <p className="text-xs text-neutral-500 mt-1 font-semibold">{desc}</p>
                  </div>
                </button>
              ))}

            </div>

            {/* Right Interactive Console display */}
            <div className="lg:col-span-8 bg-neutral-50 border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 flex flex-col justify-between shadow-sm min-h-[460px]">

              {/* TERMINAL CONTENT FOR TAB 1: STOCKTAKE SCAN */}
              {activeTerminalTab === 'stocktake' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-brand-primary uppercase tracking-widest block">Barcode Stocktake Audit</span>
                    <h4 className="font-semibold text-2xl text-neutral-900">Prevent shrinkage with rapid reconciliation.</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      Manual audits are prone to errors. With TENVO, click scan to simulate shelf audit:
                    </p>
                  </div>

                  {/* Stocktake Terminal Box */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm my-4">
                    <div className="flex justify-between items-center text-xs font-mono font-bold text-neutral-500 border-b border-neutral-100 pb-2">
                      <span>SKU: TNV-SH-001 (Cotton Crew Neck)</span>
                      <span className="text-brand-primary">Gulberg Lahore Warehouse</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                        <span className="text-[10px] font-semibold uppercase text-neutral-400">System Expected</span>
                        <p className={cn(MARKETING_STAT_VALUE, 'text-neutral-800')}>150 Units</p>
                      </div>
                      <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                        <span className="text-[10px] font-semibold uppercase text-neutral-400">Physical Scanned</span>
                        <p className={cn(MARKETING_STAT_VALUE, 'text-neutral-800')}>
                          {scanStatus === 'done' ? '148 Units' : '---'}
                        </p>
                      </div>
                    </div>

                    {/* Laser scanning visual simulation */}
                    {scanStatus === 'scanning' && (
                      <div className="h-10 border border-amber-300 bg-amber-50 rounded-xl flex items-center justify-center relative overflow-hidden animate-pulse">
                        <div className="absolute inset-y-0 left-0 w-2 bg-amber-400 animate-[ping_1.5s_infinite]" />
                        <span className="text-xs font-mono font-bold text-amber-800 uppercase tracking-widest animate-pulse">Scanning barcode SN-903124...</span>
                      </div>
                    )}

                    {scanStatus === 'done' && (
                      <div className="p-4 border border-red-200 bg-red-50 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-red-900 uppercase">
                          <Info className="w-4 h-4 text-red-700" /> Stock Discrepancy Found (-2 units)
                        </div>
                        <p className="text-xs text-red-700 leading-relaxed font-semibold">
                          System automatically logged the -2 units as **Damaged Inventory**. Balance sheet written off (PKR -2,400) and inventory corrected to 148 units instantly. No manual ledger entry required!
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      {scanStatus !== 'idle' && (
                        <Button onClick={() => setScanStatus('idle')} variant="ghost" size="sm" className="font-bold text-neutral-500">
                          Reset
                        </Button>
                      )}
                      <Button
                        onClick={triggerScan}
                        disabled={scanStatus === 'scanning'}
                        size="sm"
                        className="bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold text-xs uppercase tracking-wider rounded-xl h-10 px-4"
                      >
                        {scanStatus === 'idle' ? 'Trigger Barcode Scan' :
                          scanStatus === 'scanning' ? 'Verifying...' : 'Scan Complete'}
                      </Button>
                    </div>

                  </div>
                </div>
              )}

              {/* TERMINAL CONTENT FOR TAB 2: REORDER & AUTO-PO */}
              {activeTerminalTab === 'reorder' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-brand-primary uppercase tracking-widest block">Automated Purchase Orders</span>
                    <h4 className="font-semibold text-2xl text-neutral-900">Eradicate stockouts before they occur.</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      Define low-stock thresholds per category. Slide current stock below the safety threshold (100 units) to watch the system flag warnings and auto-generate replenishment drafts:
                    </p>
                  </div>

                  {/* Auto-PO Terminal Box */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm my-4">

                    {/* Interactive Slider */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Premium Denim Jeans Stock</span>
                        <span className="text-xs font-bold text-neutral-800">{jeansStock} Units</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        step="5"
                        value={jeansStock}
                        onChange={(e) => setJeansStock(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                      <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-1">
                        <span>20 units</span>
                        <span className="text-brand-primary font-semibold">Safety Limit: 100 units</span>
                        <span>200 units</span>
                      </div>
                    </div>

                    {/* Flashing Warning Badge */}
                    {jeansStock < 100 ? (
                      <div className="p-3 border border-orange-200 bg-orange-50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                          <span className="text-xs font-semibold text-orange-950 uppercase tracking-wider">âš ï¸ Low Stock Detected ({jeansStock} / 100)</span>
                        </div>
                        <span className="text-[10px] font-semibold text-orange-800 uppercase bg-orange-100 px-2 py-0.5 rounded">Action Required</span>
                      </div>
                    ) : (
                      <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-950 uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Stock Level Safe
                      </div>
                    )}

                    {/* Replenish Purchase Order Draft */}
                    {poStatus === 'sent' && (
                      <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl space-y-3 font-mono text-xs text-neutral-800">
                        <div className="flex justify-between border-b border-emerald-100 pb-1.5 font-bold">
                          <span>DRAFT PURCHASE ORDER: PO-2026-004</span>
                          <span className="text-emerald-700">STATUS: Draft Ready</span>
                        </div>
                        <div className="space-y-1">
                          <p>SUPPLIER: Denim Mills Ltd (Karachi Hub)</p>
                          <p>REPLENISH QUANTITY: 500 Units</p>
                          <p>ESTIMATED COST: PKR 600,000</p>
                        </div>
                        <p className="text-[10px] text-neutral-500 font-semibold border-t border-emerald-100 pt-1.5 leading-relaxed font-sans">
                          Draft is automatically generated with your predefined purchase price. Ready for approval and instant FBR tracking mapping.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      {poStatus !== 'idle' && (
                        <Button onClick={() => setPoStatus('idle')} variant="ghost" size="sm" className="font-bold text-neutral-500">
                          Reset
                        </Button>
                      )}
                      <Button
                        onClick={triggerPO}
                        disabled={jeansStock >= 100 || poStatus === 'generating'}
                        size="sm"
                        className="bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold text-xs uppercase tracking-wider rounded-xl h-10 px-4 disabled:opacity-50"
                      >
                        {poStatus === 'idle' ? 'Auto-Draft Purchase Order' :
                          poStatus === 'generating' ? 'Drafting...' : 'Purchase Draft Generated'}
                      </Button>
                    </div>

                  </div>
                </div>
              )}

              {/* TERMINAL CONTENT FOR TAB 3: FBR GST TAX INVOICING */}
              {activeTerminalTab === 'fbr' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-brand-primary uppercase tracking-widest block">Pakistani GST invoicing (demo)</span>
                    <h4 className="font-semibold text-2xl text-neutral-900">Sales billing with local tax calculations.</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      Illustrative receipt with standard 18% GST math. TENVO calculates tax on live invoices and POS sales; FBR IRIS live transmission is on the roadmap.
                    </p>
                  </div>

                  {/* FBR invoice terminal box */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm my-4">

                    {/* Invoice amount slider */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Subtotal Invoice Amount</span>
                        <span className="text-xs font-bold text-neutral-800">PKR {terminalFbrAmount.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="5000"
                        max="100000"
                        step="5000"
                        value={terminalFbrAmount}
                        onChange={(e) => setTerminalFbrAmount(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    {/* Tax Invoicing Preview Card */}
                    <div className="border border-neutral-200 rounded-2xl p-4 font-mono text-xs text-neutral-800 space-y-2 bg-neutral-50 relative overflow-hidden">
                      <div className="absolute right-3 top-3 h-10 w-10 border border-emerald-500 text-emerald-600 rounded flex items-center justify-center font-bold text-[8px] uppercase tracking-wider rotate-12">
                        GST calc
                      </div>
                      <div className="border-b border-neutral-200 pb-2">
                        <p className="font-bold text-neutral-900">TENVO OPERATIVE BILLING</p>
                        <p className="text-[10px] text-neutral-400">Sample invoice preview</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal Invoice:</span>
                          <span>PKR {terminalFbrAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-neutral-200 pb-1 text-brand-primary font-bold">
                          <span>Standard GST (18%):</span>
                          <span>PKR {Math.round(terminalFbrAmount * 0.18).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-neutral-900 pt-1">
                          <span>TOTAL RECEIPT:</span>
                          <span>PKR {Math.round(terminalFbrAmount * 1.18).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-[8px] text-neutral-400 font-semibold leading-relaxed border-t border-neutral-200 pt-2 font-sans">
                        Demo only - production invoices use your configured tax rules and audit trail.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* TERMINAL CONTENT FOR TAB 4: INTELLIGENT PACKAGING & LOGISTICS */}
              {activeTerminalTab === 'packaging' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-brand-primary uppercase tracking-widest block">Intelligent Courier Packaging</span>
                    <h4 className="font-semibold text-2xl text-neutral-900">Optimize box allocation to save freight shipping fees.</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      Don&apos;t waste high logistics freight costs. TENVO automatically groups items into standard courier box sizes (TCS, Leopards) and logs dimensions:
                    </p>
                  </div>

                  {/* Packaging Terminal Box */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm my-4">

                    {/* Box selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedBox('standard')}
                        className={`p-3 border rounded-xl text-xs font-bold text-left transition-all ${selectedBox === 'standard'
                          ? 'bg-neutral-50 border-brand-primary'
                          : 'bg-white border-neutral-200'
                          }`}
                      >
                        <span className="block font-semibold text-neutral-800">Box A (Medium Courier)</span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Capacity limit: 5kg</span>
                      </button>

                      <button
                        onClick={() => setSelectedBox('heavy')}
                        className={`p-3 border rounded-xl text-xs font-bold text-left transition-all ${selectedBox === 'heavy'
                          ? 'bg-neutral-50 border-brand-primary'
                          : 'bg-white border-neutral-200'
                          }`}
                      >
                        <span className="block font-semibold text-neutral-800">Box B (Large Cargo)</span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Capacity limit: 20kg</span>
                      </button>
                    </div>

                    {/* Packaging Slip Representation */}
                    <div className="p-4 border border-neutral-200 rounded-2xl bg-neutral-50 font-mono text-xs space-y-2">
                      <div className="flex justify-between border-b border-neutral-200 pb-1.5 text-[10px] font-semibold text-neutral-400 uppercase">
                        <span>Courier Packaging slip</span>
                        <span>Carrier: TCS Freight</span>
                      </div>
                      <div className="space-y-1">
                        <p>BOX ALLOCATION: {selectedBox === 'standard' ? 'Box A - 2 Shirts, 1 Jeans' : 'Box B - 12 Shirts, 6 Jeans, 2 Blazers'}</p>
                        <p>PACK WEIGHT: {selectedBox === 'standard' ? '2.4 kg (SAFE)' : '14.8 kg (SAFE)'}</p>
                        <p>FREIGHT BRACKET: {selectedBox === 'standard' ? 'Standard Courier rate' : 'Heavy Cargo rate'}</p>
                      </div>
                      <div className="border-t border-neutral-200 pt-2 flex items-center justify-between font-sans text-xs">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Weight Allocation Compliant
                        </span>
                        <span className="font-mono text-[10px] text-neutral-400">Dim: {selectedBox === 'standard' ? '12x12x8in' : '24x24x18in'}</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      <ScrollReveal direction="up" threshold={0.2}>
        <HomeIndustrySolutionsSection />
      </ScrollReveal>


      {/* 7. UNIQUE BENEFITS & COMPETITIVE ANALYSIS */}
      <section className="relative bg-white border-b border-neutral-200/80 py-10 sm:py-16 lg:py-28 overflow-hidden">
        <GradientMesh variant="subtle" />
        <div className={cn(MARKETING_CONTAINER, 'relative z-10')}>

          <ScrollReveal direction="up" threshold={0.2}>
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className={MARKETING_EYEBROW}>Why Choose Tenvo</h2>
              <h3 className={MARKETING_SECTION_HEADING}>
                What makes TENVO unique?
              </h3>
              <p className="text-lg text-neutral-500 font-medium">
                We built an enterprise inventory system specifically for Pakistani businesses, addressing the critical issues competitors ignore.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                num: '1.',
                title: 'Urdu Language Support',
                body: "Your office managers might prefer English, but your warehouse team on the ground doesn't have to suffer. TENVO features a full Urdu UI toggle designed for easy catalog searches, barcode scanning, and transfer entries.",
              },
              {
                num: '2.',
                title: 'Zero-Data-Loss Migration',
                body: 'Moving systems is scary. TENVO assigns a dedicated migration manager to every single enterprise customer. We map your current Excel files, verify duplicate SKU databases, and transfer everything for free.',
              },
              {
                num: '3.',
                title: 'Local Cloud & Offline POS',
                body: 'Load dashboards instantly with zero lag. Our local cloud server architecture guarantees fast access times inside Pakistan, coupled with offline point-of-sale terminals that sync automatically when internet recovers.',
              },
            ].map((card, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 100} threshold={0.2}>
                <CardLift className="h-full">
                  <div className="p-8 border border-neutral-200/80 rounded-[2rem] bg-neutral-50 space-y-4 h-full hover:border-brand-primary/30 transition-colors duration-300">
                    <h4 className="font-semibold text-lg text-neutral-900">{card.num} {card.title}</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">{card.body}</p>
                  </div>
                </CardLift>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal direction="up" threshold={0.1}>
            <div className="bg-white border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 overflow-x-auto shadow-sm">
              <h4 className="font-semibold text-neutral-900 text-xl mb-2">Operating model comparison</h4>
              <p className="text-xs text-neutral-500 font-semibold mb-6 max-w-2xl">
                For a buyer-style view versus typical storefront-first or multi-app suites, see{' '}
                <Link href="/why-tenvo" className="text-brand-primary font-semibold hover:underline">Why TENVO</Link>.
              </p>
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-200 font-semibold text-[10px] uppercase tracking-wider text-neutral-400">
                    <th className="p-4">Key Capabilities</th>
                    <th className="p-4">Traditional ERPs</th>
                    <th className="p-4">Spreadsheets</th>
                    <th className="p-4 text-brand-primary">TENVO Inventory Engine</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Branded store + POS + warehouse in one rhythm', 'Heavy customization', 'Manual links', 'Designed together'],
                    ['Web orders in the same queue as counter & B2B', 'Often separate modules', 'Fragmented tabs', 'Single order hub'],
                    ['Implementation Time', '6 - 12 Months', 'Manual Setup (Days)', 'Go live in 4 Days'],
                    ['Excel Paste & Import', 'Partial / Strict formatting', 'Native', 'Native (with cell validation)'],
                    ['Batch & Expiry Warning', 'Complex add-on module', 'Manual tracking / Missing', 'Built-in (with expiry alerts)'],
                    ['Pakistan tax setup', 'Custom expensive wrappers', 'Impossible', 'Compliant & Automatic'],
                    ['Multichannel Sell Sync', 'Rigid API integrations', 'Manual entry drift', 'Daraz & Shopify native API'],
                    ['Upfront Licensing Cost', 'PKR 500,000+', 'PKR 0', 'Free Trial, scale from PKR 4,500/mo'],
                  ].map(([feature, erp, sheet, tenvo], i) => (
                    <tr key={i} className="border-b border-neutral-100 text-xs font-semibold text-neutral-700 hover:bg-neutral-50/80 transition-colors duration-150">
                      <td className="p-4 font-bold text-neutral-900">{feature}</td>
                      <td className="p-4 text-neutral-400">{erp}</td>
                      <td className="p-4 text-neutral-400">{sheet}</td>
                      <td className="p-4 text-brand-primary font-bold">{tenvo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>

        </div>
      </section>

      <ScrollReveal direction="up" threshold={0.2}>
        <HomeOnboardingPathSection />
      </ScrollReveal>

      <ScrollReveal direction="up" threshold={0.2}>
        <HomeSecurityTrustSection />
      </ScrollReveal>

      <ScrollReveal direction="fade" threshold={0.2}>
        <HomeIntegrationMarquee compact />
      </ScrollReveal>

      {/* 10. FAQ */}
      <section className="relative bg-neutral-50 border-b border-neutral-200/80 py-10 sm:py-16 lg:py-28 overflow-hidden">
        <GradientMesh variant="subtle" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6">

          <ScrollReveal direction="up" threshold={0.3}>
            <div className="text-center mb-16 space-y-4">
              <h2 className={MARKETING_EYEBROW}>Frequently Asked Questions</h2>
              <h3 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
                Everything you need to know.
              </h3>
              <p className="text-sm text-neutral-500 font-semibold">
                Can&apos;t find the answer you&apos;re looking for? Reach out to our dedicated support squad.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {[
              {
                q: 'Can I really import native Excel files directly?',
                a: "Yes! Unlike traditional ERP platforms that fail if your spreadsheet isn't formatted perfectly, TENVO supports direct upload of native .xlsx files. Our interface checks your columns in real-time, displays explicit warnings for duplicate SKU codes or invalid prices, and allows you to partially import valid lines while providing a fixed Excel output file for errors.",
              },
              {
                q: 'Is TENVO compliant with FBR tax laws?',
                a: 'TENVO features a localized tax ledger that calculates standard 18% GST (and configurable provincial rates) per invoice line. We provide audit-ready logs and export-oriented summaries for your filing workflow. Live FBR IRIS sync is on the roadmap.',
              },
              {
                q: 'How does the Urdu language toggle work?',
                a: 'We realize warehouse teams may prefer Urdu for floor tasks. TENVO includes a language toggle with growing Urdu strings for core hub actions — full product localization is expanding release by release.',
              },
              {
                q: 'Will we lose data during our migration?',
                a: 'Never. Every single enterprise client is assigned a dedicated human Migration Manager. We review your messy old spreadsheets, check for SKU overlaps, verify existing supplier ledgers, perform sandbox test uploads, and ensure 100% data round-trip validation before switching your physical warehouse operations live.',
              },
            ].map((faq, index) => (
              <ScrollReveal key={index} direction="up" delay={index * 60} threshold={0.1}>
                <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm hover:border-neutral-300 transition-colors duration-200">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-6 text-left group hover:bg-neutral-50/60 transition-colors duration-200"
                    aria-expanded={expandedFaq === index}
                  >
                    <span className="font-semibold text-neutral-800 text-sm sm:text-base group-hover:text-brand-primary transition-colors duration-200">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 shrink-0 ml-4 text-neutral-400 transition-all duration-300',
                        'group-hover:text-brand-primary',
                        expandedFaq === index ? 'rotate-180 text-brand-primary' : ''
                      )}
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-6 border-t border-neutral-100 animate-fade-in-up">
                      <p className="pt-4 text-sm text-neutral-600 leading-relaxed font-medium">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>

        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="relative bg-white py-10 sm:py-14 lg:py-24 overflow-hidden">
        <GradientMesh variant="hero" />
        <div className={cn(MARKETING_CONTAINER, 'relative z-10')}>
          <ScrollReveal direction="up" threshold={0.3}>
            <div className="relative rounded-[3rem] p-8 sm:p-12 lg:p-16 text-center space-y-6 overflow-hidden border border-neutral-200/80 bg-white/80 backdrop-blur-sm shadow-sm">
              {/* Subtle inner gradient orbs */}
              <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-primary/8 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-brand-secondary/6 blur-3xl" aria-hidden />

              <p className="relative z-10 text-[11px] font-semibold text-brand-primary uppercase tracking-[0.32em]">Ready to take command?</p>
              <h3 className="relative z-10 text-3xl sm:text-5xl font-semibold text-neutral-900 tracking-tight max-w-4xl mx-auto">
                Unify your warehouse, sales, and accounts today.
              </h3>
              <p className="relative z-10 max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
                Join operational teams moving from spreadsheets to one connected workspace — inventory, storefront, POS, and finance with Pakistan-first tax configuration.
              </p>

              <div className="relative z-10 pt-4 flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  asChild size="lg"
                  className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 text-base font-semibold uppercase tracking-[0.15em] shadow-md hover:shadow-xl hover:scale-[1.03] active:scale-100 transition-all duration-300"
                >
                  <Link href={workspaceHref} onClick={() => trackHeroCta('footer_workspace', workspaceHref)}>
                    {workspaceCtaDesktop}
                  </Link>
                </Button>
                <Button
                  asChild size="lg" variant="outline"
                  className="h-14 rounded-xl border-neutral-300 bg-white hover:border-brand-primary hover:text-brand-primary hover:scale-[1.02] active:scale-100 px-8 text-base font-semibold uppercase tracking-[0.15em] transition-all duration-300"
                >
                  <Link href="/pricing">View Pricing Plans</Link>
                </Button>
              </div>

              <p className="relative z-10 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                No credit card required &bull; 14-day free trial &bull; Custom migration included
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>


    </MarketingLayout>
  );
}
