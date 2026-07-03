import { describe, it, expect } from 'vitest';
import { AIOrderForecaster } from '@/lib/services/ai/forecasting';

describe('AIOrderForecaster', () => {
  it('fallbackForecast returns WMA-based quantity from history', async () => {
    const product = { id: 'p1', name: 'Widget', stock: 5 };
    const history = [
      { date: '2026-01', quantity: 10 },
      { date: '2026-02', quantity: 20 },
      { date: '2026-03', quantity: 30 },
    ];
    const result = await AIOrderForecaster.fallbackForecast(product, history);
    expect(result.productId).toBe('p1');
    expect(result.forecastedQuantity).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.reasoning).toContain('Weighted moving average');
  });

  it('forecastDemand falls back safely when AI SDK is unavailable', async () => {
    const result = await AIOrderForecaster.forecastDemand(
      '00000000-0000-4000-8000-000000000001',
      { id: 'p2', name: 'Test', stock: 2 },
      [{ date: '2026-01', quantity: 4 }],
      { countryIso: 'AE' }
    );
    expect(result.forecastedQuantity).toBeGreaterThanOrEqual(0);
    expect(result).toHaveProperty('suggestedAction');
  });
});
