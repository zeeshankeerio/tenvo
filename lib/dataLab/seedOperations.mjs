import { createPool, withTransaction } from './pool.mjs';
import {
  seedWarehouses,
  seedLocationStock,
  seedProductBatches,
  seedStockTransfers,
  seedInventoryReservations,
  seedLowStockAlerts,
  seedQuotations,
} from './seedInventory.mjs';
import {
  seedFiscalPeriod,
  backfillInvoicePayments,
  seedSampleJournals,
  seedExpenses,
  insertInvoicePayment,
} from './seedFinance.mjs';
import { seedPayrollStack } from './seedHr.mjs';
import { seedIfTable, ensureInventoryAutomationTables } from './seedHelpers.mjs';
import { sampleDomainData, sampleNote, SAMPLE_SOURCE } from './sampleDataConstants.js';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(15);
  d.setHours(12, 0, 0, 0);
  return d;
}

const DEMO_CUSTOMERS_BY_MARKET = {
  PK: [
    { name: 'Ahmed Traders', email: 'ahmed.traders@example.com', phone: '+923001111001' },
    { name: 'Sara Boutique', email: 'sara@example.com', phone: '+923002222002' },
    { name: 'Walk-in Guest', email: 'walkin@example.com', phone: '+923003333003' },
  ],
  SG: [
    { name: 'Tan Motorworks Pte Ltd', email: 'orders@tanmotorworks.sg', phone: '+6591234567' },
    { name: 'Lion City Auto Supplies', email: 'sales@lioncityauto.sg', phone: '+6587654321' },
    { name: 'Walk-in Customer', email: 'walkin@example.com', phone: '+6590000000' },
  ],
  AE: [
    { name: 'Gulf Trading LLC', email: 'procurement@gulftrading.ae', phone: '+971501234567' },
    { name: 'Desert Retail Co', email: 'orders@desertretail.ae', phone: '+971509876543' },
    { name: 'Walk-in Guest', email: 'walkin@example.com', phone: '+971500000000' },
  ],
};

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} [countryIso]
 * @param {string | null} [sampleBatchId]
 */
