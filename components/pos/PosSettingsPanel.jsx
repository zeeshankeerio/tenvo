'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScanLine, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useBusiness } from '@/lib/context/BusinessContext';
import { posAPI } from '@/lib/api/pos';
import { DEFAULT_POS_SETTINGS } from '@/lib/config/posSettings';
import { resolvePosVariant } from '@/lib/config/posDomains';
import toast from 'react-hot-toast';

/**
 * Tenant POS preferences — stored at business.settings.pos
 */
export function PosSettingsPanel({ category }) {
    const { business, updateBusiness } = useBusiness();
    const businessId = business?.id;
    const variant = resolvePosVariant(category);
    const isRestaurant = variant === 'restaurant';

    const [settings, setSettings] = useState({ ...DEFAULT_POS_SETTINGS });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!businessId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await posAPI.getSettings(businessId);
                if (!cancelled && res?.success && res.settings) {
                    setSettings({ ...DEFAULT_POS_SETTINGS, ...res.settings });
                }
            } catch {
                if (!cancelled) toast.error('Could not load POS settings');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [businessId]);

    const patch = useCallback((key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = async () => {
        if (!businessId) return;
        setSaving(true);
        try {
            const res = await posAPI.updateSettings(businessId, settings);
            if (res?.success) {
                toast.success('POS settings saved');
                const next = { ...DEFAULT_POS_SETTINGS, ...res.settings };
                setSettings(next);
                updateBusiness({
                    settings: {
                        ...(business?.settings || {}),
                        pos: next,
                    },
                });
            } else {
                toast.error(res?.error || 'Save failed');
            }
        } catch {
            toast.error('Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (!businessId) return null;

    return (
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white pb-4 pt-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80">
                        <ScanLine className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                            Point of sale
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-600 font-medium leading-relaxed">
                            Barcode, offline queue, pharmacy, and checkout defaults for your terminals.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading POS settings…
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">
                                Barcode / scan mode
                            </Label>
                            <Select
                                value={settings.barcodeMode}
                                onValueChange={(v) => patch('barcodeMode', v)}
                            >
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto (USB + camera on mobile)</SelectItem>
                                    <SelectItem value="wedge">USB scanner only</SelectItem>
                                    <SelectItem value="camera">Camera preferred</SelectItem>
                                    <SelectItem value="manual">Manual entry only</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Camera scanning uses your device rear camera for QR and 1D barcodes.
                            </p>
                        </div>

                        <ToggleRow
                            label="Auto-print receipt after sale"
                            hint="Opens print dialog when supported after checkout."
                            checked={settings.autoPrintReceipt}
                            onCheckedChange={(v) => patch('autoPrintReceipt', v)}
                        />
                        <ToggleRow
                            label="Block expired products"
                            hint="Prevents selling pharmacy or dated inventory past expiry."
                            checked={settings.blockExpiredProducts}
                            onCheckedChange={(v) => patch('blockExpiredProducts', v)}
                        />
                        <ToggleRow
                            label="Enforce pharmacy batch (FEFO)"
                            hint="Requires batch selection for regulated items before adding to cart."
                            checked={settings.enforcePharmacyBatch}
                            onCheckedChange={(v) => patch('enforcePharmacyBatch', v)}
                        />
                        <ToggleRow
                            label="Enforce wholesale MOQ"
                            hint="Validates minimum order quantity on wholesale domains."
                            checked={settings.enforceWholesaleMoq}
                            onCheckedChange={(v) => patch('enforceWholesaleMoq', v)}
                        />
                        <ToggleRow
                            label="Offline sale queue"
                            hint="Queue sales locally when offline; sync when connection returns."
                            checked={settings.offlineModeEnabled}
                            onCheckedChange={(v) => patch('offlineModeEnabled', v)}
                        />
                        {isRestaurant && (
                            <ToggleRow
                                label="Sync restaurant orders to POS ledger"
                                hint="Posts settled dine-in / takeaway payments to the active POS session."
                                checked={settings.syncRestaurantToPos}
                                onCheckedChange={(v) => patch('syncRestaurantToPos', v)}
                            />
                        )}

                        <Button
                            className="w-full sm:w-auto rounded-xl h-11"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save POS settings
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ToggleRow({ label, hint, checked, onCheckedChange }) {
    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div className="min-w-0">
                <Label className="font-semibold text-slate-900">{label}</Label>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{hint}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}
