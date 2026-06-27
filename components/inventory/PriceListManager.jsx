'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Edit, DollarSign, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/currency';

/**
 * PriceListManager Component
 * Manages multiple price lists, customer-wise pricing, quantity breaks
 * 
 * @param {Object} props
 * @param {any[]} [props.priceLists] - Array of price list objects
 * @param {any[]} [props.products] - Array of products
 * @param {any[]} [props.customers] - Array of customers
 * @param {(lists: any[]) => void} [props.onSave] - Save callback
 * @param {string} [props.currency] - Currency code
 */
export function PriceListManager({
  priceLists = [],
  products = [],
  customers = [],
  onSave,
  currency = 'PKR',
  /** When true, parent card already shows title, toolbar only, no duplicate heading */
  embedInCard = false,
}) {
  const [lists, setLists] = useState(priceLists);
  const [showForm, setShowForm] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const counterRef = useRef(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'standard', // standard, customer, quantity, seasonal, promotional
    customerId: '',
    validFrom: '',
    validTo: '',
    isActive: true,
    items: [],
  });

  const priceListTypes = [
    { value: 'standard', label: 'Standard Price List' },
    { value: 'customer', label: 'Customer-Specific' },
    { value: 'quantity', label: 'Quantity Break' },
    { value: 'seasonal', label: 'Seasonal Pricing' },
    { value: 'promotional', label: 'Promotional Pricing' },
  ];

  const handleSave = () => {
    const listData = {
      ...formData,
      id: editingList?.id || counterRef.current++,
      updatedAt: new Date().toISOString(),
    };

    if (editingList) {
      setLists(lists.map(l => l.id === editingList.id ? listData : l));
    } else {
      setLists([...lists, listData]);
    }

    if (onSave) {
      onSave(editingList ? lists.map(l => l.id === editingList.id ? listData : l) : [...lists, listData]);
    }

    setShowForm(false);
    setEditingList(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'standard',
      customerId: '',
      validFrom: '',
      validTo: '',
      isActive: true,
      items: [],
    });
  };

  const handleEdit = (list) => {
    setEditingList(list);
    setFormData(list);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this price list?')) {
      const updated = lists.filter(l => l.id !== id);
      setLists(updated);
      if (onSave) {
        onSave(updated);
      }
    }
  };

  const addPriceItem = (productId, price) => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId, price: parseFloat(price) || 0 }],
    });
  };

  return (
    <div className={embedInCard ? 'space-y-3' : 'space-y-4'}>
      <div className={`flex flex-nowrap items-center gap-2 ${embedInCard ? 'justify-end' : 'flex-wrap items-start justify-between gap-3'}`}>
        {!embedInCard && (
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Price Lists</h3>
            <p className="text-xs text-slate-500">Manage multiple price lists for different scenarios</p>
          </div>
        )}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="h-9 shrink-0 whitespace-nowrap" onClick={() => { resetForm(); setEditingList(null); }}>
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              New Price List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingList ? 'Edit Price List' : 'Create New Price List'}
              </DialogTitle>
              <DialogDescription>
                Configure custom pricing rules for specific customers, seasons, or quantities.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price List Name *</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Wholesale Prices"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <select
                    value={formData.type || 'standard'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                  >
                    {priceListTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {formData.type === 'customer' && (
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <select
                      value={formData.customerId || ''}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.validFrom || ''}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid To</Label>
                  <Input
                    type="date"
                    value={formData.validTo || ''}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Price Items */}
              <div className="space-y-2">
                <Label>Products & Prices</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto bg-slate-50/40">
                  {formData.items.map((item, index) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{product?.name || 'Unknown Product'}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={item.price ?? ''}
                            onChange={(e) => {
                              const updated = [...formData.items];
                              updated[index].price = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, items: updated });
                            }}
                            className="w-32"
                            min="0"
                            step="0.01"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                items: formData.items.filter((_, i) => i !== index),
                              });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        const productId = e.target.value;
                        if (productId) {
                          const product = products.find(p => p.id === productId);
                          addPriceItem(productId, product?.price || 0);
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Add Product</option>
                      {products
                        .filter(p => !formData.items.some(item => item.productId === p.id))
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.price, currency)}
                          </option>
                        ))}
                    </select>
                  </div>
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
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all" onClick={handleSave} disabled={!formData.name}>
                  {editingList ? 'Update' : 'Create'} Price List
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Price Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lists.map((list) => (
          <Card key={list.id} className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{list.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {priceListTypes.find(t => t.value === list.type)?.label}
                  </CardDescription>
                </div>
                <Badge variant={list.isActive ? 'default' : 'secondary'}>
                  {list.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Package className="w-4 h-4" />
                  <span>{list.items?.length || 0} products</span>
                </div>
                {list.customerId && (
                  <div className="flex items-center gap-2 text-gray-600 mt-2">
                    <Users className="w-4 h-4" />
                    <span>{customers.find(c => c.id === list.customerId)?.name || 'Customer'}</span>
                  </div>
                )}
                {list.validFrom && (
                  <div className="text-xs text-gray-500 mt-2">
                    Valid: {new Date(list.validFrom).toLocaleDateString()}
                    {list.validTo && ` - ${new Date(list.validTo).toLocaleDateString()}`}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(list)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(list.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lists.length === 0 && (
        <div
          className={`rounded-xl border border-dashed border-slate-300 bg-slate-50/40 text-center text-slate-500 ${embedInCard ? 'py-6' : 'py-10'}`}
        >
          <DollarSign className={`mx-auto mb-2 text-slate-400 ${embedInCard ? 'h-8 w-8' : 'h-10 w-10'}`} />
          <p className="text-sm font-medium">No price lists yet.</p>
          <p className="mt-0.5 text-xs">Use New Price List to create one.</p>
        </div>
      )}
    </div>
  );
}

