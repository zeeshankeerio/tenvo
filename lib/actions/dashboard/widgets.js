'use server';

/**
 * Dashboard Widget Server Actions
 * Real-time data for dashboard widgets
 */

import pool from '@/lib/db';
import { requirePlatformAccess } from '@/lib/actions/admin/platform';
import { actionSuccess, actionFailure } from '@/lib/actions/_shared/result';
import { withGuard } from '@/lib/rbac/serverGuard';

// ============================================
// TODAY'S SALES WIDGET
// ============================================

/**
 * Get today's sales data for a business
 */
export async function getTodaysSales(businessId, currency = 'PKR') {
    await withGuard(businessId, { permission: 'dashboard.view' });
    const client = await pool.connect();
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get today's invoices
        const salesResult = await client.query(`
            SELECT 
                COALESCE(SUM(grand_total), 0) as total_sales,
                COUNT(*) as total_orders,
                COALESCE(AVG(grand_total), 0) as avg_order_value
            FROM invoices
            WHERE business_id = $1
            AND DATE(created_at) = CURRENT_DATE
            AND status != 'cancelled'
        `, [businessId]);
        
        // Get hourly breakdown
        const hourlyResult = await client.query(`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                SUM(grand_total) as sales,
                COUNT(*) as orders
            FROM invoices
            WHERE business_id = $1
            AND DATE(created_at) = CURRENT_DATE
            AND status != 'cancelled'
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
        `, [businessId]);
        
        // Get daily target (from business settings or default)
        const targetResult = await client.query(`
            SELECT daily_sales_target 
            FROM business_settings 
            WHERE business_id = $1
        `, [businessId]);
        
        const target = targetResult.rows[0]?.daily_sales_target || 50000;
        const sales = salesResult.rows[0];
        
        // Format hourly data
        const hourlyBreakdown = [];
        for (let i = 9; i <= 20; i++) {
            const hourData = hourlyResult.rows.find(r => parseInt(r.hour) === i);
            const nextHour = i + 1;
            hourlyBreakdown.push({
                hour: `${i % 12 || 12}-${nextHour % 12 || 12}${i < 12 ? 'am' : 'pm'}`,
                sales: parseFloat(hourData?.sales || 0),
                orders: parseInt(hourData?.orders || 0)
            });
        }
        
        const achievement = target > 0 ? Math.round((sales.total_sales / target) * 100) : 0;
        
        // Compare with yesterday
        const yesterdayResult = await client.query(`
            SELECT COALESCE(SUM(grand_total), 0) as yesterday_sales
            FROM invoices
            WHERE business_id = $1
            AND DATE(created_at) = CURRENT_DATE - 1
            AND status != 'cancelled'
        `, [businessId]);
        
        const yesterdaySales = parseFloat(yesterdayResult.rows[0]?.yesterday_sales || 0);
        const trend = sales.total_sales >= yesterdaySales ? 'up' : 'down';
        
        return actionSuccess({
            totalSales: parseFloat(sales.total_sales),
            totalOrders: parseInt(sales.total_orders),
            avgOrderValue: parseFloat(sales.avg_order_value),
            target: target,
            achievement: achievement,
            trend: trend,
            hourlyBreakdown: hourlyBreakdown,
            currency: currency
        });
    } catch (error) {
        console.error('[Dashboard] getTodaysSales error:', error);
        return actionFailure('GET_SALES_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// CYCLE COUNT WIDGET
// ============================================

/**
 * Get cycle count tasks for a business/user
 */
export async function getCycleCountTasks(businessId, userId) {
    await withGuard(businessId, { permission: 'inventory.view' });
    const client = await pool.connect();
    
    try {
        // Get pending and in-progress cycle counts
        const tasksResult = await client.query(`
            SELECT 
                cct.id,
                cct.schedule_id,
                ccs.name as schedule_name,
                ccs.zone,
                cct.due_date,
                ccs.priority,
                COUNT(DISTINCT ccti.product_id) as product_count,
                COUNT(DISTINCT CASE WHEN ccti.status = 'counted' THEN ccti.product_id END) as completed_count,
                cct.assigned_to,
                cct.status,
                u.name as assigned_to_name
            FROM cycle_count_tasks cct
            JOIN cycle_count_schedules ccs ON cct.schedule_id = ccs.id
            LEFT JOIN cycle_count_task_items ccti ON cct.id = ccti.task_id
            LEFT JOIN "user" u ON cct.assigned_to = u.id
            WHERE cct.business_id = $1
            AND cct.status IN ('pending', 'in_progress')
            ${userId ? 'AND (cct.assigned_to = $2 OR cct.assigned_to IS NULL)' : ''}
            GROUP BY cct.id, ccs.name, ccs.zone, ccs.priority, u.name
            ORDER BY 
                CASE ccs.priority 
                    WHEN 'high' THEN 1 
                    WHEN 'medium' THEN 2 
                    ELSE 3 
                END,
                cct.due_date ASC
        `, userId ? [businessId, userId] : [businessId]);
        
        // Get summary counts
        const summaryResult = await client.query(`
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN status = 'completed' AND DATE(updated_at) = CURRENT_DATE THEN 1 END) as completed_today
            FROM cycle_count_tasks
            WHERE business_id = $1
        `, [businessId]);
        
        const summary = summaryResult.rows[0];
        
        return actionSuccess({
            pendingCount: parseInt(summary.pending_count),
            inProgressCount: parseInt(summary.in_progress_count),
            completedToday: parseInt(summary.completed_today),
            tasks: tasksResult.rows.map(task => ({
                id: task.id,
                name: task.schedule_name + (task.zone ? ` - ${task.zone}` : ''),
                scheduleId: task.schedule_id,
                dueDate: task.due_date,
                priority: task.priority,
                productCount: parseInt(task.product_count),
                completedCount: parseInt(task.completed_count),
                assignedTo: task.assigned_to,
                assignedToName: task.assigned_to_name,
                status: task.status
            }))
        });
    } catch (error) {
        console.error('[Dashboard] getCycleCountTasks error:', error);
        return actionFailure('GET_CYCLE_COUNT_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// TAX CALCULATIONS WIDGET
// ============================================

/**
 * Get tax calculations for a business
 */
export async function getTaxCalculations(businessId, currency = 'PKR') {
    await withGuard(businessId, { permission: 'dashboard.financial_kpis' });
    const client = await pool.connect();
    
    try {
        // Get current month's sales
        const salesResult = await client.query(`
            SELECT 
                COALESCE(SUM(subtotal), 0) as total_sales,
                COALESCE(SUM(tax_amount), 0) as total_tax,
                COALESCE(SUM(CASE WHEN tax_breakdown->>'pst' IS NOT NULL 
                    THEN (tax_breakdown->>'pst')::numeric ELSE 0 END), 0) as pst_amount,
                COALESCE(SUM(CASE WHEN tax_breakdown->>'fst' IS NOT NULL 
                    THEN (tax_breakdown->>'fst')::numeric ELSE 0 END), 0) as fst_amount
            FROM invoices
            WHERE business_id = $1
            AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            AND status != 'cancelled'
        `, [businessId]);
        
        // Get tax configuration
        const taxConfigResult = await client.query(`
            SELECT pst_rate, fst_rate, is_active
            FROM tax_configurations
            WHERE business_id = $1
            AND is_active = true
            LIMIT 1
        `, [businessId]);
        
        const taxConfig = taxConfigResult.rows[0] || { pst_rate: 17, fst_rate: 1 };
        const sales = salesResult.rows[0];
        
        // Get tax payments made this month
        const paymentsResult = await client.query(`
            SELECT COALESCE(SUM(amount), 0) as tax_paid
            FROM tax_payments
            WHERE business_id = $1
            AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
        `, [businessId]);
        
        const taxPaid = parseFloat(paymentsResult.rows[0]?.tax_paid || 0);
        const totalTax = parseFloat(sales.total_tax || 0);
        
        // Calculate next filing date (15th of next month)
        const now = new Date();
        const nextFilingDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
        
        return actionSuccess({
            totalSales: parseFloat(sales.total_sales),
            taxableAmount: parseFloat(sales.total_sales),
            pst: {
                rate: parseFloat(taxConfig.pst_rate),
                amount: parseFloat(sales.pst_amount)
            },
            fst: {
                rate: parseFloat(taxConfig.fst_rate),
                amount: parseFloat(sales.fst_amount)
            },
            totalTax: totalTax,
            taxPaid: taxPaid,
            taxPending: Math.max(0, totalTax - taxPaid),
            nextFilingDate: nextFilingDate.toISOString(),
            currency: currency
        });
    } catch (error) {
        console.error('[Dashboard] getTaxCalculations error:', error);
        return actionFailure('GET_TAX_FAILED', error.message);
    } finally {
        client.release();
    }
}

// ============================================
// TEAM PERFORMANCE (Owner Dashboard)
// ============================================

/**
 * Get team performance data for owner dashboard
 */
export async function getTeamPerformance(businessId, period = 'month') {
    await withGuard(businessId, { permission: 'dashboard.full_kpis' });
    const client = await pool.connect();
    
    try {
        // Get all active users in the business
        const usersResult = await client.query(`
            SELECT 
                bu.user_id,
                u.name,
                bu.role,
                COALESCE(s.sales_total, 0) as sales,
                COALESCE(s.orders_count, 0) as orders
            FROM business_users bu
            JOIN "user" u ON bu.user_id = u.id
            LEFT JOIN (
                SELECT 
                    created_by,
                    SUM(grand_total) as sales_total,
                    COUNT(*) as orders_count
                FROM invoices
                WHERE business_id = $1
                AND status != 'cancelled'
                AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
                GROUP BY created_by
            ) s ON bu.user_id = s.created_by
            WHERE bu.business_id = $1
            AND bu.status = 'active'
            ORDER BY sales DESC
        `, [businessId]);
        
        // Get targets from custom roles or defaults
        const teamWithTargets = usersResult.rows.map(user => {
            const target = user.role === 'owner' || user.role === 'admin' ? 500000 : 300000;
            const achievement = target > 0 ? Math.round((user.sales / target) * 100) : 0;
            
            return {
                id: user.user_id,
                name: user.name,
                role: user.role,
                sales: parseFloat(user.sales),
                orders: parseInt(user.orders),
                target: target,
                achievement: achievement,
                trend: 'up' // Compare with previous period
            };
        });
        
        return actionSuccess({ performance: teamWithTargets });
    } catch (error) {
        console.error('[Dashboard] getTeamPerformance error:', error);
        return actionFailure('GET_TEAM_PERFORMANCE_FAILED', error.message);
    } finally {
        client.release();
    }
}
