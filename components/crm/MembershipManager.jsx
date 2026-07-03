'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Users,
  RefreshCw,
  CalendarClock,
  BadgeCheck,
  PauseCircle,
  XCircle,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { MobileTabHeader, MobileStatStrip } from '@/components/mobile/MobileTabHeader';
import { useStorefrontEmbedded } from '@/lib/context/StorefrontMobileContext';
import toast from 'react-hot-toast';
import {
  getCustomerMembershipsAction,
  getMembershipPlansAction,
  getMembershipStatsAction,
  getMembershipInsightsAction,
  getPlanBenefitsAction,
  updatePlanBenefitsAction,
  resyncPlanBenefitsFromProductAction,
  syncMembershipPlansFromInventoryAction,
  updateMembershipStatusAction,
  enrollCustomerMembershipAction,
} from '@/lib/actions/standard/memberships';
import { getCustomersAction } from '@/lib/actions/basic/customer';
import { MEMBERSHIP_STATUS } from '@/lib/memberships/membershipConstants';
import { formatBenefitSummary } from '@/lib/memberships/membershipIntelligence';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  paused: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-700',
  expired: 'bg-gray-100 text-gray-500',
  trial: 'bg-violet-100 text-violet-700',
};

function formatDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function MembershipRow({ row, currency, onStatusChange, busy }) {
  const statusClass = STATUS_STYLES[row.status] || STATUS_STYLES.pending;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 hover:border-brand-100 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{row.customer_name || 'Customer'}</p>
          <p className="text-xs text-gray-500 truncate">{row.plan_name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {row.customer_email || row.customer_phone || 'No contact'}
          </p>
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase', statusClass)}>
          {row.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-gray-400 font-semibold">Started</p>
          <p className="font-semibold text-gray-800">{formatDate(row.started_at)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-gray-400 font-semibold">Ends</p>
          <p className="font-semibold text-gray-800">{formatDate(row.ends_at)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-gray-400 font-semibold">Paid</p>
          <p className="font-semibold text-gray-800 tabular-nums">
            {currency} {Number(row.amount_paid || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-gray-400 font-semibold">Source</p>
          <p className="font-semibold text-gray-800 capitalize">{row.source || 'hub'}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {row.status === MEMBERSHIP_STATUS.PENDING && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatusChange(row.id, MEMBERSHIP_STATUS.ACTIVE)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Activate
          </button>
        )}
        {row.status === MEMBERSHIP_STATUS.ACTIVE && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatusChange(row.id, MEMBERSHIP_STATUS.PAUSED)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Pause
          </button>
        )}
        {row.status === MEMBERSHIP_STATUS.PAUSED && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatusChange(row.id, MEMBERSHIP_STATUS.ACTIVE)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            Resume
          </button>
        )}
        {row.status !== MEMBERSHIP_STATUS.CANCELLED && row.status !== MEMBERSHIP_STATUS.EXPIRED && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatusChange(row.id, MEMBERSHIP_STATUS.CANCELLED)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function MembershipManager({ businessId, category }) {
  const { regionalPack } = useBusiness();
  const currency = regionalPack?.currency || 'PKR';
  const embedded = useStorefrontEmbedded();

  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollCustomerId, setEnrollCustomerId] = useState('');
  const [enrollPlanId, setEnrollPlanId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [insights, setInsights] = useState(null);
  const [benefitsPlan, setBenefitsPlan] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [shopDiscountPercent, setShopDiscountPercent] = useState('');
  const [classCredits, setClassCredits] = useState('');
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsSaving, setBenefitsSaving] = useState(false);
  const autoSyncedRef = useRef(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const filters = filter === 'all' ? {} : { status: filter };
      const [listRes, planRes, statsRes, insightsRes] = await Promise.all([
        getCustomerMembershipsAction(businessId, filters),
        getMembershipPlansAction(businessId),
        getMembershipStatsAction(businessId),
        getMembershipInsightsAction(businessId, category),
      ]);
      if (listRes.success) setMemberships(listRes.memberships || []);
      if (planRes.success) setPlans(planRes.plans || []);
      if (statsRes.success) setStats(statsRes.stats);
      if (insightsRes.success) setInsights(insightsRes.insights);
    } catch (err) {
      toast.error(err.message || 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, [businessId, filter, category]);

  const openBenefitsEditor = async (plan) => {
    setBenefitsPlan(plan);
    setBenefitsLoading(true);
    setShowEnroll(false);
    try {
      const res = await getPlanBenefitsAction(businessId, plan.id);
      if (!res.success) throw new Error(res.error || 'Could not load perks');
      const rows = res.benefits || [];
      setBenefits(rows);
      const discount = rows.find((b) => b.benefit_type === 'discount_percent');
      const credits = rows.find((b) => b.benefit_type === 'class_credits');
      setShopDiscountPercent(discount?.value?.percent ? String(discount.value.percent) : '');
      setClassCredits(credits?.value?.credits ? String(credits.value.credits) : '');
    } catch (err) {
      toast.error(err.message);
      setBenefitsPlan(null);
    } finally {
      setBenefitsLoading(false);
    }
  };

  const handleSaveBenefits = async () => {
    if (!benefitsPlan) return;
    setBenefitsSaving(true);
    try {
      const res = await updatePlanBenefitsAction({
        businessId,
        planId: benefitsPlan.id,
        shopDiscountPercent: shopDiscountPercent ? Number(shopDiscountPercent) : 0,
        classCredits: classCredits ? Number(classCredits) : 0,
      });
      if (res.success) {
        toast.success('Plan perks updated');
        setBenefits(res.benefits || []);
        load();
      } else {
        toast.error(res.error || 'Save failed');
      }
    } finally {
      setBenefitsSaving(false);
    }
  };

  const handleResyncBenefits = async () => {
    if (!benefitsPlan) return;
    setBenefitsSaving(true);
    try {
      const res = await resyncPlanBenefitsFromProductAction(businessId, benefitsPlan.id);
      if (res.success) {
        toast.success('Perks synced from product');
        const rows = res.benefits || [];
        setBenefits(rows);
        const discount = rows.find((b) => b.benefit_type === 'discount_percent');
        const credits = rows.find((b) => b.benefit_type === 'class_credits');
        setShopDiscountPercent(discount?.value?.percent ? String(discount.value.percent) : '');
        setClassCredits(credits?.value?.credits ? String(credits.value.credits) : '');
        load();
      } else {
        toast.error(res.error || 'Sync failed');
      }
    } finally {
      setBenefitsSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!businessId || autoSyncedRef.current || loading) return;
    if (plans.length === 0) {
      autoSyncedRef.current = true;
      syncMembershipPlansFromInventoryAction(businessId, category).then((res) => {
        if (res.success && (res.plans?.length ?? 0) > 0) load();
      });
    }
  }, [businessId, category, loading, plans.length, load]);

  const openEnrollDialog = async () => {
    setShowEnroll(true);
    const res = await getCustomersAction(businessId);
    if (res.success) setCustomers(res.customers || []);
    else toast.error(res.error || 'Could not load customers');
  };

  const handleEnroll = async () => {
    if (!enrollCustomerId || !enrollPlanId) {
      toast.error('Select a customer and plan');
      return;
    }
    const plan = plans.find((p) => p.id === enrollPlanId);
    setEnrolling(true);
    try {
      const res = await enrollCustomerMembershipAction({
        businessId,
        customerId: enrollCustomerId,
        planId: enrollPlanId,
        productId: plan?.product_id || undefined,
        source: 'hub',
        status: MEMBERSHIP_STATUS.ACTIVE,
        verticalKey: category,
      });
      if (res.success) {
        toast.success('Member enrolled');
        setShowEnroll(false);
        setEnrollCustomerId('');
        setEnrollPlanId('');
        load();
      } else {
        toast.error(res.error || 'Enrollment failed');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleSyncPlans = async () => {
    const res = await syncMembershipPlansFromInventoryAction(businessId, category);
    if (res.success) {
      toast.success(`Synced ${res.plans?.length || 0} plan(s) from inventory`);
      load();
    } else {
      toast.error(res.error || 'Sync failed');
    }
  };

  const handleStatusChange = async (membershipId, status) => {
    setBusyId(membershipId);
    try {
      const res = await updateMembershipStatusAction({ businessId, membershipId, status });
      if (res.success) {
        toast.success(`Membership ${status}`);
        load();
      } else {
        toast.error(res.error || 'Update failed');
      }
    } finally {
      setBusyId(null);
    }
  };

  const statItems = [
    { label: 'Active', value: stats?.active_count ?? 0, icon: Users },
    { label: 'Pending', value: stats?.pending_count ?? 0, icon: CalendarClock },
    { label: 'Paused', value: stats?.paused_count ?? 0, icon: PauseCircle },
    { label: 'Expiring (14d)', value: stats?.expiring_soon ?? 0, icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {!embedded && (
        <MobileTabHeader
          title="Memberships"
          subtitle="Track enrollments from storefront, POS, and walk-in sign-ups. Renewals run on scheduled billing when auto-renew is enabled."
        />
      )}

      <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-violet-900">
        <p className="font-semibold">How renewals work</p>
        <p className="mt-1 text-violet-800/90">
          Active members with auto-renew receive recurring invoices. Your platform scheduler should
          call the membership maintenance endpoint daily (same secret as campaign cron).
        </p>
      </div>

      <MobileStatStrip items={statItems} />

      {insights && (
        <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {insights.playbook?.headline || 'Membership intelligence'}
              </p>
              {insights.healthScore != null && (
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  Health score:{' '}
                  <span className="tabular-nums">{insights.healthScore}</span>
                  /100
                </p>
              )}
            </div>
            {currency && (
              <span className="text-[11px] font-semibold text-gray-500">{currency} billing</span>
            )}
          </div>
          {insights.alerts?.length > 0 && (
            <div className="space-y-2">
              {insights.alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs border',
                    alert.severity === 'critical' && 'border-rose-200 bg-rose-50 text-rose-900',
                    alert.severity === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
                    alert.severity === 'info' && 'border-gray-200 bg-white text-gray-700'
                  )}
                >
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-0.5 opacity-90">{alert.detail}</p>
                </div>
              ))}
            </div>
          )}
          {insights.playbook?.tips?.length > 0 && (
            <ul className="text-[11px] text-gray-600 space-y-1 list-disc pl-4">
              {insights.playbook.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'pending', 'paused', 'cancelled'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
                filter === key
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEnrollDialog}
            disabled={plans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Enroll member
          </button>
          <button
            type="button"
            onClick={handleSyncPlans}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync plans from inventory
          </button>
        </div>
      </div>

      {plans.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plans</p>
          <div className="flex flex-wrap gap-2">
            {plans.slice(0, 8).map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => openBenefitsEditor(plan)}
                className="rounded-lg bg-white border border-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-brand-200 hover:bg-brand-50/50 transition-colors"
              >
                {plan.name}
                <span className="text-gray-400 font-normal ml-1">
                  ({plan.active_enrollments ?? 0} active
                  {(plan.benefits_count ?? 0) > 0 ? ` · ${plan.benefits_count} perk${plan.benefits_count === 1 ? '' : 's'}` : ''})
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Tap a plan to edit member perks (shop discount, class credits).</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading memberships…</div>
      ) : memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No memberships yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Membership SKUs sold via storefront checkout or POS will appear here. Sync plans from
            inventory to link product SKUs to enrollment records.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map((row) => (
            <MembershipRow
              key={row.id}
              row={row}
              currency={currency}
              busy={busyId === row.id}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={enrollCustomerId} onValueChange={setEnrollCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `· ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={enrollPlanId} onValueChange={setEnrollPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEnroll(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? 'Enrolling…' : 'Enroll as active'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(benefitsPlan)} onOpenChange={(open) => !open && setBenefitsPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan perks — {benefitsPlan?.name}</DialogTitle>
          </DialogHeader>
          {benefitsLoading ? (
            <p className="text-sm text-gray-400 py-6 text-center">Loading perks…</p>
          ) : (
            <div className="space-y-4 py-2">
              {benefits.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">Current perks</p>
                  {benefits.map((b) => (
                    <p key={b.id || b.benefit_type} className="text-xs text-gray-700">
                      {formatBenefitSummary(b)}
                    </p>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="shop-discount">Member shop discount (%)</Label>
                <Input
                  id="shop-discount"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 15"
                  value={shopDiscountPercent}
                  onChange={(e) => setShopDiscountPercent(e.target.value)}
                />
                <p className="text-[10px] text-gray-400">
                  Applied at storefront checkout for active members (Professional+).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-credits">Class / session credits</Label>
                <Input
                  id="class-credits"
                  type="number"
                  min={0}
                  placeholder="e.g. 8"
                  value={classCredits}
                  onChange={(e) => setClassCredits(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResyncBenefits}
              disabled={benefitsSaving || benefitsLoading}
            >
              Sync from product
            </Button>
            <Button type="button" variant="outline" onClick={() => setBenefitsPlan(null)}>
              Close
            </Button>
            <Button type="button" onClick={handleSaveBenefits} disabled={benefitsSaving || benefitsLoading}>
              {benefitsSaving ? 'Saving…' : 'Save perks'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
