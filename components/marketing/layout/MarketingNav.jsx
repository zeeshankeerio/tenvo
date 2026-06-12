'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronDown, Package, Receipt, Briefcase, Store, Factory, Globe, ShoppingBag, UtensilsCrossed, Megaphone, Heart, Brain, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackNavMenuOpen, trackCTAClick } from '@/lib/analytics/tracking';
import { useAuth } from '@/lib/context/AuthContext';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { SupportWhatsAppLink } from '@/components/marketing/SupportWhatsAppLink';
import { cn } from '@/lib/utils';

/**
 * MarketingNav Component
 * Sticky navigation with mega menus for marketing pages
 * Following 2026 best practices for accessibility and performance
 */
export default function MarketingNav({
  transparent = false,
  currentPage = '',
  showAuthButtons = true
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for backdrop blur
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    queueMicrotask(() => {
      setMobileMenuOpen(false);
      setExpandedMenu(null);
    });
  }, [currentPage]);

  const toggleMenu = (menu) => {
    const newMenu = expandedMenu === menu ? null : menu;
    setExpandedMenu(newMenu);

    if (newMenu) {
      trackNavMenuOpen(menu);
    }
  };

  const handleCTAClick = (location, text, href) => {
    trackCTAClick(location, text, href);
    router.push(href);
  };

  const navClasses = `sticky top-0 z-50 transition-all duration-300 ${transparent && !scrolled
      ? 'bg-transparent'
      : 'bg-white/90 backdrop-blur-2xl border-b border-neutral-200/50 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.1)]'
    }`;

  const [currency, setCurrency] = useState('PKR');

  const navItemClass =
    'inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-md px-1.5 text-[13px] font-semibold text-neutral-800 transition-colors hover:bg-neutral-100/90 hover:text-brand-primary-dark xl:px-2 xl:text-sm';

  return (
    <nav className={navClasses} aria-label="Primary marketing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex h-[4.5rem] min-h-[4.5rem] items-center justify-between gap-3 sm:gap-4 lg:gap-5">
          {/* Logo */}
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-3 rounded-lg outline-none ring-brand-primary/30 transition-all hover:opacity-95 focus-visible:ring-2"
          >
            <TenvoTextLogo />
          </Link>

          {/* Desktop: primary links (single row, scroll if viewport is tight) + utilities (never wraps) */}
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex lg:gap-3">
            <div className="min-w-0 flex-1" role="navigation" aria-label="Product pages">
              <div className="flex flex-nowrap items-center justify-end gap-x-0.5 sm:gap-x-1 md:gap-x-1.5 lg:gap-x-2">
              {/* Solutions Dropdown */}
              <NavDropdown
                label="Solutions"
                isOpen={expandedMenu === 'solutions'}
                onToggle={() => toggleMenu('solutions')}
                triggerClassName={navItemClass}
              >
                <div className="grid w-[min(96vw,56rem)] grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-3 lg:gap-8">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-widest">Enterprise Core</h4>
                    <DropdownLink
                      href="/features#inventory"
                      icon={<Package className="w-5 h-5" />}
                      title="Inventory Engine"
                      desc="Precision stock control with batch & serial tracking."
                    />
                    <DropdownLink
                      href="/features#compliance"
                      icon={<Receipt className="w-5 h-5" />}
                      title="Tax Compliance"
                      desc="FBR-aligned sales tax and provincial workflows for Pakistan."
                    />
                    <DropdownLink
                      href="/features#accounting"
                      icon={<Briefcase className="w-5 h-5" />}
                      title="General Ledger"
                      desc="Double-entry accounting for professionals."
                    />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-widest">Verticals</h4>
                    <DropdownLink
                      href="/register?domain=retail-shop"
                      icon={<Store className="w-5 h-5" />}
                      title="POS Terminal"
                      desc="High-speed retail checkout workflows."
                    />
                    <DropdownLink
                      href="/register?domain=industrial-manufacturing"
                      icon={<Factory className="w-5 h-5" />}
                      title="Manufacturing"
                      desc="BOM, Work Orders, and shop floor control."
                    />
                    <DropdownLink
                      href="/register?domain=wholesale-distribution"
                      icon={<Globe className="w-5 h-5" />}
                      title="B2B Supply Chain"
                      desc="Wholesale and distribution management."
                    />
                    <DropdownLink
                      href="/features#storefront"
                      icon={<ShoppingBag className="w-5 h-5" />}
                      title="Branded online store"
                      desc="Public storefront in sync with stock & POS."
                    />
                    <DropdownLink
                      href="/features#pos-hospitality"
                      icon={<UtensilsCrossed className="w-5 h-5" />}
                      title="Cafés & restaurants"
                      desc="Tables, service, and kitchen-aware selling."
                    />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-widest">Growth & customers</h4>
                    <DropdownLink
                      href="/solutions/marketing-crm#campaigns"
                      icon={<Megaphone className="w-5 h-5" />}
                      title="Campaigns & marketing"
                      desc="Promotions and segments tied to real orders - not a siloed list tool."
                    />
                    <DropdownLink
                      href="/solutions/marketing-crm#crm"
                      icon={<Heart className="w-5 h-5" />}
                      title="Loyalty & CRM"
                      desc="Rewards and customer context next to POS and web sales."
                    />
                    <DropdownLink
                      href="/features#analytics"
                      icon={<Brain className="w-5 h-5" />}
                      title="Analytics & AI"
                      desc="Dashboards and reporting from one operational ledger."
                    />
                    <DropdownLink
                      href="/solutions/marketing-crm#sales-suite"
                      icon={<TrendingUp className="w-5 h-5" />}
                      title="Quotations & sales pipeline"
                      desc="B2B quotes and follow-ups with live stock awareness."
                    />
                  </div>
                </div>
              </NavDropdown>

              <button type="button" className={navItemClass} onClick={() => router.push('/why-tenvo')}>
                Why TENVO
              </button>
              <button type="button" className={navItemClass} onClick={() => router.push('/features')}>
                Features
              </button>
              <button type="button" className={navItemClass} onClick={() => router.push('/pricing')}>
                Pricing
              </button>
              <button type="button" className={navItemClass} onClick={() => router.push('/industries')}>
                Industries
              </button>
              <button type="button" className={navItemClass} onClick={() => router.push('/integrations')}>
                Integrations
              </button>
              <Link href="/about" className={navItemClass}>
                About
              </Link>
              <Link href="/demo" className={navItemClass}>
                Demo
              </Link>
              <Link href="/contact" className={navItemClass}>
                Contact
              </Link>
              </div>
            </div>

            {/* Utilities + auth: fixed cluster so links never push CTAs to a new row */}
            <div className="flex shrink-0 items-center gap-2 border-l border-neutral-200/90 pl-3 sm:gap-3 sm:pl-4 xl:pl-5">
              <SupportWhatsAppLink
                variant="light"
                className="hidden h-10 items-center lg:inline-flex shrink-0 px-1.5 text-[11px] xl:px-2"
                iconClassName="h-3.5 w-3.5"
              />
              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold uppercase tracking-wider text-neutral-800 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  aria-haspopup="listbox"
                  aria-expanded="false"
                  aria-label={`Display currency: ${currency}`}
                >
                  {currency}
                  <ChevronDown className="h-3 w-3 opacity-50" aria-hidden />
                </button>
                <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-24 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg opacity-0 transition-all duration-200 invisible group-hover:visible group-hover:opacity-100">
                  {['PKR', 'USD', 'AED', 'INR'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors ${currency === c ? 'bg-brand-50 text-brand-primary' : 'text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {showAuthButtons && (
                <div className="flex items-center gap-2">
                  {user ? (
                    <Button
                      onClick={() => handleCTAClick('nav', 'Enter Dashboard', '/multi-business')}
                      className="h-10 shrink-0 rounded-xl bg-brand-primary px-5 font-black text-white shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)] transition-all hover:bg-brand-primary-dark active:scale-[0.98]"
                    >
                      Enter Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="h-10 shrink-0 rounded-xl px-4 font-semibold text-neutral-700 hover:bg-neutral-100"
                        onClick={() => handleCTAClick('nav', 'Log in', '/login')}
                      >
                        Log in
                      </Button>
                      <Button
                        onClick={() => handleCTAClick('nav', 'Start your journey', '/register')}
                        className="h-10 shrink-0 rounded-xl bg-brand-primary px-5 font-black text-white shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)] transition-all hover:bg-brand-primary-dark active:scale-[0.98]"
                      >
                        Start your journey
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-4">
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/why-tenvo')}
            >
              Why TENVO
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/features')}
            >
              Features
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/pricing')}
            >
              Pricing
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/solutions/marketing-crm')}
            >
              Marketing &amp; CRM
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/industries')}
            >
              Industries
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/integrations')}
            >
              Integrations
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/about')}
            >
              About
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/demo')}
            >
              Demo
            </button>
            <button
              className="w-full text-left font-bold text-gray-700 px-2 py-2 hover:text-brand-primary-dark transition-colors"
              onClick={() => router.push('/contact')}
            >
              Contact
            </button>
            <div className="px-2 py-2">
              <SupportWhatsAppLink variant="light" className="text-sm" iconClassName="h-4 w-4" />
            </div>
          </div>

          {showAuthButtons && (
            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100">
              {user ? (
                <Button
                  className="w-full h-12 bg-brand-primary font-black text-white rounded-xl shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)]"
                  onClick={() => handleCTAClick('mobile-nav', 'Enter Dashboard', '/multi-business')}
                >
                  Enter Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full h-12 font-bold rounded-xl"
                    onClick={() => handleCTAClick('mobile-nav', 'Log in', '/login')}
                  >
                    Log in
                  </Button>
                  <Button
                    className="w-full h-12 bg-brand-primary font-black text-white rounded-xl shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)]"
                    onClick={() => handleCTAClick('mobile-nav', 'Start your journey', '/register')}
                  >
                    Start your journey
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// Sub-components
function NavDropdown({ label, isOpen, onToggle, children, triggerClassName }) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={cn(
          'gap-1 font-semibold transition-colors',
          triggerClassName,
          isOpen ? 'text-brand-primary-dark' : undefined
        )}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {isOpen && (
        <div className="absolute top-[calc(100%+12px)] left-0 mt-2 bg-white/96 backdrop-blur-xl border border-slate-200/80 rounded-[32px] shadow-[0_30px_80px_-24px_rgba(15,23,42,0.28)] z-50 animate-in fade-in zoom-in-95 duration-300 p-2 min-w-[200px]">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownLink({ icon, title, desc, href = "#" }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-all hover:bg-gray-50 group"
    >
      <div className="mt-1 p-2 bg-slate-100 rounded-2xl group-hover:bg-brand-primary group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <div className="font-bold text-gray-900 group-hover:text-brand-primary-dark transition-colors text-sm">{title}</div>
        <div className="text-xs text-gray-400 font-medium mt-0.5">{desc}</div>
      </div>
    </button>
  );
}
