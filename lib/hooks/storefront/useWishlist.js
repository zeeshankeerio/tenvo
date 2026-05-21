'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../useLocalStorage';
import { toast } from 'react-hot-toast';

const WISHLIST_STORAGE_KEY = 'tenvo_storefront_wishlist';

export function useWishlist() {
  const [storedWishlist, setStoredWishlist, removeStoredWishlist] = useLocalStorage(
    WISHLIST_STORAGE_KEY,
    { items: [], businessDomain: null }
  );
  
  const [wishlist, setWishlist] = useState(storedWishlist);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync local state with storage
  useEffect(() => {
    setWishlist(storedWishlist);
  }, [storedWishlist]);
  
  // Check if item is in wishlist
  const isInWishlist = useCallback((productId) => {
    return wishlist.items.some(item => item.productId === productId);
  }, [wishlist.items]);
  
  // Add item to wishlist
  const addToWishlist = useCallback((product) => {
    setIsLoading(true);
    
    setStoredWishlist(prev => {
      const exists = prev.items.some(item => item.productId === product.id);
      if (exists) {
        toast.success('Already in wishlist');
        return prev;
      }
      
      toast.success('Added to wishlist');
      return {
        ...prev,
        items: [...prev.items, {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image_url || product.image,
          slug: product.slug,
          addedAt: new Date().toISOString(),
        }],
      };
    });
    
    setIsLoading(false);
  }, [setStoredWishlist]);
  
  // Remove item from wishlist
  const removeFromWishlist = useCallback((productId) => {
    setIsLoading(true);
    
    setStoredWishlist(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId),
    }));
    
    toast.success('Removed from wishlist');
    setIsLoading(false);
  }, [setStoredWishlist]);
  
  // Toggle item in wishlist
  const toggleWishlist = useCallback((product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);
  
  // Clear wishlist
  const clearWishlist = useCallback(() => {
    setStoredWishlist({ items: [], businessDomain: null });
    toast.success('Wishlist cleared');
  }, [setStoredWishlist]);
  
  // Get wishlist count
  const wishlistCount = wishlist.items.length;
  
  return {
    wishlist,
    wishlistCount,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    isLoading,
  };
}
