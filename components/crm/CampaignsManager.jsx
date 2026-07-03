'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Sparkles,
  Users,
  Mail,
  Target,
  Gift,
  RefreshCw,
  Plus,
  ChevronRight,
  Zap,
  BarChart3,
  Lightbulb,
  Plug,
  Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PromotionEngine } from '@/components/crm/PromotionEngine';
import { CampaignIntegrationsPanel } from '@/components/crm/CampaignIntegrationsPanel';
import dynamic from 'next/dynamic';

const AIInsightsPanel = dynamic(() =>
  import('@/components/intelligence/AIInsightsPanel').then((m) => m.AIInsightsPanel)
);

import {
  getCampaignsOverviewAction,
  getCampaignIntegrationsAction,
  createOutreachCampaignAction,
  createSegmentFromPlaybookAction,
  createCustomSegmentAction,
  refreshSegmentAction,
  dispatchOutreachCampaignAction,
  deleteSegmentAction,
  deleteCampaignAction,
} from '@/lib/actions/standard/campaignsHub';
import { EMPTY_VALUE } from '@/lib/utils/copyTypography';
import { getCampaignWorkspaceNotice, CAMPAIGN_CHANNEL_COPY } from '@/lib/marketing/campaignCapabilities';

function formatShortDate(iso) {
  if (!iso) return EMPTY_VALUE;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return EMPTY_VALUE;
  }
}

const INTELLIGENCE_TONE = {
  wine: 'border-border bg-primary/10 dark:bg-primary/15',
  amber: 'border-border bg-amber-500/10 dark:bg-amber-500/15',
  emerald: 'border-border bg-emerald-500/10 dark:bg-emerald-500/15',
  violet: 'border-border bg-sky-500/10 dark:bg-sky-500/15',
  slate: 'border-border bg-muted/50 dark:bg-muted/30',
};

/**
 * Unified campaigns & marketing workspace: command center, promotions, outreach, segments.
 * Theme-aware (light/dark) and compact for dashboard density.
 */
