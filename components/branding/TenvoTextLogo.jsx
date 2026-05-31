import { cn } from '@/lib/utils';

/**
 * Centralized TENVO text logo.
 * Use this component everywhere instead of ad-hoc brand text blocks.
 */
export function TenvoTextLogo({
  compact = false,
  className,
  textClassName,
  taglineClassName,
  iconClassName,
  iconTextClassName,
  tagline = 'Enterprise Hub'
}) {
  return (
    <div className={cn('flex items-center gap-3', compact && 'gap-2', className)}>
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shrink-0',
          'bg-brand-primary text-white shadow-md shadow-brand-primary/20 border border-brand-primary/20',
          compact && 'w-8 h-8 text-base rounded-lg',
          iconClassName
        )}
      >
        <span className={cn('leading-none', iconTextClassName)}>T</span>
      </div>

      {!compact && (
        <div className="flex flex-col justify-center gap-0.5 leading-none">
          <span className={cn('font-black text-gray-900 text-xl tracking-tight uppercase', textClassName)}>
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
