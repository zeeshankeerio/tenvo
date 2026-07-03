'use client';

import { useEffect } from 'react';

/**
 * One visit per browser session per day — feeds hub Operations conversion KPIs.
 */
export function StorefrontAnalyticsBeacon({ businessDomain, businessId }) {
  useEffect(() => {
    if (!businessDomain || !businessId || typeof window === 'undefined') return;

    const day = new Date().toISOString().slice(0, 10);
    const storageKey = `tenvo_sf_visit:${businessId}:${day}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      /* private browsing */
    }

    const controller = new AbortController();
    fetch(`/api/storefront/${encodeURIComponent(businessDomain)}/analytics`, {
      method: 'POST',
      signal: controller.signal,
      keepalive: true,
    })
      .then(() => {
        try {
          sessionStorage.setItem(storageKey, '1');
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* non-blocking */
      });

    return () => controller.abort();
  }, [businessDomain, businessId]);

  return null;
}
