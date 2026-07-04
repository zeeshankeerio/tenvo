'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Barcode, ShoppingCart, Plus, Minus, Trash2, X, CreditCard,
    Banknote, Smartphone, SplitSquareHorizontal, User, Clock, Hash,
    Receipt, CheckCircle2, Star, Gift, ChevronDown, RotateCcw, ArrowLeft,
    Layers, Weight, Package, ScanLine, Volume2, AlertTriangle, Filter,
    Maximize, Minimize, Printer, FileDown, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDomainConfig } from '@/lib/config/domains';
import { buildPosCheckoutPayload, computePosOrderTotals, getPosUiConfig } from '@/lib/utils/posHelpers';
import {
    buildPosDepartments,
    countProductsByDepartment,
    filterProductsByDepartment,
    getPosDomainFlags,
} from '@/lib/config/posDomains';
import { PosSessionBar } from '@/components/pos/shared/PosSessionBar';
import { PosCloseShiftDialog } from '@/components/pos/shared/PosCloseShiftDialog';
import { PosSplitPaymentDialog } from '@/components/pos/shared/PosSplitPaymentDialog';
import { PosProductBrowseGrid } from '@/components/pos/shared/PosProductBrowseGrid';
import { PosCameraScanner } from '@/components/pos/shared/PosCameraScanner';
import { PosPharmacyBatchDialog } from '@/components/pos/shared/PosPharmacyBatchDialog';
import { PosMobileCheckoutBar } from '@/components/pos/shared/PosMobileCheckoutBar';
import { PosOfflineBanner } from '@/components/pos/shared/PosOfflineBanner';
import { usePosSettings } from '@/lib/hooks/usePosSettings';
import { usePosOffline } from '@/lib/hooks/usePosOffline';
import { usePosProductAdd } from '@/lib/hooks/usePosProductAdd';
import {
    getPosShellHeightClass,
    POS_SHELL_FOOTER,
} from '@/lib/utils/posLayout';
import { usePosFullscreen } from '@/lib/hooks/usePosFullscreen';
import { usePosReceipt } from '@/lib/hooks/usePosReceipt';
import { getEffectiveProductImageUrl } from '@/lib/storefront/productImageFallback';
import { ProductThumbnail } from '@/components/product/ProductThumbnail';
import toast from 'react-hot-toast';

// --- Department Filter Bar ---------------------------------------------------

