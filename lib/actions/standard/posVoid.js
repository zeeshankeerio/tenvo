'use server';

import { auditWrite } from '@/lib/actions/_shared/audit';
import { withGuard } from '@/lib/rbac/serverGuard';
import { POSService } from '@/lib/services/POSService';
import { mergePosSettingsIntoBusiness } from '@/lib/config/posSettings';
import pool from '@/lib/db';

/**
 * Void a posted POS transaction (manager action).
 */
export async function voidPosTransactionAction(data) {
    try {
        const { session } = await withGuard(data.businessId, {
            permission: 'pos.void_transaction',
            feature: 'pos',
        });
        const transaction = await POSService.voidTransaction(data, session.user.id);

        auditWrite({
            businessId: data.businessId,
            action: 'void',
            entityType: 'pos_transaction',
            entityId: data.transactionId,
            description: `Voided POS ${transaction.transaction_number}`,
            metadata: { reason: data.reason || null },
        });

        return { success: true, transaction };
    } catch (error) {
        console.error('Void POS transaction error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Read merged POS settings for a business.
 */
export async function getPosSettingsAction(businessId) {
    const client = await pool.connect();
    try {
        await withGuard(businessId, { permission: 'pos.access', feature: 'pos', client });
        const res = await client.query(
            `SELECT bs.settings FROM business_settings bs WHERE bs.business_id = $1 LIMIT 1`,
            [businessId]
        );
        const settings = res.rows[0]?.settings || {};
        const { resolvePosSettings } = await import('@/lib/config/posSettings');
        return { success: true, settings: resolvePosSettings({ settings }) };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Persist POS settings under business_settings.settings.pos
 */
export async function updatePosSettingsAction(businessId, posPatch) {
    const client = await pool.connect();
    try {
        await withGuard(businessId, { permission: 'pos.access', feature: 'pos', client });
        const res = await client.query(
            `SELECT settings FROM business_settings WHERE business_id = $1 LIMIT 1`,
            [businessId]
        );
        const current = res.rows[0]?.settings || {};
        const merged = mergePosSettingsIntoBusiness(current, posPatch);

        if (res.rows.length === 0) {
            await client.query(
                `INSERT INTO business_settings (business_id, settings, created_at, updated_at)
                 VALUES ($1, $2::jsonb, NOW(), NOW())`,
                [businessId, JSON.stringify(merged)]
            );
        } else {
            await client.query(
                `UPDATE business_settings SET settings = $1::jsonb, updated_at = NOW() WHERE business_id = $2`,
                [JSON.stringify(merged), businessId]
            );
        }

        const { resolvePosSettings } = await import('@/lib/config/posSettings');
        return { success: true, settings: resolvePosSettings({ settings: merged }) };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Fetch active batches for pharmacy POS batch picker.
 */
export async function getProductBatchesForPosAction(businessId, productId) {
    const client = await pool.connect();
    try {
        await withGuard(businessId, { permission: 'pos.process_sale', feature: 'pos', client });
        const result = await client.query(
            `SELECT id, batch_number, quantity, expiry_date, manufacturing_date
             FROM product_batches
             WHERE business_id = $1 AND product_id = $2 AND is_active = true AND is_deleted = false
               AND quantity > 0 AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
             ORDER BY expiry_date ASC NULLS LAST, created_at ASC
             LIMIT 20`,
            [businessId, productId]
        );
        return { success: true, batches: result.rows };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
