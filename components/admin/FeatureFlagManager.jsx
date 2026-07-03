'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  User, 
  Search,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Flag,
  Activity,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { 
  listFeatureFlags, 
  updateFeatureFlag,
  createFeatureFlag,
  deleteFeatureFlagOverride,
  listBusinessFeatureOverrides,
  setBusinessPlanFeatureOverride,
  searchBusinessesForFeatureOverrides,
  getFeatureFlagAnalytics,
} from '@/lib/actions/admin/features';
import { PLAN_FEATURE_TOGGLE_KEYS, FEATURE_LABELS } from '@/lib/config/plans';
import { Label } from '@/components/ui/label';

/**
 * FeatureFlagManager - Admin panel for managing feature flags
 * 
 * Features:
 * - Global feature toggle
 * - Percentage rollout
 * - Business-specific overrides
 * - User-specific overrides
 * - Analytics dashboard
 */

const FEATURE_FLAG_TABS = [
  { key: 'global', label: 'Global Flags', icon: Flag },
  { key: 'business', label: 'Business Overrides', icon: Building2 },
  { key: 'user', label: 'User Overrides', icon: User },
  { key: 'analytics', label: 'Analytics', icon: Activity },
];

function parseFlagDefaultValue(raw) {
  if (typeof raw === 'boolean') return raw;
  if (raw == null) return false;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed === true || parsed === 'true';
  } catch {
    return Boolean(raw);
  }
}

/**
 * Global Flags Panel
 */
