'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronDown, Package, Receipt, Briefcase, Store, Factory, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackNavMenuOpen, trackCTAClick } from '@/lib/analytics/tracking';
import { useAuth } from '@/lib/context/AuthContext';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';

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
    setMobileMenuOpen(false);
    setExpandedMenu(null);
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

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div
            onClick={() => router.push('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <TenvoTextLogo className="group-hover:opacity-95 transition-all duration-300" />
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {/* Solutions Dropdown */}
              <NavDropdown
                label="Solutions"
                isOpen={expandedMenu === 'solutions'}
                onToggle={() => toggleMenu('solutions')}
              >
                <div className="w-[640px] p-8 grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-widest">Enterprise Core</h4>
                    <DropdownLink
                      href="/register"
                      icon={<Package className="w-5 h-5" />}
                      title="Inventory Engine"
                      desc="Precision stock control with batch & serial tracking."
                    />
                    <DropdownLink
                      href="/register"
                      icon={<Receipt className="w-5 h-5" />}
                      title="Tax Compliance"
                      desc="FBR & Local tax localized automation."
                    />
                    <DropdownLink
                      href="/register"
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
                  </div>
                </div>
              </NavDropdown>

              <button
                className="text-sm font-bold text-gray-600 hover:text-brand-primary-dark transition-colors"
                onClick={() => router.push('/features')}
              >
                Features
              </button>
              <button
                className="text-sm font-bold text-gray-600 hover:text-brand-primary-dark transition-colors"
                onClick={() => router.push('/pricing')}
              >
                Pricing
              </button>
              <button
                className="text-sm font-bold text-gray-600 hover:text-brand-primary-dark transition-colors"
                onClick={() => router.push('/industries')}
              >
                Industries
              </button>
            </div>

            <div className="h-4 w-px bg-neutral-200 mx-2" />

            {/* Currency Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-xs font-black tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors uppercase px-2 py-1 rounded-md hover:bg-neutral-100">
                {currency} <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
              <div className="absolute top-[calc(100%+0.5rem)] right-0 bg-white border border-neutral-200 shadow-lg rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-24 z-50">
                {['PKR', 'USD', 'AED', 'INR'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${currency === c ? 'bg-brand-50 text-brand-primary' : 'text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-px bg-neutral-200 mx-2" />

            {/* Auth Buttons */}
            {showAuthButtons && (
              <div className="flex items-center gap-3">
                {user ? (
                  <Button
                    onClick={() => handleCTAClick('nav', 'Enter Dashboard', '/multi-business')}
                    className="bg-brand-primary hover:bg-brand-primary-dark text-white font-black rounded-xl px-6 shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)] transition-all active:scale-[0.98]"
                  >
                    Enter Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl px-5"
                      onClick={() => handleCTAClick('nav', 'Log In', '/login')}
                    >
                      Log In
                    </Button>
                    <Button
                      onClick={() => handleCTAClick('nav', 'Start Your Journey', '/register')}
                      className="bg-brand-primary hover:bg-brand-primary-dark text-white font-black rounded-xl px-6 shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)] transition-all active:scale-[0.98]"
                    >
                      Start Your Journey
                    </Button>
                  </>
                )}
              </div>
            )}
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
              onClick={() => router.push('/industries')}
            >
              Industries
            </button>
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
                    onClick={() => handleCTAClick('mobile-nav', 'Log In', '/login')}
                  >
                    Log In
                  </Button>
                  <Button
                    className="w-full h-12 bg-brand-primary font-black text-white rounded-xl shadow-[0_8px_20px_-8px_rgba(227,66,66,0.6)]"
                    onClick={() => handleCTAClick('mobile-nav', 'Join Enterprise', '/register')}
                  >
                    Join Enterprise
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
function NavDropdown({ label, isOpen, onToggle, children }) {
  return (
    <div className="relative">
      <button
        className={`flex items-center gap-1.5 text-sm font-bold transition-all hover:text-brand-primary-dark ${isOpen ? 'text-brand-primary-dark' : 'text-gray-600'
          }`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
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
      onClick={() => router.push(href)}
      className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all group w-full text-left"
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
