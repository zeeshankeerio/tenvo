'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Feature detail card with optional demo hero strip (replaces plain white FeatureDetail).
 */
export default function MarketingFeatureCard({
  id,
  title,
  description,
  features = [],
  heroImage,
  demoHref,
  demoLabel,
  accent = {},
  className,
}) {
  const {
    card = 'border-slate-200/90 bg-white',
    check = 'text-brand-primary',
  } = accent;

  return (
    <article
      id={id}
      className={cn(
        'overflow-hidden rounded-2xl border sm:rounded-3xl',
        'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg',
        id ? 'scroll-mt-28' : '',
        card,
        className
      )}
    >
      {heroImage ? (
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-slate-100">
          <Image
            src={heroImage}
            alt=""
            fill
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
          {demoHref && demoLabel ? (
            <Link
              href={demoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-800 shadow-sm motion-safe:transition-colors hover:bg-white"
            >
              {demoLabel}
              <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="p-6 sm:p-8">
        <h4 className="mb-3 text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h4>
        <p className="mb-6 font-medium text-slate-600">{description}</p>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className={cn('mt-0.5 h-5 w-5 shrink-0', check)} aria-hidden />
              <span className="text-sm font-medium text-slate-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
