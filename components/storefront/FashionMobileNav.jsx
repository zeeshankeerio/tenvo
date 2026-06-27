'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X, ChevronRight, Shirt, Sparkles, Package, Gift, Star, Tag, Droplet,
  Phone, Mail, MapPin, Briefcase, MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartProductImage } from '@/components/storefront/SmartProductImage';
import { getFashionEditorialNav } from '@/lib/storefront/fashionEditorial';

const ICONS = {
  shirt: Shirt,
  sparkles: Sparkles,
  package: Package,
  gift: Gift,
  star: Star,
  tag: Tag,
  droplet: Droplet,
};

/**
 * Zellbury-style glassmorphism mobile navigation drawer.
 */
export function FashionMobileNav({
  isOpen,
  onClose,
  businessDomain,
  business,
  categories,
  contact,
  canonical,
}) {
  const base = `/store/${businessDomain}`;
  const nav = getFashionEditorialNav(base, canonical || business?.category, categories);
  const [activeTab, setActiveTab] = useState(nav.tabs[0]?.id);
  const activeCategories = nav.tabs.find((t) => t.id === activeTab)?.categories || nav.tabs[0]?.categories || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />

      <div className="absolute inset-y-0 left-0 flex w-[min(100vw,400px)] flex-col bg-stone-900/88 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-end px-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {nav.promos?.length > 0 && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {nav.promos.map((promo) => (
              <Link
                key={promo.href}
                href={promo.href}
                onClick={onClose}
                className="group relative aspect-[4/3] overflow-hidden rounded-sm"
              >
                <SmartProductImage src={promo.image} alt="" fill className="object-cover transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide">{promo.title}</p>
                  {promo.subtitle ? (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-white/75">{promo.subtitle}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}

        {nav.tabs.length > 1 && (
          <div className="flex border-b border-white/10 px-4">
            {nav.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-3 text-sm font-semibold transition',
                  activeTab === tab.id
                    ? 'border-b-2 border-white text-white'
                    : 'text-white/45 hover:text-white/70'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {activeCategories.map((cat) => {
            const Icon = ICONS[cat.icon] || Shirt;
            return (
              <Link
                key={cat.id}
                href={cat.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-sm px-3 py-3.5 transition hover:bg-white/8"
              >
                <Icon className="h-5 w-5 shrink-0 text-white/70" strokeWidth={1.5} />
                <span className="flex-1 text-sm font-medium">{cat.label}</span>
                <ChevronRight className="h-4 w-4 text-white/35" />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Customer Care</span>
            <div className="flex items-center gap-2">
              {contact?.whatsappUrl ? (
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              ) : null}
              {contact?.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Phone"
                >
                  <Phone className="h-4 w-4" />
                </a>
              ) : null}
              {contact?.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Email"
                >
                  <Mail className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`${base}/contact`}
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 rounded-sm bg-white/10 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wide transition hover:bg-white/15"
            >
              <MapPin className="h-4 w-4" />
              Stores
            </Link>
            <Link
              href={`${base}/orders`}
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 rounded-sm bg-white/10 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wide transition hover:bg-white/15"
            >
              <Briefcase className="h-4 w-4" />
              Tracking
            </Link>
            <Link
              href={`${base}/faqs`}
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 rounded-sm bg-white/10 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wide transition hover:bg-white/15"
            >
              <Mail className="h-4 w-4" />
              Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
