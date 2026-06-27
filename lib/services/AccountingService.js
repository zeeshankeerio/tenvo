import pool from '@/lib/db';
import { checkFiscalPeriodOpen } from '@/lib/actions/basic/fiscal';
import { ACCOUNT_CODES, DEFAULT_COA } from '../config/accounting';
import { DocumentSequenceService } from './DocumentSequenceService';

/**
 * Functional Type → GL Account Code Mapping
 * Bridges the gap between internal service type names (e.g. 'ar', 'revenue')
 * and the actual GL account codes seeded in the Chart of Accounts.
 * The COA seeds accounts with standard accounting types ('asset', 'income', etc.)
 * but services reference them by functional purpose.
 */
const FUNCTIONAL_TYPE_TO_CODE = {
    'ar':                   ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,      // 1100
    'revenue':              ACCOUNT_CODES.SALES_REVENUE,             // 4000
    'tax_payable':          ACCOUNT_CODES.SALES_TAX_PAYABLE,         // 2100
    'cash':                 ACCOUNT_CODES.CASH_ON_HAND,              // 1001
    'bank':                 ACCOUNT_CODES.BANK_ACCOUNTS,             // 1010
    'inventory':            ACCOUNT_CODES.INVENTORY_ASSET,           // 1200
    'cogs':                 ACCOUNT_CODES.COGS,                      // 5000
    'ap':                   ACCOUNT_CODES.ACCOUNTS_PAYABLE,          // 2001
    'salaries':             ACCOUNT_CODES.SALARIES,                  // 5300
    'accrued_expenses':     ACCOUNT_CODES.ACCRUED_EXPENSES,          // 2010
    'production_cost':      ACCOUNT_CODES.MANUFACTURING_COST,        // 5001
    'adjustment_gain_loss': ACCOUNT_CODES.MISCELLANEOUS,             // 5999
};

/**
 * Accounting Service (Enterprise SOA)
 * Manages General Ledger (GL), Double-Entry Integrity, and Financial Reporting.
 * Every financial transaction in the system flows through this service.
 */
