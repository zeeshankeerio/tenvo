'use client';

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
  const runAction = (id) => {
    onQuickAction?.(id);
  };

  /** Advanced mode uses header date picker — avoid duplicate preset row on mobile */
  const showPresetPills = mode === 'easy' && presetOptions.length > 0;

  const displayName = (() => {
    if (!userName) return '';
    const base = userName.includes('@') ? userName.split('@')[0] : userName;
    const short = base.split('.')[0] || base;
    return short.charAt(0).toUpperCase() + short.slice(1);
  })();

  return (
    <div className={cn('space-y-3 border-b border-gray-100 pb-3 lg:hidden', HUB_MOBILE_ROOT)}>
      <div className="space-y-1.5">
        <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-gray-900">
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        {businessName ? (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {businessName}
            {periodLabel ? ` · ${periodLabel}` : ''}
          </p>
        ) : null}
        {showPresetPills && (
          <MobilePresetPills
            compact
            options={presetOptions}
            activeId={activePreset}
            onSelect={onDateRangePresetChange}
          />
        )}
      </div>

      {kpiStrip.length > 0 ? <MobileKpiStrip items={kpiStrip} /> : null}

      {quickActions.length > 0 && (
        <div>
          <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Quick actions
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        </div>
      )}

      {healthPanels.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Operational pulse
          </p>
          <div className="grid grid-cols-2 gap-2">
            {healthPanels.slice(0, 4).map((panel) => (
              <div key={panel.label} className="rounded-xl border border-gray-100 bg-gray-50/80 px-2.5 py-2">
                <p className="line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {panel.label}
                </p>
                <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', panel.tone)}>{panel.value}</p>
                {panel.detail ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-gray-500">{panel.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasCoreData && quickSetupSteps.length > 0 && (
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
