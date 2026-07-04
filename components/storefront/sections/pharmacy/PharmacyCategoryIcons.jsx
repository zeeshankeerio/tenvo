'use client';

import Link from 'next/link';
import {
  Pill, Thermometer, Syringe, ShieldCheck, HeartPulse,
  Sparkles, Sun, Stethoscope, Baby, Droplet, Tag, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PHARMACY_ICON_MAP = {
  pill: Pill,
  thermometer: Thermometer,
  syringe: Syringe,
  'shield-check': ShieldCheck,
  'heart-pulse': HeartPulse,
  sparkles: Sparkles,
  sun: Sun,
  stethoscope: Stethoscope,
  baby: Baby,
  droplet: Droplet,
  tag: Tag,
  package: Package,
};

/**
 * Premium pharmacy category icons with auto-scrolling horizontal marquee.
 * Mirrors the fitness store's category rail pattern for consistency.
 */
export function PharmacyCategoryIcons({ categoryIcons = [], accent = '#16a34a' }) {
  if (!categoryIcons.length) return null;

  const Icon = ({ iconKey, fallbackLabel }) => {
    const IconComponent = PHARMACY_ICON_MAP[iconKey] || Package;
    return <IconComponent className="h-5 w-5" aria-label={fallbackLabel} />;
  };

  return (
    <section className="border-b border-emerald-100 bg-white pb-6 pt-4 sm:pb-10 sm:pt-6 lg:pt-8">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base font-semibold text-gray-900 sm:text-xl lg:text-2xl">
            Shop by category
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            Browse trusted medicines, vitamins & personal care
          </p>
        </div>

        {/* Mobile & Tablet: auto-scrolling horizontal marquee */}
        <div className="relative overflow-hidden lg:hidden">
          <div className="pharmacy-category-marquee-track flex w-max gap-3">
            {/* Duplicate for seamless loop */}
            {[...categoryIcons, ...categoryIcons].map((cat, idx) => (
              <Link
                key={`${cat.id}-${idx}`}
                href={cat.href}
                className="group flex w-[5rem] shrink-0 flex-col items-center gap-2 text-center"
              >
                <div
                  className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-2xl border-2 transition-all duration-300 group-active:scale-95"
                  style={{
                    borderColor: '#d1fae5',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-300 group-active:opacity-100"
                    style={{
                      background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 100%)`,
                    }}
                    aria-hidden
                  />
                  <div className="relative" style={{ color: accent }}>
                    {cat.icon ? (
                      <Icon iconKey={cat.icon} fallbackLabel={cat.label} />
                    ) : (
                      <div className="text-xs font-bold uppercase tracking-wide">
                        {cat.label?.slice(0, 2)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-gray-700 sm:text-[11px]">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop: static grid */}
        <div className="hidden grid-cols-6 gap-4 lg:grid xl:grid-cols-8">
          {categoryIcons.slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="group flex flex-col items-center gap-2 rounded-2xl p-1 text-center transition-transform duration-200 active:scale-95 lg:hover:scale-105"
            >
              <div
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 shadow-sm transition-all duration-300"
                style={{
                  borderColor: '#d1fae5',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 lg:group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${accent}20 0%, ${accent}10 100%)`,
                  }}
                  aria-hidden
                />
                <div className="relative" style={{ color: accent }}>
                  {cat.icon ? (
                    <Icon iconKey={cat.icon} fallbackLabel={cat.label} />
                  ) : (
                    <div className="text-sm font-bold uppercase tracking-wide">
                      {cat.label?.slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>
              <span className="line-clamp-2 text-xs font-semibold leading-tight text-gray-700">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
