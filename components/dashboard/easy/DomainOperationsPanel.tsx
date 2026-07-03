'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Globe,
  Inbox,
  Pill,
  Stethoscope,
  Store,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { HUB_MICRO_LABEL, MARKETING_STAT_VALUE } from '@/lib/utils/typography';
import { getDomainOperationsSnapshotAction } from '@/lib/actions/dashboard/domainOperationsSnapshot';
import { updateStorefrontContactStatusAction } from '@/lib/actions/dashboard/storefrontContactMessages';
import {
  buildOperationsKpiTiles,
  getOperationsTabGuidance,
  resolveOperationsProfile,
} from '@/lib/dashboard/domainOperationsIntelligence';
import { CONTACT_PENDING_STATUSES } from '@/lib/dashboard/domainOperationsSubjects';

type OperationsSnapshot = Record<string, unknown>;

function statusTone(status: string) {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid') || s.includes('complete') || s.includes('deliver')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (s.includes('cancel') || s.includes('fail')) {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }
  if (s.includes('pending') || s.includes('new') || s.includes('process')) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-neutral-200 bg-neutral-50 text-neutral-700';
}

function formatSubject(subject: string) {
  return String(subject || 'general')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhen(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function OpsStatTile({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left shadow-sm',
        onClick && 'hover:border-neutral-300 hover:bg-neutral-50/80'
      )}
    >
      <p className={HUB_MICRO_LABEL}>{label}</p>
      <p className={cn(MARKETING_STAT_VALUE, 'mt-1 text-lg', tone)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-neutral-500">{hint}</p> : null}
    </Comp>
  );
}

export interface DomainOperationsPanelProps {
  businessId?: string | null;
  business?: { name?: string; country?: string; settings?: Record<string, unknown> } | null;
  category: string;
  domainKnowledge?: Record<string, unknown> | null;
  dateRange: { from: Date; to: Date };
  periodLabel: string;
  formatCurrencyCompact: (amount: number) => string;
  onQuickAction?: (actionId: string) => void;
  isActive?: boolean;
  variant?: 'tab' | 'compact';
  onBadgeCount?: (count: number | null) => void;
}

export function DomainOperationsPanel({
  businessId,
  business,
  category,
  domainKnowledge,
  dateRange,
  periodLabel,
  formatCurrencyCompact,
  onQuickAction,
  isActive = true,
  variant = 'tab',
  onBadgeCount,
}: DomainOperationsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingContactId, setUpdatingContactId] = useState<number | null>(null);

  const profile = useMemo(
    () => resolveOperationsProfile(category, domainKnowledge || undefined, business),
    [category, domainKnowledge, business]
  );

  const loadSnapshot = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDomainOperationsSnapshotAction(businessId, {
        from: dateRange.from,
        to: dateRange.to,
        category,
      });
      if (res.success && res.data) {
        setSnapshot(res.data as OperationsSnapshot);
      } else {
        setError(res.error || 'Could not load operations data');
        setSnapshot(null);
      }
    } catch {
      setError('Could not load operations data');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, category, dateRange.from, dateRange.to]);

  const handleMarkContactHandled = useCallback(
    async (messageId: number) => {
      if (!businessId || !messageId) return;
      setUpdatingContactId(messageId);
      try {
        const res = await updateStorefrontContactStatusAction(businessId, messageId, 'handled');
        if (res.success) {
          await loadSnapshot();
        }
      } finally {
        setUpdatingContactId(null);
      }
    },
    [businessId, loadSnapshot]
  );

  const isPendingContactStatus = useCallback((status: string) => {
    return (CONTACT_PENDING_STATUSES as readonly string[]).includes(String(status || 'new').toLowerCase());
  }, []);

  useEffect(() => {
    if (businessId) loadSnapshot();
  }, [businessId, loadSnapshot]);

  useEffect(() => {
    if (!snapshot || !onBadgeCount) return;
    const sf = snapshot.storefront as Record<string, unknown> | undefined;
    const contacts = snapshot.contacts as Record<string, unknown> | undefined;
    const pending =
      Number(sf?.ordersPending || 0) +
      Number(contacts?.pendingCount || 0) +
      Number(contacts?.prescriptionPending || 0) +
      Number(contacts?.refillPending || 0) +
      Number((snapshot.memberships as Record<string, unknown> | undefined)?.pendingCount || 0);
    onBadgeCount(pending > 0 ? pending : null);
  }, [snapshot, onBadgeCount]);

  const kpiTiles = useMemo(() => {
    if (!snapshot) return [];
    return buildOperationsKpiTiles(profile, snapshot, {
      formatCurrency: formatCurrencyCompact,
    });
  }, [profile, snapshot, formatCurrencyCompact]);

  const channels = (snapshot?.channels || {}) as Record<string, number>;
  const channelTotal = (channels.invoice || 0) + (channels.pos || 0) + (channels.storefront || 0);
  const serviceMix = (snapshot?.serviceMix || {}) as {
    serviceRevenue?: number;
    retailRevenue?: number;
    topCategories?: Array<{ name: string; count: number; revenue: number }>;
  };
  const serviceTotal = (serviceMix.serviceRevenue || 0) + (serviceMix.retailRevenue || 0);

  const guidance = getOperationsTabGuidance(profile);
  const compact = variant === 'compact';

  if (!businessId) {
    return (
      <Card className="border-neutral-200 shadow-sm">
        <CardContent className="py-8 text-center text-xs text-neutral-500">Select a business to load operations insights.</CardContent>
      </Card>
    );
  }

  if (loading && !snapshot) {
    return (
      <Card className="border-neutral-200 shadow-sm">
        <CardContent className="py-10 text-center text-xs text-neutral-500">Loading {profile.tabLabel.toLowerCase()}…</CardContent>
      </Card>
    );
  }

  if (error && !snapshot) {
    return (
      <Card className="border-rose-100 bg-rose-50/40 shadow-sm">
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-xs text-rose-800">{error}</p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={loadSnapshot}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) return null;

  if (!isActive && variant === 'tab') {
    return null;
  }

  const contacts = (snapshot.contacts || {}) as {
    recent?: Array<{ id?: number; name?: string; subject?: string; status?: string; createdAt?: string }>;
  };
  const collections = (snapshot.collections || {}) as {
    recent?: Array<{ name?: string; source?: string; amount?: number; occurredAt?: string }>;
  };
  const schedule = (snapshot.schedule || []) as Array<{
    kind?: string;
    title?: string;
    meta?: string;
    status?: string;
    occurredAt?: string;
  }>;
  const storefront = (snapshot.storefront || {}) as {
    visitorsTracked?: boolean;
    conversionRate?: number | null;
    dailyTrend?: Array<{ date: string; orders: number; revenue: number; visitors?: number }>;
  };
  const manufacturing = (snapshot.manufacturing || {}) as { openWip?: number; completed?: number };
  const profileMeta = (snapshot.profile || {}) as { regionalHint?: string; taxLabel?: string };

  const ModeIcon =
    profile.mode === 'pharmacy_desk'
      ? Pill
      : profile.showClinical
        ? Stethoscope
        : profile.showStorefront
          ? Globe
          : profile.showHospitality
            ? Activity
            : Store;

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {!compact ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600">
              <ModeIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{profile.tabLabel}</p>
              <p className="max-w-2xl text-[11px] leading-snug text-neutral-600">{guidance}</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit text-[10px] font-semibold">
            {periodLabel}
            {profile.countryIso ? ` · ${profile.countryIso}` : ''}
          </Badge>
        </div>
      ) : null}

      {!compact && profileMeta.regionalHint ? (
        <p className="rounded-lg border border-cyan-100 bg-cyan-50/50 px-3 py-2 text-[11px] text-cyan-900">
          {profileMeta.regionalHint}
        </p>
      ) : null}

      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6')}>
        {kpiTiles.map((tile) => (
          <OpsStatTile
            key={tile.id}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            tone={tile.tone}
            onClick={tile.actionTab ? () => onQuickAction?.(tile.actionTab!) : undefined}
          />
        ))}
      </div>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'lg:grid-cols-12')}>
        {profile.showServiceMix && serviceTotal > 0 ? (
          <Card className={cn('border-neutral-200 shadow-sm', !compact && 'lg:col-span-5')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Service vs retail mix</CardTitle>
              <CardDescription className="text-xs">Invoice lines in {periodLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-700">Clinical / service</span>
                  <span className="font-semibold tabular-nums">{formatCurrencyCompact(serviceMix.serviceRevenue || 0)}</span>
                </div>
                <Progress
                  value={serviceTotal > 0 ? ((serviceMix.serviceRevenue || 0) / serviceTotal) * 100 : 0}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-700">Retail / products</span>
                  <span className="font-semibold tabular-nums">{formatCurrencyCompact(serviceMix.retailRevenue || 0)}</span>
                </div>
                <Progress
                  value={serviceTotal > 0 ? ((serviceMix.retailRevenue || 0) / serviceTotal) * 100 : 0}
                  className="h-2 bg-neutral-100 [&>div]:bg-neutral-400"
                />
              </div>
              {(serviceMix.topCategories || []).length > 0 ? (
                <div className="space-y-1.5 border-t border-neutral-100 pt-3">
                  {(serviceMix.topCategories || []).slice(0, 3).map((row) => (
                    <div key={row.name} className="flex items-center justify-between rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs">
                      <span className="font-medium text-neutral-800">{row.name}</span>
                      <span className="tabular-nums text-neutral-600">
                        {row.count} lines · {formatCurrencyCompact(row.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {channelTotal > 0 ? (
          <Card className={cn('border-neutral-200 shadow-sm', !compact && 'lg:col-span-4')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sales channels</CardTitle>
              <CardDescription className="text-xs">Where revenue landed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Invoices', value: channels.invoice || 0, tone: 'bg-neutral-800' },
                { label: 'POS', value: channels.pos || 0, tone: 'bg-neutral-500' },
                { label: 'Storefront', value: channels.storefront || 0, tone: 'bg-cyan-600' },
              ].map((row) => {
                const pct = channelTotal > 0 ? (row.value / channelTotal) * 100 : 0;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700">{row.label}</span>
                      <span className="font-semibold tabular-nums">{formatCurrencyCompact(row.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div className={cn('h-full rounded-full', row.tone)} style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        {profile.showManufacturing && (Number(manufacturing.openWip) > 0 || Number(manufacturing.completed) > 0) ? (
          <Card className={cn('border-neutral-200 shadow-sm', !compact && 'lg:col-span-3')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Production</CardTitle>
              <CardDescription className="text-xs">WIP and completed orders in {periodLabel}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className={HUB_MICRO_LABEL}>Open WIP</p>
                <p className={cn(MARKETING_STAT_VALUE, 'text-lg')}>{manufacturing.openWip ?? 0}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className={HUB_MICRO_LABEL}>Completed</p>
                <p className={cn(MARKETING_STAT_VALUE, 'text-lg')}>{manufacturing.completed ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {profile.showStorefront && (storefront.dailyTrend || []).length > 0 ? (
          <Card className={cn('border-neutral-200 shadow-sm', !compact && 'lg:col-span-3')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Store activity</CardTitle>
              <CardDescription className="text-xs">
                {storefront.visitorsTracked
                  ? `Orders & visitors · conversion ${storefront.conversionRate != null ? `${storefront.conversionRate}%` : '—'}`
                  : 'Online orders by day (visitor tracking activates on storefront browse)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-24 items-end gap-1">
                {(storefront.dailyTrend || []).slice(-7).map((row) => {
                  const max = Math.max(
                    ...(storefront.dailyTrend || []).map((r) => Math.max(r.orders, r.visitors || 0)),
                    1
                  );
                  const orderH = Math.max(12, (row.orders / max) * 100);
                  const visitH = row.visitors ? Math.max(8, (row.visitors / max) * 100) : 0;
                  return (
                    <div key={String(row.date)} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-20 w-full max-w-[2rem] items-end justify-center gap-0.5">
                        {visitH > 0 ? (
                          <div
                            className="w-[40%] rounded-t bg-neutral-300"
                            style={{ height: `${visitH}%` }}
                            title={`${row.visitors} visitors`}
                          />
                        ) : null}
                        <div
                          className="w-[40%] rounded-t bg-cyan-600/80"
                          style={{ height: `${orderH}%` }}
                          title={`${row.orders} orders`}
                        />
                      </div>
                      <span className="text-[9px] text-neutral-400">
                        {new Date(row.date).toLocaleDateString(undefined, { day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
              {storefront.visitorsTracked ? (
                <div className="mt-2 flex gap-3 text-[10px] text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-neutral-300" /> Visitors
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-cyan-600" /> Orders
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'lg:grid-cols-3')}>
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Inbox className="h-4 w-4" />
              Request queue
            </CardTitle>
            <CardDescription className="text-xs">Storefront contact & booking messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(contacts.recent || []).length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-500">No contact requests yet.</p>
            ) : (
              (contacts.recent || []).slice(0, compact ? 4 : 6).map((row) => (
                <div key={row.id ?? `${row.name}-${row.createdAt}`} className="rounded-lg border border-neutral-100 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-neutral-900">{row.name || 'Guest'}</p>
                      <p className="text-[10px] text-neutral-500">{formatSubject(row.subject || 'general')}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase', statusTone(row.status || 'new'))}>
                      {row.status || 'new'}
                    </span>
                  </div>
                  {row.id && isPendingContactStatus(row.status || 'new') ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-6 w-full text-[10px]"
                      disabled={updatingContactId === row.id}
                      onClick={() => handleMarkContactHandled(row.id!)}
                    >
                      {updatingContactId === row.id ? 'Saving…' : 'Mark handled'}
                    </Button>
                  ) : null}
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="mt-2 h-7 w-full text-[11px]" onClick={() => onQuickAction?.('orders')}>
              Open orders hub
            </Button>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4" />
              Collections
            </CardTitle>
            <CardDescription className="text-xs">Paid invoices & storefront in period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(collections.recent || []).length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-500">No collections recorded in this period.</p>
            ) : (
              (collections.recent || []).slice(0, compact ? 4 : 6).map((row, idx) => (
                <div key={`${row.name}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-neutral-900">{row.name || 'Customer'}</p>
                    <p className="text-[10px] text-neutral-500">{row.source}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">{formatCurrencyCompact(row.amount || 0)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Recent activity
            </CardTitle>
            <CardDescription className="text-xs">Requests & online orders timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedule.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-500">No recent operational events.</p>
            ) : (
              schedule.slice(0, compact ? 4 : 6).map((row, idx) => (
                <div key={`${row.title}-${idx}`} className="flex gap-2 rounded-lg border border-neutral-100 px-2.5 py-2">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-neutral-900">{row.title}</p>
                    <p className="text-[10px] text-neutral-500">{row.meta}</p>
                    <p className="text-[10px] text-neutral-400">{formatWhen(row.occurredAt)}</p>
                  </div>
                  <span className={cn('h-fit shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase', statusTone(row.status || ''))}>
                    {row.status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
