'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, UserPlus, Crown, HeartCrack, Loader2, RefreshCw } from 'lucide-react';
import { LiquidLayout, LiquidItem } from './LiquidLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSegmentIntelligenceAction } from '@/lib/actions/standard/campaignsHub';

const SEGMENT_STYLES = [
  { color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40', icon: Crown },
  { color: 'text-red-500 bg-red-50 dark:bg-red-950/40', icon: HeartCrack },
  { color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', icon: UserPlus },
  { color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40', icon: Users },
];

function describeSegment(segment) {
  const rules = segment?.rules;
  let parsed = rules;
  if (typeof rules === 'string') {
    try {
      parsed = JSON.parse(rules);
    } catch {
      parsed = {};
    }
  }
  if (parsed?.min_spend) return `Min spend ${parsed.min_spend}`;
  if (parsed?.last_order_days) return `No order in ${parsed.last_order_days} days`;
  if (parsed?.orders_count === 0) return 'New leads (no orders yet)';
  if (parsed?.city) return `City: ${parsed.city}`;
  return segment?.is_dynamic ? 'Dynamic segment' : 'Customer segment';
}

/**
 * SegmentationIntelligenceIsland
 * Live segment clusters from the campaigns hub (no mock data).
 */
export function SegmentationIntelligenceIsland({ businessId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ segments: [], totalCustomers: 0 });

  const load = useCallback(async () => {
    if (!businessId) {
      setData({ segments: [], totalCustomers: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getSegmentIntelligenceAction(businessId);
      if (res.success) {
        setData({
          segments: res.segments || [],
          totalCustomers: res.totalCustomers ?? 0,
        });
      }
    } catch (e) {
      console.error('[SegmentationIntelligenceIsland]', e);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalMembers = useMemo(
    () => (data.segments || []).reduce((sum, s) => sum + (s.member_count ?? 0), 0),
    [data.segments]
  );

  const displaySegments = (data.segments || []).slice(0, 4);

  return (
    <LiquidLayout variant="glass" className="h-full">
      <div className="flex h-full flex-col gap-6">
        <div className="flex items-center justify-between">
          <LiquidItem className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold uppercase tracking-tight text-slate-800 dark:text-white">
                Customer clusters
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Live segments from CRM
              </p>
            </div>
          </LiquidItem>

          <div className="text-right">
            <div className="text-xs font-semibold text-slate-800 dark:text-white">
              {loading ? '…' : data.totalCustomers} CRM
            </div>
            <div className="text-[10px] font-bold uppercase text-emerald-500">
              {loading ? '…' : `${totalMembers} segmented`}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading segments…
            </div>
          ) : displaySegments.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No segments yet. Create playbooks in Campaigns to see clusters here.
            </p>
          ) : (
            displaySegments.map((segment, idx) => {
              const style = SEGMENT_STYLES[idx % SEGMENT_STYLES.length];
              const Icon = style.icon;
              const count = segment.member_count ?? 0;
              const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
              return (
                <LiquidItem key={segment.id} delay={idx * 0.1}>
                  <div className="group cursor-default rounded-2xl border border-white/50 bg-white/40 p-4 transition-all hover:bg-white/80 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl border border-current opacity-80',
                            style.color
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold uppercase text-slate-800 dark:text-white">
                            {segment.name}
                          </h4>
                          <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                            {describeSegment(segment)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-800 dark:text-white">{count}</div>
                        <Badge variant="outline" className="h-4 border-slate-200 text-[10px] font-semibold">
                          {pct}%
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="mr-3 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn('h-full rounded-full', style.color.split(' ')[0])}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </LiquidItem>
              );
            })
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold uppercase tracking-widest"
          disabled={loading || !businessId}
          onClick={load}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh segments
        </Button>
      </div>
    </LiquidLayout>
  );
}
