/**
 * useDashboardMetrics Hook
 *
 * Fetches dashboard KPIs and optional revenue chart series via `/api/v1/dashboard`
 * (avoids legacy `/api/dashboard/*` routes that were never implemented, 404s).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '@/lib/context/BusinessContext';
import { DataFetchingService } from '@/lib/services/dataFetching';
import { ErrorHandlingService } from '@/lib/services/errorHandling';

const CACHE_TTL_MS = 5 * 60 * 1000;

function timeRangeToDays(range) {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  if (range === '1y') return 365;
  return 30;
}

/**
 * Maps `/api/v1/dashboard` KPI payload to the legacy shape used by SimpleDashboardExample / widgets.
 * @param {Record<string, unknown>|null} kpiJson
 */
function mapKpisToLegacyMetrics(kpiJson) {
  if (!kpiJson || kpiJson.success === false) return null;

  const total = Number(kpiJson.revenue?.total ?? 0);
  const netMargin = Number(kpiJson.profitability?.netMargin ?? 0);

  return {
    revenue: `₨${total.toLocaleString('en-PK', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`,
    growth: {
      value: `${netMargin >= 0 ? '+' : ''}${netMargin.toFixed(1)}%`,
      trend: netMargin >= 0 ? 'up' : 'down',
    },
    orders: {
      total: Number(kpiJson.revenue?.invoiceCount ?? 0),
      paid: Number(kpiJson.revenue?.invoiceCount ?? 0),
      pending: 0,
    },
    products: {
      count: Number(kpiJson.inventory?.activeProducts ?? 0),
      growth: 0,
    },
    customers: {
      active: Number(kpiJson.entities?.activeCustomers ?? 0),
      growth: 0,
    },
    _kpis: kpiJson,
  };
}

/**
 * @param {Record<string, unknown>|null} trendJson
 * @returns {Array<{ date: string, revenue: number, expenses: number }>}
 */
function trendToChartData(trendJson) {
  if (!trendJson || trendJson.success === false) return [];
  const rows = Array.isArray(trendJson.trend) ? trendJson.trend : [];
  return rows.map((row) => ({
    date: String(row.period ?? ''),
    revenue: Number(row.revenue) || 0,
    expenses: 0,
  }));
}

export function useDashboardMetrics(options = {}) {
  const {
    autoFetch = true,
    timeRange = '30d',
    includeChartData = false,
  } = options;

  const { business } = useBusiness();
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    if (!business?.id) {
      setError(new Error('No business context available'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bid = encodeURIComponent(business.id);

      const kpisJson = await DataFetchingService.fetchWithCache(
        `/api/v1/dashboard?businessId=${bid}&section=kpis&period=month`,
        { ttl: CACHE_TTL_MS }
      );

      if (!kpisJson || kpisJson.success === false) {
        throw new Error(kpisJson?.error || 'Failed to fetch dashboard metrics');
      }

      setMetrics(mapKpisToLegacyMetrics(kpisJson));

      if (includeChartData) {
        const days = timeRangeToDays(timeRange);
        const trendJson = await DataFetchingService.fetchWithCache(
          `/api/v1/dashboard?businessId=${bid}&section=trend&days=${days}&groupBy=day`,
          { ttl: CACHE_TTL_MS }
        );
        setChartData(trendToChartData(trendJson));
      } else {
        setChartData([]);
      }
    } catch (err) {
      const handledError = ErrorHandlingService.handleError(err, {
        context: 'useDashboardMetrics',
        businessId: business.id,
      });
      setError(handledError);
    } finally {
      setLoading(false);
    }
  }, [business?.id, timeRange, includeChartData]);

  useEffect(() => {
    if (autoFetch && business?.id) {
      fetchMetrics();
    }
  }, [autoFetch, business?.id, fetchMetrics]);

  const refetch = useCallback(async () => {
    try {
      await ErrorHandlingService.retryWithBackoff(fetchMetrics, {
        maxRetries: 3,
        initialDelay: 1000,
      });
    } catch (err) {
      console.error('Failed to refetch metrics after retries:', err);
    }
  }, [fetchMetrics]);

  return {
    metrics,
    chartData,
    loading,
    error,
    refetch,
  };
}
