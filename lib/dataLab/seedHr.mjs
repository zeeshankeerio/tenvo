/**
 * HR / payroll depth for data-lab demos.
 */

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

const EMPLOYEE_PRESETS = {
  PK: [
    { code: 'EMP-001', name: 'Ali Hassan', department: 'Sales', designation: 'Sales Executive', salary: 65000 },
    { code: 'EMP-002', name: 'Fatima Khan', department: 'Accounts', designation: 'Accountant', salary: 85000 },
    { code: 'EMP-003', name: 'Usman Malik', department: 'Warehouse', designation: 'Store Keeper', salary: 45000 },
  ],
  SG: [
    { code: 'SG-001', name: 'Tan Wei Ming', department: 'Sales', designation: 'Parts Advisor', salary: 3200 },
    { code: 'SG-002', name: 'Priya Nair', department: 'Finance', designation: 'Finance Executive', salary: 4200 },
  ],
  AE: [
    { code: 'AE-001', name: 'Mohammed Al-Rashid', department: 'Operations', designation: 'Ops Manager', salary: 12000 },
    { code: 'AE-002', name: 'Sara Al-Mansoori', department: 'Sales', designation: 'Sales Lead', salary: 9500 },
  ],
};

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} countryIso
 */
export async function seedPayrollEmployees(tx, businessId, countryIso = 'PK') {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const rows = EMPLOYEE_PRESETS[iso] || EMPLOYEE_PRESETS.PK;
  const ids = [];

  for (const row of rows) {
    const existing = await tx.query(
      `SELECT id FROM payroll_employees WHERE business_id = $1::uuid AND employee_code = $2 LIMIT 1`,
      [businessId, row.code]
    );
    if (existing.rows[0]) {
      ids.push(existing.rows[0].id);
      continue;
    }
    const res = await tx.query(
      `INSERT INTO payroll_employees (
        business_id, employee_code, full_name, department, designation,
        join_date, base_salary, status, tax_filer
      ) VALUES ($1::uuid, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '1 year', $6::numeric, 'active', false)
      RETURNING id`,
      [businessId, row.code, row.name, row.department, row.designation, row.salary]
    );
    ids.push(res.rows[0].id);
  }
  return ids;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} userId
 * @param {string[]} employeeIds
 * @param {string} countryIso
 */
export async function seedPayrollRun(tx, businessId, userId, employeeIds, countryIso = 'PK') {
  if (!employeeIds.length) return 0;

  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  if (month === 0) {
    month = 12;
    year -= 1;
  }

  const runNumber = `PAY-${year}${String(month).padStart(2, '0')}`;
  const dup = await tx.query(
    `SELECT id FROM payroll_runs WHERE business_id = $1::uuid AND run_number = $2 LIMIT 1`,
    [businessId, runNumber]
  );
  if (dup.rows[0]) return 1;

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  const runRes = await tx.query(
    `INSERT INTO payroll_runs (
      business_id, run_number, period_month, period_year,
      status, processed_by, processed_at, employee_count
    ) VALUES ($1::uuid, $2, $3, $4, 'completed', $5, NOW(), $6)
    RETURNING id`,
    [businessId, runNumber, month, year, userId, employeeIds.length]
  );
  const runId = runRes.rows[0].id;

  for (const employeeId of employeeIds) {
    const emp = await tx.query(
      `SELECT base_salary FROM payroll_employees WHERE id = $1::uuid LIMIT 1`,
      [employeeId]
    );
    const base = Number(emp.rows[0]?.base_salary || 0);
    const allowances = roundMoney(base * 0.05);
    const gross = roundMoney(base + allowances);
    const taxDed = roundMoney(gross * 0.05);
    const eobi = iso === 'PK' ? 500 : 0;
    const totalDed = roundMoney(taxDed + eobi);
    const net = roundMoney(gross - totalDed);

    totalGross += gross;
    totalDeductions += totalDed;
    totalNet += net;

    await tx.query(
      `INSERT INTO payroll_items (
        business_id, run_id, employee_id, base_salary, allowances, gross_salary,
        tax_deduction, eobi, total_deductions, net_salary, payment_status, payment_method
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::numeric, $5::numeric, $6::numeric,
        $7::numeric, $8::numeric, $9::numeric, $10::numeric, 'paid', 'bank_transfer'
      )`,
      [businessId, runId, employeeId, base, allowances, gross, taxDed, eobi, totalDed, net]
    );
  }

  await tx.query(
    `UPDATE payroll_runs SET total_gross = $2::numeric, total_deductions = $3::numeric, total_net = $4::numeric
     WHERE id = $1::uuid`,
    [runId, roundMoney(totalGross), roundMoney(totalDeductions), roundMoney(totalNet)]
  );

  return 1;
}

/**
 * @param {import('pg').PoolClient} tx
 * @param {string} businessId
 * @param {string} userId
 * @param {string} countryIso
 */
export async function seedPayrollStack(tx, businessId, userId, countryIso = 'PK') {
  const employeeIds = await seedPayrollEmployees(tx, businessId, countryIso);
  const runs = await seedPayrollRun(tx, businessId, userId, employeeIds, countryIso);
  return { employees: employeeIds.length, payrollRuns: runs };
}
