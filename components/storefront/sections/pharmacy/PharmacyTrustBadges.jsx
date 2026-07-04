'use client';

import {
  ShieldCheck, Truck, Clock, HeartPulse, Award, BadgeCheck, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_BADGES = [
  {
    id: 'genuine',
    icon: ShieldCheck,
    title: '100% Genuine',
    description: 'All products sourced from authorized distributors',
  },
  {
    id: 'delivery',
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Nationwide shipping with careful packaging',
  },
  {
    id: 'support',
    icon: Clock,
    title: '24/7 Support',
    description: 'Pharmacist guidance on orders and queries',
  },
  {
    id: 'licensed',
    icon: Award,
    title: 'Licensed Pharmacy',
    description: 'Registered with pharmaceutical regulatory bodies',
  },
  {
    id: 'verified',
    icon: BadgeCheck,
    title: 'Prescription Verified',
    description: 'Every Rx order reviewed by licensed pharmacists',
  },
  {
    id: 'care',
    icon: HeartPulse,
    title: 'Quality Care',
    description: 'Storage and handling per pharmaceutical standards',
  },
];

const PILLAR_ICON_BY_ID = {
  ...Object.fromEntries(DEFAULT_BADGES.map((b) => [b.id, b.icon])),
  refill: Bell,
};

/** Map serialized settings icon names → Lucide components. */
const TRUST_ICON_BY_NAME = {
  ShieldCheck,
  Truck,
  Clock,
  HeartPulse,
  Award,
  BadgeCheck,
  Verified: BadgeCheck,
  Bell,
  Package: ShieldCheck,
};

function resolveTrustIcon(badge) {
  if (typeof badge?.icon === 'function') return badge.icon;
  if (typeof badge?.icon === 'string') {
    return TRUST_ICON_BY_NAME[badge.icon] || PILLAR_ICON_BY_ID[badge.id] || ShieldCheck;
  }
  return PILLAR_ICON_BY_ID[badge?.id] || ShieldCheck;
}

function normalizeBadge(badge) {
  if (!badge || typeof badge !== 'object') return null;
  const Icon = resolveTrustIcon(badge);
  return {
    id: badge.id || badge.label || 'trust',
    icon: typeof Icon === 'function' ? Icon : ShieldCheck,
    title: badge.title || badge.label || 'Trusted care',
    description: badge.description || badge.desc || '',
  };
}

/**
 * Premium trust badges section with icon grid.
 * Builds credibility and assurance for online pharmacy shoppers.
 */
export function PharmacyTrustBadges({ badges = DEFAULT_BADGES, accent = '#16a34a' }) {
  const source = badges.length ? badges : DEFAULT_BADGES;
  const rows = source.map(normalizeBadge).filter(Boolean);
  if (!rows.length) return null;
  return (
    <section className="border-y border-emerald-100 bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Your trusted online pharmacy
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Committed to genuine products, safe dispensing, and professional care
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {rows.map((badge) => {
            const IconComponent = badge.icon;
            if (typeof IconComponent !== 'function') return null;
            return (
              <div
                key={badge.id}
                className={cn(
                  'group flex flex-col items-center rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-6 text-center',
                  'transition-all duration-300 hover:border-emerald-300 hover:shadow-lg'
                )}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${accent}15` }}
                >
                  <IconComponent className="h-7 w-7" style={{ color: accent }} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-gray-900">
                  {badge.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
