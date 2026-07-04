'use client';

import {
  RefreshCw,
  ScanBarcode,
  BrainCircuit,
  Table2,
  Upload,
  Download,
  AlertTriangle,
  Repeat,
  Keyboard,
  BarChart3,
  Sparkles,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const VIEW_MODES = [
  { id: 'visual', label: 'Visual' },
  { id: 'busy', label: 'Busy' },
  { id: 'cards', label: 'Cards' },
];

/**
 * Single-row inventory toolbar, sync, view mode, and grouped actions.
 */
export function InventoryCommandBar({
  activeTab = 'products',
  viewMode = 'visual',
  onViewModeChange,
  lastSyncedAt,
  isRefreshing = false,
  onRefresh,
  onAiSmartAdd,
  onOpenTemplates,
  hasQuickAddTemplates = false,
  onExcelMode,
  onImport,
  onExport,
  onScanBarcode,
  onAdjustStock,
  onTransferStock,
  onShowShortcuts,
  onGoToReports,
}) {
  const isProductsTab = activeTab === 'products';
  const syncLabel = lastSyncedAt
    ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Synced';

  return (
    <div className="scrollbar-none flex min-w-0 items-center gap-1.5 overflow-x-auto border-b border-gray-100/80 pb-2.5">
      {/* Sync status */}
      <div
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-green-100 bg-green-50 px-2 py-1"
        title={lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Inventory loaded'}
      >
        <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
        <span className="text-[10px] font-semibold text-green-700">{syncLabel}</span>
      </div>

      {/* Refresh, icon only */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-8 w-8 shrink-0 rounded-lg border-gray-200 text-gray-600"
        title="Refresh inventory"
        aria-label="Refresh inventory"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
      </Button>

      {isProductsTab && (
        <>
          {/* View mode */}
          <div
            className="flex h-8 shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100/90 p-0.5 shadow-sm"
            role="group"
            aria-label="View mode"
          >
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onViewModeChange?.(mode.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  viewMode === mode.id
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-gray-200" aria-hidden />

          {/* AI smart add, direct action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAiSmartAdd}
            className="h-8 shrink-0 rounded-lg border-slate-200 bg-slate-900 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-slate-800"
            title="AI smart add"
          >
            <BrainCircuit className="mr-1.5 h-3.5 w-3.5 text-blue-300" />
            AI Add
          </Button>

          {/* Data */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg border-gray-200 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Data
                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl p-1.5">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Spreadsheet
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={onExcelMode} className="rounded-lg py-2">
                <Table2 className="mr-2 h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold">Excel mode</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onImport} className="rounded-lg py-2">
                <Upload className="mr-2 h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold">Import Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport} className="rounded-lg py-2">
                <Download className="mr-2 h-4 w-4 text-violet-600" />
                <span className="text-xs font-semibold">Export inventory</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Stock */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg border-gray-200 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
              >
                <ScanBarcode className="mr-1.5 h-3.5 w-3.5" />
                Stock
                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl p-1.5">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Operations
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={onScanBarcode} className="rounded-lg py-2">
                <ScanBarcode className="mr-2 h-4 w-4 text-brand-primary" />
                <span className="text-xs font-semibold">Scan (camera & QR)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAdjustStock} className="rounded-lg py-2">
                <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">Adjust stock</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTransferStock} className="rounded-lg py-2">
                <Repeat className="mr-2 h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold">Transfer stock</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Templates shortcut when available */}
          {hasQuickAddTemplates && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenTemplates}
              className="h-8 shrink-0 rounded-lg border-amber-200 bg-amber-50 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 hover:bg-amber-100"
              title="Starter product templates"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Templates
            </Button>
          )}

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500"
              >
                More
                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
              <DropdownMenuItem onClick={onShowShortcuts} className="rounded-lg py-2">
                <Keyboard className="mr-2 h-4 w-4 text-gray-600" />
                <span className="text-xs font-semibold">Keyboard shortcuts</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onGoToReports} className="rounded-lg py-2">
                <BarChart3 className="mr-2 h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold">Reports &amp; restock</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

export default InventoryCommandBar;
