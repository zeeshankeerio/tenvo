'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  RefreshCcw,
  Clock,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  listPlatformSubscribers,
  listPendingManualPaymentRequests,
  approveManualSubscriptionPaymentRequest,
  rejectManualSubscriptionPaymentRequest,
} from '@/lib/actions/admin/platform';
import { PLAN_TIERS } from '@/lib/config/plans';
import { TRIAL_CONFIG } from '@/lib/config/platform';
import toast from 'react-hot-toast';

export function PlatformSubscriptionsPanel({ stats, isLoading: statsLoading }) {
  const [subscribers, setSubscribers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await listPendingManualPaymentRequests({ limit: 25 });
      if (res.success) {
        setPendingRequests(res.requests || []);
      }
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPlatformSubscribers({
        page,
        limit: 25,
        search,
        planTier: planFilter === 'all' ? null : planFilter,
        status: statusFilter,
      });
      if (res.success) {
        setSubscribers(res.subscribers || []);
        setTotal(res.total || 0);
      } else {
        toast.error(res.error || 'Failed to load subscribers');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter, statusFilter]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleApprove = async (businessId) => {
    setProcessingId(businessId);
    try {
      const res = await approveManualSubscriptionPaymentRequest({
        businessId,
        extendDays: TRIAL_CONFIG.durationDays * 2,
      });
      if (res.success) {
        toast.success('Payment request approved');
        loadPending();
        loadSubscribers();
      } else {
        toast.error(res.error || 'Approval failed');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (businessId) => {
    setProcessingId(businessId);
    try {
      const res = await rejectManualSubscriptionPaymentRequest({
        businessId,
        reviewNotes: 'Rejected from platform subscriptions panel',
      });
      if (res.success) {
        toast.success('Payment request rejected');
        loadPending();
        loadSubscribers();
      } else {
        toast.error(res.error || 'Rejection failed');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const planDist = stats?.planDistribution || [];

  return (
    <div className="space-y-6">
      {/* Plan tier summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(PLAN_TIERS).map(([key, plan]) => {
          const planData = planDist.find((p) => p.plan_tier === key);
          const count = parseInt(planData?.count || 0, 10);
          return (
            <Card key={key} className="border-none shadow-sm">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase">{plan.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{statsLoading ? '—' : count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending manual payments queue */}
      <Card className="border-amber-200 bg-amber-50/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Pending Manual Payment Requests
          </CardTitle>
          <CardDescription>Owner-submitted offline payment requests awaiting platform approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No pending payment requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.businessId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-amber-100"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{req.businessName}</p>
                    <p className="text-xs text-gray-500">
                      {req.domain} · {req.planTier} ·{' '}
                      {req.pending?.planTier || req.pending?.domainPackageKey || 'plan upgrade'}
                    </p>
                    {req.pending?.amountMajor != null && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {req.pending.currency || 'PKR'} {req.pending.amountMajor}
                        {req.pending.paymentReference ? ` · Ref: ${req.pending.paymentReference}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700"
                      disabled={processingId === req.businessId}
                      onClick={() => handleApprove(req.businessId)}
                    >
                      {processingId === req.businessId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-red-600 border-red-200"
                      disabled={processingId === req.businessId}
                      onClick={() => handleReject(req.businessId)}
                    >
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriber directory */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Subscriber Directory
              </CardTitle>
              <CardDescription>{total} businesses · manage plans, trials, and billing status</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => { loadSubscribers(); loadPending(); }}>
              <RefreshCcw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search business, domain, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {Object.keys(PLAN_TIERS).map((tier) => (
                  <SelectItem key={tier} value={tier}>{PLAN_TIERS[tier].name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="paid">Paid (non-free)</SelectItem>
                <SelectItem value="trial">Active trial</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending_payment">Pending payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : subscribers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No subscribers match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="p-2 font-medium">Business</th>
                    <th className="p-2 font-medium">Plan</th>
                    <th className="p-2 font-medium">Package</th>
                    <th className="p-2 font-medium">Access until</th>
                    <th className="p-2 font-medium">Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => {
                    const isExpired = sub.plan_expires_at && new Date(sub.plan_expires_at) < new Date();
                    const isTrialing = sub.plan_expires_at && !isExpired;
                    return (
                      <tr key={sub.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <p className="font-semibold text-gray-900">{sub.business_name}</p>
                          <p className="text-xs text-gray-500">{sub.domain}</p>
                        </td>
                        <td className="p-2">
                          <span className="text-xs font-semibold capitalize">
                            {PLAN_TIERS[sub.plan_tier]?.name || sub.plan_tier || 'free'}
                          </span>
                          {isTrialing && (
                            <span className="ml-1 text-[10px] text-amber-600 font-medium">
                              <Clock className="w-3 h-3 inline" /> trial
                            </span>
                          )}
                          {isExpired && (
                            <span className="ml-1 text-[10px] text-red-600 font-medium">expired</span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-gray-600">
                          {sub.domain_package_key ? (
                            <span className="inline-flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {sub.domain_package_name || sub.domain_package_key}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2 text-xs text-gray-600">
                          {sub.plan_expires_at
                            ? new Date(sub.plan_expires_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="p-2 text-xs">
                          {sub.pending_payment_status === 'pending' && (
                            <span className="text-amber-700 font-medium">Pending approval</span>
                          )}
                          {sub.stripe_subscription_status && (
                            <span className="text-gray-600">{sub.stripe_subscription_status}</span>
                          )}
                          {!sub.pending_payment_status && !sub.stripe_subscription_status && (
                            <span className="text-gray-400">manual / free</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > 25 && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {page} of {Math.ceil(total / 25)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 25 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PlatformSubscriptionsPanel;
