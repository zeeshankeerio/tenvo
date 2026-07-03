'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, Users, Building2, CreditCard, UserCog, Search,
    ChevronDown, ChevronRight, MoreVertical, RefreshCcw,
    TrendingUp, UserPlus, Clock, AlertTriangle, Check, X,
    Crown, Eye, Edit2, Trash2, Ban,
    Activity, BarChart3, Layers, Mail, Calendar, Flag, LayoutGrid, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    listAllBusinesses,
    getBusinessDetails,
    updateBusinessPlan,
    recordManualSubscriptionPayment,
    approveManualSubscriptionPaymentRequest,
    rejectManualSubscriptionPaymentRequest,
    updateBusinessPackaging,
    updateBusinessLimitOverrides,
    changeUserRole,
    deactivateBusinessUser,
    getSubscriptionStats,
    extendTrial,
    getPlatformMetrics,
} from '@/lib/actions/admin/platform';
import { PLAN_TIERS, PLAN_FEATURE_TOGGLE_KEYS, FEATURE_LABELS, resolvePlanTier, FEATURE_MIN_PLAN } from '@/lib/config/plans';
import { getPackagingFromSettings } from '@/lib/subscription/effectivePlanAccess';
import { getManualPaymentRequestState } from '@/lib/payments/manualPaymentRequests';
import { listDomainPackages } from '@/lib/config/domainPackages';
import {
    PLAN_LIMIT_OVERRIDE_KEYS,
    LIMIT_OVERRIDE_LABELS,
    formatPlanLimitValue,
    resolveEffectiveBusinessLimits,
} from '@/lib/utils/businessLimitOverrides';
import { ROLE_DESCRIPTIONS, TRIAL_CONFIG } from '@/lib/config/platform';
import { FeatureFlagManager } from './FeatureFlagManager';
import { UserManagement } from './UserManagement';
import { PlatformSubscriptionsPanel } from './PlatformSubscriptionsPanel';
import { PlatformPackagesPanel } from './PlatformPackagesPanel';
import { RegistrationApprovalsPanel } from './RegistrationApprovalsPanel';
import toast from 'react-hot-toast';

// --- Sub-views ---------------------------------------------------------------

const ADMIN_TABS = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'registrations', label: 'Registrations', icon: UserPlus },
    { key: 'businesses', label: 'Businesses', icon: Building2 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { key: 'packages', label: 'Packages', icon: Layers },
    { key: 'roles', label: 'Roles & Access', icon: UserCog },
    { key: 'features', label: 'Feature Flags', icon: Flag },
];

// --- Overview Panel ----------------------------------------------------------

