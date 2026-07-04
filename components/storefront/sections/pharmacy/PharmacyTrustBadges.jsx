'use client';

import {
  ShieldCheck, Truck, Clock, HeartPulse, Award, Verified,
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
    icon: Verified,
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

/**
 * Premium trust badges section with icon grid.
 * Builds credibility and assurance for online pharmacy shoppers.
 */
export function PharmacyTrustBadges({ badges = DEFAULT_BADGES, accent = '#16a34a' }) {
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
          {badges.map((badge) => {
            const IconComponent = badge.icon;
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
