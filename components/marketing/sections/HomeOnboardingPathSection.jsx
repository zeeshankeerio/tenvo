'use client';

import { ChevronRight } from 'lucide-react';
import MarketingSection from '@/components/marketing/layout/MarketingSection';
import { HOME_ONBOARDING_PHASES } from '@/lib/marketing/homeVisualThemes';
import {
  MARKETING_EYEBROW,
  MARKETING_LEAD,
  MARKETING_SECTION_HEADING,
} from '@/lib/utils/marketingLayout';
import { cn } from '@/lib/utils';

export default function HomeOnboardingPathSection() {
  return (
    <MarketingSection
      padding="loose"
      className="border-b border-neutral-200/80 bg-white"
    >
      <div className="mx-auto mb-10 max-w-3xl space-y-3 text-center sm:mb-14">
        <p className={MARKETING_EYEBROW}>Simple onboarding</p>
        <h2 className={MARKETING_SECTION_HEADING}>Switching is simpler than you think</h2>
        <p className={MARKETING_LEAD}>
          Each phase is designed for operational continuity: preset, import, sync, then go live with your
          team.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {HOME_ONBOARDING_PHASES.map((step, index) => (
          <div
            key={step.phase}
            className={cn(
              'relative rounded-2xl border p-5 shadow-sm sm:p-6',
              step.accent,
              'motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md'
            )}
          >
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.2em]', step.phaseColor)}>
              Phase {step.phase}
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{step.title}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{step.description}</p>
            {index < HOME_ONBOARDING_PHASES.length - 1 ? (
              <ChevronRight
                className="absolute right-[-0.65rem] top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-slate-300 lg:block"
                aria-hidden
              />
            ) : null}
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
