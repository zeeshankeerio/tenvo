'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, FileText, Users, Truck, ShoppingCart,
  UtensilsCrossed, Heart, ClipboardList, Landmark, CreditCard, Receipt,
  BarChart3, Building2, Factory,
  UserCog, CheckSquare, Settings, Brain, ShieldCheck,
  Lock, Crown, TrendingUp, BadgeDollarSign,
  ChevronDown, Warehouse, Hash, History, X, Globe, Megaphone,
  Scale, RefreshCcw, BookOpen, ScrollText, FileCheck,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  RotateCcw, ArrowLeftRight, Calendar, Shield, BadgeCheck,
  ExternalLink, Store, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/context/AuthContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import { getNavItemAccess } from '@/lib/rbac/permissions';
import { PLAN_TIERS, FEATURE_LABELS, FEATURE_MIN_PLAN, resolvePlanTier } from '@/lib/config/plans';
import {
  POS_RELEVANT_DOMAINS, HOSPITALITY_DOMAINS, CAMPAIGN_RELEVANT_DOMAINS,
  isPosRelevant, isHospitality, isCampaignRelevant, isMembershipRelevant
} from '@/lib/config/domains';
import { normalizeDashboardTab } from '@/lib/config/tabs';
import toast from 'react-hot-toast';
import { useAppMode } from '@/lib/context/BusyModeContext';
import { useHubReady } from '@/lib/hooks/useHubReady';
import { UserManager } from '../auth/UserManager';
import { LanguageToggle } from '../LanguageToggle';
import { TenvoTextLogo } from '@/components/branding/TenvoTextLogo';
import { HUB_NAV_SECTION } from '@/lib/utils/typography';
import { motion, AnimatePresence } from 'framer-motion';
import { BusinessSwitcherEnhanced } from './BusinessSwitcherEnhanced';

function isPosRelevantDomain(category, domainKnowledge) {
  return isPosRelevant(category, domainKnowledge);
}

function isHospitalityDomain(category) {
  return isHospitality(category);
}

function isCampaignRelevantDomain(category, domainKnowledge) {
  return isCampaignRelevant(category, domainKnowledge);
}

// --- Grouped Navigation Definition ------------------------------------------
// Each item has: key (matches tab param), label, icon, and optional:
//   - alwaysShow: bypass all gating checks
//   - conditionKey: domain-knowledge condition (manufacturing, multiLocation, etc.)
//   - domainOnly: array of domain categories where this item appears
//   - badge: text badge like 'NEW' or 'BETA'

// --- ADVANCED MODE Navigation (full power, consolidated -- no duplicates) -----
// Finance section: Accounting/Expenses/Credit-Notes/Fiscal/Exchange-Rates are all
// sub-tabs inside Finance Hub, so they're removed as standalone sidebar items.
const ADVANCED_NAV_SECTIONS = [
  {
    label: 'ESSENTIALS',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, alwaysShow: true },
      { key: 'inventory', label: 'Inventory & Stock', icon: Package, alwaysShow: true },
      { key: 'invoices', label: 'Sales & Invoicing', icon: FileText, alwaysShow: true },
      { key: 'customers', label: 'Customers', icon: Users, alwaysShow: true },
      { key: 'vendors', label: 'Vendors & Procurement', icon: Building2, alwaysShow: true },
      { key: 'purchases', label: 'Purchase Orders', icon: Truck, alwaysShow: true },
    ]
  },
  {
    label: 'STOREFRONT',
    items: [
      { key: 'orders', label: 'Orders', icon: Package, alwaysShow: true, badge: 'NEW' },
      { key: 'inquiries', label: 'Customer Inquiries', icon: Inbox, alwaysShow: true },
      { key: 'pos', label: 'Point of Sale', icon: ShoppingCart, domainRule: 'posRelevant' },
      { key: 'refunds', label: 'Refunds & Returns', icon: RefreshCcw, domainRule: 'posRelevant' },
      { key: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, domainRule: 'hospitality' },
      { key: 'loyalty', label: 'Loyalty & CRM', icon: Heart, domainRule: 'posRelevant' },
      { key: 'memberships', label: 'Memberships', icon: BadgeCheck, domainRule: 'membershipRelevant' },
      { key: 'quotations', label: 'Quotations', icon: ClipboardList, conditionKey: 'quotations' },
      { key: 'sales', label: 'Sales Manager', icon: TrendingUp, alwaysShow: true },
      { key: 'view-storefront', label: 'View Public Store', icon: ExternalLink, alwaysShow: true, isExternal: true, externalUrl: (business) => business?.handle || business?.domain ? `/store/${business?.handle || business?.domain}` : null },
      { key: 'store-settings', label: 'Store Settings', icon: Store, alwaysShow: true },
    ]
  },
  {
    label: 'FINANCE',
    items: [
      { key: 'finance', label: 'Finance Hub', icon: Landmark, alwaysShow: true },
      { key: 'payments', label: 'Payments', icon: CreditCard, alwaysShow: true },
      { key: 'gst', label: 'Tax / GST', icon: BadgeDollarSign, alwaysShow: true },
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      { key: 'warehouses', label: 'Warehouses', icon: Warehouse, conditionKey: 'multiLocation' },
      { key: 'manufacturing', label: 'Manufacturing', icon: Factory, conditionKey: 'manufacturing' },
      { key: 'batches', label: 'Batches & Serials', icon: Hash, conditionKey: 'batchTracking' },
      { key: 'payroll', label: 'Payroll & HR', icon: UserCog },
      { key: 'approvals', label: 'Approvals', icon: CheckSquare },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { key: 'reports', label: 'Analytics & AI', icon: Brain, alwaysShow: true },
      { key: 'campaigns', label: 'Campaigns & Marketing', icon: Megaphone, domainRule: 'campaignRelevant' },
      { key: 'audit', label: 'Audit Trail', icon: ScrollText },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings },
      { key: 'platform-admin', label: 'Platform Admin', icon: Shield, platformOnly: true },
    ]
  },
];

