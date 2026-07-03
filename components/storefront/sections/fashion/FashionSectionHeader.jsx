'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared editorial section header for the clothing/fashion storefront.
 *
 * Gives every fashion section (Unstitched, Ready to Wear, Accessories, Offers,
 * New Arrivals) an identical, well-aligned centered header: optional eyebrow,
 * an uppercase tracked title, a short accent divider (store brand colour), an
 * optional subtitle, and an optional "View all" link. Keeping this in one place
 * guarantees consistent typography, spacing, and alignment across the page.
 *
 * @param {{
 *   eyebrow?: string;
 *   title: string;
 *   subtitle?: string;
 *   viewAllHref?: string;
 *   viewAllLabel?: string;
 *   accent?: string;
 *   dense?: boolean;
 *   className?: string;
 * }} props
 */
export function FashionSectionHeader({
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View all',
  accent = '#1c1917',
  dense = false,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        dense ? 'mb-6 sm:mb-8' : 'mb-8 sm:mb-10',
        className
      )}
    >
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="store-heading text-lg font-semibold uppercase tracking-[0.2em] text-stone-900 sm:text-2xl">
        {title}
      </h2>
      <span
        className="mt-3 block h-[3px] w-10 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
          {subtitle}
        </p>
      ) : null}
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="group mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 transition hover:text-stone-900"
        >
          {viewAllLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export default FashionSectionHeader;
