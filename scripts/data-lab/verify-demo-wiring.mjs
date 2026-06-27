/**
 * Post-seed integrity checks: tenancy isolation, KPI wiring, entity counts.
 * Run: npx tsx scripts/data-lab/verify-demo-wiring.mjs
 */
import { createPool } from '../../lib/dataLab/pool.mjs';
import { PRIMARY_DEMO_DOMAIN } from '../../lib/dataLab/domains.mjs';
import { tableExists } from '../../lib/dataLab/seedHelpers.mjs';
import {
  SALES_TREND_UNIFIED_SQL,
  TOP_MOVING_PRODUCTS_UNIFIED_SQL,
} from '../../lib/analytics/salesInsights.js';

const pool = createPool();
let failed = 0;

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

async function main() {
  const client = await pool.connect();
  try {
    const bizRes = await client.query(
      `SELECT id, domain, category, business_name FROM businesses ORDER BY domain`
    );
    if (bizRes.rows.length === 0) {
      fail('No businesses found — run data-lab:seed first');
      return;
    }
    ok(`${bizRes.rows.length} business(es) present`);

    const primary = bizRes.rows.find(
      (b) => b.category === PRIMARY_DEMO_DOMAIN || b.domain === 'demo-textile'
    ) || bizRes.rows[0];

    // --- Entity counts for primary demo ---
    const counts = await client.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM products WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)) AS products,
        (SELECT COUNT(*)::int FROM customers WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)) AS customers,
        (SELECT COUNT(*)::int FROM vendors WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)) AS vendors,
        (SELECT COUNT(*)::int FROM invoices WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)) AS invoices,
        (SELECT COUNT(*)::int FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id WHERE i.business_id = $1::uuid) AS invoice_lines,
        (SELECT COUNT(*)::int FROM pos_transactions WHERE business_id = $1::uuid AND is_voided = false) AS pos_tx,
        (SELECT COUNT(*)::int FROM storefront_orders WHERE business_id = $1::uuid) AS storefront_orders,
        (SELECT COUNT(*)::int FROM gl_accounts WHERE business_id = $1::uuid) AS gl_accounts
      `,
      [primary.id]
    );
    const c = counts.rows[0];
    if (Number(c.products) < 1) fail(`${primary.domain}: expected products`);
    else ok(`${primary.domain}: ${c.products} products`);

    if (Number(c.customers) < 1) fail(`${primary.domain}: expected demo customers`);
    else ok(`${primary.domain}: ${c.customers} customers`);

    const imgRes = await client.query(
      `SELECT COUNT(*)::int AS with_img FROM products
       WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)
         AND image_url IS NOT NULL AND TRIM(image_url) <> ''`,
      [primary.id]
    );
    if (Number(imgRes.rows[0]?.with_img) < 1) {
      fail(`${primary.domain}: expected products with image_url — run data-lab:seed --refresh-catalog`);
    } else {
      ok(`${primary.domain}: ${imgRes.rows[0].with_img} products with catalog images`);
    }

    if (Number(c.invoices) < 1) fail(`${primary.domain}: expected seeded invoices`);
    else ok(`${primary.domain}: ${c.invoices} invoices, ${c.invoice_lines} lines`);

    if (Number(c.pos_tx) < 1) fail(`${primary.domain}: expected POS transactions`);
    else ok(`${primary.domain}: ${c.pos_tx} POS transactions`);

    if (Number(c.storefront_orders) < 1) fail(`${primary.domain}: expected storefront orders`);
    else ok(`${primary.domain}: ${c.storefront_orders} storefront orders`);

    if (Number(c.gl_accounts) < 5) fail(`${primary.domain}: expected COA accounts`);
    else ok(`${primary.domain}: ${c.gl_accounts} GL accounts`);

    async function countTable(table, extraWhere = '') {
      if (!(await tableExists(client, table))) return null;
      const r = await client.query(
        `SELECT COUNT(*)::int AS n FROM ${table} WHERE business_id = $1::uuid ${extraWhere}`,
        [primary.id]
      );
      return Number(r.rows[0]?.n ?? 0);
    }

    const warehouses = await countTable('warehouse_locations');
    const locationStock = await countTable('product_stock_locations');
    const batches = await countTable('product_batches', 'AND (is_deleted = false OR is_deleted IS NULL)');
    const transfers = await countTable('stock_transfers');
    const reservations = await countTable('inventory_reservations');
    const invoicePayments = await countTable('invoice_payments', 'AND (is_deleted = false OR is_deleted IS NULL)');
    const journals = await countTable('journal_entries');
    const employees = await countTable('payroll_employees');
    const payrollRuns = await countTable('payroll_runs');
    const quotations = await countTable('quotations', 'AND (is_deleted = false OR is_deleted IS NULL)');
    const lowStockAlerts = await countTable('low_stock_alerts', "AND status = 'active'");
    const fiscalPeriods = await countTable('fiscal_periods');
    const expenses = await countTable('expenses', 'AND (is_deleted = false OR is_deleted IS NULL)');

    if (warehouses != null && warehouses < 2) fail(`${primary.domain}: expected 2+ warehouses`);
    else if (warehouses != null) ok(`${primary.domain}: ${warehouses} warehouses, ${locationStock ?? 0} location stock rows`);
    if (invoicePayments != null && invoicePayments < 1) fail(`${primary.domain}: expected invoice_payments for paid invoices`);
    else if (invoicePayments != null) ok(`${primary.domain}: ${invoicePayments} invoice payments`);
    if (journals != null) {
      if (journals < 1) fail(`${primary.domain}: expected journal entries`);
      else ok(`${primary.domain}: ${journals} journal entries, ${expenses ?? 0} expenses`);
    }
    if (employees != null) {
      if (employees < 1) fail(`${primary.domain}: expected payroll employees`);
      else ok(`${primary.domain}: ${employees} employees, ${payrollRuns ?? 0} payroll run(s)`);
    }
    if (transfers != null && transfers < 1) fail(`${primary.domain}: expected stock transfers`);
    else if (transfers != null) {
      ok(`${primary.domain}: ${transfers} transfers, ${reservations ?? 0} reservations, ${quotations ?? 0} quotations`);
    }
    if (lowStockAlerts != null) {
      if (lowStockAlerts < 1) fail(`${primary.domain}: expected low stock alerts`);
      else ok(`${primary.domain}: ${lowStockAlerts} low-stock alert(s), ${fiscalPeriods ?? 0} fiscal period(s)`);
    }

    // --- Invoice line revenue not zero when qty > 0 ---
    const zeroRev = await client.query(
      `
      SELECT COUNT(*)::int AS c FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE i.business_id = $1::uuid
        AND COALESCE(ii.quantity, 0) > 0
        AND COALESCE(ii.total_amount, 0) = 0
        AND COALESCE(ii.unit_price, 0) = 0
      `,
      [primary.id]
    );
    if (Number(zeroRev.rows[0].c) > 0) {
      fail(`${primary.domain}: ${zeroRev.rows[0].c} invoice lines with qty but zero revenue`);
    } else {
      ok(`${primary.domain}: invoice line amounts populated`);
    }

    // --- Unified analytics SQL ---
    const anchor = new Date().toISOString().slice(0, 10);
    const from = new Date();
    from.setMonth(from.getMonth() - 5);
    const fromStr = from.toISOString().slice(0, 10);

    const trend = await client.query(SALES_TREND_UNIFIED_SQL, [primary.id, anchor]);
    const trendRev = trend.rows.reduce((s, r) => s + parseFloat(r.sales || 0), 0);
    if (trendRev <= 0) fail(`${primary.domain}: unified sales trend returned zero revenue`);
    else ok(`${primary.domain}: unified trend revenue = ${trendRev.toFixed(2)}`);

    const top = await client.query(TOP_MOVING_PRODUCTS_UNIFIED_SQL, [primary.id, 5, fromStr, anchor]);
    const topWithRev = top.rows.filter((r) => parseFloat(r.revenue || 0) > 0);
    if (topWithRev.length === 0) fail(`${primary.domain}: top products all zero revenue`);
    else ok(`${primary.domain}: ${topWithRev.length} top products with revenue`);

    // --- Tenancy: products scoped to business ---
    if (bizRes.rows.length >= 2) {
      const a = bizRes.rows[0];
      const b = bizRes.rows[1];
      const leak = await client.query(
        `
        SELECT p.id FROM products p
        WHERE p.business_id = $1::uuid
          AND EXISTS (
            SELECT 1 FROM invoice_items ii
            JOIN invoices i ON i.id = ii.invoice_id
            WHERE ii.product_id = p.id AND i.business_id = $2::uuid
          )
        LIMIT 1
        `,
        [a.id, b.id]
      );
      if (leak.rows.length > 0) {
        fail(`Cross-tenant leak: product from ${a.domain} referenced on ${b.domain} invoice`);
      } else {
        ok('No cross-tenant product/invoice linkage between first two businesses');
      }
    }

    // --- Users preserved ---
    const users = await client.query('SELECT COUNT(*)::int AS c FROM "user"');
    if (Number(users.rows[0].c) < 1) fail('No users in database');
    else ok(`${users.rows[0].c} user account(s) preserved`);

    // --- Domain coverage ---
    const categories = new Set(bizRes.rows.map((r) => r.category));
    ok(`Domain categories seeded: ${[...categories].slice(0, 8).join(', ')}${categories.size > 8 ? '…' : ''}`);

    const autoParts = bizRes.rows.find((b) => b.domain === 'demo-autoparts');
    if (autoParts) {
      const ap = await client.query(
        `SELECT COUNT(*)::int AS n,
                COUNT(*) FILTER (WHERE image_url IS NOT NULL AND TRIM(image_url) <> '')::int AS with_img
         FROM products WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)`,
        [autoParts.id]
      );
      const n = Number(ap.rows[0]?.n ?? 0);
      const imgs = Number(ap.rows[0]?.with_img ?? 0);
      if (n < 10) fail(`demo-autoparts: expected 10+ auto parts products, got ${n}`);
      else ok(`demo-autoparts: ${n} products (${imgs} with images)`);

      const skuHit = await client.query(
        `SELECT id FROM products WHERE business_id = $1::uuid AND sku = '04465-13020' LIMIT 1`,
        [autoParts.id]
      );
      if (!skuHit.rows[0]) fail('demo-autoparts: missing seed SKU 04465-13020');
      else ok('demo-autoparts: part number SKU searchable in catalog');

      const apCust = await client.query(
        `SELECT COUNT(*)::int AS n FROM customers WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)`,
        [autoParts.id]
      );
      if (Number(apCust.rows[0]?.n ?? 0) < 1) fail('demo-autoparts: expected Singapore demo customers');
      else ok(`demo-autoparts: ${apCust.rows[0].n} customers`);

      const apDepth = await client.query(
        `SELECT
          (SELECT COUNT(*)::int FROM warehouse_locations WHERE business_id = $1::uuid) AS wh,
          (SELECT COUNT(*)::int FROM product_batches WHERE business_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL)) AS batches
         `,
        [autoParts.id]
      );
      if (Number(apDepth.rows[0]?.wh ?? 0) < 2) fail('demo-autoparts: expected warehouses');
      else ok(`demo-autoparts: ${apDepth.rows[0].wh} warehouses, ${apDepth.rows[0].batches} batches`);
    }

    const ownerEmails = [
      process.env.DEMO_SEED_OWNER_EMAIL,
      process.env.PLATFORM_OWNER_EMAIL,
      ...(process.env.PLATFORM_OWNER_EMAILS || '').split(','),
    ]
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean);
    if (ownerEmails.length) {
      const demoRows = bizRes.rows.filter((b) => String(b.domain).startsWith('demo-'));
      for (const demo of demoRows) {
        const ownerRes = await client.query(
          `SELECT u.email FROM businesses b JOIN "user" u ON u.id = b.user_id WHERE b.id = $1::uuid`,
          [demo.id]
        );
        const ownerEmail = String(ownerRes.rows[0]?.email || '').toLowerCase();
        if (!ownerEmails.includes(ownerEmail)) {
          fail(`${demo.domain}: demo business should belong to platform owner (${ownerEmails[0]}), got ${ownerEmail || 'none'}`);
        }
      }
      if (demoRows.length) ok(`Demo pack (${demoRows.length}) owned by platform owner`);
    }
  } finally {
    client.release();
    await pool.end();
  }

  if (failed > 0) {
    console.error(`\nVerification failed with ${failed} issue(s).`);
    process.exit(1);
  }
  console.log('\nAll demo wiring checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
