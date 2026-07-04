'use client';

import Link from 'next/link';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium health concerns section with image cards.
 * Helps customers browse by condition/need rather than category.
 */
export function PharmacyHealthConcerns({ concerns = [], productsUrl, accent = '#16a34a' }) {
  if (!concerns.length) return null;

  return (
    <section className="bg-gradient-to-b from-white to-emerald-50/30 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:mb-8 lg:text-left">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: accent }}
          >
            Health concerns
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900 sm:text-2xl lg:text-3xl">
            Shop by what you need
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Find products tailored to common health conditions and wellness goals
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {concerns.map((concern) => (
            <Link
              key={concern.id}
              href={concern.href || `${productsUrl}?category=${encodeURIComponent(concern.slug)}`}
              className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3]">
                {concern.image ? (
                  <SmartProductImage
                    src={concern.image}
                    alt={concern.label}
                    fill
                    className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-sm font-semibold"
                    style={{
                      background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 100%)`,
                      color: accent,
                    }}
                  >
                    {concern.label}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                
                {/* Label */}
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-white sm:text-base">
                    {concern.label}
                  </p>
                  <div
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  >
                    Shop now
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={productsUrl}
            className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all duration-200 hover:shadow-md"
            style={{
              borderColor: `${accent}30`,
              color: accent,
            }}
          >
            Browse all products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