export const AccountingService = {

    /**
     * Internal: Get Postgres Client
     */
    async getClient(txClient = null) {
        if (txClient) return txClient;
        return await pool.connect();
    },

    /**
     * Resolve GL Accounts by their functional type (ar, revenue, cash, etc.)
     * Maps functional types to GL account codes, then queries by code.
     * This resolves the mismatch between functional type names used in service calls
     * and the standard accounting types (asset, liability, etc.) stored in gl_accounts.type.
     */
    async getGLAccountsByTypes(businessId, types, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            // Map functional types to GL codes
            const codes = types.map(t => FUNCTIONAL_TYPE_TO_CODE[t]);
            const unknownTypes = types.filter(t => !FUNCTIONAL_TYPE_TO_CODE[t]);
            if (unknownTypes.length > 0) {
                throw new Error(`Unknown functional account types: ${unknownTypes.join(', ')}`);
            }

            const query = `
                SELECT id, code, name, type FROM gl_accounts 
                WHERE business_id = $1 AND code = ANY($2::text[])
            `;
            const result = await client.query(query, [businessId, codes]);

            // Build reverse map: code -> functional type
            const codeToFuncType = {};
            types.forEach((t, i) => { codeToFuncType[codes[i]] = t; });

            // Build result map: functional_type -> account
            const map = {};
            result.rows.forEach(acc => {
                const funcType = codeToFuncType[acc.code];
                if (funcType) map[funcType] = acc;
            });

            const missing = types.filter(t => !map[t]);
            if (missing.length > 0) throw new Error(`Missing system accounts for business ${businessId}: ${missing.join(', ')}. Ensure Chart of Accounts is seeded.`);
            return map;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create a balanced Journal Entry (JE) with GL line entries.
     * Enforces Double-Entry Accounting Rules (Total Debit == Total Credit).
     */
    async createJournalEntry(params, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const { businessId, date = new Date(), description, referenceType, referenceId, referenceNumber, userId } = params;
            let { entries } = params;

            // Normalize entries (support for single entry or legacy fields)
            if (!entries || entries.length === 0) {
                entries = [{
                    accountId: params.accountId || params.account_id,
                    accountCode: params.accountCode || params.account_code,
                    debit: params.debit || 0,
                    credit: params.credit || 0
                }];
            }

            // 1. Fiscal Period Guard
            await checkFiscalPeriodOpen(client, businessId, date);

            // 2. Validate Double-Entry Integrity
            let totalDebit = 0;
            let totalCredit = 0;
            for (const entry of entries) {
                totalDebit += Math.round(Number(entry.debit || 0) * 100) / 100;
                totalCredit += Math.round(Number(entry.credit || 0) * 100) / 100;
            }
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error(`Double-entry violation: DR(${totalDebit}) != CR(${totalCredit})`);
            }

            // 3. Generate Sequential Journal Number
            const journalNumber = await DocumentSequenceService.generateNumber({
                businessId, documentType: 'journal_entry', prefix: 'JE-', padLength: 6
            }, client);

            // 4. Record Parent Journal
            const journalRes = await client.query(`
                INSERT INTO journal_entries (business_id, journal_number, transaction_date, description, reference_type, reference_id, reference_number, created_by, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'posted') RETURNING *
            `, [businessId, journalNumber, date, description, referenceType, referenceId || null, referenceNumber || null, userId]);
            const journal = journalRes.rows[0];

            // 5. Record GL Line Entries
            for (const entry of entries) {
                let accountId = entry.accountId || entry.account_id;
                
                // Resolve by code if ID is missing
                if (!accountId && entry.accountCode) {
                    const accRes = await client.query(
                        'SELECT id FROM gl_accounts WHERE business_id = $1 AND code = $2',
                        [businessId, entry.accountCode]
                    );
                    if (accRes.rows.length === 0) throw new Error(`Account not found: ${entry.accountCode}`);
                    accountId = accRes.rows[0].id;
                }

                if (!accountId) throw new Error('Account ID or Code is required for GL entry');

                await client.query(`
                    INSERT INTO gl_entries (business_id, journal_id, transaction_date, description, account_id, debit, credit, reference_type, reference_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [businessId, journal.id, date, description, accountId, entry.debit || 0, entry.credit || 0, referenceType, referenceId]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true, journalId: journal.id, journalNumber };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Map high-level business events to GL entries
     */
    async recordBusinessTransaction(type, data, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const { businessId, referenceId, description, date = new Date(), userId } = data;
            let entries = [];

            switch (type) {
                case 'sale': {
                    // Normalize: callers may pass amount+taxAmount OR totalAmount+netAmount
                    const saleTax    = Number(data.taxAmount  || 0);
                    const saleTotal  = Number(data.totalAmount ?? data.amount ?? 0);
                    let saleNet = Number(data.netAmount);
                    if (
                      !Number.isFinite(saleNet) ||
                      Math.abs(saleNet + saleTax - saleTotal) > 0.01
                    ) {
                      saleNet = saleTotal - saleTax;
                    }
                    const accounts = await this.getGLAccountsByTypes(businessId, ['ar', 'revenue', 'tax_payable'], client);
                    entries.push({ accountId: accounts.ar.id,      debit: saleTotal, credit: 0 });
                    entries.push({ accountId: accounts.revenue.id,  debit: 0, credit: saleNet });
                    if (saleTax > 0) {
                        entries.push({ accountId: accounts.tax_payable.id, debit: 0, credit: saleTax });
                    }
                    break;
                }
                case 'purchase': {
                    // Normalize: callers may pass amount OR totalAmount/netAmount
                    const purchaseTotal = Number(data.totalAmount ?? data.amount ?? 0);
                    const purchaseTax   = Number(data.taxAmount || 0);
                    const purchaseNet   = Number(data.netAmount  ?? (purchaseTotal - purchaseTax));
                    const accounts = await this.getGLAccountsByTypes(businessId, ['inventory', 'ap'], client);
                    entries.push({ accountId: accounts.inventory.id, debit: purchaseNet,   credit: 0 });
                    entries.push({ accountId: accounts.ap.id,        debit: 0, credit: purchaseTotal });
                    break;
                }
                case 'pos_sale': {
                    const accounts = await this.getGLAccountsByTypes(
                        businessId,
                        ['cash', 'bank', 'revenue', 'tax_payable'],
                        client
                    );
                    const totalAmount = Number(data.totalAmount ?? 0);
                    const taxAmount = Number(data.taxAmount || 0);
                    let netAmount = Number(data.netAmount);
                    if (
                        !Number.isFinite(netAmount) ||
                        Math.abs(netAmount + taxAmount - totalAmount) > 0.01
                    ) {
                        netAmount = Math.round((totalAmount - taxAmount) * 100) / 100;
                    }

                    let cashAmount = Number(data.cashAmount || 0);
                    let cardAmount = Number(data.cardAmount || 0);
                    const paymentTotal = cashAmount + cardAmount;

                    if (totalAmount > 0) {
                        if (paymentTotal < 0.01) {
                            cashAmount = totalAmount;
                        } else if (Math.abs(paymentTotal - totalAmount) > 0.01) {
                            if (cardAmount < 0.01) {
                                cashAmount = totalAmount;
                            } else if (cashAmount < 0.01) {
                                cardAmount = totalAmount;
                            } else {
                                cashAmount = Math.round((cashAmount / paymentTotal) * totalAmount * 100) / 100;
                                cardAmount = Math.round((totalAmount - cashAmount) * 100) / 100;
                            }
                        }
                    }

                    if (cashAmount > 0) {
                        entries.push({ accountId: accounts.cash.id, debit: cashAmount, credit: 0 });
                    }
                    if (cardAmount > 0) {
                        entries.push({ accountId: accounts.bank.id, debit: cardAmount, credit: 0 });
                    }

                    entries.push({ accountId: accounts.revenue.id, debit: 0, credit: netAmount });
                    if (taxAmount > 0) {
                        entries.push({ accountId: accounts.tax_payable.id, debit: 0, credit: taxAmount });
                    }
                    break;
                }
                case 'pos_refund': {
                    const accounts = await this.getGLAccountsByTypes(
                        businessId,
                        ['cash', 'bank', 'revenue', 'tax_payable'],
                        client
                    );
                    const totalAmount = Number(data.totalAmount ?? 0);
                    const taxAmount = Number(data.taxAmount || 0);
                    let netAmount = Number(data.netAmount);
                    if (
                        !Number.isFinite(netAmount) ||
                        Math.abs(netAmount + taxAmount - totalAmount) > 0.01
                    ) {
                        netAmount = Math.round((totalAmount - taxAmount) * 100) / 100;
                    }
                    const isCash = String(data.refundMethod || 'cash').toLowerCase() === 'cash';

                    entries.push({ accountId: accounts.revenue.id, debit: netAmount, credit: 0 });
                    if (taxAmount > 0) {
                        entries.push({ accountId: accounts.tax_payable.id, debit: taxAmount, credit: 0 });
                    }

                    const fundAcc = isCash ? accounts.cash : accounts.bank;
                    entries.push({ accountId: fundAcc.id, debit: 0, credit: totalAmount });
                    break;
                }
                case 'payroll_run': {
                    const accounts = await this.getGLAccountsByTypes(businessId, ['salaries', 'ap', 'accrued_expenses'], client);
                    
                    entries.push({ accountId: accounts.salaries.id, debit: data.totalGross, credit: 0 });
                    entries.push({ accountId: accounts.ap.id, debit: 0, credit: data.totalNet });
                    entries.push({ accountId: accounts.accrued_expenses.id, debit: 0, credit: data.totalDeductions });
                    break;
                }
                case 'sale_cogs': {
                    const accounts = await this.getGLAccountsByTypes(businessId, ['cogs', 'inventory'], client);
                    entries.push({ accountId: accounts.cogs.id, debit: data.costAmount, credit: 0 });
                    entries.push({ accountId: accounts.inventory.id, debit: 0, credit: data.costAmount });
                    break;
                }
                case 'production': {
                    const accounts = await this.getGLAccountsByTypes(businessId, ['inventory', 'production_cost'], client);
                    entries.push({ accountId: accounts.inventory.id, debit: data.totalAmount, credit: 0 });
                    entries.push({ accountId: accounts.production_cost.id, debit: 0, credit: data.totalAmount });
                    break;
                }
                case 'adjustment': {
                    const accounts = await this.getGLAccountsByTypes(businessId, ['inventory', 'adjustment_gain_loss'], client);
                    const isIncrease = data.totalAmount > 0;
                    const amount = Math.abs(data.totalAmount);
                    
                    if (isIncrease) {
                        entries.push({ accountId: accounts.inventory.id, debit: amount, credit: 0 });
                        entries.push({ accountId: accounts.adjustment_gain_loss.id, debit: 0, credit: amount });
                    } else {
                        entries.push({ accountId: accounts.adjustment_gain_loss.id, debit: amount, credit: 0 });
                        entries.push({ accountId: accounts.inventory.id, debit: 0, credit: amount });
                    }
                    break;
                }
                case 'payment': {
                    // Receipt: DR Cash/Bank, CR Accounts Receivable
                    // Payment: DR Accounts Payable, CR Cash/Bank
                    const isReceipt = data.paymentType === 'receipt';
                    const isCash = (data.paymentMode || 'cash') === 'cash';
                    const accountTypes = isReceipt
                        ? [isCash ? 'cash' : 'bank', 'ar']
                        : ['ap', isCash ? 'cash' : 'bank'];
                    const accounts = await this.getGLAccountsByTypes(businessId, [...new Set(accountTypes)], client);

                    if (isReceipt) {
                        const fundAcc = isCash ? accounts.cash : accounts.bank;
                        entries.push({ accountId: fundAcc.id, debit: data.amount, credit: 0 });
                        entries.push({ accountId: accounts.ar.id, debit: 0, credit: data.amount });
                    } else {
                        const fundAcc = isCash ? accounts.cash : accounts.bank;
                        entries.push({ accountId: accounts.ap.id, debit: data.amount, credit: 0 });
                        entries.push({ accountId: fundAcc.id, debit: 0, credit: data.amount });
                    }
                    break;
                }
                case 'expense': {
                    // Expense: DR Expense Account, CR Cash/Bank/AP based on payment method
                    // If paid immediately: CR Cash/Bank
                    // If on credit: CR Accounts Payable
                    const expenseAccountId = data.expenseAccountId || data.account_id;
                    if (!expenseAccountId) {
                        throw new Error('Expense account ID is required for expense transactions');
                    }

                    // Normalize: ExpenseService passes paymentMethod; some callers pass paymentStatus/isPaid
                    const rawMethod = data.paymentMethod || data.paymentMode || 'cash';
                    const isPaid = data.paymentStatus === 'paid' || data.isPaid || rawMethod !== 'credit';
                    const isCash = rawMethod === 'cash';

                    // Debit expense account
                    entries.push({ accountId: expenseAccountId, debit: data.amount, credit: 0 });

                    if (isPaid) {
                        // Credit cash or bank (immediate payment)
                        const accountTypes = [isCash ? 'cash' : 'bank'];
                        const accounts = await this.getGLAccountsByTypes(businessId, accountTypes, client);
                        const fundAcc = isCash ? accounts.cash : accounts.bank;
                        entries.push({ accountId: fundAcc.id, debit: 0, credit: data.amount });
                    } else {
                        // Credit accounts payable (on credit)
                        const accounts = await this.getGLAccountsByTypes(businessId, ['ap'], client);
                        entries.push({ accountId: accounts.ap.id, debit: 0, credit: data.amount });
                    }
                    break;
                }
                default:
                    throw new Error(`Untracked transaction type: ${type}`);
            }

            return await this.createJournalEntry({
                businessId, date, description, referenceType: type, referenceId, entries, userId
            }, client);
        } finally {
            if (!txClient) client.release();
        }
    },

    async getAccountBalance(businessId, accountId, asOfDate = null) {
        const client = await pool.connect();
        try {
            let query = `SELECT COALESCE(SUM(debit - credit), 0) as balance FROM gl_entries WHERE business_id = $1 AND account_id = $2`;
            const params = [businessId, accountId];
            if (asOfDate) {
                query += ` AND transaction_date <= $3`;
                params.push(asOfDate);
            }
            const res = await client.query(query, params);
            return Number(res.rows[0].balance || 0);
        } finally {
            client.release();
        }
    },

    /**
     * Reverse Journal Entry
     * Creates a mirror journal entry with all debits/credits swapped
     * Links reversed_by on the original journal entry
     * Used for voiding transactions, corrections, and adjustments
     * 
     * @param {string} journalId - Original journal entry ID to reverse
     * @param {Object} context - { businessId, userId, reason }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Reversal journal details
     */
    async reverseJournalEntry(journalId, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId, reason } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get original journal entry
            const journalRes = await client.query(`
                SELECT * FROM journal_entries
                WHERE id = $1 AND business_id = $2
                FOR UPDATE
            `, [journalId, businessId]);

            if (journalRes.rows.length === 0) {
                throw new Error('Journal entry not found');
            }

            const originalJournal = journalRes.rows[0];

            // 2. Check if already reversed
            if (originalJournal.reversed_by) {
                throw new Error('Journal entry has already been reversed');
            }

            // 3. Get all GL entries for this journal
            const entriesRes = await client.query(`
                SELECT * FROM gl_entries
                WHERE journal_id = $1 AND business_id = $2
                ORDER BY created_at ASC
            `, [journalId, businessId]);

            if (entriesRes.rows.length === 0) {
                throw new Error('No GL entries found for this journal');
            }

            // 4. Create reversal entries (swap debits and credits)
            const reversalEntries = entriesRes.rows.map(entry => ({
                accountId: entry.account_id,
                debit: Number(entry.credit || 0),  // Swap: credit becomes debit
                credit: Number(entry.debit || 0),  // Swap: debit becomes credit
            }));

            // 5. Create reversal journal entry
            const reversalDescription = reason || `Reversal of ${originalJournal.journal_number}: ${originalJournal.description}`;
            const reversalResult = await this.createJournalEntry({
                businessId,
                date: new Date(), // Reversal date is today
                description: reversalDescription,
                referenceType: 'reversal',
                referenceId: journalId,
                entries: reversalEntries,
                userId
            }, client);

            // 6. Link reversal to original journal and mark as reversed
            await client.query(`
                UPDATE journal_entries
                SET reversed_by = $1, is_reversed = true, status = 'reversed', updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [reversalResult.journalId, journalId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                originalJournalId: journalId,
                originalJournalNumber: originalJournal.journal_number,
                reversalJournalId: reversalResult.journalId,
                reversalJournalNumber: reversalResult.journalNumber,
                entriesReversed: reversalEntries.length,
                message: `Journal ${originalJournal.journal_number} reversed successfully`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Get Trial Balance
     * Aggregates all GL entries by account and returns debit/credit totals
     * Essential for financial reporting and period-end closing
     * 
     * @param {string} businessId - Business ID
     * @param {Date} asOfDate - Optional date to calculate balance as of (defaults to now)
     * @returns {Promise<Object>} Trial balance with account totals
     */
    async getTrialBalance(businessId, asOfDate = null) {
        const client = await this.getClient();

        try {
            // Build query with optional date filter
            let query = `
                SELECT 
                    a.id as account_id,
                    a.code as account_code,
                    a.name as account_name,
                    a.type as account_type,
                    COALESCE(SUM(e.debit), 0) as total_debit,
                    COALESCE(SUM(e.credit), 0) as total_credit,
                    COALESCE(SUM(e.debit - e.credit), 0) as balance
                FROM gl_accounts a
                LEFT JOIN gl_entries e ON a.id = e.account_id AND e.business_id = $1
            `;

            const params = [businessId];

            if (asOfDate) {
                query += ` AND e.transaction_date <= $2`;
                params.push(asOfDate);
            }

            query += `
                WHERE a.business_id = $1
                GROUP BY a.id, a.code, a.name, a.type
                ORDER BY a.code ASC
            `;

            const result = await client.query(query, params);

            // Calculate totals
            let totalDebits = 0;
            let totalCredits = 0;
            let totalBalance = 0;

            const accounts = result.rows.map(row => {
                const debit = Number(row.total_debit || 0);
                const credit = Number(row.total_credit || 0);
                const balance = Number(row.balance || 0);

                totalDebits += debit;
                totalCredits += credit;
                totalBalance += balance;

                return {
                    accountId: row.account_id,
                    accountCode: row.account_code,
                    accountName: row.account_name,
                    accountType: row.account_type,
                    debit: Math.round(debit * 100) / 100,
                    credit: Math.round(credit * 100) / 100,
                    balance: Math.round(balance * 100) / 100
                };
            });

            // Verify double-entry integrity
            const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

            return {
                success: true,
                asOfDate: asOfDate || new Date(),
                accounts,
                totals: {
                    totalDebits: Math.round(totalDebits * 100) / 100,
                    totalCredits: Math.round(totalCredits * 100) / 100,
                    difference: Math.round((totalDebits - totalCredits) * 100) / 100,
                    isBalanced
                },
                accountCount: accounts.length,
                message: isBalanced 
                    ? 'Trial balance is balanced' 
                    : `WARNING: Trial balance is out of balance by ${Math.abs(totalDebits - totalCredits).toFixed(2)}`
            };
        } finally {
            client.release();
        }
    },

    /**
     * Close Fiscal Period
     * Validates no open transactions and marks period as closed
     * Prevents future postings to the closed period
     * 
     * @param {string} periodId - Fiscal period ID
     * @param {Object} context - { businessId, userId, notes }
     * @param {Object} txClient - Optional transaction client
     * @returns {Promise<Object>} Closing result
     */
    async closeFiscalPeriod(periodId, context, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        const { businessId, userId, notes } = context;

        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            // 1. Get fiscal period details
            const periodRes = await client.query(`
                SELECT * FROM fiscal_periods
                WHERE id = $1 AND business_id = $2
                FOR UPDATE
            `, [periodId, businessId]);

            if (periodRes.rows.length === 0) {
                throw new Error('Fiscal period not found');
            }

            const period = periodRes.rows[0];

            // 2. Check if already closed
            if (period.status === 'closed') {
                throw new Error('Fiscal period is already closed');
            }

            // 3. Validate no open/draft transactions in this period
            // journal_entries has no status column, all posted entries are valid.
            // We check for any reversed journals that may indicate incomplete corrections.
            const openTransactionsRes = await client.query(`
                SELECT COUNT(*) as count
                FROM journal_entries
                WHERE business_id = $1
                  AND transaction_date >= $2
                  AND transaction_date <= $3
                  AND status = 'draft'
            `, [businessId, period.start_date, period.end_date]);

            const openCount = Number(openTransactionsRes.rows[0]?.count || 0);

            if (openCount > 0) {
                throw new Error(
                    `Cannot close period: ${openCount} open/draft transactions found. ` +
                    `All transactions must be posted before closing.`
                );
            }

            // 4. Get trial balance for the period
            const trialBalance = await this.getTrialBalance(businessId, period.end_date);

            if (!trialBalance.totals.isBalanced) {
                throw new Error(
                    `Cannot close period: Trial balance is out of balance by ${trialBalance.totals.difference}. ` +
                    `All accounts must be balanced before closing.`
                );
            }

            // 5. Mark period as closed
            await client.query(`
                UPDATE fiscal_periods
                SET 
                    status = 'closed',
                    closed_at = NOW(),
                    closed_by = $1,
                    closing_notes = $2,
                    updated_at = NOW()
                WHERE id = $3 AND business_id = $4
            `, [userId, notes || null, periodId, businessId]);

            if (shouldManageTransaction) await client.query('COMMIT');

            return {
                success: true,
                periodId,
                periodName: period.name,
                startDate: period.start_date,
                endDate: period.end_date,
                closedAt: new Date(),
                closedBy: userId,
                trialBalance: trialBalance.totals,
                message: `Fiscal period ${period.name} closed successfully`
            };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) client.release();
        }
    },

    /**
     * Agentic Support: Assess liquid capital for procurement decisions.
     * Evaluates total available cash and bank balances against risk thresholds.
     */
    async getLiquidityStatus(businessId) {
        try {
            const trialBalance = await this.getTrialBalance(businessId);
            
            // Sum balances for Cash and Bank accounts (Codes starting with 100 or 101 in standard COA)
            const liquidCapital = trialBalance.accounts
                .filter(acc => acc.accountCode.startsWith('100') || acc.accountCode.startsWith('101'))
                .reduce((sum, acc) => sum + acc.balance, 0);

            return {
                success: true,
                totalLiquidCapital: liquidCapital,
                status: liquidCapital > 2000 ? 'HEALTHY' : (liquidCapital > 500 ? 'STABLE' : 'LOW_LIQUIDITY'),
                riskThreshold: 500,
                asOf: new Date()
            };
        } catch (error) {
            console.error('[AccountingService] Liquidity Check Failed:', error);
            return { success: false, totalLiquidCapital: 0, status: 'UNKNOWN', error: error.message };
        }
    }
};

