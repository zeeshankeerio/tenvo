import { describe, expect, it } from 'vitest';
import {
  enrichStorefrontProductStock,
  resolveStorefrontDisplayStock,
  resolveStorefrontStockStatus,
} from '@/lib/storefront/storefrontDisplayStock';
import { getStorefrontStockState } from '@/lib/storefront/storefrontStockUi';
import { buildClothingAttributeRows, buildPartsAttributeRows } from '@/lib/storefront/productAttributeChips';

describe('storefrontDisplayStock', () => {
  it('prefers warehouse location qty when higher than headline stock', () => {
    expect(
      resolveStorefrontDisplayStock({ stock: 2, variants: [], locationQty: 12 })
    ).toBe(12);
  });

  it('uses max of headline and variant sum when variants exist', () => {
    expect(
      resolveStorefrontDisplayStock({
        stock: 1,
        variants: [{ stock: 8 }, { stock: 4 }],
        locationQty: null,
      })
    ).toBe(12);
  });

  it('returns null when stock tracking is disabled', () => {
    expect(resolveStorefrontDisplayStock({ stock: null, variants: [], locationQty: null })).toBeNull();
    expect(resolveStorefrontStockStatus(null)).toBe('in_stock');
  });

  it('enriches product payload for API consumers', () => {
    const enriched = enrichStorefrontProductStock(
      { id: '1', stock: 3 },
      { locationQty: 10, variants: [] }
    );
    expect(enriched.display_stock).toBe(10);
    expect(enriched.stock_status).toBe('in_stock');
  });
});

describe('getStorefrontStockState', () => {
  it('uses variant stock when selected', () => {
    const state = getStorefrontStockState(
      { stock: 20, stock_status: 'in_stock' },
      { stock: 0, stock_status: 'out_of_stock' }
    );
    expect(state.isOutOfStock).toBe(true);
  });

  it('prefers display_stock from enriched API', () => {
    const state = getStorefrontStockState({ display_stock: 2, stock_status: 'low_stock' });
    expect(state.isLowStock).toBe(true);
    expect(state.stock).toBe(2);
  });
});

describe('buildClothingAttributeRows', () => {
  it('includes filterValue for sourcing filters', () => {
    const rows = buildClothingAttributeRows({
      brand: 'Khaadi',
      domain_data: { sourcing: 'imported', fabrictype: 'Lawn' },
    });
    const sourcing = rows.find((r) => r.key === 'sourcing');
    expect(sourcing?.value).toBe('Imported');
    expect(sourcing?.filterValue).toBe('imported');
  });
});

describe('buildPartsAttributeRows', () => {
  it('includes fitment row for auto parts', () => {
    const rows = buildPartsAttributeRows({
      sku: 'SKU-1',
      domain_data: { vehiclemake: 'Toyota', vehiclemodel: 'Corolla', modelyear: '2018' },
    });
    const fitment = rows.find((r) => r.key === 'fitment');
    expect(fitment?.value).toBe('Toyota Corolla 2018');
  });
});
