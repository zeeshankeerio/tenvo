'use client';

import Link from 'next/link';
import {
  Pill, Thermometer, Syringe, ShieldCheck, HeartPulse,
  Sparkles, Sun, Stethoscope, Baby, Tag, Package, Activity, Moon, Droplet,
} from 'lucide-react';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { StoreMarqueeRow } from '@/components/storefront/sections/shared/StoreMarqueeRow';
import { resolvePharmacyCategoryIconKey } from '@/lib/storefront/pharmacyStorefront';

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
  tag: Tag,
  package: Package,
  activity: Activity,
  moon: Moon,
  droplet: Droplet,
};

function CategoryIconVisual({ cat, accent }) {
  const iconKey = String(cat.icon || resolvePharmacyCategoryIconKey(cat.slug, cat.label))
    .toLowerCase()
    .replace(/_/g, '-');
  const IconComponent = PHARMACY_ICON_MAP[iconKey] || Package;

  if (cat.image) {
    return (
      <SmartProductImage
        src={cat.image}
        alt={cat.label}
        fill
        className="object-cover transition duration-300 motion-safe:group-hover:scale-105"
        sizes="80px"
      />
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ color: accent }}>
      <IconComponent className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
    </div>
  );
}

function CategoryTile({ cat, accent }) {
  return (
    <Link
      href={cat.href}
      className="group flex w-[5rem] shrink-0 flex-col items-center gap-2 text-center sm:w-[5.5rem]"
    >
      <div
        className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl border-2 shadow-sm transition-all duration-300 motion-safe:group-hover:scale-105 motion-safe:group-active:scale-95 sm:h-20 sm:w-20"
        style={{
          borderColor: '#d1fae5',
          background: cat.image
            ? '#ffffff'
            : 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
        }}
      >
        {!cat.image ? (
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 motion-safe:group-hover:opacity-100"
            style={{
              background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 100%)`,
            }}
            aria-hidden
          />
        ) : null}
        <CategoryIconVisual cat={cat} accent={accent} />
      </div>
      <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-gray-700 sm:text-[11px]">
        {cat.label}
      </span>
    </Link>
  );
}

/**
 * Pharmacy category rail — single-row auto-scroll marquee on all breakpoints
 * (same StoreMarqueeRow pattern as gym/fitness membership rows).
 */
export function PharmacyCategoryIcons({ categoryIcons = [], accent = '#16a34a' }) {
  if (!categoryIcons.length) return null;

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

        <StoreMarqueeRow
          items={categoryIcons}
          fadeFrom="white"
          durationSec={35}
          slideClassName="w-[5rem] sm:w-[5.5rem]"
          gapClassName="gap-3 pr-3 sm:gap-4 sm:pr-4"
          renderItem={(cat) => <CategoryTile cat={cat} accent={accent} />}
        />
      </div>
    </section>
  );
}
