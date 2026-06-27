'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronDown, Package, Receipt, Briefcase, Store, Factory, Globe, ShoppingBag, UtensilsCrossed, Megaphone, Heart, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackNavMenuOpen, trackCTAClick } from '@/lib/analytics/tracking';
import { useAuth } from '@/lib/context/AuthContext';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import MarketingCtaLink from '@/components/marketing/ui/MarketingCtaLink';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';
import { cn } from '@/lib/utils';
import { MARKETING_NAV_HEIGHT } from '@/lib/utils/marketingLayout';
import { modulesForNav } from '@/lib/marketing/capabilities';

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

  const navItemClass =
    'inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-[13px] font-semibold text-neutral-800 transition-colors hover:bg-neutral-100/90 hover:text-brand-primary-dark lg:px-2 lg:text-[12.5px] xl:px-2.5 xl:text-[13px] 2xl:px-3 2xl:text-sm';

  const enterpriseCore = modulesForNav('enterpriseCore');
  const verticals = modulesForNav('verticals');
  const growth = modulesForNav('growth');

  const navIcons = {
    inventory: Package,
    compliance: Receipt,
    accounting: Briefcase,
    pos: Store,
    manufacturing: Factory,
    'sales-pipeline': Globe,
    storefront: ShoppingBag,
    restaurant: UtensilsCrossed,
    campaigns: Megaphone,
    crm: Heart,
    analytics: Brain,
  };

  const verticalHrefs = {
    pos: '/features#pos-hospitality',
    manufacturing: '/features#manufacturing',
    'sales-pipeline': '/register?domain=wholesale-distribution',
    storefront: '/features#storefront',
    restaurant: '/features#pos-hospitality',
  };

  return (
    <nav className={navClasses} aria-label="Primary marketing">
      <div className="mx-auto max-w-[1440px] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(0.25rem,env(safe-area-inset-top))] sm:pl-7 sm:pr-7 lg:pl-10 lg:pr-10 xl:pl-14 xl:pr-14 2xl:pl-16 2xl:pr-16">
        <div className={cn('flex items-center justify-between gap-3 sm:gap-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:justify-items-stretch lg:gap-x-8 xl:gap-x-10', MARKETING_NAV_HEIGHT)}>
          {/* Logo - keep a hard gutter so the first nav control never overlaps the wordmark */}
          <Link
            href="/"
            className="flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-3 rounded-lg outline-none ring-brand-primary/30 transition-all hover:opacity-95 focus-visible:ring-2 sm:max-w-none"
          >
            <TenvoTextLogo />
          </Link>

          {/* Desktop: primary links in the middle column (minmax(0,1fr) allows shrink without colliding into logo) */}
          <div
            className="hidden min-w-0 justify-self-stretch overflow-visible lg:flex lg:items-center lg:justify-center lg:pl-2 xl:pl-4 2xl:pl-6"
            role="navigation"
            aria-label="Product pages"
          >
            <div className="flex min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-0.5 sm:gap-x-1 lg:gap-x-1 xl:gap-x-1.5 2xl:gap-x-2">
              {/* Solutions mega-menu */}
              <NavDropdown
                label="Solutions"
                isOpen={expandedMenu === 'solutions'}
                onToggle={() => toggleMenu('solutions')}
                triggerClassName={navItemClass}
              >
                <div className="grid w-[min(96vw,56rem)] grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-3 lg:gap-8">
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 mb-6 uppercase tracking-widest">Enterprise Core</h4>
                    {enterpriseCore.map((mod) => {
                      const Icon = navIcons[mod.id] || Package;
                      return (
                        <DropdownLink
                          key={mod.id}
                          href={mod.href}
                          icon={<Icon className="w-5 h-5" />}
                          title={mod.title}
                          desc={mod.shortDescription || mod.description}
                        />
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 mb-6 uppercase tracking-widest">Verticals</h4>
                    {verticals.map((mod) => {
                      const Icon = navIcons[mod.id] || Store;
                      return (
                        <DropdownLink
                          key={mod.id}
                          href={verticalHrefs[mod.id] || mod.href}
                          icon={<Icon className="w-5 h-5" />}
                          title={mod.title}
                          desc={mod.shortDescription || mod.description}
                        />
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 mb-6 uppercase tracking-widest">Growth & customers</h4>
                    {growth.map((mod) => {
                      const Icon = navIcons[mod.id] || Megaphone;
                      return (
                        <DropdownLink
                          key={mod.id}
                          href={mod.href}
                          icon={<Icon className="w-5 h-5" />}
                          title={mod.title}
                          desc={mod.shortDescription || mod.description}
                        />
                      );
                    })}
                  </div>
                </div>
              </NavDropdown>

              <button type="button" className={navItemClass} onClick={() => router.push('/features')}>
                Features
              </button>
              <button type="button" className={navItemClass} onClick={() => router.push('/pricing')}>
                Pricing
              </button>
              <button type="button" className={navItemClass} onClick={() => router.push('/industries')}>
                Industries
              </button>
              <Link href="/integrations" className={navItemClass}>
                Integrations
              </Link>
              <NavDropdown
                label="Company"
                isOpen={expandedMenu === 'company'}
                onToggle={() => toggleMenu('company')}
                triggerClassName={navItemClass}
              >
                <div className="min-w-[14rem] space-y-1 p-3">
                  <Link
                    href="/why-tenvo"
                    className="block rounded-xl px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                    onClick={() => setExpandedMenu(null)}
                  >
                    Why TENVO
                  </Link>
                  <Link
                    href="/about"
                    className="block rounded-xl px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                    onClick={() => setExpandedMenu(null)}
                  >
                    About
                  </Link>
                  <MarketingCtaLink
                    href={getBookMeetingHref()}
                    className="block rounded-xl px-4 py-3 text-left text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                    onClick={() => setExpandedMenu(null)}
                  >
                    Book a meeting
                  </MarketingCtaLink>
                </div>
              </NavDropdown>
              <Link href="/contact" className={navItemClass}>
                Contact
              </Link>
            </div>
          </div>

          {/* Right: auth (desktop) + menu toggle (mobile). WhatsApp / currency live in footer & contact. */}
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
            {showAuthButtons ? (
              <div className="hidden items-center gap-2 border-l border-neutral-200/80 pl-3 sm:gap-2.5 sm:pl-4 lg:flex xl:gap-3 xl:pl-5">
                {user ? (
                  <Button
                    onClick={() => handleCTAClick('nav', 'Enter Dashboard', '/multi-business')}
                    className="h-10 shrink-0 rounded-full bg-brand-primary px-4 font-semibold text-white shadow-brand transition-all hover:bg-brand-primary-dark active:scale-[0.98] xl:px-5"
                  >
                    Enter Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="h-10 shrink-0 rounded-lg px-2.5 font-semibold text-neutral-700 hover:bg-neutral-100 sm:px-3 xl:px-4"
                      onClick={() => handleCTAClick('nav', 'Log in', '/login')}
                    >
                      Log in
                    </Button>
                    <Button
                      onClick={() => handleCTAClick('nav', 'Start your journey', '/register')}
                      className="h-10 shrink-0 rounded-full bg-brand-primary px-3.5 font-semibold text-white shadow-brand transition-all hover:bg-brand-primary-dark active:scale-[0.98] sm:px-4 xl:px-5"
                    >
                      <span className="hidden xl:inline">Start your journey</span>
                      <span className="xl:hidden">Get started</span>
                    </Button>
                  </>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-in slide-in-from-top-4 duration-300 max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain">
          <div className="space-y-1 p-4 pb-6">
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/features')}
            >
              Features
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/pricing')}
            >
              Pricing
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/solutions/marketing-crm')}
            >
              Marketing &amp; CRM
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/industries')}
            >
              Industries
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/integrations')}
            >
              Integrations
            </button>
            <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Company</p>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/why-tenvo')}
            >
              Why TENVO
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/about')}
            >
              About
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => {
                trackCTAClick('mobile-nav', 'Book a meeting', getBookMeetingHref());
                window.open(getBookMeetingHref(), '_blank', 'noopener,noreferrer');
                setMobileMenuOpen(false);
              }}
            >
              Book a meeting
            </button>
            <button
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-neutral-50 hover:text-brand-primary-dark"
              onClick={() => router.push('/contact')}
            >
              Contact
            </button>
          </div>

          {showAuthButtons && (
            <div className="flex flex-col gap-2 border-t border-neutral-100 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              {user ? (
                <Button
                  className="w-full h-12 bg-brand-primary font-semibold text-white rounded-xl shadow-brand"
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
                    className="w-full h-12 bg-brand-primary font-semibold text-white rounded-xl shadow-brand"
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
          'inline-flex items-center gap-1.5 font-semibold transition-colors',
          triggerClassName,
          isOpen ? 'text-brand-primary-dark' : undefined
        )}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className={`h-4 w-4 shrink-0 opacity-70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
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
        <div className="text-xs text-gray-400 font-medium mt-0.5 line-clamp-2">{desc}</div>
      </div>
    </button>
  );
}
