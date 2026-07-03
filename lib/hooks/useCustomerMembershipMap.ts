'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMembershipHubAccess } from '@/lib/hooks/useMembershipHubAccess';
import { getCustomerMembershipsAction } from '@/lib/actions/standard/memberships';
import type {
  CustomerMembershipChip,
  CustomerMembershipMap,
} from '@/lib/memberships/membershipTypes';
import { MEMBERSHIP_STATUS } from '@/lib/memberships/membershipConstants';

function mergeMembershipRow(
  map: CustomerMembershipMap,
  row: CustomerMembershipChip
): void {
  if (!row.customer_id) return;
  const existing = map[row.customer_id];
  if (!existing || row.status === MEMBERSHIP_STATUS.ACTIVE) {
    map[row.customer_id] = row;
  }
}

function rowsFromAction(
  res: Awaited<ReturnType<typeof getCustomerMembershipsAction>>
): CustomerMembershipChip[] {
  if (!res.success || !res.memberships) return [];
  return res.memberships as CustomerMembershipChip[];
}

/**
 * Loads active/pending memberships and maps by customer_id for list badges.
 */
export function useCustomerMembershipMap(businessId: string | undefined, enabled: boolean) {
  const [byCustomerId, setByCustomerId] = useState<CustomerMembershipMap>({});

  const load = useCallback(async () => {
    if (!businessId || !enabled) {
      setByCustomerId({});
      return;
    }
    try {
      const [activeRes, pendingRes] = await Promise.all([
        getCustomerMembershipsAction(businessId, { status: 'active', limit: 200 }),
        getCustomerMembershipsAction(businessId, { status: 'pending', limit: 100 }),
      ]);

      const map: CustomerMembershipMap = {};
      for (const row of [...rowsFromAction(activeRes), ...rowsFromAction(pendingRes)]) {
        mergeMembershipRow(map, row);
      }
      setByCustomerId(map);
    } catch {
      setByCustomerId({});
    }
  }, [businessId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { byCustomerId, reload: load };
}

/**
 * Membership map gated by vertical + plan feature (Customers tab, CRM lists).
 */
export function useMembershipVerticalCustomers(
  category: string | undefined,
  businessId: string | undefined
) {
  const { enabled, domainOk } = useMembershipHubAccess(category);
  const { byCustomerId, reload } = useCustomerMembershipMap(businessId, enabled);

  return useMemo(
    () => ({
      enabled,
      domainOk,
      byCustomerId,
      reload,
      getForCustomer: (customerId: string) => byCustomerId[customerId],
    }),
    [enabled, domainOk, byCustomerId, reload]
  );
}
