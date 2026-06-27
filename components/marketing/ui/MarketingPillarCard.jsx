'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tinted pillar card for solution pages (marketing-crm, why-tenvo compare, etc.).
 */
export default function MarketingPillarCard({
  id,
  title,
  body,
  bullets = [],
  icon: Icon,
  accent = {},
  className,
}) {
  const {
    card = 'border-neutral-200/90 bg-neutral-50/60',
    icon: iconClass = 'bg-brand-primary text-white',
    check = 'text-brand-primary',
  } = accent;

  return (
    <article
      id={id}
      className={cn(
        'rounded-2xl border p-5 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8',
        'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md',
        id ? 'scroll-mt-28' : '',
        card,
        className
      )}
    >
      {Icon ? (
        <div
          className={cn(
            'mb-5 flex h-12 w-12 items-center justify-center rounded-2xl',
            iconClass
          )}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-600">{body}</p>
      {bullets.length > 0 ? (
        <ul className="mt-5 space-y-2.5 text-sm font-semibold text-neutral-700">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className={cn('mt-0.5 h-4 w-4 shrink-0', check)} aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
