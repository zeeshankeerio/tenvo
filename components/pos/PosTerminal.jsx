'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Barcode, ShoppingCart, Plus, Minus, Trash2, X, CreditCard,
    Banknote, Smartphone, SplitSquareHorizontal, User, Clock, Hash,
    Receipt, CheckCircle2, ChevronDown, RotateCcw, Percent,
    Calculator, Keyboard, ScanLine, Package, ArrowLeft, Maximize, Minimize, Printer, FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import {
    buildPosCheckoutPayload,
    buildPosCategoryChips,
    findProductByScanCode,
    getPosUiConfig,
    getProductAvailableStock,
} from '@/lib/utils/posHelpers';
import { usePosFullscreen } from '@/lib/hooks/usePosFullscreen';
import { usePosReceipt } from '@/lib/hooks/usePosReceipt';
import {
    getPosShellHeightClass,
    POS_SCROLL_MIDDLE,
    POS_SHELL_FOOTER,
    POS_SHELL_HEADER,
} from '@/lib/utils/posLayout';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { ProductThumbnail } from '@/components/product/ProductThumbnail';
import toast from 'react-hot-toast';

// --- Product Grid ------------------------------------------------------------

function PosProductGrid({
    products, categories, activeCategory, onCategoryChange, onAddToCart,
    searchTerm, onSearchChange, onBarcodeScan, currency = '₨', taxLabel = 'Tax',
    barcodeFirst = false, businessCategory,
}) {
    const searchInputRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    
    // Keyboard shortcuts handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Escape to clear search
            if (e.key === 'Escape') {
                onSearchChange('');
                searchInputRef.current?.focus();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSearchChange]);

    // Barcode scan simulation (real implementation would use hardware scanner)
    const handleBarcodeClick = () => {
        setIsScanning(true);
        // Simulate scanning with input focus
        searchInputRef.current?.focus();
        setTimeout(() => setIsScanning(false), 2000);
    };

    const handleSearchKeyDown = useCallback((e) => {
        if (e.key !== 'Enter') return;
        const code = String(searchTerm || '').trim();
        if (!code) return;
        e.preventDefault();
        const match = findProductByScanCode(products, code);
        if (match) {
            onAddToCart(match);
            onSearchChange('');
            onBarcodeScan?.(code);
        }
    }, [searchTerm, products, onAddToCart, onSearchChange, onBarcodeScan]);

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

    const toolbarControlClass =
        'h-10 rounded-xl border-gray-200 bg-gray-50 text-sm focus:bg-white';

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden" role="region" aria-label="Product selection area">
            {/* Category + search + scan, single compact toolbar */}
            <div
                className={cn(
                    POS_SHELL_HEADER,
                    'flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-gray-100 bg-white'
                )}
            >
                <Select value={activeCategory} onValueChange={onCategoryChange}>
                    <SelectTrigger
                        className={cn(
                            toolbarControlClass,
                            'w-[7.25rem] sm:w-[8.5rem] shrink-0 px-3 py-0 font-medium text-xs shadow-none',
                            'items-center leading-none [&>span:first-child]:min-w-0 [&>span:first-child]:truncate [&>span:first-child]:text-left'
                        )}
                        aria-label="Filter by category"
                    >
                        <SelectValue placeholder="All Items" />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-64">
                        <SelectItem value="all">All Items</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <Input
                        ref={searchInputRef}
                        placeholder={barcodeFirst
                            ? 'Scan or search SKU / name… (Enter)'
                            : 'Search SKU, name, or barcode… (Ctrl+F)'}
                        className={cn(toolbarControlClass, 'pl-9 pr-3 w-full')}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        aria-label="Search products or scan barcode"
                        autoFocus
                    />
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                    toolbarControlClass,
                                    'h-10 w-10 shrink-0 p-0 shadow-none',
                                    isScanning && 'animate-pulse border-blue-500 text-blue-500 bg-blue-50'
                                )}
                                onClick={handleBarcodeClick}
                                aria-label="Scan barcode"
                            >
                                <ScanLine className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>Scan barcode (type code and press Enter)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Product grid, scrollable middle */}
            <div
                className={cn(POS_SCROLL_MIDDLE, 'p-3 sm:p-4 bg-white')}
                role="region"
                aria-label="Product grid"
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filtered.map((product) => {
                        const stock = getProductAvailableStock(product);
                        const minStock = Number(product.min_stock ?? product.min_stock_level ?? 5);
                        const isOutOfStock = stock <= 0;
                        const isLowStock = stock > 0 && stock <= minStock;
                        
                        return (
                            <motion.button
                                key={product.id}
                                whileHover={isOutOfStock ? {} : { scale: 1.02 }}
                                whileTap={isOutOfStock ? {} : { scale: 0.97 }}
                                onClick={() => !isOutOfStock && onAddToCart(product)}
                                className={cn(
                                    'flex flex-col items-center p-3 rounded-xl border transition-all text-left focus:ring-2 focus:ring-brand-primary focus:outline-none',
                                    'bg-white hover:shadow-md hover:border-brand-100',
                                    isOutOfStock
                                        ? 'opacity-50 cursor-not-allowed border-red-200 bg-red-50/30'
                                        : 'border-gray-200 cursor-pointer',
                                    isLowStock && 'border-orange-200 bg-orange-50/30'
                                )}
                                disabled={isOutOfStock}
                                aria-label={`${product.name}, Price: ${product.selling_price || product.price || 0}, Stock: ${stock} units${isLowStock ? ', Low stock' : ''}${isOutOfStock ? ', Out of stock' : ''}`}
                                aria-disabled={isOutOfStock}
                                tabIndex={isOutOfStock ? -1 : 0}
                            >
                                <ProductThumbnail
                                    product={product}
                                    businessCategory={businessCategory}
                                    size="lg"
                                    className={cn(
                                        'mb-2 border border-neutral-100',
                                        isOutOfStock && 'opacity-60',
                                        isLowStock && 'ring-1 ring-orange-200'
                                    )}
                                />
                                <p className="text-xs font-semibold text-gray-900 truncate w-full" title={product.name}>
                                    {product.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate w-full" title={product.sku}>
                                    {product.sku || '--'}
                                </p>
                                <div className="flex items-center justify-between w-full mt-1.5">
                                    <span className="text-sm font-semibold text-brand-primary">
                                        {currency}{parseFloat(product.selling_price || product.price || 0).toLocaleString()}
                                    </span>
                                    <span 
                                        className={cn(
                                            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                            isOutOfStock
                                                ? 'bg-red-100 text-red-600'
                                                : isLowStock
                                                    ? 'bg-orange-100 text-orange-600'
                                                    : 'bg-emerald-100 text-emerald-600'
                                        )}
                                        aria-label={`${stock} items in stock`}
                                    >
                                        {stock} left
                                    </span>
                                </div>
                            </motion.button>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div 
                            className="col-span-full py-20 text-center text-gray-400"
                            role="status"
                            aria-live="polite"
                        >
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden="true" />
                            <p className="text-sm">No products found</p>
                            <p className="text-xs text-gray-300 mt-1">Try adjusting your search or category</p>
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
    customer, onCustomerSelect, discount = 0, discountType = 'fixed',
    onDiscountChange, onDiscountTypeChange, onPaymentMethodSelect, onCompleteSale, isProcessing,
    loyaltyBalance = 0, currency = '₨', taxLabel = 'Tax', selectedPaymentMethod = 'cash',
    onBack, hideKeyboardHint = false, businessCategory, onPrintBill, onDownloadBillPdf,
}) {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    
    // Calculate total tax by summing per-item tax stored in items
    const totalTax = items.reduce((sum, i) => {
        const itemTax = (i.unitPrice * i.quantity) * ((i.taxPercent || 0) / 100);
        return sum + itemTax;
    }, 0);
    
    const taxAmount = Math.round(totalTax * 100) / 100;
    
    // Intelligent discount calculation
    const rawDiscount = parseFloat(discount || 0);
    const discountAmount = discountType === 'percentage' 
        ? Math.min(subtotal * (rawDiscount / 100), subtotal) // Cap at subtotal
        : Math.min(rawDiscount, subtotal);
    
    const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;
    const itemQty = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div
            className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-900 text-white"
            role="complementary"
            aria-label="Shopping cart and checkout"
        >
            {/* Header, pinned */}
            <header className={cn(POS_SHELL_HEADER, 'flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-slate-700/80 bg-slate-900')}>
                <div className="flex items-center gap-2 min-w-0">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-1.5 -ml-1 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
                            aria-label="Back to products"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    ) : null}
                    <ShoppingCart className="w-4 h-4 text-brand-primary flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm font-bold tracking-tight">Cart</span>
                    <Badge
                        variant="secondary"
                        className="bg-brand-primary/20 text-brand-primary text-[10px] font-semibold"
                        aria-label={`${items.length} lines, ${itemQty} units`}
                    >
                        {itemQty} {itemQty === 1 ? 'item' : 'items'}
                    </Badge>
                </div>
                {items.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs flex-shrink-0"
                        onClick={onClearCart}
                        aria-label="Clear all items from cart"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Clear
                    </Button>
                )}
            </header>

            {/* Line items, scrollable middle only */}
            <div
                className={cn(POS_SCROLL_MIDDLE, 'px-2 sm:px-3 py-2 space-y-1.5')}
                role="list"
                aria-label="Cart items"
            >
                <AnimatePresence initial={false}>
                    {items.map((item, idx) => (
                        <motion.div
                            key={`${item.productId}-${idx}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1.5 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/50"
                            role="listitem"
                        >
                            <ProductThumbnail
                                product={{ image_url: item.imageUrl, name: item.name, id: item.productId }}
                                businessCategory={businessCategory}
                                size="cart"
                                className="row-span-2 border border-slate-600/80 self-start"
                            />
                            <div className="min-w-0 col-start-2">
                                <p className="text-xs font-semibold text-gray-100 leading-snug line-clamp-2" title={item.name}>
                                    {item.name}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {currency}{item.unitPrice.toLocaleString()} each
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveItem(idx)}
                                className="col-start-3 p-1 self-start rounded-md hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                                aria-label={`Remove ${item.name}`}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="col-start-2 col-span-2 flex items-center justify-between gap-2 pt-0.5">
                                <div
                                    className="flex items-center gap-0.5 bg-slate-700/80 rounded-lg px-0.5"
                                    role="group"
                                    aria-label={`Quantity for ${item.name}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onQuantityChange(idx, Math.max(1, item.quantity - 1))}
                                        className="p-1.5 hover:bg-slate-600 rounded-md transition-colors"
                                        aria-label={`Decrease ${item.name}`}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-8 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => onQuantityChange(idx, item.quantity + 1)}
                                        className="p-1.5 hover:bg-slate-600 rounded-md transition-colors"
                                        aria-label={`Increase ${item.name}`}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <span className="text-sm font-bold text-brand-primary tabular-nums">
                                    {currency}{(item.unitPrice * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {items.length === 0 && (
                    <div
                        className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-500"
                        role="status"
                        aria-live="polite"
                    >
                        <ShoppingCart className="w-11 h-11 mb-3 opacity-25" aria-hidden="true" />
                        <p className="text-sm font-medium text-gray-400">Cart is empty</p>
                        <p className="text-[11px] text-gray-600 mt-1 max-w-[200px]">
                            Tap products on the left or scan a barcode to add items
                        </p>
                    </div>
                )}
            </div>

            {/* Checkout footer, pinned */}
            <footer className={cn(POS_SHELL_FOOTER, 'border-slate-700/80 bg-slate-900 px-3 sm:px-4 py-3 space-y-2.5')}>
                {items.length > 0 ? (
                    <>
                        <button
                            type="button"
                            onClick={onCustomerSelect}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-800 transition-colors text-xs border border-slate-700/60"
                        >
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-200 truncate flex-1 text-left">{customer?.name || 'Walk-in Customer'}</span>
                            <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        </button>

                        <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 px-3 py-2 space-y-1 text-[11px] sm:text-xs" role="region" aria-label="Order totals">
                            <div className="flex justify-between text-gray-400">
                                <span>Subtotal ({itemQty})</span>
                                <span className="tabular-nums">{currency}{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>{taxLabel}</span>
                                <span className="tabular-nums">{currency}{taxAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-gray-400 gap-2">
                                <div className="flex items-center gap-1 min-w-0">
                                    <span>Discount</span>
                                    <button
                                        type="button"
                                        onClick={() => onDiscountTypeChange?.(discountType === 'fixed' ? 'percentage' : 'fixed')}
                                        className="p-0.5 rounded hover:bg-slate-700"
                                        aria-label="Toggle discount type"
                                    >
                                        {discountType === 'fixed' ? <Percent className="w-3 h-3" /> : <Calculator className="w-3 h-3" />}
                                    </button>
                                </div>
                                <Input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => onDiscountChange?.(e.target.value)}
                                    className="w-16 h-7 text-right text-xs bg-slate-900 border-slate-600 text-white rounded-md px-2"
                                    min={0}
                                    max={discountType === 'percentage' ? 100 : subtotal}
                                    aria-label="Discount"
                                />
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-400 text-[10px]">
                                    <span>Savings</span>
                                    <span>-{currency}{discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline pt-1.5 mt-0.5 border-t border-slate-600/80">
                                <span className="text-sm font-bold text-white">Total</span>
                                <span className="text-xl font-semibold text-brand-primary tabular-nums" aria-live="polite">
                                    {currency}{total.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div
                            className="grid grid-cols-4 gap-1"
                            role="radiogroup"
                            aria-label="Payment method"
                        >
                            {[
                                { key: 'cash', icon: Banknote, label: 'Cash' },
                                { key: 'card', icon: CreditCard, label: 'Card' },
                                { key: 'wallet', icon: Smartphone, label: 'Wallet' },
                                { key: 'split', icon: SplitSquareHorizontal, label: 'Split' },
                            ].map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onPaymentMethodSelect?.(key)}
                                    className={cn(
                                        'flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                                        selectedPaymentMethod === key
                                            ? 'border-brand-primary bg-brand-primary/20 text-white'
                                            : 'border-slate-700 bg-slate-800 text-gray-400 hover:border-slate-600'
                                    )}
                                    role="radio"
                                    aria-checked={selectedPaymentMethod === key}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-1.5">
                            {onPrintBill ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onPrintBill({ subtotal, taxAmount, discountAmount, total })}
                                    disabled={isProcessing}
                                    className="h-11 flex-1 rounded-xl text-xs font-semibold border-slate-600 bg-slate-800 hover:bg-slate-700 text-white"
                                    title="Print bill"
                                >
                                    <Printer className="w-4 h-4 mr-1" /> Print
                                </Button>
                            ) : null}
                            {onDownloadBillPdf ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onDownloadBillPdf({ subtotal, taxAmount, discountAmount, total })}
                                    disabled={isProcessing}
                                    className="h-11 w-11 shrink-0 rounded-xl border-slate-600 bg-slate-800 hover:bg-slate-700 text-white p-0"
                                    title="Download PDF"
                                    aria-label="Download bill PDF"
                                >
                                    <FileDown className="w-4 h-4" />
                                </Button>
                            ) : null}
                            <Button
                                onClick={onCompleteSale}
                                disabled={isProcessing}
                                className="h-11 flex-[2] rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25"
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        Processing…
                                    </span>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-1.5 inline" />
                                        Pay {currency}{total.toLocaleString()}
                                    </>
                                )}
                            </Button>
                        </div>
                        {!hideKeyboardHint && (
                            <p className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
                                <Keyboard className="w-3 h-3" /> Ctrl+F search · Enter checkout
                            </p>
                        )}
                    </>
                ) : (
                    <div className="py-2 text-center">
                        <p className="text-[11px] text-gray-500">Checkout appears when you add items</p>
                        <p className="text-lg font-semibold text-slate-600 mt-1 tabular-nums">{currency}0</p>
                    </div>
                )}
            </footer>
        </div>
    );
}

