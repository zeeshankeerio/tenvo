'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart3, Volume2, Vibrate, Zap, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getBusinessRegionalPack } from '@/lib/utils/businessRegionalContext';

/**
 * MobileOptimizedPOS Component
 * Touch-first checkout for phones and tablets
 * 
 * Optimizations:
 * - 44px minimum touch targets
 * - Vertical scrolling only (not horizontal)
 * - Large font sizes (16px+ for readability)
 * - Haptic feedback on actions
 * - Barcode scanner integration support
 * - One-handed operation possible
 */
export function MobileOptimizedPOS({
    products = [],
    customers = [],
    onCompleteSale,
    currency: currencyProp,
    defaultTax: defaultTaxProp,
}) {
    const { business, currency: ctxCurrency } = useBusiness();
    const pack = getBusinessRegionalPack(business);
    const currency = currencyProp || ctxCurrency || pack.currency;
    const defaultTax = defaultTaxProp ?? pack.defaultTaxRate ?? 0;
    const [isPortrait, setIsPortrait] = useState(true);
    const [cartItems, setCartItems] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [showNumpad, setShowNumpad] = useState(false);
    const [useHaptics, setUseHaptics] = useState(true);

    const barcodeInputRef = useRef(null);

    // Detect orientation
    useEffect(() => {
        const handleOrientationChange = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
        return () => {
            window.removeEventListener('orientationchange', handleOrientationChange);
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, []);

    // Haptic feedback helper
    const triggerHaptic = (type = 'light') => {
        if (useHaptics && navigator.vibrate) {
            const patterns = {
                light: 10,
                medium: 20,
                strong: 50,
                success: [20, 10, 20],
            };
            navigator.vibrate(patterns[type] || patterns.light);
        }
    };

    // Barcode scanner support
    useEffect(() => {
        let barcodeBuffer = '';
        let barcodeTimeout;

        const handleBarcodeInput = (e) => {
            clearTimeout(barcodeTimeout);
            barcodeBuffer += e.key;

            if (e.key === 'Enter' && barcodeBuffer.length > 5) {
                const barcode = barcodeBuffer.slice(0, -1);
                const product = products.find(p => p.sku === barcode || p.barcode === barcode);
                if (product) {
                    handleAddItem(product);
                    triggerHaptic('success');
                } else {
                    toast.error('Product not found');
                    triggerHaptic('medium');
                }
                barcodeBuffer = '';
                return;
            }

            barcodeTimeout = setTimeout(() => {
                barcodeBuffer = '';
            }, 1000);
        };

        if (barcodeInputRef.current === document.activeElement) {
            document.addEventListener('keypress', handleBarcodeInput);
            return () => document.removeEventListener('keypress', handleBarcodeInput);
        }
    }, [products]);

    // Calculations
    const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const totalTax = cartItems.reduce((sum, item) => {
        const itemTax = (item.price * item.quantity) * ((item.tax_percent || 0) / 100);
        return sum + itemTax;
    }, 0);
    const taxAmount = Math.round(totalTax * 100) / 100;
    const total = subtotal + taxAmount;

    // Add item
    const handleAddItem = (product) => {
        const existing = cartItems.find(item => item.productId === product.id);
        if (existing) {
            setCartItems(cartItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            ));
        } else {
            setCartItems([...cartItems, {
                productId: product.id,
                name: product.name,
                price: product.selling_price || 0,
                quantity,
                tax_percent: parseFloat(product.tax_percent ?? product.taxPercent ?? 17),
                sku: product.sku,
            }]);
        }
        setProductSearch('');
        setQuantity(1);
        triggerHaptic('light');
    };

    // Remove item
    const handleRemoveItem = (productId) => {
        setCartItems(cartItems.filter(item => item.productId !== productId));
        triggerHaptic('light');
    };

    // Update quantity
    const handleQuantityChange = (productId, newQty) => {
        if (newQty <= 0) {
            handleRemoveItem(productId);
            return;
        }
        setCartItems(cartItems.map(item =>
            item.productId === productId ? { ...item, quantity: newQty } : item
        ));
    };

    // Filter products
    const suggestions = !productSearch.trim()
        ? products.slice(0, 6)
        : products.filter(p =>
            p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 6);

    // Complete sale
    const handleCompleteSale = async () => {
        if (!customerName.trim()) {
            toast.error('Enter customer name');
            return;
        }
        if (cartItems.length === 0) {
            toast.error('Add items to cart');
            return;
        }

        const invoiceData = {
            customer: { name: customerName },
            items: cartItems,
            subtotal,
            tax_total: taxAmount,
            grand_total: total,
            payment_method: 'cash',
        };

        try {
            await onCompleteSale?.(invoiceData);
            triggerHaptic('success');
            toast.success('✓ Sale completed!');
            setCartItems([]);
            setCustomerName('');
        } catch (error) {
            toast.error('Sale failed');
            triggerHaptic('medium');
        }
    };

    return (
        <div className={`flex flex-col h-screen bg-gray-50 ${!isPortrait ? 'flex-row' : ''}`}>
            {/* Hidden Barcode Input */}
            <input
                ref={barcodeInputRef}
                type="text"
                className="sr-only"
                placeholder="Scan barcode..."
                autoFocus
            />

            {/* Top Bar - Customer Input */}
            <div className="bg-white border-b-2 border-wine p-3 sticky top-0 z-10">
                <div className="space-y-2">
                    <Input
                        type="text"
                        placeholder="Customer name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="h-12 text-lg font-semibold"
                        list="customer-suggestions"
                    />
                    {customers.length > 0 && (
                        <datalist id="customer-suggestions">
                            {customers.slice(0, 5).map(c => (
                                <option key={c.id} value={c.name} />
                            ))}
                        </datalist>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-3 p-3">
                {/* Product Search - Sticky on Mobile */}
                <div className={`${isPortrait ? 'order-2' : 'w-2/5 flex flex-col'}`}>
                    <div className="bg-white rounded-xl p-3 border-2 border-blue-100 sticky top-0 z-10 shadow-sm">
                        <Input
                            type="text"
                            placeholder="[SEARCH] Search item or tap to scan..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            onFocus={() => barcodeInputRef.current?.focus()}
                            className="h-11 text-base mb-3"
                        />

                        {/* Quantity Input */}
                        <div className="flex gap-2 mb-3">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="flex-1 h-10 text-lg font-bold"
                            >
                                −
                            </Button>
                            <div className="flex-1 h-10 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 text-lg font-semibold">
                                {quantity}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setQuantity(quantity + 1)}
                                className="flex-1 h-10 text-lg font-bold"
                            >
                                +
                            </Button>
                        </div>

                        {/* Quick numpad for quantity */}
                        {showNumpad && (
                            <div className="grid grid-cols-3 gap-1 mb-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <Button
                                        key={num}
                                        variant="outline"
                                        onClick={() => {
                                            setQuantity(num);
                                            setShowNumpad(false);
                                        }}
                                        className="h-10 font-bold text-lg"
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    onClick={() => setShowNumpad(false)}
                                    className="col-span-3 h-10"
                                >
                                    ✓ Done
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Product Grid */}
                    <div className={`flex-1 overflow-y-auto mt-3 ${isPortrait ? 'order-4' : ''}`}>
                        <div className="grid grid-cols-2 gap-2">
                            {suggestions.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => handleAddItem(product)}
                                    className="p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all active:scale-95"
                                >
                                    <div className="font-bold text-sm line-clamp-2">{product.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{product.sku}</div>
                                    <div className="text-lg font-semibold text-wine mt-2">
                                        {formatCurrency(product.selling_price || 0, currency)}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Stock: {product.quantity || 0}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cart & Checkout - Always Visible on Mobile */}
                <div className={`${isPortrait ? 'order-1' : 'w-3/5 flex flex-col'} bg-white rounded-xl border-2 border-green-100 p-3 shadow-md flex flex-col`}>
                    <div className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-wine" />
                        Cart ({cartItems.length})
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                        {cartItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Add items to cart</p>
                            </div>
                        ) : (
                            cartItems.map(item => (
                                <div key={item.productId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate">{item.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {formatCurrency(item.price, currency)} × {item.quantity}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                            className="h-8 w-8 text-sm"
                                        >
                                            −
                                        </Button>
                                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                            className="h-8 w-8 text-sm"
                                        >
                                            +
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleRemoveItem(item.productId)}
                                            className="h-8 w-8 text-red-500"
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Totals */}
                    {cartItems.length > 0 && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border-2 border-gray-200 mb-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Tax:</span>
                                <span className="font-semibold">{formatCurrency(taxAmount, currency)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-xl font-semibold text-wine">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(total, currency)}</span>
                            </div>
                        </div>
                    )}

                    {/* Checkout Button */}
                    <Button
                        onClick={handleCompleteSale}
                        disabled={cartItems.length === 0 || !customerName.trim()}
                        className="w-full h-12 bg-wine hover:bg-wine/90 text-white font-semibold text-lg rounded-xl"
                    >
                        ✓ COMPLETE SALE
                    </Button>

                    {/* Settings */}
                    <div className="mt-2 text-xs text-gray-500 text-center">
                        <label className="flex items-center justify-center gap-2 cursor-pointer hover:text-gray-700">
                            <input
                                type="checkbox"
                                checked={useHaptics}
                                onChange={(e) => setUseHaptics(e.target.checked)}
                                className="w-4 h-4"
                            />
                            Haptic Feedback
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
