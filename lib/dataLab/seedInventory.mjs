/**
 * Inventory depth for data-lab demos — warehouses, location stock, batches, transfers, reservations.
 */

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

const WAREHOUSE_PRESETS = {
  PK: [
    { name: 'Main Warehouse', code: 'WH-MAIN', type: 'warehouse', city: 'Lahore', is_primary: true },
    { name: 'Karachi Showroom', code: 'WH-KHI', type: 'showroom', city: 'Karachi', is_primary: false },
  ],
  SG: [
    { name: 'Tuas Distribution Hub', code: 'WH-TUAS', type: 'warehouse', city: 'Singapore', is_primary: true },
    { name: 'Orchard Retail Counter', code: 'WH-ORCH', type: 'showroom', city: 'Singapore', is_primary: false },
  ],
  AE: [
    { name: 'Dubai Main Warehouse', code: 'WH-DXB', type: 'warehouse', city: 'Dubai', is_primary: true },
    { name: 'Abu Dhabi Outlet', code: 'WH-AUH', type: 'showroom', city: 'Abu Dhabi', is_primary: false },
  ],
};

const BATCH_VERTICALS = new Set(['pharmacy', 'supermarket', 'auto-parts', 'grocery', 'restaurant']);

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} countryIso
 */
export async function seedWarehouses(tx, businessId, countryIso = 'PK') {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const presets = WAREHOUSE_PRESETS[iso] || WAREHOUSE_PRESETS.PK;
  const ids = [];

  for (const wh of presets) {
    const existing = await tx.query(
      `SELECT id FROM warehouse_locations WHERE business_id = $1::uuid AND code = $2 LIMIT 1`,
      [businessId, wh.code]
    );
    if (existing.rows[0]) {
      ids.push(existing.rows[0].id);
      continue;
    }
    const res = await tx.query(
      `INSERT INTO warehouse_locations (
        business_id, name, code, type, city, is_primary, is_active
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, true)
      RETURNING id`,
      [businessId, wh.name, wh.code, wh.type, wh.city, wh.is_primary]
    );
    ids.push(res.rows[0].id);
  }

  return { primaryId: ids[0], secondaryId: ids[1] || ids[0], warehouseIds: ids };
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} primaryWarehouseId
 * @param {string} secondaryWarehouseId
 * @param {Array<{ id: string, stock?: number, cost_price?: number }>} products
 */
