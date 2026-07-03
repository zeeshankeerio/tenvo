'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  MobileHubTile,
  MobileActionRow,
  MobileKpiStrip,
  MobilePresetPills,
} from '@/components/mobile/MobileHubPrimitives';
import { useHubMobileNav } from '@/lib/hooks/useHubMobileNav';

/**
 * @typedef {Object} DashboardMobilePreset
 * @property {string} id
 * @property {string} label
 */

/**
 * @typedef {Object} DashboardMobileKpi
 * @property {string} label
 * @property {string|number} value
 * @property {boolean} [alert]
 * @property {string} [tone]
 * @property {string} [hint]
 */

/**
 * @typedef {Object} DashboardMobileAction
 * @property {string} id
 * @property {string} label
 * @property {string} [sublabel]
 * @property {string} [desc]
 * @property {import('react').ElementType} icon
 * @property {string} [tone]
 */

/**
 * @param {{
 *   mode?: 'easy' | 'advanced',
 *   greeting?: string,
 *   userName?: string,
 *   businessName?: string,
 *   periodLabel?: string,
 *   presetOptions?: DashboardMobilePreset[],
 *   activePreset?: string,
 *   onDateRangePresetChange?: (preset: string) => void,
 *   kpiStrip?: DashboardMobileKpi[],
 *   quickActions?: DashboardMobileAction[],
 *   onQuickAction?: (id: string) => void,
 *   healthPanels?: Array<{ label: string, value: string|number, tone?: string, detail?: string }>,
 *   reminders?: { lowStock?: number, overdueInvoices?: number, pendingOrders?: number },
 *   hasCoreData?: boolean,
 *   quickSetupSteps?: Array<{ id: string, label: string }>,
 * }} props
 */
export function DashboardMobileHub({
  mode = 'easy',
  greeting,
  userName,
  businessName,
  periodLabel,
  presetOptions = [],
  activePreset,
  onDateRangePresetChange,
  kpiStrip = [],
  quickActions = [],
  onQuickAction,
  healthPanels = [],
  reminders = {},
  hasCoreData = true,
  quickSetupSteps = [],
}) {
  const [modulesOpen, setModulesOpen] = useState(false);
  const { moduleItems, overflowItems } = useHubMobileNav();

  const runAction = (id) => {
    setModulesOpen(false);
    onQuickAction?.(id);
  };

  const lowStock = reminders.lowStock ?? 0;
  const overdue = reminders.overdueInvoices ?? 0;

  /** Advanced mode uses header date picker, avoid duplicate preset row on mobile */
  const showPresetPills = mode === 'easy' && presetOptions.length > 0;

  const displayName = (() => {
    if (!userName) return '';
    const base = userName.includes('@') ? userName.split('@')[0] : userName;
    const short = base.split('.')[0] || base;
    return short.charAt(0).toUpperCase() + short.slice(1);
  })();

  return (
    <div className="space-y-2.5 border-b border-gray-100 pb-2.5 lg:hidden">
      {/* Compact greeting, no card chrome, no mode badge, no redundant period copy */}
      <div className="space-y-1.5">
        <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-gray-900">
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        {showPresetPills && (
          <MobilePresetPills
            compact
            options={presetOptions}
            activeId={activePreset}
            onSelect={onDateRangePresetChange}
          />
        )}
      </div>

      {/* KPI scroll */}
      <MobileKpiStrip items={kpiStrip} />

      {/* Quick actions, 3-column tile grid */}
      {quickActions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
            {quickActions.slice(0, 6).map((action, index) => (
              <MobileHubTile
                key={action.id}
                icon={action.icon}
                label={action.label}
                sublabel={action.sublabel || action.desc}
                tone={index === 0 ? 'primary' : action.tone || 'default'}
                onClick={() => runAction(action.id)}
              />
            ))}
        </div>
      )}

      {/* Hub modules */}
      <div>
        {overflowItems.length > 0 && (
          <div className="mb-1.5 flex justify-end px-0.5">
            <button
              type="button"
              onClick={() => setModulesOpen(true)}
              className="text-[10px] font-semibold text-brand-primary"
            >
              All modules
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {moduleItems.map((item) => (
            <MobileHubTile
              key={item.key}
              icon={item.icon}
              label={item.label}
              sublabel={item.sublabel}
              badge={
                item.key === 'inventory' ? lowStock :
                item.key === 'invoices' ? overdue :
                undefined
              }
              onClick={() => runAction(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Operational pulse, compact 2×2 on mobile */}
      {healthPanels.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {healthPanels.slice(0, 4).map((panel) => (
              <div key={panel.label} className="rounded-xl border border-gray-100 bg-gray-50/80 px-2.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 line-clamp-1">{panel.label}</p>
                <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', panel.tone)}>{panel.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick setup, compact mobile banner */}
      {!hasCoreData && quickSetupSteps.length > 0 && (
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
          <p className="text-xs font-medium text-gray-800">Add products, customers, or an invoice to unlock insights.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickSetupSteps.map((step) => (
              <Button
                key={step.id}
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-[11px] font-bold"
                onClick={() => runAction(step.id)}
              >
                {step.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Overflow modules sheet */}
      <Sheet open={modulesOpen} onOpenChange={setModulesOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl px-4 pb-8 pt-4">
          <SheetHeader className="text-left">
            <SheetTitle className="text-base">All modules</SheetTitle>
            <SheetDescription className="text-xs">Jump to any workspace area</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {[...moduleItems, ...overflowItems].map((item) => (
              <MobileActionRow
                key={item.key}
                icon={item.icon}
                label={item.label}
                disabled={item.locked}
                onClick={() => !item.locked && runAction(item.key)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default DashboardMobileHub;
