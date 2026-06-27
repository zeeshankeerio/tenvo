'use client';

import { Croissant, Globe, ShieldCheck, Store } from 'lucide-react';
import MarketingSection from '@/components/marketing/layout/MarketingSection';
import MarketingVisualCard from '@/components/marketing/ui/MarketingVisualCard';
import { HOME_INDUSTRY_SOLUTIONS } from '@/lib/marketing/homeVisualThemes';
import { VERTICAL_COUNT } from '@/lib/marketing/capabilities';
import {
  MARKETING_EYEBROW,
  MARKETING_LEAD,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';

const ICONS = {
  retail: Store,
  wholesale: Globe,
  bakery: Croissant,
  pharmacy: ShieldCheck,
};

export default function HomeIndustrySolutionsSection() {
  return (
    <MarketingSection
      padding="loose"
      className="border-b border-neutral-200/80 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50"
    >
      <div className="mx-auto mb-10 max-w-3xl space-y-3 text-center sm:mb-14">
        <p className={MARKETING_EYEBROW}>Industry-specific solutions</p>
        <h2 className={MARKETING_SECTION_HEADING}>Tailored templates for serious operators</h2>
        <p className={MARKETING_LEAD}>
          {VERTICAL_COUNT}+ vertical presets with catalog shells, tax defaults, and demo storefronts you
          can open today. No months of custom configuration.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {HOME_INDUSTRY_SOLUTIONS.map((item) => (
          <MarketingVisualCard
            key={item.id}
            image={item.heroImage}
            title={item.title}
            description={item.description}
            bullets={item.bullets}
            icon={ICONS[item.id]}
            iconClassName={item.accent.icon}
            checkClassName={item.accent.check}
            demoHref={item.href}
            demoLabel={item.demoLabel}
          />
        ))}
      </div>
    </MarketingSection>
  );
}
