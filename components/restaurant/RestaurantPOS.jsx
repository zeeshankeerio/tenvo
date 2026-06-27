'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UtensilsCrossed, Search, Plus, Minus, Trash2, ChevronRight,
    Clock, Users, Send, Printer, ArrowLeft, Receipt, CreditCard,
    Banknote, Smartphone, Check, ShoppingBag, Bike, Home, Maximize, Minimize
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getTablesAction, createRestaurantOrderAction, updateTableStatusAction, settleRestaurantOrderAction } from '@/lib/actions/standard/restaurant';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

// ===============================================================
// ORDER TYPE SELECTOR
// ===============================================================

const ORDER_TYPES = [
    { key: 'dine-in', label: 'Dine In', icon: UtensilsCrossed, color: 'bg-indigo-500' },
    { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag, color: 'bg-amber-500' },
    { key: 'delivery', label: 'Delivery', icon: Bike, color: 'bg-emerald-500' },
];

function OrderTypeSelector({ selected, onSelect }) {
    return (
        <div className="flex gap-2">
            {ORDER_TYPES.map(type => {
                const Icon = type.icon;
                const isActive = selected === type.key;
                return (
                    <button
                        key={type.key}
                        onClick={() => onSelect(type.key)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                            isActive
                                ? `${type.color} text-white shadow-lg`
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {type.label}
                    </button>
                );
            })}
        </div>
    );
}

// ===============================================================
// MENU CATEGORY BAR
// ===============================================================

function CategoryBar({ categories, active, onSelect }) {
    return (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
                onClick={() => onSelect('all')}
                className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all',
                    active === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
            >
                All
            </button>
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all capitalize',
                        active === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}

// ===============================================================
// MENU ITEM CARD
// ===============================================================

function MenuItemCard({ product, onAdd, currency }) {
    // Only show LOW badge if stock is explicitly tracked (stock > 0 previously, now <= 5)
    // Items with stock=0 that have never been stocked are untracked menu items, no badge
    const stockTracked = product.stock_status === 'low_stock' || (product.stock !== null && product.stock !== undefined && product.stock > 0 && product.stock <= 5);
    const isLow = stockTracked;
    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAdd(product)}
            className="bg-white rounded-xl border border-gray-100 p-3 text-left hover:shadow-md hover:border-indigo-200 transition-all group relative"
        >
            {isLow && (
                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 bg-red-500 text-white font-semibold rounded-full">LOW</span>
            )}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate capitalize">{product.category || 'Uncategorized'}</p>
                </div>
                <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-indigo-600" />
                </div>
            </div>
            <p className="text-base font-semibold text-indigo-600 mt-2">{currency} {Number(product.price || product.selling_price || 0).toLocaleString()}</p>
        </motion.button>
    );
}

// ===============================================================
// ORDER ITEM ROW
// ===============================================================

function OrderItemRow({ item, onQty, onRemove, currency }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0"
        >
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400">@ {currency} {Number(item.price || item.selling_price || 0).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onQty(item.id, -1)} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <Minus className="w-3 h-3 text-gray-500" />
                </button>
                <span className="w-7 text-center text-sm font-semibold text-gray-800">{item.quantity}</span>
                <button onClick={() => onQty(item.id, 1)} className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                    <Plus className="w-3 h-3 text-indigo-600" />
                </button>
            </div>
            <span className="text-sm font-bold text-gray-800 w-20 text-right shrink-0">
                {currency} {(item.quantity * Number(item.price || item.selling_price || 0)).toLocaleString()}
            </span>
            <button onClick={() => onRemove(item.id)} className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center transition-colors">
                <Trash2 className="w-3 h-3 text-red-400" />
            </button>
        </motion.div>
    );
}

// ===============================================================
// MAIN RESTAURANT POS
// ===============================================================

