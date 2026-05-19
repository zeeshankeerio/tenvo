'use client';

import { useState } from 'react';
import { Check, X, Package, MapPin, Calendar, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMultiLocationSync } from '@/lib/hooks/useMultiLocationSync';
import { OfflineIndicator } from './OfflineIndicator';
import toast from 'react-hot-toast';

/**
 * TransferReceiptConfirmation Component
 * 
 * UI for receiving warehouse to confirm receipt of transferred stock
 * Supports full and partial receipts
 * 
 * Features:
 * - Display transfer details
 * - Received quantity input (allows partial receipt)
 * - Receipt notes
 * - Confirm/Reject actions
 * - Updates both source and destination locations
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {Array} props.pendingTransfers - Array of pending transfer records
 * @param {Function} [props.onReceiptComplete] - Callback after receipt confirmation
 */
export function TransferReceiptConfirmation({
    businessId,
    pendingTransfers = [],
    onReceiptComplete
}) {
    const { 
        confirmReceipt, 
        loading,
        isOnline,
        syncing,
        syncOfflineQueue
    } = useMultiLocationSync(businessId);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [receivedQuantity, setReceivedQuantity] = useState('');
    const [receiptNotes, setReceiptNotes] = useState('');

    const handleSelectTransfer = (transfer) => {
        setSelectedTransfer(transfer);
        setReceivedQuantity(transfer.quantity_requested.toString());
        setReceiptNotes('');
    };

    const handleConfirmReceipt = async () => {
        if (!selectedTransfer) return;

        const qty = parseFloat(receivedQuantity);
        if (!qty || qty <= 0) {
            toast.error('Please enter a valid received quantity');
            return;
        }

        if (qty > selectedTransfer.quantity_requested) {
            toast.error('Received quantity cannot exceed requested quantity');
            return;
        }

        try {
            await confirmReceipt(
                selectedTransfer.id,
                qty,
                null, // receivedBy - can be added from user context
                receiptNotes
            );

            toast.success(
                qty === selectedTransfer.quantity_requested
                    ? 'Transfer completed successfully'
                    : `Partial receipt confirmed: ${qty} of ${selectedTransfer.quantity_requested} units`
            );

            setSelectedTransfer(null);
            setReceivedQuantity('');
            setReceiptNotes('');
            onReceiptComplete?.();
        } catch (error) {
            toast.error(error.message || 'Failed to confirm receipt');
        }
    };

    const handleCancel = () => {
        setSelectedTransfer(null);
        setReceivedQuantity('');
        setReceiptNotes('');
    };

    const isPartialReceipt = selectedTransfer && 
        parseFloat(receivedQuantity) < selectedTransfer.quantity_requested;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Pending Receipts</h3>
                    <p className="text-sm text-gray-600">
                        Confirm receipt of incoming stock transfers
                    </p>
                </div>
                <OfflineIndicator 
                    onSyncRequest={syncOfflineQueue}
                    isSyncing={syncing}
                    compact={true}
                />
            </div>

            {/* Pending Transfers List */}
            {!selectedTransfer ? (
                <div className="space-y-3">
                    {pendingTransfers.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-8 text-gray-500">
                                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                    <p>No pending transfers</p>
                                    <p className="text-sm mt-1">All transfers have been received</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        pendingTransfers.map((transfer) => (
                            <Card key={transfer.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    {transfer.products?.name}
                                                </h4>
                                                <Badge className="bg-yellow-500 text-white">
                                                    Pending
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600 flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        From: {transfer.from_warehouse?.name}
                                                    </p>
                                                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                                                        <MapPin className="w-4 h-4" />
                                                        To: {transfer.to_warehouse?.name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 flex items-center gap-1">
                                                        <Package className="w-4 h-4" />
                                                        Quantity: <span className="font-semibold text-gray-900">
                                                            {transfer.quantity_requested} units
                                                        </span>
                                                    </p>
                                                    <p className="text-gray-600 flex items-center gap-1 mt-1">
                                                        <Calendar className="w-4 h-4" />
                                                        Requested: {new Date(transfer.requested_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {transfer.notes && (
                                                <p className="text-sm text-gray-600 mt-2 italic">
                                                    Note: {transfer.notes}
                                                </p>
                                            )}
                                        </div>

                                        <Button
                                            onClick={() => handleSelectTransfer(transfer)}
                                            className="bg-wine hover:bg-wine/90"
                                        >
                                            Receive
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                /* Receipt Confirmation Form */
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-600" />
                            Confirm Receipt
                        </CardTitle>
                        <CardDescription>
                            Verify and confirm the received quantity
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Transfer Details */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-3">Transfer Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Product</p>
                                    <p className="font-medium text-gray-900">
                                        {selectedTransfer.products?.name}
                                    </p>
                                    {selectedTransfer.products?.sku && (
                                        <p className="text-xs text-gray-500 font-mono">
                                            {selectedTransfer.products.sku}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-600">Requested Quantity</p>
                                    <p className="font-semibold text-gray-900 text-lg">
                                        {selectedTransfer.quantity_requested} units
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600">From Warehouse</p>
                                    <p className="font-medium text-gray-900">
                                        {selectedTransfer.from_warehouse?.name}
                                    </p>
                                    {selectedTransfer.from_warehouse?.location && (
                                        <p className="text-xs text-gray-500">
                                            {selectedTransfer.from_warehouse.location}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-600">To Warehouse</p>
                                    <p className="font-medium text-gray-900">
                                        {selectedTransfer.to_warehouse?.name}
                                    </p>
                                    {selectedTransfer.to_warehouse?.location && (
                                        <p className="text-xs text-gray-500">
                                            {selectedTransfer.to_warehouse.location}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Received Quantity Input */}
                        <div className="space-y-2">
                            <Label>Received Quantity *</Label>
                            <Input
                                type="number"
                                min="1"
                                max={selectedTransfer.quantity_requested}
                                value={receivedQuantity}
                                onChange={(e) => setReceivedQuantity(e.target.value)}
                                placeholder="Enter received quantity"
                                className="text-lg font-semibold"
                                required
                            />
                            <p className="text-xs text-gray-600">
                                Enter the actual quantity received (can be less than requested for partial receipt)
                            </p>
                        </div>

                        {/* Partial Receipt Warning */}
                        {isPartialReceipt && (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800">
                                    <p className="font-semibold">Partial Receipt</p>
                                    <p>
                                        You are receiving {receivedQuantity} of {selectedTransfer.quantity_requested} units.
                                        The remaining {selectedTransfer.quantity_requested - parseFloat(receivedQuantity)} units
                                        will be unreserved at the source location.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Receipt Notes */}
                        <div className="space-y-2">
                            <Label>Receipt Notes (Optional)</Label>
                            <textarea
                                value={receiptNotes}
                                onChange={(e) => setReceiptNotes(e.target.value)}
                                placeholder="Add any notes about the receipt (e.g., condition, discrepancies)..."
                                rows={3}
                                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmReceipt}
                                disabled={
                                    loading ||
                                    !receivedQuantity ||
                                    parseFloat(receivedQuantity) <= 0 ||
                                    parseFloat(receivedQuantity) > selectedTransfer.quantity_requested
                                }
                                className=" bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                {loading ? 'Confirming...' : 'Confirm Receipt'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
