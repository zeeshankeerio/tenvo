'use client';

import { useState } from 'react';
import { ArrowRight, Package, MapPin, AlertCircle, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMultiLocationSync } from '@/lib/hooks/useMultiLocationSync';
import { OfflineIndicator } from './OfflineIndicator';
import toast from 'react-hot-toast';

/**
 * StockTransferForm Component
 * 
 * Handles stock transfers between warehouses/locations
 * Features:
 * - Source and destination warehouse selection
 * - Available stock validation
 * - Transfer quantity input
 * - Reservation at source on transfer initiation
 * - Notification to receiving location
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {Array} props.products - Array of products
 * @param {Array} props.warehouses - Array of warehouses
 * @param {Function} [props.onTransferComplete] - Callback after transfer
 * @param {Function} [props.onClose] - Callback to close form
 */
export function StockTransferForm({
    businessId,
    products = [],
    warehouses = [],
    onTransferComplete,
    onClose
}) {
    const { 
        transferStock, 
        getProductLocations, 
        loading,
        isOnline,
        syncing,
        syncOfflineQueue
    } = useMultiLocationSync(businessId);
    
    const [formData, setFormData] = useState({
        product_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: '',
        notes: ''
    });

    const [productLocations, setProductLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Load product locations when product is selected
    const handleProductChange = async (productId) => {
        setFormData({ ...formData, product_id: productId, from_warehouse_id: '', to_warehouse_id: '' });
        
        if (!productId) {
            setProductLocations([]);
            return;
        }

        setLoadingLocations(true);
        try {
            const locations = await getProductLocations(productId);
            setProductLocations(locations);
        } catch (error) {
            console.error('Failed to load locations:', error);
            toast.error('Failed to load product locations');
        } finally {
            setLoadingLocations(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.product_id || !formData.from_warehouse_id || !formData.to_warehouse_id || !formData.quantity) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.from_warehouse_id === formData.to_warehouse_id) {
            toast.error('Source and destination must be different');
            return;
        }

        const quantity = parseFloat(formData.quantity);
        if (quantity <= 0) {
            toast.error('Quantity must be greater than zero');
            return;
        }

        try {
            await transferStock({
                product_id: formData.product_id,
                from_warehouse_id: formData.from_warehouse_id,
                to_warehouse_id: formData.to_warehouse_id,
                quantity,
                notes: formData.notes
            });

            toast.success('Stock transfer initiated successfully');
            
            // Reset form
            setFormData({
                product_id: '',
                from_warehouse_id: '',
                to_warehouse_id: '',
                quantity: '',
                notes: ''
            });
            setProductLocations([]);

            onTransferComplete?.();
        } catch (error) {
            toast.error(error.message || 'Failed to initiate transfer');
        }
    };

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const sourceLocation = productLocations.find(loc => loc.warehouse_id === formData.from_warehouse_id);
    const availableStock = sourceLocation?.available_quantity || 0;
    const sourceWarehouse = warehouses.find(w => w.id === formData.from_warehouse_id);
    const destWarehouse = warehouses.find(w => w.id === formData.to_warehouse_id);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-wine" />
                            Stock Transfer
                        </CardTitle>
                        <CardDescription>
                            Transfer stock between warehouses or locations
                        </CardDescription>
                    </div>
                    <OfflineIndicator 
                        onSyncRequest={syncOfflineQueue}
                        isSyncing={syncing}
                        compact={true}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Product Selection */}
                    <div className="space-y-2">
                        <Label>Product *</Label>
                        <select
                            value={formData.product_id}
                            onChange={(e) => handleProductChange(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            required
                            disabled={loading}
                        >
                            <option value="">Select Product</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name} {product.sku ? `(${product.sku})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transfer Direction */}
                    {formData.product_id && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            {/* Source Warehouse */}
                            <div className="space-y-2">
                                <Label>From Warehouse *</Label>
                                <select
                                    value={formData.from_warehouse_id}
                                    onChange={(e) => setFormData({ ...formData, from_warehouse_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    required
                                    disabled={loading || loadingLocations}
                                >
                                    <option value="">Select Source</option>
                                    {productLocations
                                        .filter(loc => loc.available_quantity > 0)
                                        .map(loc => (
                                            <option key={loc.warehouse_id} value={loc.warehouse_id}>
                                                {loc.warehouses?.name} ({loc.available_quantity} available)
                                            </option>
                                        ))}
                                </select>
                                {formData.from_warehouse_id && sourceLocation && (
                                    <div className="text-xs text-gray-600">
                                        Available: <span className="font-semibold text-green-600">
                                            {sourceLocation.available_quantity}
                                        </span>
                                        {sourceLocation.reserved_quantity > 0 && (
                                            <span className="ml-2">
                                                Reserved: <span className="font-semibold text-orange-600">
                                                    {sourceLocation.reserved_quantity}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                                <ArrowRight className="w-8 h-8 text-wine" />
                            </div>

                            {/* Destination Warehouse */}
                            <div className="space-y-2">
                                <Label>To Warehouse *</Label>
                                <select
                                    value={formData.to_warehouse_id}
                                    onChange={(e) => setFormData({ ...formData, to_warehouse_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    required
                                    disabled={loading || !formData.from_warehouse_id}
                                >
                                    <option value="">Select Destination</option>
                                    {warehouses
                                        .filter(w => w.id !== formData.from_warehouse_id)
                                        .map(warehouse => (
                                            <option key={warehouse.id} value={warehouse.id}>
                                                {warehouse.name}
                                                {warehouse.location && ` - ${warehouse.location}`}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    {formData.from_warehouse_id && formData.to_warehouse_id && (
                        <>
                            <div className="space-y-2">
                                <Label>Transfer Quantity *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max={availableStock}
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="Enter quantity"
                                    required
                                    disabled={loading}
                                />
                                <p className="text-xs text-gray-600">
                                    Maximum available: {availableStock} units
                                </p>
                            </div>

                            {/* Transfer Preview */}
                            {formData.quantity && parseFloat(formData.quantity) > 0 && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Transfer Preview
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-blue-700 font-medium mb-1">From: {sourceWarehouse?.name}</p>
                                            <p className="text-blue-600">
                                                Current: {availableStock} units
                                            </p>
                                            <p className="text-blue-600">
                                                After: {availableStock - parseFloat(formData.quantity)} units
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-blue-700 font-medium mb-1">To: {destWarehouse?.name}</p>
                                            <p className="text-blue-600">
                                                Will receive: {formData.quantity} units
                                            </p>
                                            <Badge className="mt-1 bg-yellow-500 text-white text-xs">
                                                Pending Receipt
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Validation Warning */}
                            {formData.quantity && parseFloat(formData.quantity) > availableStock && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-800">
                                        <p className="font-semibold">Insufficient Stock</p>
                                        <p>Requested quantity exceeds available stock at source location.</p>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Add any notes about this transfer..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        {onClose && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={
                                loading ||
                                !formData.product_id ||
                                !formData.from_warehouse_id ||
                                !formData.to_warehouse_id ||
                                !formData.quantity ||
                                parseFloat(formData.quantity) <= 0 ||
                                parseFloat(formData.quantity) > availableStock
                            }
                            className=" bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? 'Initiating Transfer...' : 'Initiate Transfer'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
