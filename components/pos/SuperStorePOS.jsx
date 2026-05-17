'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Barcode, ShoppingCart, Plus, Minus, Trash2, X, CreditCard,
    Banknote, Smartphone, SplitSquareHorizontal, User, Clock, Hash,
    Receipt, CheckCircle2, Star, Gift, ChevronDown, RotateCcw,
    Layers, Weight, Package, ScanLine, Volume2, AlertTriangle, Filter,
    Maximize, Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// --- Constants ----------------------------------------------------------------

const DEPARTMENTS = [
    { key: 'all', label: 'All', icon: '[BAG]', color: 'bg-brand-primary' },
    { key: 'beverages', label: 'Beverages', icon: '[DRINK]', color: 'bg-brand-primary-dark' },
    { key: 'snacks', label: 'Snacks', icon: '[SNACK]', color: 'bg-orange-500' },
    { key: 'dairy', label: 'Dairy', icon: '[MILK]', color: 'bg-cyan-500' },
    { key: 'frozen', label: 'Frozen', icon: '[ICE]', color: 'bg-sky-500' },
    { key: 'fresh', label: 'Fresh Produce', icon: '[FRESH]', color: 'bg-emerald-500' },
    { key: 'bakery', label: 'Bakery', icon: '[BREAD]', color: 'bg-amber-500' },
    { key: 'household', label: 'Household', icon: '[HOUSE]', color: 'bg-brand-primary-dark' },
    { key: 'personal', label: 'Personal Care', icon: '[SOAP]', color: 'bg-pink-500' },
    { key: 'meat', label: 'Meat & Poultry', icon: '[MEAT]', color: 'bg-red-500' },
    { key: 'grocery', label: 'Grocery', icon: '🛒', color: 'bg-lime-600' },
];

const SCAN_SOUND_ENABLED = true;

// --- Barcode Scanner Input ---------------------------------------------------

