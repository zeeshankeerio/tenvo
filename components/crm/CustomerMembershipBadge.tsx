'use client';

import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MEMBERSHIP_STATUS } from '@/lib/memberships/membershipConstants';
import type { CustomerMembershipChip } from '@/lib/memberships/membershipTypes';

const STATUS_LABEL: Record<string, string> = {
  [MEMBERSHIP_STATUS.ACTIVE]: 'Active member',
  [MEMBERSHIP_STATUS.PENDING]: 'Pending',
  [MEMBERSHIP_STATUS.PAUSED]: 'Paused',
  [MEMBERSHIP_STATUS.TRIAL]: 'Trial',
  [MEMBERSHIP_STATUS.EXPIRED]: 'Expired',
  [MEMBERSHIP_STATUS.CANCELLED]: 'Cancelled',
};

interface CustomerMembershipBadgeProps {
  membership?: Pick<CustomerMembershipChip, 'status' | 'plan_name'> | null;
  className?: string;
  onClick?: () => void;
}

export function CustomerMembershipBadge({
  membership,
  className,
  onClick,
}: CustomerMembershipBadgeProps) {
  if (!membership?.status) return null;

  const status = membership.status;
  const isActive = status === MEMBERSHIP_STATUS.ACTIVE || status === MEMBERSHIP_STATUS.TRIAL;
  const label = membership.plan_name
    ? `${membership.plan_name}`
    : STATUS_LABEL[status] || status;

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        isActive ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-600',
        onClick && 'hover:bg-violet-200 transition-colors',
        className
      )}
      title={STATUS_LABEL[status] || status}
    >
      <BadgeCheck className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[140px]">{label}</span>
    </Tag>
  );
}
