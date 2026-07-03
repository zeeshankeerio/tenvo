'use client';

import Link from 'next/link';
import {
  Calendar, ArrowRight, ExternalLink, Dumbbell, Users, Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  calendar: Calendar,
  dumbbell: Dumbbell,
  users: Users,
  leaf: Leaf,
};

/**
 * Fitness booking strip with Calendly / contact fallbacks.
 */
export function FitnessBookingStrip({
  items = [],
  accent = '#e11d48',
  contactHref,
  meetingUrl,
  className,
}) {
  if (!items.length) return null;

  return (
    <section
      className={cn('relative border-y border-white/5 bg-black py-10 sm:py-14', className)}
      id="book"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(225,29,72,0.25) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-400">Book your slot</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Train with a coach or plan your visit
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
            Free trials, personal training, membership consults, and nutrition check-ins
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {meetingUrl ? (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:opacity-95"
                style={{ backgroundColor: accent }}
              >
                Schedule online
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
            {contactHref ? (
              <Link
                href={contactHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:text-white"
              >
                Contact us <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="fitness-mobile-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon] || Calendar;
            const useMeeting =
              meetingUrl && (item.id === 'trial' || item.id === 'membership' || item.id === 'pt');
            const href = useMeeting ? meetingUrl : item.href;
            const external = Boolean(useMeeting);
            const LinkTag = external ? 'a' : Link;
            const linkProps = external
              ? { href, target: '_blank', rel: 'noopener noreferrer' }
              : { href };
            return (
              <LinkTag
                key={item.id}
                {...linkProps}
                className="group flex w-[min(42vw,148px)] shrink-0 snap-start flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition active:scale-[0.98] active:border-rose-500/40 sm:w-[168px] lg:hover:border-rose-500/40 lg:hover:bg-white/[0.07]"
              >
                <span
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold leading-snug text-white">{item.label}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/50 group-hover:text-rose-300">
                  {external ? 'Schedule' : 'Book'}{' '}
                  {external ? (
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  ) : (
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  )}
                </span>
              </LinkTag>
            );
          })}
        </div>
      </div>
    </section>
  );
}
