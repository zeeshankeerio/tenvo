'use client';

import { useMemo, useState } from 'react';
import {
  Package,
  Warehouse,
  Factory,
  FileText,
  BarChart3,
  Layers,
  Tag,
  RefreshCw,
  BrainCircuit,
  ScanBarcode,
  Table2,
  Upload,
  Download,
  AlertTriangle,
  Repeat,
  Sparkles,
  Keyboard,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MobileHubTile, MobileActionRow } from '@/components/mobile/MobileHubPrimitives';

/**
 * Mobile-only inventory hub, app-style tiles for sections and actions.
 * Desktop uses InventoryCommandBar; this renders only below lg breakpoint.
 */
export function InventoryMobileHub({
  activeTab,
  onTabChange,
  lastSyncedAt,
  isRefreshing,
  onRefresh,
  onAiSmartAdd,
  onOpenTemplates,
  hasQuickAddTemplates,
  onExcelMode,
  onImport,
  onExport,
  onScanBarcode,
  onAdjustStock,
  onTransferStock,
  onShowShortcuts,
  onGoToReports,
  isMultiLocationEnabled,
  isManufacturingEnabled,
  isVariantEnabled,
  stats = {},
}) {
  const [toolsOpen, setToolsOpen] = useState(false);

  const syncLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Synced';

  const sections = useMemo(
    () =>
      [
        { id: 'products', label: 'Products', sublabel: 'Catalog & stock', icon: Package, show: true },
        { id: 'locations', label: 'Locations', sublabel: 'Warehouses', icon: Warehouse, show: isMultiLocationEnabled },
        { id: 'manufacturing', label: 'Make', sublabel: 'Production', icon: Factory, show: isManufacturingEnabled },
        { id: 'orders', label: 'Orders', sublabel: 'SO & challans', icon: FileText, show: true },
        { id: 'reports', label: 'Reports', sublabel: 'Insights', icon: BarChart3, show: true },
        { id: 'variants', label: 'Variants', sublabel: 'Matrix', icon: Layers, show: isVariantEnabled },
        { id: 'pricing', label: 'Pricing', sublabel: 'Lists & rules', icon: Tag, show: true },
      ].filter((s) => s.show),
    [isMultiLocationEnabled, isManufacturingEnabled, isVariantEnabled]
  );

  const isProductsTab = activeTab === 'products';

  const runAction = (fn) => {
    setToolsOpen(false);
    fn?.();
  };

  return (
    <div className="space-y-3 border-b border-gray-100 pb-3 lg:hidden">
      {/* Status strip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-2.5 py-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
          <span className="truncate text-[11px] font-semibold text-green-800">{syncLabel}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Mini KPI scroll */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
        {[
          { label: 'Products', value: stats.totalProducts ?? 0 },
          { label: 'Alerts', value: stats.lowStock ?? 0, alert: (stats.lowStock ?? 0) > 0 },
          { label: 'Value', value: stats.inventoryValue ?? '—' },
          { label: 'Class', value: stats.efficiencyClass ?? '—' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="min-w-[100px] shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{kpi.label}</p>
            <p className={cn('mt-0.5 truncate text-sm font-bold', kpi.alert ? 'text-red-600' : 'text-gray-900')}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Section tiles */}
      <div>
        <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Inventory modules</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sections.map((section) => (
            <MobileHubTile
              key={section.id}
              icon={section.icon}
              label={section.label}
              sublabel={section.sublabel}
              active={activeTab === section.id}
              badge={section.id === 'products' ? stats.lowStock : undefined}
              onClick={() => onTabChange?.(section.id)}
            />
          ))}
        </div>
      </div>

      {/* Products quick actions */}
      {isProductsTab && (
        <div>
          <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Quick actions</p>
          <div className="grid grid-cols-3 gap-2">
            <MobileHubTile icon={BrainCircuit} label="AI Add" sublabel="Smart entry" tone="primary" onClick={onAiSmartAdd} />
            <MobileHubTile icon={ScanBarcode} label="Scan" sublabel="Camera & QR" tone="accent" onClick={onScanBarcode} />
            <MobileHubTile icon={Table2} label="Excel" sublabel="Bulk grid" onClick={onExcelMode} />
            <MobileHubTile icon={Upload} label="Import" sublabel="From file" onClick={onImport} />
            <MobileHubTile icon={Download} label="Export" sublabel="Download" onClick={onExport} />
            <MobileHubTile icon={LayoutGrid} label="All tools" sublabel="More options" onClick={() => setToolsOpen(true)} />
          </div>
        </div>
      )}

      {/* Bottom sheet, extended tools */}
      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl px-4 pb-8 pt-4">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base">Inventory tools</SheetTitle>
            <SheetDescription className="text-xs">Stock, data, and helper actions</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <MobileActionRow icon={AlertTriangle} label="Adjust stock" onClick={() => runAction(onAdjustStock)} />
            <MobileActionRow icon={Repeat} label="Transfer stock" onClick={() => runAction(onTransferStock)} />
            {hasQuickAddTemplates && (
              <MobileActionRow icon={Sparkles} label="Starter templates" onClick={() => runAction(onOpenTemplates)} />
            )}
            <MobileActionRow icon={BarChart3} label="Reports & restock" onClick={() => runAction(onGoToReports)} />
            <MobileActionRow icon={Keyboard} label="Keyboard shortcuts" onClick={() => runAction(onShowShortcuts)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default InventoryMobileHub;
