'use client';

import { useState } from 'react';
import { Plus, Minus, RotateCcw, Package, AlertTriangle, Check, X, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStockAdjustment } from '@/lib/hooks/useStockAdjustment';
import toast from 'react-hot-toast';

/**
 * StockAdjustmentManager Component
 * Consolidated stock adjustment management with approval workflow
 * Replaces: StockAdjustment.jsx, StockAdjustmentForm.jsx
 * 
 * Features:
 * - Manual stock corrections with reason codes
 * - Approval workflow for high-value adjustments
 * - Multi-level authorization
 * - Enhanced audit trail with IP tracking
 * - Location-specific adjustments
 * - Pending approvals queue
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {Array} props.products - Array of products
 * @param {Array} props.warehouses - Array of warehouses/locations
 * @param {number} [props.approvalThreshold] - Threshold amount requiring approval
 * @param {string} [props.currency] - Currency code
 * @param {Function} [props.onAdjustmentComplete] - Callback after adjustment
 */
export function StockAdjustmentManager({
    businessId,
    products = [],
    warehouses = [],
    approvalThreshold = 10000,
    currency = 'PKR',
    onAdjustmentComplete
}) {
    const {
        adjustments,
        pendingApprovals,
        loading,
        stats,
        createAdjustment,
        approveAdjustment,
        rejectAdjustment,
        refreshAdjustments
    } = useStockAdjustment(businessId);

    const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
    const [showApprovalsDialog, setShowApprovalsDialog] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [approvalComment, setApprovalComment] = useState('');

    // Adjustment form state
    const [formData, setFormData] = useState({
        product_id: '',
        warehouse_id: '',
        adjustment_type: 'decrease',
        quantity_change: '',
        reason_code: 'counting_error',
        reason_notes: ''
    });

    const adjustmentReasons = [
        { value: 'counting_error', label: 'Counting Error', icon: '🔢' },
        { value: 'damage', label: 'Damage / Spoilage', icon: '💔' },
        { value: 'theft', label: 'Theft / Loss', icon: '[ALERT]' },
        { value: 'expiry', label: 'Expired Stock', icon: '⏰' },
        { value: 'sample', label: 'Sample / Testing', icon: '[TEST]' },
        { value: 'write_off', label: 'Write-Off', icon: '📝' },
        { value: 'found', label: 'Found Stock', icon: '[SEARCH]' },
        { value: 'opening', label: 'Opening Balance', icon: '[CHART]' },
        { value: 'other', label: 'Other', icon: '[CLIPBOARD]' }
    ];

    const handleCreateAdjustment = async () => {
        if (!formData.product_id || !formData.quantity_change) {
            toast.error('Please fill in all required fields');
            return;
        }

        const product = products.find(p => p.id === formData.product_id);
        if (!product) {
            toast.error('Product not found');
            return;
        }

        const quantityChange = parseFloat(formData.quantity_change);
        const adjustmentValue = Math.abs(quantityChange) * (product.cost_price || 0);
        const requiresApproval = adjustmentValue > approvalThreshold;

        try {
            await createAdjustment({
                product_id: formData.product_id,
                warehouse_id: formData.warehouse_id || null,
                quantity_change: formData.adjustment_type === 'increase' ? quantityChange : -quantityChange,
                reason_code: formData.reason_code,
                reason_notes: formData.reason_notes,
                requires_approval: requiresApproval
            });

            if (requiresApproval) {
                toast.success('Adjustment submitted for approval');
            } else {
                toast.success('Stock adjusted successfully');
            }

            setFormData({
                product_id: '',
                warehouse_id: '',
                adjustment_type: 'decrease',
                quantity_change: '',
                reason_code: 'counting_error',
                reason_notes: ''
            });
            setShowAdjustmentDialog(false);
            onAdjustmentComplete?.();
        } catch (error) {
            toast.error(error.message || 'Failed to create adjustment');
        }
    };

    const handleApprove = async () => {
        if (!selectedApproval) return;

        try {
            await approveAdjustment(selectedApproval.id, approvalComment);
            toast.success('Adjustment approved');
            setSelectedApproval(null);
            setApprovalComment('');
            onAdjustmentComplete?.();
        } catch (error) {
            toast.error(error.message || 'Failed to approve adjustment');
        }
    };

    const handleReject = async () => {
        if (!selectedApproval) return;

        if (!approvalComment.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        try {
            await rejectAdjustment(selectedApproval.id, approvalComment);
            toast.success('Adjustment rejected');
            setSelectedApproval(null);
            setApprovalComment('');
        } catch (error) {
            toast.error(error.message || 'Failed to reject adjustment');
        }
    };

    const getAdjustmentTypeBadge = (quantityChange) => {
        if (quantityChange > 0) {
            return <Badge className="bg-green-500 text-white">Increase</Badge>;
        } else {
            return <Badge className="bg-red-500 text-white">Decrease</Badge>;
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { label: 'Pending Approval', className: 'bg-yellow-500 text-white' },
            approved: { label: 'Approved', className: 'bg-green-500 text-white' },
            rejected: { label: 'Rejected', className: 'bg-red-500 text-white' },
            completed: { label: 'Completed', className: 'bg-blue-500 text-white' }
        };

        const config = statusConfig[status] || statusConfig.completed;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    const safeStats = stats || {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        totalValueAdjusted: 0,
        byReasonCode: {},
        approvalRate: 0,
    };

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const adjustmentValue = selectedProduct && formData.quantity_change
        ? Math.abs(parseFloat(formData.quantity_change)) * (selectedProduct.cost_price || 0)
        : 0;
    const requiresApproval = adjustmentValue > approvalThreshold;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold">Stock Adjustments</h3>
                    <p className="text-sm text-gray-500">Adjust stock quantities with reasons and approvals</p>
                </div>
                <div className="flex gap-2">
                    {pendingApprovals.length > 0 && (
                        <Button
                            onClick={() => setShowApprovalsDialog(true)}
                            variant="outline"
                            className="relative"
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            Pending Approvals
                            <Badge className="ml-2 bg-yellow-500">{pendingApprovals.length}</Badge>
                        </Button>
                    )}
                    <Button onClick={() => setShowAdjustmentDialog(true)} className="bg-wine hover:bg-wine/90">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Adjustment
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{safeStats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{safeStats.approved}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{safeStats.rejected}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{safeStats.pending}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Adjustment History */}
            <Card>
                <CardHeader>
                    <CardTitle>Adjustment History</CardTitle>
                    <CardDescription>Recent stock adjustments and their status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {adjustments.slice(0, 50).map((adjustment) => (
                            <div
                                key={adjustment.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-2 rounded ${adjustment.quantity_change > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {adjustment.quantity_change > 0 ? (
                                            <Plus className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <Minus className="w-5 h-5 text-red-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{adjustment.product_name}</div>
                                        <div className="text-sm text-gray-500">
                                            {adjustment.quantity_change > 0 ? '+' : ''}{adjustment.quantity_change} units
                                            {' * '}
                                            Reason: {adjustment.reason_code}
                                            {adjustment.warehouse_name && ` * ${adjustment.warehouse_name}`}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {new Date(adjustment.created_at).toLocaleString()}
                                            {adjustment.created_by && ` * by ${adjustment.created_by}`}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getAdjustmentTypeBadge(adjustment.quantity_change)}
                                        {getStatusBadge(adjustment.status)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {adjustments.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <RotateCcw className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No adjustments yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* New Adjustment Dialog */}
            <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Stock Adjustment</DialogTitle>
                        <DialogDescription>
                            Record a stock increase or decrease with a specific reason for auditing.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Product *</Label>
                                <select
                                    value={formData.product_id}
                                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} (Stock: {product.stock || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Warehouse</Label>
                                <select
                                    value={formData.warehouse_id}
                                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name} {wh.is_primary ? '(Primary)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Adjustment Type *</Label>
                                <select
                                    value={formData.adjustment_type}
                                    onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    required
                                >
                                    <option value="increase">Increase Stock</option>
                                    <option value="decrease">Decrease Stock</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input
                                    type="number"
                                    value={formData.quantity_change}
                                    onChange={(e) => setFormData({ ...formData, quantity_change: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    required
                                />
                            </div>
                        </div>

                        {selectedProduct && formData.quantity_change && (
                            <div className={`p-3 border rounded-lg ${requiresApproval ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="text-sm">
                                    <div className="font-medium">Current Stock: {selectedProduct.stock || 0}</div>
                                    <div className="text-gray-600">
                                        After Adjustment: {
                                            formData.adjustment_type === 'increase'
                                                ? (selectedProduct.stock || 0) + parseFloat(formData.quantity_change || 0)
                                                : (selectedProduct.stock || 0) - parseFloat(formData.quantity_change || 0)
                                        }
                                    </div>
                                    <div className="text-gray-600">
                                        Adjustment Value: {currency} {adjustmentValue.toFixed(2)}
                                    </div>
                                    {requiresApproval && (
                                        <div className="flex items-center gap-2 mt-2 text-yellow-700">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="font-medium">Requires Approval (exceeds {currency} {approvalThreshold})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Reason *</Label>
                            <select
                                value={formData.reason_code}
                                onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                required
                            >
                                {adjustmentReasons.map(reason => (
                                    <option key={reason.value} value={reason.value}>
                                        {reason.icon} {reason.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <textarea
                                value={formData.reason_notes}
                                onChange={(e) => setFormData({ ...formData, reason_notes: e.target.value })}
                                placeholder="Additional notes about this adjustment"
                                rows={3}
                                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateAdjustment}
                                disabled={!formData.product_id || !formData.quantity_change || !formData.reason_code || loading}
                                className={formData.adjustment_type === 'increase' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                {formData.adjustment_type === 'increase' ? (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        {requiresApproval ? 'Submit for Approval' : 'Increase Stock'}
                                    </>
                                ) : (
                                    <>
                                        <Minus className="w-4 h-4 mr-2" />
                                        {requiresApproval ? 'Submit for Approval' : 'Decrease Stock'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pending Approvals Dialog */}
            <Dialog open={showApprovalsDialog} onOpenChange={setShowApprovalsDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Pending Approvals</DialogTitle>
                        <DialogDescription>
                            Review and approve or reject stock adjustments
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {pendingApprovals.map((approval) => (
                            <Card key={approval.id} className="border-yellow-200">
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-lg">{approval.product_name}</h4>
                                                <p className="text-sm text-gray-600">
                                                    {approval.quantity_change > 0 ? 'Increase' : 'Decrease'} by {Math.abs(approval.quantity_change)} units
                                                </p>
                                            </div>
                                            {getAdjustmentTypeBadge(approval.quantity_change)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600">Requested By</p>
                                                <p className="font-medium">{approval.created_by || 'Unknown'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Date</p>
                                                <p className="font-medium">{new Date(approval.created_at).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Reason</p>
                                                <p className="font-medium">{approval.reason_code}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600">Value</p>
                                                <p className="font-medium">{currency} {approval.adjustment_value?.toFixed(2) || '0.00'}</p>
                                            </div>
                                        </div>

                                        {approval.reason_notes && (
                                            <div>
                                                <p className="text-sm text-gray-600">Notes</p>
                                                <p className="text-sm">{approval.reason_notes}</p>
                                            </div>
                                        )}

                                        {selectedApproval?.id === approval.id ? (
                                            <div className="space-y-3 pt-3 border-t">
                                                <div>
                                                    <Label>Comment</Label>
                                                    <textarea
                                                        value={approvalComment}
                                                        onChange={(e) => setApprovalComment(e.target.value)}
                                                        placeholder="Add a comment (required for rejection)"
                                                        rows={2}
                                                        className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedApproval(null);
                                                            setApprovalComment('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={handleReject}
                                                        disabled={loading}
                                                    >
                                                        <X className="w-4 h-4 mr-2" />
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        onClick={handleApprove}
                                                        disabled={loading}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <Check className="w-4 h-4 mr-2" />
                                                        Approve
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end pt-3 border-t">
                                                <Button
                                                    onClick={() => setSelectedApproval(approval)}
                                                    variant="outline"
                                                >
                                                    Review
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {pendingApprovals.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Check className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                <p>No pending approvals</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
