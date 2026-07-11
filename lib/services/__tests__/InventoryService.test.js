import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    connect: vi.fn(),
  },
  /** ProcurementAgent.evaluateAndAct uses Prisma `db` after stock_out. */
  db: {
    products: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/validation/schemas', () => ({
  addStockSchema: { parse: vi.fn((p) => p) },
  removeStockSchema: { parse: vi.fn((p) => p) },
  removeVariantStockSchema: { parse: vi.fn((p) => p) },
  transferStockSchema: { parse: vi.fn((p) => p) },
  reserveStockSchema: { parse: vi.fn((p) => p) },
  releaseStockSchema: { parse: vi.fn((p) => p) },
  adjustStockSchema: { parse: vi.fn((p) => p) },
}));

vi.mock('@/lib/actions/basic/accounting', () => ({
  getGLAccountsByTypes: vi.fn(),
}));

vi.mock('../AccountingService', () => ({
  AccountingService: {
    recordBusinessTransaction: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../integrations/integrationEngine', () => ({
  IntegrationEngine: {
    syncAll: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../ai/forecasting', () => ({
  AIOrderForecaster: {},
}));

vi.mock('../workflows/workflowEngine', () => ({
  WorkflowEngine: {
    evaluateTriggers: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/validation/domainSchemas', () => ({
  validateDomainData: vi.fn(() => ({ success: true, data: {} })),
}));

vi.mock('@/lib/storefront/invalidateStorefrontCatalog', () => ({
  invalidateStorefrontCatalog: vi.fn(),
}));

vi.mock('../VariantService', () => ({
  VariantService: {
    syncParentStockFromVariants: vi.fn().mockResolvedValue(8),
  },
}));

import pool from '@/lib/db';
import { AccountingService } from '../AccountingService';
import { VariantService } from '../VariantService';
import { InventoryService } from '../InventoryService';

describe('InventoryService regressions', () => {
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  it('reserveStock should reject when requested quantity exceeds available (stock - active reservations)', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ stock: 5 }] })
      .mockResolvedValueOnce({ rows: [{ reserved_qty: 4 }] })
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      InventoryService.reserveStock({
        business_id: 'biz-1',
        product_id: 'prod-1',
        quantity: 3,
        reference: 'quotation:q-1',
      })
    ).rejects.toThrow('Insufficient available stock');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('removeStock should support non-batch products via fallback allocation using product cost', async () => {
    mockClient.query.mockImplementation((query) => {
      if (query === 'BEGIN') return Promise.resolve({ rows: [] });
      if (query.includes('SELECT stock, cost_price, unit, unit_conversions, name, reorder_point, min_stock FROM products')) {
        return Promise.resolve({
          rows: [{
            stock: 10,
            cost_price: 2,
            unit: 'pcs',
            unit_conversions: null,
            name: 'Generic Product',
            reorder_point: 1,
            min_stock: 1,
          }],
        });
      }
      if (query.includes('SELECT id, quantity, cost_price') && query.includes('FROM product_batches')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('FROM product_stock_locations') && query.includes('SUM')) {
        return Promise.resolve({ rows: [{ total_stock: 7 }] });
      }
      if (query.includes('UPDATE products SET stock = $1 WHERE id = $2 AND business_id = $3')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('INSERT INTO stock_movements')) {
        return Promise.resolve({ rows: [{ id: 'move-1' }] });
      }
      if (query === 'COMMIT') return Promise.resolve({ rows: [] });
      if (query === 'ROLLBACK') return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const result = await InventoryService.removeStock({
      business_id: 'biz-1',
      product_id: 'prod-1',
      quantity: 3,
      reference_type: 'invoice',
      reference_id: 'inv-1',
      notes: 'test non-batch removal',
      serial_numbers: [],
    }, 'user-1');

    expect(result.success).toBe(true);
    expect(result.newStock).toBe(7);
    expect(result.costOfGoodsSold).toBe(6);
    expect(result.allocations).toEqual([
      {
        batch_id: null,
        quantity: 3,
        unit_cost: 2,
      },
    ]);
    expect(AccountingService.recordBusinessTransaction).toHaveBeenCalledWith(
      'sale_cogs',
      expect.objectContaining({
        businessId: 'biz-1',
        costAmount: 6,
      }),
      expect.any(Object)
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('removeStock with fifo_sellable_locations decrements locations and skips accounting when requested', async () => {
    const txClient = { query: vi.fn() };
    txClient.query.mockImplementation((query) => {
      if (query.includes('SELECT stock, cost_price, unit, unit_conversions, name, reorder_point, min_stock FROM products')) {
        return Promise.resolve({
          rows: [{
            stock: 10,
            cost_price: 5,
            unit: 'pcs',
            unit_conversions: null,
            name: 'FIFO Product',
            reorder_point: 1,
            min_stock: 1,
          }],
        });
      }
      if (query.includes('COALESCE(SUM(quantity), 0)::float AS location_qty') && query.includes('location_count')) {
        return Promise.resolve({ rows: [{ location_qty: 12, location_count: 1 }] });
      }
      if (query.includes('SELECT id, quantity::float AS quantity') && query.includes('product_stock_locations')) {
        return Promise.resolve({ rows: [{ id: 'loc-1', quantity: 12 }] });
      }
      if (query.includes('FROM product_batches')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('INSERT INTO stock_movements')) {
        return Promise.resolve({ rows: [{ id: 'move-fifo' }] });
      }
      if (query.includes('FROM product_stock_locations') && query.includes('total_stock')) {
        return Promise.resolve({ rows: [{ total_stock: 9 }] });
      }
      if (query.includes('UPDATE products SET stock = $1')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('UPDATE products SET sales_count')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await InventoryService.removeStock({
      business_id: 'biz-1',
      product_id: 'prod-1',
      quantity: 3,
      reference_type: 'storefront_order',
      fifo_sellable_locations: true,
      skip_accounting: true,
    }, null, txClient);

    expect(result.success).toBe(true);
    expect(result.newStock).toBe(9);
    expect(AccountingService.recordBusinessTransaction).not.toHaveBeenCalled();
    expect(txClient.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE product_stock_locations'),
      expect.any(Array)
    );
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('removeStock fifo rejects when requested qty exceeds location sum despite higher headline', async () => {
    const txClient = { query: vi.fn() };
    txClient.query.mockImplementation((query) => {
      if (query.includes('SELECT stock, cost_price, unit, unit_conversions, name, reorder_point, min_stock FROM products')) {
        return Promise.resolve({
          rows: [{
            stock: 100,
            cost_price: 5,
            unit: 'pcs',
            unit_conversions: null,
            name: 'Stale Headline',
            reorder_point: 1,
            min_stock: 1,
          }],
        });
      }
      if (query.includes('COALESCE(SUM(quantity), 0)::float AS location_qty') && query.includes('location_count')) {
        return Promise.resolve({ rows: [{ location_qty: 10, location_count: 2 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      InventoryService.removeStock({
        business_id: 'biz-1',
        product_id: 'prod-1',
        quantity: 50,
        reference_type: 'storefront_order',
        fifo_sellable_locations: true,
        skip_accounting: true,
      }, null, txClient)
    ).rejects.toThrow('Insufficient stock');
  });

  it('removeVariantStock decrements variant stock and records movement inside parent tx', async () => {
    const txClient = { query: vi.fn() };
    txClient.query.mockImplementation((query) => {
      if (query.includes('FROM product_variants') && query.includes('FOR UPDATE')) {
        return Promise.resolve({ rows: [{ id: 'var-1', stock: 6, cost_price: 4 }] });
      }
      if (query.includes('UPDATE product_variants')) {
        return Promise.resolve({ rows: [] });
      }
      if (query.includes('FROM warehouse_locations')) {
        return Promise.resolve({ rows: [{ id: 'wh-1' }] });
      }
      if (query.includes('INSERT INTO stock_movements')) {
        return Promise.resolve({ rows: [{ id: 'move-var' }] });
      }
      if (query.includes('UPDATE products SET sales_count')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await InventoryService.removeVariantStock({
      business_id: 'biz-1',
      product_id: 'prod-1',
      variant_id: 'var-1',
      quantity: 2,
      reference_type: 'storefront_order',
      notes: 'Storefront sale - Order ORD-1',
    }, null, txClient);

    expect(result.success).toBe(true);
    expect(result.movementId).toBe('move-var');
    expect(VariantService.syncParentStockFromVariants).toHaveBeenCalledWith('prod-1', 'biz-1', txClient);
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
