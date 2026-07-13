'use server';

import { PayrollService } from '@/lib/services/PayrollService';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { withGuard } from '@/lib/rbac/serverGuard';
import pool from '@/lib/db';

async function checkAuth(businessId, client = null, permission = 'hr.view_employees', feature = 'payroll') {
    const { session } = await withGuard(businessId, { permission, feature, client });
    return session;
}

/**
 * Get next available employee code for a business
 */
export async function getNextEmployeeCodeAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'hr.view_employees', 'payroll');
        
        const result = await client.query(`
            SELECT employee_code
            FROM payroll_employees
            WHERE business_id = $1
            ORDER BY employee_code DESC
            LIMIT 1
        `, [businessId]);
        
        if (result.rows.length === 0) {
            return { success: true, code: 'EMP-0001' };
        }
        
        const lastCode = result.rows[0].employee_code;
        
        // Try to extract number from format EMP-XXXX
        const match = lastCode.match(/EMP-(\d+)/);
        
        if (match) {
            const nextNum = parseInt(match[1]) + 1;
            const code = `EMP-${String(nextNum).padStart(4, '0')}`;
            return { success: true, code };
        }
        
        // Fallback if code doesn't match pattern
        return { success: true, code: 'EMP-0001' };
    } catch (error) {
        console.error('Get next employee code error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

// --- Employee Management ----------------------------------------------------

/**
 * Add an employee to the payroll system
 */
export async function createPayrollEmployeeAction(data) {
    try {
        await checkAuth(data.businessId, null, 'hr.manage_employees', 'payroll');
        const employee = await PayrollService.createEmployee(data);
        return { success: true, employee };
    } catch (error) {
        console.error('Create payroll employee error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all payroll employees for a business
 */
export async function getPayrollEmployeesAction(businessId, status = 'active') {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'hr.view_employees', 'payroll');
        const result = await client.query(
            `SELECT * FROM payroll_employees WHERE business_id = $1 AND status = $2 ORDER BY full_name`,
            [businessId, status]
        );
        return { success: true, employees: result.rows };
    } catch (error) {
        console.error('Get payroll employees error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Update employee details
 */
export async function updatePayrollEmployeeAction(data) {
    try {
        await checkAuth(data.businessId, null, 'hr.manage_employees', 'payroll');
        await PayrollService.updateEmployee(data);
        return { success: true };
    } catch (error) {
        console.error('Update payroll employee error:', error);
        return { success: false, error: error.message };
    }
}

// --- Payroll Processing -----------------------------------------------------

/**
 * Create and process a payroll run for a month
 */
export async function processPayrollAction(data) {
    try {
        const session = await checkAuth(data.businessId, null, 'hr.run_payroll', 'payroll');
        const result = await PayrollService.processPayroll(data, session.user.id);

        auditWrite({
            businessId: data.businessId,
            action: 'process',
            entityType: 'payroll_run',
            entityId: result.runId,
            description: `Processed payroll ${result.runNumber} for ${data.month}/${data.year}`,
            metadata: { runNumber: result.runNumber, month: data.month, year: data.year },
        });

        return { success: true, runId: result.runId };
    } catch (error) {
        console.error('Process payroll action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get payroll runs for a business
 */
export async function getPayrollRunsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'hr.view_payslips', 'payroll');
        const result = await client.query(
            `SELECT * FROM payroll_runs WHERE business_id = $1 ORDER BY period_year DESC, period_month DESC`,
            [businessId]
        );
        return { success: true, runs: result.rows };
    } catch (error) {
        console.error('Get payroll runs error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get payslips for a specific run
 */
export async function getPayslipsAction(businessId, runId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'hr.view_payslips', 'payroll');
        const result = await client.query(`
            SELECT pi.*, pe.full_name, pe.employee_code, pe.department,
                   pe.designation, pe.bank_name, pe.bank_account, pe.cnic
            FROM payroll_items pi
            JOIN payroll_employees pe ON pi.employee_id = pe.id
            JOIN payroll_runs pr ON pi.run_id = pr.id
            WHERE pi.run_id = $1 AND pr.business_id = $2
            ORDER BY pe.full_name
        `, [runId, businessId]);
        return { success: true, payslips: result.rows };
    } catch (error) {
        console.error('Get payslips error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
