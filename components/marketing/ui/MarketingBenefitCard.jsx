'use client';

import { cn } from '@/lib/utils';

/**
 * Compact benefit tile with Lucide icon and accent tokens (no emoji).
 */
export default function MarketingBenefitCard({
  title,
  description,
  icon: Icon,
  accent = {},
  className,
}) {
  const {
    card = 'border-slate-200/90 bg-white',
    icon: iconClass = 'bg-brand-50 text-brand-primary border-brand-100',
  } = accent;

  return (
    <article
      className={cn(
        'rounded-2xl border p-5 sm:rounded-3xl sm:p-6 lg:p-8',
        'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md',
        card,
        className
      )}
    >
      {Icon ? (
        <div
          className={cn(
            'mb-3 flex h-12 w-12 items-center justify-center rounded-xl border sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl',
            iconClass
          )}
        >
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        </div>
      ) : null}
      <h4 className="mb-2 text-lg font-semibold text-slate-900 sm:mb-3 sm:text-xl">{title}</h4>
      <p className="font-medium leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}
