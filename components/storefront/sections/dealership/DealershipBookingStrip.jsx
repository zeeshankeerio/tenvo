'use client';

import Link from 'next/link';
import {
  Car, MapPin, Gauge, Percent, Shield, Wrench, Calendar, ArrowRight, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  car: Car,
  map: MapPin,
  gauge: Gauge,
  percent: Percent,
  shield: Shield,
  wrench: Wrench,
  calendar: Calendar,
};

/**
 * Quick booking strip for dealership homepages (test drive, visit, finance, etc.).
 */
export function DealershipBookingStrip({
  items = [],
  accent = '#111827',
  contactHref,
  meetingUrl,
  className,
}) {
  if (!items.length) return null;

  return (
    <section className={cn('border-b border-neutral-100 bg-neutral-50 py-6 sm:py-8', className)} id="book">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
            Book a meeting
          </h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-neutral-500">
            Test drives, showroom visits, finance, and specialist consultations
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
            {meetingUrl ? (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide transition hover:border-neutral-900 sm:text-sm"
                style={{ color: accent }}
              >
                Schedule online
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
            {contactHref ? (
              <Link
                href={contactHref}
                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide sm:text-sm"
                style={{ color: accent }}
              >
                Contact us <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pb-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon] || Calendar;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex w-[148px] shrink-0 flex-col rounded-xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-900 hover:shadow-md sm:w-[160px]"
              >
                <span
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold leading-snug text-neutral-900">{item.label}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500 group-hover:text-neutral-900">
                  Book <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
