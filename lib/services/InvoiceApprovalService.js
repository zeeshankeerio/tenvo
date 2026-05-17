import pool from '@/lib/db';
import { InvoiceService } from './InvoiceService';

/**
 * Invoice Approval Service
 * Manages invoice approval workflows
 */
export const InvoiceApprovalService = {
    /**
     * Submit invoice for approval
     */
    async submitForApproval(businessId, invoiceId, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get invoice
            const invRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [invoiceId, businessId]
            );
            if (invRes.rows.length === 0) throw new Error('Invoice not found');
            const invoice = invRes.rows[0];

            if (invoice.approval_status === 'approved') {
                throw new Error('Invoice already approved');
            }

            // Update invoice status
            await client.query(
                `UPDATE invoices 
                 SET approval_status = $1, status = $2, updated_at = NOW()
                 WHERE id = $3 AND business_id = $4`,
                ['pending', 'awaiting_approval', invoiceId, businessId]
            );

            await client.query('COMMIT');
            return { success: true, message: 'Invoice submitted for approval' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Approve invoice
     */
    async approveInvoice(businessId, invoiceId, approvedBy, notes = '') {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get invoice
            const invRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [invoiceId, businessId]
            );
            if (invRes.rows.length === 0) throw new Error('Invoice not found');
            const invoice = invRes.rows[0];

            if (invoice.approval_status === 'approved') {
                throw new Error('Invoice already approved');
            }

            // Create approval record
            await client.query(
                `INSERT INTO invoice_approvals (business_id, invoice_id, approved_by, approval_status, notes)
                 VALUES ($1, $2, $3, $4, $5)`,
                [businessId, invoiceId, approvedBy, 'approved', notes]
            );

            // Update invoice
            await client.query(
                `UPDATE invoices 
                 SET approval_status = $1, approval_by = $2, approval_date = NOW(), 
                     status = CASE WHEN status = 'awaiting_approval' THEN 'approved' ELSE status END,
                     updated_at = NOW()
                 WHERE id = $3 AND business_id = $4`,
                ['approved', approvedBy, invoiceId, businessId]
            );

            await client.query('COMMIT');
            return { success: true, message: 'Invoice approved successfully' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Reject invoice
     */
    async rejectInvoice(businessId, invoiceId, rejectedBy, reason = '') {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get invoice
            const invRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE',
                [invoiceId, businessId]
            );
            if (invRes.rows.length === 0) throw new Error('Invoice not found');

            // Create rejection record
            await client.query(
                `INSERT INTO invoice_approvals (business_id, invoice_id, approved_by, approval_status, notes)
                 VALUES ($1, $2, $3, $4, $5)`,
                [businessId, invoiceId, rejectedBy, 'rejected', reason]
            );

            // Update invoice back to draft
            await client.query(
                `UPDATE invoices 
                 SET approval_status = $1, status = $2, updated_at = NOW()
                 WHERE id = $3 AND business_id = $4`,
                ['rejected', 'draft', invoiceId, businessId]
            );

            await client.query('COMMIT');
            return { success: true, message: 'Invoice rejected' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Get approval history
     */
    async getApprovalHistory(businessId, invoiceId) {
        const client = await pool.connect();
        try {
            const res = await client.query(
                `SELECT 
                    ia.*, 
                    u.name as approver_name, u.email as approver_email
                 FROM invoice_approvals ia
                 LEFT JOIN "user" u ON ia.approved_by = u.id
                 WHERE ia.business_id = $1 AND ia.invoice_id = $2
                 ORDER BY ia.created_at DESC`,
                [businessId, invoiceId]
            );
            return res.rows;
        } finally {
            client.release();
        }
    },

    /**
     * Schedule payment reminder
     */
    async schedulePaymentReminder(businessId, invoiceId, reminderType) {
        const client = await pool.connect();
        try {
            // Get invoice for due date
            const invRes = await client.query(
                'SELECT due_date FROM invoices WHERE id = $1 AND business_id = $2',
                [invoiceId, businessId]
            );
            if (invRes.rows.length === 0) throw new Error('Invoice not found');
            const invoice = invRes.rows[0];

            // Calculate scheduled date based on reminder type
            const dueDate = new Date(invoice.due_date);
            let scheduledDate = new Date(dueDate);

            const reminderDays = {
                'first_due': 0,
                'overdue_3days': 3,
                'overdue_7days': 7,
                'overdue_14days': 14,
                'overdue_30days': 30,
            };

            if (reminderDays[reminderType] !== undefined) {
                scheduledDate.setDate(scheduledDate.getDate() + reminderDays[reminderType]);
            }

            // Insert reminder
            await client.query(
                `INSERT INTO invoice_payment_reminders (business_id, invoice_id, reminder_type, scheduled_date)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (invoice_id, reminder_type) DO NOTHING`,
                [businessId, invoiceId, reminderType, scheduledDate.toISOString().split('T')[0]]
            );

            return { success: true };
        } finally {
            client.release();
        }
    },

    /**
     * Get pending reminders
     */
    async getPendingReminders(businessId, limit = 100) {
        const client = await pool.connect();
        try {
            const res = await client.query(
                `SELECT 
                    r.*, 
                    i.invoice_number, i.grand_total, i.due_date,
                    c.name as customer_name, c.email as customer_email
                 FROM invoice_payment_reminders r
                 JOIN invoices i ON r.invoice_id = i.id
                 LEFT JOIN customers c ON i.customer_id = c.id
                 WHERE r.business_id = $1 
                   AND r.is_sent = FALSE 
                   AND r.scheduled_date <= CURRENT_DATE
                 ORDER BY r.scheduled_date ASC
                 LIMIT $2`,
                [businessId, limit]
            );
            return res.rows;
        } finally {
            client.release();
        }
    },

    /**
     * Mark reminder as sent
     */
    async markReminderSent(businessId, reminderId) {
        const client = await pool.connect();
        try {
            await client.query(
                `UPDATE invoice_payment_reminders 
                 SET is_sent = TRUE, sent_date = NOW()
                 WHERE id = $1 AND business_id = $2`,
                [reminderId, businessId]
            );
            return { success: true };
        } finally {
            client.release();
        }
    },

    /**
     * Get pending approvals queue
     */
    async getPendingApprovalsQueue(businessId, limit = 50) {
        const client = await pool.connect();
        try {
            const res = await client.query(
                `SELECT 
                    i.*, 
                    c.name as customer_name, c.email as customer_email,
                    u.name as creator_name
                 FROM invoices i
                 LEFT JOIN customers c ON i.customer_id = c.id
                 LEFT JOIN "user" u ON i.created_by = u.id
                 WHERE i.business_id = $1 
                   AND i.approval_status = 'pending'
                 ORDER BY i.created_at ASC
                 LIMIT $2`,
                [businessId, limit]
            );
            return res.rows;
        } finally {
            client.release();
        }
    },
};
