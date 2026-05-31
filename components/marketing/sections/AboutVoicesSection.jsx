'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Quote, Star } from 'lucide-react';

const FOUNDER_QUOTE =
  'I built TENVO because I saw Pakistani businesses struggling with outdated tools that don\'t understand local needs. From FBR compliance to Urdu language support, every feature solves a real problem I witnessed firsthand. Our mission is to give every business in Pakistan access to enterprise-grade operations software.';

const TESTIMONIALS = [
  {
    initials: 'MS',
    avatarClass: 'bg-brand-100 text-brand-primary',
    name: 'Muhammad Ali Sheikh',
    role: 'Director, Sheikh Medical Distribution (Lahore)',
    quote:
      'Moving from 4 different spreadsheets to TENVO saved our wholesale pharmacy hours. The Urdu UI toggle was a game-changer for our loaders, and we haven\'t had a single batch expire unnoticed since we migrated.',
  },
  {
    initials: 'AR',
    avatarClass: 'bg-purple-100 text-purple-600',
    name: 'Aisha Rehman',
    role: 'Founder, Modest Threads E-commerce (Karachi)',
    quote:
      'We used to suffer constant Shopify-Daraz inventory drifts, leading to terrible merchant penalties. TENVO\'s real-time multichannel sync solved this completely. We drag-and-dropped our product Excel files and went live in 2 days.',
  },
  {
    initials: 'FA',
    avatarClass: 'bg-blue-100 text-blue-600',
    name: 'Faisal Ahmed',
    role: 'CEO, Ahmed Textiles (Faisalabad)',
    quote:
      'The FBR integration alone saved us countless hours of manual tax calculations. Our accountant was amazed at how seamlessly TENVO handles GST reporting. Best investment for our textile business.',
  },
];

function TestimonialCard({ t }) {
  return (
    <article
      className="w-[min(100vw-2rem,340px)] shrink-0 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm"
      aria-label={`Testimonial from ${t.name}`}
    >
      <div className="flex items-center gap-0.5 text-amber-400 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5" fill="currentColor" aria-hidden />
        ))}
      </div>
      <p className="text-[13px] font-medium text-neutral-600 leading-relaxed line-clamp-5">&ldquo;{t.quote}&rdquo;</p>
      <div className="mt-4 flex items-center gap-3 border-t border-neutral-100 pt-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${t.avatarClass}`}
        >
          {t.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-sm text-neutral-900">{t.name}</p>
          <p className="truncate text-[10px] font-semibold text-neutral-400">{t.role}</p>
        </div>
      </div>
    </article>
  );
}

/**
 * Compact founder message + looping customer quotes for /about#voices
 */
export default function AboutVoicesSection() {
  return (
    <section id="voices" className="scroll-mt-24 border-b border-neutral-200/80 bg-neutral-50 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="mb-8 text-center lg:mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-primary">People &amp; proof</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
            Why we build TENVO
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-neutral-500">
            Voices from the founder and from teams who run inventory, tax, and omnichannel sales every day.
          </p>
        </div>

        {/* Founder — compact professional strip */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-7 lg:p-8">
            <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0 sm:h-32 sm:w-32">
              <Image
                src="/zeeshan_keerio.png"
                alt="Zeeshan Keerio, Founder and CEO of TENVO"
                fill
                className="rounded-2xl object-contain"
                sizes="128px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Quote className="mb-2 h-6 w-6 text-brand-primary/35" aria-hidden />
              <blockquote className="text-sm font-medium leading-relaxed text-neutral-700 sm:text-[15px]">
                &ldquo;{FOUNDER_QUOTE}&rdquo;
              </blockquote>
              <footer className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-neutral-100 pt-4">
                <cite className="not-italic">
                  <span className="font-black text-neutral-900">Zeeshan Keerio</span>
                  <span className="mx-2 text-neutral-300" aria-hidden>
                    ·
                  </span>
                  <span className="text-sm font-semibold text-brand-primary">Founder &amp; CEO, TENVO</span>
                </cite>
                <p className="w-full text-[11px] font-semibold text-neutral-400 sm:w-auto sm:pl-0">
                  AI Engineer · Former Big Data Administrator · Financial Data Analyst
                </p>
              </footer>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
            Customer stories
          </h3>
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-primary hover:underline"
          >
            Case studies <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Looping marquee — same technique as integration strip */}
        <div className="relative integration-marquee-fade -mx-4 px-0 sm:mx-0">
          <div className="flex w-max animate-marquee-partners motion-reduce:animate-none hover:[animation-play-state:paused]">
            {[0, 1].map((set) => (
              <div
                key={set}
                className="flex shrink-0 items-stretch gap-4 pr-4 sm:gap-5 sm:pr-6"
                aria-hidden={set === 1}
              >
                {TESTIMONIALS.map((t, idx) => (
                  <TestimonialCard key={`${set}-${idx}`} t={t} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
