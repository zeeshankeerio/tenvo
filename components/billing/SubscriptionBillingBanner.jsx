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

  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business?.id) {
        setStatus(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/billing/subscription?business_id=${encodeURIComponent(business.id)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setStatus(data.subscription?.status || null);
        }
      } catch {
        if (!cancelled) setStatus(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [business?.id]);

  if (!status) return null;

  const needsAttention = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'cancellation_scheduled'].includes(
    status
  );

  if (!needsAttention) return null;

  const label =
    status === 'cancellation_scheduled'
      ? 'Your subscription is scheduled to cancel at the end of the billing period.'
      : 'There is a problem with your subscription billing. Update payment to avoid interruption.';

  const paymentsHref = businessSlug
    ? `/business/${businessSlug}/store-settings/payments`
    : '/pricing';

  return (
    <div
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
      role="status"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">{label}</p>
        <Link
          href={paymentsHref}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
        >
          Open payments and billing
        </Link>
      </div>
    </div>
  );
}
