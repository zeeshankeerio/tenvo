'use client';

import MarketingSection from '@/components/marketing/layout/MarketingSection';
import { CAPABILITY_STATUS_STYLE } from '@/lib/marketing/capabilities';
import { HOME_SECURITY_CLUSTERS } from '@/lib/marketing/homeVisualThemes';
import { MARKETING_EYEBROW, MARKETING_H3 } from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

export default function HomeSecurityTrustSection() {
  return (
    <MarketingSection
      padding="default"
      className="border-b border-neutral-200/80 bg-gradient-to-b from-slate-50 to-white"
    >
      <div className="mb-10 space-y-3 text-center sm:mb-12">
        <p className={MARKETING_EYEBROW}>Enterprise-grade security</p>
        <h2 className={MARKETING_H3}>Built for operators who cannot afford downtime or data drift</h2>
        <p className="mx-auto max-w-2xl text-sm font-medium text-slate-600">
          Honest status on what ships today versus what is on the roadmap. No vanity certification badges.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {HOME_SECURITY_CLUSTERS.map((cluster) => (
          <div
            key={cluster.id}
            className={cn('rounded-2xl border p-5 sm:p-6', cluster.accent)}
          >
            <h3 className="text-base font-semibold text-slate-900">{cluster.title}</h3>
            <ul className="mt-4 space-y-3">
              {cluster.items.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs font-medium text-slate-500">{item.desc}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                      CAPABILITY_STATUS_STYLE[item.status]
                    )}
                  >
                    {item.status === 'shipped' ? 'Available' : item.status === 'partial' ? 'Partial' : 'Roadmap'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