export function CampaignsManager({
  businessId,
  currency = 'Rs.',
  customerCount = 0,
  category = '',
}) {
  const [tab, setTab] = useState('command');
  const [hub, setHub] = useState(null);
  const [hubLoading, setHubLoading] = useState(true);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachBusy, setOutreachBusy] = useState(false);
  const [outreachForm, setOutreachForm] = useState({
    name: '',
    description: '',
    type: 'email',
    segment_id: '',
    scheduled_at: '',
    queue_now: true,
  });
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [segmentBusy, setSegmentBusy] = useState(false);
  const [segmentForm, setSegmentForm] = useState({
    name: '',
    min_spend: '',
    last_order_days: '',
    city: '',
    new_leads_only: false,
  });
  const [dispatchBusyId, setDispatchBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [emailDelivery, setEmailDelivery] = useState(null);

  const loadHub = useCallback(async () => {
    if (!businessId) return;
    setHubLoading(true);
    try {
      const [res, intRes] = await Promise.all([
        getCampaignsOverviewAction(businessId),
        getCampaignIntegrationsAction(businessId),
      ]);
      if (intRes.success) {
        setEmailDelivery(intRes.emailDelivery || null);
      }
      if (res.success) {
        setHub({
          campaigns: res.campaigns || [],
          segments: res.segments || [],
          promotionCount: res.promotionCount ?? 0,
          promotions: res.promotions || [],
          playbooks: res.playbooks || [],
        });
      } else {
        toast.error(res.error || 'Could not load campaigns overview');
        setHub({ campaigns: [], segments: [], promotionCount: 0, promotions: [], playbooks: [] });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load campaigns data');
      setHub({ campaigns: [], segments: [], promotionCount: 0, promotions: [], playbooks: [] });
    } finally {
      setHubLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  const activeCampaigns = useMemo(
    () => (hub?.campaigns || []).filter((c) => c.status === 'active' || c.status === 'scheduled').length,
    [hub]
  );

  const intelligence = useMemo(() => {
    const promos = hub?.promotionCount ?? 0;
    const segments = hub?.segments?.length ?? 0;
    const outreach = hub?.campaigns?.length ?? 0;
    const items = [];

    if (promos === 0) {
      items.push({
        id: 'first-promo',
        title: 'Launch your first promotion',
        body: 'Price-led offers convert fastest when paired with clear dates and minimum order rules.',
        action: () => setTab('promotions'),
        cta: 'Open promotions',
        tone: 'wine',
      });
    }

    if (customerCount >= 10 && segments === 0) {
      items.push({
        id: 'segments',
        title: 'Segment your customer base',
        body: 'VIP, churn-risk, and new-lead segments let you target outreach instead of blasting everyone.',
        action: () => setTab('segments'),
        cta: 'Build segments',
        tone: 'amber',
      });
    }

    if (segments > 0 && outreach === 0) {
      items.push({
        id: 'outreach',
        title: 'Pair segments with outreach',
        body: 'Create an email or WhatsApp campaign tied to a segment so messages queue to the right people.',
        action: () => setTab('outreach'),
        cta: 'New campaign',
        tone: 'emerald',
      });
    }

    if (promos >= 2 && activeCampaigns === 0 && outreach === 0) {
      items.push({
        id: 'activate',
        title: 'Activate dormant demand',
        body: 'You have promotions on file but no active outreach, schedule a win-back send to past buyers.',
        action: () => setTab('outreach'),
        cta: 'Schedule send',
        tone: 'violet',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'optimize',
        title: 'Keep momentum',
        body: 'Review expiring promotions, refresh dynamic segments weekly, and refine subject lines on repeats.',
        action: () => setTab('promotions'),
        cta: 'Review stack',
        tone: 'slate',
      });
    }

    return items.slice(0, 4);
  }, [hub, customerCount, activeCampaigns]);

  const statValue = (n) => {
    if (hubLoading) return '…';
    if (typeof n === 'number') return n;
    return n ?? EMPTY_VALUE;
  };

  const handlePlaybook = async (index) => {
    if (!businessId) return;
    try {
      const res = await createSegmentFromPlaybookAction(businessId, index);
      if (res.success) {
        toast.success(`Segment ready, ${res.members ?? 0} members matched`);
        await loadHub();
        setTab('segments');
      } else {
        toast.error(res.error || 'Could not create segment');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleRefreshSegment = async (segmentId) => {
    if (!businessId) return;
    try {
      const res = await refreshSegmentAction(businessId, segmentId);
      if (res.success) {
        toast.success(`Segment refreshed (${res.members ?? 0} members)`);
        await loadHub();
      } else {
        toast.error(res.error || 'Refresh failed');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const submitOutreach = async () => {
    if (!businessId || !outreachForm.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    setOutreachBusy(true);
    try {
      const res = await createOutreachCampaignAction(businessId, {
        name: outreachForm.name.trim(),
        description: outreachForm.description.trim(),
        type: outreachForm.type,
        segment_id: outreachForm.segment_id || null,
        scheduled_at: outreachForm.scheduled_at || null,
        queue_now: outreachForm.queue_now,
      });
      if (res.success) {
        toast.success(
          outreachForm.type === 'email'
            ? emailDelivery?.configured
              ? 'Campaign created and email dispatch started when queued.'
              : 'Campaign created. Configure email under Integrations to send.'
            : 'Campaign created'
        );
        setOutreachOpen(false);
        setOutreachForm({
          name: '',
          description: '',
          type: 'email',
          segment_id: '',
          scheduled_at: '',
          queue_now: true,
        });
        await loadHub();
      } else {
        toast.error(res.error || 'Create failed');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setOutreachBusy(false);
    }
  };

  const submitCustomSegment = async () => {
    if (!businessId || !segmentForm.name.trim()) {
      toast.error('Segment name is required');
      return;
    }
    setSegmentBusy(true);
    try {
      const res = await createCustomSegmentAction(businessId, {
        name: segmentForm.name.trim(),
        min_spend: segmentForm.min_spend,
        last_order_days: segmentForm.last_order_days,
        city: segmentForm.city,
        new_leads_only: segmentForm.new_leads_only,
      });
      if (res.success) {
        toast.success(`Segment ready, ${res.members ?? 0} members matched`);
        setSegmentOpen(false);
        setSegmentForm({ name: '', min_spend: '', last_order_days: '', city: '', new_leads_only: false });
        await loadHub();
        setTab('segments');
      } else {
        toast.error(res.error || 'Could not create segment');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setSegmentBusy(false);
    }
  };

  const handleDispatch = async (campaignId) => {
    if (!businessId) return;
    setDispatchBusyId(campaignId);
    try {
      const res = await dispatchOutreachCampaignAction(businessId, campaignId);
      if (res.success) {
        const { sent = 0, failed = 0, skipped = 0, pending = 0 } = res;
        toast.success(`Dispatch complete: ${sent} sent, ${failed} failed, ${skipped} skipped, ${pending} pending`);
        await loadHub();
      } else {
        toast.error(res.error || 'Dispatch failed');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setDispatchBusyId(null);
    }
  };

  const handleDeleteSegment = async (segmentId, segmentName) => {
    if (!businessId) return;
    if (!window.confirm(`Delete segment "${segmentName}"? Draft campaigns will lose this segment.`)) return;
    setDeleteBusyId(segmentId);
    try {
      const res = await deleteSegmentAction(businessId, segmentId);
      if (res.success) {
        toast.success('Segment deleted');
        await loadHub();
      } else {
        toast.error(res.error || 'Delete failed');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setDeleteBusyId(null);
    }
  };

  const handleArchiveCampaign = async (campaignId, campaignName) => {
    if (!businessId) return;
    if (!window.confirm(`Archive campaign "${campaignName}"? Pending sends will stop.`)) return;
    setDeleteBusyId(campaignId);
    try {
      const res = await deleteCampaignAction(businessId, campaignId, { hard: false });
      if (res.success) {
        toast.success('Campaign archived');
        await loadHub();
      } else {
        toast.error(res.error || 'Archive failed');
      }
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setDeleteBusyId(null);
    }
  };

  const workspaceNotice = getCampaignWorkspaceNotice(emailDelivery);

  if (!businessId) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Select a business to manage campaigns.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact header, semantic surfaces */}
      <div className="rounded-xl border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm dark:bg-card/90 sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Megaphone className="h-3 w-3 shrink-0 text-primary" aria-hidden />
              Campaigns &amp; growth
            </div>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Intelligent campaigns workspace
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
              Promotions, segments, and outreach in one view, next steps adapt to your data
              {category ? (
                <>
                  {' '}
                  for <span className="font-medium text-foreground">{String(category).replace(/-/g, ' ')}</span>.
                </>
              ) : (
                '.'
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md px-2.5 text-xs"
              onClick={() => loadHub()}
              disabled={hubLoading}
            >
              <RefreshCw className={cn('mr-1 h-3.5 w-3.5', hubLoading && 'animate-spin')} />
              Sync
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setOutreachForm((f) => ({ ...f, name: '' }));
                setOutreachOpen(true);
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Outreach
            </Button>
          </div>
        </div>
      </div>

      <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        {workspaceNotice}
      </p>

      <Tabs value={tab} onValueChange={setTab} className="space-y-3">
        <TabsList className="grid h-9 w-full max-w-2xl grid-cols-5 gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted/50 p-0.5 dark:bg-muted/40 lg:max-w-2xl">
          <TabsTrigger
            value="command"
            className="rounded-md py-1.5 text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Command
          </TabsTrigger>
          <TabsTrigger
            value="promotions"
            className="rounded-md py-1.5 text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Promotions
          </TabsTrigger>
          <TabsTrigger
            value="outreach"
            className="rounded-md py-1.5 text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Outreach
          </TabsTrigger>
          <TabsTrigger
            value="segments"
            className="rounded-md py-1.5 text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Segments
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="rounded-md py-1.5 text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Integrations</span>
            <Plug className="h-3.5 w-3.5 sm:hidden" aria-hidden />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="command" className="space-y-3 outline-none">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Promotions on file', value: statValue(hub?.promotionCount ?? 0), icon: Gift },
              { label: 'Outreach campaigns', value: statValue(hub?.campaigns?.length ?? 0), icon: Mail },
              { label: 'Segments', value: statValue(hub?.segments?.length ?? 0), icon: Target },
              { label: 'Customers (CRM)', value: statValue(customerCount), icon: Users },
            ].map((s) => (
              <Card key={s.label} className="border-border shadow-sm">
                <CardContent className="flex items-center gap-2.5 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                    <s.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tabular-nums leading-none text-foreground">{s.value}</p>
                    <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended next steps
              </h3>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {intelligence.map((card) => (
                <Card
                  key={card.id}
                  className={cn('border transition-shadow hover:shadow-sm', INTELLIGENCE_TONE[card.tone] || INTELLIGENCE_TONE.slate)}
                >
                  <CardHeader className="space-y-1 p-3 pb-2">
                    <CardTitle className="text-sm font-semibold leading-snug text-foreground">{card.title}</CardTitle>
                    <CardDescription className="text-[11px] leading-relaxed text-muted-foreground">
                      {card.body}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-md border-border/80 bg-background/80 px-2 text-[11px] font-medium dark:bg-background/50"
                      onClick={card.action}
                    >
                      {card.cta}
                      <ChevronRight className="ml-0.5 h-3 w-3 opacity-70" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-border bg-muted/40 dark:bg-muted/25">
            <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 p-3 pb-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-sm font-semibold text-foreground">Playbooks</CardTitle>
              <Badge variant="secondary" className="ml-auto text-[10px] font-medium">
                One-click segments
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-3">
              {(hub?.playbooks || []).map((pb, idx) => (
                <div
                  key={pb.name}
                  className="rounded-lg border border-border bg-card p-2.5 shadow-sm dark:bg-card/80"
                >
                  <p className="text-xs font-semibold text-foreground">{pb.name}</p>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{pb.strategy}</p>
                  <Button
                    size="sm"
                    variant="default"
                    className="mt-2 h-7 w-full rounded-md text-[11px] font-medium"
                    onClick={() => handlePlaybook(idx)}
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    Create segment
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="border-t border-border pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                AI &amp; analytics
              </h3>
            </div>
            <AIInsightsPanel businessId={businessId} category={category || 'retail-shop'} />
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="outline-none">
          <PromotionEngine
            businessId={businessId}
            currency={currency}
            seedPromotions={!hubLoading && hub ? hub.promotions : undefined}
            onHubRefresh={loadHub}
          />
        </TabsContent>

        <TabsContent value="outreach" className="space-y-2 outline-none">
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => setOutreachOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New campaign
            </Button>
          </div>
          {hubLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading outreach…</div>
          ) : (hub?.campaigns || []).length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-8 text-center text-xs text-muted-foreground">
                No outreach campaigns yet. Create one to queue messages to a segment (email via Resend when configured).
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {(hub?.campaigns || []).map((c) => (
                <Card key={c.id} className="border-border">
                  <CardHeader className="space-y-1 p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight text-foreground">{c.name}</CardTitle>
                      <Badge variant="outline" className="shrink-0 text-[10px] font-medium uppercase">
                        {c.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px] leading-relaxed">
                      {c.type} · {c.segment_name || 'No segment'}
                      {c.message_count != null ? ` · ${c.message_count} messages` : ''}
                    </CardDescription>
                    {(c.pending_count > 0 || c.sent_count > 0 || c.failed_count > 0) && (
                      <p className="text-[10px] text-muted-foreground">
                        {c.pending_count ?? 0} pending · {c.sent_count ?? 0} sent · {c.failed_count ?? 0} failed
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 text-[10px] text-muted-foreground">
                    <span>
                      Updated {formatShortDate(c.updated_at)}
                      {c.scheduled_at && (
                        <span className="ml-2">· Scheduled {formatShortDate(c.scheduled_at)}</span>
                      )}
                    </span>
                    {c.type === 'email' && (c.pending_count ?? 0) > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md text-[11px]"
                        disabled={dispatchBusyId === c.id}
                        onClick={() => handleDispatch(c.id)}
                      >
                        {dispatchBusyId === c.id ? 'Sending…' : 'Send pending'}
                      </Button>
                    )}
                    {c.status !== 'cancelled' && c.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-md text-[11px] text-destructive hover:text-destructive"
                        disabled={deleteBusyId === c.id}
                        onClick={() => handleArchiveCampaign(c.id, c.name)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Archive
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="segments" className="space-y-2 outline-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Dynamic segments recompute from invoices, storefront orders, and customers. Use{' '}
              <strong className="text-foreground">Refresh</strong> after large sales pushes.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-md text-xs"
              onClick={() => setSegmentOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Custom segment
            </Button>
          </div>
          {hubLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading segments…</div>
          ) : (hub?.segments || []).length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="py-8 text-center text-xs text-muted-foreground">
                No segments yet, use playbooks on Command or define rules from CRM data.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {(hub?.segments || []).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:bg-card/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.is_dynamic ? 'Dynamic' : 'Static'} · {s.member_count ?? 0} members
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 rounded-md text-[11px]"
                      onClick={() => handleRefreshSegment(s.id)}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 rounded-md text-[11px] text-destructive hover:text-destructive"
                      disabled={deleteBusyId === s.id}
                      onClick={() => handleDeleteSegment(s.id, s.name)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="outline-none">
          <CampaignIntegrationsPanel businessId={businessId} />
        </TabsContent>
      </Tabs>

      <Dialog open={outreachOpen} onOpenChange={setOutreachOpen}>
        <DialogContent className="max-w-md gap-0 rounded-xl border-border bg-background p-0 sm:rounded-xl">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="text-base font-semibold">New outreach campaign</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Messages queue to everyone in the selected segment. Leave schedule empty to queue now when not in the
              future.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 px-4 py-3">
            <div>
              <Label htmlFor="oc-name" className="text-xs">
                Name
              </Label>
              <Input
                id="oc-name"
                value={outreachForm.name}
                onChange={(e) => setOutreachForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramadan win-back"
                className="mt-1 h-9 rounded-md border-input text-sm"
              />
            </div>
            <div>
              <Label htmlFor="oc-desc" className="text-xs">
                Message (optional)
              </Label>
              <Input
                id="oc-desc"
                value={outreachForm.description}
                onChange={(e) => setOutreachForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short note included in email body"
                className="mt-1 h-9 rounded-md border-input text-sm"
              />
            </div>
            <div>
              <Label htmlFor="oc-type" className="text-xs">
                Channel
              </Label>
              <select
                id="oc-type"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground"
                value={outreachForm.type}
                onChange={(e) => setOutreachForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="email">{CAMPAIGN_CHANNEL_COPY.email.label}</option>
                <option value="whatsapp">{CAMPAIGN_CHANNEL_COPY.whatsapp.label} (roadmap)</option>
                <option value="notification">{CAMPAIGN_CHANNEL_COPY.notification.label}</option>
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {CAMPAIGN_CHANNEL_COPY[outreachForm.type]?.hint}
              </p>
            </div>
            <div>
              <Label htmlFor="oc-seg" className="text-xs">
                Segment (optional)
              </Label>
              <select
                id="oc-seg"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground"
                value={outreachForm.segment_id}
                onChange={(e) => setOutreachForm((f) => ({ ...f, segment_id: e.target.value }))}
              >
                <option value="">None (draft only)</option>
                {(hub?.segments || []).map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name} ({seg.member_count ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="oc-when" className="text-xs">
                Schedule (optional)
              </Label>
              <Input
                id="oc-when"
                type="datetime-local"
                value={outreachForm.scheduled_at}
                onChange={(e) => setOutreachForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="mt-1 h-9 rounded-md border-input text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-input"
                checked={outreachForm.queue_now}
                onChange={(e) => setOutreachForm((f) => ({ ...f, queue_now: e.target.checked }))}
              />
              <span>Queue messages when not scheduled in the future (requires a segment)</span>
            </label>
          </div>
          <DialogFooter className="gap-2 border-t border-border px-4 py-3 sm:justify-end">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setOutreachOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              disabled={outreachBusy}
              onClick={submitOutreach}
            >
              {outreachBusy ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={segmentOpen} onOpenChange={setSegmentOpen}>
        <DialogContent className="max-w-md gap-0 rounded-xl border-border bg-background p-0 sm:rounded-xl">
          <DialogHeader className="border-b border-border px-4 py-3 text-left">
            <DialogTitle className="text-base font-semibold">Custom segment</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Rules match CRM customers using invoice and storefront order history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 px-4 py-3">
            <div>
              <Label htmlFor="seg-name" className="text-xs">
                Name
              </Label>
              <Input
                id="seg-name"
                value={segmentForm.name}
                onChange={(e) => setSegmentForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Karachi VIP buyers"
                className="mt-1 h-9 rounded-md border-input text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="seg-spend" className="text-xs">
                  Min lifetime spend
                </Label>
                <Input
                  id="seg-spend"
                  type="number"
                  min="0"
                  value={segmentForm.min_spend}
                  onChange={(e) => setSegmentForm((f) => ({ ...f, min_spend: e.target.value }))}
                  className="mt-1 h-9 rounded-md border-input text-sm"
                />
              </div>
              <div>
                <Label htmlFor="seg-churn" className="text-xs">
                  No order in (days)
                </Label>
                <Input
                  id="seg-churn"
                  type="number"
                  min="0"
                  value={segmentForm.last_order_days}
                  onChange={(e) => setSegmentForm((f) => ({ ...f, last_order_days: e.target.value }))}
                  className="mt-1 h-9 rounded-md border-input text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="seg-city" className="text-xs">
                City (optional)
              </Label>
              <Input
                id="seg-city"
                value={segmentForm.city}
                onChange={(e) => setSegmentForm((f) => ({ ...f, city: e.target.value }))}
                className="mt-1 h-9 rounded-md border-input text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-input"
                checked={segmentForm.new_leads_only}
                onChange={(e) => setSegmentForm((f) => ({ ...f, new_leads_only: e.target.checked }))}
              />
              <span>New leads only (no invoice or storefront orders yet)</span>
            </label>
          </div>
          <DialogFooter className="gap-2 border-t border-border px-4 py-3 sm:justify-end">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setSegmentOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              disabled={segmentBusy}
              onClick={submitCustomSegment}
            >
              {segmentBusy ? 'Creating…' : 'Create segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
