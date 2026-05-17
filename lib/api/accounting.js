
import {
    createGLEntryAction,
    getGLAccountsAction,
    getGLEntriesAction,
    getAccountBalanceAction,
    initializeCOAAction
} from '@/lib/actions/basic/accounting';
import {
    getTrialBalanceAction,
    getProfitLossAction,
    getBalanceSheetAction,
    getAccountingSummaryAction
} from '@/lib/actions/standard/report';
import {
    createExpenseAction,
    getExpensesAction,
    getExpenseSummaryAction,
    deleteExpenseAction
} from '@/lib/actions/basic/expense';
import {
    createFiscalPeriodAction,
    getFiscalPeriodsAction,
    closeFiscalPeriodAction,
    reopenFiscalPeriodAction
} from '@/lib/actions/basic/fiscal';

export const accountingAPI = {
    /**
     * Create a manual Journal Entry
     * @param {Object} entryData - { businessId, date, description, entries: [{accountId, debit, credit}] }
     */
    async createEntry(entryData) {
        return await createGLEntryAction({
            ...entryData,
            referenceType: 'manual',
            referenceId: `JE-${Date.now()}` // Generate a unique ref ID for manual entries
        });
    },

    /**
     * Get all Chart of Accounts
     */
    async getAccounts(businessId) {
        return await getGLAccountsAction(businessId);
    },

    /**
     * Get General Ledger Entries (Ledger Report)
     */
    async getEntries(businessId, params) {
        return await getGLEntriesAction(businessId, params);
    },

    /**
     * Get specific account balance
     */
    async getBalance(businessId, accountCode) {
        return await getAccountBalanceAction(businessId, accountCode);
    },

    /**
     * Initialize Default COA
     */
    async initCOA(businessId, coaTemplate) {
        return await initializeCOAAction(businessId, coaTemplate);
    },

    /**
     * Get Trial Balance Report
     */
    async getTrialBalance(businessId, asOfDate) {
        return await getTrialBalanceAction(businessId, asOfDate);
    },

    /**
     * Get Profit & Loss Report
     */
    async getProfitLoss(businessId, startDate, endDate) {
        return await getProfitLossAction(businessId, startDate, endDate);
    },

    /**
     * Get Balance Sheet Report
     */
    async getBalanceSheet(businessId, asOfDate) {
        return await getBalanceSheetAction(businessId, asOfDate);
    },

    /**
     * Get High-level Accounting Summary for Dashboard
     */
    async getSummary(businessId, startDate, endDate) {
        return await getAccountingSummaryAction(businessId, startDate, endDate);
    },

    // --- Expense Management ----------------------------------------
    async createExpense(data) {
        return await createExpenseAction(data);
    },
    async getExpenses(businessId, filters) {
        return await getExpensesAction(businessId, filters);
    },
    async getExpenseSummary(businessId, startDate, endDate) {
        return await getExpenseSummaryAction(businessId, startDate, endDate);
    },
    async deleteExpense(businessId, expenseId) {
        return await deleteExpenseAction(businessId, expenseId);
    },

    // --- Fiscal Period Management ----------------------------------
    async createFiscalPeriod(businessId, data) {
        return await createFiscalPeriodAction(businessId, data);
    },
    async getFiscalPeriods(businessId) {
        return await getFiscalPeriodsAction(businessId);
    },
    async closeFiscalPeriod(businessId, periodId) {
        return await closeFiscalPeriodAction(businessId, periodId);
    },
    async reopenFiscalPeriod(businessId, periodId) {
        return await reopenFiscalPeriodAction(businessId, periodId);
    }
};
