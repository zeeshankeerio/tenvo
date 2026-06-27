import { describe, it, expect } from 'vitest';
import { PakistanTaxStrategy, GCCTaxStrategy } from '@/lib/utils/taxStrategies';

const pkStandards = { taxLabel: 'GST', taxStrategy: 'GST_PST' };
const gccStandards = { taxLabel: 'VAT', taxStrategy: 'VAT' };

describe('taxStrategies', () => {
  it('Pakistan strategy applies percent tax on base', () => {
    const result = PakistanTaxStrategy.calculate(
      { amount: 1000, taxPercent: 18 },
      pkStandards
    );
    expect(result.baseAmount).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.totalAmount).toBe(1180);
  });

  it('GCC strategy bulk-aggregates VAT', () => {
    const result = GCCTaxStrategy.calculateBulk(
      [
        { amount: 100, taxPercent: 5 },
        { amount: 200, taxPercent: 5 },
      ],
      gccStandards
    );
    expect(result.baseAmount).toBe(300);
    expect(result.taxAmount).toBe(15);
    expect(result.totalAmount).toBe(315);
  });
});
