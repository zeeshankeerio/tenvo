'use client';

import { useState, useEffect, useRef } from 'react';
import { Scan, Check, X, AlertCircle, Package, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { serialAPI } from '@/lib/api/serial';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

/**
 * Serial Number Scanner and Manager
 * For auto parts, electronics, computer hardware domains
 * 
 * @param {Object} props
 * @param {any} [props.product]
 * @param {string} [props.businessId]
 * @param {string} [props.warehouseId]
 * @param {string} [props.mode] - 'register' | 'scan' | 'view'
 * @param {Function} [props.onSerialScanned]
 * @param {Function} [props.onClose]
 */
export function SerialScanner({
    product,
    businessId,
    warehouseId,
    mode = 'register', // 'register', 'scan', 'view'
    onSerialScanned,
    onClose
}) {
    const [serials, setSerials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [scannedSerial, setScannedSerial] = useState(null);
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const inputRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        serialNumber: '',
        imei: '',
        macAddress: '',
        warrantyPeriodMonths: '12',
        notes: ''
    });

    // Bulk add state
    const [bulkSerials, setBulkSerials] = useState('');

    useEffect(() => {
        if (product?.id && mode === 'view') {
            loadSerials();
        }

        // Auto-focus on serial input
        if (inputRef.current && mode === 'scan') {
            inputRef.current.focus();
        }
    }, [product?.id, mode]);

    const loadSerials = async () => {
        try {
            setLoading(true);
            const data = await serialAPI.getByProduct(product.id, businessId || product.business_id);
            setSerials(data || []);
        } catch (error) {
            console.error('Load serials error:', error);
            toast.error('Failed to load serial numbers');
        } finally {
            setLoading(true);
            // Small delay to prevent jitter, then false
            setTimeout(() => setLoading(false), 300);
        }
    };

    const handleScan = async (e) => {
        e.preventDefault();

        if (!formData.serialNumber.trim()) {
            toast.error('Please enter a serial number');
            return;
        }

        try {
            setLoading(true);

            if (mode === 'scan') {
                // Optimized single-serial lookup
                const serial = await serialAPI.getSerial(businessId || product?.business_id, formData.serialNumber);

                if (!serial) {
                    toast.error('Serial number not found or invalid for this business');
                    return;
                }

                setScannedSerial(serial);
                onSerialScanned?.(serial);
                toast.success('Serial number verified');
            } else {
                // [SHIELD] DEFENSIVE CHECK
                if (!product || !product.id) {
                    toast.error('Product context missing. Please close and try again.');
                    return;
                }

                if (!businessId && !product.business_id) {
                    toast.error('Business context missing');
                    return;
                }

                // Register new serial - Map to snake_case for backend
                await serialAPI.create({
                    business_id: businessId || product.business_id,
                    product_id: product.id,
                    warehouse_id: warehouseId || null,
                    serial_number: formData.serialNumber.toUpperCase(),
                    imei: formData.imei || null,
                    mac_address: formData.macAddress || null,
                    warranty_period_months: parseInt(formData.warrantyPeriodMonths) || 12,
                    notes: formData.notes
                });

                toast.success('Serial number registered');

                // Reset form
                setFormData({
                    serialNumber: '',
                    imei: '',
                    macAddress: '',
                    warrantyPeriodMonths: '12',
                    notes: ''
                });

                if (mode === 'view' || serials.length > 0) {
                    loadSerials();
                }
            }

            // Focus back on input for next scan
            if (inputRef.current) {
                inputRef.current.focus();
            }

        } catch (error) {
            console.error('Serial operation error:', error);
            toast.error(error.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAdd = async () => {
        const serialNumbers = bulkSerials
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (serialNumbers.length === 0) {
            toast.error('Please enter at least one serial number');
            return;
        }

        try {
            setLoading(true);

            // [SHIELD] DEFENSIVE CHECK
            if (!product || !product.id) {
                toast.error('Product context missing');
                return;
            }

            // Bulk registration currently not in serialAPI, let's loop for now 
            // Better to add createBulk to serialAPI/Action later
            for (const sn of serialNumbers) {
                await serialAPI.create({
                    business_id: businessId || product.business_id,
                    product_id: product.id,
                    warehouse_id: warehouseId || null,
                    serial_number: sn.toUpperCase(),
                    warranty_period_months: parseInt(formData.warrantyPeriodMonths) || 12
                });
            }

            toast.success(`${serialNumbers.length} serial numbers registered`);
            setBulkSerials('');
            setShowBulkAdd(false);

            if (mode === 'view') {
                loadSerials();
            }

        } catch (error) {
            console.error('Bulk add error:', error);
            toast.error(error.message || 'Failed to register serial numbers');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            in_stock: { label: 'In Stock', variant: 'default', color: 'bg-green-500' },
            sold: { label: 'Sold', variant: 'secondary', color: 'bg-blue-500' },
            returned: { label: 'Returned', variant: 'warning', color: 'bg-orange-500' },
            defective: { label: 'Defective', variant: 'destructive', color: 'bg-red-500' },
            under_repair: { label: 'Under Repair', variant: 'secondary', color: 'bg-wine-500' }
        };

        const config = statusConfig[status] || statusConfig.in_stock;
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    const getWarrantyStatus = (warrantyEndDate) => {
        if (!warrantyEndDate) return null;

        const today = new Date();
        const endDate = new Date(warrantyEndDate);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
            return <Badge variant="destructive">Warranty Expired</Badge>;
        } else if (daysLeft <= 30) {
            return <Badge variant="warning" className="bg-orange-500">Expires in {daysLeft} days</Badge>;
        } else {
            return <Badge variant="secondary">{daysLeft} days remaining</Badge>;
        }
    };

    const inStockCount = serials.filter(s => s.status === 'in_stock').length;
    const soldCount = serials.filter(s => s.status === 'sold').length;
    const defectiveCount = serials.filter(s => s.status === 'defective').length;

    // Scan mode - simple scanner interface
    if (mode === 'scan') {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Scan className="w-5 h-5 text-wine" />
                        <CardTitle>Scan Serial Number</CardTitle>
                    </div>
                    <CardDescription>Scan or enter serial number to verify</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleScan} className="space-y-4">
                        <div>
                            <Label htmlFor="serialScan">Serial Number</Label>
                            <Input
                                ref={inputRef}
                                id="serialScan"
                                value={formData.serialNumber}
                                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                                placeholder="Scan or type serial number..."
                                className="text-lg font-mono"
                                autoFocus
                            />
                        </div>

                        <Button type="submit" disabled={loading} className="w-full bg-wine hover:bg-wine/90">
                            <Scan className="w-4 h-4 mr-2" />
                            {loading ? 'Verifying...' : 'Verify Serial'}
                        </Button>
                    </form>

                    {scannedSerial && (
                        <div className="mt-6 p-4 border rounded-lg bg-green-50 border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Check className="w-5 h-5 text-green-600" />
                                <h4 className="font-semibold text-green-900">Serial Verified</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Serial:</span>
                                    <span className="font-mono font-semibold">{scannedSerial.serial_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Product:</span>
                                    <span className="font-medium">{scannedSerial.products?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    {getStatusBadge(scannedSerial.status)}
                                </div>
                                {scannedSerial.warranty_end_date && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Warranty:</span>
                                        {getWarrantyStatus(scannedSerial.warranty_end_date)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Register/View mode - full management interface
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Serial Number Management</h3>
                    <p className="text-sm text-gray-600">{product?.name}</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowBulkAdd(true)}
                        variant="outline"
                        disabled={!product?.id}
                    >
                        Bulk Add
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-900">{serials.length}</div>
                        <p className="text-sm text-gray-600">Total Serials</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{inStockCount}</div>
                        <p className="text-sm text-gray-600">In Stock</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{soldCount}</div>
                        <p className="text-sm text-gray-600">Sold</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{defectiveCount}</div>
                        <p className="text-sm text-gray-600">Defective</p>
                    </CardContent>
                </Card>
            </div>

            {/* Register Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Register New Serial</CardTitle>
                    <CardDescription>Add individual serial numbers with warranty details</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleScan} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="serialNumber">Serial Number *</Label>
                                <Input
                                    ref={inputRef}
                                    id="serialNumber"
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                                    placeholder="SN-123456789"
                                    className="font-mono"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="warrantyMonths">Warranty (Months)</Label>
                                <Input
                                    id="warrantyMonths"
                                    type="number"
                                    value={formData.warrantyPeriodMonths}
                                    onChange={(e) => setFormData({ ...formData, warrantyPeriodMonths: e.target.value })}
                                    placeholder="12"
                                />
                            </div>

                            <div>
                                <Label htmlFor="imei">IMEI (Optional)</Label>
                                <Input
                                    id="imei"
                                    value={formData.imei}
                                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                    placeholder="For mobile devices"
                                    className="font-mono"
                                />
                            </div>

                            <div>
                                <Label htmlFor="macAddress">MAC Address (Optional)</Label>
                                <Input
                                    id="macAddress"
                                    value={formData.macAddress}
                                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                                    placeholder="For network devices"
                                    className="font-mono"
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

                        <Button
                            type="submit"
                            disabled={loading || !product?.id}
                            className="bg-wine hover:bg-wine/90"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            {!product?.id ? 'Select Product' : loading ? 'Registering...' : 'Register Serial'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Serials List */}
            <Card>
                <CardHeader>
                    <CardTitle>Registered Serials</CardTitle>
                    <CardDescription>All serial numbers for this product</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && serials.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Loading serials...</div>
                    ) : !product?.id ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-orange-400" />
                            <p>Product context missing</p>
                            <p className="text-sm">Serial numbers must be registered to a specific product.</p>
                        </div>
                    ) : serials.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No serial numbers registered</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {serials.map(serial => (
                                <div key={serial.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-mono font-semibold text-gray-900">{serial.serial_number}</h4>
                                                {getStatusBadge(serial.status)}
                                            </div>
                                            {serial.imei && (
                                                <p className="text-sm text-gray-600">IMEI: {serial.imei}</p>
                                            )}
                                        </div>
                                        {serial.warranty_end_date && getWarrantyStatus(serial.warranty_end_date)}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        {serial.purchase_date && (
                                            <div>
                                                <p className="text-gray-600">Purchase Date</p>
                                                <p className="font-medium text-gray-900">
                                                    {new Date(serial.purchase_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}

                                        {serial.warranty_start_date && (
                                            <div>
                                                <p className="text-gray-600">Warranty Start</p>
                                                <p className="font-medium text-gray-900">
                                                    {new Date(serial.warranty_start_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}

                                        {serial.warranty_end_date && (
                                            <div>
                                                <p className="text-gray-600">Warranty End</p>
                                                <p className="font-medium text-gray-900">
                                                    {new Date(serial.warranty_end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}

                                        {serial.customers && (
                                            <div>
                                                <p className="text-gray-600">Customer</p>
                                                <p className="font-medium text-gray-900">{serial.customers.name}</p>
                                            </div>
                                        )}
                                    </div>

                                    {serial.notes && (
                                        <p className="text-sm text-gray-600 mt-2">{serial.notes}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bulk Add Dialog */}
            <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Add Serial Numbers</DialogTitle>
                        <DialogDescription>
                            Quickly register multiple serial numbers by entering them one per line.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="bulkSerials">Serial Numbers (one per line)</Label>
                            <textarea
                                id="bulkSerials"
                                value={bulkSerials}
                                onChange={(e) => setBulkSerials(e.target.value)}
                                placeholder="SN-001&#10;SN-002&#10;SN-003"
                                className="w-full h-40 p-2 border rounded-md font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {bulkSerials.split('\n').filter(s => s.trim()).length} serial numbers
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="bulkWarranty">Warranty Period (Months)</Label>
                            <Input
                                id="bulkWarranty"
                                type="number"
                                value={formData.warrantyPeriodMonths}
                                onChange={(e) => setFormData({ ...formData, warrantyPeriodMonths: e.target.value })}
                                placeholder="12"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowBulkAdd(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleBulkAdd} disabled={loading} className="bg-wine hover:bg-wine/90">
                                {loading ? 'Adding...' : 'Add Serials'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

