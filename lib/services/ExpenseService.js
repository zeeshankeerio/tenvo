import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { AccountingService } from './AccountingService';

/**
 * Expense Service (Enterprise SOA)
 * Orchestrates Expense recording, Vendor liabilities, and Cash outflows.
 */
export const ExpenseService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Create Expense
     */
    async createExpense(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');
            const { businessId, ...eData } = data;

            // 1. Generate Doc Number
            const expenseNumber = await DocumentSequenceService.generateNumber({
                businessId, documentType: 'expense', prefix: 'EXP-', padLength: 6
            }, client);

            // 2. Create Record
            const res = await client.query(`
                INSERT INTO expenses (
                    business_id, expense_number, account_id, category,
                    amount, tax_amount, vendor_id, payment_method,
                    date, description, receipt_url, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `, [
                businessId, expenseNumber, eData.accountId, eData.category,
                eData.amount, eData.taxAmount || 0, eData.vendorId, eData.paymentMethod,
                eData.date || new Date(), eData.description, eData.receiptUrl, 'recorded'
            ]);
            const expense = res.rows[0];

            // 3. Update Vendor Balance if credit
            if (eData.paymentMethod === 'credit' && eData.vendorId) {
                await client.query(`
                    UPDATE vendors SET outstanding_balance = outstanding_balance + $1, updated_at = NOW()
                    WHERE id = $2 AND business_id = $3
                `, [eData.amount, eData.vendorId, businessId]);
            }

            // 4. Record Payment if immediate
            if (eData.paymentMethod !== 'credit') {
                const pMode = eData.paymentMethod === 'bank' ? 'bank' : 'cash';
                await client.query(`
                    INSERT INTO payments (
                        business_id, payment_type, reference_type, reference_id,
                        vendor_id, amount, payment_mode, payment_date, notes
                    ) VALUES ($1, 'payment', 'expense', $2, $3, $4, $5, $6, $7)
                `, [
                    businessId, expense.id, eData.vendorId, eData.amount, pMode,
                    eData.date || new Date(), `Expense: ${expenseNumber}`
                ]);
            }

            // 5. Accounting
            await AccountingService.recordBusinessTransaction('expense', {
                businessId, referenceId: expense.id, amount: expense.amount,
                taxAmount: expense.tax_amount, paymentMethod: expense.paymentMethod,
                expenseAccountId: eData.accountId,
                description: `Expense: ${eData.description || eData.category || expenseNumber}`, userId
            }, client);

            if (shouldManageTransaction) await client.query('COMMIT');
            return expense;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Delete Expense
     */
    async deleteExpense(businessId, expenseId, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const eRes = await client.query('SELECT * FROM expenses WHERE id = $1 AND business_id = $2 FOR UPDATE', [expenseId, businessId]);
            if (eRes.rows.length === 0) throw new Error('Expense not found');
            const expense = eRes.rows[0];

            // 1. Soft Delete
            await client.query(`UPDATE expenses SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE id = $1`, [expenseId]);

            // 2. Reverse Balance
            if (expense.payment_method === 'credit' && expense.vendor_id) {
                await client.query(`UPDATE vendors SET outstanding_balance = outstanding_balance - $1 WHERE id = $2`, [expense.amount, expense.vendor_id]);
            }

            // 3. Reverse GL
            await client.query(`DELETE FROM gl_entries WHERE reference_type = 'expense' AND reference_id = $1`, [expenseId]);
            // Also cleanup linked payments
            await client.query(`DELETE FROM payments WHERE reference_type = 'expense' AND reference_id = $1`, [expenseId]);

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    }
};
