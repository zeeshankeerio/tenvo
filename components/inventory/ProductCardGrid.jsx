'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Plus,
  Edit,
  Archive,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/product/ProductThumbnail';

const ROWS_PER_PAGE = 3;

function resolveColumns(width) {
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}

/**
 * Paginated product cards, shows 3 rows per page, responsive column count.
 */
export function ProductCardGrid({
  products,
  currencySymbol = '₹',
  businessCategory,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  onAdd,
}) {
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const update = () => setColumns(resolveColumns(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const pageSize = columns * ROWS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [products.length, columns]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const pageProducts = useMemo(() => {
    const start = safePage * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, safePage, pageSize]);

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Package className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No products found</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Product
        </button>
      </div>
    );
  }

  const rangeStart = safePage * pageSize + 1;
  const rangeEnd = Math.min((safePage + 1) * pageSize, products.length);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {pageProducts.map((p) => {
          const stockPct = Math.min(
            100,
            p.max_stock > 0 ? Math.round((p.stock / p.max_stock) * 100) : p.stock > 0 ? 60 : 0
          );
          const isLow = Number(p.stock) <= Number(p.min_stock ?? 10);
          const inactive = p.is_active === false;
          const circumference = 2 * Math.PI * 16;
          const dashOffset = circumference - (stockPct / 100) * circumference;
          const ringColor = inactive ? '#d1d5db' : isLow ? '#ef4444' : '#22c55e';

          return (
            <div
              key={p.id || p._tempId}
              className={cn(
                'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md',
                inactive ? 'border-gray-200 opacity-70' : 'border-gray-100'
              )}
              onClick={() => onView?.(p)}
            >
              {inactive && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-gray-100/60">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                    Inactive
                  </span>
                </div>
              )}

              <div className="relative flex h-28 w-full items-center justify-center overflow-hidden bg-gray-50">
                <ProductThumbnail
                  product={p}
                  businessCategory={businessCategory}
                  size="lg"
                  className="h-full w-full rounded-none border-0"
                  imgClassName="object-cover"
                />
                <div className="absolute bottom-1.5 right-1.5">
                  <svg width="40" height="40" viewBox="0 0 40 40" className="drop-shadow">
                    <circle cx="20" cy="20" r="16" fill="white" stroke="#e5e7eb" strokeWidth="3" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="3"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      transform="rotate(-90 20 20)"
                    />
                    <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#374151">
                      {p.stock ?? 0}
                    </text>
                  </svg>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <p className="line-clamp-2 text-[11px] font-bold leading-snug text-gray-900">{p.name}</p>
                {p.sku && <p className="font-mono text-[10px] text-gray-400">{p.sku}</p>}
                <p className="mt-auto text-[12px] font-semibold text-gray-800">
                  {currencySymbol}
                  {Number(p.price || 0).toLocaleString()}
                </p>
              </div>

              <div
                className="absolute right-1.5 top-1.5 z-20 hidden flex-col gap-1 group-hover:flex"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onEdit?.(p)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50"
                  title="Edit"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(p)}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-white shadow transition-colors',
                    inactive ? 'bg-green-500 hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600'
                  )}
                  title={inactive ? 'Activate' : 'Deactivate'}
                >
                  {inactive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                  title="Archive"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
          <p className="text-[11px] font-medium text-gray-500">
            Showing {rangeStart}-{rangeEnd} of {products.length} products
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4.5rem] text-center text-[11px] font-semibold text-gray-700">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCardGrid;