function DepartmentBar({ departments, activeDepartment, onDepartmentChange, productCounts }) {
    return (
        <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-thin
                        bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            {departments.map(dept => {
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
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
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

// --- Scanned Items List ------------------------------------------------------

function ScannedItemsList({
    items, onQuantityChange, onRemoveItem, onWeightChange,
    onPriceOverride, currency, businessCategory,
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
                            <span className="text-[10px] font-bold text-gray-300 w-5 text-right shrink-0">
                                {idx + 1}
                            </span>

                            <ProductThumbnail
                                product={{ image_url: item.imageUrl, name: item.name, id: item.productId }}
                                businessCategory={businessCategory}
                                size="md"
                                className="border border-gray-100"
                            />

                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-gray-400 font-mono">{item.sku || item.barcode || '--'}</span>
                                    {item.isWeightItem && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-300 text-amber-600">
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
                                        className="w-14 text-center text-xs font-semibold bg-white rounded px-1 py-1 border-0"
                                        step="0.01"
                                        min="0.01"
                                    />
                                ) : (
                                    <div className="flex items-center">
                                        <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                                        {/* Quick Add Presets for Retail Crate/Bulk */}
                                        <div className="flex flex-col ml-1 border-l border-gray-200 pl-1">
                                            <button onClick={() => onQuantityChange(idx, item.quantity + 5)} className="text-[7px] font-semibold text-emerald-600 hover:bg-emerald-50 px-1 rounded">+5</button>
                                            <button onClick={() => onQuantityChange(idx, item.quantity + 12)} className="text-[7px] font-semibold text-brand-primary hover:bg-brand-50 px-1 rounded">+12</button>
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
                            <span className="text-xs font-semibold text-gray-900 w-20 text-right shrink-0">
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
    currency = 'Rs.', heldOrders = [], onResumeHeldSale, onPrintBill, onDownloadBillPdf,
    onBack,
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
        <div className="flex flex-col h-full bg-slate-900 text-white touch-manipulation min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 max-lg:px-3 py-3 max-lg:py-2 border-b border-slate-700/50 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {onBack ? (
                        <button type="button" onClick={onBack} className="p-1.5 -ml-1 rounded-lg hover:bg-slate-800" aria-label="Back">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    ) : null}
                    <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm font-semibold tracking-tight">CART</span>
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
                            <div className="flex justify-between text-2xl max-lg:text-xl font-semibold text-white pt-3 max-lg:pt-2 border-t border-slate-700">
                                <span>TOTAL</span>
                                <span className="text-emerald-400">{currency}{total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="grid grid-cols-4 gap-1.5 max-lg:gap-1 pt-2 max-lg:pt-1.5">
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
                                        'flex flex-col items-center gap-1 py-2 max-lg:py-1.5 rounded-lg border border-slate-700 bg-slate-800 transition-all text-gray-400 touch-manipulation',
                                        color
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-[10px] font-medium">{label}</span>
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

                        {onPrintBill ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onPrintBill({ subtotal, taxAmount, discountAmount, total })}
                                disabled={isProcessing}
                                className="w-full h-9 rounded-lg text-[10px] font-bold border-slate-700 text-gray-300 bg-slate-800 hover:bg-slate-700"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1.5" /> PRINT
                            </Button>
                        ) : null}
                        {onDownloadBillPdf ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onDownloadBillPdf({ subtotal, taxAmount, discountAmount, total })}
                                disabled={isProcessing}
                                className="w-full h-9 rounded-lg text-[10px] font-bold border-slate-700 text-gray-300 bg-slate-800 hover:bg-slate-700"
                            >
                                <FileDown className="w-3.5 h-3.5 mr-1.5" /> PDF
                            </Button>
                        ) : null}

                        {/* Complete Sale */}
                        <Button
                            onClick={onCompleteSale}
                            disabled={isProcessing || items.length === 0}
                            className="w-full h-14 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600
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
                                    CHECKOUT - {currency}{total.toLocaleString()}
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
    businessId, products = [], customers = [], onStartSession, onCloseSession,
    onCompleteSale, currency = 'Rs.', session, taxConfig, category: categoryProp,
}) {
    const { business, currencySymbol } = useBusiness();
    const category = categoryProp || business?.category || 'supermarket';
    const posUi = getPosUiConfig(category, business);
    const domainFlags = getPosDomainFlags(category);
    const departments = useMemo(
        () => buildPosDepartments(category, products, posUi.maxCategoryChips + 2),
        [category, products, posUi.maxCategoryChips]
    );
    const domainConfig = getDomainConfig(category);
    const documentLabel = posUi.receiptLabel || domainConfig?.label_overrides?.invoice || 'Receipt';
    const currencyCode = posUi.currencyCode;
    const displayCurrency = currencySymbol || posUi.currencySymbol;
    const effectiveTaxRate = taxConfig?.sales_tax_rate ?? posUi.defaultTaxRate;
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeDepartment, setActiveDepartment] = useState('all');
    const [customer, setCustomer] = useState(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [splitPayments, setSplitPayments] = useState(null);
    const [showSplitDialog, setShowSplitDialog] = useState(false);
    const [showCloseShiftDialog, setShowCloseShiftDialog] = useState(false);
    const [mobilePane, setMobilePane] = useState('browse');
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const [pharmacyProduct, setPharmacyProduct] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [heldOrders, setHeldOrders] = useState([]);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScannedItem, setLastScannedItem] = useState(null);
    const posSettings = usePosSettings();
    const { isOnline, pendingCount, isSyncing, queueSale, syncPending } = usePosOffline(businessId, {
        enabled: posSettings.offlineModeEnabled,
    });
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
        printLastReceipt();
    }, [printLastReceipt]);

    const handleDownloadBillPdf = useCallback((totalsFromCart) => {
        downloadBillPdfFromCart({
            cart,
            customer,
            paymentMethod,
            discount,
            discountType: 'fixed',
            totalsFromCart,
        });
    }, [cart, customer, discount, paymentMethod, downloadBillPdfFromCart]);

    const handlePrintBill = useCallback((totalsFromCart) => {
        printBillFromCart({
            cart,
            customer,
            paymentMethod,
            discount,
            discountType: 'fixed',
            totalsFromCart,
        });
    }, [cart, customer, discount, paymentMethod, printBillFromCart]);

    const handleStartSession = useCallback(async () => {
        if (!onStartSession || isStartingSession) return;
        setIsStartingSession(true);
        try {
            await onStartSession();
        } finally {
            setIsStartingSession(false);
        }
    }, [onStartSession, isStartingSession]);

    // --- Fullscreen (shared hook) --------------------------------------------

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

    const productCounts = useMemo(() => countProductsByDepartment(products), [products]);

    const filteredProducts = useMemo(() => {
        let items = filterProductsByDepartment(products, activeDepartment);
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

    const handlePaymentMethodSelect = useCallback((method) => {
        if (method === 'split') {
            setShowSplitDialog(true);
            return;
        }
        setSplitPayments(null);
        setPaymentMethod(method);
    }, []);

    const { tryAddProduct, handleScanCode } = usePosProductAdd({
        category,
        posSettings,
        effectiveTaxRate,
        setCart,
        setPharmacyProduct,
        onAdded: (product) => {
            setLastScannedItem(product.name);
            setTimeout(() => setLastScannedItem(null), 1500);
        },
    });

    const addToCart = tryAddProduct;

    const showCamera = posSettings.barcodeMode === 'camera' || posSettings.barcodeMode === 'auto';

    // --- Cart Operations -----------------------------------------------------

    const handleBarcodeScan = useCallback((barcode) => {
        setIsScanning(true);
        const product = handleScanCode(products, barcode, { clearSearch: () => setSearchTerm('') });
        if (!product) {
            setLastScannedItem(`[WARNING] "${barcode}" not found`);
            setTimeout(() => setLastScannedItem(null), 2000);
        }
        setTimeout(() => setIsScanning(false), 300);
    }, [products, handleScanCode]);

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
            const payload = buildPosCheckoutPayload({
                businessId,
                sessionId: session?.id,
                customerId: customer?.id || null,
                cart: cart.map((i) => ({
                    ...i,
                    taxPercent: i.taxPercent ?? effectiveTaxRate,
                    batchId: i.batchId || null,
                })),
                discount,
                discountType: 'fixed',
                paymentMethod: splitPayments?.length ? 'split' : paymentMethod,
                payments: splitPayments || undefined,
            });

            if (!isOnline && posSettings.offlineModeEnabled) {
                await queueSale(payload);
                toast.success('Sale saved offline — will sync when online', { id: 'pos-offline' });
                setCart([]);
                setCustomer(null);
                setDiscount(0);
                setSplitPayments(null);
                setPaymentMethod('cash');
                setMobilePane('browse');
                return;
            }

            const result = await onCompleteSale?.({
                ...payload,
                metadata: { domain: category, taxRate: effectiveTaxRate },
            });

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
                setSplitPayments(null);
                setPaymentMethod('cash');
                setMobilePane('browse');
            } else if (result?.error) {
                toast.error(formatSaleError(result), { id: 'pos-sale-error' });
            }
        } catch (err) {
            console.error('SuperStore POS sale error:', err);
            toast.error(err?.message || 'Sale failed', { id: 'pos-sale-error' });
        } finally {
            setIsProcessing(false);
        }
    }, [cart, businessId, session, customer, discount, paymentMethod, splitPayments, isProcessing, onCompleteSale, hasSession, effectiveTaxRate, category, recordSuccessfulSale, formatSaleError, isOnline, posSettings.offlineModeEnabled, queueSale]);

    const cartSummary = useMemo(() => {
        const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const taxAmount = Math.round(cart.reduce((s, i) => s + (i.unitPrice * i.quantity) * ((i.taxPercent || 0) / 100), 0) * 100) / 100;
        const discountAmount = parseFloat(discount || 0);
        const total = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;
        const itemCount = cart.reduce((s, i) => s + (i.isWeightItem ? 1 : i.quantity), 0);
        return { subtotal, taxAmount, discountAmount, total, itemCount };
    }, [cart, discount]);

    // --- Keyboard Shortcuts --------------------------------------------------

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F9') { e.preventDefault(); handleCompleteSale(); }
            if (e.key === 'F8') { e.preventDefault(); handleHoldSale(); }
            if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
            if (e.key === 'Escape') { handleVoidSale(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCompleteSale, handleHoldSale, handleVoidSale, toggleFullscreen]);

    // --- Render --------------------------------------------------------------

    return (
        <div
            ref={containerRef}
            className={cn(
                'flex flex-col min-h-0 overflow-hidden bg-gray-50 border border-gray-200 touch-manipulation transition-all',
                getPosShellHeightClass(isFullscreen, 'terminal'),
                isFullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : 'rounded-xl shadow-sm'
            )}
        >
            {/* Desktop split */}
            <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-w-0 bg-white flex flex-col min-h-0">
                    <PosSessionBar hasSession={hasSession} terminalLabel={terminalLabel} sessionStartedLabel={sessionStartedLabel} isStartingSession={isStartingSession} onStartSession={handleStartSession} onCloseSession={hasSession ? () => setShowCloseShiftDialog(true) : undefined} />
                    <PosOfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} onSync={syncPending} />
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
                        <BarcodeScannerInput onScan={handleBarcodeScan} searchTerm={searchTerm} onSearchChange={setSearchTerm} isScanning={isScanning} />
                        <div className="flex items-center gap-1.5 shrink-0">
                            {(showCamera) && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCameraScanner(true)} aria-label="Camera scan"><Camera className="w-4 h-4" /></Button>
                            )}
                            <Badge variant="outline" className={cn('text-[10px] h-7 px-2 font-bold', lastScannedItem?.startsWith('[WARNING]') ? 'border-red-300 text-red-500' : lastScannedItem ? 'border-emerald-300 text-emerald-600' : 'border-gray-200 text-gray-400')}>{lastScannedItem || 'Ready to scan'}</Badge>
                            <Button variant="ghost" size="sm" onClick={toggleAutoPrint} className={cn('h-8 px-2 text-[10px]', autoPrintEnabled ? 'text-emerald-600' : 'text-gray-400')}><Printer className="w-3.5 h-3.5 mr-1" />Auto</Button>
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8">{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}</Button>
                        </div>
                    </div>
                    <DepartmentBar departments={departments} activeDepartment={activeDepartment} onDepartmentChange={setActiveDepartment} productCounts={productCounts} />
                    {cart.length > 0 ? (
                        <ScannedItemsList items={cart} onQuantityChange={handleQuantityChange} onRemoveItem={handleRemoveItem} onWeightChange={handleWeightChange} currency={displayCurrency} businessCategory={category} />
                    ) : !searchTerm ? (
                        <PosProductBrowseGrid products={filteredProducts} onAddToCart={addToCart} currency={displayCurrency} businessCategory={category} />
                    ) : (
                        <ScannedItemsList items={cart} onQuantityChange={handleQuantityChange} onRemoveItem={handleRemoveItem} onWeightChange={handleWeightChange} currency={displayCurrency} businessCategory={category} />
                    )}
                    {searchTerm && (
                        <div className="border-t overflow-y-auto max-h-64 bg-gray-50/50">{filteredProducts.slice(0, 8).map((p) => (
                            <button key={p.id} type="button" onClick={() => { addToCart(p); setSearchTerm(''); }} className="flex w-full px-4 py-2 text-left hover:bg-emerald-50/50 text-xs font-bold">{p.name}</button>
                        ))}</div>
                    )}
                    <div className="shrink-0 flex justify-between px-4 py-1.5 bg-gray-50 border-t text-[10px] font-bold text-gray-400 uppercase"><span>F9 Checkout</span><span>F8 Hold</span><span>ESC Void</span></div>
                </div>
                <aside className="w-[min(100%,400px)] shrink-0 flex flex-col min-h-0">
                    <CartSummary {...{ items: cart, customer, onCustomerSelect: () => setShowCustomerDialog(true), discount, onDiscountChange: setDiscount, onPaymentMethodSelect: handlePaymentMethodSelect, onCompleteSale: handleCompleteSale, onHoldSale: handleHoldSale, onVoidSale: handleVoidSale, onResumeHeldSale: handleResumeLastHeldSale, onPrintBill: handlePrintBill, onDownloadBillPdf: handleDownloadBillPdf, isProcessing, currency: displayCurrency, heldOrders, taxConfig }} />
                </aside>
            </div>

            {/* Mobile app-style panes */}
            <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
                {mobilePane === 'browse' ? (
                    <>
                        <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
                            <PosSessionBar hasSession={hasSession} terminalLabel={terminalLabel} sessionStartedLabel={sessionStartedLabel} isStartingSession={isStartingSession} onStartSession={handleStartSession} onCloseSession={hasSession ? () => setShowCloseShiftDialog(true) : undefined} className="mx-2 mt-2 max-lg:mx-1.5 max-lg:mt-1 max-lg:pt-[env(safe-area-inset-top)]" />
                            <PosOfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} onSync={syncPending} className="mx-2 max-lg:mx-1.5" />
                            <div className="flex items-center gap-1.5 px-3 max-lg:px-2 py-2 max-lg:py-1.5 border-b shrink-0">
                                <BarcodeScannerInput onScan={handleBarcodeScan} searchTerm={searchTerm} onSearchChange={setSearchTerm} isScanning={isScanning} />
                                {showCamera && (
                                    <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 touch-manipulation" onClick={() => setShowCameraScanner(true)} aria-label="Scan with camera"><Camera className="w-5 h-5" /></Button>
                                )}
                            </div>
                            <DepartmentBar departments={departments} activeDepartment={activeDepartment} onDepartmentChange={setActiveDepartment} productCounts={productCounts} />
                            {cart.length > 0 ? (
                                <ScannedItemsList items={cart} onQuantityChange={handleQuantityChange} onRemoveItem={handleRemoveItem} onWeightChange={handleWeightChange} currency={displayCurrency} businessCategory={category} />
                            ) : (
                                <PosProductBrowseGrid products={filteredProducts} onAddToCart={addToCart} currency={displayCurrency} businessCategory={category} />
                            )}
                        </div>
                        {cartSummary.itemCount > 0 ? (
                            <PosMobileCheckoutBar
                                itemCount={cartSummary.itemCount}
                                total={cartSummary.total}
                                currency={displayCurrency}
                                onOpenCheckout={() => setMobilePane('checkout')}
                            />
                        ) : (
                            <footer className="shrink-0 px-4 py-2.5 text-center text-[11px] text-gray-400 border-t bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
                                Tap a product or scan barcode to add
                            </footer>
                        )}
                    </>
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                        <CartSummary {...{ items: cart, customer, onCustomerSelect: () => setShowCustomerDialog(true), discount, onDiscountChange: setDiscount, onPaymentMethodSelect: handlePaymentMethodSelect, onCompleteSale: handleCompleteSale, onHoldSale: handleHoldSale, onVoidSale: handleVoidSale, onResumeHeldSale: handleResumeLastHeldSale, onPrintBill: handlePrintBill, onDownloadBillPdf: handleDownloadBillPdf, isProcessing, currency: displayCurrency, heldOrders, taxConfig, onBack: () => setMobilePane('browse') }} />
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
                        className="fixed bottom-20 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-md z-50 flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30"
                    >
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                            <p className="font-bold text-sm">Sale Complete!</p>
                            <p className="text-xs text-emerald-100">
                                {lastSale?.transaction_number} - {displayCurrency}{lastSale?.total?.toLocaleString()} ({lastSale?.mode === 'invoice-fallback' ? 'Invoice Mode' : 'POS Mode'})
                            </p>
                        </div>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500 ml-2"
                            onClick={handlePrintReceipt}
                        >
                            <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500"
                            onClick={() => downloadLastReceiptPdf()}
                            aria-label="Download PDF"
                        >
                            <FileDown className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            className="text-emerald-100 hover:text-white hover:bg-emerald-500"
                            onClick={dismissSuccess}
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

            <PosCameraScanner open={showCameraScanner} onClose={() => setShowCameraScanner(false)} onScan={handleBarcodeScan} />

            <PosPharmacyBatchDialog
                open={Boolean(pharmacyProduct)}
                onOpenChange={(open) => !open && setPharmacyProduct(null)}
                businessId={businessId}
                product={pharmacyProduct}
                onConfirm={(batchMeta) => pharmacyProduct && tryAddProduct(pharmacyProduct, batchMeta)}
            />

            <PosSplitPaymentDialog
                open={showSplitDialog}
                onOpenChange={setShowSplitDialog}
                total={computePosOrderTotals(
                    cart.map((i) => ({
                        productId: i.productId,
                        unitPrice: i.unitPrice,
                        quantity: i.quantity,
                        taxPercent: i.taxPercent ?? effectiveTaxRate,
                    })),
                    { discount, discountType: 'fixed' }
                ).total}
                currency={displayCurrency}
                onConfirm={(payments) => {
                    setSplitPayments(payments);
                    setPaymentMethod('split');
                }}
            />

            <PosCloseShiftDialog
                open={showCloseShiftDialog}
                onOpenChange={setShowCloseShiftDialog}
                businessId={businessId}
                session={session}
                currency={displayCurrency}
                onClosed={() => {
                    onCloseSession?.();
                    setShowCloseShiftDialog(false);
                }}
            />
        </div>
    );
}

