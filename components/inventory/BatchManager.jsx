'use client';

import { useState, useEffect } from 'react';
import { Calendar, Package, AlertTriangle, Plus, X, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { batchAPI } from '@/lib/api/batch';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

/**
 * Batch Entry and Management Component
 * For pharmacy, food, FMCG, chemical domains
 * @param {Object} props
 * @param {any} props.product
 * @param {string} props.businessId
 * @param {string} [props.warehouseId]
 * @param {any[]} [props.warehouses]
 * @param {function} [props.onBatchCreated]
 * @param {function} [props.onClose]
 */
export function BatchManager({
    product,
    businessId,
    warehouseId,
    warehouses = [],
    onBatchCreated,
    onClose
}) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expiringBatches, setExpiringBatches] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        batchNumber: '',
        manufacturingDate: '',
        expiryDate: '',
        quantity: '',
        costPrice: '',
        mrp: '',
        notes: '',
        warehouseId: ''
    });

    // Load batches on mount
    useEffect(() => {
        if (product?.id) {
            loadBatches();
            loadExpiringBatches();
        }
    }, [product?.id]);

    const loadBatches = async () => {
        try {
            setLoading(true);
            const data = await batchAPI.getByProduct(product.id, businessId);
            setBatches(data || []);
        } catch (error) {
            console.error('Load batches error:', error);
            toast.error('Failed to load batches');
        } finally {
            setLoading(false);
        }
    };

    const loadExpiringBatches = async () => {
        try {
            const data = await batchAPI.getExpiring(businessId, 30);
            const productExpiring = data?.filter(b => b.product_id === product.id) || [];
            setExpiringBatches(productExpiring);
        } catch (error) {
            console.error('Load expiring batches error:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // [SHIELD] DEFENSIVE CHECK
        if (!product || !product.id) {
            console.error('BatchManager: Product context is missing during submit', { product });
            toast.error('Product context missing. Please close and try again.');
            return;
        }

        if (!businessId) {
            toast.error('Business context missing');
            return;
        }

        // Validation
        if (!formData.batchNumber || !formData.quantity) {
            toast.error('Batch number and quantity are required');
            return;
        }

        if (formData.expiryDate && formData.manufacturingDate) {
            if (new Date(formData.expiryDate) <= new Date(formData.manufacturingDate)) {
                toast.error('Expiry date must be after manufacturing date');
                return;
            }
        }

        try {
            setLoading(true);

            await batchAPI.create({
                business_id: businessId,
                product_id: product.id,
                warehouse_id: formData.warehouseId || warehouseId || null,
                batch_number: formData.batchNumber,
                manufacturing_date: formData.manufacturingDate || null,
                expiry_date: formData.expiry_date || formData.expiryDate || null,
                quantity: parseFloat(formData.quantity) || 0,
                cost_price: parseFloat(formData.costPrice) || parseFloat(product?.cost_price) || 0,
                mrp: parseFloat(formData.mrp) || parseFloat(product?.mrp) || 0,
                notes: formData.notes
            });

            toast.success('Batch created successfully');

            // Reset form
            setFormData({
                batchNumber: '',
                manufacturingDate: '',
                expiryDate: '',
                quantity: '',
                costPrice: '',
                mrp: '',
                notes: '',
                warehouseId: ''
            });

            setShowAddForm(false);
            loadBatches();
            onBatchCreated?.();

        } catch (error) {
            console.error('Create batch error:', error);
            toast.error(error.message || 'Failed to create batch');
        } finally {
            setLoading(false);
        }
    };

    const getDaysUntilExpiry = (expiryDate) => {
        if (!expiryDate) return null;
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getExpiryBadge = (expiryDate) => {
        const days = getDaysUntilExpiry(expiryDate);
        if (days === null) return null;

        if (days < 0) {
            return <Badge variant="destructive">Expired</Badge>;
        } else if (days <= 30) {
            return <Badge variant="destructive">Expires in {days} days</Badge>;
        } else if (days <= 90) {
            return <Badge variant="warning" className="bg-orange-500">Expires in {days} days</Badge>;
        } else {
            return <Badge variant="secondary">{days} days remaining</Badge>;
        }
    };

    const totalStock = batches.reduce((sum, b) => sum + (b.available_quantity || 0), 0);
    const totalValue = batches.reduce((sum, b) => sum + ((b.available_quantity || 0) * (b.cost_price || 0)), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Batch Management</h3>
                    <p className="text-sm text-gray-600">{product?.name || 'No product selected'}</p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-wine hover:bg-wine/90"
                    disabled={!product?.id}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Batch
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-900">{batches.length}</div>
                        <p className="text-sm text-gray-600">Total Batches</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-900">{totalStock.toFixed(2)}</div>
                        <p className="text-sm text-gray-600">Available Stock</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue, 'PKR')}</div>
                        <p className="text-sm text-gray-600">Total Value</p>
                    </CardContent>
                </Card>
            </div>

            {/* Expiring Batches Alert */}
            {expiringBatches.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <CardTitle className="text-orange-900">Expiring Soon</CardTitle>
                        </div>
                        <CardDescription className="text-orange-700">
                            {expiringBatches.length} batch(es) expiring within 30 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {expiringBatches.map(batch => (
                                <div key={batch.batch_id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">{batch.batch_number}</p>
                                        <p className="text-sm text-gray-600">Qty: {batch.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-orange-600">
                                            {batch.days_until_expiry} days left
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(batch.expiry_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Batches List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Batches</CardTitle>
                    <CardDescription>Sorted by expiry date (FEFO)</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && batches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Loading batches...</div>
                    ) : !product?.id ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-orange-400" />
                            <p>Product context missing</p>
                            <p className="text-sm">Please select a product from the Inventory tab.</p>
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No batches found</p>
                            <p className="text-sm">Click "Add Batch" to create your first batch</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {batches.map(batch => (
                                <div
                                    key={batch.id}
                                    className={`border rounded-lg p-4 ${batch.is_expired ? 'bg-red-50 border-red-200' : 'bg-white'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-gray-900">{batch.batch_number}</h4>
                                                {getExpiryBadge(batch.expiry_date)}
                                                {!batch.is_active && <Badge variant="secondary">Inactive</Badge>}
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Quantity</p>
                                                    <p className="font-medium text-gray-900">
                                                        {batch.available_quantity} / {batch.quantity}
                                                    </p>
                                                    {batch.reserved_quantity > 0 && (
                                                        <p className="text-xs text-orange-600">
                                                            {batch.reserved_quantity} reserved
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="text-gray-600">Cost Price</p>
                                                    <p className="font-medium text-gray-900">
                                                        {formatCurrency(batch.cost_price || 0, 'PKR')}
                                                    </p>
                                                </div>

                                                {batch.manufacturing_date && (
                                                    <div>
                                                        <p className="text-gray-600">Mfg Date</p>
                                                        <p className="font-medium text-gray-900">
                                                            {new Date(batch.manufacturing_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}

                                                {batch.expiry_date && (
                                                    <div>
                                                        <p className="text-gray-600">Expiry Date</p>
                                                        <p className="font-medium text-gray-900">
                                                            {new Date(batch.expiry_date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {batch.notes && (
                                                <p className="text-sm text-gray-600 mt-2">{batch.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Batch Dialog */}
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Batch</DialogTitle>
                        <DialogDescription>
                            Register a new production or purchase batch with its own expiry date and cost.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="batchNumber">Batch Number *</Label>
                                <Input
                                    id="batchNumber"
                                    value={formData.batchNumber}
                                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                                    placeholder="BATCH-2024-001"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="quantity">Quantity *</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.01"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="100"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
                                <Input
                                    id="manufacturingDate"
                                    type="date"
                                    value={formData.manufacturingDate}
                                    onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="expiryDate">Expiry Date</Label>
                                <Input
                                    id="expiryDate"
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="costPrice">Cost Price</Label>
                                <Input
                                    id="costPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.costPrice}
                                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    placeholder={product?.cost_price || '0.00'}
                                />
                            </div>

                            <div>
                                <Label htmlFor="mrp">MRP</Label>
                                <Input
                                    id="mrp"
                                    type="number"
                                    step="0.01"
                                    value={formData.mrp}
                                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                                    placeholder={product?.mrp || '0.00'}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional information..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddForm(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className=" bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Save className="w-4 h-4 mr-2" />
                                {loading ? 'Creating...' : 'Create Batch'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
