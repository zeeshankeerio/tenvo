'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';

/**
 * Zellbury-style 4-up unstitched category grid.
 */
export function UnstitchedShowcase({ title = 'UNSTITCHED', tiles = [], viewAllHref }) {
  if (tiles.length < 2) return null;

  return (
    <section className="border-b border-stone-100 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-center gap-3 sm:mb-8">
          <h2 className="text-center text-xl font-semibold uppercase tracking-[0.2em] text-stone-900 sm:text-2xl">
            {title}
          </h2>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold uppercase tracking-wide text-stone-500 transition hover:text-stone-800"
            >
              View all
            </Link>
          ) : null}
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {tiles.map((tile) => (
            <Link key={tile.id} href={tile.href} className="group text-center">
              <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-stone-100">
                <SmartProductImage
                  src={tile.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-900 sm:text-sm">
                {tile.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
