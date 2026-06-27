'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Unlock, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';

import { stockAPI } from '@/lib/api/stock';
import { batchAPI } from '@/lib/api/batch';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { InventoryErrorCard } from './InventoryErrorBoundary';
import { InventoryCardLoading } from './InventoryLoadingState';

/**
 * StockReservation Component
 * Manages stock reservations for sales orders, customers, etc.
 * 
 * @param {Object} props
 * @param {any[]} [props.reservations] - Array of reservation objects
 * @param {any[]} [props.products] - Array of products
 * @param {any[]} [props.customers] - Array of customers
 * @param {any[]} [props.quotations] - Array of quotations
 * @param {any[]} [props.salesOrders] - Array of sales orders
 * @param {string} [props.businessId] - Business ID
 * @param {string} [props.currency] - Currency code
 */
export function StockReservation({
  reservations = [],
  products = [],
  customers = [],
  quotations = [],
  salesOrders = [],
  businessId,
  currency = 'PKR',
}) {
  const { can } = usePermissions();
  const canViewInventory = can('inventory.view');
  const canAdjustStock = can('inventory.adjust_stock');

  const [reservationList, setReservationList] = useState(reservations);
  const [batches, setBatches] = useState([]);
  const [batchesLoadFailed, setBatchesLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [releasingId, setReleasingId] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    batchId: '',
    quantity: 0,
    customerId: '',
    orderId: '',
    reservedUntil: '',
    reason: '',
    notes: '',
  });

  const normalizeReservation = useCallback((reservation) => {
    let parsedReference = {};
    try {
      parsedReference = reservation.reference ? JSON.parse(reservation.reference) : {};
    } catch (error) {
      parsedReference = {};
    }

    return {
      ...reservation,
      customerId: parsedReference.customerId || null,
      orderId: parsedReference.orderId || null,
      reason: parsedReference.reason || '',
      notes: parsedReference.notes || '',
    };
  }, []);

  const loadReservations = useCallback(async ({ runExpiry = true, silent = true } = {}) => {
    if (!businessId) return;

    try {
      setIsSyncing(true);

      if (runExpiry) {
        await stockAPI.expireOverdueReservations(businessId, 500);
      }

      const data = await stockAPI.getReservations(businessId, 'all', 200);
      const normalized = data.map(normalizeReservation);
      setReservationList(normalized);

      if (!silent) {
        toast.success('Reservations synced');
      }
    } catch (error) {
      console.error('Failed to load reservations:', error);
      if (!silent) {
        toast.error('Failed to sync reservations');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [businessId, normalizeReservation]);

  useEffect(() => {
    loadReservations({ runExpiry: true, silent: true });
  }, [loadReservations]);

  const handleExpireOverdueNow = async () => {
    if (!businessId) return;

    try {
      setIsSyncing(true);
      const result = await stockAPI.expireOverdueReservations(businessId, 1000);
      await loadReservations({ runExpiry: false, silent: true });
      toast.success(`Expired ${result.expiredCount || 0} overdue reservations`);
    } catch (error) {
      console.error('Failed to expire overdue reservations:', error);
      toast.error('Failed to expire overdue reservations');
    } finally {
      setIsSyncing(false);
    }
  };

  const loadBatches = async (productId) => {
    if (!productId || !businessId) return;
    try {
      setBatchesLoadFailed(false);
      const data = await batchAPI.getByProduct(productId, businessId);
      setBatches(data || []);
    } catch (err) {
      console.error(err);
      setBatches([]);
      setBatchesLoadFailed(true);
      toast.error('Could not load batches for this product');
    }
  };

  const handleReserve = async () => {
    if (!formData.productId || formData.quantity <= 0) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    if (!businessId) {
      toast.error('Business context missing');
      return;
    }

    if (batchRequired && !formData.batchId) {
      toast.error('Please select a batch');
      return;
    }

    if (batchesLoadFailed) {
      toast.error('Batches could not be loaded. Pick the product again or refresh.');
      return;
    }

    const selectedBatch = batches.find(b => b.id === formData.batchId);
    const availableBatchQty = selectedBatch
      ? ((Number(selectedBatch.quantity) || 0) - (Number(selectedBatch.reserved_quantity) || 0))
      : null;

    if (selectedBatch && Number(formData.quantity) > availableBatchQty) {
      toast.error(`Requested quantity exceeds available batch stock (${availableBatchQty})`);
      return;
    }

    const selectedProduct = products.find(p => p.id === formData.productId);
    const headlineStock = Number(selectedProduct?.stock ?? 0);
    const useHeadlineOnly = !formData.batchId && !batchRequired && !batchesLoadFailed;
    if (useHeadlineOnly && headlineStock > 0 && Number(formData.quantity) > headlineStock) {
      toast.error(`Requested quantity exceeds on-hand stock (${headlineStock})`);
      return;
    }

    if (formData.reservedUntil) {
      const selectedDate = new Date(`${formData.reservedUntil}T23:59:59`);
      if (selectedDate < new Date()) {
        toast.error('Reserved Until cannot be in the past');
        return;
      }
    }

    try {
      setLoading(true);
      await stockAPI.reserve({
        business_id: businessId,
        product_id: formData.productId,
        batch_id: formData.batchId || undefined,
        warehouse_id: undefined,
        quantity: Number(formData.quantity),
        expires_at: formData.reservedUntil ? new Date(`${formData.reservedUntil}T00:00:00`) : undefined,
        reference: JSON.stringify({
          customerId: formData.customerId || null,
          orderId: formData.orderId || null,
          reason: formData.reason || '',
          notes: formData.notes || ''
        })
      });

      await loadReservations({ runExpiry: false, silent: true });
      toast.success('Stock reserved successfully');
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to reserve stock');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (res) => {
    if (!businessId) {
      toast.error('Business context missing');
      return;
    }

    try {
      setLoading(true);
      setReleasingId(res.id);
      await stockAPI.release({
        business_id: businessId,
        reservation_id: res.id,
        batch_id: res.batchId,
        quantity: res.quantity
      });

      await loadReservations({ runExpiry: false, silent: true });
      toast.success('Stock released successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to release stock');
    } finally {
      setLoading(false);
      setReleasingId(null);
    }
  };

  const resetForm = () => {
    setBatchesLoadFailed(false);
    setFormData({
      productId: '',
      batchId: '',
      quantity: 0,
      customerId: '',
      orderId: '',
      reservedUntil: '',
      reason: '',
      notes: '',
    });
    setBatches([]);
  };

  const selectableBatches = useMemo(
    () => (batches || []).filter((b) => b.is_active !== false),
    [batches]
  );
  const batchRequired = selectableBatches.length > 0;
  const activeReservations = reservationList.filter(r => r.status === 'active');
  const totalReserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
  const now = useMemo(() => new Date(), [reservationList.length, isSyncing]);
  const twoDaysAhead = useMemo(() => new Date(Date.now() + (48 * 60 * 60 * 1000)), [reservationList.length, isSyncing]);
  const expiringSoonCount = activeReservations.filter(r => {
    if (!r.reservedUntil) return false;
    const d = new Date(r.reservedUntil);
    return d >= now && d <= twoDaysAhead;
  }).length;
  const expiredCount = reservationList.filter(r => r.status === 'expired').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Stock Reservations</h3>
          <p className="text-sm text-gray-500">Reserve stock for orders and customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadReservations({ runExpiry: true, silent: false })}
            disabled={isSyncing || loading || !canViewInventory}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExpireOverdueNow}
            disabled={isSyncing || loading || !canAdjustStock}
          >
            Expire Overdue
          </Button>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!canAdjustStock}>
              <Lock className="w-4 h-4 mr-2" />
              Reserve Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[calc(100vw-1.5rem)] sm:w-full max-h-[min(92vh,900px)] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="shrink-0 px-6 pt-6 pb-2 space-y-1.5">
              <DialogTitle>Reserve Stock</DialogTitle>
              <DialogDescription>
                Place a hold on items for a specific customer or upcoming order to prevent overselling.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 pb-6 overflow-y-auto min-h-0 flex-1">
              <div className="space-y-2">
                <Label>Product *</Label>
                <select
                  value={formData.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    setFormData({ ...formData, productId, batchId: '' });
                    loadBatches(productId);
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (In Stock: {product.stock || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>{batchRequired ? 'Batch *' : 'Batch (optional)'}</Label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="flex h-10 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  required={batchRequired}
                  disabled={!formData.productId || batchesLoadFailed}
                >
                  <option value="">{batchRequired ? 'Select Batch' : 'General product stock (no batch)'}</option>
                  {selectableBatches.map(batch => {
                    const available = (Number(batch.quantity) || 0) - (Number(batch.reserved_quantity) || 0);
                    return (
                      <option key={batch.id} value={batch.id} disabled={available <= 0}>
                        {batch.batch_number} (Available: {available}) {available <= 0 ? '- No stock' : ''}
                      </option>
                    );
                  })}
                </select>
                {formData.productId && batchesLoadFailed && (
                  <p className="text-xs text-red-600">Could not load batches. Try re-selecting the product.</p>
                )}
                {formData.productId && !batchesLoadFailed && batches.length > 0 && selectableBatches.length === 0 && (
                  <p className="text-xs text-amber-600">Batches exist but none are active, activate a batch or use general stock.</p>
                )}
                {formData.productId && !batchesLoadFailed && !batchRequired && (
                  <p className="text-xs text-slate-500">No batch rows, reservation uses headline product stock (same checks as the hub).</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reserved Until</Label>
                  <Input
                    type="date"
                    value={formData.reservedUntil}
                    onChange={(e) => setFormData({ ...formData, reservedUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select Customer (Optional)</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Order ID</Label>
                <Input
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder="Order reference (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for reservation"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReserve}
                  disabled={
                    loading ||
                    !canAdjustStock ||
                    !formData.productId ||
                    (batchRequired && !formData.batchId) ||
                    formData.quantity <= 0 ||
                    batchesLoadFailed
                  }
                >
                  {loading ? 'Reserving...' : 'Reserve Stock'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeReservations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reserved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring (48h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{expiringSoonCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Released/Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reservationList.filter(r => r.status === 'completed').length + expiredCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations List */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reservationList.map((reservation) => {
              const product = products.find(p => p.id === reservation.productId);
              const customer = customers.find(c => c.id === reservation.customerId);
              const isActive = reservation.status === 'active';
              const isExpired = reservation.status === 'expired';
              const untilDate = reservation.reservedUntil ? new Date(reservation.reservedUntil) : null;
              const isExpiringSoon = isActive && untilDate && untilDate >= now && untilDate <= twoDaysAhead;
              return (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Lock className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Unlock className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{product?.name || 'Unknown Product'}</div>
                        <div className="text-sm text-gray-500">
                          Qty: {reservation.quantity}
                          {reservation.batchNumber && ` * Batch: ${reservation.batchNumber}`}
                          {customer && ` * Customer: ${customer.name}`}
                          {reservation.orderId && ` * Order: ${reservation.orderId}`}
                        </div>
                        {reservation.reservedUntil && (
                          <div className="text-xs text-gray-400 mt-1">
                            Until: {new Date(reservation.reservedUntil).toLocaleDateString()}
                          </div>
                        )}
                        {(reservation.createdAt || reservation.updatedAt) && (
                          <div className="text-xs text-gray-400 mt-1">
                            Created: {reservation.createdAt ? new Date(reservation.createdAt).toLocaleString() : 'N/A'}
                          </div>
                        )}
                        {reservation.reason && (
                          <div className="text-xs text-gray-500 mt-1">
                            Reason: {reservation.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? (isExpiringSoon ? 'expiring soon' : 'active') : (isExpired ? 'expired' : 'completed')}
                    </Badge>
                  </div>
                  {isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRelease(reservation)}
                      disabled={loading || releasingId === reservation.id || !canAdjustStock}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      {releasingId === reservation.id ? 'Releasing...' : 'Release'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {reservationList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Lock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No reservations yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

