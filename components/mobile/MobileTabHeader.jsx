'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * @typedef {Object} MobileTabAction
 * @property {string} id
 * @property {string} label
 * @property {import('react').ElementType} [icon]
 * @property {string} [variant]
 * @property {string} [className]
 * @property {() => void} onClick
 */

/**
 * @typedef {Object} MobileStatItem
 * @property {string} label
 * @property {string|number} value
 * @property {string} [hint]
 * @property {string} [labelTone]
 * @property {string} [valueTone]
 * @property {string} [hintTone]
 * @property {boolean} [alert]
 */

/**
 * @param {{
 *   icon?: import('react').ElementType,
 *   iconClassName?: string,
 *   title: string,
 *   subtitle?: string,
 *   actions?: MobileTabAction[],
 *   primaryAction?: { label: string, icon?: import('react').ElementType, className?: string, onClick: () => void },
 * }} props
 */
export function MobileTabHeader({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  actions = [],
  primaryAction,
}) {
  return (
    <div className="space-y-2.5 lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClassName || 'bg-gray-100 text-gray-700')}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="truncate text-[11px] font-medium text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        {primaryAction && (
          <Button
            size="sm"
            className={cn('h-9 shrink-0 rounded-xl px-3 text-xs font-bold', primaryAction.className)}
            onClick={primaryAction.onClick}
          >
            {primaryAction.icon && <primaryAction.icon className="mr-1.5 h-3.5 w-3.5" />}
            {primaryAction.label}
          </Button>
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant || 'outline'}
              size="sm"
              className={cn(
                'h-8 shrink-0 rounded-xl px-2.5 text-[11px] font-semibold',
                action.className
              )}
              onClick={action.onClick}
            >
              {action.icon && <action.icon className="mr-1 h-3.5 w-3.5" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {{ items?: MobileStatItem[], layout?: 'scroll' | 'grid' }} props
 */
export function MobileStatStrip({ items = [], layout = 'scroll' }) {
  if (!items.length) return null;

  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'rounded-xl border bg-white px-2.5 py-2 shadow-sm min-w-0',
              item.alert ? 'border-red-100' : 'border-gray-100'
            )}
          >
            <p className={cn('text-[10px] font-bold uppercase tracking-wide', item.labelTone || 'text-gray-400')}>
              {item.label}
            </p>
            <p className={cn('mt-0.5 text-sm font-bold tabular-nums leading-tight truncate', item.valueTone || 'text-gray-900')}>
              {item.value}
            </p>
            {item.hint && (
              <p className={cn('mt-0.5 truncate text-[10px] font-medium', item.hintTone || 'text-gray-400')}>
                {item.hint}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 scrollbar-none lg:hidden">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'min-w-[88px] shrink-0 rounded-xl border bg-white px-2.5 py-2 shadow-sm',
            item.alert ? 'border-red-100' : 'border-gray-100'
          )}
        >
          <p className={cn('text-[10px] font-bold uppercase tracking-wide', item.labelTone || 'text-gray-400')}>
            {item.label}
          </p>
          <p className={cn('mt-0.5 text-base font-bold tabular-nums leading-tight', item.valueTone || 'text-gray-900')}>
            {item.value}
          </p>
          {item.hint && (
            <p className={cn('mt-0.5 truncate text-[10px] font-medium', item.hintTone || 'text-gray-400')}>
              {item.hint}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
