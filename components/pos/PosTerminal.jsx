'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Barcode, ShoppingCart, Plus, Minus, Trash2, X, CreditCard,
    Banknote, Smartphone, SplitSquareHorizontal, User, Clock, Hash,
    Receipt, CheckCircle2, Star, Gift, ChevronDown, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// --- Product Grid ------------------------------------------------------------

function PosProductGrid({ products, categories, activeCategory, onCategoryChange, onAddToCart, searchTerm, onSearchChange }) {
    const filtered = useMemo(() => {
        let items = products || [];
        if (activeCategory && activeCategory !== 'all') {
            items = items.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());
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
    }, [products, activeCategory, searchTerm]);

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search products or scan barcode..."
                        className="pl-10 h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        autoFocus
                    />
                </div>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-gray-200">
                    <Barcode className="w-5 h-5 text-gray-500" />
                </Button>
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-thin bg-gray-50/50 border-b border-gray-100">
                <button
                    onClick={() => onCategoryChange('all')}
                    className={cn(
                        'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                        activeCategory === 'all'
                            ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    )}
                >
                    All Items
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => onCategoryChange(cat)}
                        className={cn(
                            'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                            activeCategory === cat
                                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filtered.map((product) => (
                        <motion.button
                            key={product.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onAddToCart(product)}
                            className={cn(
                                'flex flex-col items-center p-3 rounded-xl border transition-all text-left',
                                'bg-white hover:shadow-md hover:border-brand-100',
                                parseInt(product.stock) <= 0
                                    ? 'opacity-50 cursor-not-allowed border-red-200 bg-red-50/30'
                                    : 'border-gray-200 cursor-pointer'
                            )}
                            disabled={parseInt(product.stock) <= 0}
                        >
                            <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-2 text-2xl">
                                [BOX]
                            </div>
                            <p className="text-xs font-semibold text-gray-900 truncate w-full">{product.name}</p>
                            <p className="text-[10px] text-gray-400 truncate w-full">{product.sku || '--'}</p>
                            <div className="flex items-center justify-between w-full mt-1.5">
                                <span className="text-sm font-black text-brand-primary">
                                    Rs.{parseFloat(product.selling_price || product.price || 0).toLocaleString()}
                                </span>
                                <span className={cn(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                    parseInt(product.stock) <= 5
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-emerald-100 text-emerald-600'
                                )}>
                                    {parseInt(product.stock || 0)} left
                                </span>
                            </div>
                        </motion.button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400">
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No products found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Cart Panel --------------------------------------------------------------

function PosCart({
    items, onQuantityChange, onRemoveItem, onClearCart,
    customer, onCustomerSelect, discount = 0,
    onDiscountChange, onPaymentMethodSelect, onCompleteSale, isProcessing,
    loyaltyBalance = 0, currency = 'Rs.'
}) {
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
            {/* Cart Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm font-bold">Cart</span>
                    <Badge variant="secondary" className="bg-brand-primary/20 text-brand-primary text-[10px]">
                        {items.length} items
                    </Badge>
                </div>
                {items.length > 0 && (
                    <Button
                        variant="ghost" size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                        onClick={onClearCart}
                    >
                        <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
                <AnimatePresence>
                    {items.map((item, idx) => (
                        <motion.div
                            key={item.productId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-100 truncate">{item.name}</p>
                                <p className="text-[10px] text-gray-400">
                                    {currency}{item.unitPrice.toLocaleString()} each
                                </p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-1">
                                <button
                                    onClick={() => onQuantityChange(idx, Math.max(1, item.quantity - 1))}
                                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                                <button
                                    onClick={() => onQuantityChange(idx, item.quantity + 1)}
                                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                            <span className="text-xs font-bold text-brand-primary-dark w-16 text-right">
                                {currency}{(item.unitPrice * item.quantity).toLocaleString()}
                            </span>
                            <button
                                onClick={() => onRemoveItem(idx)}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors text-gray-500 hover:text-red-400"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-xs">Cart is empty</p>
                        <p className="text-[10px] text-gray-600 mt-1">Click products to add</p>
                    </div>
                )}
            </div>

            {/* Totals + Payment */}
            {items.length > 0 && (
                <div className="border-t border-slate-700 px-4 py-3 space-y-3">
                    {/* Customer */}
                    <button
                        onClick={onCustomerSelect}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs"
                    >
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-300">{customer?.name || 'Walk-in Customer'}</span>
                        <ChevronDown className="w-3 h-3 ml-auto text-gray-500" />
                    </button>

                    {/* Loyalty */}
                    {loyaltyBalance > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs text-amber-300">{loyaltyBalance} loyalty points</span>
                            <Button variant="ghost" size="sm" className="ml-auto h-5 text-[10px] text-amber-400 hover:text-amber-300 px-2">
                                <Gift className="w-3 h-3 mr-1" /> Redeem
                            </Button>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-gray-400">
                            <span>Subtotal</span>
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
                        <div className="flex justify-between text-lg font-black text-white pt-2 border-t border-slate-700">
                            <span>TOTAL</span>
                            <span className="text-brand-primary">{currency}{total.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            { key: 'cash', icon: Banknote, label: 'Cash', color: 'hover:bg-emerald-500/20 hover:border-emerald-500/40' },
                            { key: 'card', icon: CreditCard, label: 'Card', color: 'hover:bg-brand-primary/20 hover:border-brand-primary/40' },
                            { key: 'wallet', icon: Smartphone, label: 'Wallet', color: 'hover:bg-wine-500/20 hover:border-wine-500/40' },
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

                    {/* Complete Sale */}
                    <Button
                        onClick={onCompleteSale}
                        disabled={isProcessing || items.length === 0}
                        className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                COMPLETE SALE -- {currency}{total.toLocaleString()}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

// --- Main POS Terminal -------------------------------------------------------

export function PosTerminal({ businessId, products = [], customers = [], onStartSession, onCompleteSale, currency = 'Rs.', session }) {
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [customer, setCustomer] = useState(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastSale, setLastSale] = useState(null);
    const [isStartingSession, setIsStartingSession] = useState(false);

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

    const categories = useMemo(() => {
        const cats = [...new Set((products || []).map(p => p.category).filter(Boolean))];
        return cats.sort();
    }, [products]);

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
            'TENVO POS RECEIPT',
            '------------------------------',
            `Sale: ${lastSale.transaction_number || lastSale.saleNumber || 'N/A'}`,
            `Date: ${new Date().toLocaleString()}`,
            `Customer: ${lastSale.customerName || 'Walk-in Customer'}`,
            `Items: ${lastSale.items || 0}`,
            `Payment: ${(lastSale.paymentMethod || paymentMethod || 'cash').toUpperCase()}`,
            '------------------------------',
            `TOTAL: ${currency}${Number(lastSale.total || 0).toLocaleString()}`,
            '------------------------------',
            'Thank you for your purchase!',
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

    const addToCart = useCallback((product) => {
        if (parseInt(product.stock) <= 0) return;
        setCart(prev => {
            const existing = prev.findIndex(i => i.productId === product.id);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
                return updated;
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                unitPrice: parseFloat(product.selling_price || product.price || 0),
                taxPercent: parseFloat(product.tax_percent || 17),
                quantity: 1,
            }];
        });
    }, []);

    const handleQuantityChange = useCallback((idx, qty) => {
        setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
    }, []);

    const handleRemoveItem = useCallback((idx) => {
        setCart(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleCompleteSale = useCallback(async () => {
        if (cart.length === 0 || isProcessing) return;
        setIsProcessing(true);
        try {
            const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
            
            // Calculate total tax by summing per-item tax
            const totalTax = cart.reduce((sum, i) => {
                const itemTax = (i.unitPrice * i.quantity) * (i.taxPercent / 100);
                return sum + itemTax;
            }, 0);
            
            const taxAmount = Math.round(totalTax * 100) / 100;
            const total = Math.round((subtotal + taxAmount - parseFloat(discount || 0)) * 100) / 100;

            const result = await onCompleteSale?.({
                businessId,
                sessionId: session?.id,
                customerId: customer?.id || null,
                items: cart.map(i => ({
                    productId: i.productId,
                    productName: i.name,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    taxPercent: i.taxPercent,
                    taxAmount: Math.round((i.unitPrice * i.quantity * (i.taxPercent / 100)) * 100) / 100,
                })),
                payments: [{ method: paymentMethod, amount: total }],
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
            console.error('POS sale error:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [cart, businessId, session, customer, discount, paymentMethod, isProcessing, onCompleteSale, hasSession]);

    return (
        <div className="flex h-[calc(100vh-60px)] bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            {/* Left: Product Grid */}
            <div className="flex-1 min-w-0 bg-white">
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
                <PosProductGrid
                    products={products}
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    onAddToCart={addToCart}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />
            </div>

            {/* Right: Cart */}
            <div className="w-[380px] xl:w-[420px] flex-shrink-0">
                <PosCart
                    items={cart}
                    onQuantityChange={handleQuantityChange}
                    onRemoveItem={handleRemoveItem}
                    onClearCart={() => setCart([])}
                    customer={customer}
                    onCustomerSelect={() => setShowCustomerDialog(true)}
                    discount={discount}
                    onDiscountChange={setDiscount}
                    onPaymentMethodSelect={setPaymentMethod}
                    onCompleteSale={handleCompleteSale}
                    isProcessing={isProcessing}
                    currency={currency}
                    loyaltyBalance={0}
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
                            <p className="font-bold text-sm">Sale Completed!</p>
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

