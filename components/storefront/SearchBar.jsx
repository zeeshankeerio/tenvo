'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { motion, AnimatePresence } from 'framer-motion';

const RECENT_KEY = 'tenvo_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecentSearch(q) {
  if (!q?.trim()) return;
  const prev = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

export function SearchBar({ businessDomain, initialQuery = '', onClose }) {
  const { currency, settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();
  
  // Close suggestions on click outside
  useClickOutside(containerRef, () => setShowSuggestions(false));

  // Load recent searches on mount
  useEffect(() => { setRecentSearches(getRecentSearches()); }, []);
  
  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        setNoResults(false);
        try {
          const response = await fetch(
            `/api/storefront/${businessDomain}/search?q=${encodeURIComponent(query)}`
          );
          if (response.ok) {
            const data = await response.json();
            const results = data.products || [];
            setSuggestions(results);
            setNoResults(results.length === 0);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setNoResults(false);
        setShowSuggestions(query.length === 0 ? false : false);
      }
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [query, businessDomain]);
  
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
      router.push(`/store/${businessDomain}/products?search=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
      onClose?.();
    }
  }, [query, businessDomain, router, onClose]);
  
  const handleSuggestionClick = useCallback((product) => {
    saveRecentSearch(query.trim());
    setRecentSearches(getRecentSearches());
    router.push(`/store/${businessDomain}/products/${product.slug || product.id}`);
    setShowSuggestions(false);
    setQuery('');
    onClose?.();
  }, [businessDomain, router, onClose, query]);

  const handleRecentClick = useCallback((term) => {
    setQuery(term);
    router.push(`/store/${businessDomain}/products?search=${encodeURIComponent(term)}`);
    setShowSuggestions(false);
    onClose?.();
  }, [businessDomain, router, onClose]);

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecentSearches([]);
  };
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      onClose?.();
    }
  }, [suggestions, selectedIndex, handleSuggestionClick, handleSubmit, onClose]);
  
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setNoResults(false);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (query.length >= 2 && suggestions.length > 0) setShowSuggestions(true);
    else if (query.length === 0 && recentSearches.length > 0) setShowSuggestions(true);
  };
  
  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className={cn(
              "w-full pl-12 pr-12 py-3 rounded-xl border bg-white",
              "focus:outline-none focus:ring-2 focus:border-transparent",
              "transition-all duration-200",
              showSuggestions && suggestions.length > 0 && "rounded-b-none"
            )}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        {/* Search Button (Mobile) */}
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors sm:hidden"
          style={{ backgroundColor: accent }}
        >
          Search
        </button>
      </form>
      
      {/* Dropdown: recent searches (empty query) OR suggestions (active query) */}
      <AnimatePresence>
        {showSuggestions && query.length === 0 && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Recent Searches
              </span>
              <button onClick={clearRecentSearches} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
            </div>
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => handleRecentClick(term)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="flex-1">{term}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuggestions && query.length >= 2 && noResults && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl shadow-lg z-50 p-6 text-center"
          >
            <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-500">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-gray-400 mt-1">Try a different keyword or browse all products</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="max-h-96 overflow-y-auto">
              {suggestions.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => handleSuggestionClick(product)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 text-left transition-colors",
                    selectedIndex === index ? "bg-gray-50" : "hover:bg-gray-50",
                    index !== suggestions.length - 1 && "border-b"
                  )}
                  style={selectedIndex === index ? { backgroundColor: accent + '10' } : {}}
                >
                  {/* Product Image */}
                  <div className="relative w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <SmartProductImage
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {product.name}
                    </p>
                    {product.category_name && (
                      <p className="text-sm text-gray-500">{product.category_name}</p>
                    )}
                  </div>
                  
                  {/* Price */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(product.price, currency)}
                    </p>
                    {product.compare_price && product.compare_price > product.price && (
                      <p className="text-sm text-gray-400 line-through">
                        {formatCurrency(product.compare_price, currency)}
                      </p>
                    )}
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
            
            {/* View All Results */}
            <button
              onClick={handleSubmit}
              className="w-full p-4 text-center font-medium hover:bg-gray-50 transition-colors border-t text-sm"
              style={{ color: accent }}
            >
              View all results for &ldquo;{query}&rdquo;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay for mobile */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}

