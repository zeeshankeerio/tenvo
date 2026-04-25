'use client';

import { useMemo, useState, useRef } from 'react';
import { Scan, Check, X, AlertCircle, Package, Shield, Calendar, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSerialTracking } from '@/lib/hooks/useSerialTracking';
import toast from 'react-hot-toast';

/**
 * SerialTrackingManager Component
 * Consolidated serial number management for auto parts, electronics, computer hardware
 * Replaces: SerialScanner.jsx, SerialTracking.jsx
 * 
 * Features:
 * - Individual unit tracking (IMEI, chassis, MAC)
 * - Warranty management with expiry alerts
 * - Bulk serial registration
 * - Status management (available/sold/returned/defective/under_repair)
 * - Search and filter capabilities
 * - Real-time statistics
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.productId - Product ID
 * @param {string} [props.warehouseId] - Warehouse ID (optional)
 * @param {Object} [props.product] - Product object with name, sku
 */
export function SerialTrackingManager({ businessId, productId, warehouseId, product }) {
    const {
        serials,
        loading,
        registerSerial,
        bulkRegisterSerials,
        updateSerialStatus,
        searchSerials,
        getStatistics,
        refetch
    } = useSerialTracking(productId, businessId, warehouseId);

    const stats = useMemo(() => getStatistics?.() || ({
        total: 0,
        inWarranty: 0,
        available: 0,
        sold: 0,
    }), [getStatistics]);

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const inputRef = useRef(null);

    // Form state for single serial
    const [formData, setFormData] = useState({
        serial_number: '',
        imei: '',
        mac_address: '',
        warranty_period_months: 12,
        notes: ''
    });

    // Bulk add state
    const [bulkSerials, setBulkSerials] = useState('');
    const [bulkWarrantyMonths, setBulkWarrantyMonths] = useState(12);

    const handleAddSerial = async (e) => {
        e.preventDefault();

        if (!formData.serial_number.trim()) {
            toast.error('Please enter a serial number');
            return;
        }

        try {
            await registerSerial({
                serial_number: formData.serial_number.toUpperCase(),
                imei: formData.imei || null,
                mac_address: formData.mac_address || null,
                warranty_period_months: parseInt(formData.warranty_period_months) || 12,
                notes: formData.notes,
                warehouse_id: warehouseId || null
            });

            toast.success('Serial number registered');
            setFormData({
                serial_number: '',
                imei: '',
                mac_address: '',
                warranty_period_months: 12,
                notes: ''
            });
            setShowAddDialog(false);
            
            // Focus back on input for next entry
            if (inputRef.current) {
                inputRef.current.focus();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to register serial');
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
            await bulkRegisterSerials(serialNumbers.map(serial => ({
                serial_number: serial,
                warranty_period_months: bulkWarrantyMonths,
                warehouse_id: warehouseId || null,
            })));
            toast.success(`${serialNumbers.length} serial numbers registered`);
            setBulkSerials('');
            setShowBulkDialog(false);
        } catch (error) {
            toast.error(error.message || 'Failed to register serial numbers');
        }
    };

    const handleStatusUpdate = async (serialId, newStatus) => {
        try {
            await updateSerialStatus(serialId, newStatus);
            toast.success('Status updated');
        } catch (error) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            refetch?.();
            return;
        }

        try {
            await searchSerials(searchQuery);
        } catch (error) {
            toast.error('Search failed');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            available: { label: 'Available', className: 'bg-green-500 text-white' },
            sold: { label: 'Sold', className: 'bg-blue-500 text-white' },
            returned: { label: 'Returned', className: 'bg-orange-500 text-white' },
            defective: { label: 'Defective', className: 'bg-red-500 text-white' },
            under_repair: { label: 'Under Repair', className: 'bg-wine-500 text-white' }
        };

        const config = statusConfig[status] || statusConfig.available;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    const getWarrantyStatus = (warrantyEndDate) => {
        if (!warrantyEndDate) return null;

        const today = new Date();
        const endDate = new Date(warrantyEndDate);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
            return <Badge variant="destructive">Warranty Expired</Badge>;
        } else if (daysLeft <= 30) {
            return <Badge className="bg-orange-500 text-white">Expires in {daysLeft} days</Badge>;
        } else {
            return <Badge variant="secondary">{daysLeft} days remaining</Badge>;
        }
    };

    // Filter serials
    const filteredSerials = serials.filter(serial => {
        const matchesStatus = statusFilter === 'all' || serial.status === statusFilter;
        const matchesSearch = !searchQuery || 
            serial.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            serial.imei?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            serial.mac_address?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Serial Number Management</h3>
                    <p className="text-sm text-gray-600">{product?.name || 'Product'}</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowBulkDialog(true)}
                        variant="outline"
                        disabled={!productId}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Bulk Add
                    </Button>
                    <Button
                        onClick={() => setShowAddDialog(true)}
                        className="bg-wine hover:bg-wine/90"
                        disabled={!productId}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Serial
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        <p className="text-sm text-gray-600">Total Serials</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.inWarranty}</div>
                        <p className="text-sm text-gray-600">In Warranty</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.available}</div>
                        <p className="text-sm text-gray-600">Available</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">{stats.sold}</div>
                        <p className="text-sm text-gray-600">Sold</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filter */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search by serial, IMEI, or MAC address..."
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border rounded-md bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="available">Available</option>
                            <option value="sold">Sold</option>
                            <option value="returned">Returned</option>
                            <option value="defective">Defective</option>
                            <option value="under_repair">Under Repair</option>
                        </select>
                        <Button onClick={handleSearch} variant="outline">
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Serials List */}
            <Card>
                <CardHeader>
                    <CardTitle>Registered Serials ({filteredSerials.length})</CardTitle>
                    <CardDescription>All serial numbers for this product</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && serials.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Loading serials...</div>
                    ) : !productId ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-orange-400" />
                            <p>Product context missing</p>
                            <p className="text-sm">Serial numbers must be registered to a specific product.</p>
                        </div>
                    ) : filteredSerials.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No serial numbers found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSerials.map(serial => (
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
                                            {serial.mac_address && (
                                                <p className="text-sm text-gray-600">MAC: {serial.mac_address}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {serial.warranty_end_date && getWarrantyStatus(serial.warranty_end_date)}
                                            <select
                                                value={serial.status}
                                                onChange={(e) => handleStatusUpdate(serial.id, e.target.value)}
                                                className="text-xs px-2 py-1 border rounded"
                                            >
                                                <option value="available">Available</option>
                                                <option value="sold">Sold</option>
                                                <option value="returned">Returned</option>
                                                <option value="defective">Defective</option>
                                                <option value="under_repair">Under Repair</option>
                                            </select>
                                        </div>
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

            {/* Add Serial Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Register New Serial</DialogTitle>
                        <DialogDescription>
                            Add individual serial number with warranty details
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddSerial} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="serialNumber">Serial Number *</Label>
                                <Input
                                    ref={inputRef}
                                    id="serialNumber"
                                    value={formData.serial_number}
                                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value.toUpperCase() })}
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
                                    value={formData.warranty_period_months}
                                    onChange={(e) => setFormData({ ...formData, warranty_period_months: parseInt(e.target.value) })}
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
                                    value={formData.mac_address}
                                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
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

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-wine hover:bg-wine/90"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                {loading ? 'Registering...' : 'Register Serial'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Add Dialog */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
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
                                value={bulkWarrantyMonths}
                                onChange={(e) => setBulkWarrantyMonths(parseInt(e.target.value))}
                                placeholder="12"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
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

