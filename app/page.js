'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Workflow,
  BarChart3,
  Globe,
  Factory,
  Upload,
  Clipboard,
  Plus,
  Shield,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ArrowLeftRight,
  Settings,
  Info,
  ChevronDown,
  ShoppingBag,
  Truck,
  CheckCircle,
  MessageSquare,
  Cpu
} from 'lucide-react';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/context/AuthContext';

// --- STUB / MOCK DATA ---
const trustStats = [
  { value: '450k+', label: 'Operations users onboarded across Pakistan' },
  { value: '55+', label: 'Pre-configured business templates ready' },
  { value: '99.99%', label: 'Uptime for live warehouse workloads' },
  { value: '4 Days', label: 'Average transition time from Excel' },
];

const partners = [
  { name: 'Shopify Sync', category: 'E-commerce' },
  { name: 'Daraz Hub', category: 'Local Marketplace' },
  { name: 'TCS Logistics', category: 'Fulfillment' },
  { name: 'Leopards Courier', category: 'Fulfillment' },
  { name: 'FBR Certified', category: 'Tax Compliance' },
  { name: 'WooCommerce', category: 'E-commerce' },
];

export default function Home() {
  const { user } = useAuth();
  const primaryHref = user ? '/multi-business' : '/register';
  const primaryText = user ? 'Open Workspace' : 'SIGN UP - IT\'S FREE';

  // --- STATE FOR INTERACTIVE COMPONENTS ---
  const [activeFeatureTab, setActiveFeatureTab] = useState('inventory');

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
    <MarketingLayout transparentNav={true}>

      {/* 1. HERO SECTION - Zoho Inventory Accurate Clone with Zeeshan Keerio & Styled CSS Boxes */}
      <section className="bg-brand-50 pt-16 pb-12 lg:pt-20 lg:pb-16 overflow-hidden relative border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 lg:space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-brand-primary">
                <ShieldCheck className="h-4 w-4" />
                Pakistan-Ready Enterprise Operations
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4rem] font-extrabold tracking-tight text-neutral-900 leading-[1.1]">
                  Run Your Entire Business From One <span className="text-brand-primary">Intelligent Dashboard</span>
                </h1>
                <p className="max-w-xl text-lg sm:text-xl font-medium leading-relaxed text-neutral-600">
                  From sales to HR, accounts to inventory, Tenvo is your all‑in‑one ERP and POS platform. Manage multiple domains and tenants seamlessly, track stock in real time, sync with online stores and couriers, and stay compliant with FBR regulations—without the chaos of spreadsheets.
                </p>
              </div>

              {/* Zoho Style Premium Gold/White Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 text-sm sm:text-base font-black uppercase tracking-[0.12em] shadow-md transition-all active:scale-[0.98] w-full sm:w-auto">
                  <Link href="/demo">BOOK A DEMO</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-2 border-neutral-300 bg-white hover:border-brand-primary hover:text-brand-primary px-8 text-sm sm:text-base font-black uppercase tracking-[0.12em] transition-all w-full sm:w-auto">
                  <Link href={primaryHref}>{primaryText}</Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Zoho Clone Masterpiece Visual (Zeeshan Keerio + Stacked CSS Boxes + 5 Floating Cards) */}
            <div className="lg:col-span-6 relative h-[450px] sm:h-[550px] lg:h-[600px] w-full flex items-end justify-center mt-12 lg:mt-0">

              {/* STACKED CARDBOARD BOXES (Minimalist CSS Shapes replicating stacked boxes in photo) */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Large Background Box Right */}
                <div className="absolute right-[5%] bottom-[12%] w-[180px] h-[240px] bg-[#EED4C5] border border-[#DCBBA9] rounded-lg shadow-sm transform rotate-3" />
                {/* Large Background Box Left */}
                <div className="absolute left-[8%] bottom-[8%] w-[190px] h-[210px] bg-[#E7C7B5] border border-[#D5B3A1] rounded-lg shadow-sm transform -rotate-6" />
                {/* Middle Supporting Box */}
                <div className="absolute left-[30%] bottom-[20%] w-[160px] h-[160px] bg-[#DEC0AE] border border-[#CBAAA0] rounded-lg shadow-sm transform rotate-12" />
                {/* High Top Stacked Box */}
                <div className="absolute right-[22%] bottom-[35%] w-[150px] h-[150px] bg-[#E5C3B0] border border-[#D1AD9B] rounded-lg shadow-sm transform -rotate-12" />
              </div>

              {/* MAIN OPERATOR IMAGE (Zeeshan Keerio - public/zeeshan-keerio.png) */}
              <div className="relative w-[400px] sm:w-[450px] aspect-[4/5] z-10 bottom-0 overflow-visible flex items-end">
                <Image
                  src="/zeeshan-keerio.png"
                  alt="Zeeshan Keerio - Tenvo Logistics Operations Lead"
                  width={450}
                  height={562}
                  priority
                  className="object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)]"
                />
              </div>

              {/* ================= FLOATING WIDGETS CLONE ================= */}

              {/* Widget 1: Sales Order Table with Auto-FBR Verification (Upper Left) */}
              <div className="absolute left-[-2%] top-[2%] z-20 bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] w-[220px] transform hover:-translate-y-1 transition-all duration-300">
                <div className="border-b border-neutral-100 pb-2 mb-2 flex justify-between items-start">
                  <div>
                    <h5 className="font-extrabold text-[11px] text-neutral-900">Sales Order</h5>
                    <p className="text-[9px] font-bold text-neutral-400">SO-00208</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-green-700">
                    <Check className="h-2 w-2" /> FBR Signed
                  </span>
                </div>
                <div className="grid grid-cols-4 text-[8px] font-black uppercase text-neutral-400 pb-1 mb-1 border-b border-neutral-50">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Tax</span>
                  <span className="text-right">Amt</span>
                </div>
                <div className="grid grid-cols-4 items-center text-[9px] font-bold text-neutral-700">
                  <span className="truncate font-black">Cotton Shirt</span>
                  <span className="text-center">8</span>
                  <span className="text-center text-green-600 font-extrabold">GST 18%</span>
                  <span className="text-right text-brand-primary">PKR 76k</span>
                </div>
                <div className="flex justify-between border-t border-neutral-100 pt-2 mt-2 text-[10px] font-black">
                  <span className="text-neutral-500">Auto-Reconciled</span>
                  <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                </div>
              </div>

              {/* Widget 2: Total Sales & Sync ring (Upper Right) */}
              <div className="absolute right-[-2%] top-[6%] z-20 bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] w-[160px] transform hover:-translate-y-1 transition-all duration-300 text-center">
                <h5 className="font-extrabold text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Omnichannel Sync</h5>

                {/* Visual Sync Ring */}
                <div className="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-brand-primary/40 animate-spin duration-10000" />
                  <div className="absolute inset-2 rounded-full border-4 border-solid border-neutral-100" />
                  <div className="absolute h-8 w-8 bg-brand-primary rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                    T
                  </div>
                  {/* Channels Small Icons */}
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#10B981] flex items-center justify-center text-[7px] font-black text-white shadow-sm">S</span>
                  <span className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-[7px] font-black text-white shadow-sm">D</span>
                </div>
                <p className="text-xs font-black text-neutral-800">PKR 142.5k Sales</p>
                <p className="text-[8px] text-[#10B981] font-black uppercase tracking-wider mt-0.5 flex items-center justify-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> 100% Synced
                </p>
              </div>

              {/* Widget 3: AI Auto-Reorder Procurement (Mid-Left) */}
              <div className="absolute left-[-6%] bottom-[32%] z-20 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-md flex items-center gap-3 w-[170px] transform hover:-translate-y-1 transition-all duration-300">
                <div className="h-9 w-9 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary flex-shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900">AI AUTO-REORDER</p>
                  <p className="text-[9px] text-[#c49c3b] font-black uppercase tracking-wider">Triggered (2 Days Lead)</p>
                </div>
              </div>

              {/* Widget 4: Courier / Shipment Dispatch (Mid-Right) */}
              <div className="absolute right-[-4%] bottom-[34%] z-20 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-md flex items-center gap-3 w-[170px] transform hover:-translate-y-1 transition-all duration-300">
                <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900">TCS DISPATCHED</p>
                  <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">AWB #72918231</p>
                </div>
              </div>

              {/* Widget 5: Agentic Audit integrity (Bottom-Right) */}
              <div className="absolute right-[2%] bottom-[14%] z-20 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-md flex items-center gap-3 w-[180px] transform hover:-translate-y-1 transition-all duration-300">
                <div className="h-9 w-9 bg-green-50 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900">AGENTIC AUDIT OK</p>
                  <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider">0 anomalies detected</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 2. CHANNELS & LOGISTICS PARTNERS BAR - Pure Light Theme */}
      <section className="bg-white border-b border-neutral-200/80 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-neutral-400 mb-6">
            Natively Integrated channels & Local shipping carriers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            {partners.map((partner, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2 border border-neutral-200/80 bg-neutral-50 rounded-2xl shadow-sm">
                <span className="font-black text-sm text-neutral-800">{partner.name}</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-brand-primary px-1.5 py-0.5 bg-brand-50 rounded">
                  {partner.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE MODULE HUB (ZOHO INVENTORY CORE CLONE) */}
      <section className="bg-white py-20 lg:py-28 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Your Complete Toolkit</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
              One dashboard. Complete control.
            </h3>
            <p className="text-lg text-neutral-500 font-medium">
              Everything you need to easily manage your stock, handle sales, and stay compliant with local tax laws—all in one place.
            </p>
          </div>

          {/* Interactive Hub Tabs */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* Left Hand side Tab List */}
            <div className="lg:col-span-4 space-y-3">
              <button
                onClick={() => setActiveFeatureTab('inventory')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeFeatureTab === 'inventory'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeFeatureTab === 'inventory' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">Easy Inventory Tracking</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Track your items, expiration dates, and custom bundles.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveFeatureTab('warehouse')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeFeatureTab === 'warehouse'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeFeatureTab === 'warehouse' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">Manage Multiple Locations</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Keep tabs on stock across different shops or warehouses.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveFeatureTab('selling')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeFeatureTab === 'selling'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeFeatureTab === 'selling' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">Sell Everywhere Instantly</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Connect with Daraz, Shopify, and Amazon in a few clicks.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveFeatureTab('fulfillment')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeFeatureTab === 'fulfillment'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeFeatureTab === 'fulfillment' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">Simple Shipping & Orders</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Handle sales orders, packing, and courier delivery tracking.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveFeatureTab('accounting')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeFeatureTab === 'accounting'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeFeatureTab === 'accounting' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">Accounting & Tax Filing</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Generate invoices and automate your FBR tax filings easily.</p>
                </div>
              </button>
            </div>

            {/* Right Hand side Feature Visual Container */}
            <div className="lg:col-span-8 bg-neutral-50 border border-neutral-200/80 rounded-[2rem] p-6 lg:p-8 min-h-[460px] flex flex-col justify-between">

              {/* Feature Tab Description */}
              {activeFeatureTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Clear Item Tracking
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-neutral-900">
                    Never lose track of a single item again.
                  </h3>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                    Organize your products by size, color, or material. You can automatically track expiration dates and serial numbers so you always know exactly what is on your shelves and when it needs to be sold.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Create Custom Bundles</p>
                        <p className="text-xs text-neutral-500">Easily combine multiple items into special gift packages or sets.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Smart Pricing Updates</p>
                        <p className="text-xs text-neutral-500">Automatically adjust your selling prices when your supplier costs change.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'warehouse' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Multi-location Warehouse Control
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-neutral-900">
                    Control stock across Karachi, Lahore, & Islamabad.
                  </h3>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                    Monitor precise quantity allocations across unlimited storage yards and retail locations. Initiate inter-warehouse transfer orders complete with approval workflows, audit trails, transit times, and bin-location mapping.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Transfer Approval Workflows</p>
                        <p className="text-xs text-neutral-500">Require supervisor sign-off before inventory leaves any hub.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Bin-Level Precision</p>
                        <p className="text-xs text-neutral-500">Guide workers to the exact aisle and shelf in seconds.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'selling' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Real-time Multichannel Sync
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-neutral-900">
                    Never suffer another overselling penalty.
                  </h3>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                    Integrate directly with Shopify, WooCommerce, Daraz, and international marketplaces. When a product sells on Shopify, TENVO automatically decreases stock counts in your warehouse and updates Daraz within milliseconds.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Daraz API Integration</p>
                        <p className="text-xs text-neutral-500">Fully compliant local marketplace sync out of the box.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Centralized Catalog</p>
                        <p className="text-xs text-neutral-500">Push product details and pricing globally from one single page.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'fulfillment' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Sales Orders & Rapid Dispatch
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-neutral-900">
                    Automate TCS, Leopards, and carrier logistics.
                  </h3>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                    Convert customer orders into package slips and shipping invoices in one click. Integrate with local logistics partners to fetch real-time shipping costs, print custom shipping labels, and send automatic tracking numbers to customers.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Drop-Shipping & Backorders</p>
                        <p className="text-xs text-neutral-500">Route sales orders directly to suppliers when stock is depleted.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">TCS Tracker Integration</p>
                        <p className="text-xs text-neutral-500">Track package delivery progress natively within TENVO.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === 'accounting' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-widest">
                    <Check className="w-4 h-4" /> Pakistan Localized Tax Accounting
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-neutral-900">
                    Audit-ready ledgers & FBR compliant invoicing.
                  </h3>
                  <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                    Say goodbye to disconnected billing. Generate sales invoices, track customer aging balances, record payments received, and manage double-entry accounting files automatically. Complete with integrated GST/tax calculators tuned for Pakistani filings.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">FBR Compliance Safeguards</p>
                        <p className="text-xs text-neutral-500">Automatic compliance with local Tier-1 retailer reporting standards.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Customer Ledgers</p>
                        <p className="text-xs text-neutral-500">Track invoices, credit notes, and outstanding balances effortlessly.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Terminal/Dashboard Representation inside the Light Theme Container */}
              <div className="mt-8 bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 ml-2">Console Live View</span>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-400">organization-id: tenvo-001</span>
                </div>

                {activeFeatureTab === 'inventory' && (
                  <div className="space-y-2.5 font-mono text-xs text-neutral-700">
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>PRODUCT: Crew Neck Cotton Shirt</span>
                      <span className="text-brand-primary font-bold">VARIANT: M / BLACK</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>BATCH NUMBER: BTC-2026-05A</span>
                      <span className="text-emerald-600 font-bold">EXPIRY: 2028-05-18</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SERIAL: SN-9031248011</span>
                      <span className="text-neutral-500">STATUS: Warehouse Inward</span>
                    </div>
                  </div>
                )}

                {activeFeatureTab === 'warehouse' && (
                  <div className="space-y-2.5 font-mono text-xs text-neutral-700">
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>FROM: Karachi Port Terminal Yard</span>
                      <span className="text-amber-600 font-bold">STATUS: In Transit</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>TO: Gulberg Central Lahore Hub</span>
                      <span className="text-neutral-500">ETA: 14 Hours (TCS Freight)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITEMS IN TRANSIT: 450 Units</span>
                      <span className="text-brand-primary font-bold">VALUATION: PKR 810,000</span>
                    </div>
                  </div>
                )}

                {activeFeatureTab === 'selling' && (
                  <div className="space-y-2.5 font-mono text-xs text-neutral-700">
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>SHOPIFY ORDER #1902</span>
                      <span className="text-emerald-600 font-bold">SYNC SUCCESS (-1 qty)</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>DARAZ SKU STOCKS UPDATED</span>
                      <span className="text-brand-primary font-bold">ALL PLATFORMS: 119 Units Left</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SYNC LATENCY</span>
                      <span className="text-neutral-400">12ms (Zero Drift)</span>
                    </div>
                  </div>
                )}

                {activeFeatureTab === 'fulfillment' && (
                  <div className="space-y-2.5 font-mono text-xs text-neutral-700">
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>PACKING SLIP GENERATED</span>
                      <span className="text-neutral-500">ORDER: TNV-SO-8802</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>CARRIER: TCS Cash On Delivery</span>
                      <span className="text-brand-primary font-bold">TRACKING ID: 7731298402</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SHIPPING LABEL STATUS</span>
                      <span className="text-emerald-600 font-bold">Printed & Dispatched</span>
                    </div>
                  </div>
                )}

                {activeFeatureTab === 'accounting' && (
                  <div className="space-y-2.5 font-mono text-xs text-neutral-700">
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>FBR TIER-1 INVOICE RECORD</span>
                      <span className="text-brand-primary font-bold">UUID: 2026-TX-10023</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1">
                      <span>NET AMOUNT: PKR 124,500</span>
                      <span className="text-amber-600 font-bold">GST (18%): PKR 22,410</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LEDGER SYNC RECORD</span>
                      <span className="text-emerald-600 font-bold">Balance Sheet Corrected</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. EXCEL-FIRST & SPREADSHEET POWER SIMULATOR */}
      <section className="bg-neutral-50 border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left Content column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-amber-800">
                <FileSpreadsheet className="h-4 w-4" />
                Excel-First Capability
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                No more manual data-entry agony.
              </h3>
              <p className="text-base text-neutral-600 font-medium leading-relaxed">
                Most platforms break when you upload an Excel sheet. TENVO has a native, full-screen **Excel Mode** that lets you copy-paste rows directly from your existing spreadsheets, perform bulk operations, and validates every single cell with crystal clear feedback.
              </p>

              <ul className="space-y-3 font-semibold text-neutral-700">
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Direct Excel (.xlsx) file drag-and-drop</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Real-time cell error reporting (Row & Column)</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>100% round-trip validation guarantee</span>
                </li>
              </ul>

              <div className="pt-4">
                <Button onClick={runExcelSimulation} disabled={simulationStatus === 'processing'} className="bg-brand-primary hover:bg-brand-primary-dark text-neutral-900 font-black rounded-2xl h-12 px-6 uppercase tracking-wider">
                  {simulationStatus === 'processing' ? 'Validating Sheet...' : 'Simulate Excel Upload'}
                </Button>
                {simulationStatus !== 'idle' && (
                  <Button onClick={resetExcelSimulation} variant="ghost" className="text-neutral-500 font-bold ml-2">
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Right Simulator column */}
            <div className="lg:col-span-7 bg-white border border-neutral-200/80 rounded-[2.5rem] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-4">
                <div>
                  <h4 className="font-black text-neutral-900 text-lg">Spreadsheet Import Preview</h4>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Validating 4 lines of imported products</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${simulationStatus === 'idle' ? 'bg-neutral-300' :
                    simulationStatus === 'processing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                    }`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {simulationStatus === 'idle' ? 'Ready to parse' :
                      simulationStatus === 'processing' ? 'Validating FBR & SKU' : 'Partial Import Available'}
                  </span>
                </div>
              </div>

              {/* Grid Simulator */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 font-black text-[10px] uppercase tracking-wider border-b border-neutral-200">
                      <th className="p-3">SKU Code</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Initial Stock</th>
                      <th className="p-3">Import Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-neutral-100 text-xs font-medium text-neutral-800 hover:bg-neutral-50">
                        <td className="p-3 font-mono font-bold">{row.sku}</td>
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 font-bold">{row.stock}</td>
                        <td className="p-3">
                          {row.status === 'pending' && (
                            <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[9px] px-2 py-0.5 bg-neutral-100 rounded">Pending</span>
                          )}
                          {row.status === 'success' && (
                            <span className="text-emerald-700 font-black uppercase tracking-wider text-[9px] px-2 py-0.5 bg-emerald-50 rounded">Ready</span>
                          )}
                          {row.status === 'failed' && (
                            <span className="text-red-700 font-black uppercase tracking-wider text-[9px] px-2 py-0.5 bg-red-50 rounded">Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error Box representation if validation finished */}
              {simulationStatus === 'done' && (
                <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-red-900 text-sm">SKU Duplication Error found (Row 3)</h5>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed font-semibold">
                      TENVO caught a critical SKU collision. Traditional ERPs would fail the whole import. TENVO allows you to **import only the 3 valid rows** and provides a fixed Excel sheet with highlighted columns to resolve.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE MARGIN-FIRST PRICING CALCULATOR */}
      <section className="bg-white border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Right Interactive Simulator Column (rendered on left in visual desktop flow for variety) */}
            <div className="lg:col-span-6 bg-neutral-50 border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 order-2 lg:order-1">
              <h4 className="font-black text-neutral-900 text-xl mb-6">Interactive Margin-First Engine</h4>

              <div className="space-y-6">

                {/* Cost Input */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Unit Cost (PKR)</label>
                    <span className="text-xs font-mono font-bold text-neutral-800">PKR {calcCost.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="50"
                    value={calcCost}
                    onChange={(e) => setCalcCost(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-1">
                    <span>PKR 100</span>
                    <span>PKR 10,000</span>
                  </div>
                </div>

                {/* Margin % Input */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">Target Profit Margin (%)</label>
                    <span className="text-xs font-mono font-bold text-neutral-800">{calcMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    value={calcMargin}
                    onChange={(e) => setCalcMargin(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-1">
                    <span>5%</span>
                    <span>80%</span>
                  </div>
                </div>

                {/* FBR Tax Rate Input */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-500">FBR Sales Tax GST (%)</label>
                    <span className="text-xs font-mono font-bold text-neutral-800">{calcTaxRate}%</span>
                  </div>
                  <select
                    value={calcTaxRate}
                    onChange={(e) => setCalcTaxRate(Number(e.target.value))}
                    className="w-full h-11 px-4 border border-neutral-200 bg-white rounded-xl text-sm font-bold text-neutral-800"
                  >
                    <option value={0}>0% (Tax Exempt / Exports)</option>
                    <option value={15}>15% (Local Sales Tax)</option>
                    <option value={18}>18% (Standard FBR GST)</option>
                  </select>
                </div>

                {/* Calculation Summary Results Card */}
                <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between text-xs font-semibold text-neutral-500 border-b border-neutral-100 pb-2">
                    <span>Target Profit Margin</span>
                    <span className="font-bold text-neutral-800">PKR {marginAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-neutral-500 border-b border-neutral-100 pb-2">
                    <span>FBR Standard GST Tax</span>
                    <span className="font-bold text-neutral-800">PKR {taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-neutral-900 pt-1">
                    <span>Final Retail Price</span>
                    <span className="text-xl text-brand-primary">PKR {finalSellingPrice.toLocaleString()}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-brand-primary">
                <Receipt className="h-4 w-4" />
                Margin-First Strategy
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                Margin-first pricing protects your bottom line.
              </h3>
              <p className="text-base text-neutral-600 font-medium leading-relaxed">
                With inflation and supply chain volatility, inventory cost shifts happen daily in Pakistan. TENVO handles this elegantly. Rather than setting static prices that drift into loss, you define your target profit margin per product category. When vendor cost rises, TENVO recalculates optimal selling prices automatically.
              </p>

              <ul className="space-y-3 font-semibold text-neutral-700">
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-primary">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Automatic price adjustment based on live product costs</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-primary">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Built-in local FBR sales tax (GST) calculations</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-primary">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Real-time margin safety reports on owner dashboards</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 5.5 LIVE WAREHOUSE OPERATIONAL SIMULATOR (NEW ADVANCED FEATURE) */}
      <section className="bg-white border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-neutral-800">
              <Cpu className="h-4 w-4" /> Live Operational Terminal
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
              Test drive the TENVO operating system.
            </h3>
            <p className="text-lg text-neutral-500 font-medium">
              We built an advanced operations engine. Interact with the live terminal below to see barcode stocktakes, automated purchase orders, and localized FBR billing sync in action.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-stretch">

            {/* Left Controls column */}
            <div className="lg:col-span-4 space-y-3 flex flex-col justify-center">

              <button
                onClick={() => setActiveTerminalTab('stocktake')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeTerminalTab === 'stocktake'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeTerminalTab === 'stocktake' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">1. Scan & Reconcile</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Simulate stock count audits and damaged inventory adjustments.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTerminalTab('reorder')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeTerminalTab === 'reorder'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeTerminalTab === 'reorder' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">2. Low Stock &rarr; Auto PO</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Watch the system draft supplier purchase orders when inventory falls low.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTerminalTab('fbr')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeTerminalTab === 'fbr'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeTerminalTab === 'fbr' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">3. FBR Invoice Printing</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Generate certified Tier-1 receipts with standard GST calculations.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTerminalTab('packaging')}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${activeTerminalTab === 'packaging'
                  ? 'bg-neutral-50 border-brand-primary shadow-sm'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                  }`}
              >
                <div className={`p-3 rounded-xl ${activeTerminalTab === 'packaging' ? 'bg-brand-primary text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-neutral-900">4. Intelligent Packaging</h4>
                  <p className="text-xs text-neutral-500 mt-1 font-semibold">Auto-calculate box size limits and print carrier labels (TCS/Leopards).</p>
                </div>
              </button>

            </div>

            {/* Right Interactive Console display */}
            <div className="lg:col-span-8 bg-neutral-50 border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 flex flex-col justify-between shadow-sm min-h-[460px]">

              {/* TERMINAL CONTENT FOR TAB 1: STOCKTAKE SCAN */}
              {activeTerminalTab === 'stocktake' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-black text-brand-primary uppercase tracking-widest block">Barcode Stocktake Audit</span>
                    <h4 className="font-black text-2xl text-neutral-900">Prevent shrinkage with rapid reconciliation.</h4>
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
                        <span className="text-[10px] font-black uppercase text-neutral-400">System Expected</span>
                        <p className="text-2xl font-black text-neutral-800">150 Units</p>
                      </div>
                      <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-neutral-400">Physical Scanned</span>
                        <p className="text-2xl font-black text-neutral-800">
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
                        <div className="flex items-center gap-2 text-xs font-black text-red-900 uppercase">
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
                        className="bg-brand-primary hover:bg-brand-primary-dark text-white font-black text-xs uppercase tracking-wider rounded-xl h-10 px-4"
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
                    <span className="text-xs font-black text-brand-primary uppercase tracking-widest block">Automated Purchase Orders</span>
                    <h4 className="font-black text-2xl text-neutral-900">Eradicate stockouts before they occur.</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      Define low-stock thresholds per category. Slide current stock below the safety threshold (100 units) to watch the system flag warnings and auto-generate replenishment drafts:
                    </p>
                  </div>

                  {/* Auto-PO Terminal Box */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm my-4">

                    {/* Interactive Slider */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-black text-neutral-500 uppercase tracking-wider">Premium Denim Jeans Stock</span>
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
                        <span className="text-brand-primary font-black">Safety Limit: 100 units</span>
                        <span>200 units</span>
                      </div>
                    </div>

                    {/* Flashing Warning Badge */}
                    {jeansStock < 100 ? (
                      <div className="p-3 border border-orange-200 bg-orange-50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                          <span className="text-xs font-black text-orange-950 uppercase tracking-wider">⚠️ Low Stock Detected ({jeansStock} / 100)</span>
                        </div>
                        <span className="text-[10px] font-black text-orange-800 uppercase bg-orange-100 px-2 py-0.5 rounded">Action Required</span>
                      </div>
                    ) : (
                      <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center gap-2 text-xs font-black text-emerald-950 uppercase tracking-wider">
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
                        className="bg-brand-primary hover:bg-brand-primary-dark text-white font-black text-xs uppercase tracking-wider rounded-xl h-10 px-4 disabled:opacity-50"
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
                    <span className="text-xs font-black text-brand-primary uppercase tracking-widest block">FBR Tier-1 Invoicing</span>
                    <h4 className="font-black text-2xl text-neutral-900">Seamless sales billing & local tax integration.</h4>
                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                      Every trade sale is automatically reported to FBR servers. Slide receipt value below to verify instant local 18% Standard GST tax audit calculations:
                    </p>
                  </div>

                  {/* FBR invoice terminal box */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm my-4">

                    {/* Invoice amount slider */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-black text-neutral-500 uppercase tracking-wider">Subtotal Invoice Amount</span>
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
                        FBR Cert
                      </div>
                      <div className="border-b border-neutral-200 pb-2">
                        <p className="font-bold text-neutral-900">TENVO OPERATIVE BILLING</p>
                        <p className="text-[10px] text-neutral-400">UUID: 2026-FBR-TX-9903A</p>
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
                        <div className="flex justify-between text-sm font-black text-neutral-900 pt-1">
                          <span>TOTAL RECEIPT:</span>
                          <span>PKR {Math.round(terminalFbrAmount * 1.18).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-[8px] text-neutral-400 font-semibold leading-relaxed border-t border-neutral-200 pt-2 font-sans">
                        FBR server response: **ACKNOWLEDGED**. Invoice hash generated. Ledger double-entries balanced.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* TERMINAL CONTENT FOR TAB 4: INTELLIGENT PACKAGING & LOGISTICS */}
              {activeTerminalTab === 'packaging' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-black text-brand-primary uppercase tracking-widest block">Intelligent Courier Packaging</span>
                    <h4 className="font-black text-2xl text-neutral-900">Optimize box allocation to save freight shipping fees.</h4>
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
                        <span className="block font-black text-neutral-800">Box A (Medium Courier)</span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Capacity limit: 5kg</span>
                      </button>

                      <button
                        onClick={() => setSelectedBox('heavy')}
                        className={`p-3 border rounded-xl text-xs font-bold text-left transition-all ${selectedBox === 'heavy'
                          ? 'bg-neutral-50 border-brand-primary'
                          : 'bg-white border-neutral-200'
                          }`}
                      >
                        <span className="block font-black text-neutral-800">Box B (Large Cargo)</span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Capacity limit: 20kg</span>
                      </button>
                    </div>

                    {/* Packaging Slip Representation */}
                    <div className="p-4 border border-neutral-200 rounded-2xl bg-neutral-50 font-mono text-xs space-y-2">
                      <div className="flex justify-between border-b border-neutral-200 pb-1.5 text-[10px] font-black text-neutral-400 uppercase">
                        <span>Courier Packaging slip</span>
                        <span>Carrier: TCS Freight</span>
                      </div>
                      <div className="space-y-1">
                        <p>BOX ALLOCATION: {selectedBox === 'standard' ? 'Box A - 2 Shirts, 1 Jeans' : 'Box B - 12 Shirts, 6 Jeans, 2 Blazers'}</p>
                        <p>PACK WEIGHT: {selectedBox === 'standard' ? '2.4 kg (SAFE)' : '14.8 kg (SAFE)'}</p>
                        <p>FREIGHT BRACKET: {selectedBox === 'standard' ? 'Standard Courier rate' : 'Heavy Cargo rate'}</p>
                      </div>
                      <div className="border-t border-neutral-200 pt-2 flex items-center justify-between font-sans text-xs">
                        <span className="text-emerald-700 font-black flex items-center gap-1">
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

      {/* 6. WHO BENEFITS (AUDIENCE VERTICALS) - Pure Light Theme */}
      <section className="bg-neutral-50 border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Industry Specific Solutions</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
              Tailored templates for every serious business.
            </h3>
            <p className="text-lg text-neutral-500 font-medium">
              Don’t spend months configuring custom properties. TENVO features 55+ vertical presets optimized for Pakistani industries.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1: Retail & E-commerce */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-5 hover:border-brand-primary transition-colors">
              <div className="h-12 w-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-brand-primary border border-neutral-200/80">
                <Store className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-neutral-900">Retail & E-commerce</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Connect Shopify/Daraz directly. Sync inventory counts automatically, print professional barcodes, run quick POS terminals offline, and fulfill orders with automatic TCS/Leopards parcel bookings.
              </p>
              <ul className="space-y-2 text-[11px] font-bold text-neutral-600">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Real-time Shopify/Daraz API</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Instant Barcode printing</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Offline retail terminal support</li>
              </ul>
            </div>

            {/* Card 2: Wholesale & Distribution */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-5 hover:border-brand-primary transition-colors">
              <div className="h-12 w-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-brand-primary border border-neutral-200/80">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-neutral-900">Wholesale & Distribution</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Manage high volume trade relationships. Set custom price lists per customer class, establish strict credit limits, calculate volume-based discount tiers, and coordinate bulk logistics.
              </p>
              <ul className="space-y-2 text-[11px] font-bold text-neutral-600">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Dynamic Pricing lists</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Customer Credit limits</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Volume discount grids</li>
              </ul>
            </div>

            {/* Card 3: Manufacturing & Factory */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-5 hover:border-brand-primary transition-colors">
              <div className="h-12 w-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-brand-primary border border-neutral-200/80">
                <Factory className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-neutral-900">Factory & Manufacturing</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Control complex production pipelines. Track multi-level Bill of Materials (BOM), generate work orders, manage raw material stock levels, and monitor exact Cost of Goods Manufactured (COGM).
              </p>
              <ul className="space-y-2 text-[11px] font-bold text-neutral-600">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Multi-level Bill of Materials</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Work Order operations</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Precise COGM calculation</li>
              </ul>
            </div>

            {/* Card 4: Pharmacy & Healthcare */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-5 hover:border-brand-primary transition-colors">
              <div className="h-12 w-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-brand-primary border border-neutral-200/80">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-black text-lg text-neutral-900">Pharmacy & Pharma</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Ensure perfect lot safety. Track medicine batches, set automatic alerts for expiring drugs, log supplier licensing details, and comply with strict national health regulations.
              </p>
              <ul className="space-y-2 text-[11px] font-bold text-neutral-600">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Batch & Expiry tracking</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Expiry warning system</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-brand-primary" /> Drug license logging</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 7. UNIQUE BENEFITS & COMPETITIVE ANALYSIS - Pure Light Theme */}
      <section className="bg-white border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Why Choose Tenvo</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
              What makes TENVO unique?
            </h3>
            <p className="text-lg text-neutral-500 font-medium">
              We built an enterprise inventory system specifically for Pakistani businesses, addressing the critical issues competitors ignore.
            </p>
          </div>

          {/* Core Unique selling points */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-8 border border-neutral-200/80 rounded-[2rem] bg-neutral-50 space-y-4">
              <h4 className="font-black text-lg text-neutral-900">1. Urdu Language Support</h4>
              <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                Your office managers might prefer English, but your warehouse team on the ground doesn’t have to suffer. TENVO features a full **Urdu UI toggle** designed for easy catalog searches, barcode scanning, and transfer entries.
              </p>
            </div>

            <div className="p-8 border border-neutral-200/80 rounded-[2rem] bg-neutral-50 space-y-4">
              <h4 className="font-black text-lg text-neutral-900">2. Zero-Data-Loss Migration</h4>
              <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                Moving systems is scary. TENVO assigns a **dedicated migration manager** to every single enterprise customer. We map your current Excel files, verify duplicate SKU databases, and transfer everything for free.
              </p>
            </div>

            <div className="p-8 border border-neutral-200/80 rounded-[2rem] bg-neutral-50 space-y-4">
              <h4 className="font-black text-lg text-neutral-900">3. Local Cloud & Offline POS</h4>
              <p className="text-sm text-neutral-600 font-medium leading-relaxed">
                Load dashboards instantly with zero lag. Our local cloud server architecture guarantees fast access times inside Pakistan, coupled with offline point-of-sale terminals that sync data automatically when internet recovers.
              </p>
            </div>
          </div>

          {/* Comparison Table: Traditional vs Basic vs Tenvo */}
          <div className="bg-white border border-neutral-200/80 rounded-[2.5rem] p-6 lg:p-10 overflow-x-auto shadow-sm">
            <h4 className="font-black text-neutral-900 text-xl mb-6">Detailed Platform Comparison</h4>

            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-200 font-black text-[10px] uppercase tracking-wider text-neutral-400">
                  <th className="p-4">Key Capabilities</th>
                  <th className="p-4">Traditional ERPs</th>
                  <th className="p-4">Spreadsheets</th>
                  <th className="p-4 text-brand-primary">TENVO Inventory Engine</th>
                </tr>
              </thead>
              <tbody>

                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-700">
                  <td className="p-4 font-bold text-neutral-900">Implementation Time</td>
                  <td className="p-4 text-neutral-400">6 - 12 Months</td>
                  <td className="p-4 text-neutral-400">Manual Setup (Days)</td>
                  <td className="p-4 text-brand-primary font-bold">Go live in 4 Days</td>
                </tr>

                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-700">
                  <td className="p-4 font-bold text-neutral-900">Excel Paste & Import</td>
                  <td className="p-4 text-neutral-400">Partial / Strict formatting</td>
                  <td className="p-4 text-brand-primary">Native</td>
                  <td className="p-4 text-brand-primary font-bold">Native (with cell validation)</td>
                </tr>

                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-700">
                  <td className="p-4 font-bold text-neutral-900">Batch & Expiry Warning</td>
                  <td className="p-4 text-neutral-400">Complex add-on module</td>
                  <td className="p-4 text-neutral-400">Manual tracking / Missing</td>
                  <td className="p-4 text-brand-primary font-bold">Built-in (with expiry alerts)</td>
                </tr>

                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-700">
                  <td className="p-4 font-bold text-neutral-900">FBR Compliance</td>
                  <td className="p-4 text-neutral-400">Custom expensive wrappers</td>
                  <td className="p-4 text-neutral-400">Impossible</td>
                  <td className="p-4 text-brand-primary font-bold">Compliant & Automatic</td>
                </tr>

                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-700">
                  <td className="p-4 font-bold text-neutral-900">Multichannel Sell Sync</td>
                  <td className="p-4 text-neutral-400">Rigid API integrations</td>
                  <td className="p-4 text-neutral-400">Manual entry drift</td>
                  <td className="p-4 text-brand-primary font-bold">Daraz & Shopify native API</td>
                </tr>

                <tr className="text-xs font-semibold text-neutral-700">
                  <td className="p-4 font-bold text-neutral-900">Upfront Licensing Cost</td>
                  <td className="p-4 text-neutral-400">PKR 500,000+</td>
                  <td className="p-4 text-brand-primary">PKR 0</td>
                  <td className="p-4 text-brand-primary font-bold">Free Trial, scale from PKR 4,500/mo</td>
                </tr>

              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 8. STEP-BY-STEP ADOPTION PATHWAY - Pure Light Theme */}
      <section className="bg-neutral-50 border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Simple Onboarding</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
              Switching is simpler than you think.
            </h3>
            <p className="text-lg text-neutral-500 font-medium">
              We design every setup phase to maximize operational continuity and prevent business downtime.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">

            <div className="bg-white p-6 border border-neutral-200/80 rounded-3xl space-y-3 shadow-sm relative">
              <div className="text-xs font-black text-brand-primary uppercase tracking-widest">Phase 01</div>
              <h4 className="font-black text-lg text-neutral-900">Pick Industry Preset</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Register in 60 seconds. Select your business vertical (Retail, FMCG, Manufacturing, Pharmacy) to pre-load tailored SKU categories, units of measure, and default tax codes.
              </p>
              <div className="hidden md:block absolute top-[40%] right-[-10%] translate-x-1 z-20 text-neutral-300">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 border border-neutral-200/80 rounded-3xl space-y-3 shadow-sm relative">
              <div className="text-xs font-black text-brand-primary uppercase tracking-widest">Phase 02</div>
              <h4 className="font-black text-lg text-neutral-900">Excel Bulk Upload</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Drag-and-drop your existing product catalogs, price lists, customer ledgers, and vendor details in Excel format. Our system validates duplicate SKUs and checks columns in real-time.
              </p>
              <div className="hidden md:block absolute top-[40%] right-[-10%] translate-x-1 z-20 text-neutral-300">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 border border-neutral-200/80 rounded-3xl space-y-3 shadow-sm relative">
              <div className="text-xs font-black text-brand-primary uppercase tracking-widest">Phase 03</div>
              <h4 className="font-black text-lg text-neutral-900">Sync Warehouses</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Connect your physical warehouses, retail locations, and online Shopify/Daraz store accounts. Establish low-stock reorder thresholds to receive automatic alerts when levels drop.
              </p>
              <div className="hidden md:block absolute top-[40%] right-[-10%] translate-x-1 z-20 text-neutral-300">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 border border-neutral-200/80 rounded-3xl space-y-3 shadow-sm">
              <div className="text-xs font-black text-brand-primary uppercase tracking-widest">Phase 04</div>
              <h4 className="font-black text-lg text-neutral-900">Fulfill & Automate</h4>
              <p className="text-xs text-neutral-500 font-semibold leading-relaxed">
                Invite operators, assign specific permissions (e.g. warehouse picker, POS cashier, billing clerk), print barcodes, and manage seamless dispatch operations.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 9. SOCIAL PROOF / OPERATOR TESTIMONIALS - Pure Light Theme */}
      <section className="bg-white border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="grid lg:grid-cols-12 gap-12 items-center">

            {/* Left Content column */}
            <div className="lg:col-span-4 space-y-4">
              <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Social Proof</h2>
              <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                Praise from local business operators.
              </h3>
              <p className="text-sm text-neutral-500 font-semibold leading-relaxed">
                See how wholesale managers, distributors, and e-commerce founders consolidated their messy spreadsheets into TENVO.
              </p>
              <div className="pt-2">
                <Link href="/case-studies" className="text-brand-primary hover:text-brand-primary-dark font-black text-sm uppercase tracking-wider inline-flex items-center gap-1.5 transition-all">
                  Read Case Studies <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Testimonial Grid Column */}
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-6">

              <div className="bg-neutral-50 border border-neutral-200/85 p-6 rounded-3xl space-y-4">
                <p className="text-xs font-medium text-neutral-600 leading-relaxed">
                  &ldquo;Moving from 4 different spreadsheets to TENVO saved our wholesale pharmacy hours. The Urdu UI toggle was a game-changer for our loaders, and we haven&apos;t had a single batch expire unnoticed since we migrated.&rdquo;
                </p>
                <div>
                  <h5 className="font-bold text-sm text-neutral-900">Muhammad Ali Sheikh</h5>
                  <p className="text-[10px] text-neutral-400 font-semibold">Director, Sheikh Medical Distribution (Lahore)</p>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200/85 p-6 rounded-3xl space-y-4">
                <p className="text-xs font-medium text-neutral-600 leading-relaxed">
                  &ldquo;We used to suffer constant Shopify-Daraz inventory drifts, leading to terrible merchant penalties. TENVO’s real-time multichannel sync solved this completely. We drag-and-dropped our product Excel files and went live in 2 days.&rdquo;
                </p>
                <div>
                  <h5 className="font-bold text-sm text-neutral-900">Aisha Rehman</h5>
                  <p className="text-[10px] text-neutral-400 font-semibold">Founder, Modest Threads E-commerce (Karachi)</p>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 10. EXPANDABLE COMPREHENSIVE FAQ - Pure Light Theme */}
      <section className="bg-neutral-50 border-b border-neutral-200/80 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          <div className="text-center mb-16 space-y-4">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.25em]">Frequently Asked Questions</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              Everything you need to know.
            </h3>
            <p className="text-sm text-neutral-500 font-semibold">
              Can’t find the answer you’re looking for? Reach out to our dedicated support squad.
            </p>
          </div>

          <div className="space-y-4">

            {/* FAQ Item 1 */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">Can I really import native Excel files directly?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 0 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 0 && (
                <div className="p-6 pt-0 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    Yes! Unlike traditional ERP platforms that fail if your spreadsheet isn&apos;t formatted perfectly, TENVO supports direct upload of native `.xlsx` files. Our interface checks your columns in real-time, displays explicit warnings for duplicate SKU codes or invalid prices, and allows you to partially import valid lines while providing a fixed Excel output file for errors.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">Is TENVO compliant with FBR tax laws?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 1 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 1 && (
                <div className="p-6 pt-0 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    Absolutely. TENVO features a localized tax compliance ledger that automatically calculates standard 18% GST (or custom provincial sales tax rates like SRB and PRA) per invoice line. We provide audit-ready transaction logs and automated monthly tax report exports, completely compliant with local retailer reporting standards.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">How does the Urdu language toggle work?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 2 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 2 && (
                <div className="p-6 pt-0 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    We realize that while office operations use English, floor loaders and pickers in local warehouses prefer Urdu. TENVO features a simple Urdu toggle button in the dashboard, translating core inventory actions, SKU searches, barcode scanning confirmations, and warehouse transfer inputs into clean, simple Urdu instructions.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-black text-neutral-800 text-sm sm:text-base">Will we lose data during our migration?</span>
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedFaq === 3 ? 'rotate-180' : ''}`} />
              </button>
              {expandedFaq === 3 && (
                <div className="p-6 pt-0 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    Never. Every single enterprise client is assigned a dedicated human Migration Manager. We review your messy old spreadsheets, check for SKU overlaps, verify existing supplier ledgers, perform sandbox test uploads, and ensure 100% data round-trip validation before switching your physical warehouse operations live.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* 11. HIGH IMPACT CALL-TO-ACTION (CTA) - Pure Light Theme */}
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-[3rem] p-8 sm:p-12 lg:p-16 text-center space-y-6 relative overflow-hidden shadow-sm">
            <h2 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.32em]">Ready to take command?</h2>
            <h3 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight max-w-4xl mx-auto">
              Unify your warehouse, sales, and accounts today.
            </h3>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 font-medium leading-relaxed">
              Join serious operational teams switching from fragmented spreadsheets to Pakistan&apos;s first unified, FBR-compliant, Excel-first operating system. Start your free trial today.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 text-base font-black uppercase tracking-[0.15em] shadow-md transition-all">
                <Link href={primaryHref}>{primaryText}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-neutral-300 bg-white hover:border-brand-primary hover:text-brand-primary px-8 text-base font-black uppercase tracking-[0.15em] transition-all">
                <Link href="/pricing">View Pricing Plans</Link>
              </Button>
            </div>

            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              No credit card required &bull; 14-day free trial &bull; Custom migration included
            </p>
          </div>

        </div>
      </section>

    </MarketingLayout>
  );
}
