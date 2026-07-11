'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { useHubReady } from '@/lib/hooks/useHubReady';

const BLOCKED_APPROVAL_STATUSES = new Set([
  'pending_approval',
  'info_requested',
  'rejected',
]);

function ApprovalGateLoader({ label = 'Resolving workspace…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center animate-in fade-in duration-200">
      <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      <span className="ml-2 text-xs font-medium text-gray-400">{label}</span>
    </div>
  );
}

/**
 * Block hub content and redirect non-platform users to /pending-approval
 * when registration is not approved.
 *
 * Progressive: do not blank the main pane while a tenant shell already exists
 * (live or optimistic). Only wait when there is no business to evaluate.
 */
export function PendingApprovalGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { business, isPlatformOwner, isPlatformAdmin } = useBusiness();
  const { workspaceBlocking, hasOptimisticShell, optimisticShell } = useHubReady();

  const approvalSource = business || (hasOptimisticShell ? optimisticShell?.business : null);

  const isBlocked =
    !workspaceBlocking &&
    !isPlatformOwner &&
    !isPlatformAdmin &&
    approvalSource?.approval_status &&
    BLOCKED_APPROVAL_STATUSES.has(String(approvalSource.approval_status)) &&
    !pathname?.startsWith('/pending-approval');

  useEffect(() => {
    if (!isBlocked) return;
    router.replace('/pending-approval');
  }, [isBlocked, router]);

  if (workspaceBlocking) {
    return <ApprovalGateLoader label="Resolving workspace…" />;
  }

  if (isBlocked) {
    return <ApprovalGateLoader label="Checking access…" />;
  }

  return children;
}

export default PendingApprovalGuard;
