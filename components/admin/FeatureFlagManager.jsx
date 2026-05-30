'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ToggleLeft, 
  Percent, 
  Building2, 
  User, 
  Search,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Flag,
  Activity,
  Zap,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { 
  listFeatureFlags, 
  createFeatureFlag, 
  updateFeatureFlag, 
  deleteFeatureFlag,
  createFeatureFlagOverride,
  deleteFeatureFlagOverride
} from '@/lib/actions/admin/features';

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

// Mock feature flags data
const MOCK_FEATURE_FLAGS = [
  {
    id: '1',
    key: 'new_dashboard_ui',
    name: 'New Dashboard UI',
    description: 'Modern redesign of the business dashboard',
    type: 'boolean',
    defaultValue: true,
    rolloutPercentage: 100,
    createdAt: '2024-01-15',
    usageStats: { enabled: 1250, total: 1250 }
  },
  {
    id: '2',
    key: 'beta_ai_features',
    name: 'Beta AI Features',
    description: 'Experimental AI analytics and forecasting',
    type: 'percentage',
    defaultValue: false,
    rolloutPercentage: 25,
    createdAt: '2024-02-01',
    usageStats: { enabled: 312, total: 1250 }
  },
  {
    id: '3',
    key: 'advanced_inventory',
    name: 'Advanced Inventory',
    description: 'Batch tracking and serial number management',
    type: 'plan_based',
    defaultValue: false,
    minPlan: 'professional',
    usageStats: { enabled: 420, total: 1250 }
  },
  {
    id: '4',
    key: 'whatsapp_integration',
    name: 'WhatsApp Business',
    description: 'Send orders and notifications via WhatsApp',
    type: 'business_list',
    defaultValue: false,
    allowedBusinesses: ['biz_001', 'biz_002'],
    usageStats: { enabled: 2, total: 1250 }
  },
];

const MOCK_BUSINESS_OVERRIDES = [
  {
    id: '1',
    featureKey: 'beta_ai_features',
    businessId: 'biz_123',
    businessName: 'Tech Solutions Ltd',
    value: true,
    expiresAt: '2024-12-31',
    reason: 'Enterprise deal - early access',
    grantedBy: 'admin@tenvo.pk',
    grantedAt: '2024-03-15'
  },
  {
    id: '2',
    featureKey: 'advanced_inventory',
    businessId: 'biz_456',
    businessName: 'Mega Mart',
    value: true,
    expiresAt: null,
    reason: 'Custom package agreement',
    grantedBy: 'admin@tenvo.pk',
    grantedAt: '2024-02-20'
  },
];

/**
 * Global Flags Panel
 */
