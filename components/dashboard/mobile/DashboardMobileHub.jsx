'use client';

import { useMemo } from 'react';
import { Clock, Package, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MobileHubTile,
  MobileKpiStrip,
  MobilePresetPills,
} from '@/components/mobile/MobileHubPrimitives';
import { HUB_MOBILE_ROOT } from '@/lib/utils/mobileLayout';

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
 * Mobile dashboard shell — KPIs, quick actions, operational pulse.
 * Module navigation lives in HubMobileBottomNav (no duplicate tile grid here).
 *
 * @param {{
 *   mode?: 'easy' | 'advanced',
 *   greeting?: string,
 *   userName?: string,
 *   businessName?: string,
 *   periodLabel?: string,
 *   metricsPending?: boolean,
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
  mode: _mode = 'easy',
  greeting: _greeting,
  userName: _userName,
  businessName,
  periodLabel,
  metricsPending = false,
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
  const runAction = (id) => {
    onQuickAction?.(id);
  };

  /** Advanced mode uses header date picker on desktop — presets stay on mobile for both modes */
  const showPresetPills = presetOptions.length > 0;

  const liveStatusLabel = metricsPending
    ? 'Loading live metrics…'
    : 'Live';

  const reminderRows = useMemo(
    () =>
      [
        {
          id: 'low-stock',
          label: 'Low stock',
          count: reminders.lowStock ?? 0,
          icon: Package,
          alert: true,
        },
        {
          id: 'overdue',
          label: 'Overdue invoices',
          count: reminders.overdueInvoices ?? 0,
          icon: Clock,
        },
        {
          id: 'pending-orders',
          label: 'Pending orders',
          count: reminders.pendingOrders ?? 0,
          icon: ShoppingCart,
        },
      ].filter((row) => row.count > 0),
    [reminders.lowStock, reminders.overdueInvoices, reminders.pendingOrders]
  );

  return (
    <div className={cn('space-y-2 border-b border-gray-100 pb-2 lg:hidden', HUB_MOBILE_ROOT)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-2 py-1 shadow-sm">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              metricsPending ? 'animate-pulse bg-brand-primary' : 'bg-green-500'
            )}
            aria-hidden
          />
          <p className="min-w-0 truncate text-[10px] font-semibold leading-tight text-gray-500" aria-live="polite">
            <span className="text-gray-700">{liveStatusLabel}</span>
            {businessName ? (
              <>
                <span className="text-gray-300"> · </span>
                <span className="font-medium text-gray-600">{businessName}</span>
              </>
            ) : null}
            {periodLabel ? (
              <>
                <span className="text-gray-300"> · </span>
                <span>{periodLabel}</span>
              </>
            ) : null}
          </p>
        </div>

        {showPresetPills && (
          <MobilePresetPills
            compact
            options={presetOptions}
            activeId={activePreset}
            onSelect={onDateRangePresetChange}
          />
        )}
      </div>

      {kpiStrip.length > 0 ? (
        metricsPending ? (
          <div className="grid grid-cols-2 gap-2 lg:hidden" aria-busy="true" aria-label="Loading metrics">
            {kpiStrip.slice(0, 4).map((kpi) => (
              <div
                key={`kpi-skel-${kpi.label}`}
                className="min-w-0 animate-pulse rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm"
              >
                <div className="h-3 w-14 rounded bg-gray-100" />
                <div className="mt-2 h-4 w-10 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <MobileKpiStrip items={kpiStrip} />
        )
      ) : null}

      {reminderRows.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Needs attention
          </p>
          <div className="space-y-1">
            {reminderRows.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => runAction(row.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors active:bg-brand-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-800">{row.label}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                      row.alert ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {row.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {quickActions.length > 0 && (
        <div>
          <p className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Quick actions
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickActions.slice(0, 8).map((action, index) => (
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
        </div>
      )}

      {healthPanels.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Operational pulse
          </p>
          <div className="grid grid-cols-2 gap-2">
            {healthPanels.slice(0, 4).map((panel) => (
              <div
                key={panel.label}
                className={cn(
                  'rounded-xl border border-gray-100 bg-gray-50/80 px-2.5 py-2',
                  metricsPending && 'animate-pulse'
                )}
              >
                <p className="line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {panel.label}
                </p>
                {metricsPending ? (
                  <div className="mt-1.5 h-4 w-12 rounded bg-gray-200" />
                ) : (
                  <>
                    <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', panel.tone)}>{panel.value}</p>
                    {panel.detail ? (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">{panel.detail}</p>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasCoreData && !metricsPending && quickSetupSteps.length > 0 && (
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
          <p className="text-xs font-medium text-gray-800">
            Add products, customers, or an invoice to unlock insights.
          </p>
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
    </div>
  );
}

export default DashboardMobileHub;