export async function seedLocationStock(tx, businessId, primaryWarehouseId, secondaryWarehouseId, products) {
  let count = 0;
  for (const p of products) {
    const headline = Math.max(Number(p.stock) || 0, 20);
    const primaryQty = roundMoney(headline * 0.7);
    const secondaryQty = roundMoney(headline - primaryQty);

    for (const [warehouseId, qty] of [
      [primaryWarehouseId, primaryQty],
      [secondaryWarehouseId, secondaryQty],
    ]) {
      if (qty <= 0) continue;
      await tx.query(
        `INSERT INTO product_stock_locations (business_id, product_id, warehouse_id, quantity, state)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, 'sellable')
         ON CONFLICT (business_id, product_id, warehouse_id, state)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [businessId, p.id, warehouseId, qty]
      );
      count++;
    }
  }
  return count;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} warehouseId
 * @param {string} category
 * @param {Array<{ id: string, name: string, cost_price?: number, price?: number }>} products
 */
export async function seedProductBatches(tx, businessId, warehouseId, category, products) {
  if (!BATCH_VERTICALS.has(category) || !products.length) return 0;

  let count = 0;
  const today = new Date();
  const picks = products.slice(0, Math.min(3, products.length));

  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const batchNumber = `BATCH-${String(businessId).replace(/-/g, '').slice(0, 6)}-${i + 1}`;
    const dup = await tx.query(
      `SELECT id FROM product_batches WHERE business_id = $1::uuid AND product_id = $2::uuid AND batch_number = $3 LIMIT 1`,
      [businessId, p.id, batchNumber]
    );
    if (dup.rows[0]) {
      count++;
      continue;
    }

    const expiryDays = i === 0 ? 28 : 180;
    const qty = 20 + i * 15;
    const cost = Number(p.cost_price || p.price || 0) * 0.65;

    const res = await tx.query(
      `INSERT INTO product_batches (
        business_id, product_id, warehouse_id, batch_number,
        manufacturing_date, expiry_date, quantity, cost_price, mrp, is_active
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4,
        $5::date, $6::date, $7::numeric, $8::numeric, $9::numeric, true
      ) RETURNING id`,
      [
        businessId,
        p.id,
        warehouseId,
        batchNumber,
        addDays(today, -120),
        category === 'auto-parts' ? null : addDays(today, expiryDays),
        qty,
        cost,
        Number(p.price || 0),
      ]
    );

    await tx.query(
      `INSERT INTO stock_movements (
        business_id, product_id, warehouse_id, batch_id,
        transaction_type, movement_type, quantity_change, unit_cost, notes
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'batch_receipt', 'in', $5::numeric, $6::numeric, $7)`,
      [businessId, p.id, warehouseId, res.rows[0].id, qty, cost, 'Data-lab batch receipt']
    );

    count++;
  }
  return count;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} fromWarehouseId
 * @param {string} toWarehouseId
 * @param {Array<{ id: string, name: string }>} products
 */
export async function seedStockTransfers(tx, businessId, fromWarehouseId, toWarehouseId, products) {
  if (!products.length || fromWarehouseId === toWarehouseId) return 0;

  const p = products[0];
  const transferNumber = `TR-${String(businessId).replace(/-/g, '').slice(0, 8)}-001`;
  const dup = await tx.query(
    `SELECT id FROM stock_transfers WHERE business_id = $1::uuid AND transfer_number = $2 LIMIT 1`,
    [businessId, transferNumber]
  );
  if (dup.rows[0]) return 1;

  const qty = 5;
  await tx.query(
    `INSERT INTO stock_transfers (
      business_id, transfer_number, product_id, from_warehouse_id, to_warehouse_id,
      quantity, status, transfer_date, notes
    ) VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, $6::numeric, 'completed', CURRENT_DATE, $7)`,
    [businessId, transferNumber, p.id, fromWarehouseId, toWarehouseId, qty, `Demo transfer — ${p.name}`]
  );

  await tx.query(
    `UPDATE product_stock_locations SET quantity = GREATEST(0, quantity - $1::numeric), updated_at = NOW()
     WHERE business_id = $2::uuid AND product_id = $3::uuid AND warehouse_id = $4::uuid AND state = 'sellable'`,
    [qty, businessId, p.id, fromWarehouseId]
  );
  await tx.query(
    `INSERT INTO product_stock_locations (business_id, product_id, warehouse_id, quantity, state)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, 'sellable')
     ON CONFLICT (business_id, product_id, warehouse_id, state)
     DO UPDATE SET quantity = product_stock_locations.quantity + EXCLUDED.quantity, updated_at = NOW()`,
    [businessId, p.id, toWarehouseId, qty]
  );

  await tx.query(
    `INSERT INTO stock_movements (
      business_id, product_id, warehouse_id, transaction_type, movement_type, quantity_change, notes
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'transfer_out', 'out', $4::numeric, $5)`,
    [businessId, p.id, fromWarehouseId, -qty, transferNumber]
  );
  await tx.query(
    `INSERT INTO stock_movements (
      business_id, product_id, warehouse_id, transaction_type, movement_type, quantity_change, notes
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'transfer_in', 'in', $4::numeric, $5)`,
    [businessId, p.id, toWarehouseId, qty, transferNumber]
  );

  return 1;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} warehouseId
 * @param {string} customerId
 * @param {string} quotationId
 * @param {Array<{ id: string }>} products
 */
export async function seedInventoryReservations(tx, businessId, warehouseId, customerId, quotationId, products) {
  if (!products.length) return 0;

  const p = products[0];
  const refKey = `quotation:${quotationId}`;
  const dup = await tx.query(
    `SELECT id FROM inventory_reservations
     WHERE business_id = $1::uuid AND reference = $2 AND product_id = $3::uuid LIMIT 1`,
    [businessId, refKey, p.id]
  );
  if (dup.rows[0]) return 1;

  const expiresAt = addDays(new Date(), 7);
  await tx.query(
    `INSERT INTO inventory_reservations (
      business_id, product_id, warehouse_id, customer_id, quantity, expires_at,
      status, reference, reference_type, reference_id, notes
    ) VALUES (
      $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::numeric, $6,
      'active', $7, 'quotation', $8::uuid, 'Demo quotation hold'
    )`,
    [businessId, p.id, warehouseId, customerId, 2, expiresAt, refKey, quotationId]
  );
  return 1;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} warehouseId
 * @param {Array<{ id: string, stock?: number, min_stock_level?: number }>} products
 */
export async function seedLowStockAlerts(tx, businessId, warehouseId, products) {
  let count = 0;
  const pick = products.find((p) => Number(p.stock ?? 0) <= 30) || products[0];
  if (!pick) return 0;

  const minLevel = 25;
  const current = Math.min(Number(pick.stock ?? 0), 18);

  await tx.query(
    `UPDATE products SET min_stock_level = $3::numeric, reorder_point = $4::numeric, stock = $5::numeric, updated_at = NOW()
     WHERE id = $1::uuid AND business_id = $2::uuid`,
    [pick.id, businessId, minLevel, 20, current]
  );

  const dup = await tx.query(
    `SELECT id FROM low_stock_alerts
     WHERE business_id = $1::uuid AND product_id = $2::uuid AND warehouse_id = $3::uuid AND status = 'active' LIMIT 1`,
    [businessId, pick.id, warehouseId]
  );
  if (dup.rows[0]) return 1;

  await tx.query(
    `INSERT INTO low_stock_alerts (business_id, product_id, warehouse_id, current_stock, min_stock_level, status)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::numeric, 'active')`,
    [businessId, pick.id, warehouseId, current, minLevel]
  );
  return 1;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string[]} customerIds
 * @param {Array<{ id: string, name: string, price: number, tax_percent?: number }>} products
 */
export async function seedQuotations(tx, businessId, customerIds, products) {
  if (!products.length || !customerIds.length) return { count: 0, quotationId: null };

  const qNum = `QT-${String(businessId).replace(/-/g, '').slice(0, 8)}-001`;
  const dup = await tx.query(
    `SELECT id FROM quotations WHERE business_id = $1::uuid AND quotation_number = $2 LIMIT 1`,
    [businessId, qNum]
  );
  if (dup.rows[0]) return { count: 1, quotationId: dup.rows[0].id };

  const pick = products.slice(0, Math.min(2, products.length));
  let subtotal = 0;
  let taxTotal = 0;
  for (const p of pick) {
    const lineNet = roundMoney(Number(p.price) * 2);
    const lineTax = roundMoney((lineNet * (Number(p.tax_percent) || 0)) / 100);
    subtotal += lineNet;
    taxTotal += lineTax;
  }
  const grandTotal = roundMoney(subtotal + taxTotal);

  const qRes = await tx.query(
    `INSERT INTO quotations (
      business_id, customer_id, quotation_number, date, valid_until, status,
      subtotal, tax_total, grand_total, total_amount, notes
    ) VALUES (
      $1::uuid, $2::uuid, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'sent',
      $4::numeric, $5::numeric, $6::numeric, $6::numeric, 'Demo quotation for hub QA'
    ) RETURNING id`,
    [businessId, customerIds[0], qNum, subtotal, taxTotal, grandTotal]
  );
  const quotationId = qRes.rows[0].id;

  for (const p of pick) {
    const qty = 2;
    const unit = Number(p.price) || 0;
    const lineNet = roundMoney(unit * qty);
    const lineTax = roundMoney((lineNet * (Number(p.tax_percent) || 0)) / 100);
    await tx.query(
      `INSERT INTO quotation_items (
        business_id, quotation_id, product_id, description, quantity, unit_price, tax_amount, total_amount
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::numeric, $6::numeric, $7::numeric, $8::numeric)`,
      [businessId, quotationId, p.id, p.name, qty, unit, lineTax, roundMoney(lineNet + lineTax)]
    );
  }

  return { count: 1, quotationId };
}
