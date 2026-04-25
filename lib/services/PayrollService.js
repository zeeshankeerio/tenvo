import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { AccountingService } from './AccountingService';

/**
 * Payroll Service (Enterprise SOA)
 * Manages employee payroll profiles, salary calculations, tax compliance, and disbursement orchestration.
 */
export const PayrollService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Employee Profile Management
     */
    async createEmployee(data, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const res = await client.query(`
                INSERT INTO payroll_employees (
                    business_id, user_id, employee_code, full_name,
                    cnic, phone, email, department, designation,
                    join_date, base_salary, bank_name, bank_account, tax_filer
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            `, [
                data.businessId, data.userId || null, data.employeeCode,
                data.fullName, data.cnic || null, data.phone || null,
                data.email || null, data.department || null, data.designation || null,
                data.joinDate || null, data.baseSalary || 0,
                data.bankName || null, data.bankAccount || null,
                data.taxFiler || false
            ]);
            return res.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    async updateEmployee(data, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            await client.query(`
                UPDATE payroll_employees SET
                    full_name = COALESCE($1, full_name),
                    department = COALESCE($2, department),
                    designation = COALESCE($3, designation),
                    base_salary = COALESCE($4, base_salary),
                    bank_name = COALESCE($5, bank_name),
                    bank_account = COALESCE($6, bank_account),
                    tax_filer = COALESCE($7, tax_filer),
                    phone = COALESCE($8, phone),
                    status = COALESCE($9, status),
                    updated_at = NOW()
                WHERE id = $10 AND business_id = $11
            `, [
                data.fullName, data.department, data.designation,
                data.baseSalary, data.bankName, data.bankAccount,
                data.taxFiler, data.phone, data.status,
                data.employeeId, data.businessId
            ]);
            return { success: true };
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Payroll Processing Logic
     * Orchestrates batch salary calculation and financial posting.
     */
    async processPayroll(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { businessId, month, year, overrides = [] } = data;

            // 1. Duplicate Prevention
            const dupCheck = await client.query(
                `SELECT id FROM payroll_runs WHERE business_id = $1 AND period_month = $2 AND period_year = $3`,
                [businessId, month, year]
            );
            if (dupCheck.rows.length > 0) throw new Error(`Payroll for ${month}/${year} already exists`);

            // 2. Fetch Active Employees
            const empRes = await client.query(
                `SELECT * FROM payroll_employees WHERE business_id = $1 AND status = 'active'`,
                [businessId]
            );
            if (empRes.rows.length === 0) throw new Error('No active employees found to process');

            // 3. Document Number
            const runNumber = await DocumentSequenceService.generateNumber({
                businessId, documentType: 'payroll_run', prefix: 'PAY-', padLength: 6
            }, client);

            // 4. Initial Run Record
            const runRes = await client.query(`
                INSERT INTO payroll_runs (
                    business_id, run_number, period_month, period_year,
                    employee_count, status, processed_by, processed_at
                ) VALUES ($1, $2, $3, $4, $5, 'processing', $6, NOW()) RETURNING *
            `, [businessId, runNumber, month, year, empRes.rows.length, userId]);
            const run = runRes.rows[0];

            let totalGross = 0, totalDeductions = 0, totalNet = 0;
            const overrideMap = overrides.reduce((m, o) => { m[o.employeeId] = o; return m; }, {});

            // 5. Calculation Loop
            for (const emp of empRes.rows) {
                const ovr = overrideMap[emp.id] || {};
                const baseSalary = parseFloat(ovr.baseSalary || emp.base_salary);
                const allowances = parseFloat(ovr.allowances || 0);
                const overtime = parseFloat(ovr.overtime || 0);
                const grossSalary = baseSalary + allowances + overtime;

                // Tax logic (Centralized SLAB calculation)
                let taxDeduction = 0;
                if (emp.tax_filer) {
                    const annualGross = grossSalary * 12;
                    if (annualGross > 600000 && annualGross <= 1200000) taxDeduction = grossSalary * 0.025;
                    else if (annualGross > 1200000 && annualGross <= 2400000) taxDeduction = grossSalary * 0.125;
                    else if (annualGross > 2400000 && annualGross <= 3600000) taxDeduction = grossSalary * 0.200;
                    else if (annualGross > 3600000 && annualGross <= 6000000) taxDeduction = grossSalary * 0.250;
                    else if (annualGross > 6000000) taxDeduction = grossSalary * 0.325;
                }
                taxDeduction = Math.round(taxDeduction * 100) / 100;

                // Statutory Deductions (EOBI Capped)
                const eobi = Math.round(Math.min(grossSalary * 0.01, 350) * 100) / 100;

                const loanDeduction = parseFloat(ovr.loanDeduction || 0);
                const otherDeductions = parseFloat(ovr.otherDeductions || 0);
                const totalDed = taxDeduction + eobi + loanDeduction + otherDeductions;
                const netSalary = Math.round((grossSalary - totalDed) * 100) / 100;

                await client.query(`
                    INSERT INTO payroll_items (
                        business_id, run_id, employee_id, base_salary, allowances, overtime,
                        gross_salary, tax_deduction, eobi, loan_deduction,
                        other_deductions, total_deductions, net_salary
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    businessId, run.id, emp.id, baseSalary, allowances, overtime,
                    grossSalary, taxDeduction, eobi, loanDeduction,
                    otherDeductions, totalDed, netSalary
                ]);

                totalGross += grossSalary;
                totalDeductions += totalDed;
                totalNet += netSalary;
            }

            // 6. Finalize Run
            await client.query(`
                UPDATE payroll_runs SET
                    total_gross = $1, total_deductions = $2, total_net = $3, status = 'completed'
                WHERE id = $4
            `, [totalGross, totalDeductions, totalNet, run.id]);

            // 7. Accounting Orchestration
            await AccountingService.recordBusinessTransaction('payroll_run', {
                businessId, referenceId: run.id,
                totalGross, totalDeductions, totalNet,
                description: `Payroll: ${runNumber} (${month}/${year})`,
                userId
            }, client);

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true, runId: run.id, runNumber };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    }
};
