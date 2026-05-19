'use client';

import { useState, useEffect } from 'react';
import { Grid3x3, Plus, Save, Trash2, Edit, Package, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { variantAPI } from '@/lib/api/variant';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

/**
 * Variant Matrix Editor
 * For retail, garments, furniture domains (size-color combinations)
 */
export function VariantMatrixEditor({
  product,
  businessId,
  onVariantsUpdated,
  onClose
}) {
  const [variants, setVariants] = useState([]);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateMatrix, setShowCreateMatrix] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  // Matrix creation form
  const [matrixForm, setMatrixForm] = useState({
    sizes: 'S,M,L,XL',
    colors: 'Red,Blue,Black,White',
    basePrice: product?.price || '',
    baseCostPrice: product?.cost_price || '',
    baseMrp: product?.mrp || '',
    priceModifiers: {} // { 'L': 100, 'XL': 200 }
  });

  // Variant edit form
  const [variantForm, setVariantForm] = useState({
    stock: '',
    price: '',
    costPrice: '',
    mrp: ''
  });

  useEffect(() => {
    if (product?.id) {
      loadVariants();
    }
  }, [product?.id]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await variantAPI.getByProduct(product.id);
      setVariants(data || []);

      // Load matrix structure
      const matrix = await variantAPI.getMatrix(product.id);
      setMatrixData(matrix);
    } catch (error) {
      console.error('Load variants error:', error);
      toast.error('Failed to load variants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatrix = async () => {
    const sizes = matrixForm.sizes.split(',').map(s => s.trim()).filter(s => s);
    const colors = matrixForm.colors.split(',').map(c => c.trim()).filter(c => c);

    if (sizes.length === 0 || colors.length === 0) {
      toast.error('Please enter at least one size and one color');
      return;
    }

    try {
      setLoading(true);

      // [SHIELD] DEFENSIVE CHECK
      if (!product || !product.id) {
        toast.error('Product context missing');
        return;
      }

      await variantAPI.createMatrix({
        business_id: businessId || product.business_id,
        product_id: product.id,
        base_price: parseFloat(matrixForm.basePrice) || product?.price || 0,
        base_cost_price: parseFloat(matrixForm.baseCostPrice) || product?.cost_price || 0,
        base_mrp: parseFloat(matrixForm.baseMrp) || product?.mrp || 0,
        sizes,
        colors,
        price_modifiers: matrixForm.priceModifiers
      });

      toast.success(`Created ${sizes.length * colors.length} variants`);
      setShowCreateMatrix(false);
      loadVariants();
      onVariantsUpdated?.();

    } catch (error) {
      console.error('Create matrix error:', error);
      toast.error(error.message || 'Failed to create variant matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVariant = async () => {
    if (!editingVariant) return;

    try {
      setLoading(true);

      // Update stock if changed
      if (variantForm.stock !== '') {
        const stockChange = parseFloat(variantForm.stock) - editingVariant.stock;
        if (stockChange !== 0) {
          await variantAPI.updateStock(editingVariant.id, businessId || product?.business_id, stockChange);
        }
      }

      // Update pricing if changed
      const pricingUpdate = {};
      if (variantForm.price !== '') pricingUpdate.price = parseFloat(variantForm.price);
      if (variantForm.costPrice !== '') pricingUpdate.costPrice = parseFloat(variantForm.costPrice);
      if (variantForm.mrp !== '') pricingUpdate.mrp = parseFloat(variantForm.mrp);

      if (Object.keys(pricingUpdate).length > 0) {
        await variantAPI.updatePricing(editingVariant.id, businessId || product?.business_id, pricingUpdate);
      }

      toast.success('Variant updated successfully');
      setEditingVariant(null);
      loadVariants();
      onVariantsUpdated?.();

    } catch (error) {
      console.error('Update variant error:', error);
      toast.error(error.message || 'Failed to update variant');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (variant) => {
    setEditingVariant(variant);
    setVariantForm({
      stock: variant.stock.toString(),
      price: variant.price?.toString() || '',
      costPrice: variant.cost_price?.toString() || '',
      mrp: variant.mrp?.toString() || ''
    });
  };

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  const totalValue = variants.reduce((sum, v) => sum + ((v.stock || 0) * (v.cost_price || 0)), 0);
  const lowStockVariants = variants.filter(v => v.stock <= (v.min_stock || 0));

  // Matrix view
  const renderMatrix = () => {
    if (!matrixData || matrixData.sizes.length === 0 || matrixData.colors.length === 0) {
      return null;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-100 font-semibold">Size / Color</th>
              {matrixData.colors.map(color => (
                <th key={color} className="border p-2 bg-gray-100 font-semibold">
                  {color}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.sizes.map(size => (
              <tr key={size}>
                <td className="border p-2 bg-gray-50 font-medium">{size}</td>
                {matrixData.colors.map(color => {
                  const key = `${size}-${color}`;
                  const variant = matrixData.matrix[key];

                  if (!variant) {
                    return <td key={color} className="border p-2 bg-gray-100"></td>;
                  }

                  const isLowStock = variant.isLowStock;

                  return (
                    <td
                      key={color}
                      className={`border p-2 cursor-pointer hover:bg-gray-50 transition ${isLowStock ? 'bg-red-50' : ''}`}
                      onClick={() => {
                        const fullVariant = variants.find(v => v.id === variant.id);
                        if (fullVariant) openEditDialog(fullVariant);
                      }}
                    >
                      <div className="text-center">
                        <div className={`text-lg font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {variant.stock}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(variant.price || 0, 'PKR')}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {variant.sku.split('-').pop()}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">
          Click on any cell to edit variant details
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Variant Matrix</h3>
          <p className="text-sm text-gray-600">{product?.name}</p>
        </div>
        {variants.length === 0 && (
          <Button
            onClick={() => setShowCreateMatrix(true)}
            className=" bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!product?.id}
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Create Matrix
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{variants.length}</div>
            <p className="text-sm text-gray-600">Total Variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{totalStock}</div>
            <p className="text-sm text-gray-600">Total Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue, 'PKR')}</div>
            <p className="text-sm text-gray-600">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{lowStockVariants.length}</div>
            <p className="text-sm text-gray-600">Low Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockVariants.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Low Stock Variants</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowStockVariants.map(variant => (
                <div key={variant.id} className="bg-white p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{variant.size} - {variant.color}</p>
                    <p className="text-sm text-gray-600">{variant.variant_sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-red-600">{variant.stock}</p>
                    <p className="text-xs text-gray-500">Min: {variant.min_stock || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matrix View */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Size-Color Matrix</CardTitle>
            <CardDescription>
              {matrixData?.sizes.length || 0} sizes × {matrixData?.colors.length || 0} colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderMatrix()}
          </CardContent>
        </Card>
      )}

      {/* Variants List */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Variants</CardTitle>
            <CardDescription>Detailed list view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {variants.map(variant => (
                <div
                  key={variant.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => openEditDialog(variant)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {variant.size && `${variant.size} - `}{variant.color}
                        </h4>
                        {variant.stock <= (variant.min_stock || 0) && (
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">SKU</p>
                          <p className="font-mono text-xs">{variant.variant_sku}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Stock</p>
                          <p className="font-semibold">{variant.stock}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price</p>
                          <p className="font-semibold">{formatCurrency(variant.price || 0, 'PKR')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cost</p>
                          <p className="font-semibold">{formatCurrency(variant.cost_price || 0, 'PKR')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Value</p>
                          <p className="font-semibold">
                            {formatCurrency((variant.stock || 0) * (variant.cost_price || 0), 'PKR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Edit className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {variants.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            {!product?.id ? (
              <>
                <Grid3x3 className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Context Missing</h3>
                <p className="text-gray-600 mb-4">
                  Please select a product from the Inventory tab to manage variants.
                </p>
              </>
            ) : (
              <>
                <Grid3x3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Variants Created</h3>
                <p className="text-gray-600 mb-4">
                  Create a size-color matrix to manage product variants
                </p>
                <Button onClick={() => setShowCreateMatrix(true)} className=" bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Create Variant Matrix
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Matrix Dialog */}
      <Dialog open={showCreateMatrix} onOpenChange={setShowCreateMatrix}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Variant Matrix</DialogTitle>
            <DialogDescription>
              Generate a grid of product variants based on size and color combinations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="sizes">Sizes (comma-separated)</Label>
              <Input
                id="sizes"
                value={matrixForm.sizes}
                onChange={(e) => setMatrixForm({ ...matrixForm, sizes: e.target.value })}
                placeholder="S, M, L, XL, XXL"
              />
              <p className="text-xs text-gray-500 mt-1">
                {matrixForm.sizes.split(',').filter(s => s.trim()).length} sizes
              </p>
            </div>

            <div>
              <Label htmlFor="colors">Colors (comma-separated)</Label>
              <Input
                id="colors"
                value={matrixForm.colors}
                onChange={(e) => setMatrixForm({ ...matrixForm, colors: e.target.value })}
                placeholder="Red, Blue, Black, White"
              />
              <p className="text-xs text-gray-500 mt-1">
                {matrixForm.colors.split(',').filter(c => c.trim()).length} colors
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="basePrice">Base Price</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={matrixForm.basePrice}
                  onChange={(e) => setMatrixForm({ ...matrixForm, basePrice: e.target.value })}
                  placeholder={product?.price || '0.00'}
                />
              </div>

              <div>
                <Label htmlFor="baseCostPrice">Base Cost</Label>
                <Input
                  id="baseCostPrice"
                  type="number"
                  step="0.01"
                  value={matrixForm.baseCostPrice}
                  onChange={(e) => setMatrixForm({ ...matrixForm, baseCostPrice: e.target.value })}
                  placeholder={product?.cost_price || '0.00'}
                />
              </div>

              <div>
                <Label htmlFor="baseMrp">Base MRP</Label>
                <Input
                  id="baseMrp"
                  type="number"
                  step="0.01"
                  value={matrixForm.baseMrp}
                  onChange={(e) => setMatrixForm({ ...matrixForm, baseMrp: e.target.value })}
                  placeholder={product?.mrp || '0.00'}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                This will create <strong>
                  {matrixForm.sizes.split(',').filter(s => s.trim()).length *
                    matrixForm.colors.split(',').filter(c => c.trim()).length}
                </strong> variants automatically
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateMatrix(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMatrix} disabled={loading} className=" bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? 'Creating...' : 'Create Matrix'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Variant Dialog */}
      <Dialog open={!!editingVariant} onOpenChange={() => setEditingVariant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Variant: {editingVariant?.size} - {editingVariant?.color}
            </DialogTitle>
            <DialogDescription>
              Update stock levels and pricing for this specific variant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="variantStock">Stock</Label>
              <Input
                id="variantStock"
                type="number"
                step="0.01"
                value={variantForm.stock}
                onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                placeholder={editingVariant?.stock?.toString() || '0'}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="variantPrice">Price</Label>
                <Input
                  id="variantPrice"
                  type="number"
                  step="0.01"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  placeholder={editingVariant?.price?.toString() || '0'}
                />
              </div>

              <div>
                <Label htmlFor="variantCost">Cost</Label>
                <Input
                  id="variantCost"
                  type="number"
                  step="0.01"
                  value={variantForm.costPrice}
                  onChange={(e) => setVariantForm({ ...variantForm, costPrice: e.target.value })}
                  placeholder={editingVariant?.cost_price?.toString() || '0'}
                />
              </div>

              <div>
                <Label htmlFor="variantMrp">MRP</Label>
                <Input
                  id="variantMrp"
                  type="number"
                  step="0.01"
                  value={variantForm.mrp}
                  onChange={(e) => setVariantForm({ ...variantForm, mrp: e.target.value })}
                  placeholder={editingVariant?.mrp?.toString() || '0'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingVariant(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateVariant} disabled={loading} className=" bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Updating...' : 'Update Variant'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