function OverviewPanel({ stats, metrics, isLoading }) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6"><div className="h-16 bg-gray-100 rounded" /></CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const totals = stats?.totals || metrics || {};
    const planDist = stats?.planDistribution || [];
    const monthlyRevenue = metrics?.monthlyRevenue ?? 0;
    const recentBusinesses = metrics?.recentBusinesses || [];

    const kpis = [
        { label: 'Total Businesses', value: totals.total_businesses ?? metrics?.totalBusinesses ?? 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
        { label: 'Total Users', value: totals.total_users ?? metrics?.totalUsers ?? 0, icon: Users, color: 'text-wine-600 bg-wine-50' },
        { label: 'Monthly Revenue', value: monthlyRevenue ? `PKR ${(monthlyRevenue / 100).toLocaleString()}` : 'PKR 0', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Active Members', value: totals.total_active_members ?? 0, icon: UserPlus, color: 'text-green-600 bg-green-50' },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(kpi => (
                    <Card key={kpi.label} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                                    <p className="text-3xl font-semibold text-gray-900 mt-1">{kpi.value}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.color}`}>
                                    <kpi.icon className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Plan Distribution */}
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold">Plan Distribution</CardTitle>
                    <CardDescription>Active subscriptions across all businesses</CardDescription>
                </CardHeader>
                <CardContent>
                    {planDist.length === 0 ? (
                        <p className="text-sm text-gray-400">No data available</p>
                    ) : (
                        <div className="space-y-3">
                            {planDist.map(plan => {
                                const total = parseInt(totals.total_businesses) || 1;
                                const count = parseInt(plan.count);
                                const pct = ((count / total) * 100).toFixed(1);
                                const planInfo = PLAN_TIERS[plan.plan_tier];
                                const colorMap = {
                                    free: 'bg-gray-400', starter: 'bg-blue-500',
                                    professional: 'bg-indigo-500', business: 'bg-wine-500', enterprise: 'bg-amber-500'
                                };
                                return (
                                    <div key={plan.plan_tier} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-semibold text-gray-700">
                                                {planInfo?.name || plan.plan_tier}
                                            </span>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span>{count} businesses ({pct}%)</span>
                                                {parseInt(plan.active_trials) > 0 && (
                                                    <span className="text-amber-600 font-medium">
                                                        {plan.active_trials} trials
                                                    </span>
                                                )}
                                                {parseInt(plan.expired_trials) > 0 && (
                                                    <span className="text-red-500 font-medium">
                                                        {plan.expired_trials} expired
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${colorMap[plan.plan_tier] || 'bg-gray-400'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {recentBusinesses.length > 0 && (
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Recent Signups
                        </CardTitle>
                        <CardDescription>Latest businesses registered on the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentBusinesses.map((biz) => (
                                <div key={biz.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-sm">
                                    <div>
                                        <p className="font-semibold text-gray-900">{biz.business_name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{biz.category?.replace(/-/g, ' ') || 'General'}</p>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {biz.created_at ? new Date(biz.created_at).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// --- Businesses Panel --------------------------------------------------------

function BusinessesPanel() {
    const [businesses, setBusinesses] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedBiz, setSelectedBiz] = useState(null);
    const [bizDetails, setBizDetails] = useState(null);
    const [editingPlan, setEditingPlan] = useState(null);

    const fetchBusinesses = useCallback(async () => {
        setLoading(true);
        const res = await listAllBusinesses({ page, limit: 20, search });
        if (res.success) {
            setBusinesses(res.businesses);
            setTotal(res.total);
        } else {
            toast.error(res.error || 'Failed to load businesses');
        }
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

    const handleViewDetails = async (bizId) => {
        const res = await getBusinessDetails(bizId);
        if (res.success) {
            setBizDetails(res);
            setSelectedBiz(bizId);
        } else {
            toast.error(res.error);
        }
    };

    const handleUpdatePlan = async (bizId, newPlan) => {
        const res = await updateBusinessPlan(bizId, newPlan);
        if (res.success) {
            toast.success(`Plan updated to ${newPlan}`);
            setEditingPlan(null);
            fetchBusinesses();
        } else {
            toast.error(res.error);
        }
    };

    const handleExtendTrial = async (bizId) => {
        const res = await extendTrial(bizId, TRIAL_CONFIG.durationDays);
        if (res.success) {
            toast.success(`Trial extended by ${TRIAL_CONFIG.durationDays} days`);
            fetchBusinesses();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search businesses by name, email, or domain..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="sm" onClick={fetchBusinesses}>
                    <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
                </Button>
            </div>

            <p className="text-xs text-gray-500">{total} total businesses</p>

            {/* Business List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : businesses.length === 0 ? (
                <Card className="p-8 text-center">
                    <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No businesses found</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {businesses.map(biz => {
                        const isExpired = biz.plan_expires_at && new Date(biz.plan_expires_at) < new Date();
                        const isTrialing = biz.plan_expires_at && !isExpired;
                        return (
                            <Card key={biz.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm text-gray-900 truncate">{biz.business_name}</h4>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                                    biz.plan_tier === 'enterprise' ? 'bg-amber-100 text-amber-800' :
                                                    biz.plan_tier === 'business' ? 'bg-wine-100 text-wine-800' :
                                                    biz.plan_tier === 'professional' ? 'bg-indigo-100 text-indigo-800' :
                                                    biz.plan_tier === 'starter' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {PLAN_TIERS[biz.plan_tier]?.name || biz.plan_tier}
                                                </span>
                                                {isTrialing && (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700">
                                                        <Clock className="w-3 h-3 inline mr-0.5" /> Trial
                                                    </span>
                                                )}
                                                {isExpired && (
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700">
                                                        Expired
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span>{biz.domain}</span>
                                                <span>&middot;</span>
                                                <span>{biz.owner_name || biz.owner_email}</span>
                                                <span>&middot;</span>
                                                <span>{biz.active_users} users</span>
                                                <span>&middot;</span>
                                                <span>{biz.product_count} products</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {editingPlan === biz.id ? (
                                                <div className="flex items-center gap-1">
                                                    <Select onValueChange={(val) => handleUpdatePlan(biz.id, val)}>
                                                        <SelectTrigger className="w-32 h-8 text-xs">
                                                            <SelectValue placeholder="Select plan" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.keys(PLAN_TIERS).map(tier => (
                                                                <SelectItem key={tier} value={tier}>
                                                                    {PLAN_TIERS[tier].name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingPlan(null)}>
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleViewDetails(biz.id)}>
                                                        <Eye className="w-3 h-3 mr-1" /> Details
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditingPlan(biz.id)}>
                                                        <Edit2 className="w-3 h-3 mr-1" /> Plan
                                                    </Button>
                                                    {(isExpired || isTrialing) && (
                                                        <Button size="sm" variant="outline" className="text-xs h-7 text-amber-700 border-amber-200" onClick={() => handleExtendTrial(biz.id)}>
                                                            <Clock className="w-3 h-3 mr-1" /> +{TRIAL_CONFIG.durationDays} days
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {total > 20 && (
                <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
                    <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}

            {/* Business Detail Modal */}
            {selectedBiz && bizDetails && (
                <BusinessDetailModal
                    details={bizDetails}
                    onClose={() => { setSelectedBiz(null); setBizDetails(null); }}
                    onRefresh={() => handleViewDetails(selectedBiz)}
                />
            )}
        </div>
    );
}

function BusinessDetailModal({ details, onClose, onRefresh }) {
    const { business, members } = details;

    const [manualDays, setManualDays] = useState('30');
    const [manualRef, setManualRef] = useState('');
    const [manualNotes, setManualNotes] = useState('');
    const [manualAmount, setManualAmount] = useState('');
    const [manualTier, setManualTier] = useState('__current__');
    const [manualPackage, setManualPackage] = useState('__none__');
    const [manualGrantAccess, setManualGrantAccess] = useState(false);
    const [manualSaving, setManualSaving] = useState(false);
    const [approveSaving, setApproveSaving] = useState(false);
    const [adminPackagingMode, setAdminPackagingMode] = useState('tier');
    const [adminFeatureOverrides, setAdminFeatureOverrides] = useState({});
    const [packagingSaving, setPackagingSaving] = useState(false);
    const [adminLimitInputs, setAdminLimitInputs] = useState({});
    const [limitSaving, setLimitSaving] = useState(false);

    const limitSnapshot = React.useMemo(
        () => resolveEffectiveBusinessLimits(business),
        [business]
    );

    const paidTierKeys = Object.keys(PLAN_TIERS).filter((k) => k !== 'free');
    const domainPackageOptions = listDomainPackages();

    const handleManualPayment = async () => {
        const tierArg = manualTier === '__current__' ? null : manualTier;
        const packageArg = manualPackage === '__none__' ? null : manualPackage;
        if (!tierArg && !packageArg && business.plan_tier === 'free') {
            toast.error('Select a paid plan tier or domain package.');
            return;
        }
        setManualSaving(true);
        try {
            const res = await recordManualSubscriptionPayment({
                businessId: business.id,
                planTier: packageArg ? null : tierArg,
                domainPackageKey: packageArg,
                extendDays: parseInt(manualDays, 10) || 30,
                amountMajor: manualAmount.trim() ? parseInt(manualAmount, 10) : null,
                currency: 'PKR',
                paymentReference: manualRef.trim(),
                paymentMethod: 'admin_recorded',
                notes: manualNotes.trim(),
                grantAccess: manualGrantAccess,
            });
            if (res.success) {
                toast.success(
                    res.grantedAccess
                        ? `Payment recorded and dashboard access enabled. Access through ${new Date(res.planExpiresAt).toLocaleDateString()}`
                        : `Manual payment recorded. Access through ${new Date(res.planExpiresAt).toLocaleDateString()}`
                );
                setManualRef('');
                setManualNotes('');
                setManualAmount('');
                setManualGrantAccess(false);
                onRefresh();
            } else {
                toast.error(res.error || 'Failed to record payment');
            }
        } finally {
            setManualSaving(false);
        }
    };

    const handleApprovePendingPayment = async () => {
        setApproveSaving(true);
        try {
            const res = await approveManualSubscriptionPaymentRequest({
                businessId: business.id,
                extendDays: parseInt(manualDays, 10) || 30,
            });
            if (res.success) {
                toast.success(`Approved. Access through ${new Date(res.planExpiresAt).toLocaleDateString()}`);
                onRefresh();
            } else {
                toast.error(res.error || 'Approval failed');
            }
        } finally {
            setApproveSaving(false);
        }
    };

    const handleRejectPendingPayment = async () => {
        setApproveSaving(true);
        try {
            const res = await rejectManualSubscriptionPaymentRequest({
                businessId: business.id,
                reviewNotes: manualNotes.trim(),
            });
            if (res.success) {
                toast.success('Payment request rejected');
                onRefresh();
            } else {
                toast.error(res.error || 'Rejection failed');
            }
        } finally {
            setApproveSaving(false);
        }
    };

    const bizSettings = React.useMemo(() => {
        const s = business?.settings;
        if (!s) return {};
        if (typeof s === 'string') {
            try {
                return JSON.parse(s);
            } catch {
                return {};
            }
        }
        return typeof s === 'object' && !Array.isArray(s) ? s : {};
    }, [business?.settings]);

    const manualPaymentState = getManualPaymentRequestState(bizSettings);
    const pendingOwnerPayment =
        manualPaymentState.pending?.status === 'pending' ? manualPaymentState.pending : null;

    useEffect(() => {
        const pkg = getPackagingFromSettings(bizSettings);
        const tier = resolvePlanTier(business?.plan_tier || 'free');
        const tierFeatures = PLAN_TIERS[tier]?.features || {};
        const seeded = Object.fromEntries(
            PLAN_FEATURE_TOGGLE_KEYS.map((key) => [key, Boolean(tierFeatures[key])])
        );
        if (pkg?.mode === 'custom') {
            setAdminPackagingMode('custom');
            setAdminFeatureOverrides({
                ...seeded,
                ...(pkg.feature_overrides || {}),
            });
        } else {
            setAdminPackagingMode('tier');
            setAdminFeatureOverrides(seeded);
        }
    }, [business?.id, business?.plan_tier, bizSettings]);

    useEffect(() => {
        const { effective, overriddenKeys } = limitSnapshot;
        const inputs = {};
        for (const key of PLAN_LIMIT_OVERRIDE_KEYS) {
            inputs[key] = overriddenKeys[key] !== undefined ? String(effective[key]) : '';
        }
        setAdminLimitInputs(inputs);
    }, [business?.id, business?.plan_tier, business?.plan_seats, business?.max_products, business?.max_warehouses, limitSnapshot]);

    const handleSaveAdminPackaging = async () => {
        setPackagingSaving(true);
        try {
            const res = await updateBusinessPackaging(business.id, {
                mode: adminPackagingMode,
                featureOverrides: adminPackagingMode === 'custom' ? adminFeatureOverrides : undefined,
            });
            if (res.success) {
                toast.success('Module packaging updated');
                onRefresh();
            } else {
                toast.error(res.error || 'Failed to save packaging');
            }
        } finally {
            setPackagingSaving(false);
        }
    };

    const handleResetPackaging = async () => {
        const res = await updateBusinessPackaging(business.id, { mode: 'tier' });
        if (res.success) {
            toast.success('Packaging reset to plan tier defaults');
            onRefresh();
        } else {
            toast.error(res.error || 'Failed to update packaging');
        }
    };

    const handleSaveLimitOverrides = async () => {
        setLimitSaving(true);
        try {
            const res = await updateBusinessLimitOverrides(business.id, adminLimitInputs);
            if (res.success) {
                toast.success('Plan limits updated');
                onRefresh();
            } else {
                toast.error(res.error || 'Failed to save limit overrides');
            }
        } finally {
            setLimitSaving(false);
        }
    };

    const handleResetLimitOverrides = async () => {
        const cleared = Object.fromEntries(PLAN_LIMIT_OVERRIDE_KEYS.map((k) => [k, '']));
        setLimitSaving(true);
        try {
            const res = await updateBusinessLimitOverrides(business.id, cleared);
            if (res.success) {
                toast.success('Limits reset to plan tier defaults');
                onRefresh();
            } else {
                toast.error(res.error || 'Failed to reset limits');
            }
        } finally {
            setLimitSaving(false);
        }
    };

    const enterpriseOnlyFeatureKeys = React.useMemo(() => {
        const freeKeys = new Set(Object.keys(PLAN_TIERS.free.features));
        return new Set(
            Object.keys(PLAN_TIERS.enterprise.features).filter((k) => !freeKeys.has(k))
        );
    }, []);

    const handleChangeRole = async (userId, newRole) => {
        const res = await changeUserRole(userId, business.id, newRole);
        if (res.success) {
            toast.success('Role updated');
            onRefresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleDeactivate = async (userId) => {
        const res = await deactivateBusinessUser(userId, business.id);
        if (res.success) {
            toast.success('User deactivated');
            onRefresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{business.business_name}</CardTitle>
                            <CardDescription>{business.domain} &middot; {business.category} &middot; {business.country}</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {/* Business Info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Plan:</span> <span className="font-semibold">{PLAN_TIERS[business.plan_tier]?.name || business.plan_tier}</span></div>
                        <div><span className="text-gray-500">Owner:</span> <span className="font-semibold">{business.owner_name || business.owner_email}</span></div>
                        <div><span className="text-gray-500">Email:</span> <span className="font-semibold">{business.email}</span></div>
                        <div><span className="text-gray-500">Created:</span> <span className="font-semibold">{new Date(business.created_at).toLocaleDateString()}</span></div>
                        {business.stripe_subscription_status && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Billing status (sync):</span>{' '}
                                <span className="font-semibold font-mono text-xs">{business.stripe_subscription_status}</span>
                            </div>
                        )}
                        {business.plan_expires_at && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Plan Expires:</span>{' '}
                                <span className={`font-semibold ${new Date(business.plan_expires_at) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                                    {new Date(business.plan_expires_at).toLocaleDateString()}
                                    {new Date(business.plan_expires_at) < new Date() ? ' (Expired)' : ' (Active)'}
                                </span>
                            </div>
                        )}
                    </div>

                    {bizSettings?.packaging?.mode === 'custom' && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-amber-950">
                                <span className="font-bold">Custom packaging</span>, per-feature overrides are active on this business. Reset to use only the subscription tier flags.
                            </p>
                            <Button type="button" size="sm" variant="outline" className="shrink-0 border-amber-300" onClick={() => void handleResetPackaging()}>
                                Reset to tier defaults
                            </Button>
                        </div>
                    )}

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 space-y-3">
                        <div>
                            <h4 className="font-bold text-sm text-emerald-950">Manual payment &amp; renewal</h4>
                            <p className="text-xs text-emerald-900/80 mt-1">
                                Record Easypaisa, JazzCash, bank transfer, or approve owner-submitted references. Applies plan tier or vertical package with custom packaging when configured.
                            </p>
                        </div>

                        {pendingOwnerPayment ? (
                            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                                <p className="text-xs font-semibold text-amber-950">Owner payment pending approval</p>
                                <ul className="text-xs text-amber-900/90 space-y-0.5">
                                    <li>Reference: <strong>{pendingOwnerPayment.paymentReference}</strong></li>
                                    <li>Method: {pendingOwnerPayment.paymentMethod || '—'}</li>
                                    {pendingOwnerPayment.domainPackageKey ? (
                                        <li>Package: {pendingOwnerPayment.domainPackageKey}</li>
                                    ) : (
                                        <li>Plan: {pendingOwnerPayment.planTier || business.plan_tier}</li>
                                    )}
                                    {pendingOwnerPayment.amountMajor ? (
                                        <li>Amount: PKR {pendingOwnerPayment.amountMajor.toLocaleString()}</li>
                                    ) : null}
                                </ul>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    <Button type="button" size="sm" disabled={approveSaving} onClick={() => void handleApprovePendingPayment()}>
                                        {approveSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                        Approve &amp; activate
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" disabled={approveSaving} onClick={() => void handleRejectPendingPayment()}>
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Plan tier</Label>
                                <Select value={manualTier} onValueChange={setManualTier}>
                                    <SelectTrigger className="h-8 text-xs bg-white">
                                        <SelectValue placeholder="Tier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__current__">Keep / apply current tier</SelectItem>
                                        {paidTierKeys.map((tier) => (
                                            <SelectItem key={tier} value={tier}>
                                                {PLAN_TIERS[tier]?.name || tier}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Domain package (optional)</Label>
                                <Select value={manualPackage} onValueChange={setManualPackage}>
                                    <SelectTrigger className="h-8 text-xs bg-white">
                                        <SelectValue placeholder="Package" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None (plan tier only)</SelectItem>
                                        {domainPackageOptions.map((pkg) => (
                                            <SelectItem key={pkg.key} value={pkg.key}>
                                                {pkg.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Extend (days)</Label>
                                <Input
                                    className="h-8 text-xs bg-white"
                                    type="number"
                                    min={1}
                                    value={manualDays}
                                    onChange={(e) => setManualDays(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs">Payment reference (txn ID)</Label>
                                <Input
                                    className="h-8 text-xs bg-white"
                                    value={manualRef}
                                    onChange={(e) => setManualRef(e.target.value)}
                                    placeholder="e.g. wallet / bank reference"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Amount PKR (optional)</Label>
                                <Input
                                    className="h-8 text-xs bg-white"
                                    type="number"
                                    value={manualAmount}
                                    onChange={(e) => setManualAmount(e.target.value)}
                                    placeholder="e.g. 12999"
                                />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs">Notes (optional)</Label>
                                <Textarea
                                    className="text-xs bg-white min-h-[52px]"
                                    value={manualNotes}
                                    onChange={(e) => setManualNotes(e.target.value)}
                                    placeholder="Internal note"
                                />
                            </div>
                        </div>
                        <label className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 px-3 py-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={manualGrantAccess}
                                onChange={(e) => setManualGrantAccess(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                            />
                            <span className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-900">Also enable dashboard access</span> — approves the registration ({business.approval_status === 'approved' || business.approval_status === 'auto_approved' ? 'already has access' : 'currently gated'}) so the owner can sign in immediately.
                            </span>
                        </label>
                        <Button
                            type="button"
                            size="sm"
                            className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white"
                            disabled={manualSaving}
                            onClick={() => void handleManualPayment()}
                        >
                            {manualSaving
                                ? 'Saving…'
                                : manualGrantAccess
                                    ? 'Record payment & enable access'
                                    : 'Record manual payment & extend access'}
                        </Button>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                        <div>
                            <h4 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                Custom module packaging (admin)
                            </h4>
                            <p className="text-xs text-slate-700 mt-1">
                                Override subscription tier feature flags for this business. Seat and inventory limits still follow plan tier.
                            </p>
                        </div>
                        <div className={`space-y-3 ${packagingSaving ? 'pointer-events-none opacity-70' : ''}`}>
                            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-900">Custom module toggles</p>
                                    <p className="text-[11px] text-slate-500">Off = tier defaults only</p>
                                </div>
                                <Switch
                                    checked={adminPackagingMode === 'custom'}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            const t = resolvePlanTier(business?.plan_tier || 'free');
                                            const tierFeatures = PLAN_TIERS[t]?.features || {};
                                            const seeded = Object.fromEntries(
                                                PLAN_FEATURE_TOGGLE_KEYS.map((key) => [
                                                    key,
                                                    Boolean(tierFeatures[key]),
                                                ])
                                            );
                                            setAdminFeatureOverrides({ ...seeded, ...adminFeatureOverrides });
                                            setAdminPackagingMode('custom');
                                        } else {
                                            setAdminPackagingMode('tier');
                                        }
                                    }}
                                    aria-label="Enable custom module packaging"
                                />
                            </div>
                            {adminPackagingMode === 'custom' ? (
                                <div className="rounded-md border border-slate-200 bg-white max-h-48 overflow-y-auto divide-y divide-slate-100">
                                    {PLAN_FEATURE_TOGGLE_KEYS.map((key) => {
                                        const label = FEATURE_LABELS[key] || key.replace(/_/g, ' ');
                                        const minPlan = FEATURE_MIN_PLAN[key];
                                        const isEnterpriseOnly = enterpriseOnlyFeatureKeys.has(key);
                                        return (
                                            <div key={key} className="flex items-center justify-between gap-2 px-3 py-2">
                                                <div className="min-w-0">
                                                    <span className="text-xs font-medium text-slate-800">{label}</span>
                                                    {isEnterpriseOnly ? (
                                                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                                                            {minPlan === 'business' ? 'Business+' : 'Enterprise'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <Switch
                                                    checked={!!adminFeatureOverrides[key]}
                                                    onCheckedChange={(v) =>
                                                        setAdminFeatureOverrides((prev) => ({ ...prev, [key]: v }))
                                                    }
                                                    aria-label={label}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={packagingSaving}
                                    onClick={() => void handleSaveAdminPackaging()}
                                >
                                    {packagingSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                    Save packaging
                                </Button>
                                {bizSettings?.packaging?.mode === 'custom' ? (
                                    <Button type="button" size="sm" variant="outline" onClick={() => void handleResetPackaging()}>
                                        Reset to tier
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 space-y-3">
                        <div>
                            <h4 className="font-bold text-sm text-indigo-950">Plan limit overrides (admin)</h4>
                            <p className="text-xs text-indigo-900/80 mt-1">
                                Override seat, catalog, and usage caps for this tenant. Leave blank to use the{' '}
                                <strong>{PLAN_TIERS[limitSnapshot.tier]?.name || limitSnapshot.tier}</strong> tier
                                default. Use <code className="text-[10px] bg-white/60 px-1 rounded">-1</code> for
                                unlimited. Owners see effective limits read-only in Settings.
                            </p>
                        </div>
                        <div className={`space-y-2 ${limitSaving ? 'pointer-events-none opacity-70' : ''}`}>
                            <div className="hidden sm:grid sm:grid-cols-[1fr_5rem_6rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-800/70">
                                <span>Limit</span>
                                <span>Tier default</span>
                                <span>Override</span>
                            </div>
                            {PLAN_LIMIT_OVERRIDE_KEYS.map((key) => {
                                const label = LIMIT_OVERRIDE_LABELS[key] || key.replace(/max_/, '').replace(/_/g, ' ');
                                const tierDefault = limitSnapshot.tierDefaults[key];
                                const effective = limitSnapshot.effective[key];
                                const isOverridden = limitSnapshot.overriddenKeys[key] !== undefined;
                                return (
                                    <div
                                        key={key}
                                        className="grid grid-cols-1 sm:grid-cols-[1fr_5rem_6rem] gap-1 sm:gap-2 items-center rounded-md border border-indigo-100 bg-white px-2 py-2"
                                    >
                                        <div>
                                            <p className="text-xs font-medium text-slate-900">{label}</p>
                                            {isOverridden ? (
                                                <p className="text-[10px] text-indigo-700 sm:hidden">
                                                    Current: {formatPlanLimitValue(effective)}
                                                </p>
                                            ) : null}
                                        </div>
                                        <span className="text-xs text-slate-500 sm:text-center">
                                            {formatPlanLimitValue(tierDefault)}
                                        </span>
                                        <Input
                                            className="h-8 text-xs"
                                            type="number"
                                            min={-1}
                                            placeholder={formatPlanLimitValue(tierDefault)}
                                            value={adminLimitInputs[key] ?? ''}
                                            onChange={(e) =>
                                                setAdminLimitInputs((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                            aria-label={`${label} override`}
                                        />
                                    </div>
                                );
                            })}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={limitSaving}
                                    onClick={() => void handleSaveLimitOverrides()}
                                >
                                    {limitSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                    Save limits
                                </Button>
                                {Object.keys(limitSnapshot.overriddenKeys).length > 0 ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={limitSaving}
                                        onClick={() => void handleResetLimitOverrides()}
                                    >
                                        Reset to tier defaults
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Team Members */}
                    <div>
                        <h4 className="font-bold text-sm mb-2">Team Members ({members?.length || 0})</h4>
                        <div className="space-y-2">
                            {(members || []).map(member => (
                                <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                                            {member.name?.substring(0, 2).toUpperCase() || '??'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{member.name}</p>
                                            <p className="text-xs text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select defaultValue={member.role} onValueChange={(val) => handleChangeRole(member.user_id, val)}>
                                            <SelectTrigger className="w-36 h-7 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(ROLE_DESCRIPTIONS).map(r => (
                                                    <SelectItem key={r} value={r}>
                                                        {ROLE_DESCRIPTIONS[r].label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {member.status}
                                        </span>
                                        {member.role !== 'owner' && member.status === 'active' && (
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeactivate(member.user_id)}>
                                                <Ban className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Roles & Access Panel ----------------------------------------------------

function RolesPanel() {
    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold">Role Hierarchy</CardTitle>
                    <CardDescription>Platform roles and their access levels (highest → lowest)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Object.entries(ROLE_DESCRIPTIONS).map(([key, info]) => (
                            <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${info.badge}`}>
                                    {info.label.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">{info.label}</p>
                                    <p className="text-xs text-gray-500">{info.description}</p>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">{key}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-bold">Access Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                    <p><strong>Platform Owner</strong> (your account) has full access to everything -- no plan restrictions, no role gates, no limits.</p>
                    <p><strong>Platform Admin</strong> users (user.role = &quot;admin&quot;) also bypass all business-level checks.</p>
                    <p><strong>Business Owner</strong> = the person who registered a business (has &quot;owner&quot; role in business_users). They manage their team&apos;s roles.</p>
                    <p><strong>Admin</strong> = business-level admin, can manage team members, settings, and most operations.</p>
                    <p><strong>Team Members</strong> (manager → viewer) have progressively restricted access based on their role and the business&apos;s subscription plan.</p>
                    <p className="pt-2 text-xs text-gray-400">New free signups get a <strong>{TRIAL_CONFIG.durationDays}-day Starter trial</strong> (aligned with Stripe checkout trial). After expiry, they downgrade to Free unless they subscribe.</p>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Main Panel --------------------------------------------------------------

export default function PlatformAdminPanel() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setStatsLoading(true);
            try {
                const [statsRes, metricsRes] = await Promise.all([
                    getSubscriptionStats(),
                    getPlatformMetrics(),
                ]);
                if (statsRes.success) {
                    setStats(statsRes);
                }
                if (metricsRes.success) {
                    setMetrics(metricsRes);
                }
            } catch (err) {
                console.error('[PlatformAdmin] Failed to load stats:', err);
            } finally {
                setStatsLoading(false);
            }
        })();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Platform Administration</h2>
                        <p className="text-xs text-gray-500">Manage businesses, users, subscriptions, roles & access</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {ADMIN_TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                isActive
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && <OverviewPanel stats={stats} metrics={metrics} isLoading={statsLoading} />}
            {activeTab === 'registrations' && <RegistrationApprovalsPanel embedded />}
            {activeTab === 'businesses' && <BusinessesPanel />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'subscriptions' && <PlatformSubscriptionsPanel stats={stats} isLoading={statsLoading} />}
            {activeTab === 'packages' && <PlatformPackagesPanel />}
            {activeTab === 'roles' && <RolesPanel />}
            {activeTab === 'features' && <FeatureFlagManager />}
        </div>
    );
}