function GlobalFlagsPanel({ flags, onToggle, onUpdateRollout }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Global Feature Flags</h3>
          <p className="text-sm text-muted-foreground">
            Control features across the entire platform
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Flag
        </Button>
      </div>

      <div className="grid gap-4">
        {flags.map((flag) => (
          <Card key={flag.id} className={cn(
            "transition-all",
            flag.defaultValue ? "border-green-200 bg-green-50/30" : "border-gray-200"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{flag.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {flag.key}
                    </Badge>
                    <Badge 
                      variant={flag.defaultValue ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {flag.defaultValue ? 'Enabled' : 'Disabled'}
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
                      {flag.usageStats?.enabled || 0}/{flag.usageStats?.total || 0} businesses
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <Switch
                    checked={flag.isActive || flag.defaultValue}
                    onCheckedChange={() => onToggle?.(flag.id)}
                    disabled={!flag.isActive}
                  />
                  
                  {flag.type === 'percentage' && (
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
      </div>
    </div>
  );
}

/**
 * Business Overrides Panel
 */
function BusinessOverridesPanel({ overrides, onDelete, onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Business Feature Overrides</h3>
          <p className="text-sm text-muted-foreground">
            Grant specific features to individual businesses
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Grant Override
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search businesses..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="pl-10"
        />
      </div>

      <div className="grid gap-3">
        {overrides.map((override) => (
          <Card key={override.id} className="border-amber-200 bg-amber-50/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <h4 className="font-semibold">{override.businessName}</h4>
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Granted
                    </Badge>
                  </div>
                  <p className="text-sm">
                    Feature: <span className="font-medium">{override.featureKey}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reason: {override.reason}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Granted by: {override.grantedBy}</span>
                    <span>Date: {override.grantedAt}</span>
                    {override.expiresAt && (
                      <span className="text-amber-600">
                        Expires: {override.expiresAt}
                      </span>
                    )}
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
        ))}

        {overrides.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-muted-foreground">No business overrides found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Feature Flag Analytics
 */
function FeatureFlagAnalytics() {
  const stats = [
    { label: 'Total Flags', value: 24, change: '+3 this month' },
    { label: 'Active Rollouts', value: 8, change: '2 at 100%' },
    { label: 'Business Overrides', value: 45, change: '+12 this week' },
    { label: 'User Overrides', value: 12, change: '+3 today' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Feature Flag Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Monitor feature adoption and usage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-green-600 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Adoption</CardTitle>
          <CardDescription>
            Percentage of businesses using each feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'AI Analytics', adoption: 78, target: 80 },
              { name: 'Multi-Warehouse', adoption: 45, target: 60 },
              { name: 'POS System', adoption: 92, target: 85 },
              { name: 'WhatsApp Integration', adoption: 15, target: 30 },
            ].map((feature) => (
              <div key={feature.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{feature.name}</span>
                  <span className={feature.adoption >= feature.target ? 'text-green-600' : 'text-amber-600'}>
                    {feature.adoption}% {feature.adoption >= feature.target ? '✓' : '↑'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      feature.adoption >= feature.target ? "bg-green-500" : "bg-amber-500"
                    )}
                    style={{ width: `${feature.adoption}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: {feature.target}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Requested Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: 'Advanced Reporting', requests: 234, priority: 'high' },
                { name: 'Mobile App', requests: 189, priority: 'high' },
                { name: 'Multi-Currency', requests: 156, priority: 'medium' },
                { name: 'API Webhooks', requests: 134, priority: 'medium' },
              ].map((feature, idx) => (
                <div key={feature.name} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{idx + 1}</span>
                    <span className="font-medium">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={feature.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {feature.priority}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {feature.requests} requests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">Features Driving Upgrades</p>
                  <p className="text-sm text-green-600">AI Analytics, Multi-Warehouse</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-700">₨420K</p>
                  <p className="text-xs text-green-600">monthly revenue</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Conversion Rates</p>
                {[
                  { feature: 'AI Analytics', trial: 45, paid: 32 },
                  { feature: 'Multi-Warehouse', trial: 38, paid: 28 },
                  { feature: 'POS System', trial: 52, paid: 41 },
                ].map((item) => (
                  <div key={item.feature} className="flex items-center justify-between text-sm">
                    <span>{item.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.trial}% trial</span>
                      <Zap className="w-3 h-3 text-green-500" />
                      <span className="font-medium text-green-600">{item.paid}% paid</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load feature flags on mount
  useEffect(() => {
    loadFeatureFlags();
  }, []);

  const loadFeatureFlags = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listFeatureFlags();
      if (result.success) {
        // Transform to match component expectations
        const transformed = result.flags.map(f => ({
          id: f.id,
          key: f.key,
          name: f.name,
          description: f.description,
          type: f.type,
          defaultValue: f.default_value,
          rolloutPercentage: f.rollout_percentage,
          isActive: f.is_active,
          createdAt: f.created_at,
          usageStats: {
            enabled: f.override_count || 0,
            total: 1250 // Total businesses - should be dynamic
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

  const handleToggle = async (flagId) => {
    try {
      setSaving(true);
      const flag = flags.find(f => f.id === flagId);
      const result = await updateFeatureFlag(flagId, {
        is_active: !flag.isActive
      });
      
      if (result.success) {
        setFlags(flags.map(f => 
          f.id === flagId ? { ...f, isActive: !f.isActive, defaultValue: !f.defaultValue } : f
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
            onToggle={handleToggle}
            onUpdateRollout={handleUpdateRollout}
          />
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <BusinessOverridesPanel 
            overrides={overrides}
            onDelete={handleDeleteOverride}
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
          <FeatureFlagAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FeatureFlagManager;