export function RestaurantPOS({ businessId, products = [], onCompleteSale, onOrderComplete, onOrderSent, currency = 'Rs.', taxConfig }) {
    const { business } = useBusiness();
    const effectiveBusinessId = businessId || business?.id;

    // State
    const [orderType, setOrderType] = useState('dine-in');
    const [selectedTable, setSelectedTable] = useState(null);
    const [tables, setTables] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [covers, setCovers] = useState(2);
    const [waiterNote, setWaiterNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [currentOrderId, setCurrentOrderId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = React.useRef(null);
    // Customer info for takeaway/delivery
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);

    // --- Fullscreen Logic ----------------------------------------------------

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Load tables
    useEffect(() => {
        if (!effectiveBusinessId) return;
        getTablesAction(effectiveBusinessId).then(res => {
            if (res.success) setTables(res.tables || []);
        });
    }, [effectiveBusinessId]);

    // Categories
    const categories = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        return cats.sort();
    }, [products]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        let filtered = products;
        if (activeCategory !== 'all') {
            filtered = filtered.filter(p => p.category === activeCategory);
        }
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(p =>
                p.name?.toLowerCase().includes(term) ||
                p.sku?.toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [products, activeCategory, search]);

    // Order calculations
    const subtotal = useMemo(() =>
        orderItems.reduce((sum, item) => sum + (item.quantity * Number(item.price || item.selling_price || 0)), 0),
        [orderItems]);
    // Priority: taxConfig.sales_tax_rate -> 16.0 (fallback for restaurant service tax)
    const effectiveTaxRate = (taxConfig?.sales_tax_rate ?? 16.0) / 100;
    const tax = Math.round(subtotal * effectiveTaxRate);
    const total = subtotal + tax + (orderType === 'delivery' ? deliveryFee : 0);

    // Handlers
    const addItem = useCallback((product) => {
        setOrderItems(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    }, []);

    const updateQty = useCallback((id, delta) => {
        setOrderItems(prev => prev.map(i => {
            if (i.id !== id) return i;
            const newQty = i.quantity + delta;
            return newQty <= 0 ? null : { ...i, quantity: newQty };
        }).filter(Boolean));
    }, []);

    const removeItem = useCallback((id) => {
        setOrderItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const handleSendToKitchen = async () => {
        if (!effectiveBusinessId || orderItems.length === 0) return;
        // Delivery validation
        if (orderType === 'delivery' && !customerName.trim()) {
            toast.error('Customer name is required for delivery orders'); return;
        }
        if (orderType === 'delivery' && !customerPhone.trim()) {
            toast.error('Customer phone is required for delivery orders'); return;
        }
        if (orderType === 'delivery' && !deliveryAddress.trim()) {
            toast.error('Delivery address is required'); return;
        }
        // Dine-in validation, only enforce table selection if tables are configured
        if (orderType === 'dine-in' && tables.length > 0 && !selectedTable) {
            toast.error('Please select a table for dine-in orders'); return;
        }
        setIsProcessing(true);
        try {
            // Normalize order type to DB format (dine_in not dine-in)
            const dbOrderType = orderType === 'dine-in' ? 'dine_in' : orderType;
            const result = await createRestaurantOrderAction({
                businessId: effectiveBusinessId,
                tableId: selectedTable?.id || null,
                orderType: dbOrderType,
                covers: orderType === 'dine-in' ? covers : 1,
                customerName: customerName.trim() || null,
                customerPhone: customerPhone.trim() || null,
                deliveryAddress: deliveryAddress.trim() || null,
                deliveryFee: deliveryFee || 0,
                items: orderItems.map(i => ({
                    productId: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    price: Number(i.price || i.selling_price || 0),
                    notes: '',
                })),
                notes: waiterNote,
            });

            if (result.success) {
                toast.success(`Order #${result.order?.order_number || 'NEW'} sent to kitchen`, { icon: '🔥' });
                setCurrentOrderId(result.order?.id || null);
                onOrderSent?.();
                setShowPayment(true);
            } else {
                toast.error(result.error || 'Failed to create order');
            }
        } catch (err) {
            toast.error('Failed to send order');
            console.error('[RestaurantPOS] Send to kitchen failed:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePayment = async () => {
        if (!paymentMethod) { toast.error('Select payment method'); return; }
        if (!currentOrderId) { toast.error('Send order to kitchen first'); return; }
        setIsProcessing(true);
        try {
            const result = await settleRestaurantOrderAction({
                businessId: effectiveBusinessId,
                orderId: currentOrderId,
                paymentMethod,
                amount: total,
            });

            if (result.success) {
                toast.success('Payment processed!', { icon: '✅' });
                // Notify parent for dashboard refresh only, do NOT call onCompleteSale
                // (that triggers POS invoice logic which is incompatible with restaurant orders)
                onOrderComplete?.(result);
                // Reset all state for next order
                setOrderItems([]);
                setSelectedTable(null);
                setPaymentMethod('');
                setWaiterNote('');
                setCurrentOrderId(null);
                setShowPayment(false);
                setCustomerName('');
                setCustomerPhone('');
                setDeliveryAddress('');
                setDeliveryFee(0);
                // Refresh tables
                getTablesAction(effectiveBusinessId).then(res => {
                    if (res.success) setTables(res.tables || []);
                });
            } else {
                toast.error(result.error || 'Payment failed');
            }
        } catch (err) {
            toast.error('Payment processing failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const availableTables = tables.filter(t => t.status === 'available' || t.status === 'reserved');
    const occupiedTables = tables.filter(t => t.status === 'occupied');

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex bg-gray-50 overflow-hidden border border-gray-200 transition-all",
                isFullscreen ? "h-screen w-screen rounded-0 border-0" : "h-[calc(100vh-120px)] rounded-2xl"
            )}
        >
            {/* --- Left Panel: Table & Menu ------------------------------- */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Order Type + Table Selection */}
                <div className="p-4 bg-white border-b border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <OrderTypeSelector selected={orderType} onSelect={(type) => {
                            setOrderType(type);
                            // Clear table when leaving dine-in
                            if (type !== 'dine-in') setSelectedTable(null);
                            // Clear customer fields when switching
                            setCustomerName('');
                            setCustomerPhone('');
                            setDeliveryAddress('');
                            setDeliveryFee(0);
                        }} />
                        {orderType === 'dine-in' && (
                            <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="number" min="1" max="20" value={covers}
                                    onChange={e => setCovers(parseInt(e.target.value) || 1)}
                                    className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg py-1"
                                />
                                <span className="text-xs text-gray-400">covers</span>
                            </div>
                        )}
                    </div>

                    {/* Takeaway: optional customer name + phone */}
                    {orderType === 'takeaway' && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Customer name (optional)"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none"
                            />
                            <input
                                type="tel"
                                placeholder="Phone (optional)"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className="w-36 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 outline-none"
                            />
                        </div>
                    )}

                    {/* Delivery: required name, phone + address */}
                    {orderType === 'delivery' && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Customer name *"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none"
                                />
                                <input
                                    type="tel"
                                    placeholder="Phone *"
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    className="w-36 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Delivery address *"
                                    value={deliveryAddress}
                                    onChange={e => setDeliveryAddress(e.target.value)}
                                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none"
                                />
                                <input
                                    type="number"
                                    placeholder="Delivery fee"
                                    value={deliveryFee || ''}
                                    onChange={e => setDeliveryFee(Number(e.target.value) || 0)}
                                    className="w-28 text-xs px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-200 outline-none"
                                    min="0"
                                />
                            </div>
                        </div>
                    )}

                    {/* Table Grid (dine-in only) */}
                    {orderType === 'dine-in' && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {tables.map(table => {
                                const isSelected = selectedTable?.id === table.id;
                                const statusColors = {
                                    available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    occupied: 'bg-red-50 text-red-500 border-red-200',
                                    reserved: 'bg-amber-50 text-amber-600 border-amber-200',
                                };
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => table.status === 'available' && setSelectedTable(table)}
                                        disabled={table.status === 'occupied'}
                                        className={cn(
                                            'shrink-0 w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all',
                                            isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' :
                                                statusColors[table.status] || statusColors.available,
                                            table.status === 'occupied' && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        <span className="text-xs font-semibold">{table.table_number || table.name}</span>
                                        <span className="text-[10px] font-bold mt-0.5">{table.capacity || 4} seats</span>
                                    </button>
                                );
                            })}
                            {tables.length === 0 && (
                                <p className="text-xs text-gray-400 py-4">No tables configured yet</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Search + Category */}
                <div className="p-3 bg-white border-b border-gray-50 space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <CategoryBar categories={categories} active={activeCategory} onSelect={setActiveCategory} />
                </div>

                {/* Menu Grid */}
                <div className="flex-1 overflow-y-auto p-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {filteredProducts.map(p => (
                            <MenuItemCard key={p.id} product={p} onAdd={addItem} currency={currency} />
                        ))}
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-semibold">No items found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Right Panel: Order Cart -------------------------------- */}
            <div className="w-[360px] bg-white border-l border-gray-200 flex flex-col">
                {/* Order Header */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">Current Order</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {orderType === 'dine-in' && selectedTable ? `Table ${selectedTable.table_number || selectedTable.name} * ${covers} covers` :
                                    orderType === 'takeaway' ? 'Takeaway Order' : 'Delivery Order'}
                            </p>
                        </div>
                        {orderItems.length > 0 && (
                            <button
                                onClick={() => setOrderItems([])}
                                className="text-[10px] text-red-400 font-bold hover:text-red-600"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 z-20"
                    >
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Order Items */}
                <div className="flex-1 overflow-y-auto px-4 py-2">
                    <AnimatePresence>
                        {orderItems.map(item => (
                            <OrderItemRow
                                key={item.id}
                                item={item}
                                onQty={updateQty}
                                onRemove={removeItem}
                                currency={currency}
                            />
                        ))}
                    </AnimatePresence>
                    {orderItems.length === 0 && (
                        <div className="text-center py-12 text-gray-300">
                            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs font-semibold">Add items from the menu</p>
                        </div>
                    )}
                </div>

                {/* Waiter Note */}
                {orderItems.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-50">
                        <input
                            type="text"
                            placeholder="Kitchen note (e.g. no onions)..."
                            value={waiterNote}
                            onChange={e => setWaiterNote(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-200 outline-none"
                        />
                    </div>
                )}

                {/* Totals */}
                <div className="p-4 border-t border-gray-100 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-bold">{currency} {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Service Tax ({Math.round(effectiveTaxRate * 100)}%)</span>
                        <span className="font-bold">{currency} {tax.toLocaleString()}</span>
                    </div>
                    {orderType === 'delivery' && deliveryFee > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Delivery Fee</span>
                            <span className="font-bold">{currency} {deliveryFee.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-semibold text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span>
                        <span>{currency} {total.toLocaleString()}</span>
                    </div>
                </div>

                {/* Payment Area */}
                {showPayment ? (
                    <div className="p-4 border-t border-gray-100 space-y-3">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPayment(false)} className="text-xs text-gray-400 hover:text-gray-600">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-600">Select Payment</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'cash', label: 'Cash', icon: Banknote },
                                { key: 'card', label: 'Card', icon: CreditCard },
                                { key: 'digital_wallet', label: 'Digital', icon: Smartphone },
                                { key: 'staff_account', label: 'Staff', icon: Users },
                            ].map(pm => (
                                <button
                                    key={pm.key}
                                    onClick={() => setPaymentMethod(pm.key)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                                        paymentMethod === pm.key
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    )}
                                >
                                    <pm.icon className="w-3.5 h-3.5" />
                                    {pm.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handlePayment}
                            disabled={!paymentMethod || isProcessing}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Pay {currency} {total.toLocaleString()}
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="p-4 border-t border-gray-100 space-y-2">
                        <button
                            onClick={handleSendToKitchen}
                            disabled={orderItems.length === 0 || isProcessing}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
                            {orderType === 'delivery' ? 'Place Delivery Order' : orderType === 'takeaway' ? 'Place Takeaway Order' : 'Send to Kitchen'}
                        </button>
                        <button
                            onClick={handleSendToKitchen}
                            disabled={orderItems.length === 0 || isProcessing}
                            className="w-full py-2.5 border-2 border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:border-gray-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            Quick Pay (Skip Kitchen)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
