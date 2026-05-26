'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const CART_KEY = 'tenvo_storefront_cart';

const INITIAL_CART = { items: [], businessId: null, lastUpdated: null };

const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  const [cart, setCartState] = useState(INITIAL_CART);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCartState(parsed);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever cart changes (after hydration)
  const setCart = useCallback((updater) => {
    setCartState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        window.localStorage.setItem(CART_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CART_KEY && e.newValue) {
        try { setCartState(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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

  const addItem = useCallback(async ({ productId, quantity, variantId }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/storefront/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId, quantity }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Item not available');
      }

      const { available, maxQuantity, product } = await response.json();

      if (!available) {
        throw new Error(`Only ${maxQuantity} items available`);
      }

      // Update cart state synchronously — drawer will see new state immediately
      setCart((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.productId === productId && item.variantId === variantId
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
              productId,
              variantId,
              quantity,
              name: product.name,
              price: product.price,
              image: product.image_url,
              slug: product.slug,
              maxQuantity,
              addedAt: new Date().toISOString(),
            },
          ];
        }

        return {
          ...prev,
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
        items: prev.items.map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity }
            : item
        ),
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
