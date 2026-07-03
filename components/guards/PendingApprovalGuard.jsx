'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useBusiness } from '@/lib/context/BusinessContext';

const BLOCKED_APPROVAL_STATUSES = new Set([
  'pending_approval',
  'info_requested',
  'rejected',
]);

/**
 * Redirect non-platform users to /pending-approval when registration is not approved.
 */
export function PendingApprovalGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { business, isLoading, isPlatformOwner, isPlatformAdmin } = useBusiness();

  useEffect(() => {
    if (isLoading) return;
    if (isPlatformOwner || isPlatformAdmin) return;
    if (!business?.approval_status) return;

    const status = String(business.approval_status);
    if (!BLOCKED_APPROVAL_STATUSES.has(status)) return;
    if (pathname?.startsWith('/pending-approval')) return;

    router.replace('/pending-approval');
  }, [
    business?.approval_status,
    isLoading,
    isPlatformAdmin,
    isPlatformOwner,
    pathname,
    router,
  ]);

  return children;
}

export default PendingApprovalGuard;
