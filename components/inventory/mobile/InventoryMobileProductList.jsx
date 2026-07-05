'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Package,
  Plus,
  ChevronRight,
  Pencil,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProductThumbnail } from '@/components/product/ProductThumbnail';
import { buildInventoryDomainChips } from '@/lib/utils/inventoryDomainFeatures';
import { buildInventoryGridColumns, readGridCellValue } from '@/lib/utils/inventoryGridColumns';
import { resolveExcelMobileEssentialKeys } from '@/lib/utils/inventoryExcelMobile';
import { isNumericInventoryCell } from '@/lib/utils/inventoryGridCellTypes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MOBILE_BTN_PRIMARY } from '@/lib/utils/formMobileStyles';

const PAGE_SIZE = 24;

function stockTone(stock, minStock) {
  const qty = Number(stock ?? 0);
  const min = Number(minStock ?? 10);
  if (qty <= 0) return { label: 'Out', className: 'bg-red-50 text-red-700 ring-red-200' };
  if (qty <= min) return { label: String(qty), className: 'bg-amber-50 text-amber-800 ring-amber-200' };
  return { label: String(qty), className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
}

/**
 * App-style product list for mobile inventory — default data-entry mode.
 */
export function InventoryMobileProductList({
  products = [],
  currencySymbol = '₹',
  businessCategory,
  category = businessCategory,
  domainKnowledge = null,
  countryIso = '',
  business = null,
  onEdit,
  onQuickSave,
  onAdd,
  resultCount,
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [quickEdit, setQuickEdit] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState(false);

  const chipCtx = useMemo(
    () => ({ domainKnowledge, countryIso, limit: 2 }),
    [domainKnowledge, countryIso]
  );

  const gridColumnOptions = useMemo(
    () => ({
      business,
      domainKnowledge,
      countryIso,
    }),
    [business, domainKnowledge, countryIso]
  );

  const domainEditFields = useMemo(() => {
    const vertical = category || businessCategory || 'retail-shop';
    const essential = resolveExcelMobileEssentialKeys(vertical, gridColumnOptions);
    const cols = buildInventoryGridColumns(vertical, { mode: 'visual', ...gridColumnOptions });
    return cols.filter((col) => {
      const key = col.accessorKey || col.id;
      return key?.startsWith('domain_data.') && essential.has(key) && !col.readOnly;
    });
  }, [category, businessCategory, gridColumnOptions]);

  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );

  const hasMore = visibleCount < products.length;

  const openQuickEdit = useCallback((product, field, label, inputType = 'number') => {
    const raw = readGridCellValue(product, field, category || businessCategory || 'retail-shop');
    setQuickEdit({ product, field, label, inputType });
    setDraftValue(String(raw ?? ''));
  }, [category, businessCategory]);

  const closeQuickEdit = useCallback(() => {
    if (saving) return;
    setQuickEdit(null);
    setDraftValue('');
  }, [saving]);

  const commitQuickEdit = useCallback(async () => {
    if (!quickEdit || !onQuickSave) return;
    setSaving(true);
    try {
      await onQuickSave(quickEdit.product, quickEdit.field, draftValue);
      setQuickEdit(null);
      setDraftValue('');
    } finally {
      setSaving(false);
    }
  }, [quickEdit, draftValue, onQuickSave]);

  const columnHeaderLabel = (col) => {
    const header = col.header;
    if (typeof header === 'function') return header();
    return header || col.accessorKey || col.id || 'Field';
  };

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 py-14 px-4">
        <Package className="h-10 w-10 text-gray-300" aria-hidden />
        <p className="text-center text-sm font-semibold text-gray-700">No products match your search</p>
        <p className="text-center text-xs text-gray-500">Add a product or adjust filters</p>
        <Button type="button" className={MOBILE_BTN_PRIMARY} onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add product
        </Button>
      </div>
    );
  }

  const quickFieldLabel = quickEdit?.label || (quickEdit?.field === 'stock' ? 'Stock quantity' : quickEdit?.field === 'price' ? 'Sale price' : 'Value');
  const quickInputType = quickEdit?.inputType === 'text' ? 'text' : 'number';

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-3 py-2">
          <p className="text-[11px] font-medium text-gray-500 tabular-nums">
            {resultCount ?? products.length} items
          </p>
          <p className="text-[10px] font-medium text-gray-400">Tap row to edit · tap stock/price for quick update</p>
        </div>

        <ul className="divide-y divide-gray-100">
          {visibleProducts.map((p) => {
            const inactive = p.is_active === false;
            const stock = stockTone(p.stock, p.min_stock ?? p.minStock);
            const price = Number(p.price || 0);
            const domainChips = buildInventoryDomainChips(businessCategory, p, chipCtx);
            const vertical = category || businessCategory || 'retail-shop';
            const domainFieldPills = domainEditFields
              .map((col) => {
                const accessorKey = col.accessorKey;
                const val = readGridCellValue(p, accessorKey, vertical);
                if (val == null || String(val).trim() === '') return null;
                return {
                  key: accessorKey,
                  label: columnHeaderLabel(col),
                  value: String(val),
                  inputType: isNumericInventoryCell(accessorKey) ? 'number' : 'text',
                };
              })
              .filter(Boolean);

            return (
              <li key={p.id || p._tempId}>
                <div
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 active:bg-blue-50/40',
                    inactive && 'opacity-75'
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    onClick={() => onEdit?.(p)}
                  >
                    <ProductThumbnail
                      product={p}
                      businessCategory={businessCategory}
                      size="sm"
                      className="h-11 w-11 shrink-0 rounded-xl border border-gray-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900">
                        {p.name || 'Untitled'}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {p.sku && (
                          <span className="font-mono text-[10px] text-gray-400">{p.sku}</span>
                        )}
                        {p.category && (
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                            {p.category}
                          </span>
                        )}
                        {inactive && (
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700">
                            Off
                          </span>
                        )}
                        {domainChips.map((chip) => (
                          <span
                            key={`${p.id || p._tempId}-${chip.key}`}
                            className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700"
                            title={`${chip.label}: ${chip.value}`}
                          >
                            {chip.value}
                          </span>
                        ))}
                        {domainFieldPills.map((pill) => (
                          <button
                            key={`${p.id || p._tempId}-edit-${pill.key}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickEdit(p, pill.key, pill.label, pill.inputType);
                            }}
                            className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 ring-1 ring-inset ring-violet-100"
                            title={`Edit ${pill.label}`}
                          >
                            {pill.label}: {pill.value}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
                  </button>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => openQuickEdit(p, 'stock', 'Stock quantity', 'number')}
                      className={cn(
                        'inline-flex min-w-[2.5rem] items-center justify-center rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums ring-1 ring-inset',
                        stock.className
                      )}
                    >
                      {stock.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuickEdit(p, 'price', 'Sale price', 'number')}
                      className="text-[12px] font-semibold tabular-nums text-gray-900 underline decoration-gray-300 underline-offset-2"
                    >
                      {currencySymbol}
                      {price.toLocaleString()}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {hasMore && (
          <div className="border-t border-gray-100 p-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl text-xs font-semibold"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              Load more ({products.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>

      <Sheet open={Boolean(quickEdit)} onOpenChange={(open) => !open && closeQuickEdit()}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base">Quick update</SheetTitle>
            <SheetDescription className="line-clamp-2 text-xs">
              {quickEdit?.product?.name} · {quickFieldLabel}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <input
              type={quickInputType}
              inputMode={quickInputType === 'number' ? 'decimal' : 'text'}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-lg font-semibold tabular-nums outline-none ring-brand-primary/30 focus:ring-2"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={closeQuickEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" className={cn('h-11 flex-1 rounded-xl', MOBILE_BTN_PRIMARY)} onClick={() => void commitQuickEdit()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full text-xs font-semibold text-brand-primary"
              onClick={() => {
                const product = quickEdit?.product;
                closeQuickEdit();
                if (product) onEdit?.(product);
              }}
            >
              Open full product form
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default InventoryMobileProductList;
