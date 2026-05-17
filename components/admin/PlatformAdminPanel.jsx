'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, Users, Building2, CreditCard, UserCog, Search,
    ChevronDown, ChevronRight, MoreVertical, RefreshCcw,
    TrendingUp, UserPlus, Clock, AlertTriangle, Check, X,
    Crown, ArrowUpRight, Eye, Edit2, Trash2, Ban,
    Activity, BarChart3, Layers, Mail, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    listAllBusinesses,
    listAllUsers,
    getBusinessDetails,
    updateBusinessPlan,
    changeUserRole,
    deactivateBusinessUser,
    getSubscriptionStats,
    extendTrial,
    setPlatformRole,
} from '@/lib/actions/admin/platform';
import { PLAN_TIERS } from '@/lib/config/plans';
import { ROLE_DESCRIPTIONS } from '@/lib/config/platform';
import toast from 'react-hot-toast';

// --- Sub-views ---------------------------------------------------------------

const ADMIN_TABS = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'businesses', label: 'Businesses', icon: Building2 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { key: 'roles', label: 'Roles & Access', icon: UserCog },
];

// --- Overview Panel ----------------------------------------------------------

function OverviewPanel({ stats, isLoading }) {
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

    const totals = stats?.totals || {};
    const planDist = stats?.planDistribution || [];

    const kpis = [
        { label: 'Total Businesses', value: totals.total_businesses || 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
        { label: 'Total Users', value: totals.total_users || 0, icon: Users, color: 'text-wine-600 bg-wine-50' },
        { label: 'Business Owners', value: totals.total_owners || 0, icon: Crown, color: 'text-amber-600 bg-amber-50' },
        { label: 'Active Members', value: totals.total_active_members || 0, icon: UserPlus, color: 'text-green-600 bg-green-50' },
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
                                    <p className="text-3xl font-black text-gray-900 mt-1">{kpi.value}</p>
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
        const res = await extendTrial(bizId, 7);
        if (res.success) {
            toast.success(`Trial extended by 7 days`);
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
                                                            <Clock className="w-3 h-3 mr-1" /> +7 days
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
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

// --- Users Panel -------------------------------------------------------------

function UsersPanel() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const res = await listAllUsers({ page, limit: 20, search });
        if (res.success) {
            setUsers(res.users);
            setTotal(res.total);
        } else {
            toast.error(res.error || 'Failed to load users');
        }
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleSetPlatformRole = async (userId, newRole) => {
        const res = await setPlatformRole(userId, newRole);
        if (res.success) {
            toast.success(`Platform role updated to ${newRole}`);
            fetchUsers();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search users by name or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers}>
                    <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
                </Button>
            </div>

            <p className="text-xs text-gray-500">{total} total users</p>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : users.length === 0 ? (
                <Card className="p-8 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No users found</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {users.map(user => (
                        <Card key={user.id} className="border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-wine-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                                            {user.name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900 truncate">{user.name || 'Unnamed'}</p>
                                                {user.platform_role === 'admin' && (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-wine-100 text-wine-700">
                                                        Platform Admin
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            {user.businesses && user.businesses.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {user.businesses.map((b, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-100 text-gray-600">
                                                            {b.business_name} ({b.role})
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-gray-400">
                                            Joined {new Date(user.createdAt).toLocaleDateString()}
                                        </span>
                                        <Select
                                            defaultValue={user.platform_role || 'user'}
                                            onValueChange={(val) => handleSetPlatformRole(user.id, val)}
                                        >
                                            <SelectTrigger className="w-28 h-7 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="admin">Platform Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {total > 20 && (
                <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
                    <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    );
}

// --- Subscriptions Panel -----------------------------------------------------

function SubscriptionsPanel({ stats, isLoading }) {
    if (isLoading) {
        return <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />;
    }

    const planDist = stats?.planDistribution || [];
    const totals = stats?.totals || {};

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PLAN_TIERS).map(([key, plan]) => {
                    const planData = planDist.find(p => p.plan_tier === key);
                    const count = parseInt(planData?.count || 0);
                    const trials = parseInt(planData?.active_trials || 0);
                    const expired = parseInt(planData?.expired_trials || 0);
                    return (
                        <Card key={key} className="border-none shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-sm">{plan.name}</h4>
                                    <span className="text-lg font-black text-gray-900">{count}</span>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Price</span>
                                        <span className="font-semibold">
                                            {plan.price_pkr === 0 ? 'Free' : `PKR ${plan.price_pkr?.toLocaleString()}/mo`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Max Users</span>
                                        <span className="font-semibold">{plan.limits.max_users === -1 ? '∞' : plan.limits.max_users}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Max Products</span>
                                        <span className="font-semibold">{plan.limits.max_products === -1 ? '∞' : plan.limits.max_products}</span>
                                    </div>
                                    {trials > 0 && (
                                        <div className="flex justify-between text-amber-600 font-medium">
                                            <span>Active Trials</span>
                                            <span>{trials}</span>
                                        </div>
                                    )}
                                    {expired > 0 && (
                                        <div className="flex justify-between text-red-500 font-medium">
                                            <span>Expired Trials</span>
                                            <span>{expired}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
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
                    <p className="pt-2 text-xs text-gray-400">All new businesses get a <strong>7-day Starter trial</strong>. After expiry, they downgrade to Free unless they subscribe.</p>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Main Panel --------------------------------------------------------------

export default function PlatformAdminPanel() {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setStatsLoading(true);
            try {
                const res = await getSubscriptionStats();
                if (res.success) {
                    setStats(res);
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
                        <h2 className="text-xl font-black text-gray-900">Platform Administration</h2>
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
            {activeTab === 'overview' && <OverviewPanel stats={stats} isLoading={statsLoading} />}
            {activeTab === 'businesses' && <BusinessesPanel />}
            {activeTab === 'users' && <UsersPanel />}
            {activeTab === 'subscriptions' && <SubscriptionsPanel stats={stats} isLoading={statsLoading} />}
            {activeTab === 'roles' && <RolesPanel />}
        </div>
    );
}

