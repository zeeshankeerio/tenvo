'use client';

// Re-export from the shared CartContext so all consumers share one cart state.
// This fixes the race condition where CartDrawer showed empty cart immediately
// after addItem because each useCart() had its own isolated localStorage state.
export { useCart } from '@/lib/context/CartContext';
