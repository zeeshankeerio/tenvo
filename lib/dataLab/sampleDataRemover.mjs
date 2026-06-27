/**
 * Remove opt-in sample data from a tenant business (Settings → Remove demo data).
 */
import { createPool, withTransaction } from './pool.mjs';
import { SAMPLE_WAREHOUSE_CODES, sampleNote } from './sampleDataConstants.js';

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string | null} batchId
 */
async function deleteSampleOperationalData(tx, businessId, batchId) {
  const noteLike = batchId ? `%${sampleNote(batchId)}%` : '%__tenvo_sample:%';

  await tx.query(
    `DELETE FROM invoice_payments WHERE invoice_id IN (
       SELECT id FROM invoices WHERE business_id = $1::uuid AND notes LIKE $2
     )`,
    [businessId, noteLike]
  );
  await tx.query(
    `DELETE FROM invoice_items WHERE business_id = $1::uuid AND invoice_id IN (
       SELECT id FROM invoices WHERE business_id = $1::uuid AND notes LIKE $2
     )`,
    [businessId, noteLike]
  );
  await tx.query(`DELETE FROM invoices WHERE business_id = $1::uuid AND notes LIKE $2`, [businessId, noteLike]);

  await tx.query(
    `DELETE FROM pos_payments WHERE business_id = $1::uuid AND transaction_id IN (
       SELECT id FROM pos_transactions WHERE business_id = $1::uuid AND transaction_number LIKE 'POS-%'
     )`,
    [businessId]
  );
  await tx.query(`DELETE FROM pos_transaction_items WHERE business_id = $1::uuid`);
  await tx.query(
    `DELETE FROM pos_transactions WHERE business_id = $1::uuid AND transaction_number LIKE 'POS-%'`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM storefront_order_items WHERE order_id IN (
       SELECT id FROM storefront_orders WHERE business_id = $1::uuid
         AND (metadata->>'source' = 'business-sample-data' OR metadata->>'source' = 'data-lab-seed')
     )`
  );
  await tx.query(
    `DELETE FROM storefront_orders WHERE business_id = $1::uuid
       AND (metadata->>'source' = 'business-sample-data' OR metadata->>'source' = 'data-lab-seed')`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM purchase_items WHERE business_id = $1::uuid AND purchase_id IN (
       SELECT id FROM purchases WHERE business_id = $1::uuid AND notes LIKE $2
     )`,
    [businessId, noteLike]
  );
  await tx.query(`DELETE FROM purchases WHERE business_id = $1::uuid AND notes LIKE $2`, [businessId, noteLike]);

  await tx.query(`DELETE FROM inventory_reservations WHERE business_id = $1::uuid`, [businessId]);
  await tx.query(`DELETE FROM quotation_items WHERE business_id = $1::uuid`);
  await tx.query(`DELETE FROM quotations WHERE business_id = $1::uuid`);
  await tx.query(`DELETE FROM stock_transfers WHERE business_id = $1::uuid`, [businessId]);
  await tx.query(`DELETE FROM stock_movements WHERE business_id = $1::uuid`, [businessId]);

  await tx.query(
    `DELETE FROM product_batches WHERE business_id = $1::uuid AND product_id IN (
       SELECT id FROM products WHERE business_id = $1::uuid
         AND domain_data->>'sample_source' = 'business-sample-data'
     )`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM product_stock_locations WHERE business_id = $1::uuid AND warehouse_id IN (
       SELECT id FROM warehouse_locations WHERE business_id = $1::uuid AND code = ANY($2::text[])
     )`,
    [businessId, [...SAMPLE_WAREHOUSE_CODES]]
  );

  await tx.query(`DELETE FROM payroll_items WHERE business_id = $1::uuid`);
  await tx.query(`DELETE FROM payroll_runs WHERE business_id = $1::uuid`);
  await tx.query(
    `DELETE FROM payroll_employees WHERE business_id = $1::uuid AND (
       employee_code LIKE 'EMP-%' OR employee_code LIKE 'SG-%' OR employee_code LIKE 'AE-%'
     )`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM gl_entries WHERE business_id = $1::uuid AND journal_id IN (
       SELECT id FROM journal_entries WHERE business_id = $1::uuid
         AND (description ILIKE '%data-lab%' OR description ILIKE '%demo%')
     )`,
    [businessId]
  );
  await tx.query(
    `DELETE FROM journal_entries WHERE business_id = $1::uuid
       AND (description ILIKE '%data-lab%' OR description ILIKE '%demo%')`,
    [businessId]
  );
  await tx.query(
    `DELETE FROM expenses WHERE business_id = $1::uuid AND description ILIKE '%data-lab%'`,
    [businessId]
  );

  try {
    await tx.query(`DELETE FROM low_stock_alerts WHERE business_id = $1::uuid`, [businessId]);
    await tx.query(`DELETE FROM reorder_points WHERE business_id = $1::uuid`, [businessId]);
  } catch {
    /* optional tables */
  }

  await tx.query(
    `UPDATE products SET is_deleted = true, is_active = false, deleted_at = NOW()
     WHERE business_id = $1::uuid AND domain_data->>'sample_source' = 'business-sample-data'`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM customers WHERE business_id = $1::uuid AND (
       domain_data->>'sample_source' = 'business-sample-data'
       OR LOWER(COALESCE(email, '')) LIKE '%@example.com'
     )`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM vendors WHERE business_id = $1::uuid AND (
       domain_data->>'sample_source' = 'business-sample-data'
       OR LOWER(name) IN ('national suppliers co.', 'prime fabrics ltd.')
     )`,
    [businessId]
  );

  await tx.query(
    `DELETE FROM warehouse_locations WHERE business_id = $1::uuid AND code = ANY($2::text[])`,
    [businessId, [...SAMPLE_WAREHOUSE_CODES]]
  );
}

/**
 * @param {{ businessId: string, batchId?: string | null }} params
 */
export async function removeBusinessSampleData({ businessId, batchId = null }) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await withTransaction(client, async (tx) => {
      await deleteSampleOperationalData(tx, businessId, batchId);
    });
    return { removed: true };
  } finally {
    client.release();
    await pool.end();
  }
}