async function ensureCustomers(tx, businessId, countryIso = 'PK', sampleBatchId = null) {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const rows = DEMO_CUSTOMERS_BY_MARKET[iso] || DEMO_CUSTOMERS_BY_MARKET.PK;
  const ids = [];
  for (const row of rows) {
    const existing = await tx.query(
      `SELECT id FROM customers WHERE business_id = $1::uuid AND LOWER(email) = LOWER($2) LIMIT 1`,
      [businessId, row.email]
    );
    if (existing.rows[0]) {
      ids.push(existing.rows[0].id);
      continue;
    }
    const res = await tx.query(
      `INSERT INTO customers (business_id, name, email, phone, is_active, outstanding_balance, credit_limit, domain_data)
       VALUES ($1::uuid, $2, $3, $4, true, 0, 500000, $5::jsonb)
       RETURNING id`,
      [
        businessId,
        row.name,
        row.email,
        row.phone,
        JSON.stringify(sampleBatchId ? sampleDomainData(sampleBatchId) : {}),
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string | null} [sampleBatchId]
 */
async function ensureVendors(tx, businessId, sampleBatchId = null) {
  const rows = [
    { name: 'National Suppliers Co.', email: 'supply@example.com' },
    { name: 'Prime Fabrics Ltd.', email: 'fabrics@example.com' },
  ];
  const ids = [];
  for (const row of rows) {
    const existing = await tx.query(
      `SELECT id FROM vendors WHERE business_id = $1::uuid AND LOWER(name) = LOWER($2) LIMIT 1`,
      [businessId, row.name]
    );
    if (existing.rows[0]) {
      ids.push(existing.rows[0].id);
      continue;
    }
    const res = await tx.query(
      `INSERT INTO vendors (business_id, name, email, domain_data)
       VALUES ($1::uuid, $2, $3, $4::jsonb)
       RETURNING id`,
      [
        businessId,
        row.name,
        row.email,
        JSON.stringify(sampleBatchId ? sampleDomainData(sampleBatchId) : {}),
      ]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} userId
 * @param {string[]} customerIds
 * @param {Array<{ id: string, name: string, price: number, cost_price?: number, tax_percent?: number, stock?: number }>} products
 * @param {string | null} [sampleBatchId]
 */
async function seedInvoices(tx, businessId, userId, customerIds, products, sampleBatchId = null) {
  if (!products.length) return 0;

  let created = 0;
  const bizTag = String(businessId).replace(/-/g, '').slice(0, 6);
  for (let m = 0; m < 6; m++) {
    const invoiceDate = monthsAgo(5 - m);
    const perMonth = m === 0 ? 2 : 1;

    for (let i = 0; i < perMonth; i++) {
      const pick = products.slice(0, Math.min(3, products.length));
      let subtotal = 0;
      let taxTotal = 0;
      const lineItems = pick.map((p, idx) => {
        const qty = 1 + ((m + idx) % 4);
        const unit = Number(p.price) || 0;
        const taxPct = Number(p.tax_percent) || 0;
        const lineNet = roundMoney(unit * qty);
        const lineTax = roundMoney((lineNet * taxPct) / 100);
        subtotal += lineNet;
        taxTotal += lineTax;
        return { product: p, qty, unit, lineNet, lineTax, lineTotal: roundMoney(lineNet + lineTax) };
      });

      const grandTotal = roundMoney(subtotal + taxTotal);
      const paid = m >= 4 || i === 0;
      const customerId = customerIds[(m + i) % customerIds.length];

      const invNum = `INV-${bizTag}-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${m}${i}`;

      const dup = await tx.query(
        `SELECT id FROM invoices WHERE business_id = $1::uuid AND invoice_number = $2 LIMIT 1`,
        [businessId, invNum]
      );
      if (dup.rows[0]) continue;

      const invRes = await tx.query(
        `INSERT INTO invoices (
          business_id, customer_id, invoice_number, date, due_date, status, created_by,
          subtotal, tax_total, discount_total, grand_total, payment_method, payment_status, is_deleted, notes
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, $4, 'confirmed', $5,
          $6::numeric, $7::numeric, 0, $8::numeric, $9, $10, false, $11
        ) RETURNING id`,
        [
          businessId,
          customerId,
          invNum,
          invoiceDate,
          userId,
          subtotal,
          taxTotal,
          grandTotal,
          paid ? 'cash' : 'credit',
          paid ? 'paid' : 'unpaid',
          sampleBatchId ? sampleNote(sampleBatchId) : null,
        ]
      );
      const invoiceId = invRes.rows[0].id;

      for (const line of lineItems) {
        await tx.query(
          `INSERT INTO invoice_items (
            business_id, invoice_id, product_id, name, quantity, unit_price,
            tax_percent, tax_amount, discount_amount, total_amount
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::numeric, $6::numeric, $7::numeric, $8::numeric, 0, $9::numeric)`,
          [
            businessId,
            invoiceId,
            line.product.id,
            line.product.name,
            line.qty,
            line.unit,
            line.product.tax_percent || 0,
            line.lineTax,
            line.lineTotal,
          ]
        );

        await tx.query(
          `UPDATE products SET stock = GREATEST(0, COALESCE(stock, 0) - $1::numeric), sales_count = COALESCE(sales_count, 0) + $2::int, updated_at = NOW()
           WHERE id = $3::uuid AND business_id = $4::uuid`,
          [line.qty, Math.floor(line.qty), line.product.id, businessId]
        );
      }

      if (!paid) {
        await tx.query(
          `UPDATE customers SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1::numeric WHERE id = $2::uuid AND business_id = $3::uuid`,
          [grandTotal, customerId, businessId]
        );
      } else {
        await insertInvoicePayment(tx, businessId, invoiceId, grandTotal, 'cash', invoiceDate, userId);
      }

      created++;
    }
  }
  return created;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} userId
 * @param {Array<{ id: string, name: string, price: number, tax_percent?: number }>} products
 */
async function seedPosSales(tx, businessId, userId, products) {
  if (!products.length) return 0;

  let terminalId;
  const term = await tx.query(
    `SELECT id FROM pos_terminals WHERE business_id = $1::uuid LIMIT 1`,
    [businessId]
  );
  if (term.rows[0]) {
    terminalId = term.rows[0].id;
  } else {
    const tRes = await tx.query(
      `INSERT INTO pos_terminals (business_id, name, code, status)
       VALUES ($1::uuid, 'Demo Counter', 'DEMO-01', 'active') RETURNING id`,
      [businessId]
    );
    terminalId = tRes.rows[0].id;
  }

  let sessionId;
  const ses = await tx.query(
    `SELECT id FROM pos_sessions WHERE terminal_id = $1::uuid AND status = 'open' LIMIT 1`,
    [terminalId]
  );
  if (ses.rows[0]) {
    sessionId = ses.rows[0].id;
  } else {
    const sRes = await tx.query(
      `INSERT INTO pos_sessions (business_id, terminal_id, user_id, opening_balance, status)
       VALUES ($1::uuid, $2::uuid, $3, 5000, 'open') RETURNING id`,
      [businessId, terminalId, userId]
    );
    sessionId = sRes.rows[0].id;
  }

  let count = 0;
  for (let i = 0; i < 4; i++) {
    const p = products[i % products.length];
    const qty = 1 + (i % 2);
    const unit = Number(p.price) || 0;
    const taxPct = Number(p.tax_percent) || 0;
    const subtotal = roundMoney(unit * qty);
    const tax = roundMoney((subtotal * taxPct) / 100);
    const total = roundMoney(subtotal + tax);
    const txNum = `POS-${String(businessId).replace(/-/g, '').slice(0, 8)}-${100 + i}`;

    const dup = await tx.query(
      `SELECT id FROM pos_transactions WHERE business_id = $1::uuid AND transaction_number = $2`,
      [businessId, txNum]
    );
    if (dup.rows[0]) continue;

    const ptRes = await tx.query(
      `INSERT INTO pos_transactions (
        business_id, session_id, transaction_number, subtotal, tax_amount, discount_amount, total_amount, payment_status
      ) VALUES ($1::uuid, $2::uuid, $3, $4::numeric, $5::numeric, 0, $6::numeric, 'completed') RETURNING id`,
      [businessId, sessionId, txNum, subtotal, tax, total]
    );
    const transactionId = ptRes.rows[0].id;

    await tx.query(
      `INSERT INTO pos_transaction_items (
        business_id, transaction_id, product_id, quantity, unit_price, tax_amount, discount_amount, total_amount
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::numeric, $6::numeric, 0, $7::numeric)`,
      [businessId, transactionId, p.id, qty, unit, tax, total]
    );

    await tx.query(
      `INSERT INTO pos_payments (business_id, transaction_id, method, amount)
       VALUES ($1::uuid, $2::uuid, 'cash', $3::numeric)`,
      [businessId, transactionId, total]
    );

    await tx.query(
      `UPDATE products SET stock = GREATEST(0, COALESCE(stock, 0) - $1::numeric), sales_count = COALESCE(sales_count, 0) + $2::int
       WHERE id = $3::uuid AND business_id = $4::uuid`,
      [qty, Math.floor(qty), p.id, businessId]
    );

    count++;
  }
  return count;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {Array<{ id: string, name: string, price: number, tax_percent?: number }>} products
 * @param {{ currency?: string, sampleBatchId?: string | null }} [ctx]
 */
async function seedStorefrontOrders(tx, businessId, products, ctx = {}) {
  if (!products.length) return 0;

  const currency = ctx.currency || 'PKR';
  const metaSource = ctx.sampleBatchId ? SAMPLE_SOURCE : 'data-lab-seed';

  const bizTag = String(businessId).replace(/-/g, '').slice(0, 8);
  const specs = [
    { payment_status: 'paid', status: 'processing' },
    { payment_status: 'pending', status: 'pending' },
    { payment_status: 'paid', status: 'shipped' },
  ];

  let count = 0;
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const orderNumber = `SO-${bizTag}-${1000 + i}`;
    const dup = await tx.query(
      `SELECT id FROM storefront_orders WHERE business_id = $1::uuid AND order_number = $2`,
      [businessId, orderNumber]
    );
    if (dup.rows[0]) continue;

    const p = products[i % products.length];
    const qty = 2;
    const unit = Number(p.price) || 0;
    const taxPct = Number(p.tax_percent) || 0;
    const subtotal = roundMoney(unit * qty);
    const tax = roundMoney((subtotal * taxPct) / 100);
    const total = roundMoney(subtotal + tax);

    const oRes = await tx.query(
      `INSERT INTO storefront_orders (
        business_id, order_number, customer_email, customer_phone, customer_name,
        subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
        currency, status, payment_status, fulfillment_status, metadata
      ) VALUES (
        $1::uuid, $2, $3, $4, $5,
        $6::numeric, $7::numeric, 0, 0, $8::numeric,
        $9, $10, $11, 'unfulfilled', $12::jsonb
      ) RETURNING id`,
      [
        businessId,
        orderNumber,
        `buyer${i}@example.com`,
        ctx.phone || '+923004444004',
        `Online Buyer ${i + 1}`,
        subtotal,
        tax,
        total,
        currency,
        spec.status,
        spec.payment_status,
        JSON.stringify({
          source: metaSource,
          ...(ctx.sampleBatchId ? { sample_batch_id: ctx.sampleBatchId } : {}),
        }),
      ]
    );

    await tx.query(
      `INSERT INTO storefront_order_items (
        order_id, business_id, product_id, product_name, quantity, unit_price, tax_amount, total_price
      ) VALUES ($1, $2::uuid, $3::uuid, $4, $5::numeric, $6::numeric, $7::numeric, $8::numeric)`,
      [oRes.rows[0].id, businessId, p.id, p.name, qty, unit, tax, total]
    );

    count++;
  }
  return count;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string[]} vendorIds
 * @param {Array<{ id: string, name: string, cost_price?: number, price?: number }>} products
 * @param {string} [warehouseId]
 * @param {string | null} [sampleBatchId]
 */
async function seedPurchaseOrders(tx, businessId, vendorIds, products, warehouseId = null, sampleBatchId = null) {
  if (!products.length || !vendorIds.length) return 0;

  const poNumber = `PO-${String(businessId).replace(/-/g, '').slice(0, 8)}-001`;
  const dup = await tx.query(
    `SELECT id FROM purchases WHERE business_id = $1::uuid AND purchase_number = $2 LIMIT 1`,
    [businessId, poNumber]
  );
  if (dup.rows[0]) return 0;

  const p = products[0];
  const qty = 20;
  const unit = Number(p.cost_price || p.price || 0) * 0.7;
  const total = roundMoney(unit * qty);

  const poRes = await tx.query(
    `INSERT INTO purchases (
      business_id, vendor_id, purchase_number, date, status, subtotal, tax_total, total_amount, payment_status, warehouse_id, notes
    ) VALUES ($1::uuid, $2::uuid, $3, CURRENT_DATE, 'received', $4::numeric, 0, $4::numeric, 'unpaid', $5::uuid, $6)
    RETURNING id`,
    [businessId, vendorIds[0], poNumber, total, warehouseId, sampleBatchId ? sampleNote(sampleBatchId) : null]
  );

  await tx.query(
    `INSERT INTO purchase_items (
      business_id, purchase_id, product_id, description, quantity, unit_cost, total_amount
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::numeric, $6::numeric, $7::numeric)`,
    [businessId, poRes.rows[0].id, p.id, p.name, qty, unit, total]
  );

  return 1;
}

/**
 * Seed cross-channel operational data for hub tab QA.
 * @param {{ businessId: string, userId: string, sampleBatchId?: string | null, replaceSampleOps?: boolean }} params
 */
export async function seedOperationalData({ businessId, userId, sampleBatchId = null, replaceSampleOps = false }) {
  const pool = createPool();
  const client = await pool.connect();

  try {
    return await withTransaction(client, async (tx) => {
      const bizRes = await tx.query(
        `SELECT country, currency, settings, category FROM businesses WHERE id = $1::uuid LIMIT 1`,
        [businessId]
      );
      const biz = bizRes.rows[0] || {};
      const settings =
        biz.settings && typeof biz.settings === 'object' ? biz.settings : {};
      const registration = settings.registration && typeof settings.registration === 'object' ? settings.registration : {};
      const countryIso = registration.country_iso || 'PK';
      const category = biz.category || registration.domain_vertical || 'retail-shop';
      const currency = biz.currency || registration.currency || 'PKR';
      const marketPhone =
        countryIso === 'SG' ? '+6591234567' : countryIso === 'AE' ? '+971501234567' : '+923004444004';

      const prodRes = await tx.query(
        `SELECT id, name, price, cost_price, tax_percent, stock FROM products
         WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL) AND is_active = true
         ORDER BY name LIMIT 12`,
        [businessId]
      );
      const products = prodRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: parseFloat(r.price),
        cost_price: parseFloat(r.cost_price || 0),
        tax_percent: parseFloat(r.tax_percent || 0),
        stock: parseFloat(r.stock || 0),
      }));

      const customerIds = await ensureCustomers(tx, businessId, countryIso, sampleBatchId);
      const vendorIds = await ensureVendors(tx, businessId, sampleBatchId);

      await ensureInventoryAutomationTables(tx);

      const warehouses = await seedWarehouses(tx, businessId, countryIso);
      const locationRows = await seedLocationStock(
        tx,
        businessId,
        warehouses.primaryId,
        warehouses.secondaryId,
        products
      );
      const batches = await seedProductBatches(tx, businessId, warehouses.primaryId, category, products);
      const { count: quotationCount, quotationId } = await seedQuotations(tx, businessId, customerIds, products);
      const reservations = quotationId
        ? await seedInventoryReservations(
            tx,
            businessId,
            warehouses.primaryId,
            customerIds[0],
            quotationId,
            products
          )
        : 0;
      const transfers = await seedStockTransfers(
        tx,
        businessId,
        warehouses.primaryId,
        warehouses.secondaryId,
        products
      );
      const lowStockAlerts = await seedLowStockAlerts(tx, businessId, warehouses.primaryId, products);

      const invoices = await seedInvoices(tx, businessId, userId, customerIds, products, sampleBatchId);
      const invoicePayments = await backfillInvoicePayments(tx, businessId, userId);
      const pos = await seedPosSales(tx, businessId, userId, products);
      const storefront = await seedStorefrontOrders(tx, businessId, products, {
        currency,
        phone: marketPhone,
        sampleBatchId,
      });
      const purchases = await seedPurchaseOrders(
        tx,
        businessId,
        vendorIds,
        products,
        warehouses.primaryId,
        sampleBatchId
      );

      const fiscalPeriods =
        (await seedIfTable(tx, 'fiscal_periods', () => seedFiscalPeriod(tx, businessId))) ?? 0;
      const journals =
        (await seedIfTable(tx, 'journal_entries', () => seedSampleJournals(tx, businessId, userId))) ?? 0;
      const expenses =
        (await seedIfTable(tx, 'expenses', () => seedExpenses(tx, businessId, vendorIds[0] || null))) ?? 0;
      const payrollRaw = await seedIfTable(tx, 'payroll_employees', () =>
        seedPayrollStack(tx, businessId, userId, countryIso)
      );
      const payroll =
        payrollRaw === -1 ? { employees: 0, payrollRuns: 0 } : payrollRaw;

      return {
        products: products.length,
        customers: customerIds.length,
        vendors: vendorIds.length,
        warehouses: warehouses.warehouseIds.length,
        locationStockRows: locationRows,
        batches,
        quotations: quotationCount,
        reservations,
        stockTransfers: transfers,
        lowStockAlerts,
        invoices,
        invoicePayments,
        posTransactions: pos,
        storefrontOrders: storefront,
        purchaseOrders: purchases,
        fiscalPeriods,
        journals,
        expenses,
        payrollEmployees: payroll.employees,
        payrollRuns: payroll.payrollRuns,
      };
    });
  } finally {
    client.release();
    await pool.end();
  }
}
