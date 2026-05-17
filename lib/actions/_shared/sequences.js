'use server';

/**
 * Concurrency-Safe Document Number Generator
 *
 * Uses PostgreSQL advisory locks per (businessId + prefix) to prevent
 * race conditions when generating sequential document numbers.
 *
 * Advisory locks are automatically released at the end of the transaction,
 * so they MUST be used within a BEGIN...COMMIT/ROLLBACK block.
 *
 * @module sequences
 */

/**
 * Generate the next sequential document number within a transaction.
 *
 * @param {import('pg').PoolClient} client  - Active transaction client (required; must already be inside BEGIN)
 * @param {string} businessId              - Business UUID
 * @param {string} prefix                  - Document prefix (e.g. 'INV', 'POS', 'PO', 'EXP', 'JE')
 * @param {string} tableName              - Target table name (e.g. 'invoices', 'pos_transactions')
 * @param {string} columnName             - Column holding the document number (e.g. 'invoice_number')
 * @param {number} [padLength=6]          - Zero-padded length (default 6 -> '000001')
 * @returns {Promise<string>}             - Generated number, e.g. 'INV-000042'
 *
 * @example
 * await client.query('BEGIN');
 * const txNumber = await generateDocumentNumber(client, businessId, 'POS', 'pos_transactions', 'transaction_number');
 * // txNumber -> 'POS-000001'
 */
export async function generateDocumentNumber(client, businessId, prefix, tableName, columnName, padLength = 6) {
    if (!client) {
        throw new Error('generateDocumentNumber requires an active transaction client');
    }

    // Acquire an advisory lock scoped to this (business + prefix) pair.
    // pg_advisory_xact_lock releases automatically on COMMIT/ROLLBACK.
    // hashtext gives us a deterministic int from a string key.
    await client.query(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        [`${businessId}:${prefix}`]
    );

    // Safely extract the max numeric suffix from existing document numbers
    const result = await client.query(
        `SELECT COALESCE(
            MAX(
                CAST(
                    NULLIF(REGEXP_REPLACE(${columnName}, '[^0-9]', '', 'g'), '')
                    AS INTEGER
                )
            ), 0
        ) + 1 AS next_num
        FROM ${tableName}
        WHERE business_id = $1`,
        [businessId]
    );

    const nextNum = result.rows[0].next_num;
    return `${prefix}-${String(nextNum).padStart(padLength, '0')}`;
}
