'use client';

/**
 * BatchTrackingManager Component
 * 
 * Consolidated enterprise-grade batch tracking component that replaces:
 * - components/inventory/BatchManager.jsx
 * - components/domain/BatchTracking.jsx
 * 
 * Features:
 * - FEFO (First Expiry First Out) display
 * - Batch merge and split operations
 * - Expiry alerts (90/30/7 days)
 * - Pakistani textile roll/bale tracking
 * - Multi-location warehouse support
 * - Mode switching (register, view, manage)
 * 
 * @module components/inventory/BatchTrackingManager
 */

import { useState, useEffect } from 'react';
import { 
  Calendar, Package, AlertTriangle, Plus, X, Save, Trash2, 
  Merge, Split, Eye, Edit, MapPin, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useBatchTracking } from '@/lib/hooks/useBatchTracking';
import { formatCurrency } from '@/lib/currency';
import { t } from '@/lib/translations';
import toast from 'react-hot-toast';

export function BatchTrackingManager({
  product,
  businessId,
  category,
  mode = 'view', // 'register', 'view', 'manage'
  warehouseId,
  warehouses = [],
  onBatchCreated,
  onBatchUpdated,
  onClose
}) {
  const {
    batches,
    loading,
    error,
    addBatch,
    updateBatch,
    deleteBatch,
    mergeBatches,
    splitBatch,
    getNextExpiryBatch,
    getExpiringBatches
  } = useBatchTracking(product?.id, businessId, warehouseId);

  const [currentMode, setCurrentMode] = useState(mode);
  const [showAddForm, setShowAddForm] = useState(mode === 'register');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    quantity: '',
    cost_price: product?.cost_price || '',
    mrp: product?.mrp || product?.price || '',
    warehouse_id: warehouseId || '',
    notes: '',
    // Textile-specific fields (roll / thaan tracking)
    roll_number: '',
    length_meters: '',
    width_inches: '',
    weight_kg: '',
    fabric_type: '',
    finish_status: ''
  });

  // Split form state
  const [splitData, setSplitData] = useState({
    splits: [{ quantity: '', batch_number: '' }]
  });

  // Check if product is textile wholesale (alias `textile` → textile-wholesale)
  const isTextileCategory = resolveDomainKey(category) === 'textile-wholesale';

  // Approximate area in square yards from meters × inches (trade reference only)
  const calculateTextileArea = () => {
    if (!formData.length_meters || !formData.width_inches) return 0;
    const lengthYards = parseFloat(formData.length_meters) * 1.09361;
    return (lengthYards * parseFloat(formData.width_inches)) / 1296;
  };

  // Fabric / finish options from domain knowledge (fallback to common PK fabrics)
  const textileFieldConfig = isTextileCategory
    ? getDomainKnowledge('textile-wholesale')?.fieldConfig
    : null;
  const fabricTypes =
    textileFieldConfig?.fabrictype?.options?.length
      ? textileFieldConfig.fabrictype.options
      : ['Lawn', 'Cotton', 'Wash & Wear', 'Chiffon', 'Silk', 'Khaddar', 'Linen', 'Jacquard', 'Karandi', 'Organza'];

  const finishStatuses =
    textileFieldConfig?.korafinished?.options?.length
      ? textileFieldConfig.korafinished.options.map((opt) =>
          typeof opt === 'string'
            ? { value: opt, label: opt }
            : { value: opt.value, label: opt.label || opt.value }
        )
      : [
          { value: 'Kora', label: 'Kora (Raw)' },
          { value: 'Finished', label: 'Finished (Processed)' },
          { value: 'Dyed', label: 'Dyed' },
          { value: 'Printed', label: 'Printed' },
          { value: 'Embroidered', label: 'Embroidered' },
        ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buildTextileNotesPayload = () => {
    if (!isTextileCategory) return formData.notes || null;
    const textileMeta = {
      roll_number: formData.roll_number || undefined,
      length_meters: formData.length_meters ? Number(formData.length_meters) : undefined,
      width_inches: formData.width_inches ? Number(formData.width_inches) : undefined,
      weight_kg: formData.weight_kg ? Number(formData.weight_kg) : undefined,
      fabric_type: formData.fabric_type || undefined,
      finish_status: formData.finish_status || undefined,
    };
    const hasMeta = Object.values(textileMeta).some((v) => v != null && v !== '');
    if (!hasMeta && !formData.notes) return null;
    if (!hasMeta) return formData.notes || null;
    const base = formData.notes?.trim() ? `${formData.notes.trim()}\n` : '';
    return `${base}[textile] ${JSON.stringify(textileMeta)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const rollAsBatch =
        isTextileCategory && !formData.batch_number?.trim() && formData.roll_number?.trim()
          ? formData.roll_number.trim()
          : formData.batch_number;

      if (!rollAsBatch?.trim()) {
        toast.error(isTextileCategory ? 'Roll / bale number is required' : 'Batch number is required');
        return;
      }

      const batchData = {
        batch_number: rollAsBatch.trim(),
        manufacturing_date: formData.manufacturing_date || null,
        expiry_date: formData.expiry_date || null,
        quantity: parseFloat(formData.quantity),
        cost_price: parseFloat(formData.cost_price),
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        warehouse_id: formData.warehouse_id || null,
        notes: buildTextileNotesPayload()
      };

      const newBatch = await addBatch(batchData);
      
      toast.success(isTextileCategory ? 'Roll / bale added successfully' : 'Batch added successfully');
      resetForm();
      setShowAddForm(false);
      
      if (onBatchCreated) {
        onBatchCreated(newBatch);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add batch');
    }
  };

  const handleMergeBatches = async () => {
    if (selectedBatches.length < 2) {
      toast.error('Select at least 2 batches to merge');
      return;
    }

    try {
      const newBatchNumber = `MERGED-${Date.now()}`;
      const mergedBatch = await mergeBatches(selectedBatches, newBatchNumber);
      
      toast.success(`Merged ${selectedBatches.length} batches successfully`);
      setShowMergeDialog(false);
      setSelectedBatches([]);
      
      if (onBatchUpdated) {
        onBatchUpdated(mergedBatch);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to merge batches');
    }
  };

  const handleSplitBatch = async () => {
    if (!selectedBatch) return;

    try {
      const splits = splitData.splits.map(s => ({
        quantity: parseFloat(s.quantity),
        batch_number: s.batch_number || undefined
      }));

      const splitBatches = await splitBatch(selectedBatch.id, splits);
      
      toast.success(`Split batch into ${splits.length} batches successfully`);
      setShowSplitDialog(false);
      setSelectedBatch(null);
      setSplitData({ splits: [{ quantity: '', batch_number: '' }] });
      
      if (onBatchUpdated) {
        onBatchUpdated(splitBatches[0]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to split batch');
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
      await deleteBatch(batchId);
      toast.success('Batch deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete batch');
    }
  };

  const toggleBatchSelection = (batchId) => {
    setSelectedBatches(prev => 
      prev.includes(batchId) 
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const addSplitRow = () => {
    setSplitData(prev => ({
      splits: [...prev.splits, { quantity: '', batch_number: '' }]
    }));
  };

  const updateSplitRow = (index, field, value) => {
    setSplitData(prev => ({
      splits: prev.splits.map((split, i) => 
        i === index ? { ...split, [field]: value } : split
      )
    }));
  };

  const resetForm = () => {
    setFormData({
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      quantity: '',
      cost_price: product?.cost_price || '',
      mrp: product?.mrp || product?.price || '',
      warehouse_id: warehouseId || '',
      notes: '',
      roll_number: '',
      length_meters: '',
      width_inches: '',
      weight_kg: '',
      fabric_type: '',
      finish_status: ''
    });
  };

  const getExpiryBadge = (expiryStatus) => {
    const variants = {
      healthy: 'default',
      caution: 'secondary',
      warning: 'warning',
      critical: 'destructive',
      expired: 'destructive'
    };

    const labels = {
      healthy: 'Healthy',
      caution: 'Caution',
      warning: 'Warning',
      critical: 'Critical',
      expired: 'Expired'
    };

    return (
      <Badge variant={variants[expiryStatus] || 'default'}>
        {labels[expiryStatus] || expiryStatus}
      </Badge>
    );
  };

  const expiringBatches = getExpiringBatches(30);
  const nextExpiry = getNextExpiryBatch();

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batches.reduce((sum, b) => sum + b.availableQty, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                batches.reduce((sum, b) => sum + (b.availableQty * b.cost_price), 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Next Expiry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {nextExpiry ? (
                <>
                  <div className="font-semibold">{nextExpiry.batch_number}</div>
                  <div className="text-muted-foreground">
                    {nextExpiry.daysUntilExpiry} days
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No expiring batches</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowAddForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Batch
        </Button>
        
        {selectedBatches.length >= 2 && (
          <Button onClick={() => setShowMergeDialog(true)} variant="outline" size="sm">
            <Merge className="h-4 w-4 mr-2" />
            Merge Selected ({selectedBatches.length})
          </Button>
        )}
        
        {expiringBatches.length > 0 && (
          <Badge variant="warning" className="ml-auto">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {expiringBatches.length} Expiring Soon
          </Badge>
        )}
      </div>

      {/* Batch List (FEFO Sorted) */}
      <Card>
        <CardHeader>
          <CardTitle>Batches (FEFO Order)</CardTitle>
          <CardDescription>
            Sorted by expiry date - First Expiry First Out
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading batches...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No batches found. Add your first batch to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedBatches.includes(batch.id)}
                    onCheckedChange={() => toggleBatchSelection(batch.id)}
                  />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <div className="font-semibold">{batch.batch_number}</div>
                      {batch.warehouse && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {batch.warehouse.name}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Quantity</div>
                      <div className="font-medium">
                        {batch.availableQty.toFixed(2)}
                        {batch.reservedQty > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({batch.reservedQty} reserved)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Cost</div>
                      <div className="font-medium">{formatCurrency(batch.cost_price)}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-muted-foreground">Expiry</div>
                      <div className="font-medium">
                        {batch.expiry_date ? (
                          <>
                            {new Date(batch.expiry_date).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {batch.daysUntilExpiry > 0 
                                ? `${batch.daysUntilExpiry} days left`
                                : 'Expired'
                              }
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No expiry</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getExpiryBadge(batch.expiryStatus)}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBatch(batch);
                        setShowSplitDialog(true);
                      }}
                    >
                      <Split className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBatch(batch.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Batch Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Batch</DialogTitle>
            <DialogDescription>
              Enter batch details for {product?.name}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch_number">Batch Number *</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) => handleInputChange('batch_number', e.target.value)}
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
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="manufacturing_date">Manufacturing Date</Label>
                <Input
                  id="manufacturing_date"
                  type="date"
                  value={formData.manufacturing_date}
                  onChange={(e) => handleInputChange('manufacturing_date', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="cost_price">Cost Price *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="mrp">MRP</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => handleInputChange('mrp', e.target.value)}
                />
              </div>
              
              {warehouses.length > 0 && (
                <div className="col-span-2">
                  <Label htmlFor="warehouse_id">Warehouse</Label>
                  <Select
                    value={formData.warehouse_id}
                    onValueChange={(value) => handleInputChange('warehouse_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name} ({wh.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Pakistani Textile Tracking Fields (Requirements 9.1, 9.2, 9.3, 9.4) */}
              {isTextileCategory && (
                <>
                  <div className="col-span-2">
                    <div className="border-t pt-4 mb-2">
                      <h4 className="font-semibold text-sm">Textile Tracking Information</h4>
                      <p className="text-xs text-muted-foreground">Roll/bale specific details for textile products</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="roll_number">Roll Number</Label>
                    <Input
                      id="roll_number"
                      value={formData.roll_number}
                      onChange={(e) => handleInputChange('roll_number', e.target.value)}
                      placeholder="e.g., R-2024-001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fabric_type">Fabric Type</Label>
                    <Select
                      value={formData.fabric_type}
                      onValueChange={(value) => handleInputChange('fabric_type', value)}
                    >
                      <SelectTrigger id="fabric_type">
                        <SelectValue placeholder="Select fabric type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fabricTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="length_meters">Length (Meters)</Label>
                    <Input
                      id="length_meters"
                      type="number"
                      step="0.01"
                      value={formData.length_meters}
                      onChange={(e) => handleInputChange('length_meters', e.target.value)}
                      placeholder="e.g., 40"
                    />
                  </div>

                  <div>
                    <Label htmlFor="width_inches">Width (Inches)</Label>
                    <Input
                      id="width_inches"
                      type="number"
                      step="0.01"
                      value={formData.width_inches}
                      onChange={(e) => handleInputChange('width_inches', e.target.value)}
                      placeholder="e.g., 45"
                    />
                  </div>

                  <div>
                    <Label htmlFor="weight_kg">Weight (Kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      step="0.01"
                      value={formData.weight_kg}
                      onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                      placeholder="e.g., 5.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="finish_status">Finish Status</Label>
                    <Select
                      value={formData.finish_status}
                      onValueChange={(value) => handleInputChange('finish_status', value)}
                    >
                      <SelectTrigger id="finish_status">
                        <SelectValue placeholder="Select finish status" />
                      </SelectTrigger>
                      <SelectContent>
                        {finishStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Display calculated area */}
                  {formData.length_meters && formData.width_inches && (
                    <div className="col-span-2">
                      <div className="p-3 bg-accent/50 rounded-lg border">
                        <div className="text-sm font-medium">Approx. Area</div>
                        <div className="text-2xl font-bold text-primary">
                          {calculateTextileArea().toFixed(2)} sq. yards
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          From: ({formData.length_meters} m × {formData.width_inches}") converted to yards ÷ 1296
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2 bg-emerald-600 hover:bg-emerald-700 text-white" />
                Save Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Batches</DialogTitle>
            <DialogDescription>
              Merge {selectedBatches.length} selected batches into one
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm">
              <div className="font-semibold mb-2">Selected Batches:</div>
              {batches
                .filter(b => selectedBatches.includes(b.id))
                .map(b => (
                  <div key={b.id} className="flex justify-between py-1">
                    <span>{b.batch_number}</span>
                    <span>{b.availableQty} units</span>
                  </div>
                ))}
            </div>
            
            <div className="text-sm text-muted-foreground">
              The merged batch will use:
              <ul className="list-disc list-inside mt-2">
                <li>Weighted average cost</li>
                <li>Earliest expiry date</li>
                <li>Total combined quantity</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMergeBatches} disabled={loading}>
              <Merge className="h-4 w-4 mr-2" />
              Merge Batches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Batch</DialogTitle>
            <DialogDescription>
              Split {selectedBatch?.batch_number} into smaller batches
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm">
              <div className="font-semibold">Original Quantity:</div>
              <div>{selectedBatch?.availableQty} units</div>
            </div>
            
            {splitData.splits.map((split, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={split.quantity}
                    onChange={(e) => updateSplitRow(index, 'quantity', e.target.value)}
                    placeholder="Quantity"
                  />
                </div>
                <div>
                  <Label>Batch Number (optional)</Label>
                  <Input
                    value={split.batch_number}
                    onChange={(e) => updateSplitRow(index, 'batch_number', e.target.value)}
                    placeholder="Auto-generated"
                  />
                </div>
              </div>
            ))}
            
            <Button type="button" variant="outline" size="sm" onClick={addSplitRow}>
              <Plus className="h-4 w-4 mr-2" />
              Add Split
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSplitBatch} disabled={loading}>
              <Split className="h-4 w-4 mr-2" />
              Split Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BatchTrackingManager;
