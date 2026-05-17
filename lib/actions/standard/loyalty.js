'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { LoyaltyService } from '@/lib/services/LoyaltyService';

async function checkAuth(businessId, client = null, permission = 'crm.manage_loyalty', feature = 'promotions_crm') {
    const { session } = await withGuard(businessId, { permission, feature, client });
    return session;
}

// --- Program Management -----------------------------------------------------

/**
 * Create a loyalty program for a business
 */
export async function createLoyaltyProgramAction(data) {
    try {
        await checkAuth(data.businessId, null, 'crm.manage_loyalty', 'promotions_crm');
        const program = await LoyaltyService.createProgram(data);
        return { success: true, program };
    } catch (error) {
        console.error('Create loyalty program action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get loyalty programs for a business
 */
export async function getLoyaltyProgramsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'crm.manage_loyalty', 'promotions_crm');
        const result = await client.query(
            `SELECT * FROM loyalty_programs WHERE business_id = $1 ORDER BY created_at DESC`,
            [businessId]
        );
        return { success: true, programs: result.rows };
    } catch (error) {
        console.error('Get loyalty programs error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

// --- Points Operations ------------------------------------------------------

/**
 * Earn loyalty points for a customer (typically called after POS sale)
 */
export async function earnLoyaltyPointsAction(data) {
    try {
        await checkAuth(data.businessId, null, 'crm.manage_loyalty', 'promotions_crm');
        const result = await LoyaltyService.earnPoints(data);
        return { success: true, ...result };
    } catch (error) {
        console.error('Earn loyalty points action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Redeem loyalty points (apply discount at POS)
 */
export async function redeemLoyaltyPointsAction(data) {
    try {
        await checkAuth(data.businessId, null, 'crm.manage_loyalty', 'promotions_crm');
        const result = await LoyaltyService.redeemPoints(data);
        return { success: true, ...result };
    } catch (error) {
        console.error('Redeem loyalty points action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get loyalty balance and transaction history for a customer
 */
export async function getLoyaltyBalanceAction(businessId, customerId, programId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'crm.manage_loyalty', 'promotions_crm');

        const balRes = await client.query(`
            SELECT
                COALESCE(SUM(CASE WHEN type = 'earn' OR type = 'adjust' THEN points ELSE 0 END), 0) as total_earned,
                COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0) as total_redeemed,
                COALESCE(SUM(CASE WHEN type = 'expire' THEN points ELSE 0 END), 0) as total_expired
            FROM loyalty_transactions
            WHERE customer_id = $1 AND program_id = $2
        `, [customerId, programId]);

        const stats = balRes.rows[0];
        const balance = parseInt(stats.total_earned) - parseInt(stats.total_redeemed) - parseInt(stats.total_expired);

        const history = await client.query(`
            SELECT * FROM loyalty_transactions
            WHERE customer_id = $1 AND program_id = $2
            ORDER BY created_at DESC LIMIT 50
        `, [customerId, programId]);

        return {
            success: true,
            balance,
            totalEarned: parseInt(stats.total_earned),
            totalRedeemed: parseInt(stats.total_redeemed),
            totalExpired: parseInt(stats.total_expired),
            history: history.rows,
        };
    } catch (error) {
        console.error('Get loyalty balance error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
