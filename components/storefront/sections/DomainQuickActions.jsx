'use client';

import Link from 'next/link';
import {
  Star, Leaf, Heart, Phone, Sparkles, Tag, Shirt, Gift, Package, Droplets,
  Filter, Award, Wrench, UtensilsCrossed, Headphones, ShoppingBag, Truck, CupSoda,
  Disc2, AlignHorizontalJustifyCenter, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  star: Star,
  leaf: Leaf,
  heart: Heart,
  phone: Phone,
  sparkles: Sparkles,
  tag: Tag,
  shirt: Shirt,
  gift: Gift,
  package: Package,
  droplet: Droplets,
  filter: Filter,
  award: Award,
  wrench: Wrench,
  utensils: UtensilsCrossed,
  headphones: Headphones,
  shopping: ShoppingBag,
  truck: Truck,
  cup: CupSoda,
  disc: Disc2,
  wiper: AlignHorizontalJustifyCenter,
  shield: Shield,
};

/**
 * @param {{ actions: Array<{ id: string; label: string; href: string; icon: string; description?: string }>; accent: string; accentLight: string }} props
 */
export function DomainQuickActions({ actions = [], accent, accentLight }) {
  if (!actions.length) return null;

  return (
    <section className="border-b bg-white">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {actions.slice(0, 4).map((action) => {
            const Icon = ICONS[action.icon] || ShoppingBag;
            return (
              <Link
                key={action.id}
                href={action.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 sm:p-4',
                  'transition-all hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5'
                )}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                  style={{ backgroundColor: accentLight }}
                >
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{action.label}</p>
                  {action.description ? (
                    <p className="truncate text-[11px] text-slate-500 mt-0.5">{action.description}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