function BarcodeScannerInput({ onScan, onSearchChange, searchTerm, isScanning }) {
    const inputRef = useRef(null);
    const scanBufferRef = useRef('');
    const scanTimerRef = useRef(null);

    useEffect(() => {
        // Auto-focus the barcode input on mount
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = useCallback((e) => {
        // Barcode scanners typically send Enter after the barcode
        if (e.key === 'Enter' && scanBufferRef.current.length >= 3) {
            e.preventDefault();
            onScan(scanBufferRef.current.trim());
            scanBufferRef.current = '';
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        // Buffer rapid keystrokes (barcode scanner speed)
        clearTimeout(scanTimerRef.current);
        scanBufferRef.current += e.key.length === 1 ? e.key : '';
        scanTimerRef.current = setTimeout(() => {
            scanBufferRef.current = '';
        }, 200); // Scanner sends chars faster than 200ms between keys
    }, [onScan]);

    return (
        <div className="relative flex-1">
            <ScanLine className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                isScanning ? "text-emerald-500 animate-pulse" : "text-gray-400"
            )} />
            <Input
                ref={inputRef}
                placeholder="Scan barcode or type product name..."
                className="pl-11 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-sm font-medium
                           focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck={false}
            />
            {searchTerm && (
                <button
                    onClick={() => {
                        onSearchChange('');
                        inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            )}
        </div>
    );
}

// --- Department Filter Bar ---------------------------------------------------

function DepartmentBar({ activeDepartment, onDepartmentChange, productCounts }) {
    return (
        <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-thin
                        bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            {DEPARTMENTS.map(dept => {
                const count = productCounts[dept.key] || 0;
                const isActive = activeDepartment === dept.key;
                if (dept.key !== 'all' && count === 0) return null;

                return (
                    <button
                        key={dept.key}
                        onClick={() => onDepartmentChange(dept.key)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0',
                            isActive
                                ? `${dept.color} text-white shadow-lg`
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                        )}
                    >
                        <span className="text-sm">{dept.icon}</span>
                        <span>{dept.label}</span>
                        {dept.key !== 'all' && (
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none",
                                isActive ? "bg-white/20" : "bg-gray-100 text-gray-500"
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// --- Scanned Items List ------------------------------------------------------

function ScannedItemsList({
    items, onQuantityChange, onRemoveItem, onWeightChange,
    onPriceOverride, currency
}) {
    return (
        <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
                <AnimatePresence>
                    {items.map((item, idx) => (
                        <motion.div
                            key={`${item.productId}-${idx}`}
                            initial={{ opacity: 0, y: -10, backgroundColor: '#ecfdf5' }}
                            animate={{ opacity: 1, y: 0, backgroundColor: '#ffffff' }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2, backgroundColor: { duration: 0.8 } }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors group"
                        >
                            {/* Line number */}
                            <span className="text-[10px] font-bold text-gray-300 w-5 text-right shrink-0">
                                {idx + 1}
                            </span>

                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-gray-400 font-mono">{item.sku || item.barcode || '--'}</span>
                                    {item.isWeightItem && (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-300 text-amber-600">
                                            <Weight className="w-2.5 h-2.5 mr-0.5" /> Weight
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Quantity controls */}
                            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                                <button
                                    onClick={() => onQuantityChange(idx, Math.max(item.isWeightItem ? 0.1 : 1, item.quantity - (item.isWeightItem ? 0.1 : 1)))}
                                    className="p-1.5 hover:bg-white rounded-md transition-colors"
                                >
                                    <Minus className="w-3 h-3 text-gray-500" />
                                </button>
                                {item.isWeightItem ? (
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => onWeightChange?.(idx, parseFloat(e.target.value) || 0.1)}
                                        className="w-14 text-center text-xs font-black bg-white rounded px-1 py-1 border-0"
                                        step="0.01"
                                        min="0.01"
                                    />
                                ) : (
                                    <div className="flex items-center">
                                        <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                                        {/* Quick Add Presets for Retail Crate/Bulk */}
                                        <div className="flex flex-col ml-1 border-l border-gray-200 pl-1">
                                            <button onClick={() => onQuantityChange(idx, item.quantity + 5)} className="text-[7px] font-black text-emerald-600 hover:bg-emerald-50 px-1 rounded">+5</button>
                                            <button onClick={() => onQuantityChange(idx, item.quantity + 12)} className="text-[7px] font-black text-brand-primary hover:bg-brand-50 px-1 rounded">+12</button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => onQuantityChange(idx, item.quantity + (item.isWeightItem ? 0.1 : 1))}
                                    className="p-1.5 hover:bg-white rounded-md transition-colors"
                                >
                                    <Plus className="w-3 h-3 text-gray-500" />
                                </button>
                            </div>

                            {/* Unit + Weight label */}
                            {item.isWeightItem && (
                                <span className="text-[10px] font-bold text-gray-400 w-8">
                                    {item.unit || 'kg'}
                                </span>
                            )}

                            {/* Unit price */}
                            <span className="text-[10px] text-gray-400 w-16 text-right shrink-0">
                                @{currency}{parseFloat(item.unitPrice).toLocaleString()}
                            </span>

                            {/* Line total */}
                            <span className="text-xs font-black text-gray-900 w-20 text-right shrink-0">
                                {currency}{(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>

                            {/* Remove */}
                            <button
                                onClick={() => onRemoveItem(idx)}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                            >
                                <X className="w-3.5 h-3.5 text-red-400" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <ScanLine className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-bold">Scan items to begin</p>
                    <p className="text-[10px] mt-1 text-gray-300">Use barcode scanner or search by name</p>
                </div>
            )}
        </div>
    );
}

// --- Cart Summary (Right Panel) ----------------------------------------------

function CartSummary({
    items, customer, onCustomerSelect, taxPercent, taxConfig,
    discount = 0, onDiscountChange, onPaymentMethodSelect,
    onCompleteSale, onHoldSale, onVoidSale, isProcessing,
    currency = 'Rs.', heldOrders = [], onResumeHeldSale
}) {
    // Priority: taxConfig.sales_tax_rate -> taxPercent prop -> 17.0 (fallback)
    const effectiveTaxRate = taxConfig?.sales_tax_rate ?? taxPercent ?? 17;
    const itemCount = items.reduce((sum, i) => sum + (i.isWeightItem ? 1 * i.quantity : i.quantity), 0);
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    
    // Calculate total tax by summing per-item tax stored in items
    const totalTax = items.reduce((sum, i) => {
        const itemTax = (i.unitPrice * i.quantity) * ((i.taxPercent || 0) / 100);
        return sum + itemTax;
    }, 0);
    
    const taxAmount = Math.round(totalTax * 100) / 100;
    const discountAmount = parseFloat(discount || 0);
    const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-black tracking-tight">CART</span>
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        {items.length} items * {itemCount} qty
                    </Badge>
                </div>
                {heldOrders.length > 0 && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {heldOrders.length} held
                    </Badge>
                )}
            </div>

            {/* Customer */}
            <div className="px-3 py-2 border-b border-slate-800">
                <button
                    onClick={onCustomerSelect}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors text-xs"
                >
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-300 flex-1 text-left truncate">{customer?.name || 'Walk-in Customer'}</span>
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
            </div>

            {/* Totals */}
            <div className="flex-1 flex flex-col justify-end">
                {items.length > 0 && (
                    <div className="px-4 py-3 space-y-2 border-t border-slate-700/50">
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-gray-400">
                                <span>Subtotal ({items.length} items)</span>
                                <span>{currency}{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Tax</span>
                                <span>{currency}{taxAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-gray-400">
                                <span>Discount</span>
                                <Input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => onDiscountChange?.(e.target.value)}
                                    className="w-20 h-6 text-right text-xs bg-slate-800 border-slate-700 text-white rounded px-2"
                                    min={0}
                                />
                            </div>
                            <div className="flex justify-between text-2xl font-black text-white pt-3 border-t border-slate-700">
                                <span>TOTAL</span>
                                <span className="text-emerald-400">{currency}{total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="grid grid-cols-4 gap-1.5 pt-2">
                            {[
                                { key: 'cash', icon: Banknote, label: 'Cash', color: 'hover:bg-emerald-500/20 hover:border-emerald-500/40' },
                                { key: 'card', icon: CreditCard, label: 'Card', color: 'hover:bg-brand-primary/20 hover:border-brand-primary/40' },
                                { key: 'wallet', icon: Smartphone, label: 'Mobile', color: 'hover:bg-wine-500/20 hover:border-wine-500/40' },
                                { key: 'split', icon: SplitSquareHorizontal, label: 'Split', color: 'hover:bg-amber-500/20 hover:border-amber-500/40' },
                            ].map(({ key, icon: Icon, label, color }) => (
                                <button
                                    key={key}
                                    onClick={() => onPaymentMethodSelect?.(key)}
                                    className={cn(
                                        'flex flex-col items-center gap-1 py-2 rounded-lg border border-slate-700 bg-slate-800 transition-all text-gray-400',
                                        color
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-[9px] font-medium">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onHoldSale}
                                className="h-9 rounded-lg text-[10px] font-bold border-slate-700 text-gray-400 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30"
                            >
                                <Clock className="w-3.5 h-3.5 mr-1.5" /> HOLD
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onVoidSale}
                                className="h-9 rounded-lg text-[10px] font-bold border-slate-700 text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                            >
                                <X className="w-3.5 h-3.5 mr-1.5" /> VOID
                            </Button>
                        </div>

                        {heldOrders.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onResumeHeldSale}
                                className="w-full h-9 rounded-lg text-[10px] font-bold border-amber-600/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> RESUME LAST HELD SALE ({heldOrders.length})
                            </Button>
                        )}

                        {/* Complete Sale */}
                        <Button
                            onClick={onCompleteSale}
                            disabled={isProcessing || items.length === 0}
                            className="w-full h-14 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-500 to-emerald-600
                                       hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50 tracking-tight"
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    CHECKOUT -- {currency}{total.toLocaleString()}
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-600 px-6">
                        <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-xs font-bold text-gray-400">Cart is empty</p>
                        <p className="text-[10px] text-gray-600 mt-1 text-center">
                            Scan items with the barcode reader or search by name to add products
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Main Super Store POS ----------------------------------------------------

export function SuperStorePOS({ 
    businessId, products = [], customers = [], onStartSession, 
    onCompleteSale, currency = 'Rs.', session, taxConfig 
}) {
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeDepartment, setActiveDepartment] = useState('all');
    const [customer, setCustomer] = useState(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSale, setLastSale] = useState(null);
    const [heldOrders, setHeldOrders] = useState([]);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScannedItem, setLastScannedItem] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const hasSession = Boolean(
        session?.id
        && session?.id !== 'sess-initial'
        && (session?.status === 'open' || session?.opened_at || session?.startTime)
    );
    const sessionStartedAt = session?.opened_at || session?.startTime;
    const sessionStartedLabel = sessionStartedAt
        ? new Date(sessionStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
    const terminalLabel = session?.terminalName || session?.terminal_name || 'Counter';

    const heldOrdersStorageKey = useMemo(() => `fh:pos:held:${businessId || 'default'}`, [businessId]);

    const filteredCustomers = useMemo(() => {
        if (!customerQuery.trim()) return (customers || []).slice(0, 40);
        const lower = customerQuery.toLowerCase();
        return (customers || []).filter(c =>
            c.name?.toLowerCase().includes(lower)
            || c.phone?.toLowerCase().includes(lower)
            || c.email?.toLowerCase().includes(lower)
        ).slice(0, 40);
    }, [customers, customerQuery]);

    const handlePrintReceipt = useCallback(() => {
        if (!lastSale) return;

        const receiptLines = [
            'TENVO SUPERSTORE RECEIPT',
            '------------------------------',
            `Sale: ${lastSale.transaction_number || lastSale.saleNumber || 'N/A'}`,
            `Date: ${new Date().toLocaleString()}`,
            `Customer: ${lastSale.customerName || 'Walk-in Customer'}`,
            `Items: ${lastSale.items || 0}`,
            `Payment: ${(lastSale.paymentMethod || paymentMethod || 'cash').toUpperCase()}`,
            '------------------------------',
            `TOTAL: ${currency}${Number(lastSale.total || 0).toLocaleString()}`,
            '------------------------------',
            'Thank you for shopping!',
        ];

        const win = window.open('', '_blank', 'width=420,height=640');
        if (!win) return;

        win.document.write(`<!doctype html><html><head><title>Receipt</title><style>
            body { font-family: monospace; padding: 16px; }
            pre { white-space: pre-wrap; font-size: 14px; line-height: 1.5; }
        </style></head><body><pre>${receiptLines.join('\n')}</pre></body></html>`);
        win.document.close();
        win.focus();
        win.print();
    }, [currency, lastSale, paymentMethod]);

    const handleStartSession = useCallback(async () => {
        if (!onStartSession || isStartingSession) return;
        setIsStartingSession(true);
        try {
            await onStartSession();
        } finally {
            setIsStartingSession(false);
        }
    }, [onStartSession, isStartingSession]);

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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(heldOrdersStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setHeldOrders(parsed);
            }
        } catch (error) {
            console.warn('Failed to load held POS orders:', error);
        }
    }, [heldOrdersStorageKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(heldOrdersStorageKey, JSON.stringify(heldOrders));
        } catch (error) {
            console.warn('Failed to persist held POS orders:', error);
        }
    }, [heldOrders, heldOrdersStorageKey]);

    // --- Derived Data --------------------------------------------------------

    const productCounts = useMemo(() => {
        const counts = { all: products.length };
        products.forEach(p => {
            const cat = (p.category || 'other').toLowerCase();
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [products]);

    const filteredProducts = useMemo(() => {
        let items = products || [];
        if (activeDepartment && activeDepartment !== 'all') {
            items = items.filter(p => (p.category || '').toLowerCase() === activeDepartment);
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(p =>
                p.name?.toLowerCase().includes(lower) ||
                p.sku?.toLowerCase().includes(lower) ||
                p.barcode?.toLowerCase().includes(lower)
            );
        }
        return items;
    }, [products, activeDepartment, searchTerm]);

    // --- Cart Operations -----------------------------------------------------

    const addToCart = useCallback((product) => {
        if (parseInt(product.stock) <= 0 && !product.allow_negative_stock) return;

        const isWeightItem = product.unit === 'kg' || product.unit === 'g' ||
            product.unit === 'lb' || product.is_weight_item ||
            product.domain_data?.is_weight_item;

        setCart(prev => {
            const existing = prev.findIndex(i => i.productId === product.id);
            if (existing >= 0 && !isWeightItem) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
                return updated;
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                unitPrice: parseFloat(product.selling_price || product.price || 0),
                quantity: isWeightItem ? 1.0 : 1,
                taxPercent: parseFloat(product.tax_percent ?? product.taxPercent ?? 17),
                isWeightItem,
                unit: product.unit || (isWeightItem ? 'kg' : 'pcs'),
            }];
        });

        setLastScannedItem(product.name);
        setTimeout(() => setLastScannedItem(null), 1500);
    }, []);

    const handleBarcodeScan = useCallback((barcode) => {
        setIsScanning(true);
        const product = products.find(p =>
            p.barcode === barcode || p.sku === barcode
        );

        if (product) {
            addToCart(product);
            setSearchTerm('');
        } else {
            // Flash error state
            setLastScannedItem(`[WARNING] "${barcode}" not found`);
            setTimeout(() => setLastScannedItem(null), 2000);
        }
        setTimeout(() => setIsScanning(false), 300);
    }, [products, addToCart]);

    const handleQuantityChange = useCallback((idx, qty) => {
        setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.round(qty * 100) / 100 } : item));
    }, []);

    const handleWeightChange = useCallback((idx, weight) => {
        setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.round(weight * 100) / 100 } : item));
    }, []);

    const handleRemoveItem = useCallback((idx) => {
        setCart(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleHoldSale = useCallback(() => {
        if (cart.length === 0) return;
        setHeldOrders(prev => [...prev, { items: cart, customer, discount, timestamp: Date.now() }]);
        setCart([]);
        setCustomer(null);
        setDiscount(0);
    }, [cart, customer, discount]);

    const handleVoidSale = useCallback(() => {
        setCart([]);
        setCustomer(null);
        setDiscount(0);
    }, []);

    const handleResumeLastHeldSale = useCallback(() => {
        if (heldOrders.length === 0 || cart.length > 0) return;
        const updated = [...heldOrders];
        const restored = updated.pop();
        setHeldOrders(updated);
        setCart(restored?.items || []);
        setCustomer(restored?.customer || null);
        setDiscount(restored?.discount || 0);
    }, [heldOrders, cart.length]);

    const handleCompleteSale = useCallback(async () => {
        if (cart.length === 0 || isProcessing) return;
        setIsProcessing(true);
        try {
            const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
            const totalTax = cart.reduce((sum, i) => {
                const itemTax = (i.unitPrice * i.quantity) * ((i.taxPercent || 0) / 100);
                return sum + itemTax;
            }, 0);
            const taxAmount = Math.round(totalTax * 100) / 100;
            const total = subtotal + taxAmount - parseFloat(discount || 0);

            const result = await onCompleteSale?.({
                businessId,
                sessionId: session?.id,
                customerId: customer?.id || null,
                items: cart.map(i => ({
                    productId: i.productId,
                    productName: i.name,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    taxAmount: Math.round(i.unitPrice * i.quantity * (i.taxPercent || 0)) / 100,
                    isWeightItem: i.isWeightItem || false,
                    unit: i.unit,
                })),
                payments: [{ method: paymentMethod, amount: total }],
                metadata: {
                    domain: 'supermarket',
                    taxRate: effectiveTaxRate
                }
            });

            if (result?.success) {
                setLastSale({
                    ...result.transaction,
                    saleNumber: result.transaction?.transaction_number || `SALE-${Date.now()}`,
                    total,
                    items: cart.length,
                    customerName: customer?.name || null,
                    paymentMethod,
                    mode: result?.mode || (hasSession ? 'pos' : 'invoice-fallback'),
                });
                setShowSuccess(true);
                setCart([]);
                setCustomer(null);
                setDiscount(0);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } catch (err) {
            console.error('SuperStore POS sale error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [cart, businessId, session, customer, discount, paymentMethod, isProcessing, onCompleteSale, hasSession]);

    // --- Keyboard Shortcuts --------------------------------------------------

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') { e.preventDefault(); handleCompleteSale(); }
            if (e.key === 'F8') { e.preventDefault(); handleHoldSale(); }
            if (e.key === 'Escape') { handleVoidSale(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCompleteSale, handleHoldSale, handleVoidSale]);

    // --- Render --------------------------------------------------------------

    return (
        <div
            ref={containerRef}
            className={cn(
                "flex bg-gray-50 overflow-hidden shadow-sm border border-gray-200 transition-all",
                isFullscreen ? "h-screen w-screen rounded-0 border-0" : "h-[calc(100vh-80px)] rounded-xl"
            )}
        >
            {/* Left: Scanner + Items */}
            <div className="flex-1 min-w-0 bg-white flex flex-col">
                <div className={cn(
                    'mx-4 mt-3 mb-0 px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3',
                    hasSession
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                )}>
                    <span>
                        {hasSession
                            ? `POS Session Active * ${terminalLabel}${sessionStartedLabel ? ` * Opened ${sessionStartedLabel}` : ''}`
                            : 'Session not active: checkout will use invoice fallback mode'}
                    </span>
                    {!hasSession && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px]"
                            onClick={handleStartSession}
                            disabled={isStartingSession}
                        >
                            {isStartingSession ? 'Starting...' : 'Start Session'}
                        </Button>
                    )}
                </div>
                {/* Barcode Input Bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
                    <BarcodeScannerInput
                        onScan={handleBarcodeScan}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        isScanning={isScanning}
                    />
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn(
                            "text-[10px] h-7 px-2 font-bold transition-all",
                            lastScannedItem?.startsWith('[WARNING]')
                                ? "border-red-300 text-red-500 bg-red-50"
                                : lastScannedItem
                                    ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                    : "border-gray-200 text-gray-400"
                        )}>
                            {lastScannedItem || 'Ready to scan'}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="h-8 w-8 text-gray-400 hover:text-brand-primary hover:bg-brand-50"
                        >
                            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Department Filter */}
                <DepartmentBar
                    activeDepartment={activeDepartment}
                    onDepartmentChange={setActiveDepartment}
                    productCounts={productCounts}
                />

                {/* Scanned Items List OR Product Grid (when searching) */}
                {cart.length > 0 || !searchTerm ? (
                    <ScannedItemsList
                        items={cart}
                        onQuantityChange={handleQuantityChange}
                        onRemoveItem={handleRemoveItem}
                        onWeightChange={handleWeightChange}
                        currency={currency}
                    />
                ) : null}

                {/* Quick-add from search results when there's a search term */}
                {searchTerm && (
                    <div className="border-t border-gray-100 bg-gray-50/50 overflow-y-auto max-h-64">
                        <div className="px-4 py-1.5">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                Search Results ({filteredProducts.length})
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {filteredProducts.slice(0, 8).map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        addToCart(product);
                                        setSearchTerm('');
                                    }}
                                    disabled={parseInt(product.stock) <= 0}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                                        parseInt(product.stock) <= 0
                                            ? "opacity-40 cursor-not-allowed"
                                            : "hover:bg-emerald-50/50"
                                    )}
                                >
                                    <Package className="w-4 h-4 text-gray-300 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{product.sku || product.barcode || '--'}</p>
                                    </div>
                                    <span className="text-xs font-black text-emerald-600">
                                        {currency}{parseFloat(product.selling_price || product.price || 0).toLocaleString()}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        parseInt(product.stock) <= 5 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                                    )}>
                                        {parseInt(product.stock || 0)}
                                    </span>
                                    <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                                </button>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="px-4 py-6 text-center text-gray-400">
                                    <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">No products match "{searchTerm}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Keyboard Shortcuts Bar */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>F9: Checkout</span>
                    <span>F8: Hold</span>
                    <span>ESC: Void</span>
                    <span>Enter: Scan</span>
                </div>
            </div>

            {/* Right: Cart Summary */}
            <div className="w-[360px] xl:w-[400px] flex-shrink-0">
                <CartSummary
                    items={cart}
                    customer={customer}
                    onCustomerSelect={() => setShowCustomerDialog(true)}
                    discount={discount}
                    onDiscountChange={setDiscount}
                    onPaymentMethodSelect={setPaymentMethod}
                    onCompleteSale={handleCompleteSale}
                    onHoldSale={handleHoldSale}
                    onVoidSale={handleVoidSale}
                    onResumeHeldSale={handleResumeLastHeldSale}
                    isProcessing={isProcessing}
                    currency={currency}
                    heldOrders={heldOrders}
                    taxConfig={taxConfig}
                />
            </div>

            {/* Sale Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30"
                    >
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                            <p className="font-bold text-sm">Sale Complete!</p>
                            <p className="text-xs text-emerald-100">
                                {lastSale?.transaction_number} -- {currency}{lastSale?.total?.toLocaleString()} ({lastSale?.mode === 'invoice-fallback' ? 'Invoice Mode' : 'POS Mode'})
                            </p>
                        </div>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500 ml-2"
                            onClick={handlePrintReceipt}
                        >
                            <Receipt className="w-4 h-4 mr-1" /> Receipt
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Select Customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            value={customerQuery}
                            onChange={(e) => setCustomerQuery(e.target.value)}
                            placeholder="Search by name, phone or email"
                        />
                        <button
                            onClick={() => {
                                setCustomer(null);
                                setShowCustomerDialog(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                        >
                            Walk-in Customer
                        </button>
                        <div className="max-h-72 overflow-y-auto space-y-1">
                            {filteredCustomers.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setCustomer(c);
                                        setShowCustomerDialog(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-brand-50"
                                >
                                    <p className="text-sm font-semibold text-gray-900">{c.name || 'Unnamed customer'}</p>
                                    <p className="text-xs text-gray-500">{c.phone || c.email || 'No contact details'}</p>
                                </button>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <p className="text-xs text-gray-500 px-1 py-2">No customers found</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