// --- EASY MODE Navigation (Zoho-competitive, intuitive for all users) --------
// Organized by business workflow: Home → Sell → Buy → Track → Money → Team →
// Insights → System. Mirrors the full advanced module coverage (same keys and
// domain/plan gating) with friendlier labels, so Simple mode is never missing a
// necessary module -- irrelevant items simply stay hidden via getItemState().
const EASY_NAV_SECTIONS = [
  {
    label: 'HOME',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, alwaysShow: true },
    ]
  },
  {
    label: 'SELL',
    items: [
      { key: 'invoices', label: 'Invoices', icon: FileText, alwaysShow: true },
      { key: 'customers', label: 'Customers', icon: Users, alwaysShow: true },
      { key: 'memberships', label: 'Memberships', icon: BadgeCheck, domainRule: 'membershipRelevant' },
      { key: 'orders', label: 'Orders', icon: Package, alwaysShow: true, badge: 'NEW' },
      { key: 'inquiries', label: 'Customer Inquiries', icon: Inbox, alwaysShow: true },
      { key: 'pos', label: 'Point of Sale', icon: ShoppingCart, domainRule: 'posRelevant' },
      { key: 'refunds', label: 'Refunds & Returns', icon: RefreshCcw, domainRule: 'posRelevant' },
      { key: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, domainRule: 'hospitality' },
      { key: 'loyalty', label: 'Loyalty & CRM', icon: Heart, domainRule: 'posRelevant' },
      { key: 'quotations', label: 'Estimates', icon: ClipboardList, conditionKey: 'quotations' },
      { key: 'sales', label: 'Sales Manager', icon: TrendingUp, alwaysShow: true },
      { key: 'view-storefront', label: 'View Public Store', icon: ExternalLink, alwaysShow: true, isExternal: true, externalUrl: (business) => business?.handle || business?.domain ? `/store/${business?.handle || business?.domain}` : null },
      { key: 'store-settings', label: 'Store Settings', icon: Store, alwaysShow: true },
    ]
  },
  {
    label: 'BUY',
    items: [
      { key: 'purchases', label: 'Purchase Orders', icon: Truck, alwaysShow: true },
      { key: 'vendors', label: 'Vendors', icon: Building2, alwaysShow: true },
    ]
  },
  {
    label: 'TRACK',
    items: [
      { key: 'inventory', label: 'Products & Stock', icon: Package, alwaysShow: true },
      { key: 'warehouses', label: 'Warehouses', icon: Warehouse, conditionKey: 'multiLocation' },
      { key: 'manufacturing', label: 'Manufacturing', icon: Factory, conditionKey: 'manufacturing' },
      { key: 'batches', label: 'Batches & Serials', icon: Hash, conditionKey: 'batchTracking' },
    ]
  },
  {
    label: 'MONEY',
    items: [
      { key: 'finance', label: 'Finance Hub', icon: Landmark, alwaysShow: true },
      { key: 'payments', label: 'Payments', icon: CreditCard, alwaysShow: true },
      { key: 'gst', label: 'Tax / GST', icon: BadgeDollarSign, alwaysShow: true },
    ]
  },
  {
    label: 'TEAM',
    items: [
      { key: 'payroll', label: 'Payroll & HR', icon: UserCog },
      { key: 'approvals', label: 'Approvals', icon: CheckSquare },
    ]
  },
  {
    label: 'INSIGHTS',
    items: [
      { key: 'reports', label: 'Reports & AI', icon: BarChart3, alwaysShow: true },
      { key: 'campaigns', label: 'Campaigns & Marketing', icon: Megaphone, domainRule: 'campaignRelevant' },
      { key: 'audit', label: 'Audit Trail', icon: ScrollText },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings },
      { key: 'platform-admin', label: 'Platform Admin', icon: Shield, platformOnly: true },
    ]
  },
];

