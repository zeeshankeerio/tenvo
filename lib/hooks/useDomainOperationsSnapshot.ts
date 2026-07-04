'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDomainOperationsSnapshotAction } from '@/lib/actions/dashboard/domainOperationsSnapshot';

export type DomainOperationsSnapshot = Record<string, unknown>;

export function useDomainOperationsSnapshot({
  businessId,
  category,
  dateRange,
  enabled = true,
}: {
  businessId?: string | null;
  category: string;
  dateRange: { from: Date; to: Date };
  enabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<DomainOperationsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDomainOperationsSnapshotAction(businessId, {
        from: dateRange.from,
        to: dateRange.to,
        category,
      });
      if (res.success && res.data) {
        setSnapshot(res.data as DomainOperationsSnapshot);
      } else {
        setError(res.error || 'Could not load operations data');
        setSnapshot(null);
      }
    } catch {
      setError('Could not load operations data');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, category, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!enabled || !businessId) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }
    loadSnapshot();
  }, [enabled, businessId, loadSnapshot]);

  return { snapshot, loading, error, reload: loadSnapshot };
}
