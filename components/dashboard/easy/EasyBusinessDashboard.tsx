'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  PieChart,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { HUB_MICRO_LABEL, MARKETING_STAT_VALUE } from '@/lib/utils/typography';
import { DashboardMobileHub } from '@/components/dashboard/mobile/DashboardMobileHub';
import { MobilePresetPills } from '@/components/mobile/MobileHubPrimitives';
import { IndustryInsights } from '@/app/business/[category]/components/islands/IndustryInsights.client';
import {
  deltaVisual,
  normalizeSparklineBars,
  buildTopProductsFromInvoices,
  normalizeExpenseRows,
  EASY_PRESET_OPTIONS,
  buildSalesStatusBreakdown,
  buildTopCustomersFromInvoices,
  buildLowStockSkus,
  countOutOfStock,
  buildCategoryInventory,
  buildInvoiceAging,
  computeNetMarginPct,
  normalizeDualSparkline,
  buildProductSparkHeights,
} from '@/lib/dashboard/easyDashboardHelpers';
import {
  resolveEasyDomainProfile,
  buildDomainCapabilityBadges,
  buildDomainSeasonBadge,
  getDomainTabGuidance,
  getDomainKpiLabels,
  mergeDomainInsights,
  filterInsightsForTab,
  resolveEasyTabForAction,
  buildDomainStockSignals,
  buildEasyTabBadges,
} from '@/lib/dashboard/easyDomainIntelligence';
import { resolveOperationsProfile, getOperationsTabGuidance } from '@/lib/dashboard/domainOperationsIntelligence';
import { DomainOperationsPanel } from '@/components/dashboard/easy/DomainOperationsPanel';

// ---------------------------------------------------------------------------
// Primitives — shadcn-inspired compact cards
// ---------------------------------------------------------------------------

function EasyRingMetric({
  value,
  target = 100,
  label,
  sublabel,
  suffix = '%',
}: {
  value: number;
  target?: number;
  label: string;
  sublabel?: string;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, target > 0 ? (value / target) * 100 : value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative h-[7.5rem] w-[7.5rem]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-neutral-100" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-neutral-800 transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={cn(MARKETING_STAT_VALUE, 'text-xl')}>
            {value}
            {suffix}
          </span>
          <span className="text-[10px] font-medium text-neutral-500">{Math.round(pct)}% of target</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold text-neutral-900">{label}</p>
      {sublabel ? <p className="text-[11px] text-neutral-500">{sublabel}</p> : null}
    </div>
  );
}

