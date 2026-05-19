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
          'bg-gradient-to-br from-[#e34242] to-[#b81d24] text-white shadow-md shadow-brand-primary/20 border border-[#e34242]/20',
          compact && 'w-8 h-8 text-base rounded-lg',
          iconClassName
        )}
      >
        <span className={cn('leading-none', iconTextClassName)}>T</span>
      </div>

      {!compact && (
        <div className="flex flex-col -space-y-0.5">
          <span className={cn('font-black text-gray-900 text-xl tracking-tight uppercase', textClassName)}>
            TENVO
          </span>
          <span className={cn('text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]', taglineClassName)}>
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}
