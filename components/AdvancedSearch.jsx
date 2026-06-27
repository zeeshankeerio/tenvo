'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

import { getDomainColors } from '@/lib/domainColors';
import { cn } from '@/lib/utils';

export function AdvancedSearch({ onSearch, filters = [], placeholder = 'Search...', category = 'retail-shop', hideSearch = false }) {
  const colors = getDomainColors(category);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch?.(value, activeFilters);
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...activeFilters, [filterKey]: value };
    setActiveFilters(newFilters);
    onSearch?.(searchTerm, newFilters);
  };

  const clearFilter = (filterKey) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
    onSearch?.(searchTerm, newFilters);
  };

  const clearAll = () => {
    setSearchTerm('');
    setActiveFilters({});
    onSearch?.('', {});
  };

  const activeFilterCount = Object.keys(activeFilters).filter(key => activeFilters[key]).length;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        {!hideSearch && (
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>
        )}
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "relative px-5 py-3 border rounded-2xl transition-all flex items-center gap-2 font-semibold text-[10px] uppercase tracking-widest shadow-sm active:scale-95",
              activeFilterCount > 0
                ? "bg-blue-600 text-white border-blue-600 shadow-blue-200"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
        {(searchTerm || activeFilterCount > 0) && (
          <button
            onClick={clearAll}
            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Clear All"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showFilters && filters.length > 0 && (
        <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-200/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] ml-1">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700 appearance-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'date' ? (
                  <input
                    type="date"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
                  />
                ) : filter.type === 'number' ? (
                  <input
                    type="number"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
                  />
                ) : (
                  <input
                    type="text"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    placeholder={filter.placeholder}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-gray-700"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value) return null;
            const filter = filters.find(f => f.key === key);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 text-blue-700 rounded-full text-[10px] font-semibold uppercase tracking-tight shadow-sm animate-in zoom-in-95"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="opacity-60">{filter?.label}:</span> {value}
                <button
                  onClick={() => clearFilter(key)}
                  className="p-0.5 hover:bg-blue-100 rounded-full transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}








