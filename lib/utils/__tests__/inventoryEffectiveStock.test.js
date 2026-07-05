import { describe, expect, test } from 'bun:test';
import { resolveInventoryEffectiveStock } from '@/lib/utils/inventoryEffectiveStock';

describe('resolveInventoryEffectiveStock', () => {
  test('sums location quantities when stock_locations exist', () => {
    const stock = resolveInventoryEffectiveStock({
      stock: 100,
      stock_locations: [{ quantity: 20 }, { quantity: 30 }],
    });
    expect(stock).toBe(50);
  });

  test('uses headline stock when no locations, batches, or variants', () => {
    expect(resolveInventoryEffectiveStock({ stock: 42 })).toBe(42);
  });

  test('prefers single meaningful batch quantity over headline', () => {
    const stock = resolveInventoryEffectiveStock({
      stock: 10,
      batches: [{ batch_number: 'B1', quantity: 25, reserved_quantity: 0 }],
    });
    expect(stock).toBe(25);
  });

  test('uses max of headline and batch sum for multiple batches', () => {
    const stock = resolveInventoryEffectiveStock({
      stock: 5,
      batches: [
        { batch_number: 'B1', quantity: 10, reserved_quantity: 0 },
        { batch_number: 'B2', quantity: 8, reserved_quantity: 0 },
      ],
    });
    expect(stock).toBe(18);
  });
});
