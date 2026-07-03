'use server';

import pool from '@/lib/db';
import { PakistaniTaxService } from '@/lib/services/PakistaniTaxService';
import { withGuard } from '@/lib/rbac/serverGuard';

async function checkAuth(businessId, permission = 'tax.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

export async function getFbrComplianceSummaryAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'tax.view');

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const result = await client.query(
            `SELECT
                COALESCE(SUM(grand_total), 0)::numeric AS total_sales,
                COALESCE(SUM(tax_total), 0)::numeric AS total_tax
             FROM invoices
             WHERE business_id = $1
               AND (is_deleted = false OR is_deleted IS NULL)
               AND status NOT IN ('voided', 'cancelled')
               AND date >= $2::date
               AND date <= $3::date`,
            [businessId, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
        );

        const totalSales = parseFloat(result.rows[0]?.total_sales || 0);
        const totalTax = parseFloat(result.rows[0]?.total_tax || 0);

        return { success: true, totalSales, totalTax };
    } catch (error) {
        console.error('Get FBR compliance summary error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

export async function getTaxConfigAction(businessId) {
    try {
        await checkAuth(businessId, 'tax.view');
        const config = await PakistaniTaxService.getTaxConfig(businessId);
        return { success: true, config };
    } catch (error) {
        console.error('Get tax config action error:', error);
        return { success: false, error: error.message };
    }
}

export async function configureTaxAction(taxData) {
    try {
        await checkAuth(taxData.businessId, 'tax.configure');
        const config = await PakistaniTaxService.configureTax(taxData);
        return { success: true, config };
    } catch (error) {
        console.error('Configure tax action error:', error);
        return { success: false, error: error.message };
    }
}
