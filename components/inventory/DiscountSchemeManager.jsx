'use client';

import { useState, useRef } from 'react';
import { Percent, DollarSign, Tag, Users, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/currency';

/**
 * DiscountSchemeManager Component
 * Manages various discount schemes (percentage, fixed, quantity-based, etc.)
 * 
 * @param {Object} props
 * @param {any[]} [props.schemes] - Array of discount scheme objects
 * @param {any[]} [props.products] - Array of products
 * @param {any[]} [props.customers] - Array of customers
 * @param {(schemes: any[]) => void} [props.onSave] - Save callback
 * @param {string} [props.currency] - Currency code
 */
export function DiscountSchemeManager({
  schemes = [],
  products = [],
  customers = [],
  onSave,
  currency = 'PKR',
  embedInCard = false,
}) {
  const [schemeList, setSchemeList] = useState(schemes);
  const [showForm, setShowForm] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const counterRef = useRef(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage', // percentage, fixed, quantity, customer-category, product-category, bulk, loyalty
    value: 0,
    minQuantity: 0,
    maxQuantity: 0,
    customerCategory: '',
    productCategory: '',
    applicableProducts: [],
    applicableCustomers: [],
    validFrom: '',
    validTo: '',
    isActive: true,
  });

  const discountTypes = [
    { value: 'percentage', label: 'Percentage Discount', icon: Percent },
    { value: 'fixed', label: 'Fixed Amount Discount', icon: DollarSign },
    { value: 'quantity', label: 'Quantity-based Discount', icon: Package },
    { value: 'customer-category', label: 'Customer Category Discount', icon: Users },
    { value: 'product-category', label: 'Product Category Discount', icon: Package },
    { value: 'bulk', label: 'Bulk Discount', icon: Tag },
    { value: 'loyalty', label: 'Loyalty Discount', icon: Users },
  ];

  const handleSave = () => {
    const schemeData = {
      ...formData,
      id: editingScheme?.id || counterRef.current++,
      updatedAt: new Date().toISOString(),
    };

    if (editingScheme) {
      setSchemeList(schemeList.map(s => s.id === editingScheme.id ? schemeData : s));
    } else {
      setSchemeList([...schemeList, schemeData]);
    }

    if (onSave) {
      onSave(editingScheme ? schemeList.map(s => s.id === editingScheme.id ? schemeData : s) : [...schemeList, schemeData]);
    }

    setShowForm(false);
    setEditingScheme(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'percentage',
      value: 0,
      minQuantity: 0,
      maxQuantity: 0,
      customerCategory: '',
      productCategory: '',
      applicableProducts: [],
      applicableCustomers: [],
      validFrom: '',
      validTo: '',
      isActive: true,
    });
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setFormData(scheme);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this discount scheme?')) {
      const updated = schemeList.filter(s => s.id !== id);
      setSchemeList(updated);
      if (onSave) {
        onSave(updated);
      }
    }
  };

  const getDiscountDisplay = (scheme) => {
    switch (scheme.type) {
      case 'percentage':
        return `${scheme.value}%`;
      case 'fixed':
        return formatCurrency(scheme.value, currency);
      case 'quantity':
        return `${scheme.value}% (Qty: ${scheme.minQuantity}+)`;
      default:
        return `${scheme.value}%`;
    }
  };

  return (
    <div className={embedInCard ? 'space-y-3' : 'space-y-4'}>
      <div className={`flex flex-nowrap items-center gap-2 ${embedInCard ? 'justify-end' : 'flex-wrap items-start justify-between gap-3'}`}>
        {!embedInCard && (
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Discount Schemes</h3>
            <p className="text-xs text-slate-500">Manage discount rules and promotions</p>
          </div>
        )}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="h-9 shrink-0 whitespace-nowrap" onClick={() => { resetForm(); setEditingScheme(null); }}>
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              New Discount Scheme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingScheme ? 'Edit Discount Scheme' : 'Create New Discount Scheme'}
              </DialogTitle>
              <DialogDescription>
                Set up promotional rules, percentage discounts, or bulk pricing incentives.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Scheme Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Sale 20%"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                  >
                    {discountTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {formData.type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'} *
                  </Label>
                  <Input
                    type="number"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.type === 'percentage' ? '0-100' : '0.00'}
                    min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                    step={formData.type === 'percentage' ? '0.01' : '0.01'}
                    required
                  />
                </div>
                {(formData.type === 'quantity' || formData.type === 'bulk') && (
                  <>
                    <div className="space-y-2">
                      <Label>Minimum Quantity</Label>
                      <Input
                        type="number"
                        value={formData.minQuantity || ''}
                        onChange={(e) => setFormData({ ...formData, minQuantity: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum Quantity</Label>
                      <Input
                        type="number"
                        value={formData.maxQuantity || ''}
                        onChange={(e) => setFormData({ ...formData, maxQuantity: parseFloat(e.target.value) || 0 })}
                        placeholder="0 (unlimited)"
                        min="0"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid To</Label>
                  <Input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="font-normal">Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all" onClick={handleSave} disabled={!formData.name || formData.value <= 0}>
                  {editingScheme ? 'Update' : 'Create'} Scheme
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Discount Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {schemeList.map((scheme) => {
          const TypeIcon = discountTypes.find(t => t.value === scheme.type)?.icon || Tag;
          return (
            <Card key={scheme.id} className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-base">{scheme.name}</CardTitle>
                  </div>
                  <Badge variant={scheme.isActive ? 'default' : 'secondary'}>
                    {scheme.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {discountTypes.find(t => t.value === scheme.type)?.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="text-xl font-bold text-blue-600">
                  {getDiscountDisplay(scheme)}
                </div>
                {scheme.validFrom && (
                  <div className="text-xs text-gray-500">
                    Valid: {new Date(scheme.validFrom).toLocaleDateString()}
                    {scheme.validTo && ` - ${new Date(scheme.validTo).toLocaleDateString()}`}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(scheme)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(scheme.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {schemeList.length === 0 && (
        <div
          className={`rounded-xl border border-dashed border-slate-300 bg-slate-50/40 text-center text-slate-500 ${embedInCard ? 'py-6' : 'py-10'}`}
        >
          <Tag className={`mx-auto mb-2 text-slate-400 ${embedInCard ? 'h-8 w-8' : 'h-10 w-10'}`} />
          <p className="text-sm font-medium">No discount schemes yet.</p>
          <p className="mt-0.5 text-xs">Use New Discount Scheme to create one.</p>
        </div>
      )}
    </div>
  );
}

