'use server';

import pool from '@/lib/db';
import { checkFiscalPeriodOpen } from '@/lib/actions/basic/fiscal';
import { ACCOUNT_CODES, DEFAULT_COA } from '@/lib/config/accounting';
import { withGuard } from '@/lib/rbac/serverGuard';
import { AccountingService } from '@/lib/services/AccountingService';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

/**
 * Authentication helper for all accounting actions
 */
async function checkAuth(businessId, client = null, permission = 'finance.view_gl') {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Get GL Account by Type (Dynamic Lookup)
 * Replaces hardcoded account codes with database-driven lookups
 * 
 * @param {string} businessId - Business ID
 * @param {string} accountType - Account type: 'inventory', 'cogs', 'revenue', 'ar', 'ap', 'cash', etc.
 * @param {object} txClient - Optional transaction client
 * @returns {Promise<{id: string, code: string, name: string}>}
 */
export async function getGLAccountByType(businessId, accountType, txClient = null) {
    const client = txClient || await pool.connect();
    const shouldRelease = !txClient;

    try {
        const query = `
            SELECT id, code, name, type
            FROM gl_accounts 
            WHERE business_id = $1 
              AND type = $2 
              AND is_active = true
            LIMIT 1
        `;

        const result = await client.query(query, [businessId, accountType]);

        if (result.rows.length === 0) {
            throw new Error(`GL Account not found for type: ${accountType}. Please ensure Chart of Accounts is properly seeded.`);
        }

        return result.rows[0];
    } finally {
        if (shouldRelease) client.release();
    }
}

/**
 * Get multiple GL accounts at once for efficiency
 * 
 * @param {string} businessId
 * @param {string[]} accountTypes - Array of account types
 * @param {object} txClient - Optional transaction client
 * @returns {Promise<Object>} Map of accountType -> account object
 */
export async function getGLAccountsByTypes(businessId, accountTypes, txClient = null) {
    const client = txClient || await pool.connect();
    const shouldRelease = !txClient;

    try {
        const query = `
            SELECT id, code, name, type
            FROM gl_accounts 
            WHERE business_id = $1 
              AND type = ANY($2::text[])
              AND is_active = true
        `;

        const result = await client.query(query, [businessId, accountTypes]);

        // Create a map for easy lookup
        const accountMap = {};
        result.rows.forEach(account => {
            accountMap[account.type] = account;
        });

        // Verify all requested types were found
        const missingTypes = accountTypes.filter(type => !accountMap[type]);
        if (missingTypes.length > 0) {
            throw new Error(`GL Accounts not found for types: ${missingTypes.join(', ')}. Please ensure Chart of Accounts is properly seeded.`);
        }

        return accountMap;
    } finally {
        if (shouldRelease) client.release();
    }
}



/**
 * Create GL Entry with Journal Grouping
 */
export async function createGLEntryAction(data, txClient = null) {
    try {
        const session = await checkAuth(data.businessId || data.business_id, txClient, 'finance.manage_accounts');
        
        const result = await AccountingService.createJournalEntry({
            ...data,
            userId: session.user.id
        }, txClient);

        return { success: true, ...result };
    } catch (error) {
        console.error('createGLEntryAction error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * [NEW] Create a complete atomic Journal Entry (Double-Entry)
 * This is the preferred method for JournalEntryForm to ensure atomicity.
 */
export async function createJournalAction(data) {
    try {
        const session = await checkAuth(data.businessId || data.business_id, null, 'finance.manage_accounts');
        
        const result = await AccountingService.createJournalEntry({
            ...data,
            userId: session.user.id
        });

        return { success: true, ...result };
    } catch (error) {
        console.error('createJournalAction error:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Get GL Account Balance
 * 
 * @param {string} businessId - Business UUID
 * @param {string} accountId - Account UUID
 * @param {string|Date} [asOfDate] - Optional date to get balance as of
 * @returns {Promise<{success: boolean, balance?: number, total_debit?: number, total_credit?: number, error?: string}>}
 */
export async function getGLAccountBalance(businessId, accountId, asOfDate = null) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.view_gl');

        let query = `
            SELECT
                COALESCE(SUM(debit), 0) as total_debit,
                COALESCE(SUM(credit), 0) as total_credit,
                COALESCE(SUM(debit - credit), 0) as balance
            FROM gl_entries
            WHERE business_id = $1 AND account_id = $2
        `;

        /** @type {any[]} */
        const params = [businessId, accountId];

        if (asOfDate) {
            query += ` AND transaction_date <= $3`;
            params.push(asOfDate);
        }

        const result = await client.query(query, params);

        return {
            success: true,
            balance: parseFloat(result.rows[0].balance || 0),
            total_debit: parseFloat(result.rows[0].total_debit || 0),
            total_credit: parseFloat(result.rows[0].total_credit || 0)
        };
    } catch (error) {
        console.error('Get GL Account Balance Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get Trial Balance
 * 
 * @param {string} businessId - Business UUID
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {Promise<{success: boolean, accounts?: Array<Object>, totals?: Object, error?: string}>}
 */
export async function getTrialBalanceAction(businessId, startDate, endDate) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.view_reports');

        const query = `
            SELECT
                a.id,
                a.code,
                a.name,
                a.type,
                COALESCE(SUM(e.debit), 0) as total_debit,
                COALESCE(SUM(e.credit), 0) as total_credit,
                COALESCE(SUM(e.debit - e.credit), 0) as balance
            FROM gl_accounts a
            LEFT JOIN gl_entries e ON a.id = e.account_id 
                AND e.business_id = $1
                AND e.transaction_date BETWEEN $2 AND $3
            WHERE a.business_id = $1 AND a.is_active = true
            GROUP BY a.id, a.code, a.name, a.type
            ORDER BY a.code
        `;

        const result = await client.query(query, [businessId, startDate, endDate]);

        // Calculate totals with precision handling
        const totals = result.rows.reduce((acc, row) => {
            acc.total_debit += parseFloat(row.total_debit);
            acc.total_credit += parseFloat(row.total_credit);
            return acc;
        }, { total_debit: 0, total_credit: 0 });

        // Round final totals
        totals.total_debit = Math.round(totals.total_debit * 100) / 100;
        totals.total_credit = Math.round(totals.total_credit * 100) / 100;

        return {
            success: true,
            accounts: result.rows.map(row => ({
                ...row,
                total_debit: parseFloat(row.total_debit),
                total_credit: parseFloat(row.total_credit),
                balance: parseFloat(row.balance)
            })),
            totals
        };
    } catch (error) {
        console.error('Get Trial Balance Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Seed Chart of Accounts for a business
 * Creates standard GL accounts if they don't exist
 * 
 * @param {string} businessId - Business UUID
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function seedChartOfAccountsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.manage_accounts');
        await client.query('BEGIN');

        // Standard Chart of Accounts from Configuration
        const standardAccounts = DEFAULT_COA;

        for (const account of standardAccounts) {
            // Check if account already exists
            const checkQuery = `
                SELECT id FROM gl_accounts 
                WHERE business_id = $1 AND code = $2
            `;
            const existing = await client.query(checkQuery, [businessId, account.code]);

            if (existing.rows.length === 0) {
                const insertQuery = `
                    INSERT INTO gl_accounts(business_id, code, name, type, description, is_active, is_system)
                    VALUES($1, $2, $3, $4, $5, true, $6)
                `;
                await client.query(insertQuery, [
                    businessId,
                    account.code,
                    account.name,
                    account.type,
                    account.description || account.name,
                    account.is_system !== undefined ? account.is_system : true
                ]);
            }
        }

        await client.query('COMMIT');
        return { success: true, message: 'Chart of Accounts seeded successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed COA Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get all GL Accounts for a business
 * 
 * @param {string} businessId - Business UUID
 * @returns {Promise<{success: boolean, accounts?: Array<Object>, error?: string}>}
 */
export async function getGLAccountsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.view_gl');
        const query = `
            SELECT id, code, name, type, description, is_active, parent_id
            FROM gl_accounts
            WHERE business_id = $1
            ORDER BY code ASC
        `;
        const result = await client.query(query, [businessId]);

        return { success: true, accounts: result.rows };
    } catch (error) {
        console.error('Get GL Accounts Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get GL Entries (General Ledger Report)
 * 
 * @param {string} businessId - Business UUID
 * @param {Object} params - Query parameters
 * @param {string} [params.accountId] - Filter by Account UUID
 * @param {string|Date} [params.startDate] - Filter by start date
 * @param {string|Date} [params.endDate] - Filter by end date
 * @param {number} [params.limit=100] - Pagination limit
 * @param {number} [params.offset=0] - Pagination offset
 * @returns {Promise<{success: boolean, entries?: Array<Object>, error?: string}>}
 */
export async function getGLEntriesAction(businessId, params = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.view_gl');
        const { accountId, startDate, endDate, limit = 100, offset = 0 } = params;

        let openingBalance = 0;
        const isAllAccounts = !accountId || accountId === 'all';

        // [NEW] Calculate Opening Balance if start date is provided
        if (startDate) {
            let obQuery = `
                SELECT COALESCE(SUM(debit - credit), 0) as balance
                FROM gl_entries
                WHERE business_id = $1 AND transaction_date < $2
            `;
            const obParams = [businessId, startDate];

            if (!isAllAccounts) {
                obQuery = `
                    SELECT COALESCE(SUM(debit - credit), 0) as balance
                    FROM gl_entries
                    WHERE business_id = $1 AND account_id = $2 AND transaction_date < $3
                `;
                obParams.push(accountId);
            }

            const obResult = await client.query(obQuery, obParams);
            openingBalance = parseFloat(obResult.rows[0].balance || 0);
        }

        let query = `
            SELECT
                ge.id,
                ge.transaction_date,
                ge.reference_type,
                ge.reference_id,
                ge.description,
                ge.debit,
                ge.credit,
                ge.created_at,
                ga.code as account_code,
                ga.name as account_name,
                ga.type as account_type
            FROM gl_entries ge
            JOIN gl_accounts ga ON ge.account_id = ga.id
            WHERE ge.business_id = $1
        `;

        /** @type {any[]} */
        const queryParams = [businessId];
        let paramIndex = 2;

        if (!isAllAccounts) {
            query += ` AND ge.account_id = $${paramIndex} `;
            queryParams.push(accountId);
            paramIndex++;
        }

        if (startDate) {
            query += ` AND ge.transaction_date >= $${paramIndex} `;
            queryParams.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND ge.transaction_date <= $${paramIndex} `;
            queryParams.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY ge.transaction_date DESC, ge.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1} `;
        queryParams.push(limit, offset);

        const result = await client.query(query, queryParams);

        // Map to nested structure for frontend compatibility
        const mappedEntries = result.rows.map(row => ({
            ...row,
            account: {
                code: row.account_code,
                name: row.account_name,
                type: row.account_type
            }
        }));

        return { success: true, entries: mappedEntries, openingBalance };
    } catch (error) {
        console.error('Get GL Entries Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get Account Balance by Code
 * 
 * @param {string} businessId - Business UUID
 * @param {string} accountCode - GL Account Code (e.g., '1001')
 * @returns {Promise<{success: boolean, account?: Object, error?: string}>}
 */
export async function getAccountBalanceAction(businessId, accountCode) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.view_gl');

        const query = `
            SELECT
                ga.id,
                ga.code,
                ga.name,
                ga.type,
                COALESCE(SUM(ge.debit), 0) as total_debit,
                COALESCE(SUM(ge.credit), 0) as total_credit,
                COALESCE(SUM(ge.debit - ge.credit), 0) as balance
            FROM gl_accounts ga
            LEFT JOIN gl_entries ge ON ga.id = ge.account_id
            WHERE ga.business_id = $1 AND ga.code = $2
            GROUP BY ga.id, ga.code, ga.name, ga.type
        `;

        const result = await client.query(query, [businessId, accountCode]);

        if (result.rows.length === 0) {
            return { success: false, error: 'Account not found' };
        }

        return {
            success: true,
            account: {
                ...result.rows[0],
                total_debit: parseFloat(result.rows[0].total_debit),
                total_credit: parseFloat(result.rows[0].total_credit),
                balance: parseFloat(result.rows[0].balance)
            }
        };
    } catch (error) {
        console.error('Get Account Balance Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Update GL Account
 * 
 * @param {string} businessId - Business UUID
 * @param {string} accountId - Account UUID
 * @param {Object} data - Update data
 * @returns {Promise<{success: boolean, account?: Object, error?: string}>}
 */
export async function updateGLAccountAction(businessId, accountId, data) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.manage_accounts');

        // [GUARD] Cannot modify certain properties if it's a system account
        const checkQuery = 'SELECT is_system, code FROM gl_accounts WHERE id = $1 AND business_id = $2';
        const current = await client.query(checkQuery, [accountId, businessId]);

        if (current.rows.length === 0) throw new Error('Account not found');

        if (current.rows[0].is_system) {
            // Cannot change code or type of system accounts
            if (data.code || data.type) {
                throw new Error('Architectural Guard: Cannot modify Code or Type of standard system accounts.');
            }
        }

        const fields = [];
        const values = [accountId, businessId];
        let paramIdx = 3;

        if (data.name) {
            fields.push(`name = $${paramIdx++}`);
            values.push(data.name);
        }
        if (data.description) {
            fields.push(`description = $${paramIdx++}`);
            values.push(data.description);
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramIdx++}`);
            values.push(data.is_active);
        }

        if (fields.length === 0) return { success: true };

        const query = `
            UPDATE gl_accounts 
            SET ${fields.join(', ')}
            WHERE id = $1 AND business_id = $2
            RETURNING *
        `;

        const result = await client.query(query, values);
        return { success: true, account: result.rows[0] };
    } catch (error) {
        console.error('Update GL Account Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Delete GL Account (Soft check for system accounts)
 * 
 * @param {string} businessId - Business UUID
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function deleteGLAccountAction(businessId, accountId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'finance.manage_accounts');

        // [GUARD] Check is_system status
        const checkQuery = 'SELECT is_system, name FROM gl_accounts WHERE id = $1 AND business_id = $2';
        const res = await client.query(checkQuery, [accountId, businessId]);

        if (res.rows.length === 0) throw new Error('Account not found');
        
        // Assert account belongs to business before deleting
        await assertEntityBelongsToBusiness(client, 'gl_account', accountId, businessId);

        if (res.rows[0].is_system) {
            throw new Error(`Architectural Guard: System account "${res.rows[0].name}" cannot be deleted as it is required for core automation (Invoicing/Inventory).`);
        }

        // Check if account has entries
        const entriesCheck = 'SELECT id FROM gl_entries WHERE account_id = $1 LIMIT 1';
        const hasEntries = await client.query(entriesCheck, [accountId]);

        if (hasEntries.rows.length > 0) {
            throw new Error('Account cannot be deleted because it has existing transactions. Consider deactivating it instead.');
        }

        await client.query('DELETE FROM gl_accounts WHERE id = $1 AND business_id = $2', [accountId, businessId]);
        return { success: true, message: 'Account deleted successfully' };
    } catch (error) {
        console.error('Delete GL Account Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Initialize Chart of Accounts (Alias for seedChartOfAccountsAction)
 * 
 * @param {string} businessId - Business UUID
 * @param {string} [coaTemplate='standard'] - COA template to use
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function initializeCOAAction(businessId, coaTemplate = 'standard') {
    return await seedChartOfAccountsAction(businessId);
}
