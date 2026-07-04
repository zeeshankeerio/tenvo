'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Search,
  ChevronRight,
  Eye,
  CreditCard,
  Pencil,
  Trash2,
  FileText,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MobileActionRow } from '@/components/mobile/MobileHubPrimitives';
import { MOBILE_INPUT_CLASS, MOBILE_BTN_PRIMARY } from '@/lib/utils/formMobileStyles';
import {
  MOBILE_BOTTOM_SHEET,
  MOBILE_BOTTOM_SHEET_BODY,
  MOBILE_BOTTOM_SHEET_HANDLE,
  MOBILE_BOTTOM_SHEET_HEADER,
} from '@/lib/utils/mobileLayout';
import { formatCurrency } from '@/lib/currency';
import type { Invoice } from '@/types';

const PAGE_SIZE = 20;

export type InvoiceMobileRow = Invoice & {
  customer_name?: string;
  grand_total_formatted?: string;
  balance_formatted?: string;
};

export interface InvoiceMobileListProps {
  invoices?: InvoiceMobileRow[];
  currency?: string;
  onView?: (invoice: InvoiceMobileRow) => void;
  onEdit?: (invoice: InvoiceMobileRow) => void;
  onRecordPayment?: (invoice: InvoiceMobileRow) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  renderPaymentBadge?: (invoice: InvoiceMobileRow) => ReactNode;
  renderAging?: (invoice: InvoiceMobileRow) => ReactNode;
}

function formatInvoiceDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** App-style invoice list for mobile — tap to view, sheet for actions. */
export function InvoiceMobileList({
  invoices = [],
  currency = 'PKR',
  onView,
  onEdit,
  onRecordPayment,
  onDelete,
  onAdd,
  renderPaymentBadge,
  renderAging,
}: InvoiceMobileListProps) {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [actionInvoice, setActionInvoice] = useState<InvoiceMobileRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const num = String(inv.invoice_number || inv.id || '').toLowerCase();
      const customer = String(inv.customer_name || inv.customer?.name || '').toLowerCase();
      return num.includes(q) || customer.includes(q);
    });
  }, [invoices, search]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const hasMore = visibleCount < filtered.length;

  const closeActions = () => setActionInvoice(null);

  const runAction = (fn?: (invoice: InvoiceMobileRow) => void) => {
    const inv = actionInvoice;
    closeActions();
    if (inv && fn) fn(inv);
  };

  const canRecordPayment =
    actionInvoice &&
    actionInvoice.payment_status !== 'paid' &&
    actionInvoice.status !== 'voided' &&
    actionInvoice.status !== 'paid';

  if (!invoices.length && !search) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-14">
        <FileText className="h-10 w-10 text-gray-300" aria-hidden />
        <p className="text-center text-sm font-semibold text-gray-700">No invoices yet</p>
        <p className="text-center text-xs text-gray-500">Create your first invoice to get started</p>
        {onAdd && (
          <Button type="button" className={MOBILE_BTN_PRIMARY} onClick={onAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            New invoice
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search invoice or customer..."
            className={cn(MOBILE_INPUT_CLASS, 'pl-9')}
            aria-label="Search invoices"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-3 py-2">
            <p className="text-[11px] font-medium text-gray-500 tabular-nums">
              {filtered.length} invoice{filtered.length === 1 ? '' : 's'}
            </p>
            <p className="text-[10px] font-medium text-gray-400">Tap to view</p>
          </div>

          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm font-medium text-gray-500">
              No invoices match your search
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map((inv) => {
                const total =
                  inv.grand_total_formatted ||
                  formatCurrency(Number(inv.grand_total || inv.amount || 0), currency as 'PKR');
                const customer = inv.customer_name || inv.customer?.name || 'Walk-in Customer';

                return (
                  <li key={inv.id}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-3 text-left active:bg-emerald-50/40"
                        onClick={() => onView?.(inv)}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-[13px] font-bold text-gray-900">
                              {inv.invoice_number || 'Draft'}
                            </p>
                            <p className="shrink-0 text-[13px] font-bold tabular-nums text-emerald-700">
                              {total}
                            </p>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-medium text-gray-600">{customer}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                              {formatInvoiceDate(inv.date)}
                            </span>
                            {inv.due_date && (
                              <span className="text-[10px] font-medium text-gray-400">
                                Due {formatInvoiceDate(inv.due_date)}
                              </span>
                            )}
                            {renderPaymentBadge?.(inv)}
                          </div>
                          {renderAging?.(inv) ? <div className="mt-1">{renderAging(inv)}</div> : null}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="flex shrink-0 items-center px-2 text-gray-300 active:text-gray-500"
                        onClick={() => setActionInvoice(inv)}
                        aria-label="Invoice actions"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="border-t border-gray-100 p-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-xl text-xs font-semibold"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                Load more ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      </div>

      <Sheet open={Boolean(actionInvoice)} onOpenChange={(open) => !open && closeActions()}>
        <SheetContent side="bottom" className={MOBILE_BOTTOM_SHEET}>
          <div className={MOBILE_BOTTOM_SHEET_HANDLE} aria-hidden />
          <SheetHeader className={MOBILE_BOTTOM_SHEET_HEADER}>
            <SheetTitle className="truncate text-base font-bold text-gray-900">
              {actionInvoice?.invoice_number || 'Invoice'}
            </SheetTitle>
            <SheetDescription className="truncate text-xs">
              {actionInvoice?.customer_name || actionInvoice?.customer?.name || 'Customer'}
            </SheetDescription>
          </SheetHeader>
          <div className={MOBILE_BOTTOM_SHEET_BODY}>
            <div className="space-y-2">
              <MobileActionRow icon={Eye} label="View invoice" onClick={() => runAction(onView)} />
              {canRecordPayment && onRecordPayment && (
                <MobileActionRow
                  icon={CreditCard}
                  label="Record payment"
                  onClick={() => runAction(onRecordPayment)}
                />
              )}
              {onEdit && (
                <MobileActionRow icon={Pencil} label="Edit invoice" onClick={() => runAction(onEdit)} />
              )}
              {onDelete && (
                <MobileActionRow
                  icon={Trash2}
                  label="Delete invoice"
                  destructive
                  onClick={() => runAction((inv) => onDelete(inv.id))}
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default InvoiceMobileList;
