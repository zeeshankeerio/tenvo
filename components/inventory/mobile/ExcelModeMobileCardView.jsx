'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { readGridCellValue } from '@/lib/utils/inventoryGridColumns';
import { inventoryGridRowKey, inventoryValidationErrorKey } from '@/lib/utils/inventoryRowKey';
import { isNumericInventoryCell } from '@/lib/utils/inventoryGridCellTypes';
import { filterExcelMobileEditableColumns } from '@/lib/utils/inventoryExcelMobile';
import { MOBILE_INPUT_CLASS, MOBILE_LABEL_CLASS, MOBILE_NO_ZOOM_TEXT } from '@/lib/utils/formMobileStyles';

function columnLabel(col) {
  const header = col.header;
  if (typeof header === 'function') return header();
  return header || col.accessorKey || col.id || 'Field';
}

/**
 * Thumb-first mobile bulk entry: one product per screen, vertical fields.
 */
export function ExcelModeMobileCardView({
  rows = [],
  columns = [],
  hiddenCols = new Set(),
  category = 'retail-shop',
  validationErrors = {},
  onCellEdit,
  onAddRow,
  onDeleteRow,
  getFieldSuggestions,
  className,
}) {
  const [rowIndex, setRowIndex] = useState(0);

  const editableColumns = useMemo(
    () => filterExcelMobileEditableColumns(columns, hiddenCols),
    [columns, hiddenCols]
  );

  const safeIndex = rows.length ? Math.min(rowIndex, rows.length - 1) : 0;
  const row = rows[safeIndex] || null;
  const rowKey = row ? inventoryGridRowKey(row, safeIndex) : '';

  useEffect(() => {
    if (rowIndex > 0 && rowIndex >= rows.length) {
      setRowIndex(Math.max(0, rows.length - 1));
    }
  }, [rows.length, rowIndex]);

  if (!rows.length) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10', className)}>
        <p className="text-center text-sm text-slate-600">No rows yet. Add your first product to start bulk entry.</p>
        <Button type="button" className="h-11 rounded-xl px-6 font-semibold" onClick={() => onAddRow?.()}>
          <Plus className="mr-2 h-4 w-4" />
          Add product
        </Button>
      </div>
    );
  }

  const fieldError = (accessorKey) =>
    validationErrors[inventoryValidationErrorKey(row, safeIndex, accessorKey)] ||
    validationErrors[`${rowKey}-${accessorKey}`] ||
    validationErrors[`idx-${safeIndex}-${accessorKey}`] ||
    null;

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          disabled={safeIndex <= 0}
          onClick={() => setRowIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous product"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-slate-900">
            {readGridCellValue(row, 'name', category) || `Row ${safeIndex + 1}`}
          </p>
          <p className="text-[11px] font-medium text-slate-500 tabular-nums">
            {safeIndex + 1} of {rows.length}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          disabled={safeIndex >= rows.length - 1}
          onClick={() => setRowIndex((i) => Math.min(rows.length - 1, i + 1))}
          aria-label="Next product"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        <div className="space-y-3">
          {editableColumns.map((col) => {
            const accessorKey = col.accessorKey;
            const value = readGridCellValue(row, accessorKey, category);
            const err = fieldError(accessorKey);
            const suggestions = getFieldSuggestions?.(accessorKey, row) || [];
            const listId = suggestions.length
              ? `excel-card-suggest-${String(accessorKey).replace(/\./g, '-')}`
              : undefined;
            const isNumeric = isNumericInventoryCell(accessorKey);

            return (
              <div key={String(accessorKey)} className="space-y-1">
                <Label htmlFor={`excel-card-${accessorKey}`} className={MOBILE_LABEL_CLASS}>
                  {columnLabel(col)}
                </Label>
                <input
                  id={`excel-card-${accessorKey}`}
                  type="text"
                  inputMode={isNumeric ? 'decimal' : 'text'}
                  autoComplete="off"
                  list={listId}
                  className={cn(
                    MOBILE_INPUT_CLASS,
                    MOBILE_NO_ZOOM_TEXT,
                    'w-full',
                    err && 'border-red-300 ring-1 ring-red-200'
                  )}
                  value={value ?? ''}
                  onChange={(e) => onCellEdit?.(row, accessorKey, e.target.value)}
                />
                {err ? <p className="text-xs text-red-600">{String(err)}</p> : null}
                {listId ? (
                  <datalist id={listId}>
                    {suggestions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl font-semibold"
          onClick={() => {
            onAddRow?.(row);
            setRowIndex(rows.length);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add row
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl border-red-200 px-4 font-semibold text-red-600 hover:bg-red-50"
          onClick={() => {
            if (!row) return;
            onDeleteRow?.(row);
            setRowIndex((i) => Math.max(0, Math.min(i, rows.length - 2)));
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default ExcelModeMobileCardView;
