'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';

const BLOCKED_APPROVAL_STATUSES = new Set([
  'pending_approval',
  'info_requested',
  'rejected',
]);

function ApprovalGateLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center animate-in fade-in duration-200">
      <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      <span className="ml-2 text-xs font-medium text-gray-400">Loading workspace...</span>
    </div>
  );
}

/**
 * Block hub content and redirect non-platform users to /pending-approval
 * when registration is not approved.
 */
export function PendingApprovalGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { business, isLoading, isPlatformOwner, isPlatformAdmin } = useBusiness();

  const isBlocked =
    !isLoading &&
    !isPlatformOwner &&
    !isPlatformAdmin &&
    business?.approval_status &&
    BLOCKED_APPROVAL_STATUSES.has(String(business.approval_status)) &&
    !pathname?.startsWith('/pending-approval');

  useEffect(() => {
    if (!isBlocked) return;
    router.replace('/pending-approval');
  }, [isBlocked, router]);

  if (isLoading) {
    return <ApprovalGateLoader />;
  }

  if (isBlocked) {
    return <ApprovalGateLoader />;
  }

  return children;
}

export default PendingApprovalGuard;
