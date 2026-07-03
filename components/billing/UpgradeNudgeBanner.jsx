'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Sparkles, X } from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import { buildUpgradeNudge } from '@/lib/utils/upgradeNudge';

const SESSION_KEY = 'tenvo:upgrade-nudge-shown';
const AUTO_HIDE_MS = 5000;

/**
 * Compact, professional upgrade nudge shown once per login session at the
 * bottom of the dashboard shell. Auto-dismisses after 5s. Trial users see a
 * trial-expiry prompt; paid (non-enterprise) users see a domain-aware upsell
 * only when a genuinely higher-tier module is relevant. Platform owners and
 * enterprise plans never see it.
 */
export function UpgradeNudgeBanner() {
  const {
    business,
    isLoading,
    isPlatformOwner,
    rawPlanTier,
    isOnTrial,
    trialDaysRemaining,
  } = useBusiness();
  const pathname = usePathname();
  const pathParts = pathname?.split('/') || [];
  const businessSlug = pathParts[2] || business?.domain || '';

  const [visible, setVisible] = useState(false);

  const category = business?.category;
  const domainKnowledge = useMemo(
    () => (category ? getDomainKnowledgeForBusiness(category, business) : null),
    [category, business]
  );

  const nudge = useMemo(() => {
    if (isLoading || !business?.id) return null;
    return buildUpgradeNudge({
      isPlatformOwner,
      rawPlanTier,
      isOnTrial,
      trialDaysRemaining,
      category,
      domainKnowledge,
    });
  }, [
    isLoading,
    business?.id,
    isPlatformOwner,
    rawPlanTier,
    isOnTrial,
    trialDaysRemaining,
    category,
    domainKnowledge,
  ]);

  useEffect(() => {
    if (!nudge) return;
    if (typeof window === 'undefined') return;

    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* sessionStorage unavailable — still show once for this mount */
    }

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [nudge]);

  if (!nudge) return null;

  const settingsHref = businessSlug
    ? `/business/${businessSlug}?tab=settings&section=billing`
    : '/pricing';

  const isTrial = nudge.tone === 'trial';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-3 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-gray-200/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                isTrial ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-primary'
              }`}
            >
              {isTrial ? <Crown className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-gray-900">{nudge.title}</p>
              <p className="line-clamp-2 text-[11px] leading-snug text-gray-500">{nudge.message}</p>
            </div>

            <Link
              href={settingsHref}
              onClick={() => setVisible(false)}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-colors ${
                isTrial
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-brand-primary hover:bg-brand-primary-dark'
              }`}
            >
              {nudge.ctaLabel}
            </Link>

            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Dismiss"
              className="flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UpgradeNudgeBanner;
