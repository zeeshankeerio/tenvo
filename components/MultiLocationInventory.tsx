/**
 * Multi-Location Inventory Component - TypeScript Migration
 * Manages warehouse locations and stock transfers
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Plus, ArrowRightLeft, MapPin, Pencil, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WarehouseLocation, Product, DomainKnowledge } from '@/types';

interface MultiLocationInventoryProps {
    locations: WarehouseLocation[];
    products: Product[];
    businessId: string;
    onLocationAdd?: (data: CreateLocationData) => Promise<void>;
    onLocationUpdate?: (locationId: string, updates: UpdateLocationData) => Promise<void>;
    onLocationDelete?: (locationId: string) => Promise<void>;
    onStockTransfer?: (data: StockTransferData) => Promise<void>;
    category?: string;
    domainKnowledge?: DomainKnowledge;
    refreshData?: () => Promise<void>;
}

interface CreateLocationData {
    business_id: string;
    name: string;
    address?: string;
    city?: string;
    type?: 'warehouse' | 'showroom' | 'hub' | 'cutting';
    code?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
    isPrimary?: boolean;
}

interface UpdateLocationData {
    name?: string;
    address?: string;
    city?: string;
    type?: 'warehouse' | 'showroom' | 'hub' | 'cutting';
    code?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
    isPrimary?: boolean;
}

interface StockTransferData {
    from_location_id: string;
    to_location_id: string;
    business_id: string;
    items: Array<{
        product_id: string;
        quantity: number;
    }>;
    reason?: string;
}

interface LocationFormData {
    name: string;
    address: string;
    city: string;
    type: 'warehouse' | 'showroom' | 'hub' | 'cutting';
    code: string;
    contactPerson: string;
    phone: string;
    email: string;
}

interface TransferFormData {
    fromLocation: string;
    toLocation: string;
    productId: string;
    quantity: number;
    reason: string;
}

export function MultiLocationInventory({
    locations = [],
    products = [],
    businessId,
    onLocationAdd,
    onLocationUpdate,
    onLocationDelete,
    onStockTransfer,
    domainKnowledge,
    category,
    refreshData
}: MultiLocationInventoryProps) {
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showTransferDialog, setShowTransferDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [locationForm, setLocationForm] = useState<LocationFormData>({
        name: '',
        address: '',
        city: '',
        type: 'warehouse',
        code: '',
        contactPerson: '',
        phone: '',
        email: ''
    });

    const [transferForm, setTransferForm] = useState<TransferFormData>({
        fromLocation: '',
        toLocation: '',
        productId: '',
        quantity: 0,
        reason: ''
    });

    // Calculate stock per location
    const stockByLocation = useMemo(() => {
        const stockMap = new Map<string, Map<string, number>>();

        products.forEach(product => {
            if (product.locations) {
                Object.entries(product.locations).forEach(([locationId, quantity]) => {
                    if (!stockMap.has(locationId)) {
                        stockMap.set(locationId, new Map());
                    }
                    stockMap.get(locationId)!.set(product.id, quantity);
                });
            }
        });

        return stockMap;
    }, [products]);

    const handleAddLocation = async () => {
        if (!locationForm.name.trim()) {
            toast.error('Location name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const data: CreateLocationData = {
                business_id: businessId,
                name: locationForm.name,
                address: locationForm.address || undefined,
                city: locationForm.city || undefined,
                type: locationForm.type,
                code: locationForm.code || undefined,
                contactPerson: locationForm.contactPerson || undefined,
                phone: locationForm.phone || undefined,
                email: locationForm.email || undefined,
                isActive: true,
                isPrimary: locations.length === 0
            };

            if (onLocationAdd) {
                await onLocationAdd(data);
            }

            toast.success('Location added successfully');
            setShowAddDialog(false);
            resetLocationForm();

            if (refreshData) {
                await refreshData();
            }
        } catch (error) {
            console.error('Add location error:', error);
            toast.error('Failed to add location');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLocation = async () => {
        if (!selectedLocation) return;
        if (!locationForm.name.trim()) {
            toast.error('Location name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const updates: UpdateLocationData = {
                name: locationForm.name,
                address: locationForm.address || undefined,
                city: locationForm.city || undefined,
                type: locationForm.type,
                code: locationForm.code || undefined,
                contactPerson: locationForm.contactPerson || undefined,
                phone: locationForm.phone || undefined,
                email: locationForm.email || undefined
            };

            if (onLocationUpdate) {
                await onLocationUpdate(selectedLocation.id, updates);
            }

            toast.success('Location updated successfully');
            setShowEditDialog(false);
            setSelectedLocation(null);
            resetLocationForm();

            if (refreshData) {
                await refreshData();
            }
        } catch (error) {
            console.error('Update location error:', error);
            toast.error('Failed to update location');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLocation = async (locationId: string) => {
        if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
            return;
        }

        try {
            if (onLocationDelete) {
                await onLocationDelete(locationId);
            }

            toast.success('Location deleted successfully');

            if (refreshData) {
                await refreshData();
            }
        } catch (error) {
            console.error('Delete location error:', error);
            toast.error('Failed to delete location');
        }
    };

    const handleStockTransfer = async () => {
        if (!transferForm.fromLocation || !transferForm.toLocation) {
            toast.error('Please select both source and destination locations');
            return;
        }

        if (transferForm.fromLocation === transferForm.toLocation) {
            toast.error('Source and destination must be different');
            return;
        }

        if (!transferForm.productId) {
            toast.error('Please select a product');
            return;
        }

        if (transferForm.quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        setIsSubmitting(true);
        try {
            const data: StockTransferData = {
                from_location_id: transferForm.fromLocation,
                to_location_id: transferForm.toLocation,
                business_id: businessId,
                items: [{
                    product_id: transferForm.productId,
                    quantity: transferForm.quantity
                }],
                reason: transferForm.reason || undefined
            };

            if (onStockTransfer) {
                await onStockTransfer(data);
            }

            toast.success('Stock transferred successfully');
            setShowTransferDialog(false);
            resetTransferForm();

            if (refreshData) {
                await refreshData();
            }
        } catch (error) {
            console.error('Stock transfer error:', error);
            toast.error('Failed to transfer stock');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditDialog = (location: WarehouseLocation) => {
        setSelectedLocation(location);
        setLocationForm({
            name: location.name,
            address: location.address || '',
            city: location.city || '',
            type: location.type,
            code: location.code || '',
            contactPerson: location.contact_person || '',
            phone: location.phone || '',
            email: location.email || ''
        });
        setShowEditDialog(true);
    };

    const resetLocationForm = () => {
        setLocationForm({
            name: '',
            address: '',
            city: '',
            type: 'warehouse',
            code: '',
            contactPerson: '',
            phone: '',
            email: ''
        });
    };

    const resetTransferForm = () => {
        setTransferForm({
            fromLocation: '',
            toLocation: '',
            productId: '',
            quantity: 0,
            reason: ''
        });
    };

    const getLocationTypeIcon = (type: string) => {
        switch (type) {
            case 'showroom':
                return <Building2 className="w-4 h-4" />;
            case 'hub':
                return <MapPin className="w-4 h-4" />;
            default:
                return <Warehouse className="w-4 h-4" />;
        }
    };

    const getLocationTypeColor = (type: string) => {
        switch (type) {
            case 'showroom':
                return 'bg-blue-100 text-blue-800';
            case 'hub':
                return 'bg-wine-100 text-wine-800';
            case 'cutting':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-green-100 text-green-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {domainKnowledge?.icon && <span className="text-2xl">{domainKnowledge.icon}</span>}
                        <h2 className="text-2xl font-bold">
                            {domainKnowledge?.name ? `${domainKnowledge.name} Inventory` : 'Multi-Location Inventory'}
                        </h2>
                        {category && (
                            <Badge variant="outline" className="ml-2 capitalize opacity-70">
                                {category.replace(/-/g, ' ')}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        Manage warehouse locations, godowns, and stock transfers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowTransferDialog(true)} variant="outline">
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Transfer Stock
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Location
                    </Button>
                </div>
            </div>

            {/* Locations Grid */}
            {locations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Warehouse className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Add your first warehouse location to start tracking inventory
                        </p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Location
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map((location) => {
                        const locationStock = stockByLocation.get(location.id);
                        const totalProducts = locationStock?.size || 0;
                        const totalQuantity = locationStock
                            ? Array.from(locationStock.values()).reduce((sum, qty) => sum + qty, 0)
                            : 0;

                        return (
                            <Card key={location.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            {getLocationTypeIcon(location.type)}
                                            <CardTitle className="text-lg">{location.name}</CardTitle>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditDialog(location)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteLocation(location.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <Badge className={getLocationTypeColor(location.type)}>
                                            {location.type}
                                        </Badge>
                                        {location.is_primary && (
                                            <Badge variant="outline">Primary</Badge>
                                        )}
                                        {!location.is_active && (
                                            <Badge variant="destructive">Inactive</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {location.address && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                <span className="text-muted-foreground">
                                                    {location.address}
                                                    {location.city && `, ${location.city}`}
                                                </span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Products</p>
                                                <p className="text-2xl font-bold">{totalProducts}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total Stock</p>
                                                <p className="text-2xl font-bold">{totalQuantity}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Location Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Location</DialogTitle>
                        <DialogDescription>
                            Create a new warehouse or storage location
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="name">Location Name *</Label>
                            <Input
                                id="name"
                                value={locationForm.name}
                                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                                placeholder="Main Warehouse"
                            />
                        </div>

                        <div>
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={locationForm.type}
                                onValueChange={(value: any) => setLocationForm({ ...locationForm, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="warehouse">Warehouse</SelectItem>
                                    <SelectItem value="showroom">Showroom</SelectItem>
                                    <SelectItem value="hub">Hub</SelectItem>
                                    <SelectItem value="cutting">Cutting Unit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="code">Location Code</Label>
                            <Input
                                id="code"
                                value={locationForm.code}
                                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                                placeholder="WH-001"
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={locationForm.address}
                                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                                placeholder="Street address"
                            />
                        </div>

                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={locationForm.city}
                                onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                                placeholder="Karachi"
                            />
                        </div>

                        <div>
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input
                                id="contactPerson"
                                value={locationForm.contactPerson}
                                onChange={(e) => setLocationForm({ ...locationForm, contactPerson: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={locationForm.phone}
                                onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                                placeholder="+92 300 1234567"
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={locationForm.email}
                                onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
                                placeholder="warehouse@example.com"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all" onClick={handleAddLocation} disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Location'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Location Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Location</DialogTitle>
                        <DialogDescription>
                            Update location details
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="edit-name">Location Name *</Label>
                            <Input
                                id="edit-name"
                                value={locationForm.name}
                                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-type">Type</Label>
                            <Select
                                value={locationForm.type}
                                onValueChange={(value: any) => setLocationForm({ ...locationForm, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="warehouse">Warehouse</SelectItem>
                                    <SelectItem value="showroom">Showroom</SelectItem>
                                    <SelectItem value="hub">Hub</SelectItem>
                                    <SelectItem value="cutting">Cutting Unit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="edit-code">Location Code</Label>
                            <Input
                                id="edit-code"
                                value={locationForm.code}
                                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Input
                                id="edit-address"
                                value={locationForm.address}
                                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-city">City</Label>
                            <Input
                                id="edit-city"
                                value={locationForm.city}
                                onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-contactPerson">Contact Person</Label>
                            <Input
                                id="edit-contactPerson"
                                value={locationForm.contactPerson}
                                onChange={(e) => setLocationForm({ ...locationForm, contactPerson: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                                id="edit-phone"
                                value={locationForm.phone}
                                onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={locationForm.email}
                                onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all" onClick={handleUpdateLocation} disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Location'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Stock Transfer Dialog */}
            <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transfer Stock</DialogTitle>
                        <DialogDescription>
                            Move inventory between locations
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="fromLocation">From Location *</Label>
                            <Select
                                value={transferForm.fromLocation}
                                onValueChange={(value) => setTransferForm({ ...transferForm, fromLocation: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="toLocation">To Location *</Label>
                            <Select
                                value={transferForm.toLocation}
                                onValueChange={(value) => setTransferForm({ ...transferForm, toLocation: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select destination location" />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="product">Product *</Label>
                            <Select
                                value={transferForm.productId}
                                onValueChange={(value) => setTransferForm({ ...transferForm, productId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name} (Stock: {product.stock})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={transferForm.quantity}
                                onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <Label htmlFor="reason">Reason (Optional)</Label>
                            <Input
                                id="reason"
                                value={transferForm.reason}
                                onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                                placeholder="Stock rebalancing"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all" onClick={handleStockTransfer} disabled={isSubmitting}>
                            {isSubmitting ? 'Transferring...' : 'Transfer Stock'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

