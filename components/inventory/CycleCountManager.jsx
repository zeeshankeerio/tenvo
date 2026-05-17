'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Plus, CheckCircle2, AlertCircle, BarChart3, Download, Eye,
    X, Save, Loader2, ChevronRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency';

/**
 * Cycle Count Manager
 * Creates and tracks inventory cycle counts for stock reconciliation
 * Features:
 * - Template-based cycle count creation (A/B/C category, by warehouse, by location)
 * - Line-by-line count entry
 * - Variance analysis and auto-reconciliation
 * - Audit trail and compliance reporting
 */
export function CycleCountManager({
    businessId,
    products = [],
    warehouses = [],
    onCountComplete,
    currency = 'PKR'
}) {
    const [counts, setCounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDetailView, setShowDetailView] = useState(false);
    const [selectedCount, setSelectedCount] = useState(null);
    const [filter, setFilter] = useState('all');

    const [createForm, setCreateForm] = useState({
        name: '',
        category: 'manual', // manual | abc-a | abc-b | abc-c | warehouse | location
        warehouse_id: '',
        location_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
    });

    // Load cycle counts from API
    const loadCycleCounts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/inventory/cycle-counts?business_id=${businessId}`);
            if (!res.ok) throw new Error('Failed to load cycle counts');
            const data = await res.json();
            setCounts(data.cycleCounts || []);
        } catch (error) {
            toast.error('Could not load cycle counts: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        if (businessId) {
            loadCycleCounts();
        }
    }, [businessId, loadCycleCounts]);

    // Filter and sort counts
    const filteredCounts = useMemo(() => {
        return counts
            .filter(c => {
                if (filter === 'active') return c.status === 'in-progress';
                if (filter === 'completed') return c.status === 'completed';
                if (filter === 'variance') return c.variance_count > 0;
                return true;
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [counts, filter]);

    const handleCreateCycleCount = async () => {
        if (!createForm.name.trim()) {
            toast.error('Please enter a cycle count name');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch('/api/v1/inventory/cycle-counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_id: businessId,
                    ...createForm,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create cycle count');
            }

            const newCount = await res.json();
            setCounts([newCount, ...counts]);
            setCreateForm({
                name: '',
                category: 'manual',
                warehouse_id: '',
                location_id: '',
                scheduled_date: new Date().toISOString().split('T')[0],
            });
            setShowCreateDialog(false);
            toast.success('Cycle count created. Start entering counts.');
        } catch (error) {
            toast.error('Error creating cycle count: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCycleCount = async (cycleCount) => {
        try {
            const res = await fetch(`/api/v1/inventory/cycle-counts/${cycleCount.id}`);
            if (!res.ok) {
                setSelectedCount(cycleCount);
                setShowDetailView(true);
                return;
            }

            const detail = await res.json();
            setSelectedCount(detail);
            setShowDetailView(true);
        } catch (error) {
            setSelectedCount(cycleCount);
            setShowDetailView(true);
        }
    };

    const handleDownloadTemplate = (cycle) => {
        // Generate CSV template for manual data entry
        const headers = ['SKU', 'Product Name', 'System Quantity', 'Counted Quantity', 'Variance', 'Notes'];
        const rows = cycle.items?.map(item => [
            item.sku,
            item.product_name,
            item.system_quantity,
            '',
            '',
            ''
        ]) || [];

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cycle-count-${cycle.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getStatusBadge = (status, varianceCount) => {
        if (varianceCount > 0) {
            return <Badge variant="destructive">Variance: {varianceCount}</Badge>;
        }
        if (status === 'completed') {
            return <Badge className="bg-emerald-600">Completed</Badge>;
        }
        if (status === 'in-progress') {
            return <Badge className="bg-blue-600">In Progress</Badge>;
        }
        return <Badge className="bg-gray-400">Pending</Badge>;
    };

    return (
        <div className="space-y-4">
            {/* Header & Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold">Cycle Counts</h3>
                    <p className="text-xs text-gray-500 mt-1">Reconcile inventory with physical counts</p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                    <Plus className="w-4 h-4" />
                    New Count
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto">
                {['all', 'active', 'completed', 'variance'].map(f => (
                    <Button
                        key={f}
                        variant={filter === f ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(f)}
                        className="whitespace-nowrap"
                    >
                        {f === 'all' && 'All'}
                        {f === 'active' && 'In Progress'}
                        {f === 'completed' && 'Completed'}
                        {f === 'variance' && 'Variance'}
                    </Button>
                ))}
            </div>

            {/* Cycle Counts List */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            ) : filteredCounts.length > 0 ? (
                <div className="space-y-2">
                    {filteredCounts.map(count => (
                        <Card key={count.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="font-semibold">{count.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Created {new Date(count.created_at).toLocaleDateString()} * 
                                            {count.item_count || 0} items
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            {getStatusBadge(count.status, count.variance_count || 0)}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenCycleCount(count)}
                                            className="gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No cycle counts yet. Create one to begin.</p>
                    </CardContent>
                </Card>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Cycle Count</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold uppercase text-gray-500">Count Name</Label>
                            <Input
                                placeholder="e.g., Monthly Reconciliation"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-bold uppercase text-gray-500">Category</Label>
                            <select
                                value={createForm.category}
                                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-sm"
                            >
                                <option value="manual">Full Manual Count</option>
                                <option value="abc-a">ABC Category A (High-Value)</option>
                                <option value="abc-b">ABC Category B (Medium-Value)</option>
                                <option value="abc-c">ABC Category C (Low-Value)</option>
                                <option value="warehouse">By Warehouse</option>
                                <option value="location">By Location</option>
                            </select>
                        </div>

                        {createForm.category === 'warehouse' && (
                            <div>
                                <Label className="text-xs font-bold uppercase text-gray-500">Warehouse</Label>
                                <select
                                    value={createForm.warehouse_id}
                                    onChange={(e) => setCreateForm({ ...createForm, warehouse_id: e.target.value })}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                >
                                    <option value="">Select warehouse...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs font-bold uppercase text-gray-500">Scheduled Date</Label>
                            <Input
                                type="date"
                                value={createForm.scheduled_date}
                                onChange={(e) => setCreateForm({ ...createForm, scheduled_date: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateDialog(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateCycleCount}
                                disabled={loading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Detail View */}
            {selectedCount && showDetailView && (
                <CycleCountDetailView
                    count={selectedCount}
                    products={products}
                    onClose={() => setShowDetailView(false)}
                    onCountDownload={() => handleDownloadTemplate(selectedCount)}
                    currency={currency}
                />
            )}
        </div>
    );
}

/**
 * Cycle Count Detail View
 * Shows items, variance analysis, and entry interface
 */
function CycleCountDetailView({ count, products, onClose, onCountDownload, currency }) {
    const [items, setItems] = useState(count.items || []);
    const [saving, setSaving] = useState(false);

    const variance = useMemo(() => {
        let count_variance = 0;
        let value_variance = 0;

        items.forEach(item => {
            const diff = (item.counted_quantity || 0) - (item.system_quantity || 0);
            if (diff !== 0) {
                count_variance++;
                value_variance += diff * (item.unit_price || 0);
            }
        });

        return { count_variance, value_variance };
    }, [items]);

    const handleUpdateItemCount = (index, countedQty) => {
        const newItems = [...items];
        newItems[index].counted_quantity = parseInt(countedQty) || 0;
        setItems(newItems);
    };

    const handleCompleteCycleCount = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/v1/inventory/cycle-counts/${count.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    status: 'completed',
                }),
            });

            if (!res.ok) throw new Error('Failed to save cycle count');
            toast.success('Cycle count completed and variance recorded');
            onClose();
        } catch (error) {
            toast.error('Error saving cycle count: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle>{count.name}</DialogTitle>
                            <p className="text-xs text-gray-500 mt-1">Status: {count.status}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Variance Summary */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600">Items Counted</p>
                                    <p className="text-2xl font-bold">{items.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Items w/ Variance</p>
                                    <p className="text-2xl font-bold text-orange-600">{variance.count_variance}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Value Variance</p>
                                    <p className="text-2xl font-bold text-red-600">{formatCurrency(variance.value_variance, currency)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
                            <span className="font-semibold text-sm">Items</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCountDownload}
                                className="gap-1"
                            >
                                <Download className="w-3 h-3" />
                                Template
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="px-4 py-2 text-left font-semibold">SKU</th>
                                        <th className="px-4 py-2 text-left font-semibold">Product</th>
                                        <th className="px-4 py-2 text-right font-semibold">System Qty</th>
                                        <th className="px-4 py-2 text-right font-semibold">Counted Qty</th>
                                        <th className="px-4 py-2 text-right font-semibold">Variance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const variance_qty = (item.counted_quantity || 0) - (item.system_quantity || 0);
                                        return (
                                            <tr key={idx} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                                                <td className="px-4 py-2">{item.product_name}</td>
                                                <td className="px-4 py-2 text-right">{item.system_quantity}</td>
                                                <td className="px-4 py-2 text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.counted_quantity || ''}
                                                        onChange={(e) => handleUpdateItemCount(idx, e.target.value)}
                                                        className="w-20 h-8 text-right"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className={`px-4 py-2 text-right font-semibold ${
                                                    variance_qty > 0 ? 'text-red-600' : variance_qty < 0 ? 'text-orange-600' : ''
                                                }`}>
                                                    {variance_qty > 0 ? '+' : ''}{variance_qty}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Close
                        </Button>
                        <Button
                            onClick={handleCompleteCycleCount}
                            disabled={saving}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Complete Count
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
