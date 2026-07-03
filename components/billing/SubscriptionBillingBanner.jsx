'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBusiness } from '@/lib/context/BusinessContext';

/**
 * Billing / subscription health banner for the business dashboard shell.
 */
export function SubscriptionBillingBanner() {
  const { business } = useBusiness();
  const pathname = usePathname();
  const pathParts = pathname?.split('/') || [];
  const businessSlug = pathParts[2] || business?.domain || '';

  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business?.id) {
        setBanner(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/billing/subscription?business_id=${encodeURIComponent(business.id)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const sub = data.subscription;
        const attention =
          sub?.needsBillingAttention === true ||
          (sub?.needsBillingAttention == null &&
            ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'cancellation_scheduled'].includes(
              sub?.status || ''
            ));

        if (attention) {
          setBanner({
            tone: 'warning',
            label:
              sub?.status === 'cancellation_scheduled'
                ? 'Your subscription is scheduled to cancel at the end of the billing period.'
                : 'There is a problem with your subscription billing. Update payment to avoid interruption.',
          });
          return;
        }

        if (data.manualPayment?.pending) {
          setBanner({
            tone: 'info',
            label:
              'Your offline payment is under review. Access upgrades after our team verifies the transaction.',
          });
          return;
        }

        if (data.manualPayment?.accessExpiresSoon && sub?.endDate) {
          const expiry = new Date(sub.endDate).toLocaleDateString();
          setBanner({
            tone: 'warning',
            label: `Your offline-billed access expires on ${expiry}. Renew from Settings → Billing to avoid downgrade.`,
          });
          return;
        }

        setBanner(null);
      } catch {
        if (!cancelled) setBanner(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [business?.id]);

  if (!banner) return null;

  const settingsHref = businessSlug
    ? `/business/${businessSlug}?tab=settings`
    : '/pricing';

  const toneClasses =
    banner.tone === 'info'
      ? 'border-sky-200 bg-sky-50 text-sky-950'
      : 'border-amber-200 bg-amber-50 text-amber-950';

  const buttonClasses =
    banner.tone === 'info'
      ? 'bg-sky-900 hover:bg-sky-800'
      : 'bg-amber-900 hover:bg-amber-800';

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm shadow-sm ${toneClasses}`}
      role="status"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">{banner.label}</p>
        <Link
          href={settingsHref}
          className={`inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold text-white transition ${buttonClasses}`}
        >
          Open billing settings
        </Link>
      </div>
    </div>
  );
}
