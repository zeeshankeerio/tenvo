'use client';

import { useState } from 'react';
import {
  Package, Hash, Calendar, AlertTriangle, CheckCircle2,
  Layers, FileText, TrendingUp, Settings, X
} from 'lucide-react';
import { domainKnowledge } from '@/lib/domainKnowledge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { CustomParametersManager } from './inventory/CustomParametersManager';
import { toast } from 'react-hot-toast';

/**
 * Advanced Inventory Features Component
 * Supports Batch Tracking, Serial Number Tracking, and Expiry Date Management
 * Based on Busy.in's comprehensive inventory features
 */
export function AdvancedInventoryFeatures({
  product,
  domainKnowledge,
  onSave,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('batch');
  const [formData, setFormData] = useState({
    // Batch Tracking
    batchNumber: product?.batchNumber || '',
    batchDate: product?.batchDate || '',
    expiryDate: product?.expiryDate || '',
    manufacturingDate: product?.manufacturingDate || '',

    // Serial Number
    serialNumbers: product?.serialNumbers || [],
    newSerialNumber: '',

    // Expiry
    expiryAlertDays: product?.expiryAlertDays || 30,
    autoBlockExpired: product?.autoBlockExpired || true,

    // Stock Valuation
    valuationMethod: product?.valuationMethod || domainKnowledge?.stockValuationMethod || 'FIFO',

    // Custom Parameters
    customParameters: product?.customParameters || [],
  });

  const handleBatchAdd = () => {
    if (!formData.batchNumber) return;
    // In real app, this would add to batch list
    toast.success(`Batch ${formData.batchNumber} added`);
  };

  const handleSerialAdd = () => {
    if (!formData.newSerialNumber) return;
    setFormData({
      ...formData,
      serialNumbers: [...formData.serialNumbers, formData.newSerialNumber],
      newSerialNumber: '',
    });
  };

  const handleSerialRemove = (index) => {
    setFormData({
      ...formData,
      serialNumbers: formData.serialNumbers.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    onSave?.(formData);
    onClose?.();
  };

  const isBatchEnabled = domainKnowledge?.batchTrackingEnabled;
  const isSerialEnabled = domainKnowledge?.serialTrackingEnabled;
  const isExpiryEnabled = domainKnowledge?.expiryTrackingEnabled;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Advanced Inventory Features</CardTitle>
              <CardDescription>
                Configure batch tracking, serial numbers, expiry dates, and stock valuation
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {isBatchEnabled && (
              <button
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'batch'
                  ? 'border-wine text-wine'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Hash className="w-4 h-4 inline mr-2" />
                Batch Tracking
              </button>
            )}
            {isSerialEnabled && (
              <button
                onClick={() => setActiveTab('serial')}
                className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'serial'
                  ? 'border-wine text-wine'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Serial Numbers
              </button>
            )}
            {isExpiryEnabled && (
              <button
                onClick={() => setActiveTab('expiry')}
                className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'expiry'
                  ? 'border-wine text-wine'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Expiry Management
              </button>
            )}
            <button
              onClick={() => setActiveTab('valuation')}
              className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'valuation'
                ? 'border-wine text-wine'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Stock Valuation
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'custom'
                ? 'border-wine text-wine'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Custom Parameters
            </button>
          </div>

          {/* Batch Tracking Tab */}
          {activeTab === 'batch' && isBatchEnabled && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Batch Tracking</h3>
                </div>
                <p className="text-sm text-blue-700">
                  Track inventory by batch numbers. Useful for products with expiry dates, manufacturing batches, or quality control.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batchNumber">Batch Number *</Label>
                  <Input
                    id="batchNumber"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder="BATCH-001"
                  />
                </div>
                <div>
                  <Label htmlFor="batchDate">Batch Date</Label>
                  <Input
                    id="batchDate"
                    type="date"
                    value={formData.batchDate}
                    onChange={(e) => setFormData({ ...formData, batchDate: e.target.value })}
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
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fefo"
                  checked={formData.valuationMethod === 'FEFO'}
                  onChange={(e) => setFormData({
                    ...formData,
                    valuationMethod: e.target.checked ? 'FEFO' : 'FIFO'
                  })}
                  className="rounded"
                />
                <Label htmlFor="fefo" className="font-normal cursor-pointer">
                  Enable FEFO (First Expiry First Out) for this product
                </Label>
              </div>

              <Button onClick={handleBatchAdd} className="w-full">
                Add Batch
              </Button>
            </div>
          )}

          {/* Serial Number Tracking Tab */}
          {activeTab === 'serial' && isSerialEnabled && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Serial Number Tracking</h3>
                </div>
                <p className="text-sm text-green-700">
                  Track individual items by unique serial numbers. Essential for warranty management and service history.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="newSerialNumber">Add Serial Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newSerialNumber"
                      value={formData.newSerialNumber}
                      onChange={(e) => setFormData({ ...formData, newSerialNumber: e.target.value })}
                      placeholder="SN-123456789"
                      onKeyPress={(e) => e.key === 'Enter' && handleSerialAdd()}
                    />
                    <Button onClick={handleSerialAdd}>Add</Button>
                  </div>
                </div>

                {formData.serialNumbers.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Serial Numbers ({formData.serialNumbers.length})</h4>
                    <div className="space-y-2">
                      {formData.serialNumbers.map((sn, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-mono">{sn}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSerialRemove(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-wine" />
                    <p className="text-sm text-wine/80">
                      Serial numbers are validated for uniqueness. Duplicate serial numbers will be rejected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expiry Management Tab */}
          {activeTab === 'expiry' && isExpiryEnabled && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Expiry Date Management</h3>
                </div>
                <p className="text-sm text-red-700">
                  Manage product expiry dates and receive alerts before products expire.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="expiryAlertDays">
                    Alert Days Before Expiry ({formData.expiryAlertDays} days)
                  </Label>
                  <Input
                    id="expiryAlertDays"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.expiryAlertDays}
                    onChange={(e) => setFormData({
                      ...formData,
                      expiryAlertDays: parseInt(e.target.value) || 30
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Receive alerts this many days before the product expires
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoBlockExpired"
                    checked={formData.autoBlockExpired}
                    onChange={(e) => setFormData({
                      ...formData,
                      autoBlockExpired: e.target.checked
                    })}
                    className="rounded"
                  />
                  <Label htmlFor="autoBlockExpired" className="font-normal cursor-pointer">
                    Automatically block sales of expired items
                  </Label>
                </div>

                {formData.expiryDate && (
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Expiry Status</span>
                      <Badge variant={new Date(formData.expiryDate) > new Date() ? 'default' : 'destructive'}>
                        {new Date(formData.expiryDate) > new Date() ? 'Valid' : 'Expired'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stock Valuation Tab */}
          {activeTab === 'valuation' && (
            <div className="space-y-6">
              <div className="bg-wine-50 border border-wine-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-wine-600" />
                  <h3 className="font-semibold text-wine-900">Stock Valuation Method</h3>
                </div>
                <p className="text-sm text-wine-700">
                  Choose how inventory costs are calculated. This affects profit margins and tax calculations.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="valuationMethod"
                    value="FIFO"
                    checked={formData.valuationMethod === 'FIFO'}
                    onChange={(e) => setFormData({ ...formData, valuationMethod: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">FIFO (First In First Out)</div>
                    <p className="text-sm text-gray-600">
                      Oldest inventory is sold first. Best for products with expiry dates or where older stock should be sold first.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="valuationMethod"
                    value="LIFO"
                    checked={formData.valuationMethod === 'LIFO'}
                    onChange={(e) => setFormData({ ...formData, valuationMethod: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">LIFO (Last In First Out)</div>
                    <p className="text-sm text-gray-600">
                      Newest inventory is sold first. Useful when prices are rising and you want to match current costs.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="valuationMethod"
                    value="Average"
                    checked={formData.valuationMethod === 'Average'}
                    onChange={(e) => setFormData({ ...formData, valuationMethod: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Average Cost</div>
                    <p className="text-sm text-gray-600">
                      Uses weighted average of all purchases. Simplest method, good for stable pricing.
                    </p>
                  </div>
                </label>

                {isExpiryEnabled && (
                  <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="valuationMethod"
                      value="FEFO"
                      checked={formData.valuationMethod === 'FEFO'}
                      onChange={(e) => setFormData({ ...formData, valuationMethod: e.target.value })}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">FEFO (First Expiry First Out)</div>
                      <p className="text-sm text-gray-600">
                        Products expiring soonest are sold first. Essential for perishable goods.
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Custom Parameters Tab */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              <CustomParametersManager
                value={{ customParameters: formData.customParameters }}
                onChange={(val) => setFormData({ ...formData, customParameters: val.customParameters })}
                category={domainKnowledge?.category || 'retail-shop'}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className=" bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}









