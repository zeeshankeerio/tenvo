'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { HOME_DEMO_SPOTLIGHT } from '@/lib/marketing/homeVisualThemes';
import { cn } from '@/lib/utils';

/**
 * 2x2 live demo storefront spotlight (replaces duplicate hub mock in walkthrough band).
 */
export default function HomeDemoSpotlightVisual({ className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:gap-4',
        className
      )}
      aria-hidden
    >
      {HOME_DEMO_SPOTLIGHT.map((item) => (
        <Link
          key={item.domain}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-sm motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md"
        >
          {item.heroImage ? (
            <Image
              src={item.heroImage}
              alt=""
              fill
              className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
              sizes="(max-width: 1024px) 45vw, 280px"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/15 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 p-3">
            <span className="text-sm font-semibold text-white">{item.label}</span>
            <ExternalLink className="h-3.5 w-3.5 text-white/80" aria-hidden />
          </div>
        </Link>
      ))}
    </div>
  );
}
