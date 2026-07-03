'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, SlidersHorizontal, ChevronDown, LayoutGrid, List, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { isFashionEditorialStore } from '@/lib/storefront/fashionEditorial';
import { formatCurrency } from '@/lib/currency';

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'newest',     label: 'Newest Arrivals' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'rating',     label: 'Top Rated' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc',   label: 'Name: A-Z' },
];

export function SortDropdown({ currentSort, businessDomain }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSort = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
    setOpen(false);
  };

  const currentLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label || 'Featured';

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
      >
        Sort: <span className="font-semibold text-gray-900">{currentLabel}</span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSort(opt.value)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                opt.value === currentSort ? 'font-semibold' : 'text-gray-700 hover:bg-gray-50'
              )}
              style={opt.value === currentSort ? { color: accent } : {}}
            >
              {opt.label}
              {opt.value === currentSort && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ViewToggle({ currentView = 'grid', businessDomain }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const setView = (v) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', v);
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
  };

  return (
    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white flex-shrink-0">
      <button
        onClick={() => setView('grid')}
        className={cn('p-2.5 transition-colors', currentView === 'grid' ? 'text-white' : 'text-gray-400 hover:text-gray-700')}
        style={currentView === 'grid' ? { backgroundColor: accent } : {}}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setView('list')}
        className={cn('p-2.5 transition-colors', currentView === 'list' ? 'text-white' : 'text-gray-400 hover:text-gray-700')}
        style={currentView === 'list' ? { backgroundColor: accent } : {}}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ActiveFilters({ filters, businessDomain }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, business, categories, currency } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const clothingStore = isFashionEditorialStore(business?.category);

  const activeFilters = [];
  if (filters.category) {
    const catLabel = categories?.find((c) => c.slug === filters.category)?.name || filters.category;
    activeFilters.push({ key: 'category', label: `Category: ${catLabel}` });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const lo = formatCurrency(filters.minPrice || 0, currency);
    const hi = filters.maxPrice != null ? formatCurrency(filters.maxPrice, currency) : '∞';
    activeFilters.push({ key: 'price', label: `Price: ${lo} - ${hi}` });
  }
  if (filters.inStock)   activeFilters.push({ key: 'inStock', label: 'In Stock Only' });
  if (filters.onSale)    activeFilters.push({ key: 'onSale', label: 'On Sale' });
  if (filters.search) {
    const mode = String(filters.searchMode || '').toLowerCase();
    let label = `"${filters.search}"`;
    if (mode === 'partnumber') label = `Part number: ${filters.search}`;
    else if (mode === 'partsize') label = `Part size: ${filters.search}`;
    else if (mode === 'plate') label = `Plate: ${filters.search}`;
    else if (mode === 'vin') label = `VIN / chassis: ${filters.search}`;
    activeFilters.push({ key: 'search', label });
  }
  if (filters.brand) {
    activeFilters.push({
      key: 'brand',
      label: clothingStore ? `Brand: ${filters.brand}` : `Make: ${filters.brand}`,
    });
  }
  if (filters.fabric) activeFilters.push({ key: 'fabric', label: `Fabric: ${filters.fabric}` });
  if (filters.sourcing) {
    const src = String(filters.sourcing);
    activeFilters.push({
      key: 'sourcing',
      label: `Sourcing: ${src.charAt(0).toUpperCase()}${src.slice(1)}`,
    });
  }
  if (filters.size) activeFilters.push({ key: 'size', label: `Size: ${filters.size}` });
  if (filters.model)     activeFilters.push({ key: 'model', label: `Model: ${filters.model}` });
  if (filters.year)      activeFilters.push({ key: 'year', label: `Year: ${filters.year}` });
  if (filters.engine)    activeFilters.push({ key: 'engine', label: `Engine: ${filters.engine}` });
  if (filters.engineNo)  activeFilters.push({ key: 'engineNo', label: `Engine no: ${filters.engineNo}` });
  if (filters.vehicleClass) activeFilters.push({ key: 'class', label: `Class: ${filters.vehicleClass}` });
  if (filters.vehicleType) activeFilters.push({ key: 'vehicleType', label: `Type: ${filters.vehicleType}` });
  if (filters.body)      activeFilters.push({ key: 'body', label: `Body: ${filters.body}` });
  if (filters.fuel)      activeFilters.push({ key: 'fuel', label: `Fuel: ${filters.fuel}` });
  if (filters.condition) activeFilters.push({ key: 'condition', label: `Condition: ${filters.condition}` });

  if (activeFilters.length === 0) return null;

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'price') { params.delete('minPrice'); params.delete('maxPrice'); }
    else if (key === 'search') {
      params.delete('search');
      params.delete('searchMode');
    } else params.delete(key);
    params.delete('page');
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Active:
      </span>
      {activeFilters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {f.label}
          <button
            onClick={() => removeFilter(f.key)}
            className="hover:opacity-70 transition-opacity ml-0.5"
            aria-label={`Remove ${f.label} filter`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {activeFilters.length > 1 && (
        <button
          onClick={() => router.push(`/store/${businessDomain}/products`)}
          className="text-xs text-gray-500 hover:text-gray-900 underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
