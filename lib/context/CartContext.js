'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const LEGACY_CART_KEY = 'tenvo_storefront_cart';

const INITIAL_CART = {
  items: [],
  businessId: null,
  lastUpdated: null,
  checkoutAdjustments: null,
};

/** Per-store localStorage key — exported for tenancy wiring checks. */
export function getCartStorageKey(businessId) {
  if (!businessId) return LEGACY_CART_KEY;
  return `tenvo_storefront_cart_${businessId}`;
}

const CartContext = createContext(undefined);

export function CartProvider({ children, businessId }) {
  const [cart, setCartState] = useState(INITIAL_CART);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = getCartStorageKey(businessId);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  // Hydrate from per-store localStorage when the active storefront changes
  useEffect(() => {
    setHydrated(false);
    try {
      if (businessId) {
        const legacy = window.localStorage.getItem(LEGACY_CART_KEY);
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (!parsed.businessId || parsed.businessId === businessId) {
              window.localStorage.setItem(storageKey, legacy);
            }
          } catch {
            // ignore corrupt legacy payload
          }
          window.localStorage.removeItem(LEGACY_CART_KEY);
        }
      }

      const raw = window.localStorage.getItem(storageKey);
      setCartState(raw ? JSON.parse(raw) : INITIAL_CART);
    } catch {
      setCartState(INITIAL_CART);
    }
    setHydrated(true);
  }, [storageKey, businessId]);

  const setCart = useCallback((updater) => {
    setCartState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        window.localStorage.setItem(storageKeyRef.current, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Listen for storage changes from other tabs (same store only)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === storageKeyRef.current && e.newValue) {
        try { setCartState(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  // Open/close drawer
  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener('toggle-cart', open);
    window.addEventListener('close-cart', close);
    return () => {
      window.removeEventListener('toggle-cart', open);
      window.removeEventListener('close-cart', close);
    };
  }, []);

  const addItem = useCallback(async ({ productId, quantity, variantId, businessId: itemBusinessId }) => {
    if (!itemBusinessId) {
      throw new Error('Store not ready');
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/storefront/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, quantity, businessId: itemBusinessId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Item not available');
      }

      const { available, maxQuantity, product } = await response.json();
      const canonicalProductId = product?.id || productId;

      if (!available) {
        throw new Error(`Only ${maxQuantity} items available`);
      }

      setCart((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.productId === canonicalProductId && item.variantId === variantId
        );

        let newItems;
        if (existingIndex >= 0) {
          const newQuantity = prev.items[existingIndex].quantity + quantity;
          if (newQuantity > maxQuantity) throw new Error(`Maximum ${maxQuantity} items allowed`);
          newItems = prev.items.map((item, i) =>
            i === existingIndex ? { ...item, quantity: newQuantity } : item
          );
        } else {
          newItems = [
            ...prev.items,
            {
              productId: canonicalProductId,
              variantId,
              quantity,
              name: product.name,
              price: product.price,
              image: product.image_url,
              slug: product.slug,
              variantName: product.variantName || null,
              taxPercent: typeof product.taxPercent === 'number' ? product.taxPercent : null,
              fulfillmentType: product.fulfillmentType || 'physical',
              maxQuantity,
              addedAt: new Date().toISOString(),
            },
          ];
        }

        return {
          items: newItems,
          businessId: product.business_id,
          lastUpdated: new Date().toISOString(),
        };
      });

      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, [setCart]);

  const updateQuantity = useCallback((productId, variantId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => ({
        ...prev,
        items: prev.items.filter(
          (item) => !(item.productId === productId && item.variantId === variantId)
        ),
        lastUpdated: new Date().toISOString(),
      }));
    } else {
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          if (item.productId !== productId || item.variantId !== variantId) return item;
          const max = item.maxQuantity;
          const nextQty =
            max != null && Number.isFinite(max) && quantity > max ? max : quantity;
          return { ...item, quantity: nextQty };
        }),
        lastUpdated: new Date().toISOString(),
      }));
    }
  }, [setCart]);

  const removeItem = useCallback((productId, variantId) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      ),
      lastUpdated: new Date().toISOString(),
    }));
  }, [setCart]);

  const clearCart = useCallback(() => {
    setCart(INITIAL_CART);
  }, [setCart]);

  const setCheckoutAdjustments = useCallback((adjustments) => {
    setCart((prev) => ({
      ...prev,
      checkoutAdjustments: adjustments || null,
      lastUpdated: new Date().toISOString(),
    }));
  }, [setCart]);

  const calculateTotals = useCallback(() => {
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);
    return { subtotal, itemCount };
  }, [cart.items]);

  const value = {
    cart,
    isLoading,
    isOpen,
    setIsOpen,
    hydrated,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setCheckoutAdjustments,
    checkoutAdjustments: cart.checkoutAdjustments,
    calculateTotals,
    isEmpty: cart.items.length === 0,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