function EasyStatTile({
  label,
  value,
  hint,
  trend,
  onClick,
  isLoading = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: number;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 animate-pulse">
        <div className="h-3 w-16 bg-neutral-200 rounded mb-2" />
        <div className="flex items-baseline justify-between gap-2">
          <div className="h-5 w-24 bg-neutral-300 rounded" />
        </div>
        <div className="h-3 w-32 bg-neutral-200 rounded mt-2 opacity-60" />
      </div>
    );
  }

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 text-left transition-colors',
        onClick && 'hover:border-neutral-300 hover:bg-white'
      )}
    >
      <p className={HUB_MICRO_LABEL}>{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="text-lg font-semibold tabular-nums text-neutral-900">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span
            className={cn(
              'inline-flex items-center text-[10px] font-semibold tabular-nums',
              trend > 0 ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {hint ? <p className="mt-1 text-[10px] font-medium text-neutral-500 line-clamp-2">{hint}</p> : null}
    </Tag>
  );
}

function EasyMiniBarChart({ bars, title, subtitle }: { bars: Array<{ label: string; heightPct: number }>; title: string; subtitle?: string }) {
  return (
    <Card className="border-neutral-200 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {subtitle ? <CardDescription className="text-xs">{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {bars.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">Not enough history for this period yet.</p>
        ) : (
          <div className="flex h-28 items-end justify-between gap-1.5">
            {bars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[2rem] rounded-t-md bg-neutral-700 transition-all"
                  style={{ height: `${bar.heightPct}%`, minHeight: '0.35rem' }}
                />
                <span className="text-[10px] font-medium text-neutral-400">{bar.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EasyTransactionRow({
  title,
  subtitle,
  amount,
  status,
  onClick,
}: {
  title: string;
  subtitle?: string;
  amount: string;
  status?: string;
  onClick?: () => void;
}) {
  const statusTone =
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : status?.includes('overdue')
        ? 'bg-rose-50 text-rose-700 border-rose-100'
        : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left hover:border-neutral-100 hover:bg-neutral-50/80"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-500">
          <FileText className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-neutral-900">{title}</p>
          {subtitle ? <p className="text-[10px] text-neutral-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-semibold tabular-nums text-neutral-900">{amount}</span>
        {status ? (
          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase', statusTone)}>{status}</span>
        ) : null}
      </div>
    </button>
  );
}

function EasyRankedRow({ title, meta, value, sparkHeights }: {
  title: string;
  meta?: string;
  value: string;
  sparkHeights?: number[];
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-neutral-900">{title}</p>
        {meta ? <p className="text-[10px] text-neutral-500">{meta}</p> : null}
      </div>
      {sparkHeights && sparkHeights.length > 0 ? (
        <div className="flex h-6 items-end gap-0.5 px-1">
          {sparkHeights.map((h, i) => (
            <div key={i} className="w-1 rounded-sm bg-neutral-400" style={{ height: `${Math.max(20, h)}%` }} />
          ))}
        </div>
      ) : null}
      <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Domain context — vertical intelligence strip
// ---------------------------------------------------------------------------

const DOMAIN_BADGE_TONES: Record<string, string> = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  slate: 'border-neutral-200 bg-neutral-100 text-neutral-700',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  secondary: 'border-neutral-200 bg-neutral-50 text-neutral-600',
};

function EasyDomainChips({
  seasonBadge,
  capabilityBadges,
  max = 3,
}: {
  seasonBadge: { label: string; tone: string } | null;
  capabilityBadges: Array<{ label: string; tone: string }>;
  max?: number;
}) {
  const chips = [
    ...(seasonBadge ? [{ key: seasonBadge.label, label: seasonBadge.label, tone: seasonBadge.tone }] : []),
    ...capabilityBadges.slice(0, max).map((b) => ({ key: b.label, label: b.label, tone: b.tone })),
  ];
  if (chips.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className={cn('h-5 px-1.5 text-[9px] font-medium', DOMAIN_BADGE_TONES[chip.tone])}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  );
}

function EasyQuickActionBar({
  actions,
  onAction,
}: {
  actions: Array<{ id: string; label: string; icon: React.ElementType; color: string }>;
  onAction?: (id: string) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {actions.map((action, index) => {
        const Icon = action.icon;
        const isPrimary = index === 0;
        return (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={isPrimary ? 'default' : 'outline'}
            className={cn(
              'h-7 shrink-0 gap-1.5 px-2.5 text-[11px] font-semibold',
              !isPrimary && 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            )}
            onClick={() => onAction?.(action.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

function EasyDashboardHeader({
  businessName,
  domainVerticalLabel,
  periodLabel,
  currency,
  activePreset,
  presetOptions,
  onDateRangePresetChange,
  quickActions,
  onQuickAction,
  seasonBadge,
  capabilityBadges,
}: {
  businessName?: string;
  domainVerticalLabel: string;
  periodLabel: string;
  currency: string;
  activePreset: string;
  presetOptions: typeof EASY_PRESET_OPTIONS;
  onDateRangePresetChange?: (preset: 'today' | '7d' | '30d' | 'mtd') => void;
  quickActions: Array<{ id: string; label: string; icon: React.ElementType; color: string }>;
  onQuickAction?: (id: string) => void;
  seasonBadge: { label: string; tone: string } | null;
  capabilityBadges: Array<{ label: string; tone: string }>;
}) {
  return (
    <div className="hidden border-b border-neutral-100 bg-white lg:block">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold tracking-tight text-neutral-900">
            {businessName?.trim() || 'Dashboard'}
          </h1>
          <Badge variant="secondary" className="shrink-0 text-[10px] font-medium">
            {domainVerticalLabel}
          </Badge>
          <span className="hidden text-neutral-300 md:inline">·</span>
          <span className="hidden truncate text-[10px] font-medium text-neutral-500 md:inline">{periodLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-medium tabular-nums text-neutral-400">{currency}</span>
          <div className="flex gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
            {presetOptions.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onDateRangePresetChange?.(preset.id as 'today' | '7d' | '30d' | 'mtd')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors',
                  activePreset === preset.id
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-neutral-50 px-4 py-2 sm:px-5">
        <EasyDomainChips seasonBadge={seasonBadge} capabilityBadges={capabilityBadges} />
        <EasyQuickActionBar actions={quickActions} onAction={onQuickAction} />
      </div>
    </div>
  );
}

function EasyDomainTabHint({ text }: { text: string }) {
  return <p className="mb-3 border-l-2 border-neutral-200 pl-2.5 text-[11px] leading-snug text-neutral-500">{text}</p>;
}

function EasyTabInsightStrip({
  insights,
  onAction,
}: {
  insights: Array<{ title: string; text: string; actionTab: string }>;
  onAction?: (tab: string) => void;
}) {
  if (insights.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {insights.map((insight, idx) => (
        <button
          key={`tab-insight-${insight.title}-${idx}`}
          type="button"
          onClick={() => onAction?.(insight.actionTab)}
          className="rounded-lg border border-neutral-100 bg-neutral-50/60 p-2.5 text-left hover:bg-neutral-100/80"
        >
          <p className="text-[10px] font-bold uppercase text-neutral-400">{insight.title}</p>
          <p className="mt-0.5 text-[11px] font-medium text-neutral-700 line-clamp-2">{insight.text}</p>
        </button>
      ))}
    </div>
  );
}

function EasyProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-neutral-600">{label}</span>
        <span className="font-semibold tabular-nums text-neutral-900">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function EasyTabTrigger({
  value,
  label,
  badge,
}: {
  value: string;
  label: string;
  badge?: number | null;
}) {
  return (
    <TabsTrigger value={value} className="h-7 gap-1 px-2.5 text-[11px] sm:text-xs">
      {label}
      {badge != null && badge > 0 ? (
        <Badge variant="warning" className="h-4 min-w-4 px-1 text-[9px] font-bold tabular-nums">
          {badge > 99 ? '99+' : badge}
        </Badge>
      ) : null}
    </TabsTrigger>
  );
}

// ---------------------------------------------------------------------------
// Main Easy dashboard
// ---------------------------------------------------------------------------

function EasyBreakdownList({
  rows,
}: {
  rows: Array<{ label: string; value: string; tone?: string }>;
}) {
  return (
    <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 bg-neutral-50/50">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-medium text-neutral-600">{row.label}</span>
          <span className={cn('text-xs font-semibold tabular-nums', row.tone || 'text-neutral-900')}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function EasyDualBarChart({
  rows,
  title,
  subtitle,
}: {
  rows: Array<{ label: string; revenuePct: number; expensePct: number; revenue: number; expenses: number }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-neutral-200 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        {subtitle ? <CardDescription className="text-xs">{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-500">No ledger history yet.</p>
        ) : (
          <div className="flex h-32 items-end justify-between gap-1.5">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full max-w-[2.5rem] items-end justify-center gap-0.5">
                  <div className="w-[42%] rounded-t-sm bg-neutral-800" style={{ height: `${row.revenuePct}%`, minHeight: '0.25rem' }} title={`Revenue ${row.revenue}`} />
                  <div className="w-[42%] rounded-t-sm bg-neutral-300" style={{ height: `${row.expensePct}%`, minHeight: '0.25rem' }} title={`Expenses ${row.expenses}`} />
                </div>
                <span className="text-[10px] font-medium text-neutral-400">{row.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-4 text-[10px] text-neutral-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-neutral-800" /> Revenue</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-neutral-300" /> Expenses</span>
        </div>
      </CardContent>
    </Card>
  );
}

export interface EasyBusinessDashboardProps {
  businessId?: string | null;
  business?: { name?: string; country?: string } | null;
  category: string;
  currency: string;
  domainKnowledge?: Record<string, unknown>;
  domainVerticalLabel: string;
  periodLabel: string;
  activePreset: string;
  onQuickAction?: (actionId: string) => void;
  onDateRangePresetChange?: (preset: 'today' | '7d' | '30d' | 'mtd' | '90d' | 'last_month' | 'ytd') => void;
  dateRange: { from: Date; to: Date };
  invoices: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  expenseBreakdown?: Array<Record<string, unknown>>;
  chartData?: Array<Record<string, unknown>>;
  dashboardMetrics?: Record<string, unknown> | null;
  formatCurrencyCompact: (amount: number) => string;
  greeting: string;
  userName: string;
  commandStrip: Array<{ label: string; value: string | number; tone: string; icon: React.ElementType }>;
  healthPanels: Array<{ label: string; value: string; detail: string; tone: string }>;
  insights: Array<{ title: string; text: string; tone: string; actionTab: string }>;
  reminders: { lowStock?: number; overdueInvoices?: number; pendingOrders?: number };
  hasCoreData: boolean;
  quickSetupSteps: Array<{ id: string; label: string }>;
  quickActions: Array<{ id: string; label: string; desc: string; icon: React.ElementType; color: string }>;
  domainEfficiency: number;
  periodMetrics: {
    currentRevenue: number;
    previousRevenue: number;
    currentOrders: number;
    previousOrders: number;
    currentExpenses: number;
    previousExpenses: number;
    currentCustomers: number;
    previousCustomers: number;
    soldUnits: number;
    returnInvoices: number;
    previousReturnInvoices: number;
    pendingReturns: number;
  };
  revenueTrend: number;
  ordersTrend: number;
  customerTrend: number;
  expenseTrend: number;
  outstandingAmount: number;
  openInvoicesCount: number;
  inventoryValue: number;
  inStockUnits: number;
  coverageDays: number;
  avgOrderValue: number;
  returnRate: number;
  paidOrderRateDisplay: string;
  paidOrderRate: number | null;
  cashFlowCurrent: number;
  cashFlowGrowth: number;
  campaignEnabled: boolean;
  multiLocationEnabled: boolean;
  warehouseUtilizationDisplay: string;
  stockCheckRecencyDisplay: string;
  metricsPending?: boolean;
}

export function EasyBusinessDashboard(props: EasyBusinessDashboardProps) {
  const {
    businessId,
    business,
    category,
    currency,
    domainKnowledge,
    domainVerticalLabel,
    periodLabel,
    activePreset,
    onQuickAction,
    onDateRangePresetChange,
    dateRange,
    invoices,
    products,
    customers,
    expenseBreakdown = [],
    chartData = [],
    formatCurrencyCompact,
    greeting,
    userName,
    commandStrip,
    healthPanels,
    insights,
    reminders,
    hasCoreData,
    quickSetupSteps,
    quickActions,
    domainEfficiency,
    periodMetrics,
    revenueTrend,
    ordersTrend,
    customerTrend,
    expenseTrend,
    outstandingAmount,
    openInvoicesCount,
    inventoryValue,
    inStockUnits,
    coverageDays,
    avgOrderValue,
    returnRate,
    paidOrderRateDisplay,
    paidOrderRate,
    cashFlowCurrent,
    cashFlowGrowth,
    campaignEnabled,
    multiLocationEnabled,
    warehouseUtilizationDisplay,
    stockCheckRecencyDisplay,
    metricsPending = false,
  } = props;

  const [activeTab, setActiveTab] = useState('overview');
  const [operationsBadge, setOperationsBadge] = useState<number | null>(null);

  const handleInsightAction = useCallback(
    (actionTab: string) => {
      const easyTab = resolveEasyTabForAction(actionTab);
      if (easyTab) {
        setActiveTab(easyTab);
        return;
      }
      onQuickAction?.(actionTab);
    },
    [onQuickAction]
  );

  const domainProfile = useMemo(
    () => resolveEasyDomainProfile(category, domainKnowledge, business),
    [category, domainKnowledge, business]
  );
  const operationsProfile = useMemo(
    () => resolveOperationsProfile(category, domainKnowledge, business),
    [category, domainKnowledge, business]
  );
  const domainKpiLabels = useMemo(() => getDomainKpiLabels(domainProfile), [domainProfile]);
  const capabilityBadges = useMemo(() => buildDomainCapabilityBadges(domainProfile), [domainProfile]);
  const seasonBadge = useMemo(() => buildDomainSeasonBadge(domainProfile), [domainProfile]);

  const mergedInsights = useMemo(
    () =>
      mergeDomainInsights(insights, domainProfile, {
        reminders,
        coverageDays,
        revenueTrend,
      }),
    [insights, domainProfile, reminders, coverageDays, revenueTrend]
  );

  const tabInsights = useMemo(
    () => filterInsightsForTab(mergedInsights, activeTab as 'overview' | 'sales' | 'accounts' | 'stock' | 'customers' | 'insights' | 'operations'),
    [mergedInsights, activeTab]
  );

  const tabGuidance = useMemo(() => {
    if (activeTab === 'operations') return getOperationsTabGuidance(operationsProfile);
    return getDomainTabGuidance(
      domainProfile,
      activeTab as 'overview' | 'sales' | 'accounts' | 'stock' | 'customers' | 'insights' | 'operations'
    );
  }, [domainProfile, operationsProfile, activeTab]);

  const tabBadges = useMemo(
    () => buildEasyTabBadges(reminders, { operations: operationsBadge }),
    [reminders, operationsBadge]
  );

  const easyMobileTabOptions = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'sales', label: 'Sales' },
      { id: 'accounts', label: 'Accounts' },
      { id: 'stock', label: domainKpiLabels.stockTabTitle.split(/\s+/)[0] || 'Stock' },
      { id: 'customers', label: 'Customers' },
      { id: 'operations', label: 'Ops' },
      { id: 'insights', label: 'Insights' },
    ],
    [domainKpiLabels.stockTabTitle]
  );

  const sparkBars = useMemo(() => normalizeSparklineBars(chartData, 6), [chartData]);
  const dualSpark = useMemo(() => normalizeDualSparkline(chartData, 6), [chartData]);
  const topProducts = useMemo(
    () => buildTopProductsFromInvoices(invoices, dateRange, 5),
    [invoices, dateRange]
  );
  const topCustomers = useMemo(
    () => buildTopCustomersFromInvoices(invoices, dateRange, 5),
    [invoices, dateRange]
  );
  const salesBreakdown = useMemo(
    () => buildSalesStatusBreakdown(invoices, dateRange),
    [invoices, dateRange]
  );
  const lowStockSkus = useMemo(() => buildLowStockSkus(products, 6), [products]);
  const categoryInventory = useMemo(() => buildCategoryInventory(products, 5), [products]);
  const outOfStockCount = useMemo(() => countOutOfStock(products), [products]);
  const invoiceAging = useMemo(() => buildInvoiceAging(invoices), [invoices]);
  const expenseRows = useMemo(() => normalizeExpenseRows(expenseBreakdown, 6), [expenseBreakdown]);

  const domainStockSignals = useMemo(
    () =>
      buildDomainStockSignals(domainProfile, {
        coverageDays,
        lowStock: reminders.lowStock,
        outOfStock: outOfStockCount,
        multiLocationEnabled,
      }),
    [domainProfile, coverageDays, reminders.lowStock, outOfStockCount, multiLocationEnabled]
  );

  const netMarginPct = useMemo(
    () => computeNetMarginPct(periodMetrics.currentRevenue, periodMetrics.currentExpenses),
    [periodMetrics.currentRevenue, periodMetrics.currentExpenses]
  );

  const unitsPerOrder = useMemo(() => {
    const orders = Math.max(periodMetrics.currentOrders, 1);
    return (periodMetrics.soldUnits / orders).toFixed(1);
  }, [periodMetrics.soldUnits, periodMetrics.currentOrders]);

  const avgUnitValue = useMemo(() => {
    const units = Math.max(inStockUnits, 1);
    return inventoryValue / units;
  }, [inventoryValue, inStockUnits]);

  const revenuePerCustomer = useMemo(() => {
    const buyers = Math.max(periodMetrics.currentCustomers, 1);
    return periodMetrics.currentRevenue / buyers;
  }, [periodMetrics.currentRevenue, periodMetrics.currentCustomers]);

  const cashDelta = deltaVisual(cashFlowGrowth, 'growth');

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime())
        .slice(0, 6),
    [invoices]
  );

  const revDelta = deltaVisual(revenueTrend, 'growth');
  const ordDelta = deltaVisual(ordersTrend, 'growth');
  const custDelta = deltaVisual(customerTrend, 'growth');
  const expDelta = deltaVisual(expenseTrend, 'expense');

  const resolvedPreset =
    activePreset === 'custom' || activePreset === '90d' || activePreset === 'last_month' || activePreset === 'ytd'
      ? '30d'
      : activePreset;

  const efficiencyTone = domainEfficiency >= 85 ? 'success' : domainEfficiency >= 65 ? 'warning' : 'secondary';

  return (
    <div className="w-full min-w-0 space-y-3 overflow-x-hidden bg-neutral-50/80 p-0 lg:p-1">
      <DashboardMobileHub
        mode="easy"
        metricsPending={metricsPending}
        greeting={greeting}
        userName={userName}
        businessName={business?.name}
        periodLabel={periodLabel}
        presetOptions={EASY_PRESET_OPTIONS}
        activePreset={resolvedPreset}
        onDateRangePresetChange={(preset) =>
          onDateRangePresetChange?.(preset as 'today' | '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd')
        }
        kpiStrip={commandStrip.map((item) => ({
          label: item.label.replace(' invoices', '').replace('Invoices', 'Invoices'),
          value: item.value,
          alert: item.tone.includes('rose') || item.tone.includes('amber'),
          tone: item.tone,
        }))}
        quickActions={quickActions.map((a) => ({
          id: a.id,
          label: a.label,
          sublabel: a.desc,
          icon: a.icon,
        }))}
        onQuickAction={onQuickAction}
        healthPanels={healthPanels}
        reminders={reminders}
        hasCoreData={hasCoreData}
        quickSetupSteps={quickSetupSteps}
      />

      <Card className="overflow-hidden border-neutral-200 shadow-sm">
        <div className="hidden lg:block">
        <EasyDashboardHeader
          businessName={business?.name}
          domainVerticalLabel={domainVerticalLabel}
          periodLabel={periodLabel}
          currency={currency}
          activePreset={activePreset}
          presetOptions={EASY_PRESET_OPTIONS}
          onDateRangePresetChange={onDateRangePresetChange}
          quickActions={quickActions}
          onQuickAction={onQuickAction}
          seasonBadge={seasonBadge}
          capabilityBadges={capabilityBadges}
        />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white">
          <div className="border-b border-neutral-100 px-3 py-2 lg:hidden">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Dashboard views</p>
            <MobilePresetPills
              compact
              options={easyMobileTabOptions}
              activeId={activeTab}
              onSelect={(id) => setActiveTab(id)}
            />
          </div>
          <div className="hidden border-b border-neutral-100 px-4 py-2 sm:px-5 lg:block">
            <TabsList className="flex h-auto min-h-8 w-full flex-wrap justify-start gap-0.5 bg-neutral-100/80 p-0.5 sm:w-auto">
              <EasyTabTrigger value="overview" label="Overview" />
              <EasyTabTrigger value="sales" label="Sales" badge={tabBadges.sales} />
              <EasyTabTrigger value="accounts" label="Accounts" badge={tabBadges.accounts} />
              <EasyTabTrigger value="stock" label={domainKpiLabels.stockTabTitle} badge={tabBadges.stock} />
              <EasyTabTrigger value="customers" label="Customers" />
              <EasyTabTrigger value="operations" label={operationsProfile.tabLabel} badge={tabBadges.operations} />
              <EasyTabTrigger value="insights" label="Insights" />
            </TabsList>
          </div>

          <div className="px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4 lg:pb-4">
            {!hasCoreData && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-cyan-100 bg-cyan-50/50 px-3 py-2.5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] font-medium text-cyan-900">Add products, customers, or an invoice to unlock full insights.</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickSetupSteps.map((step) => (
                      <Button key={step.id} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onQuickAction?.(step.id)}>
                        {step.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'overview' ? <EasyDomainTabHint text={tabGuidance} /> : null}

            {/* OVERVIEW */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <EasyStatTile label="Revenue" value={formatCurrencyCompact(periodMetrics.currentRevenue)} hint={periodLabel} trend={Number(revenueTrend.toFixed(1))} onClick={() => onQuickAction?.('reports')} isLoading={metricsPending} />
                <EasyStatTile label={domainKpiLabels.ordersLabel} value={periodMetrics.currentOrders} hint={`${periodMetrics.soldUnits} ${domainKpiLabels.unitsSold.toLowerCase()}`} trend={Number(ordersTrend.toFixed(1))} onClick={() => onQuickAction?.('invoices')} isLoading={metricsPending} />
                <EasyStatTile label={domainKpiLabels.inventoryLabel} value={formatCurrencyCompact(inventoryValue)} hint={`${inStockUnits.toLocaleString()} units`} onClick={() => onQuickAction?.('inventory')} isLoading={metricsPending} />
                <EasyStatTile label="Receivables" value={formatCurrencyCompact(outstandingAmount)} hint={`${openInvoicesCount} open`} onClick={() => onQuickAction?.('invoices')} isLoading={metricsPending} />
                <EasyStatTile
                  label="Customers"
                  value={periodMetrics.currentCustomers}
                  hint="Active in period"
                  trend={Number(customerTrend.toFixed(1))}
                  onClick={() => onQuickAction?.('customers')}
                  isLoading={metricsPending}
                />
                <EasyStatTile label="Efficiency" value={`${domainEfficiency}%`} hint={domainEfficiency >= 85 ? 'Healthy' : 'Review alerts'} isLoading={metricsPending} />
              </div>

              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />

              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-semibold text-neutral-700">Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-neutral-500">Net margin</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{netMarginPct.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-neutral-500">Paid order ratio</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{paidOrderRateDisplay}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-neutral-500">Low-stock SKUs</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{reminders.lowStock ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase text-neutral-500">Pending orders</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{reminders.pendingOrders ?? 0}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-12">
                <Card className="border-neutral-200 shadow-sm lg:col-span-4">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-semibold text-neutral-700">Efficiency</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center pb-4">
                    <EasyRingMetric
                      value={domainEfficiency}
                      target={100}
                      label="Efficiency score"
                      sublabel={domainEfficiency >= 85 ? 'In control' : 'Review alerts below'}
                    />
                    <Badge variant={(efficiencyTone === 'success' ? 'success' : efficiencyTone === 'warning' ? 'warning' : 'secondary') as 'success' | 'warning' | 'secondary'} className="mt-1">
                      {domainEfficiency >= 85 ? 'Healthy' : domainEfficiency >= 65 ? 'Watch' : 'Needs action'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm lg:col-span-8">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-semibold text-neutral-700">Period movement</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-neutral-500" onClick={() => onQuickAction?.('reports')}>
                      Full analytics
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Revenue', delta: revDelta },
                        { label: 'Orders', delta: ordDelta },
                        { label: 'Customers', delta: custDelta },
                        { label: 'Spend', delta: expDelta },
                      ].map((row) => (
                        <div key={row.label} className="rounded-lg bg-neutral-50 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase text-neutral-500">{row.label}</p>
                          <p className={cn('mt-1 text-sm', row.delta.className)}>{row.delta.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Next steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mergedInsights.slice(0, 4).map((insight, idx) => (
                      <button
                        key={`${insight.title}-${idx}`}
                        type="button"
                        onClick={() => handleInsightAction(insight.actionTab)}
                        className="w-full rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5 text-left hover:bg-neutral-100/80"
                      >
                        <p className="text-[10px] font-bold uppercase text-neutral-400">{insight.title}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-700">{insight.text}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(reminders.lowStock ?? 0) === 0 && (reminders.overdueInvoices ?? 0) === 0 && (reminders.pendingOrders ?? 0) === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-semibold">No urgent stock, collections, or order issues.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(reminders.pendingOrders ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => onQuickAction?.('invoices')}
                            className="flex w-full items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-left"
                          >
                            <span className="text-xs font-semibold text-cyan-900">{reminders.pendingOrders} pending orders</span>
                            <span className="text-[10px] font-bold text-cyan-700">Review →</span>
                          </button>
                        )}
                        {(reminders.lowStock ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => onQuickAction?.('inventory')}
                            className="flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-left"
                          >
                            <span className="text-xs font-semibold text-amber-900">{reminders.lowStock} low-stock SKUs</span>
                            <span className="text-[10px] font-bold text-amber-700">Restock →</span>
                          </button>
                        )}
                        {(reminders.overdueInvoices ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => onQuickAction?.('invoices')}
                            className="flex w-full items-center justify-between rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2 text-left"
                          >
                            <span className="text-xs font-semibold text-rose-900">{reminders.overdueInvoices} overdue invoices</span>
                            <span className="text-[10px] font-bold text-rose-700">Collect →</span>
                          </button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SALES */}
            <TabsContent value="sales" className="mt-0 space-y-4">
              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EasyStatTile label="Revenue" value={formatCurrencyCompact(periodMetrics.currentRevenue)} hint={periodLabel} trend={Number(revenueTrend.toFixed(1))} isLoading={metricsPending} />
                <EasyStatTile label={domainKpiLabels.ordersLabel} value={periodMetrics.currentOrders} hint={`${periodMetrics.soldUnits} ${domainKpiLabels.unitsSold.toLowerCase()}`} trend={Number(ordersTrend.toFixed(1))} isLoading={metricsPending} />
                <EasyStatTile label="Avg order" value={formatCurrencyCompact(avgOrderValue)} hint="Per closed order" isLoading={metricsPending} />
                <EasyStatTile label={domainKpiLabels.unitsSold} value={unitsPerOrder} hint="Per order" isLoading={metricsPending} />
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EasyStatTile label="Paid sales" value={salesBreakdown.paidCount} hint={formatCurrencyCompact(salesBreakdown.paidRevenue)} isLoading={metricsPending} />
                <EasyStatTile label="Open sales" value={salesBreakdown.openCount} hint={formatCurrencyCompact(salesBreakdown.openRevenue)} isLoading={metricsPending} />
                <EasyStatTile label="Pending" value={salesBreakdown.pendingCount} hint="Awaiting fulfillment" onClick={() => onQuickAction?.('invoices')} isLoading={metricsPending} />
                <EasyStatTile label="Returns" value={periodMetrics.returnInvoices} hint={`${returnRate.toFixed(1)}% · ${periodMetrics.pendingReturns} pending`} isLoading={metricsPending} />
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                <Card className="border-neutral-200 shadow-sm lg:col-span-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Prior period compare</CardTitle>
                    <CardDescription className="text-xs">Same-length window before {periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span className="text-neutral-500">Revenue</span>
                      <span className="font-semibold tabular-nums">{formatCurrencyCompact(periodMetrics.previousRevenue)}</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span className="text-neutral-500">Orders</span>
                      <span className="font-semibold tabular-nums">{periodMetrics.previousOrders}</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-neutral-50 px-3 py-2">
                      <span className="text-neutral-500">Change</span>
                      <span className={revDelta.className}>{revDelta.text} revenue</span>
                    </div>
                  </CardContent>
                </Card>
                <div className="lg:col-span-5">
                  <EasyMiniBarChart bars={sparkBars} title="Revenue trend" subtitle="Last 6 months from ledger" />
                </div>
                <Card className="border-neutral-200 shadow-sm lg:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sales mix</CardTitle>
                    <CardDescription className="text-xs">Paid vs open in period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <EasyProgressRow
                        label="Paid revenue share"
                        value={salesBreakdown.paidRevenue}
                        total={salesBreakdown.paidRevenue + salesBreakdown.openRevenue}
                      />
                      <div className="my-3 h-px w-full bg-neutral-200" role="separator" />
                      <EasyBreakdownList
                        rows={[
                          { label: 'Paid revenue', value: formatCurrencyCompact(salesBreakdown.paidRevenue) },
                          { label: 'Open revenue', value: formatCurrencyCompact(salesBreakdown.openRevenue), tone: 'text-amber-700' },
                          { label: 'Paid documents', value: String(salesBreakdown.paidCount) },
                          { label: 'Open documents', value: String(salesBreakdown.openCount) },
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top movers</CardTitle>
                    <CardDescription className="text-xs">By line revenue in {periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topProducts.length === 0 ? (
                      <p className="py-4 text-center text-xs text-neutral-500">No line items in this period yet.</p>
                    ) : (
                      topProducts.map((row) => (
                        <EasyRankedRow
                          key={row.name}
                          title={row.name}
                          meta={`${row.qty} units`}
                          value={formatCurrencyCompact(row.revenue)}
                          sparkHeights={buildProductSparkHeights(invoices, row.name, dateRange, 4)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm">Recent transactions</CardTitle>
                    <CardDescription className="text-xs">Latest sales documents in your workspace</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onQuickAction?.('invoices')}>
                    View all
                  </Button>
                </CardHeader>
                <CardContent className="divide-y divide-neutral-100 p-0 px-2">
                  {recentInvoices.length === 0 ? (
                    <p className="py-8 text-center text-xs text-neutral-500">No invoices yet. Create your first sale.</p>
                  ) : (
                    recentInvoices.map((inv, idx) => {
                      const status = String(inv.status || 'draft').toLowerCase();
                      return (
                        <EasyTransactionRow
                          key={idx}
                          title={String(inv.customer_name || 'Walk-in customer')}
                          subtitle={inv.date ? new Date(String(inv.date)).toLocaleDateString() : ''}
                          amount={formatCurrencyCompact(Number(inv.grand_total) || Number(inv.amount) || 0)}
                          status={status}
                          onClick={() => onQuickAction?.('invoices')}
                        />
                      );
                    })
                  )}
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            {/* ACCOUNTS */}
            <TabsContent value="accounts" className="mt-0 space-y-4">
              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
                <EasyStatTile label="Receivables" value={formatCurrencyCompact(outstandingAmount)} hint={`${openInvoicesCount} open`} onClick={() => onQuickAction?.('invoices')} isLoading={metricsPending} />
                <EasyStatTile label="Overdue" value={reminders.overdueInvoices ?? 0} hint={formatCurrencyCompact(invoiceAging.overdueAmount)} onClick={() => onQuickAction?.('invoices')} isLoading={metricsPending} />
                <EasyStatTile label="Period revenue" value={formatCurrencyCompact(periodMetrics.currentRevenue)} hint={periodLabel} trend={Number(revenueTrend.toFixed(1))} isLoading={metricsPending} />
                <EasyStatTile label="Period spend" value={formatCurrencyCompact(periodMetrics.currentExpenses)} hint="Operating costs" trend={Number(expenseTrend.toFixed(1))} isLoading={metricsPending} />
                <EasyStatTile label="Net margin" value={`${netMarginPct.toFixed(1)}%`} hint="Revenue minus spend" isLoading={metricsPending} />
                <EasyStatTile label="Cash flow" value={formatCurrencyCompact(cashFlowCurrent)} hint={periodLabel} trend={Number(cashFlowGrowth.toFixed(1))} isLoading={metricsPending} />
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                <Card className="border-neutral-200 shadow-sm lg:col-span-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Period P&amp;L snapshot</CardTitle>
                    <CardDescription className="text-xs">{periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EasyBreakdownList
                      rows={[
                        { label: 'Revenue', value: formatCurrencyCompact(periodMetrics.currentRevenue) },
                        { label: 'Expenses', value: formatCurrencyCompact(periodMetrics.currentExpenses), tone: 'text-amber-700' },
                        {
                          label: 'Net (est.)',
                          value: formatCurrencyCompact(periodMetrics.currentRevenue - periodMetrics.currentExpenses),
                          tone: periodMetrics.currentRevenue >= periodMetrics.currentExpenses ? 'text-emerald-700' : 'text-rose-700',
                        },
                        { label: 'Margin', value: `${netMarginPct.toFixed(1)}%` },
                      ]}
                    />
                    <Button variant="outline" size="sm" className="mt-4 h-8 w-full text-xs" onClick={() => onQuickAction?.('finance')}>
                      Open finance hub
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm lg:col-span-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Receivables due</CardTitle>
                    <CardDescription className="text-xs">Collections and aging</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={cn(MARKETING_STAT_VALUE, 'text-2xl')}>{formatCurrencyCompact(outstandingAmount)}</p>
                    <Badge variant={outstandingAmount > 0 ? 'warning' : 'success'} className="mt-2">
                      {openInvoicesCount > 0 ? `${openInvoicesCount} open invoices` : 'Clear'}
                    </Badge>
                    <div className="my-4 h-px w-full bg-neutral-200" role="separator" />
                    <div className="space-y-3">
                      <EasyProgressRow
                        label="Collected (all time)"
                        value={invoiceAging.collectedAmount}
                        total={invoiceAging.collectedAmount + invoiceAging.openAmount}
                      />
                      {invoiceAging.openAmount > 0 ? (
                        <EasyProgressRow
                          label="Overdue share of open AR"
                          value={invoiceAging.overdueAmount}
                          total={invoiceAging.openAmount}
                        />
                      ) : null}
                    </div>
                    <div className="my-4 h-px w-full bg-neutral-200" role="separator" />
                    <EasyBreakdownList
                      rows={[
                        { label: 'Open amount', value: formatCurrencyCompact(invoiceAging.openAmount) },
                        { label: 'Overdue amount', value: formatCurrencyCompact(invoiceAging.overdueAmount), tone: 'text-rose-700' },
                        { label: 'Collected (all time)', value: formatCurrencyCompact(invoiceAging.collectedAmount) },
                        { label: 'Paid order ratio', value: paidOrderRateDisplay },
                        { label: 'Cash flow change', value: cashDelta.text, tone: cashDelta.className },
                      ]}
                    />
                    <Button className="mt-4 h-8 w-full text-xs" onClick={() => onQuickAction?.('payments')}>
                      Record payment
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm lg:col-span-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4" />
                      Expense breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">By GL category in range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline justify-between">
                      <p className="text-xl font-semibold tabular-nums">{formatCurrencyCompact(periodMetrics.currentExpenses)}</p>
                      <span className={expDelta.className}>{expDelta.text}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {expenseRows.length === 0 ? (
                        <p className="text-xs text-neutral-500">No categorized expenses in this range.</p>
                      ) : (
                        expenseRows.map((row) => (
                          <div key={row.label} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                            <span className="text-xs font-medium text-neutral-700">{row.label}</span>
                            <span className="text-xs font-semibold tabular-nums">{formatCurrencyCompact(row.value)}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={() => onQuickAction?.('expenses')}>
                      View expenses
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <EasyDualBarChart rows={dualSpark} title="Revenue vs expenses" subtitle="Last 6 months from general ledger" />
            </TabsContent>

            {/* STOCK */}
            <TabsContent value="stock" className="mt-0 space-y-4">
              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />

              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-semibold text-neutral-700">{domainProfile.name} signals</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {domainStockSignals.map((signal) => {
                    const tone = 'tone' in signal ? (signal as { tone?: string }).tone : undefined;
                    return (
                    <div key={signal.label} className="rounded-lg border border-neutral-100 bg-neutral-50/70 px-3 py-2">
                      <p className={HUB_MICRO_LABEL}>{signal.label}</p>
                      <p className={cn('mt-1 text-sm font-semibold tabular-nums', tone || 'text-neutral-900')}>{signal.value}</p>
                      <p className="mt-0.5 text-[10px] text-neutral-500">{signal.hint}</p>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EasyStatTile label={domainKpiLabels.inventoryLabel} value={formatCurrencyCompact(inventoryValue)} hint="At cost" onClick={() => onQuickAction?.('inventory')} isLoading={metricsPending} />
                <EasyStatTile label="Units on hand" value={inStockUnits.toLocaleString()} hint={`Avg ${formatCurrencyCompact(avgUnitValue)}/unit`} isLoading={metricsPending} />
                <EasyStatTile
                  label="Low stock"
                  value={reminders.lowStock ?? 0}
                  hint={
                    domainProfile.expiryTracking
                      ? 'FEFO priority on dated SKUs'
                      : (reminders.lowStock ?? 0) > 0
                        ? 'Below safety level'
                        : 'Stable'
                  }
                  onClick={() => onQuickAction?.('inventory')}
                  isLoading={metricsPending}
                />
                <EasyStatTile label="Out of stock" value={outOfStockCount} hint={`${products.length} SKUs in catalog`} onClick={() => onQuickAction?.('inventory')} isLoading={metricsPending} />
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EasyStatTile label="Coverage" value={coverageDays > 365 ? '365+' : coverageDays} hint="Estimated days" isLoading={metricsPending} />
                <EasyStatTile
                  label={multiLocationEnabled ? 'Warehouse util.' : 'Stock recency'}
                  value={multiLocationEnabled ? warehouseUtilizationDisplay : stockCheckRecencyDisplay}
                  hint={multiLocationEnabled ? 'Capacity usage' : 'Since last touch'}
                  isLoading={metricsPending}
                />
                <EasyStatTile label="Pending returns" value={periodMetrics.pendingReturns} hint="Awaiting processing" isLoading={metricsPending} />
                <EasyStatTile label="Return rate" value={`${returnRate.toFixed(1)}%`} hint={`${periodMetrics.returnInvoices} docs`} isLoading={metricsPending} />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {healthPanels.map((panel) => (
                  <div key={panel.label} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                    <p className={HUB_MICRO_LABEL}>{panel.label}</p>
                    <p className={cn('mt-1 text-sm font-semibold tabular-nums', panel.tone)}>{panel.value}</p>
                    <p className="mt-0.5 text-[10px] text-neutral-500">{panel.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Low-stock SKUs</CardTitle>
                    <CardDescription className="text-xs">Items at or below safety level</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lowStockSkus.length === 0 ? (
                      <p className="py-4 text-center text-xs text-neutral-500">No low-stock alerts right now.</p>
                    ) : (
                      lowStockSkus.map((sku) => (
                        <button
                          key={sku.id}
                          type="button"
                          onClick={() => onQuickAction?.('inventory')}
                          className="flex w-full items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-neutral-900">{sku.name}</p>
                            <p className="text-[10px] text-neutral-500">SKU {sku.sku} · need {sku.gap} more</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-800">{sku.stock}/{sku.safety}</span>
                        </button>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Value by category</CardTitle>
                    <CardDescription className="text-xs">Stock value at cost</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {categoryInventory.length === 0 ? (
                      <p className="py-4 text-center text-xs text-neutral-500">Add products to see category mix.</p>
                    ) : (
                      categoryInventory.map((row) => (
                        <div key={row.category} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                          <div>
                            <p className="text-xs font-semibold text-neutral-900">{row.category}</p>
                            <p className="text-[10px] text-neutral-500">{row.skus} SKUs · {row.units.toLocaleString()} units</p>
                          </div>
                          <span className="text-xs font-semibold tabular-nums">{formatCurrencyCompact(row.value)}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-neutral-200 shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Catalog snapshot</p>
                    <p className="text-xs text-neutral-500">
                      {products.length} products · {multiLocationEnabled ? `Utilization ${warehouseUtilizationDisplay}` : `Last stock touch ${stockCheckRecencyDisplay}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onQuickAction?.('add-product')}>
                      Add product
                    </Button>
                    <Button size="sm" className="h-8 text-xs" onClick={() => onQuickAction?.('inventory')}>
                      Open inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CUSTOMERS */}
            <TabsContent value="customers" className="mt-0 space-y-4">
              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EasyStatTile
                  label="Active in period"
                  value={periodMetrics.currentCustomers}
                  hint="Bought in selected range"
                  trend={Number(customerTrend.toFixed(1))}
                  isLoading={metricsPending}
                />
                <EasyStatTile label="Total CRM records" value={customers.length} hint="All customers" onClick={() => onQuickAction?.('customers')} isLoading={metricsPending} />
                <EasyStatTile label="Revenue / buyer" value={formatCurrencyCompact(revenuePerCustomer)} hint={periodLabel} isLoading={metricsPending} />
                <EasyStatTile label="Avg order value" value={formatCurrencyCompact(avgOrderValue)} hint="Per closed order" isLoading={metricsPending} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Customer health
                    </CardTitle>
                    <CardDescription className="text-xs">Retention and collections for {periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-neutral-500">Period buyers</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{periodMetrics.currentCustomers}</p>
                      <p className={cn('mt-1 text-xs', custDelta.className)}>{custDelta.text} vs prior ({periodMetrics.previousCustomers})</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase text-neutral-500">Collections quality</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{paidOrderRateDisplay}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {paidOrderRate !== null && paidOrderRate < 60 ? 'Follow up on open invoices' : 'Healthy payment mix'}
                      </p>
                    </div>
                  </CardContent>
                  <CardContent className="border-t border-neutral-100 pt-0">
                    <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={() => onQuickAction?.('add-customer')}>
                      Add customer
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top customers</CardTitle>
                    <CardDescription className="text-xs">By invoice revenue in {periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topCustomers.length === 0 ? (
                      <p className="py-4 text-center text-xs text-neutral-500">No customer sales in this period yet.</p>
                    ) : (
                      topCustomers.map((row) => (
                        <EasyRankedRow
                          key={row.name}
                          title={row.name}
                          meta={`${row.orders} order${row.orders === 1 ? '' : 's'}`}
                          value={formatCurrencyCompact(row.revenue)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* OPERATIONS — domain storefront / clinical / service pulse */}
            <TabsContent value="operations" className="mt-0 space-y-4">
              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />
              <DomainOperationsPanel
                businessId={businessId}
                business={business}
                category={category}
                domainKnowledge={domainKnowledge}
                dateRange={dateRange}
                periodLabel={periodLabel}
                formatCurrencyCompact={formatCurrencyCompact}
                onQuickAction={onQuickAction}
                isActive={activeTab === 'operations'}
                onBadgeCount={setOperationsBadge}
              />
            </TabsContent>

            {/* INSIGHTS */}
            <TabsContent value="insights" className="mt-0 space-y-4">
              <EasyTabInsightStrip insights={tabInsights} onAction={handleInsightAction} />
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EasyStatTile label="Efficiency" value={`${domainEfficiency}%`} hint="Operations score" isLoading={metricsPending} />
                <EasyStatTile label="Net margin" value={`${netMarginPct.toFixed(1)}%`} hint={periodLabel} isLoading={metricsPending} />
                <EasyStatTile label="Low stock" value={reminders.lowStock ?? 0} hint="SKUs to review" onClick={() => onQuickAction?.('inventory')} isLoading={metricsPending} />
                <EasyStatTile label="Overdue AR" value={reminders.overdueInvoices ?? 0} hint="Collections risk" onClick={() => onQuickAction?.('invoices')} isLoading={metricsPending} />
              </div>

              <IndustryInsights category={category} domainKnowledge={domainKnowledge} variant="compact" />

              {campaignEnabled && (
                <Card className="border-neutral-200 shadow-sm">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Marketing opportunity</p>
                      <p className="text-xs text-neutral-500">Campaigns are available for your vertical. Use demand signals to plan outreach.</p>
                    </div>
                    <Button size="sm" className="h-8 text-xs" onClick={() => onQuickAction?.('campaigns')}>
                      Open campaigns
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-brand-primary" />
                    Actionable insights
                  </CardTitle>
                  <CardDescription className="text-xs">From live operations and vertical intelligence</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mergedInsights.map((insight, idx) => (
                    <button
                      key={`all-${insight.title}-${idx}`}
                      type="button"
                      onClick={() => handleInsightAction(insight.actionTab)}
                      className="w-full rounded-xl border border-neutral-100 p-3 text-left hover:bg-neutral-50"
                    >
                      <p className="text-xs font-semibold text-neutral-900">{insight.title}</p>
                      <p className="mt-1 text-[11px] text-neutral-600">{insight.text}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-neutral-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <PieChart className="h-4 w-4" />
                    Operational pulse
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {healthPanels.map((panel) => (
                    <div key={`pulse-${panel.label}`} className="rounded-lg border border-neutral-100 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase text-neutral-500">{panel.label}</p>
                      <p className={cn('text-sm font-semibold', panel.tone)}>{panel.value}</p>
                      <p className="text-[10px] text-neutral-500">{panel.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
