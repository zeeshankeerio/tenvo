import {
    createPosTerminalAction,
    getPosTerminalsAction,
    openPosSessionAction,
    closePosSessionAction,
    createPosTransactionAction,
    getPosSessionSummaryAction,
    getActivePosSessionAction
} from '@/lib/actions/standard/pos';
import {
    refundPosTransactionAction,
    getPosRefundsAction,
    getRecentPosTransactionsForRefundAction,
} from '@/lib/actions/standard/posRefund';

export const posAPI = {
    // Terminal management
    async createTerminal(data) { return await createPosTerminalAction(data); },
    async getTerminals(businessId) { return await getPosTerminalsAction(businessId); },

    // Session management
    async openSession(data) { return await openPosSessionAction(data); },
    async closeSession(data) { return await closePosSessionAction(data); },
    async getSessionSummary(businessId, sessionId) { return await getPosSessionSummaryAction(businessId, sessionId); },
    async getActiveSession(businessId) { return await getActivePosSessionAction(businessId); },

    // Transactions
    async checkout(data) { return await createPosTransactionAction(data); },

    // Refunds
    async refund(data) { return await refundPosTransactionAction(data); },
    async getRefunds(businessId, filters) { return await getPosRefundsAction(businessId, filters); },
    async getRecentSalesForRefund(businessId, limit) {
        return await getRecentPosTransactionsForRefundAction(businessId, limit);
    },
};
