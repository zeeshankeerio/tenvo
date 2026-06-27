/**
 * Finance depth for data-lab demos — fiscal periods, invoice payments, journals, expenses.
 */

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** GL account codes from lib/config/accounting.js */
const GL = {
  CASH: '1001',
  AR: '1100',
  INVENTORY: '1200',
  AP: '2001',
  SALES_TAX: '2100',
  SALES: '4000',
  COGS: '5000',
  RENT: '5100',
  PAYROLL: '5200',
};

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} code
 */
async function getGlAccountId(tx, businessId, code) {
  const res = await tx.query(
    `SELECT id FROM gl_accounts WHERE business_id = $1::uuid AND code = $2 LIMIT 1`,
    [businessId, code]
  );
  return res.rows[0]?.id || null;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 */
export async function seedFiscalPeriod(tx, businessId) {
  const year = new Date().getFullYear();
  const name = `FY ${year}`;
  const dup = await tx.query(
    `SELECT id FROM fiscal_periods WHERE business_id = $1::uuid AND name = $2 LIMIT 1`,
    [businessId, name]
  );
  if (dup.rows[0]) return 1;

  await tx.query(
    `INSERT INTO fiscal_periods (business_id, name, start_date, end_date, status)
     VALUES ($1::uuid, $2, $3::date, $4::date, 'open')`,
    [businessId, name, `${year}-01-01`, `${year}-12-31`]
  );
  return 1;
}

/**
 * Backfill invoice_payments for paid invoices missing payment rows.
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} userId
 */
export async function backfillInvoicePayments(tx, businessId, userId) {
  const unpaidPaid = await tx.query(
    `SELECT i.id, i.grand_total, i.date, i.payment_method
     FROM invoices i
     WHERE i.business_id = $1::uuid
       AND (i.is_deleted = false OR i.is_deleted IS NULL)
       AND i.payment_status = 'paid'
       AND NOT EXISTS (
         SELECT 1 FROM invoice_payments ip
         WHERE ip.invoice_id = i.id AND (ip.is_deleted = false OR ip.is_deleted IS NULL)
       )`,
    [businessId]
  );

  let count = 0;
  for (const inv of unpaidPaid.rows) {
    await tx.query(
      `INSERT INTO invoice_payments (
        business_id, invoice_id, amount, payment_method, payment_date, received_by, notes
      ) VALUES ($1::uuid, $2::uuid, $3::numeric, $4, $5::date, $6, 'Data-lab payment backfill')`,
      [
        businessId,
        inv.id,
        inv.grand_total,
        inv.payment_method || 'cash',
        inv.date,
        userId,
      ]
    );
    count++;
  }
  return count;
}

/**
 * Sample balanced journal entries for accounting tab QA.
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} userId
 */
export async function seedSampleJournals(tx, businessId, userId) {
  const journalNumber = `JE-${String(businessId).replace(/-/g, '').slice(0, 8)}-OPEN`;
  const dup = await tx.query(
    `SELECT id FROM journal_entries WHERE business_id = $1::uuid AND journal_number = $2 LIMIT 1`,
    [businessId, journalNumber]
  );
  if (dup.rows[0]) return 1;

  const cashId = await getGlAccountId(tx, businessId, GL.CASH);
  const salesId = await getGlAccountId(tx, businessId, GL.SALES);
  const cogsId = await getGlAccountId(tx, businessId, GL.COGS);
  const inventoryId = await getGlAccountId(tx, businessId, GL.INVENTORY);
  if (!cashId || !salesId) return 0;

  const amount = 15000;
  const cogsAmount = 9000;

  const jeRes = await tx.query(
    `INSERT INTO journal_entries (
      business_id, journal_number, transaction_date, description,
      reference_type, status, created_by
    ) VALUES ($1::uuid, $2, CURRENT_DATE, $3, 'manual', 'posted', $4)
    RETURNING id`,
    [businessId, journalNumber, 'Demo opening sales accrual (data-lab)', userId]
  );
  const journalId = jeRes.rows[0].id;
  const today = new Date();

  await tx.query(
    `INSERT INTO gl_entries (business_id, journal_id, transaction_date, description, account_id, debit, credit, reference_type)
     VALUES ($1::uuid, $2::uuid, $3::date, $4, $5::uuid, $6::numeric, 0, 'manual')`,
    [businessId, journalId, today, 'Cash receipt — demo', cashId, amount]
  );
  await tx.query(
    `INSERT INTO gl_entries (business_id, journal_id, transaction_date, description, account_id, debit, credit, reference_type)
     VALUES ($1::uuid, $2::uuid, $3::date, $4, $5::uuid, 0, $6::numeric, 'manual')`,
    [businessId, journalId, today, 'Sales revenue — demo', salesId, amount]
  );

  if (cogsId && inventoryId) {
    const cogsJe = `JE-${String(businessId).replace(/-/g, '').slice(0, 8)}-COGS`;
    const cogsDup = await tx.query(
      `SELECT id FROM journal_entries WHERE business_id = $1::uuid AND journal_number = $2 LIMIT 1`,
      [businessId, cogsJe]
    );
    if (!cogsDup.rows[0]) {
      const cogsJournal = await tx.query(
        `INSERT INTO journal_entries (
          business_id, journal_number, transaction_date, description, reference_type, status, created_by
        ) VALUES ($1::uuid, $2, CURRENT_DATE, $3, 'manual', 'posted', $4)
        RETURNING id`,
        [businessId, cogsJe, 'Demo COGS adjustment (data-lab)', userId]
      );
      const cogsJournalId = cogsJournal.rows[0].id;
      await tx.query(
        `INSERT INTO gl_entries (business_id, journal_id, transaction_date, account_id, debit, credit)
         VALUES ($1::uuid, $2::uuid, CURRENT_DATE, $3::uuid, $4::numeric, 0)`,
        [businessId, cogsJournalId, cogsId, cogsAmount]
      );
      await tx.query(
        `INSERT INTO gl_entries (business_id, journal_id, transaction_date, account_id, debit, credit)
         VALUES ($1::uuid, $2::uuid, CURRENT_DATE, $3::uuid, 0, $4::numeric)`,
        [businessId, cogsJournalId, inventoryId, cogsAmount]
      );
    }
  }

  return 2;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} [vendorId]
 */
export async function seedExpenses(tx, businessId, vendorId = null) {
  const expenseNumber = `EXP-${String(businessId).replace(/-/g, '').slice(0, 8)}-001`;
  const dup = await tx.query(
    `SELECT id FROM expenses WHERE business_id = $1::uuid AND expense_number = $2 LIMIT 1`,
    [businessId, expenseNumber]
  );
  if (dup.rows[0]) return 1;

  const accountId = await getGlAccountId(tx, businessId, GL.RENT);
  if (!accountId) return 0;

  await tx.query(
    `INSERT INTO expenses (
      business_id, expense_number, account_id, category, amount, tax_amount,
      vendor_id, payment_method, date, description, status
    ) VALUES (
      $1::uuid, $2, $3::uuid, 'Operations', $4::numeric, 0,
      $5, 'cash', CURRENT_DATE, 'Demo office rent — data-lab seed', 'recorded'
    )`,
    [businessId, expenseNumber, accountId, 25000, vendorId]
  );
  return 1;
}

/**
 * Record payment when seeding new paid invoices inline.
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} invoiceId
 * @param {number} amount
 * @param {string} paymentMethod
 * @param {Date|string} paymentDate
 * @param {string} userId
 */
export async function insertInvoicePayment(tx, businessId, invoiceId, amount, paymentMethod, paymentDate, userId) {
  const exists = await tx.query(
    `SELECT id FROM invoice_payments WHERE invoice_id = $1::uuid AND (is_deleted = false OR is_deleted IS NULL) LIMIT 1`,
    [invoiceId]
  );
  if (exists.rows[0]) return;

  await tx.query(
    `INSERT INTO invoice_payments (
      business_id, invoice_id, amount, payment_method, payment_date, received_by, notes
    ) VALUES ($1::uuid, $2::uuid, $3::numeric, $4, $5::date, $6, 'Data-lab seed payment')`,
    [businessId, invoiceId, amount, paymentMethod || 'cash', paymentDate, userId]
  );
}