// --- Main POS Terminal -------------------------------------------------------

export function PosTerminal({
    businessId,
    products = [],
    customers = [],
    onStartSession,
    onCompleteSale,
    currency = '₨',
    session,
    category: categoryProp,
}) {
    const { business, currencySymbol } = useBusiness();
    const category = categoryProp || business?.category || 'retail-shop';
    const posUi = useMemo(() => getPosUiConfig(category, business), [category, business]);
    const documentLabel = posUi.receiptLabel;
    const currencyCode = posUi.currencyCode;
    const displayCurrency = currencySymbol || posUi.currencySymbol;
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [customer, setCustomer] = useState(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('fixed'); // 'fixed' or 'percentage'
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [mobilePane, setMobilePane] = useState('browse');
    const searchInputRef = useRef(null);
    const { containerRef, isFullscreen, toggleFullscreen } = usePosFullscreen();
    const {
        autoPrintEnabled,
        toggleAutoPrint,
        lastSale,
        showSuccess,
        dismissSuccess,
        printBillFromCart,
        downloadBillPdfFromCart,
        recordSuccessfulSale,
        printLastReceipt,
        downloadLastReceiptPdf,
        formatSaleError,
    } = usePosReceipt({
        business,
        documentLabel,
        category,
        currencyCode,
    });

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl/Cmd + F - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            
            // Enter to complete sale when cart has items
            if (e.key === 'Enter' && cart.length > 0 && !isProcessing && !showCustomerDialog) {
                // Check if not in an input field
                if (e.target.tagName !== 'INPUT') {
                    e.preventDefault();
                    handleCompleteSale();
                }
            }
            
            // F11, fullscreen POS
            if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            }

            // Escape to clear search
            if (e.key === 'Escape' && searchTerm) {
                setSearchTerm('');
                searchInputRef.current?.focus();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.length, isProcessing, searchTerm, showCustomerDialog, toggleFullscreen]);

    const hasSession = Boolean(
        session?.id
        && session?.id !== 'sess-initial'
        && (session?.status === 'open' || session?.opened_at || session?.startTime)
    );
    const sessionStartedAt = session?.opened_at || session?.startTime;
    const sessionStartedLabel = sessionStartedAt
        ? new Date(sessionStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
    const terminalLabel = session?.terminalName || session?.terminal_name || posUi.terminalLabel;

    const categories = useMemo(
        () => buildPosCategoryChips(products, posUi.defaultCategories, posUi.maxCategoryChips),
        [products, posUi.defaultCategories, posUi.maxCategoryChips]
    );

    const filteredCustomers = useMemo(() => {
        if (!customerQuery.trim()) return (customers || []).slice(0, 40);
        const lower = customerQuery.toLowerCase();
        return (customers || []).filter(c =>
            c.name?.toLowerCase().includes(lower)
            || c.phone?.toLowerCase().includes(lower)
            || c.email?.toLowerCase().includes(lower)
        ).slice(0, 40);
    }, [customers, customerQuery]);

    const cartSummary = useMemo(() => {
        const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const totalTax = cart.reduce(
            (sum, i) => sum + (i.unitPrice * i.quantity) * ((i.taxPercent || 0) / 100),
            0
        );
        const taxAmount = Math.round(totalTax * 100) / 100;
        const rawDiscount = parseFloat(discount || 0);
        const discountAmount = discountType === 'percentage'
            ? Math.min(subtotal * (rawDiscount / 100), subtotal)
            : Math.min(rawDiscount, subtotal);
        const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;
        const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
        return { subtotal, taxAmount, discountAmount, total, itemCount };
    }, [cart, discount, discountType]);

    const handlePrintBill = useCallback((totalsFromCart) => {
        printBillFromCart({
            cart,
            customer,
            paymentMethod,
            discount,
            discountType,
            totalsFromCart,
        });
    }, [cart, customer, discount, discountType, paymentMethod, printBillFromCart]);

    const handleDownloadBillPdf = useCallback((totalsFromCart) => {
        downloadBillPdfFromCart({
            cart,
            customer,
            paymentMethod,
            discount,
            discountType,
            totalsFromCart,
        });
    }, [cart, customer, discount, discountType, paymentMethod, downloadBillPdfFromCart]);

    const handlePrintReceipt = useCallback(() => {
        printLastReceipt();
    }, [printLastReceipt]);

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
        const stock = getProductAvailableStock(product);
        if (stock <= 0) {
            toast.error(`${product.name} is out of stock`, { id: 'pos-stock' });
            return;
        }
        setCart((prev) => {
            const existing = prev.findIndex((i) => i.productId === product.id);
            if (existing >= 0) {
                const nextQty = prev[existing].quantity + 1;
                if (nextQty > stock) {
                    toast.error(`Only ${stock} in stock for ${product.name}`, { id: 'pos-stock' });
                    return prev;
                }
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: nextQty };
                return updated;
            }
            const defaultTax = Number(product.tax_percent);
            const taxPercent = Number.isFinite(defaultTax) && defaultTax >= 0
                ? defaultTax
                : posUi.defaultTaxRate;
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                imageUrl: getEffectiveProductImageUrl(product, category),
                unitPrice: parseFloat(product.selling_price || product.price || 0),
                taxPercent,
                quantity: 1,
                maxStock: stock,
            }];
        });
        setSearchTerm('');
    }, [posUi.defaultTaxRate, category]);

    const handleQuantityChange = useCallback((idx, qty) => {
        setCart((prev) => prev.map((item, i) => {
            if (i !== idx) return item;
            const cap = item.maxStock ?? getProductAvailableStock(
                products.find((p) => p.id === item.productId)
            );
            const next = Math.max(1, Math.min(Number(qty) || 1, cap > 0 ? cap : Number(qty) || 1));
            if (cap > 0 && next > cap) {
                toast.error(`Max ${cap} available for ${item.name}`, { id: 'pos-stock' });
            }
            return { ...item, quantity: cap > 0 ? Math.min(next, cap) : next };
        }));
    }, [products]);

    const handleRemoveItem = useCallback((idx) => {
        setCart(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const handleCompleteSale = useCallback(async () => {
        if (cart.length === 0 || isProcessing) return;
        setIsProcessing(true);
        try {
            const payload = buildPosCheckoutPayload({
                businessId,
                sessionId: session?.id,
                customerId: customer?.id || null,
                cart,
                discount,
                discountType,
                paymentMethod,
            });

            const result = await onCompleteSale?.(payload);

            if (result?.success) {
                recordSuccessfulSale({
                    result,
                    payload,
                    cart,
                    customer,
                    paymentMethod,
                    hasSession,
                });
                setCart([]);
                setCustomer(null);
                setDiscount(0);
                setDiscountType('fixed');
                setMobilePane('browse');
            } else if (result?.error) {
                toast.error(formatSaleError(result), { id: 'pos-sale-error' });
            }
        } catch (err) {
            console.error('POS sale error:', err);
            toast.error(err?.message || 'Sale failed', { id: 'pos-sale-error' });
        } finally {
            setIsProcessing(false);
        }
    }, [cart, businessId, session, customer, discount, discountType, paymentMethod, isProcessing, onCompleteSale, hasSession, recordSuccessfulSale, formatSaleError]);

    const cartPanelProps = {
        items: cart,
        onQuantityChange: handleQuantityChange,
        onRemoveItem: handleRemoveItem,
        onClearCart: () => setCart([]),
        customer,
        onCustomerSelect: () => setShowCustomerDialog(true),
        discount,
        discountType,
        onDiscountChange: setDiscount,
        onDiscountTypeChange: setDiscountType,
        onPaymentMethodSelect: setPaymentMethod,
        onCompleteSale: handleCompleteSale,
        isProcessing,
        currency: displayCurrency,
        taxLabel: posUi.taxLabel,
        selectedPaymentMethod: paymentMethod,
        loyaltyBalance: 0,
        businessCategory: category,
        onPrintBill: handlePrintBill,
        onDownloadBillPdf: handleDownloadBillPdf,
    };

    const posShellHeader = (
        <header className={cn(POS_SHELL_HEADER, 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 lg:px-4 py-2 border-b border-gray-200 bg-white')}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs lg:text-sm font-bold text-gray-900 truncate">
                    {posUi.terminalLabel}
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className={cn(
                    'text-[10px] lg:text-xs font-semibold truncate',
                    hasSession ? 'text-emerald-600' : 'text-amber-600'
                )}>
                    {hasSession
                        ? `Session · ${terminalLabel}${sessionStartedLabel ? ` · ${sessionStartedLabel}` : ''}`
                        : 'No session'}
                </span>
                {!hasSession && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] flex-shrink-0 ml-auto sm:ml-0"
                        onClick={handleStartSession}
                        disabled={isStartingSession}
                    >
                        {isStartingSession ? '…' : 'Start'}
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
                <span className="text-[10px] font-semibold text-gray-500 mr-1 hidden md:inline tabular-nums">
                    Cart {displayCurrency}{cartSummary.total.toLocaleString()}
                </span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn('h-8 px-2 text-[10px] font-semibold', autoPrintEnabled ? 'text-emerald-600' : 'text-gray-500')}
                                onClick={toggleAutoPrint}
                                aria-pressed={autoPrintEnabled}
                            >
                                <Printer className="w-3.5 h-3.5 mr-1" />
                                Auto
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{autoPrintEnabled ? 'Auto-print on' : 'Auto-print off'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={toggleFullscreen}
                                aria-label={isFullscreen ? 'Exit full screen' : 'Full screen POS'}
                            >
                                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>{isFullscreen ? 'Exit (F11)' : 'Full screen (F11)'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </header>
    );

    return (
        <div
            ref={containerRef}
            className={cn(
                'flex flex-col min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm',
                getPosShellHeightClass(isFullscreen, 'terminal'),
                isFullscreen && 'fixed inset-0 z-[100] rounded-none border-0 shadow-none'
            )}
        >
            {posShellHeader}
            {/* Desktop, one-page split */}
            <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
                <section className="flex-1 min-w-0 flex flex-col min-h-0 bg-white border-r border-gray-100">
                    <PosProductGrid
                        products={products}
                        categories={categories}
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                        onAddToCart={addToCart}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        currency={displayCurrency}
                        taxLabel={posUi.taxLabel}
                        barcodeFirst={posUi.barcodeFirst}
                        businessCategory={category}
                    />
                </section>
                <aside className="w-[min(100%,380px)] xl:w-[420px] shrink-0 flex flex-col min-h-0 bg-slate-900">
                    <PosCart {...cartPanelProps} />
                </aside>
            </div>

            {/* Mobile, browse / checkout panes */}
            <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
                {mobilePane === 'browse' ? (
                    <>
                        <div className="flex-1 min-h-0 flex flex-col bg-white">
                            <PosProductGrid
                                products={products}
                                categories={categories}
                                activeCategory={activeCategory}
                                onCategoryChange={setActiveCategory}
                                onAddToCart={addToCart}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                currency={displayCurrency}
                                taxLabel={posUi.taxLabel}
                                barcodeFirst={posUi.barcodeFirst}
                                businessCategory={category}
                            />
                        </div>
                        {cart.length > 0 ? (
                            <footer className={cn(POS_SHELL_FOOTER, 'shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white border-slate-700')}>
                                <button
                                    type="button"
                                    onClick={() => setMobilePane('checkout')}
                                    className="flex items-center justify-between gap-3 w-full active:opacity-90"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary text-xs font-semibold">
                                            {cartSummary.itemCount}
                                        </span>
                                        <span className="text-sm font-semibold truncate">View cart & pay</span>
                                    </div>
                                    <span className="text-base font-semibold text-brand-primary flex-shrink-0 tabular-nums">
                                        {displayCurrency}{cartSummary.total.toLocaleString()}
                                    </span>
                                </button>
                            </footer>
                        ) : (
                            <footer className="shrink-0 px-4 py-2.5 text-center text-[11px] text-gray-400 border-t bg-white">
                                Tap a product to add to cart
                            </footer>
                        )}
                    </>
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                        <PosCart
                            {...cartPanelProps}
                            onBack={() => setMobilePane('browse')}
                            hideKeyboardHint
                        />
                    </div>
                )}
            </div>

            {/* Sale Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-20 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-md z-50 flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30"
                    >
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                            <p className="font-bold text-sm">Sale Completed!</p>
                            <p className="text-xs text-emerald-100">
                                {lastSale?.transaction_number} - {displayCurrency}{lastSale?.total?.toLocaleString()} ({lastSale?.mode === 'invoice-fallback' ? 'Invoice Mode' : 'POS Mode'})
                            </p>
                        </div>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500"
                            onClick={handlePrintReceipt}
                        >
                            <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500"
                            onClick={() => downloadLastReceiptPdf()}
                            aria-label="Download receipt PDF"
                        >
                            <FileDown className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500"
                            onClick={() => dismissSuccess()}
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
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

