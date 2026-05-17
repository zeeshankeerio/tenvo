'use client';

import { useState } from 'react';
import {
  Factory, Package, Plus, Edit, Trash2, FileText,
  TrendingUp, AlertCircle, CheckCircle2, Layers, Loader2, Play, CheckSquare, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Combobox } from './ui/combobox';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Progress } from './ui/progress';
import { manufacturingAPI } from '@/lib/api/manufacturing';
import { getManufacturingConfig } from '@/lib/utils/domainHelpers';

/**
 * @typedef {Object} ManufacturingModuleProps
 * @property {any[]} [products]
 * @property {any[]} [bomList]
 * @property {any[]} [productionOrders]
 * @property {any[]} [warehouses]
 * @property {string} [businessId]
 * @property {() => void} [onSave]
 * @property {() => void} [onBOMAdd]
 * @property {() => void} [onProductionOrderCreate]
 */

/** @type {React.FC<ManufacturingModuleProps>} */
export function ManufacturingModule({
  products = [],
  bomList = [],
  productionOrders = [],
  warehouses = [],
  businessId,
  onSave,
  onBOMAdd,
  onProductionOrderCreate
}) {
  const [activeTab, setActiveTab] = useState('bom');
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // BOM Form State
  const [bomData, setBomData] = useState({
    finishedProduct: '',
    name: '',
    components: [],
    wastagePercent: 0,
    newComponent: { product: '', quantity: '', unit: 'pcs' },
  });

  // Production Order Form State
  const [productionData, setProductionData] = useState({
    bom: '',
    quantity: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedCompletion: '',
    status: 'planned',
    warehouseId: '' // Need warehouse for stock moves
  });

  // Dialog State
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeleteBOMDialog, setShowDeleteBOMDialog] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState(null);
  const [bomToDelete, setBomToDelete] = useState(null);

  const handleAddComponent = () => {
    if (!bomData.newComponent.product || !bomData.newComponent.quantity) return;

    // Safety guard for circular dependency
    if (bomData.newComponent.product === bomData.finishedProduct) {
      toast.error("Circular dependency: Cannot add finished product as its own raw material.");
      setBomData({ ...bomData, newComponent: { ...bomData.newComponent, product: '' } });
      return;
    }

    // Check for existing component
    const existingIdx = bomData.components.findIndex(c => c.product === bomData.newComponent.product);
    if (existingIdx > -1) {
      toast.error("Component already added. Please update its quantity or remove/re-add.");
      return;
    }

    const product = products.find(p => p.id === bomData.newComponent.product);

    setBomData({
      ...bomData,
      components: [...bomData.components, {
        ...bomData.newComponent,
        productName: product?.name || 'Unknown',
        id: Date.now()
      }],
      newComponent: { product: '', quantity: '', unit: 'pcs' },
    });
  };

  const handleRemoveComponent = (id) => {
    setBomData({
      ...bomData,
      components: bomData.components.filter(c => c.id !== id),
    });
  };

  const handleSaveBOM = async () => {
    if (!bomData.finishedProduct || bomData.components.length === 0) {
      toast.error('Please select finished product and add components');
      return;
    }
    if (!businessId) {
      toast.error('System Error: Business Context Missing');
      return;
    }

    setIsLoading(true);
    try {
      const product = products.find(p => p.id === bomData.finishedProduct);

      if (bomData.components.some(c => c.product === bomData.finishedProduct)) {
        toast.error('Circular dependency detected: Finished product cannot be its own raw material.');
        return;
      }

      await manufacturingAPI.createBOM({
        business_id: businessId,
        product_id: bomData.finishedProduct,
        name: bomData.name || `${product?.name || 'Product'} Bill of Materials`,
        domain_data: {
          wastage_percent: Number(bomData.wastagePercent) || 0
        },
        materials: bomData.components.map(c => ({
          material_id: c.product,
          quantity: Number(c.quantity),
          unit: c.unit
        }))
      });

      toast.success('BOM created successfully');
      onSave?.(); // Refresh data

      setBomData({
        finishedProduct: '',
        name: '',
        components: [],
        wastagePercent: 0,
        newComponent: { product: '', quantity: '', unit: 'pcs' },
      });
      setShowBOMForm(false);
    } catch (error) {
      console.error('BOM Save Error:', error);
      toast.error(error.message || 'Failed to save BOM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProductionOrder = async () => {
    if (!productionData.bom || !productionData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Auto-select warehouse if only one
    let targetWarehouse = productionData.warehouseId;
    if (!targetWarehouse && warehouses.length === 1) targetWarehouse = warehouses[0].id;
    if (!targetWarehouse && products.length > 0) targetWarehouse = products[0].warehouse_id; // Absolute fallback

    if (!targetWarehouse) {
      toast.error('Please select a target warehouse');
      return;
    }

    setIsLoading(true);
    try {
      const selectedBOM = bomList.find(b => b.id === productionData.bom);

      await manufacturingAPI.createProductionOrder({
        business_id: businessId,
        product_id: selectedBOM.product_id, // Derived from BOM
        bom_id: productionData.bom,
        quantity_to_produce: Number(productionData.quantity),
        warehouse_id: targetWarehouse,
        status: 'planned',
        scheduled_date: productionData.startDate
      });

      toast.success('Production Order Created');
      onSave?.();

      setProductionData({
        bom: '', quantity: '', startDate: '', expectedCompletion: '', status: 'planned', warehouseId: ''
      });
      setShowProductionForm(false);
    } catch (error) {
      console.error('Order Create Error:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBOM = (bomId) => {
    setBomToDelete(bomId);
    setShowDeleteBOMDialog(true);
  };

  const confirmDeleteBOM = async () => {
    if (!bomToDelete) return;
    setIsLoading(true);
    try {
      await manufacturingAPI.deleteBOM(bomToDelete, businessId);
      toast.success('BOM deleted successfully');
      setShowDeleteBOMDialog(false);
      setBomToDelete(null);
      onSave?.();
    } catch (error) {
      toast.error(error.message || 'Failed to delete BOM');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBOMFormCost = () => {
    return bomData.components.reduce((acc, curr) => {
      const product = products.find(p => p.id === curr.product);
      return acc + (Number(curr.quantity) * Number(product?.cost_price || 0));
    }, 0);
  };

  const processStatusUpdate = async (orderId, status) => {
    setIsLoading(true);
    try {
      await manufacturingAPI.updateStatus(businessId, orderId, status);
      toast.success(`Order marked as ${status}`);
      onSave?.(); // Refresh data
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmCompletion = async () => {
    if (orderToComplete) {
      await processStatusUpdate(orderToComplete, 'completed');
      setShowCompleteDialog(false);
      setOrderToComplete(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (newStatus === 'completed') {
      setOrderToComplete(orderId);
      setShowCompleteDialog(true);
      return;
    }
    await processStatusUpdate(orderId, newStatus);
  };

  // Helper to get product name
  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown Product';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Manufacturing & Production</h2>
          <p className="text-gray-600">Manage Bill of Materials, Production Orders, and WIP</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setActiveTab('bom'); setShowBOMForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New BOM
          </Button>
          <Button onClick={() => { setActiveTab('production'); setShowProductionForm(true); }} className="bg-wine hover:bg-wine/90 text-white">
            <Factory className="w-4 h-4 mr-2" />
            Production Order
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Orders</CardTitle>
            <CardTitle className="text-2xl font-bold">{productionOrders.filter(o => o.status !== 'completed').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed This Month</CardTitle>
            <CardTitle className="text-2xl font-bold">
              {productionOrders.filter(o => o.status === 'completed' && new Date(o.updated_at) > new Date(new Date().setDate(1))).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total BOMs</CardTitle>
            <CardTitle className="text-2xl font-bold">{bomList.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('bom')}
          className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'bom'
            ? 'border-wine text-wine'
            : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          Bill of Materials
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'production'
            ? 'border-wine text-wine'
            : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <Factory className="w-4 h-4 inline mr-2" />
          Production Orders
        </button>
        <button
          onClick={() => setActiveTab('wip')}
          className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === 'wip'
            ? 'border-wine text-wine'
            : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Work in Progress
        </button>
      </div>

      {/* BOM Tab */}
      {activeTab === 'bom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bomList.length === 0 && <p className="text-gray-500 col-span-full">No BOMs defined yet. Create one to start.</p>}
          {bomList.map((bom) => {
            const totalCost = (bom.components || []).reduce((acc, curr) =>
              acc + (Number(curr.quantity) * Number(curr.cost_price || 0)), 0
            );

            return (
              <Card key={bom.id} className="hover:shadow-lg transition-shadow border-wine/10">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-wine">
                        {bom.name || 'Standard BOM'}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Package className="w-3 h-3" />
                        {bom.product_name || getProductName(bom.product_id)}
                        {bom.version && <Badge variant="outline" className="ml-2 text-[10px] h-4">v{bom.version}</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBOM(bom.id)}
                      className="text-gray-400 hover:text-red-500 -mt-1 -mr-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {(bom.components || []).map((comp, idx) => (
                      <div key={idx} className="text-sm flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span className="text-gray-700 truncate mr-2">{comp.productName}</span>
                        <span className="font-semibold whitespace-nowrap text-wine">
                          {comp.quantity} {comp.unit}
                        </span>
                      </div>
                    ))}
                    {(bom.components || []).length === 0 && (
                      <p className="text-xs text-gray-400 italic">No components defined.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Unit Cost</span>
                    <span className="text-lg font-bold text-wine">
                      ₨ {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Production Orders Tab */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          {productionOrders.length === 0 && <p className="text-gray-500">No production orders found.</p>}
          {productionOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{order.bomName || getProductName(order.product_id)}</h3>
                      <Badge variant={
                        order.status === 'completed' ? 'default' :
                          order.status === 'in-progress' ? 'secondary' : 'outline'
                      } className={order.status === 'completed' ? 'bg-green-600' : ''}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Target: <span className="font-bold">{order.quantity_to_produce}</span> units | Due: {new Date(order.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'planned' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'in-progress')} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Play className="w-4 h-4 mr-2" /> Start
                      </Button>
                    )}
                    {order.status === 'in-progress' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'completed')} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckSquare className="w-4 h-4 mr-2" /> Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* WIP Tab */}
      {activeTab === 'wip' && (
        <Card>
          <CardHeader>
            <CardTitle>Work in Progress (WIP)</CardTitle>
            <CardDescription>Live tracking of active production batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productionOrders.filter(o => o.status === 'in-progress').length === 0 && (
                <p className="text-gray-500 col-span-2 text-center py-10">No active production batches found.</p>
              )}
              {productionOrders.filter(o => o.status === 'in-progress').map((order) => {
                const startDate = new Date(order.created_at);
                const dueDate = new Date(order.scheduled_date);
                const today = new Date();
                const totalDays = Math.max(1, (dueDate - startDate) / (1000 * 60 * 60 * 24));
                const elapsedDays = Math.max(0, (today - startDate) / (1000 * 60 * 60 * 24));
                const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

                return (
                  <div key={order.id} className="border rounded-xl p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Badge className="mb-2 bg-blue-600">IN-PROGRESS</Badge>
                        <h4 className="font-bold text-lg text-slate-900">{order.product_name || getProductName(order.product_id)}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>Started {startDate.toLocaleDateString()}</span>
                          <span>*</span>
                          <span>Due {dueDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-700">{order.quantity_to_produce}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Target Units</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-600 italic">Production Timeline</span>
                        <span className="font-bold text-blue-700">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="bg-white/60 rounded-lg p-3 mb-4 border border-blue-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Material Consumption</p>
                      <div className="grid grid-cols-2 gap-2">
                        {order.components?.map((comp, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-600 truncate mr-2">{comp.productName}</span>
                            <span className="font-bold text-slate-900">{Number(comp.quantity) * Number(order.quantity_to_produce)} {comp.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-md transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Batch as Finished
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOM Form Modal */}
      {showBOMForm && (
        <Dialog open={showBOMForm} onOpenChange={setShowBOMForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Bill of Materials (BOM)</DialogTitle>
              <DialogDescription>Define components required to manufacture a finished product</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="finishedProduct">Finished Product *</Label>
                <Combobox
                  options={products.map(p => ({
                    value: p.id,
                    label: p.name,
                    description: `SKU: ${p.sku || 'N/A'}`
                  }))}
                  value={bomData.finishedProduct}
                  onChange={(val) => {
                    // Check for circular dependency
                    const existsInComponents = bomData.components.some(c => c.product === val);
                    const product = products.find(p => p.id === val);
                    const config = getManufacturingConfig(product?.category);
                    
                    if (existsInComponents) {
                      toast.error("Circular dependency prevented! Removing this product from raw materials.");
                      setBomData({
                        ...bomData,
                        finishedProduct: val,
                        wastagePercent: config.defaultLoss,
                        components: bomData.components.filter(c => c.product !== val)
                      });
                    } else {
                      setBomData({ 
                        ...bomData, 
                        finishedProduct: val,
                        wastagePercent: config.defaultLoss 
                      });
                    }
                  }}
                  placeholder="Select Finished Product"
                />
              </div>

              <div>
                <Label htmlFor="bomName">BOM Name (Optional)</Label>
                <Input
                  id="bomName"
                  placeholder="e.g. Standard Production Recipe"
                  value={bomData.name}
                  onChange={e => setBomData({ ...bomData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="wastage" className="text-xs font-bold text-gray-500 uppercase">Process Wastage (%)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="w-3 h-3 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-60 text-xs">Factor for material loss during production (e.g. scrap, evaporation). Final consumption = BOM Qty × (1 + Wastage%).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wine/40" />
                    <Input
                      id="wastage"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-10 font-bold"
                      value={bomData.wastagePercent}
                      onChange={e => setBomData({ ...bomData, wastagePercent: e.target.value })}
                    />
                  </div>
                </div>
                <div className="bg-wine-50/50 p-3 rounded-xl border border-wine-100/50 flex flex-col justify-center">
                  <span className="text-[10px] font-black text-wine/60 uppercase tracking-widest mb-1">Domain Logic</span>
                  <p className="text-xs text-wine/80 font-medium leading-tight">
                    {(() => {
                        const product = products.find(p => p.id === bomData.finishedProduct);
                        if (!product) return "Select a product to see domain recommendations.";
                        const config = getManufacturingConfig(product.category);
                        return `Recommended loss for ${product.category}: ${config.defaultLoss}%. Wastage tracking is ${config.trackWastage ? "REQUIRED" : "OPTIONAL"}.`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Raw Materials / Components</h4>
                <div className="space-y-3 mb-4">
                  {bomData.components.map((comp) => (
                    <div key={comp.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 font-medium">{comp.productName}</span>
                      <span className="font-bold">{comp.quantity} {comp.unit}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveComponent(comp.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {bomData.components.length === 0 && <p className="text-sm text-gray-400 italic">No components added yet.</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="md:col-span-1">
                    <Combobox
                      options={products.filter(p => p.id !== bomData.finishedProduct).map(p => ({
                        value: p.id,
                        label: p.name,
                        description: `Stock: ${p.stock}`
                      }))}
                      value={bomData.newComponent.product}
                      onChange={(val) => setBomData({
                        ...bomData,
                        newComponent: { ...bomData.newComponent, product: val }
                      })}
                      placeholder="Select Raw Material"
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={bomData.newComponent.quantity || ''}
                    onChange={(e) => setBomData({
                      ...bomData,
                      newComponent: { ...bomData.newComponent, quantity: e.target.value }
                    })}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Unit"
                      value={bomData.newComponent.unit || ''}
                      onChange={(e) => setBomData({
                        ...bomData,
                        newComponent: { ...bomData.newComponent, unit: e.target.value }
                      })}
                    />
                    <Button onClick={handleAddComponent} disabled={!bomData.newComponent.product}>
                      <Plus className="w-4 h-4" /> Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center py-2 px-4 bg-wine/5 rounded-lg border border-wine/10 mb-4">
                <span className="text-sm font-medium text-wine">Estimated Production Cost:</span>
                <span className="text-lg font-bold text-wine">
                  ₨ {calculateBOMFormCost().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowBOMForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBOM} disabled={isLoading} className="bg-wine hover:bg-wine/90 text-white">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save BOM'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Production Order Form Modal */}
      {showProductionForm && (
        <Dialog open={showProductionForm} onOpenChange={setShowProductionForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Production Order</DialogTitle>
              <DialogDescription>Start a new production order based on BOM</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="bom">Select BOM *</Label>
                <Combobox
                  options={bomList.map(b => ({
                    value: String(b.id),
                    label: b.name || b.finishedProductName || getProductName(b.product_id),
                    description: b.components ? `${b.components.length} components` : ''
                  }))}
                  value={String(productionData.bom || '')}
                  onChange={(val) => setProductionData({ ...productionData, bom: val })}
                  placeholder="Search BOMs..."
                  emptyText="No BOMs found"
                />
                {productionData.bom && productionData.quantity && (
                  <div className="mt-2 text-xs space-y-1">
                    <p className="font-semibold text-gray-500 uppercase tracking-wider">Stock Check for {productionData.quantity} units:</p>
                    {bomList.find(b => b.id === productionData.bom)?.components?.map((comp, idx) => {
                      const product = products.find(p => p.id === comp.material_id);
                      const required = Number(comp.quantity) * Number(productionData.quantity);
                      const available = Number(product?.stock || 0);
                      const isShort = available < required;
                      return (
                        <div key={idx} className={`flex justify-between ${isShort ? 'text-red-500 font-medium' : 'text-green-600'}`}>
                          <span>{comp.productName}:</span>
                          <span>{available} avail / {required} req</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="quantity">Quantity to Produce *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={productionData.quantity || ''}
                  onChange={(e) => setProductionData({ ...productionData, quantity: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={productionData.startDate || ''}
                    onChange={(e) => setProductionData({ ...productionData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="warehouse">Target Warehouse *</Label>
                  <Combobox
                    options={[
                      ...warehouses.map(w => ({
                        value: String(w.id),
                        label: w.name,
                        description: w.location || ''
                      })),
                      ...(warehouses.length === 0 && products.length > 0 && products[0].warehouse_id
                        ? [{ value: String(products[0].warehouse_id), label: 'Default Warehouse' }]
                        : []
                      )
                    ]}
                    value={String(productionData.warehouseId || '')}
                    onChange={(val) => setProductionData({ ...productionData, warehouseId: val })}
                    placeholder="Select warehouse..."
                    emptyText="No warehouses found"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowProductionForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProductionOrder} disabled={isLoading} className="bg-wine hover:bg-wine/90 text-white">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Order'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Production Order?</DialogTitle>
            <DialogDescription>
              This will deduct raw materials from stock and add finished goods to inventory.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCompletion} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Completion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteBOMDialog} onOpenChange={setShowDeleteBOMDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete BOM?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this Bill of Materials? This action cannot be undone and may fail if the BOM is used in active production orders.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteBOMDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDeleteBOM} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete BOM'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}









