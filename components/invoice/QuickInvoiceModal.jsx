'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Trash2, Check, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/currency';
import { getDomainKnowledge } from '@/lib/domainKnowledge';

/**
 * QuickInvoiceModal Component
 * Optimized for fast retail checkout (< 30 seconds per transaction)
 * 
 * Features:
 * - Minimal input fields (customer, items, payment)
 * - Smart autocomplete for products and customers
 * - Recent items quick-add
 * - One-click repeat last order for repeat customers
 * - Mobile-optimized layout
 * - Keyboard shortcuts (Tab to next field, Enter to add item)
 * - One-click payment methods
 * 
 * Keyboard Shortcuts:
 * - Esc: Close modal
 * - Tab: Navigate fields
 * - Enter: Add item / Complete sale
 * - +: Add quantity
 * - -: Reduce quantity
 * - Ctrl/Cmd + C: Clear cart
 * - Ctrl/Cmd + L: Load last customer order
 */
export function QuickInvoiceModal({
    isOpen,
    onClose,
    onSave,
    businessId,
    category = 'retail-shop',
    products = [],
    customers = [],
    recentTransactions = [],
    currency = 'PKR',
}) {
    const domainKnowledge = getDomainKnowledge(category);
    const defaultTax = domainKnowledge?.defaultTax || 17;
    
    // Focus refs for keyboard navigation
    const customerInputRef = useRef(null);
    const productSearchRef = useRef(null);

    // Form State
    const [cartItems, setCartItems] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtered autocomplete suggestions
    const productSuggestions = useMemo(() => {
        if (!productSearch.trim()) {
            return products.slice(0, 8); // Show recent if no search
        }
        const query = productSearch.toLowerCase();
        return products
            .filter(p => p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query))
            .slice(0, 8);
    }, [productSearch, products]);

    const customerSuggestions = useMemo(() => {
        if (!customerName.trim()) return [];
        const query = customerName.toLowerCase();
        return customers
            .filter(c => c.name?.toLowerCase().includes(query) || c.phone?.includes(customerName))
            .slice(0, 5);
    }, [customerName, customers]);

    const recentCustomerQuickPicks = useMemo(() => {
        const list = [];
        const seen = new Set();

        (recentTransactions || []).forEach((tx) => {
            const name = String(tx.customer_name || tx.customer?.name || '').trim();
            if (!name) return;

            const key = name.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);

            list.push({
                name,
                phone: tx.customer_phone || tx.customer?.phone || '',
            });
        });

        return list.slice(0, 6);
    }, [recentTransactions]);

    // Find last invoice for current customer to enable repeat-order
    const lastCustomerInvoice = useMemo(() => {
        if (!customerName.trim()) return null;
        const customerLower = customerName.toLowerCase();
        
        // Find most recent transaction for this customer
        const lastTx = (recentTransactions || []).find(tx => {
            const name = String(tx.customer_name || tx.customer?.name || '').trim().toLowerCase();
            return name === customerLower;
        });
        
        return lastTx && lastTx.items ? lastTx : null;
    }, [customerName, recentTransactions]);

    const hasLoadableLastOrder = Boolean(lastCustomerInvoice?.items?.length);

    const resolveProductFromSearch = () => {
        const search = productSearch.trim().toLowerCase();
        if (!search) return null;

        const exactMatch = products.find((p) => {
            const name = String(p.name || '').trim().toLowerCase();
            const sku = String(p.sku || '').trim().toLowerCase();
            return name === search || sku === search;
        });

        return exactMatch || productSuggestions[0] || null;
    };

    // Calculations
    const totals = useMemo(() => {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discountAmount = (subtotal * discount) / 100;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * defaultTax) / 100;
        const total = taxableAmount + taxAmount;

        return {
            subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total,
            items: cartItems.length,
        };
    }, [cartItems, discount, defaultTax]);

    // Add item to cart
    const handleAddItem = (product) => {
        if (!product) return;
        const unitPrice = Number(product.selling_price || product.markup_price || 0);
        if (unitPrice <= 0) {
            toast.error('Selected product has no valid selling price');
            return;
        }

        const existingItem = cartItems.find(item => item.productId === product.id);
        
        if (existingItem) {
            setCartItems(cartItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
            ));
        } else {
            setCartItems([...cartItems, {
                productId: product.id,
                name: product.name,
                price: unitPrice,
                quantity,
                sku: product.sku,
            }]);
        }

        setProductSearch('');
        setQuantity(1);
        toast.success(`${product.name} added (${quantity})`);
        productSearchRef.current?.focus();
    };

    // Remove item from cart
    const handleRemoveItem = (productId) => {
        setCartItems(cartItems.filter(item => item.productId !== productId));
    };

    const handleClearCart = () => {
        setCartItems([]);
        toast.success('Cart cleared');
    };

    const getLinePrice = (item, matchedProduct) => {
        const direct = Number(item.unit_price || item.price || 0);
        if (direct > 0) return direct;

        const qty = Number(item.quantity || 1);
        const total = Number(item.total_amount || item.line_total || 0);
        if (qty > 0 && total > 0) return total / qty;

        return Number(matchedProduct?.selling_price || matchedProduct?.markup_price || 0);
    };

    // Load items from last invoice for quick repeat
    const handleLoadLastInvoice = () => {
        if (!lastCustomerInvoice?.items || lastCustomerInvoice.items.length === 0) {
            toast.error('No previous items found');
            return;
        }

        if (cartItems.length > 0) {
            toast.error('Clear cart before loading last order');
            return;
        }

        const loadedItems = lastCustomerInvoice.items
            .map((item) => {
                const matchedProduct = products.find((p) => {
                    if (item.product_id && p.id === item.product_id) return true;

                    const itemName = String(item.name || '').trim().toLowerCase();
                    const itemSku = String(item.sku || item.description || '').trim().toLowerCase();
                    const productName = String(p.name || '').trim().toLowerCase();
                    const productSku = String(p.sku || '').trim().toLowerCase();

                    return (itemName && productName === itemName) || (itemSku && productSku === itemSku);
                });

                const price = getLinePrice(item, matchedProduct);
                const qty = Math.max(1, Number(item.quantity || 1));
                const productId = item.product_id || matchedProduct?.id;
                const name = item.name || matchedProduct?.name;

                if (!productId || !name || price <= 0) return null;

                return {
                    productId,
                    name,
                    price,
                    quantity: qty,
                    sku: item.sku || matchedProduct?.sku || item.description || '',
                };
            })
            .filter(Boolean);

        const mergedItems = Array.from(
            loadedItems.reduce((map, item) => {
                if (!map.has(item.productId)) {
                    map.set(item.productId, { ...item });
                } else {
                    const existing = map.get(item.productId);
                    map.set(item.productId, {
                        ...existing,
                        quantity: existing.quantity + item.quantity,
                    });
                }
                return map;
            }, new Map()).values()
        );

        if (mergedItems.length === 0) {
            toast.error('No valid items found to load from last order');
            return;
        }

        setCartItems(mergedItems);
        toast.success(`Loaded ${mergedItems.length} items from last order`);
        productSearchRef.current?.focus();
    };

    // Update item quantity
    const handleQuantityChange = (productId, newQuantity) => {
        if (newQuantity <= 0) {
            handleRemoveItem(productId);
            return;
        }
        setCartItems(cartItems.map(item =>
            item.productId === productId
                ? { ...item, quantity: newQuantity }
                : item
        ));
    };

    // Complete sale
    const handleCompleteSale = async () => {
        if (isSubmitting) return;

        if (cartItems.length === 0) {
            toast.error('Add items to cart first');
            return;
        }

        if (!customerName.trim()) {
            toast.error('Enter customer name');
            customerInputRef.current?.focus();
            return;
        }

        if (!businessId) {
            toast.error('Business context is missing');
            return;
        }

        const paymentStatus = paymentMethod === 'cash' || paymentMethod === 'card' ? 'paid' : 'pending';
        const invoiceStatus = paymentStatus === 'paid' ? 'paid' : 'payment_pending';

        const invoiceData = {
            business_id: businessId,
            customer: {
                name: customerName,
                phone: customerPhone,
            },
            items: cartItems.map(item => ({
                product_id: item.productId,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                tax_percent: defaultTax,
                tax_amount: Number(((item.quantity * item.price) * (defaultTax / 100)).toFixed(2)),
                description: item.sku,
                total_amount: Number((item.quantity * item.price).toFixed(2)),
            })),
            subtotal: totals.subtotal,
            discount_total: totals.discount,
            tax_total: totals.tax,
            grand_total: totals.total,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            status: invoiceStatus,
            date: new Date().toISOString(),
            due_date: paymentStatus === 'pending' ? new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() : null,
            notes: 'Created via quick checkout',
        };

        try {
            setIsSubmitting(true);
            await onSave?.(invoiceData);
            toast.success(`Sale completed! Total: ${formatCurrency(totals.total, currency)}`);
            resetForm();
            onClose?.();
        } catch (error) {
            toast.error('Sale failed: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setCartItems([]);
        setCustomerName('');
        setCustomerPhone('');
        setProductSearch('');
        setQuantity(1);
        setDiscount(0);
        setPaymentMethod('cash');
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            // Esc: Close
            if (e.key === 'Escape') {
                onClose?.();
                return;
            }

            // C: Clear cart
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                handleClearCart();
                return;
            }

            // L: Load last order for selected customer
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                if (cartItems.length > 0) {
                    toast.error('Clear cart before loading last order');
                    return;
                }
                handleLoadLastInvoice();
                return;
            }

            // Enter: Add item if product search focused
            if (e.key === 'Enter' && productSearchRef.current === document.activeElement) {
                e.preventDefault();
                if (productSuggestions.length > 0) {
                    handleAddItem(productSuggestions[0]);
                }
                return;
            }

            // +/-: Adjust quantity
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setQuantity(q => q + 1);
                return;
            }
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                setQuantity(q => Math.max(1, q - 1));
                return;
            }

            // Shift+Enter: Complete sale
            if (e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                handleCompleteSale();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, productSuggestions, isSubmitting, cartItems.length, lastCustomerInvoice]);

    // Focus on customer input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => customerInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl border-none">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gradient-to-r from-wine/10 to-wine/5 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-wine text-white rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black">Quick Checkout</CardTitle>
                            <p className="text-xs text-gray-500 mt-1">Hotkey: Ctrl+I | Load Last: Ctrl+L | Close: Esc | Sale: Shift+Enter</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 sm:p-6">
                    {/* Customer Section */}
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Customer</Label>
                        <Input
                            ref={customerInputRef}
                            type="text"
                            placeholder="Customer name or phone..."
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="h-11 text-lg font-semibold placeholder:font-normal"
                            list="customer-suggestions"
                        />
                        {customerSuggestions.length > 0 && (
                            <div className="mt-1 space-y-1 max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1">
                                {customerSuggestions.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => {
                                            setCustomerName(c.name || '');
                                            setCustomerPhone(c.phone || '');
                                        }}
                                        className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                                    >
                                        <div className="font-medium text-gray-800">{c.name}</div>
                                        <div className="text-xs text-gray-500">{c.phone || c.email || 'No contact'}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {recentCustomerQuickPicks.length > 0 && !customerName.trim() && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {recentCustomerQuickPicks.map((customer, idx) => (
                                    <button
                                        key={`${customer.name}-${idx}`}
                                        type="button"
                                        onClick={() => {
                                            setCustomerName(customer.name);
                                            setCustomerPhone(customer.phone || '');
                                        }}
                                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-wine hover:text-wine"
                                    >
                                        {customer.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        {customerName && (
                            <Input
                                type="tel"
                                placeholder="Phone (optional)"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="h-10 text-sm"
                            />
                        )}

                        {/* Quick Load Last Order */}
                        {hasLoadableLastOrder && (
                            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                                <div className="text-xs text-emerald-700 font-medium">
                                    <span className="font-bold">{lastCustomerInvoice.items?.length || 0}</span> items from last order
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleLoadLastInvoice}
                                    disabled={cartItems.length > 0}
                                    className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                    Load
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Product Add Section */}
                    <div className="space-y-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Add Items</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    ref={productSearchRef}
                                    type="text"
                                    placeholder="Search product or SKU... (type + Enter)"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    list="product-suggestions"
                                    className="h-10"
                                />
                                {productSuggestions.length > 0 && (
                                    <datalist id="product-suggestions">
                                        {productSuggestions.map(p => (
                                            <option key={p.id} value={p.name} />
                                        ))}
                                    </datalist>
                                )}
                            </div>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 h-10 text-center"
                                placeholder="Qty"
                            />
                            <Button
                                type="button"
                                size="icon"
                                onClick={() => handleAddItem(resolveProductFromSearch())}
                                className="bg-blue-600 hover:bg-blue-700 h-10"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        {productSuggestions.length > 0 && productSearch && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                {productSuggestions.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleAddItem(p)}
                                        className="w-full text-left p-2 hover:bg-white rounded border border-blue-100 transition-colors text-sm"
                                    >
                                        <div className="font-semibold">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.sku} * {formatCurrency(p.selling_price || p.markup_price || 0, currency)}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    {cartItems.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {cartItems.map(item => (
                                <div key={item.productId} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm truncate">{item.name}</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(item.price, currency)} × </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <button
                                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                                        <button
                                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => handleRemoveItem(item.productId)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded ml-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">Cart is empty</p>
                        </div>
                    )}

                    {/* Discount & Totals */}
                    <div className="space-y-2 p-3 bg-green-50 border border-green-100 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-bold text-gray-600 flex-1">Discount %</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={discount}
                                onChange={(e) => setDiscount(Math.min(100, parseFloat(e.target.value) || 0))}
                                className="w-20 h-9 text-right"
                            />
                        </div>

                        {/* Summary */}
                        <div className="space-y-1 text-sm border-t pt-2 mt-2">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-semibold">{formatCurrency(totals.subtotal, currency)}</span>
                            </div>
                            {totals.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount:</span>
                                    <span>-{formatCurrency(totals.discount, currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600">
                                <span>Tax ({defaultTax}%):</span>
                                <span className="font-semibold">{formatCurrency(totals.tax, currency)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-lg font-black text-wine">
                                <span>TOTAL:</span>
                                <span>{formatCurrency(totals.total, currency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-gray-400 tracking-widest">Payment Method</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {['cash', 'card', 'check', 'transfer'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`p-2 rounded-lg border-2 font-semibold text-xs uppercase transition-all ${
                                        paymentMethod === method
                                            ? 'bg-wine text-white border-wine'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-wine'
                                    }`}
                                >
                                    {method === 'cash' && '💵'}
                                    {method === 'card' && '💳'}
                                    {method === 'check' && '✓'}
                                    {method === 'transfer' && '↗'}
                                    <div>{method}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>

                {/* Mobile Sticky Quick Actions */}
                {cartItems.length > 0 && (
                    <div className="sm:hidden sticky bottom-0 z-10 border-t bg-white/95 backdrop-blur px-3 py-2">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClearCart}
                                className="h-9 px-3"
                            >
                                Clear
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCompleteSale}
                                disabled={isSubmitting}
                                className="ml-auto h-9 bg-wine hover:bg-wine/90 text-white"
                            >
                                {isSubmitting ? 'Processing...' : `Pay ${formatCurrency(totals.total, currency)}`}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="border-t bg-gray-50 p-4 flex gap-2 sm:flex-row flex-col-reverse">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            resetForm();
                            onClose?.();
                        }}
                        className="flex-1"
                    >
                        Close
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCompleteSale}
                        disabled={cartItems.length === 0 || isSubmitting}
                        className="flex-1 bg-wine hover:bg-wine/90 text-white font-bold h-11 text-lg"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        {isSubmitting ? 'Processing...' : 'Complete Sale (Shift+Enter)'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
