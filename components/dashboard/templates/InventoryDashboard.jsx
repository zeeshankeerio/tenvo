'use client';

import { useMemo } from 'react';
import { EnhancedDashboard } from '@/components/EnhancedDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Warehouse,
  ClipboardList,
  TruckIcon,
  BarChart3,
  Plus
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * InventoryDashboard Component
 * 
 * Inventory staff dashboard optimized for stock management operations
 * Focused on inventory operations efficiency:
 * - Prominent StockLevelsWidget (all locations)
 * - ReorderAlertsWidget (items below reorder point)
 * - CycleCountTasksWidget (pending cycle counts)
 * - ReceivingQueueWidget (pending receipts)
 * - Integrates with existing CycleCountTask from Phase 2
 * 
 * Requirements: 6.6
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.userId - User ID
 * @param {string} props.category - Business category slug
 * @param {string} props.currency - Currency code (default: 'PKR')
 * @param {Function} props.onQuickAction - Quick action callback
 */
export function InventoryDashboard({ 
  businessId,
  userId,
  category,
  currency = 'PKR',
  onQuickAction 
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};

  // Mock stock levels data (in real implementation, fetch from API)
  const stockLevels = useMemo(() => ({
    totalValue: 2500000,
    totalProducts: 450,
    lowStockCount: 23,
    outOfStockCount: 5,
    byLocation: [
      {
        id: 1,
        name: 'Main Warehouse',
        city: 'Karachi',
        value: 1500000,
        products: 280,
        lowStock: 12,
        utilization: 75
      },
      {
        id: 2,
        name: 'Retail Store',
        city: 'Lahore',
        value: 800000,
        products: 150,
        lowStock: 8,
        utilization: 60
      },
      {
        id: 3,
        name: 'Distribution Center',
        city: 'Islamabad',
        value: 200000,
        products: 20,
        lowStock: 3,
        utilization: 30
      }
    ]
  }), []);

  // Mock reorder alerts (in real implementation, fetch from API)
  const reorderAlerts = useMemo(() => ({
    criticalCount: 5, // out of stock
    urgentCount: 18, // below reorder point
    warningCount: 12, // approaching reorder point
    items: [
      {
        id: 1,
        name: 'Paracetamol 500mg',
        sku: 'MED-001',
        currentStock: 0,
        reorderPoint: 100,
        reorderQuantity: 500,
        severity: 'critical',
        lastSold: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 2,
        name: 'Cotton Fabric - White',
        sku: 'FAB-045',
        currentStock: 15,
        reorderPoint: 50,
        reorderQuantity: 200,
        severity: 'urgent',
        lastSold: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        id: 3,
        name: 'Samsung Galaxy A54',
        sku: 'ELC-089',
        currentStock: 3,
        reorderPoint: 10,
        reorderQuantity: 25,
        severity: 'urgent',
        lastSold: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        id: 4,
        name: 'Lawn Shirt - Medium',
        sku: 'GAR-234',
        currentStock: 8,
        reorderPoint: 20,
        reorderQuantity: 50,
        severity: 'urgent',
        lastSold: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ]
  }), []);

  // Mock cycle count tasks (in real implementation, fetch from API)
  const cycleCountTasks = useMemo(() => ({
    pendingCount: 3,
    inProgressCount: 1,
    completedToday: 2,
    tasks: [
      {
        id: 1,
        name: 'Monthly Count - Zone A',
        scheduleId: 'cc-001',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        productCount: 45,
        completedCount: 0,
        assignedTo: userId,
        status: 'pending'
      },
      {
        id: 2,
        name: 'Quarterly Count - Electronics',
        scheduleId: 'cc-002',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        productCount: 120,
        completedCount: 35,
        assignedTo: userId,
        status: 'in_progress'
      },
      {
        id: 3,
        name: 'Weekly Count - Fast Movers',
        scheduleId: 'cc-003',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        priority: 'high',
        productCount: 30,
        completedCount: 0,
        assignedTo: userId,
        status: 'pending'
      }
    ]
  }), [userId]);

  // Mock receiving queue (in real implementation, fetch from API)
  const receivingQueue = useMemo(() => ({
    pendingCount: 8,
    partialCount: 3,
    totalValue: 450000,
    receipts: [
      {
        id: 1,
        poNumber: 'PO-2024-001',
        supplier: 'ABC Pharmaceuticals',
        expectedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        itemCount: 15,
        receivedCount: 0,
        value: 125000,
        status: 'overdue'
      },
      {
        id: 2,
        poNumber: 'PO-2024-002',
        supplier: 'XYZ Textiles',
        expectedDate: new Date(),
        itemCount: 25,
        receivedCount: 12,
        value: 200000,
        status: 'partial'
      },
      {
        id: 3,
        poNumber: 'PO-2024-003',
        supplier: 'Tech Distributors',
        expectedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        itemCount: 10,
        receivedCount: 0,
        value: 125000,
        status: 'pending'
      }
    ]
  }), []);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      urgent: 'bg-orange-100 text-orange-700 border-orange-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return colors[severity] || colors.warning;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      overdue: 'bg-red-100 text-red-700 border-red-200',
      partial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      pending: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[status] || colors.pending;
  };

  const formatDaysUntil = (date) => {
    const days = Math.ceil((date - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d ${t.overdue || 'overdue'}`;
    if (days === 0) return t.today || 'Today';
    if (days === 1) return t.tomorrow || 'Tomorrow';
    return `${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* Inventory Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {t.inventory_dashboard || 'Inventory Dashboard'}
          </h2>
          <p className="text-sm text-gray-500">
            {t.stock_management_operations || 'Stock management and operations'}
          </p>
        </div>
        <Badge className="bg-wine-600 text-white font-bold">
          {t.inventory_staff || 'Inventory Staff'}
        </Badge>
      </div>

      {/* Stock Levels Widget - PROMINENT */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                {t.stock_levels || 'Stock Levels'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.all_locations_overview || 'All locations overview'}
              </CardDescription>
            </div>
            <div className="p-2.5 rounded-2xl bg-wine-50 border border-wine-200 shadow-inner">
              <Warehouse className="w-5 h-5 text-wine-600" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-wine-50 to-wine-100/50 border border-wine-200">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-wine-600" />
                <span className="text-xs font-bold text-wine-700 uppercase tracking-wider">
                  {t.total_value || 'Total Value'}
                </span>
              </div>
              <div className="text-xl font-semibold text-wine-900">
                {formatCurrency(stockLevels.totalValue, currency)}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  {t.total_products || 'Total Products'}
                </span>
              </div>
              <div className="text-xl font-semibold text-blue-900">
                {stockLevels.totalProducts}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                  {t.low_stock || 'Low Stock'}
                </span>
              </div>
              <div className="text-xl font-semibold text-orange-900">
                {stockLevels.lowStockCount}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  {t.out_of_stock || 'Out of Stock'}
                </span>
              </div>
              <div className="text-xl font-semibold text-red-900">
                {stockLevels.outOfStockCount}
              </div>
            </div>
          </div>

          {/* Location Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              {t.by_location || 'By Location'}
            </div>
            {stockLevels.byLocation.map((location) => (
              <div 
                key={location.id}
                className="p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                onClick={() => onQuickAction?.('view-location-stock', location.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">{location.name}</div>
                      <div className="text-xs text-gray-500">{location.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(location.value, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {location.products} {t.products || 'products'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{t.utilization || 'Utilization'}</span>
                    <span className="font-bold text-gray-900">{location.utilization}%</span>
                  </div>
                  <Progress value={location.utilization} className="h-1.5" />
                  
                  {location.lowStock > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{location.lowStock} {t.low_stock_items || 'low stock items'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onQuickAction?.('stock-adjustment')}
              size="sm"
              variant="outline"
              className="flex-1 font-bold"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t.adjust_stock || 'Adjust Stock'}
            </Button>
            <Button
              onClick={() => onQuickAction?.('stock-transfer')}
              size="sm"
              variant="outline"
              className="flex-1 font-bold"
            >
              <TruckIcon className="w-4 h-4 mr-1" />
              {t.transfer_stock || 'Transfer Stock'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reorder Alerts Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.reorder_alerts || 'Reorder Alerts'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.items_below_reorder_point || 'Items below reorder point'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-red-50 border border-red-200 shadow-inner">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Alert Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200">
                <div className="text-2xl font-semibold text-red-700">
                  {reorderAlerts.criticalCount}
                </div>
                <div className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  {t.critical || 'Critical'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200">
                <div className="text-2xl font-semibold text-orange-700">
                  {reorderAlerts.urgentCount}
                </div>
                <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                  {t.urgent || 'Urgent'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
                <div className="text-2xl font-semibold text-yellow-700">
                  {reorderAlerts.warningCount}
                </div>
                <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
                  {t.warning || 'Warning'}
                </div>
              </div>
            </div>

            {/* Alert Items */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reorderAlerts.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${getSeverityColor(item.severity)} hover:opacity-80 transition-opacity cursor-pointer`}
                  onClick={() => onQuickAction?.('create-purchase-order', item.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-600">{item.sku}</div>
                    </div>
                    <Badge className={`${getSeverityColor(item.severity)} text-[10px] font-bold ml-2`}>
                      {item.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-600">{t.current || 'Current'}</div>
                      <div className="font-bold text-gray-900">{item.currentStock}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">{t.reorder_point || 'Reorder'}</div>
                      <div className="font-bold text-gray-900">{item.reorderPoint}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">{t.order_qty || 'Order Qty'}</div>
                      <div className="font-bold text-gray-900">{item.reorderQuantity}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action */}
            <button
              onClick={() => onQuickAction?.('view-all-reorder-alerts')}
              className="w-full text-xs font-bold text-red-600 hover:text-red-700 transition-colors py-2"
            >
              {t.view_all_alerts || 'View All Alerts'} ({reorderAlerts.criticalCount + reorderAlerts.urgentCount + reorderAlerts.warningCount}) →
            </button>
          </CardContent>
        </Card>

        {/* Cycle Count Tasks Widget */}
        <Card className="glass-card border-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-gray-900">
                  {t.cycle_count_tasks || 'Cycle Count Tasks'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.pending_cycle_counts || 'Pending cycle counts'}
                </CardDescription>
              </div>
              <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-inner">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Task Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
                <div className="text-2xl font-semibold text-yellow-700">
                  {cycleCountTasks.pendingCount}
                </div>
                <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
                  {t.pending || 'Pending'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                <div className="text-2xl font-semibold text-blue-700">
                  {cycleCountTasks.inProgressCount}
                </div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {t.in_progress || 'In Progress'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
                <div className="text-2xl font-semibold text-green-700">
                  {cycleCountTasks.completedToday}
                </div>
                <div className="text-xs font-bold text-green-600 uppercase tracking-wider">
                  {t.today || 'Today'}
                </div>
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cycleCountTasks.tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50 transition-colors cursor-pointer"
                  onClick={() => onQuickAction?.('start-cycle-count', task.scheduleId)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {task.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {task.productCount} {t.products || 'products'}
                      </div>
                    </div>
                    <Badge className={`${getPriorityColor(task.priority)} text-[10px] font-bold ml-2`}>
                      {task.priority.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600">
                        {t.due || 'Due'}: <span className="font-bold">{formatDaysUntil(task.dueDate)}</span>
                      </div>
                    </div>
                    
                    {task.status === 'in_progress' && (
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(task.completedCount / task.productCount) * 100} 
                          className="h-1.5 w-16"
                        />
                        <span className="text-xs font-bold text-gray-600">
                          {Math.round((task.completedCount / task.productCount) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action */}
            <button
              onClick={() => onQuickAction?.('view-all-cycle-counts')}
              className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-2"
            >
              {t.view_all_tasks || 'View All Tasks'} →
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Receiving Queue Widget */}
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                {t.receiving_queue || 'Receiving Queue'}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.pending_receipts || 'Pending receipts'}
              </CardDescription>
            </div>
            <div className="p-2.5 rounded-2xl bg-green-50 border border-green-200 shadow-inner">
              <TruckIcon className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Queue Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
              <div className="text-2xl font-semibold text-blue-700">
                {receivingQueue.pendingCount}
              </div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {t.pending || 'Pending'}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200">
              <div className="text-2xl font-semibold text-yellow-700">
                {receivingQueue.partialCount}
              </div>
              <div className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
                {t.partial || 'Partial'}
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
              <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">
                {t.total_value || 'Total Value'}
              </div>
              <div className="text-lg font-semibold text-green-900">
                {formatCurrency(receivingQueue.totalValue, currency)}
              </div>
            </div>
          </div>

          {/* Receipt List */}
          <div className="space-y-2">
            {receivingQueue.receipts.map((receipt) => (
              <div
                key={receipt.id}
                className={`p-3 rounded-lg border ${getStatusColor(receipt.status)} hover:opacity-80 transition-opacity cursor-pointer`}
                onClick={() => onQuickAction?.('receive-goods', receipt.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">
                      {receipt.poNumber}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {receipt.supplier}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(receipt.status)} text-[10px] font-bold ml-2`}>
                    {receipt.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <div className="text-gray-600">{t.expected || 'Expected'}</div>
                    <div className="font-bold text-gray-900">
                      {receipt.expectedDate.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t.items || 'Items'}</div>
                    <div className="font-bold text-gray-900">
                      {receipt.receivedCount}/{receipt.itemCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">{t.value || 'Value'}</div>
                    <div className="font-bold text-gray-900">
                      {formatCurrency(receipt.value, currency)}
                    </div>
                  </div>
                </div>
                
                {receipt.status === 'partial' && (
                  <Progress 
                    value={(receipt.receivedCount / receipt.itemCount) * 100} 
                    className="h-1.5"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onQuickAction?.('view-all-receipts')}
              className="flex-1 text-xs font-bold text-green-600 hover:text-green-700 transition-colors py-2"
            >
              {t.view_all_receipts || 'View All Receipts'} →
            </button>
            <Button
              onClick={() => onQuickAction?.('quick-receive')}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t.quick_receive || 'Quick Receive'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Dashboard - All Available Widgets */}
      <EnhancedDashboard
        businessId={businessId}
        category={category}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}



