import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { validateImportRow, generateSkuFromName, detectColumnMapping } from '@/lib/services/excelImportService';
import { exportProductsToExcel, validateRoundTrip } from '@/lib/services/excelExportService';

describe('Excel import/export round trip', () => {
  it('validates import rows and preserves batch and serial fields', () => {
    const result = validateImportRow(
      {
        Name: 'Blue Cotton Shirt',
        SKU: 'BCS-001',
        Price: '1499.5',
        Cost: '900',
        Stock: '12',
        'Min Stock': '3',
        Category: 'Apparel',
        Unit: 'PCS',
        'Batch Number': 'BATCH-24A',
        'Expiry Date': '2026-12-31',
        'Manufacturing Date': '2026-01-01',
        'Serial Number': 'SN-0001',
        'Warranty Expiry': '2027-01-01'
      }
    );

    expect(result.isValid).toBe(true);
    expect(result.cleaned).toMatchObject({
      name: 'Blue Cotton Shirt',
      sku: 'BCS-001',
      price: 1499.5,
      cost_price: 900,
      stock: 12,
      min_stock: 3,
      category: 'Apparel',
      unit: 'PCS',
      batch_number: 'BATCH-24A',
      serial_number: 'SN-0001'
    });
  });

  it('auto-detects columns from non-standard headers', () => {
    const mapping = detectColumnMapping([
      'Item Description', 'Product Code', 'Rate', 'Purchase Price', 'Qty', 'Min Qty', 'Reorder Level',
    ]);
    expect(mapping).toMatchObject({
      name: 'Item Description',
      sku: 'Product Code',
      price: 'Rate',
      cost_price: 'Purchase Price',
      stock: 'Qty',
      min_stock: 'Min Qty',
      reorder_point: 'Reorder Level',
    });

    const result = validateImportRow(
      {
        'Item Description': 'Wireless Mouse',
        'Product Code': 'WM-9',
        Rate: 'Rs 1,250.00',
        'Purchase Price': '800',
        Qty: '40',
        'Min Qty': '5',
        'Reorder Level': '8',
      },
      {},
      'retail-shop',
      mapping,
    );

    expect(result.isValid).toBe(true);
    expect(result.cleaned).toMatchObject({
      name: 'Wireless Mouse',
      sku: 'WM-9',
      price: 1250,
      cost_price: 800,
      stock: 40,
      min_stock: 5,
    });
  });

  it('generates deterministic SKUs from names', () => {
    expect(generateSkuFromName('Blue Cotton Shirt', 2)).toBe('BLUC-3');
    expect(generateSkuFromName('', 0)).toBe('AUTO-0');
  });

  it('exports a workbook with secondary sheets and passes round-trip validation', async () => {
    const exportResult = await exportProductsToExcel([
      {
        id: 'prod-1',
        sku: 'BCS-001',
        name: 'Blue Cotton Shirt',
        category: 'Apparel',
        unit: 'PCS',
        cost_price: 900,
        selling_price: 1499.5,
        stock: 12,
        min_stock: 3,
        barcode: '1234567890',
        is_active: true,
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
        product_batches: [
          {
            id: 'batch-1',
            batch_number: 'BATCH-24A',
            quantity: 12,
            reserved_quantity: 2,
            expiry_date: '2026-12-31',
            manufacturing_date: '2026-01-01',
            notes: 'Primary batch'
          }
        ],
        product_serials: [
          {
            serial_number: 'SN-0001',
            status: 'in_stock',
            warranty_expiry: '2027-01-01',
            notes: 'Box A'
          }
        ],
        product_stock_locations: [
          {
            warehouse_id: 'wh-1',
            quantity: 12,
            reserved_quantity: 2,
            state: 'active',
            location_name: 'Main Warehouse'
          }
        ]
      }
    ]);

    expect(exportResult.success).toBe(true);
    const workbook = XLSX.read(exportResult.buffer, { type: 'array' });

    expect(workbook.SheetNames).toEqual(expect.arrayContaining([
      'Products',
      'Batches',
      'Serials',
      'Stock Locations',
      '_Metadata'
    ]));

    const roundTrip = await validateRoundTrip(exportResult.buffer);
    expect(roundTrip.valid).toBe(true);
    expect(roundTrip.errors).toEqual([]);
  });
});