function GlobalFlagsPanel({ flags, totalBusinesses, onToggle, onUpdateRollout, onCreate, creating }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    key: '',
    name: '',
    description: '',
    type: 'boolean',
    default_value: false,
    rollout_percentage: 100,
  });

  const handleCreate = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error('Key and name are required');
      return;
    }
    const ok = await onCreate?.({
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      default_value: form.default_value,
      rollout_percentage: form.rollout_percentage,
    });
    if (ok) {
      setCreateOpen(false);
      setForm({ key: '', name: '', description: '', type: 'boolean', default_value: false, rollout_percentage: 100 });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Global Feature Flags</h3>
          <p className="text-sm text-muted-foreground">
            Control platform-wide rollout flags. Plan module overrides live under Business Overrides.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          New Flag
        </Button>
      </div>

      {createOpen && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Key (snake_case)</Label>
                <Input
                  placeholder="beta_checkout_v2"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display name</Label>
                <Input
                  placeholder="Beta checkout v2"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="What this flag controls"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="boolean">Boolean</option>
                  <option value="percentage">Percentage rollout</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default when enabled</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={form.default_value ? 'true' : 'false'}
                  onChange={(e) => setForm((f) => ({ ...f, default_value: e.target.value === 'true' }))}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create flag
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {flags.map((flag) => (
          <Card key={flag.id} className={cn(
            "transition-all",
            flag.isActive ? "border-green-200 bg-green-50/30" : "border-gray-200 opacity-90"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{flag.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {flag.key}
                    </Badge>
                    <Badge variant={flag.isActive ? "default" : "secondary"} className="text-xs">
                      {flag.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Default: {flag.defaultValue ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Type: {flag.type}</span>
                    <span>Created: {flag.createdAt ? new Date(flag.createdAt).toLocaleDateString() : 'N/A'}</span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {flag.usageStats?.enabled || 0}/{flag.usageStats?.total || totalBusinesses || 0} overrides
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <Switch
                    checked={flag.isActive}
                    onCheckedChange={() => onToggle?.(flag.id)}
                  />
                  
                  {flag.type === 'percentage' && flag.isActive && (
                    <div className="w-32 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Rollout</span>
                        <span>{flag.rolloutPercentage}%</span>
                      </div>
                      <Slider
                        value={[flag.rolloutPercentage]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) => onUpdateRollout?.(flag.id, value[0])}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {flags.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">No global feature flags yet. Create one to start rollout control.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Business Overrides Panel — plan module keys that affect runtime guards.
 */
function BusinessOverridesPanel({ overrides, loading, onDelete, onSearch, onGrant }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [grantOpen, setGrantOpen] = useState(false);
  const [businessSearch, setBusinessSearch] = useState('');
  const [businessOptions, setBusinessOptions] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [featureKey, setFeatureKey] = useState(PLAN_FEATURE_TOGGLE_KEYS[0] || '');
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!grantOpen) return;
    const timer = setTimeout(async () => {
      const res = await searchBusinessesForFeatureOverrides({ search: businessSearch, limit: 20 });
      if (res.success) setBusinessOptions(res.businesses || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [businessSearch, grantOpen]);

  const handleGrant = async () => {
    if (!selectedBusinessId || !featureKey) {
      toast.error('Select a business and feature module');
      return;
    }
    setSaving(true);
    try {
      const res = await setBusinessPlanFeatureOverride({
        businessId: selectedBusinessId,
        featureKey,
        enabled,
        reason: reason.trim() || undefined,
      });
      if (res.success) {
        toast.success('Business override saved');
        setGrantOpen(false);
        setReason('');
        onGrant?.();
      } else {
        toast.error(res.error || 'Failed to save override');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Business Module Overrides</h3>
          <p className="text-sm text-muted-foreground">
            Force-enable or force-disable plan modules for a tenant (highest precedence in guards).
          </p>
        </div>
        <Button size="sm" onClick={() => setGrantOpen((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          Grant Override
        </Button>
      </div>

      {grantOpen && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Search business</Label>
                <Input
                  placeholder="Business name or domain"
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Business</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                >
                  <option value="">Select business</option>
                  {businessOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.business_name} ({b.domain})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Plan module</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={featureKey}
                  onChange={(e) => setFeatureKey(e.target.value)}
                >
                  {PLAN_FEATURE_TOGGLE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {FEATURE_LABELS[key] || key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Override value</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm"
                  value={enabled ? 'true' : 'false'}
                  onChange={(e) => setEnabled(e.target.value === 'true')}
                >
                  <option value="true">Force enable</option>
                  <option value="false">Force disable</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                placeholder="Support ticket, pilot tenant, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setGrantOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleGrant} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save override
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search businesses or module keys..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid gap-3">
          {overrides.map((override) => {
            const enabledValue = override.value === true || override.value === 'true' || override.value === '"true"';
            return (
              <Card key={override.id} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <h4 className="font-semibold">{override.businessName}</h4>
                        <Badge className={enabledValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {enabledValue ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        Module: <span className="font-medium">{FEATURE_LABELS[override.featureKey] || override.featureKey}</span>
                      </p>
                      {override.reason && (
                        <p className="text-xs text-muted-foreground">Reason: {override.reason}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {override.grantedBy && <span>By: {override.grantedBy}</span>}
                        {override.grantedAt && <span>Date: {override.grantedAt}</span>}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDelete?.(override.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {overrides.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-muted-foreground">No business overrides found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Feature Flag Analytics — live counts from platform tables.
 */
function FeatureFlagAnalytics({ analytics, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const a = analytics || {};
  const stats = [
    { label: 'Total Flags', value: a.totalFlags ?? 0, detail: `${a.activeFlags ?? 0} active` },
    { label: 'Partial Rollouts', value: a.partialRolloutFlags ?? 0, detail: 'Below 100% rollout' },
    { label: 'Business Overrides', value: a.businessOverrides ?? 0, detail: 'Active tenant overrides' },
    { label: 'Plan Module Keys', value: `${a.planModuleFlagKeys ?? 0}/${a.planModuleKeyTotal ?? 0}`, detail: 'Registered in flag table' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Feature Flag Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Live counts from platform_feature_flags and tenant overrides ({a.totalBusinesses ?? 0} active businesses)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runtime guard precedence</CardTitle>
          <CardDescription>
            How plan modules resolve for each tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p><strong>1. Platform override</strong> — Business Overrides tab (highest precedence)</p>
          <p><strong>2. Owner packaging</strong> — Settings → Billing custom module toggles</p>
          <p><strong>3. Plan tier</strong> — Subscription plan feature matrix</p>
          <p className="text-xs text-gray-400 pt-2">
            Global flags in this panel are for rollout experiments. Plan module keys ({PLAN_FEATURE_TOGGLE_KEYS.length} total) are managed via Business Overrides and sync to platform_feature_flags automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Feature Flag Manager Component
 */
export function FeatureFlagManager() {
  const [activeTab, setActiveTab] = useState('global');
  const [flags, setFlags] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [overrideSearch, setOverrideSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [totalBusinesses, setTotalBusinesses] = useState(0);

  const loadBusinessOverrides = useCallback(async (search = overrideSearch) => {
    try {
      setOverridesLoading(true);
      const result = await listBusinessFeatureOverrides({ search, limit: 100 });
      if (result.success) {
        const transformed = (result.overrides || []).map((row) => ({
          id: row.id,
          businessName: row.business_name,
          featureKey: row.feature_key,
          value: row.value,
          reason: row.reason,
          grantedBy: row.granted_by,
          grantedAt: row.created_at
            ? new Date(row.created_at).toLocaleDateString()
            : null,
          expiresAt: row.expires_at,
        }));
        setOverrides(transformed);
      }
    } catch (error) {
      console.error('Error loading business overrides:', error);
    } finally {
      setOverridesLoading(false);
    }
  }, [overrideSearch]);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const result = await getFeatureFlagAnalytics();
      if (result.success) {
        setAnalytics(result);
        setTotalBusinesses(result.totalBusinesses ?? 0);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadFeatureFlags = useCallback(async () => {
    try {
      setLoading(true);
      const [result, analyticsResult] = await Promise.all([
        listFeatureFlags(),
        getFeatureFlagAnalytics(),
      ]);
      if (analyticsResult.success) {
        setAnalytics(analyticsResult);
        setTotalBusinesses(analyticsResult.totalBusinesses ?? 0);
      }
      if (result.success) {
        const bizTotal = analyticsResult.success ? (analyticsResult.totalBusinesses ?? 0) : 0;
        const transformed = result.flags.map(f => ({
          id: f.id,
          key: f.key,
          name: f.name,
          description: f.description,
          type: f.type,
          defaultValue: parseFlagDefaultValue(f.default_value),
          rolloutPercentage: f.rollout_percentage ?? 100,
          isActive: f.is_active !== false,
          createdAt: f.created_at,
          usageStats: {
            enabled: parseInt(f.override_count, 10) || 0,
            total: bizTotal,
          },
          overrideCount: f.override_count,
          businessOverrides: f.business_overrides,
          userOverrides: f.user_overrides
        }));
        setFlags(transformed);
      } else {
        const msg =
          result.code === 'MIGRATION_REQUIRED'
            ? 'Database migration required for platform feature flags. Run npm run db:migrate.'
            : 'Failed to load feature flags';
        toast.error(msg);
      }
    } catch (error) {
      console.error('Error loading feature flags:', error);
      toast.error('Error loading feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatureFlags();
  }, [loadFeatureFlags]);

  useEffect(() => {
    if (activeTab === 'business') {
      loadBusinessOverrides(overrideSearch);
    }
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, overrideSearch, loadBusinessOverrides, loadAnalytics]);

  const handleCreateFlag = async (payload) => {
    try {
      setCreating(true);
      const result = await createFeatureFlag(payload);
      if (result.success) {
        toast.success('Feature flag created');
        await loadFeatureFlags();
        return true;
      }
      toast.error(result.error || 'Failed to create flag');
      return false;
    } catch (error) {
      console.error('Error creating flag:', error);
      toast.error('Error creating flag');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (flagId) => {
    try {
      setSaving(true);
      const flag = flags.find(f => f.id === flagId);
      const result = await updateFeatureFlag(flagId, {
        is_active: !flag.isActive
      });
      
      if (result.success) {
        setFlags(flags.map(f => 
          f.id === flagId ? { ...f, isActive: !f.isActive } : f
        ));
        toast.success('Feature flag updated');
      } else {
        toast.error(result.error || 'Failed to update flag');
      }
    } catch (error) {
      console.error('Error updating flag:', error);
      toast.error('Error updating flag');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRollout = async (flagId, percentage) => {
    try {
      setSaving(true);
      const result = await updateFeatureFlag(flagId, {
        rollout_percentage: percentage
      });
      
      if (result.success) {
        setFlags(flags.map(f => 
          f.id === flagId ? { ...f, rolloutPercentage: percentage } : f
        ));
        toast.success('Rollout percentage updated');
      } else {
        toast.error(result.error || 'Failed to update rollout');
      }
    } catch (error) {
      console.error('Error updating rollout:', error);
      toast.error('Error updating rollout');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (overrideId) => {
    try {
      const result = await deleteFeatureFlagOverride(overrideId);
      if (result.success) {
        setOverrides(overrides.filter(o => o.id !== overrideId));
        toast.success('Override deleted');
        loadBusinessOverrides(overrideSearch);
      } else {
        toast.error(result.error || 'Failed to delete override');
      }
    } catch (error) {
      console.error('Error deleting override:', error);
      toast.error('Error deleting override');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="w-6 h-6" />
            Feature Flag Management
          </h2>
          <p className="text-muted-foreground">
            Control feature rollout, manage overrides, and monitor adoption
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadFeatureFlags} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-fit">
          {FEATURE_FLAG_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <GlobalFlagsPanel 
            flags={flags}
            totalBusinesses={totalBusinesses}
            onToggle={handleToggle}
            onUpdateRollout={handleUpdateRollout}
            onCreate={handleCreateFlag}
            creating={creating}
          />
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <BusinessOverridesPanel 
            overrides={overrides}
            loading={overridesLoading}
            onDelete={handleDeleteOverride}
            onSearch={setOverrideSearch}
            onGrant={() => loadBusinessOverrides(overrideSearch)}
          />
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">User overrides coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <FeatureFlagAnalytics analytics={analytics} loading={analyticsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FeatureFlagManager;
