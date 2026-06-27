import { cn } from '@/lib/utils';
import { TenvoIcon } from '@/components/branding/TenvoIcon';

/**
 * Centralized TENVO wordmark + icon.
 * Icon is always public/tenvo.svg (built-in red tile + mark).
 */
export function TenvoTextLogo({
  compact = false,
  className,
  textClassName,
  taglineClassName,
  iconClassName,
  tagline = 'Enterprise Hub',
}) {
  const iconSize = compact ? 32 : 36;

  return (
    <div className={cn('flex items-center gap-3', compact && 'gap-2', className)}>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          compact ? 'h-8 w-8' : 'h-9 w-9',
          iconClassName
        )}
      >
        <TenvoIcon
          size={iconSize}
          className="h-full w-full"
          alt={compact ? 'TENVO' : ''}
          priority
        />
      </div>

      {!compact && (
        <div className="flex flex-col justify-center gap-0.5 leading-none">
          <span className={cn('font-semibold text-gray-900 text-xl tracking-tight uppercase', textClassName)}>
            TENVO
          </span>
          <span
            className={cn(
              'text-[10px] font-semibold text-gray-400 uppercase tracking-[0.22em]',
              taglineClassName
            )}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}
