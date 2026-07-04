'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileHubTile({
  icon: Icon,
  label,
  sublabel,
  onClick,
  active = false,
  tone = 'default',
  badge,
  disabled = false,
  compact = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col justify-between rounded-2xl border text-left shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'min-h-[68px] p-2' : 'min-h-[84px] p-3',
        tone === 'primary' && 'border-slate-800 bg-slate-900 text-white',
        tone === 'accent' && 'border-brand-primary/25 bg-brand-primary/5',
        tone === 'default' && !active && 'border-gray-100 bg-white',
        active && tone === 'default' && 'border-brand-primary/30 bg-brand-primary/5 ring-2 ring-brand-primary/20'
      )}
    >
      {badge != null && badge > 0 && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <div
        className={cn(
          'flex items-center justify-center rounded-xl',
          compact ? 'h-7 w-7' : 'h-9 w-9',
          tone === 'primary' ? 'bg-white/10' : 'bg-gray-50 text-gray-700'
        )}
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </div>
      <div>
        <p className={cn('font-bold leading-tight', compact ? 'text-[10px]' : 'text-xs')}>{label}</p>
        {sublabel && (
          <p className={cn('mt-0.5 leading-snug', compact ? 'text-[10px]' : 'text-[10px]', tone === 'primary' ? 'text-slate-300' : 'text-gray-500')}>
            {sublabel}
          </p>
        )}
      </div>
    </button>
  );
}

export function MobileActionRow({ icon: Icon, label, sublabel, onClick, destructive, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-offset-1',
        active
          ? 'border-brand-primary/20 bg-brand-50/50'
          : 'border-gray-100 bg-white active:bg-gray-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', destructive ? 'bg-red-50 text-red-600' : active ? 'bg-brand-primary/10 text-brand-primary' : 'bg-gray-50 text-gray-700')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">{label}</span>
        {sublabel ? <span className="mt-0.5 block text-[11px] font-medium text-gray-500">{sublabel}</span> : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </button>
  );
}

export function MobileKpiStrip({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="min-w-[96px] shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{kpi.label}</p>
          <p className={cn('mt-0.5 truncate text-sm font-bold tabular-nums', kpi.alert ? 'text-red-600' : kpi.tone || 'text-gray-900')}>
            {kpi.value}
          </p>
          {kpi.hint && (
            <p className="mt-0.5 truncate text-[10px] font-medium text-gray-400">{kpi.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function MobilePresetPills({ options = [], activeId, onSelect, compact = false }) {
  if (!options.length) return null;

  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-none', compact ? 'pb-0' : 'pb-0.5')}>
      {options.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect?.(preset.id)}
          className={cn(
            'shrink-0 rounded-full font-bold uppercase tracking-wide transition-all',
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[10px]',
            activeId === preset.id
              ? 'bg-slate-900 text-white shadow-sm'
              : 'border border-gray-200 bg-white text-gray-600'
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
