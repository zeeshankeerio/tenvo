import { MEMBERSHIP_STATUS } from '@/lib/memberships/membershipConstants';

/** Row shape returned by listMemberships / getCustomerMembershipsAction (subset used in hub UI). */
export interface CustomerMembershipChip {
  id?: string;
  customer_id: string;
  plan_id?: string;
  status: string;
  plan_name?: string | null;
  billing_interval?: string | null;
  vertical_key?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
}

export type CustomerMembershipMap = Record<string, CustomerMembershipChip>;

export function isActiveMembershipStatus(status: string | null | undefined): boolean {
  return status === MEMBERSHIP_STATUS.ACTIVE || status === MEMBERSHIP_STATUS.TRIAL;
}

export function countActiveMembersInList(
  customerIds: string[],
  byCustomerId: CustomerMembershipMap
): number {
  return customerIds.filter((id) => {
    const row = byCustomerId[id];
    return row && isActiveMembershipStatus(row.status);
  }).length;
}

export function countPendingMembersInList(
  customerIds: string[],
  byCustomerId: CustomerMembershipMap
): number {
  return customerIds.filter((id) => byCustomerId[id]?.status === MEMBERSHIP_STATUS.PENDING).length;
}
