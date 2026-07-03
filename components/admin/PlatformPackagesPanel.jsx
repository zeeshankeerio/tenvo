'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Search, Loader2, Check, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  applyDomainPackageToBusiness,
  listDomainPackagesForAdminAction,
} from '@/lib/actions/admin/platform';
import { searchBusinessesForFeatureOverrides } from '@/lib/actions/admin/features';
import { PLAN_TIERS } from '@/lib/config/plans';
import toast from 'react-hot-toast';

export function PlatformPackagesPanel() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [businessOptions, setBusinessOptions] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [updatePlanTier, setUpdatePlanTier] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDomainPackagesForAdminAction();
      if (res.success) {
        setPackages(res.packages || []);
        setSelectedPackage((prev) => prev || res.packages?.[0]?.key || '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (!assignOpen) return;
    const timer = setTimeout(async () => {
      const res = await searchBusinessesForFeatureOverrides({ search: businessSearch, limit: 20 });
      if (res.success) setBusinessOptions(res.businesses || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [businessSearch, assignOpen]);

  const handleApply = async () => {
    if (!selectedBusinessId || !selectedPackage) {
      toast.error('Select a business and domain package');
      return;
    }
    setSaving(true);
    try {
      const res = await applyDomainPackageToBusiness(selectedBusinessId, selectedPackage, {
        updatePlanTier,
      });
      if (res.success) {
        toast.success(`Applied ${selectedPackage} to business`);
        setAssignOpen(false);
        setSelectedBusinessId('');
      } else {
        toast.error(res.error || 'Failed to apply package');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Domain Commercial Packages
          </h3>
          <p className="text-sm text-muted-foreground">
            Vertical SKUs with preset packaging, limits, and recommended plan tiers. Apply from here or via
            Businesses → Details → manual billing.
          </p>
        </div>
        <Button size="sm" onClick={() => setAssignOpen((v) => !v)}>
          <Package className="w-4 h-4 mr-2" />
          Assign to business
        </Button>
      </div>

      {assignOpen && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Domain package</Label>
                <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.key} value={pkg.key}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Search business</Label>
                <Input
                  placeholder="Business name or domain"
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Business</Label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.business_name} ({b.domain}) — {b.plan_tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={updatePlanTier} onCheckedChange={setUpdatePlanTier} id="update-plan" />
              <Label htmlFor="update-plan" className="text-sm">
                Update plan tier and quotas to package defaults
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleApply} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Apply package
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg) => (
          <Card key={pkg.key} className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">{pkg.name}</CardTitle>
              <CardDescription className="text-xs font-mono">{pkg.key}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Recommended plan</span>
                <span className="font-semibold">
                  {PLAN_TIERS[pkg.recommendedPlanTier]?.name || pkg.recommendedPlanTier}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Price (PKR / USD)</span>
                <span className="font-semibold tabular-nums">
                  {pkg.pricePkr?.toLocaleString()} / ${pkg.priceUsd}
                </span>
              </div>
              <p className="text-xs text-gray-500 pt-2">
                Applies custom module packaging and stores <code className="text-[10px]">settings.domain_package</code>.
                Per-tenant toggles remain editable under Businesses → Details → Module packaging.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default PlatformPackagesPanel;
