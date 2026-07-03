'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useStorefront } from '@/lib/context/StorefrontContext';
import { getStoreAccentColor } from '@/lib/config/storefrontDomains';
import { isFashionEditorialStore } from '@/lib/storefront/fashionEditorial';
import { getBrandsForMarket } from '@/lib/regionalMarket/index.js';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import {
  PK_FABRIC_OPTIONS,
  PK_SIZE_OPTIONS,
  PK_SOURCING_OPTIONS,
} from '@/lib/utils/inventoryFieldSuggestions';

function FilterSection({ title, expanded, onToggle, children, count }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {title}
          {count > 0 && (
            <span className="w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', expanded && 'rotate-180')} />
      </button>
      {expanded && <div className="pb-4">{children}</div>}
    </div>
  );
}

function FilterOptionList({ options, filterKey, currentValue, accent, onSelect }) {
  return (
    <div className="space-y-1 max-h-52 overflow-y-auto">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-1 py-1.5 rounded-lg group">
          <Checkbox
            checked={currentValue === opt}
            onCheckedChange={(checked) => onSelect(filterKey, checked ? opt : null)}
            style={currentValue === opt ? { backgroundColor: accent, borderColor: accent } : {}}
          />
          <span className="text-sm text-gray-700 flex-1 group-hover:text-gray-900 capitalize">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function FiltersBody({ filters, categories, businessDomain, onClose }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency, settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);
  const clothingStore = isFashionEditorialStore(business?.category);

  const countryIso =
    settings?.storefront?.countryIso ||
    (business?.country === 'Pakistan' ? 'PK' : business?.country?.slice(0, 2)?.toUpperCase()) ||
    'PK';

  const clothingFilterOptions = useMemo(() => {
    if (!clothingStore) return null;
    const knowledge = getDomainKnowledge(business?.category, { countryIso });
    const marketBrands = getBrandsForMarket(countryIso, business?.category) || [];
    const popularBrands = knowledge?.pakistaniFeatures?.popularBrands || [];
    const fabricOptions = uniqueFilterOptions([
      ...(knowledge?.fieldConfig?.fabrictype?.options || []),
      ...PK_FABRIC_OPTIONS,
    ]);
    return {
      brands: uniqueFilterOptions([...marketBrands, ...popularBrands]),
      fabrics: fabricOptions,
      sourcing: uniqueFilterOptions([
        ...(knowledge?.fieldConfig?.sourcing?.options || []),
        ...PK_SOURCING_OPTIONS,
      ]),
      sizes: uniqueFilterOptions([
        ...(knowledge?.fieldConfig?.sizecolormatrix?.options || []),
        ...PK_SIZE_OPTIONS,
      ]),
    };
  }, [clothingStore, business?.category, countryIso]);

  const [priceRange, setPriceRange] = useState([
    filters.minPrice || 0,
    filters.maxPrice || 50000,
  ]);
  const [expanded, setExpanded] = useState({
    categories: true,
    brand: clothingStore,
    fabric: clothingStore,
    sourcing: clothingStore,
    size: false,
    price: true,
    availability: true,
    special: true,
  });

  const toggle = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === false || value === '') params.delete(key);
    else params.set(key, String(value));
    params.delete('page');
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
    onClose?.();
  };

  const applyPrice = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('minPrice', priceRange[0]);
    params.set('maxPrice', priceRange[1]);
    params.delete('page');
    router.push(`/store/${businessDomain}/products?${params.toString()}`);
    onClose?.();
  };

  const clearAll = () => {
    router.push(`/store/${businessDomain}/products`);
    onClose?.();
  };

  const activeCount = [
    filters.category,
    filters.brand,
    filters.fabric,
    filters.sourcing,
    filters.size,
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.inStock,
    filters.onSale,
  ].filter(Boolean).length;

  return (
    <div className="space-y-0">
      {/* Header row */}
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">Filters {activeCount > 0 && <span className="text-gray-400 font-normal">({activeCount} active)</span>}</h3>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear all
          </button>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <FilterSection title="Categories" expanded={expanded.categories} onToggle={() => toggle('categories')} count={filters.category ? 1 : 0}>
          <div className="space-y-1">
            <label className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-1 py-1.5 rounded-lg group">
              <Checkbox
                checked={!filters.category}
                onCheckedChange={() => updateFilter('category', null)}
                className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
              />
              <span className="text-sm text-gray-700 flex-1 group-hover:text-gray-900">All Products</span>
            </label>
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-1 py-1.5 rounded-lg group">
                <Checkbox
                  checked={filters.category === cat.slug}
                  onCheckedChange={(checked) => updateFilter('category', checked ? cat.slug : null)}
                  style={filters.category === cat.slug ? { backgroundColor: accent, borderColor: accent } : {}}
                />
                <span className="text-sm text-gray-700 flex-1 group-hover:text-gray-900">{cat.name}</span>
                {cat.product_count !== undefined && (
                  <span className="text-xs text-gray-400 tabular-nums">{cat.product_count}</span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {clothingStore && clothingFilterOptions?.brands?.length > 0 && (
        <FilterSection
          title="Brand"
          expanded={expanded.brand}
          onToggle={() => toggle('brand')}
          count={filters.brand ? 1 : 0}
        >
          <FilterOptionList
            options={clothingFilterOptions.brands}
            filterKey="brand"
            currentValue={filters.brand}
            accent={accent}
            onSelect={updateFilter}
          />
        </FilterSection>
      )}

      {clothingStore && clothingFilterOptions?.fabrics?.length > 0 && (
        <FilterSection
          title="Fabric"
          expanded={expanded.fabric}
          onToggle={() => toggle('fabric')}
          count={filters.fabric ? 1 : 0}
        >
          <FilterOptionList
            options={clothingFilterOptions.fabrics}
            filterKey="fabric"
            currentValue={filters.fabric}
            accent={accent}
            onSelect={updateFilter}
          />
        </FilterSection>
      )}

      {clothingStore && clothingFilterOptions?.sourcing?.length > 0 && (
        <FilterSection
          title="Sourcing"
          expanded={expanded.sourcing}
          onToggle={() => toggle('sourcing')}
          count={filters.sourcing ? 1 : 0}
        >
          <FilterOptionList
            options={clothingFilterOptions.sourcing}
            filterKey="sourcing"
            currentValue={filters.sourcing}
            accent={accent}
            onSelect={updateFilter}
          />
        </FilterSection>
      )}

      {clothingStore && clothingFilterOptions?.sizes?.length > 0 && (
        <FilterSection
          title="Size"
          expanded={expanded.size}
          onToggle={() => toggle('size')}
          count={filters.size ? 1 : 0}
        >
          <FilterOptionList
            options={clothingFilterOptions.sizes}
            filterKey="size"
            currentValue={filters.size}
            accent={accent}
            onSelect={updateFilter}
          />
        </FilterSection>
      )}

      {/* Price Range */}
      <FilterSection
        title="Price Range"
        expanded={expanded.price}
        onToggle={() => toggle('price')}
        count={filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0}
      >
        <div className="space-y-4 px-1">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={50000}
            step={500}
            minStepsBetweenThumbs={1}
            className="mt-2"
          />
          <div className="flex items-center gap-2">
            <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
              {formatCurrency(priceRange[0], currency)}
            </div>
            <span className="text-gray-400 text-sm">to</span>
            <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
              {formatCurrency(priceRange[1], currency)}
            </div>
          </div>
          <button
            onClick={applyPrice}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Apply Price Filter
          </button>
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability" expanded={expanded.availability} onToggle={() => toggle('availability')} count={filters.inStock ? 1 : 0}>
        <label className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-1 py-1.5 rounded-lg group">
          <Checkbox
            checked={!!filters.inStock}
            onCheckedChange={(checked) => updateFilter('inStock', checked || null)}
            style={filters.inStock ? { backgroundColor: accent, borderColor: accent } : {}}
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">In Stock Only</span>
        </label>
      </FilterSection>

      {/* Special Offers */}
      <FilterSection title="Special Offers" expanded={expanded.special} onToggle={() => toggle('special')} count={filters.onSale ? 1 : 0}>
        <label className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-1 py-1.5 rounded-lg group">
          <Checkbox
            checked={!!filters.onSale}
            onCheckedChange={(checked) => updateFilter('onSale', checked || null)}
            style={filters.onSale ? { backgroundColor: accent, borderColor: accent } : {}}
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">On Sale</span>
        </label>
      </FilterSection>
    </div>
  );
}

function uniqueFilterOptions(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const s = String(raw || '').trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

export function ProductFilters({ filters, categories, businessDomain }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings, business } = useStorefront();
  const accent = getStoreAccentColor(settings, business?.category);

  const activeCount = [
    filters.category,
    filters.brand,
    filters.fabric,
    filters.sourcing,
    filters.size,
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.inStock,
    filters.onSale,
  ].filter(Boolean).length;

  return (
    <>
      {/* ── Mobile trigger ───────────────────────────────────────────── */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span
              className="ml-auto text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
              style={{ backgroundColor: accent }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile Sheet ─────────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-full sm:max-w-xs p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <SheetTitle className="text-base font-bold">Filter Products</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <FiltersBody filters={filters} categories={categories} businessDomain={businessDomain} onClose={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <FiltersBody filters={filters} categories={categories} businessDomain={businessDomain} />
      </div>
    </>
  );
}
