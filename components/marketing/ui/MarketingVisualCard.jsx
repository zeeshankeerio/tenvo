'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.1.0&auto=format&fit=crop&w=1200&q=82';

/**
 * Image-top marketing card (Zoho / Shopify-style proof tile).
 */
export default function MarketingVisualCard({
  image,
  title,
  description,
  bullets = [],
  icon: Icon,
  iconClassName,
  checkClassName = 'text-brand-primary',
  demoHref,
  demoLabel,
  className,
}) {
  const [imgSrc, setImgSrc] = useState(image || FALLBACK_IMAGE);

  useEffect(() => {
    setImgSrc(image || FALLBACK_IMAGE);
  }, [image]);

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm',
        'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md',
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (imgSrc !== FALLBACK_IMAGE) setImgSrc(FALLBACK_IMAGE);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />
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

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        {Icon ? (
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/60',
              iconClassName
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        ) : null}
        <h4 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h4>
        <p className="text-sm font-medium leading-relaxed text-slate-600">{description}</p>
        {bullets.length > 0 ? (
          <ul className="mt-auto space-y-2 pt-1 text-xs font-semibold text-slate-700">
            {bullets.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className={cn('h-3.5 w-3.5 shrink-0', checkClassName)} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
