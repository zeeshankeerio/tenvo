/**
 * Document Sequence Service
 * 
 * Enterprise-grade document numbering service with concurrency safety,
 * sequence management, and audit capabilities.
 * 
 * Features:
 * - Concurrency-safe number generation using PostgreSQL advisory locks
 * - Per-business, per-document-type sequences
 * - Customizable prefixes and padding
 * - Sequence reset with validation
 * - Sequence status reporting
 * 
 * @module lib/services/DocumentSequenceService
 */

import pool from '@/lib/db';
import { generateScopedDocumentNumber } from '@/lib/db/documentNumber';

export const DocumentSequenceService = {

    /**
     * Internal helper for database connection
     */
    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Generate Next Document Number
     * 
     * Generates the next sequential document number for a given business and document type.
     * Uses PostgreSQL advisory locks to ensure concurrency safety.
     * 
     * @param {Object} params - Generation parameters
     * @param {string} params.businessId - Business ID (UUID)
     * @param {string} params.documentType - Document type (e.g., 'invoice', 'purchase', 'quotation')
     * @param {string} params.prefix - Number prefix (e.g., 'INV-', 'PO-', 'QT-')
     * @param {number} params.padLength - Zero-padding length (default: 6)
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<string>} Generated document number (e.g., 'INV-000123')
     * 
     * @example
     * const invoiceNumber = await DocumentSequenceService.generateNumber({
     *   businessId: 'uuid-here',
     *   documentType: 'invoice',
     *   prefix: 'INV-',
     *   padLength: 6
     * });
     * // Returns: 'INV-000123'
     */
    async generateNumber(params, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            const { businessId, documentType, prefix, padLength = 6 } = params;

            if (!businessId) throw new Error('businessId is required');
            if (!documentType) throw new Error('documentType is required');
            if (!prefix) throw new Error('prefix is required');

            // Map document type to table and column
            const tableMap = {
                invoice: { table: 'invoices', column: 'invoice_number' },
                purchase: { table: 'purchases', column: 'purchase_number' },
                quotation: { table: 'quotations', column: 'quotation_number' },
                sales_order: { table: 'sales_orders', column: 'order_number' },
                delivery_challan: { table: 'delivery_challans', column: 'challan_number' },
                pos_transaction: { table: 'pos_transactions', column: 'transaction_number' },
                stock_transfer: { table: 'stock_transfers', column: 'transfer_number' },
                production_order: { table: 'production_orders', column: 'order_number' },
                credit_note: { table: 'credit_notes', column: 'credit_note_number' },
                expense: { table: 'expenses', column: 'expense_number' },
                restaurant_order: { table: 'restaurant_orders', column: 'order_number' },
                payroll_run: { table: 'payroll_runs', column: 'run_number' },
                journal_entry: { table: 'journal_entries', column: 'journal_number' },
            };

            const mapping = tableMap[documentType];
            if (!mapping) {
                throw new Error(`Unsupported document type: ${documentType}`);
            }

            // Generate number using existing utility
            const documentNumber = await generateScopedDocumentNumber(client, {
                businessId,
                table: mapping.table,
                column: mapping.column,
                prefix,
                padLength
            });

            return documentNumber;
        } finally {
            if (shouldManageTransaction && !txClient) client.release();
        }
    },

    /**
     * Reset Sequence
     * 
     * Resets a document sequence to a specific starting number.
     * Validates that no documents exist with numbers higher than the new start.
     * 
     * @param {string} businessId - Business ID
     * @param {string} documentType - Document type
     * @param {number} startNumber - New starting number
     * @param {Object} context - { userId, reason }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Reset result
     * @throws {Error} If higher-numbered documents exist
     * 
     * @example
     * await DocumentSequenceService.resetSequence(
     *   businessId,
     *   'invoice',
     *   1000,
     *   { userId: 'user-id', reason: 'New fiscal year' }
     * );
     */
    async resetSequence(businessId, documentType, startNumber, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { userId, reason } = context;

            // Map document type to table and column
            const tableMap = {
                invoice: { table: 'invoices', column: 'invoice_number' },
                purchase: { table: 'purchases', column: 'purchase_number' },
                quotation: { table: 'quotations', column: 'quotation_number' },
                sales_order: { table: 'sales_orders', column: 'order_number' },
                delivery_challan: { table: 'delivery_challans', column: 'challan_number' },
                pos_transaction: { table: 'pos_transactions', column: 'transaction_number' },
                credit_note: { table: 'credit_notes', column: 'credit_note_number' },
                expense: { table: 'expenses', column: 'expense_number' },
                restaurant_order: { table: 'restaurant_orders', column: 'order_number' },
                payroll_run: { table: 'payroll_runs', column: 'run_number' },
                journal_entry: { table: 'journal_entries', column: 'journal_number' },
            };

            const mapping = tableMap[documentType];
            if (!mapping) {
                throw new Error(`Unsupported document type: ${documentType}`);
            }

            // Check for existing documents with higher numbers
            const checkQuery = `
                SELECT COUNT(*) as count,
                       MAX(CAST(NULLIF(REGEXP_REPLACE(${mapping.column}, '[^0-9]', '', 'g'), '') AS INTEGER)) as max_num
                FROM ${mapping.table}
                WHERE business_id = $1
            `;

            const checkRes = await client.query(checkQuery, [businessId]);
            const maxNum = Number(checkRes.rows[0]?.max_num || 0);

            if (maxNum >= startNumber) {
                throw new Error(
                    `Cannot reset sequence to ${startNumber}. ` +
                    `Existing documents found with numbers up to ${maxNum}. ` +
                    `New start number must be greater than ${maxNum}.`
                );
            }

            // Record sequence reset in document_sequences table
            await client.query(`
                INSERT INTO document_sequences (
                    business_id, document_type, current_number,
                    prefix, reset_by, reset_reason, reset_at
                )
                VALUES ($1, $2, $3, '', $4, $5, NOW())
                ON CONFLICT (business_id, document_type)
                DO UPDATE SET
                    current_number = EXCLUDED.current_number,
                    reset_by = EXCLUDED.reset_by,
                    reset_reason = EXCLUDED.reset_reason,
                    reset_at = NOW()
            `, [businessId, documentType, startNumber - 1, userId, reason]);

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                documentType,
                newStartNumber: startNumber,
                previousMaxNumber: maxNum,
                message: `Sequence reset to start at ${startNumber}`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction && !txClient) client.release();
        }
    },

    /**
     * Get Sequence Status
     * 
     * Returns the current status of a document sequence including
     * the next number that will be generated and configuration.
     * 
     * @param {string} businessId - Business ID
     * @param {string} documentType - Document type
     * @returns {Promise<Object>} Sequence status
     * 
     * @example
     * const status = await DocumentSequenceService.getSequenceStatus(businessId, 'invoice');
     * // Returns: { documentType: 'invoice', currentNumber: 123, nextNumber: 124, prefix: 'INV-' }
     */
    async getSequenceStatus(businessId, documentType) {
        const client = await this.getClient();

        try {
            // Map document type to table and column
            const tableMap = {
                invoice: { table: 'invoices', column: 'invoice_number', defaultPrefix: 'INV-' },
                purchase: { table: 'purchases', column: 'purchase_number', defaultPrefix: 'PO-' },
                quotation: { table: 'quotations', column: 'quotation_number', defaultPrefix: 'QT-' },
                sales_order: { table: 'sales_orders', column: 'order_number', defaultPrefix: 'SO-' },
                delivery_challan: { table: 'delivery_challans', column: 'challan_number', defaultPrefix: 'DC-' },
                pos_transaction: { table: 'pos_transactions', column: 'transaction_number', defaultPrefix: 'POS-' },
                credit_note: { table: 'credit_notes', column: 'credit_note_number', defaultPrefix: 'CN-' },
                expense: { table: 'expenses', column: 'expense_number', defaultPrefix: 'EXP-' },
                restaurant_order: { table: 'restaurant_orders', column: 'order_number', defaultPrefix: 'ORD-' },
                payroll_run: { table: 'payroll_runs', column: 'run_number', defaultPrefix: 'PAY-' },
                journal_entry: { table: 'journal_entries', column: 'journal_number', defaultPrefix: 'JE-' },
            };

            const mapping = tableMap[documentType];
            if (!mapping) {
                throw new Error(`Unsupported document type: ${documentType}`);
            }

            // Get current max number from documents
            const query = `
                SELECT COALESCE(
                    MAX(CAST(NULLIF(REGEXP_REPLACE(${mapping.column}, '[^0-9]', '', 'g'), '') AS INTEGER)),
                    0
                ) AS current_num
                FROM ${mapping.table}
                WHERE business_id = $1
            `;

            const result = await client.query(query, [businessId]);
            const currentNumber = Number(result.rows[0]?.current_num || 0);
            const nextNumber = currentNumber + 1;

            // Get sequence configuration if exists
            const configRes = await client.query(`
                SELECT prefix, reset_at, reset_by, reset_reason
                FROM document_sequences
                WHERE business_id = $1 AND document_type = $2
            `, [businessId, documentType]);

            const config = configRes.rows[0];

            return {
                success: true,
                documentType,
                currentNumber,
                nextNumber,
                prefix: config?.prefix || mapping.defaultPrefix,
                lastReset: config?.reset_at || null,
                resetBy: config?.reset_by || null,
                resetReason: config?.reset_reason || null
            };
        } finally {
            client.release();
        }
    },

    /**
     * Get All Sequences for Business
     * 
     * Returns status of all document sequences for a business
     * 
     * @param {string} businessId - Business ID
     * @returns {Promise<Array>} Array of sequence statuses
     */
    async getAllSequences(businessId) {
        const documentTypes = [
            'invoice',
            'purchase',
            'quotation',
            'sales_order',
            'delivery_challan',
            'pos_transaction',
            'credit_note',
            'expense',
            'restaurant_order',
            'payroll_run',
            'journal_entry'
        ];

        const statuses = await Promise.all(
            documentTypes.map(type => this.getSequenceStatus(businessId, type))
        );

        return statuses;
    }
};