// Legacy reference kept for backward compat (some code may reference it)
const NAV_SECTIONS = ADVANCED_NAV_SECTIONS;

export function Sidebar({ isOpen, onClose, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const { user } = useAuth();
  const { business, role, planTier: contextPlanTier, isLoading: businessLoading, isPlatformOwner, isPlatformAdmin } = useBusiness();
  const { language } = useLanguage();
  const { appMode, setAppMode, isEasyMode } = useAppMode();
  const t = translations[language];
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hubReady } = useHubReady();
  const currentTab = normalizeDashboardTab(searchParams.get('tab') || 'dashboard');

  const pathParts = pathname?.split('/') || [];
  const handleFromUrl = pathParts[2] || 'retail-shop';
  // Use actual business category for logic, but handle for base URLs
  const category = business?.category || handleFromUrl;
  const baseUrl = `/business/${handleFromUrl}`;

  const domainKnowledge = getDomainKnowledgeForBusiness(category, business);
  const posRelevant = isPosRelevantDomain(category, domainKnowledge);
  const hospitalityDomain = isHospitalityDomain(category);
  const campaignRelevant = isCampaignRelevantDomain(category, domainKnowledge);
  const membershipRelevant = isMembershipRelevant(category);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Keep access gating deterministic between SSR and first client render.
  const safeIsPlatformOwner = hasHydrated ? isPlatformOwner : false;
  const safeIsPlatformAdmin = hasHydrated ? isPlatformAdmin : false;
  const effectiveRole = (!hasHydrated || !hubReady) ? 'viewer' : role;
  const planTier = hasHydrated
    ? (safeIsPlatformOwner ? 'enterprise' : resolvePlanTier(contextPlanTier || business?.plan_tier || 'free'))
    : 'free';
  const planName = safeIsPlatformOwner ? 'Platform Owner' : (PLAN_TIERS[planTier]?.name || 'Free');
  const navAccessReady = hasHydrated && hubReady;

  const [collapsedSections, setCollapsedSections] = useState({});

  // Keyboard shortcut Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSection = (label) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setCollapsedSections(prev => ({ ...prev, [label]: false }));
      return;
    }
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // --- Navigation access control ---------------------------------------------
  // Check if a nav item should be visible + whether it's locked behind subscription
  const getItemState = (item) => {
    // Platform-only items: only visible to platform owner/admin
    if (item.platformOnly && !safeIsPlatformAdmin) {
      return { visible: false, locked: false, requiredPlan: null };
    }

    // Domain-only items: only show for specific business domains
    if (item.domainOnly && !item.domainOnly.includes(category)) {
      return { visible: false, locked: false, requiredPlan: null };
    }

    if (item.domainRule === 'posRelevant' && !posRelevant) {
      return { visible: false, locked: false, requiredPlan: null };
    }
    if (item.domainRule === 'hospitality' && !hospitalityDomain) {
      return { visible: false, locked: false, requiredPlan: null };
    }
    if (item.domainRule === 'campaignRelevant' && !campaignRelevant) {
      return { visible: false, locked: false, requiredPlan: null };
    }
    if (item.domainRule === 'membershipRelevant' && !membershipRelevant) {
      return { visible: false, locked: false, requiredPlan: null };
    }

    // Domain knowledge conditions (manufacturing, multiLocation, etc.)
    if (item.conditionKey === 'manufacturing' && !domainKnowledge?.manufacturingEnabled) {
      return { visible: false, locked: false, requiredPlan: null };
    }
    if (item.conditionKey === 'multiLocation' && !domainKnowledge?.multiLocationEnabled) {
      return { visible: false, locked: false, requiredPlan: null };
    }
    if (item.conditionKey === 'batchTracking' && !domainKnowledge?.batchTrackingEnabled) {
      return { visible: false, locked: false, requiredPlan: null };
    }
    if (item.conditionKey === 'quotations' && !domainKnowledge?.inventoryFeatures?.includes('Quotation Management')) {
      return { visible: false, locked: false, requiredPlan: null };
    }

    // RBAC + Subscription check via the permissions system
    return getNavItemAccess(item.key, effectiveRole, planTier, business?.settings, business?.platformFeatureOverrides);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 bg-white border-e border-gray-200/60 flex flex-col h-screen transition-all duration-300 ease-in-out",
          "lg:translate-x-0 shadow-sm",
          isSidebarCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : (language === 'ur' ? "translate-x-full" : "-translate-x-full")
        )}
      >
        {/* --- Brand Header ---------------------------------------- */}
        <div className={cn(
          "flex-none px-4 pt-4 pb-2 relative group/header flex flex-col gap-1",
          isSidebarCollapsed && "px-0 flex flex-col justify-center pt-3 pb-1"
        )}>
          <Link href="/" className={cn(
            "flex items-center gap-3 hover:opacity-90 transition-opacity",
            isSidebarCollapsed && "flex-col gap-1"
          )}>
            <TenvoTextLogo compact={isSidebarCollapsed} />
          </Link>

          {/* Collapse Toggle Button (Hover visible) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm z-50",
              "hover:bg-gray-50 hover:border-brand-100 transition-all",
              "opacity-0 group-hover/header:opacity-100 lg:opacity-100" // Always show on desktop for discoverability
            )}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>

          {/* Business Switcher */}
          {business?.name && (
            <div className={cn(
              "mt-3",
              isSidebarCollapsed ? "mx-1.5" : "mx-0"
            )}>
              <BusinessSwitcherEnhanced isCollapsed={isSidebarCollapsed} />
            </div>
          )}
        </div>

        {/* --- Grouped Navigation ---------------------------------- */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-0.5 scrollbar-thin">
          {!navAccessReady ? (
            <div className="space-y-2 px-1 py-2">
              {Array.from({ length: isSidebarCollapsed ? 6 : 8 }).map((_, index) => (
                <div
                  key={`sidebar-skeleton-${index}`}
                  className={cn(
                    'animate-pulse rounded-xl bg-gray-100/90',
                    isSidebarCollapsed ? 'mx-auto h-10 w-10' : 'h-10 w-full'
                  )}
                />
              ))}
            </div>
          ) : (isEasyMode ? EASY_NAV_SECTIONS : ADVANCED_NAV_SECTIONS).map((section) => {
            // Filter items for this section based on RBAC + subscription + domain
            const processedItems = section.items.map(item => ({
              ...item,
              ...getItemState(item),
            }));

            const visibleItems = processedItems.filter(i => i.visible);
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsedSections[section.label];

            return (
              <div key={section.label} className="mb-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    "flex items-center w-full px-2.5 py-1.5 mt-2 mb-0.5 hover:text-neutral-600 transition-colors",
                    HUB_NAV_SECTION,
                    isSidebarCollapsed && "justify-center"
                  )}
                >
                  {!isSidebarCollapsed && <span>{section.label}</span>}
                  {!isSidebarCollapsed ? (
                    <ChevronDown className={cn(
                      'w-3 h-3 ml-auto transition-transform duration-200',
                      isCollapsed && '-rotate-90'
                    )} />
                  ) : (
                    <div className="w-4 h-0.5 bg-gray-200 rounded-full" />
                  )}
                </button>

                {/* Nav Items */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      {visibleItems.map((item) => {
                        const isActive = item.key === 'platform-admin'
                          ? pathname === '/admin'
                          : currentTab === item.key;
                        const Icon = item.icon;
                        // Prevent lock-state SSR/client drift from causing hydration mismatch.
                        const isLocked = hasHydrated ? item.locked : false;
                        const isExternal = item.isExternal;
                        const externalUrl = isExternal && item.externalUrl ? item.externalUrl(business) : null;
                        const isExternalDisabled = isExternal && !externalUrl;
                        const itemHref = isExternal 
                          ? externalUrl || '#'
                          : (item.key === 'platform-admin'
                            ? '/admin'
                            : (item.key === 'dashboard' ? baseUrl : `${baseUrl}?tab=${item.key}`));

                        // Use <a> tag for external links, Link for internal
                        const NavLink = isExternal ? 'a' : Link;

                        return (
                          <NavLink
                            key={item.key}
                            href={itemHref}
                            {...(isExternal && externalUrl && { target: '_blank', rel: 'noopener noreferrer' })} 
                            aria-disabled={isLocked || isExternalDisabled}
                            title={isExternalDisabled ? 'Set a store domain in Store Settings to view your public store' : undefined}
                            onClick={(e) => {
                              if (isLocked) {
                                e.preventDefault();
                                return;
                              }
                              if (isExternalDisabled) {
                                e.preventDefault();
                                toast('Set a store domain in Store Settings first', { icon: '🏪' });
                                return;
                              }
                              if (
                                !isExternal &&
                                item.key !== 'platform-admin' &&
                                !e.metaKey &&
                                !e.ctrlKey &&
                                !e.shiftKey &&
                                e.button === 0
                              ) {
                                e.preventDefault();
                                router.push(itemHref, { scroll: false });
                              }
                              if (window.innerWidth < 1024) onClose?.();
                            }}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group mb-0.5",
                              isSidebarCollapsed && "justify-center",
                              isLocked
                                ? "text-gray-400 cursor-not-allowed opacity-60 hover:bg-gray-50"
                                : isActive
                                  ? "bg-brand-50 text-brand-primary-dark font-semibold"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            {/* Active indicator bar */}
                            {isActive && !isLocked && (
                              <motion.div
                                layoutId="nav-active-indicator"
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 bg-brand-primary",
                                  isSidebarCollapsed ? "inset-0 bg-brand-50/60 rounded-lg -z-10 h-full w-full" : "left-0 w-[3px] h-5 rounded-r-full"
                                )}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              />
                            )}

                            <Icon className={cn(
                              "w-[18px] h-[18px] flex-shrink-0",
                              isLocked
                                ? "text-gray-300"
                                : isActive ? "text-brand-primary" : "text-gray-400 group-hover:text-gray-600"
                            )} />

                            {!isSidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}

                            {/* Tooltip for collapsed mode */}
                            {isSidebarCollapsed && (
                              <span className="absolute left-14 px-2.5 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover:translate-x-0 z-[60] shadow-xl whitespace-nowrap">
                                {item.label}
                                {isLocked && " (Locked)"}
                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-gray-900" />
                              </span>
                            )}

                            {/* Lock icon for subscription-gated items */}
                            {isLocked && !isSidebarCollapsed && (
                              <span className="relative group/lock">
                                <Lock className="w-3.5 h-3.5 text-gray-300" />
                                {/* Tooltip */}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] font-semibold bg-gray-900 text-white rounded-md whitespace-nowrap opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none z-50">
                                  Requires {PLAN_TIERS[item.requiredPlan]?.name || 'upgrade'}
                                </span>
                              </span>
                            )}

                            {/* Badge for non-locked items */}
                            {!isLocked && item.badge && !isSidebarCollapsed && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-700 leading-none">
                                {item.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Upgrade nudges are surfaced as a compact, once-per-session bottom
            banner (UpgradeNudgeBanner) rather than persistent sidebar boxes. */}

        {/* --- Footer ---------------------------------------------- */}
        <div className={cn(
          "flex-none p-3 bg-transparent border-t-0",
          isSidebarCollapsed && "p-2 items-center flex flex-col"
        )}>
          <UserManager trigger={
            <button className={cn(
              "w-full bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl p-2 flex items-center gap-2.5 transition-all text-left group relative",
              isSidebarCollapsed && "p-1.5 border-none bg-transparent"
            )}>
              {/* Platform Owner Crown Badge */}
              {safeIsPlatformOwner && !isSidebarCollapsed && (
                <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-1 shadow-sm ring-2 ring-white">
                  <Crown className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0",
                  safeIsPlatformOwner ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-brand-primary"
                )}
              >
                {safeIsPlatformOwner ? <Crown className="w-4 h-4" /> : (user?.email?.substring(0, 2).toUpperCase() || 'ME')}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                    {user?.user_metadata?.full_name || 'My Account'}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {(effectiveRole || 'User').charAt(0).toUpperCase() + (effectiveRole || 'User').slice(1)} · {user?.email}
                  </p>
                </div>
              )}
              {!isSidebarCollapsed && <Settings className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />}
            </button>
          } />
        </div>
      </aside>
    </>
  );
}
