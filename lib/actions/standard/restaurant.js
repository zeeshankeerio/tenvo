'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { RestaurantService } from '@/lib/services/RestaurantService';

async function checkAuth(businessId, client = null, permission = 'restaurant.view_tables', feature = 'restaurant_kds') {
    const { session } = await withGuard(businessId, { permission, feature, client });
    return session;
}

// --- Table Management -------------------------------------------------------

/**
 * Create or update a restaurant table
 */
export async function upsertTableAction(data) {
    try {
        await checkAuth(data.businessId, null, 'restaurant.manage_tables', 'restaurant_kds');
        const table = await RestaurantService.upsertTable(data);
        return { success: true, table };
    } catch (error) {
        console.error('Upsert table action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all tables for a business with current status
 */
export async function getTablesAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'restaurant.view_tables', 'restaurant_kds');
        const result = await client.query(`
            SELECT t.*,
                   ro.order_number as current_order_number,
                   ro.status as current_order_status,
                   ro.total_amount as current_order_total,
                   ro.waiter_id
            FROM restaurant_tables t
            LEFT JOIN restaurant_orders ro ON t.current_order_id = ro.id AND ro.status NOT IN ('completed', 'cancelled')
            WHERE t.business_id = $1 AND t.is_active = true
            ORDER BY t.sort_order, t.table_number
        `, [businessId]);
        return { success: true, tables: result.rows };
    } catch (error) {
        console.error('Get tables error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Update table status
 */
export async function updateTableStatusAction(data) {
    try {
        await checkAuth(data.businessId, null, 'restaurant.manage_tables', 'restaurant_kds');
        return await RestaurantService.updateTableStatus(data);
    } catch (error) {
        console.error('Update table status error:', error);
        return { success: false, error: error.message };
    }
}

// --- Order Management -------------------------------------------------------

/**
 * Create a restaurant order + send items to kitchen
 */
export async function createRestaurantOrderAction(data) {
    try {
        const session = await checkAuth(data.businessId, null, 'restaurant.create_order', 'restaurant_kds');
        const order = await RestaurantService.createOrder(data, session.user.id);

        auditWrite({
            businessId: data.businessId, action: 'create', entityType: 'restaurant_order', entityId: order.id,
            description: `Created restaurant order ${order.order_number}`,
            metadata: { orderNumber: order.order_number, total: order.total_amount },
        });

        return { success: true, order };
    } catch (error) {
        console.error('Create restaurant order action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update order status
 */
export async function updateOrderStatusAction(data) {
    try {
        await checkAuth(data.businessId, null, 'restaurant.create_order', 'restaurant_kds');
        await RestaurantService.updateOrderStatus(data);

        auditWrite({
            businessId: data.businessId, action: 'update', entityType: 'restaurant_order', entityId: data.orderId,
            description: `Order status updated to ${data.status}`,
        });

        return { success: true };
    } catch (error) {
        console.error('Update order status action error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get active restaurant orders
 */
export async function getActiveOrdersAction(businessId, filters = {}) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'restaurant.view_tables', 'restaurant_kds');

        let query = `
            SELECT ro.*, rt.table_number, rt.section, c.name as customer_name,
                   json_agg(json_build_object(
                       'id', roi.id, 'item_name', roi.item_name, 'quantity', roi.quantity,
                       'unit_price', roi.unit_price, 'modifiers', roi.modifiers,
                       'special_instructions', roi.special_instructions, 'status', roi.status
                   ) ORDER BY roi.created_at) as items
            FROM restaurant_orders ro
            LEFT JOIN restaurant_tables rt ON ro.table_id = rt.id
            LEFT JOIN customers c ON ro.customer_id = c.id
            LEFT JOIN restaurant_order_items roi ON ro.id = roi.order_id
            WHERE ro.business_id = $1
        `;
        const params = [businessId];
        let idx = 2;

        if (filters.status) {
            query += ` AND ro.status = $${idx}`;
            params.push(filters.status);
            idx++;
        } else {
            query += ` AND ro.status NOT IN ('completed', 'cancelled')`;
        }

        query += ` GROUP BY ro.id, rt.table_number, rt.section, c.name ORDER BY ro.created_at DESC`;

        const result = await client.query(query, params);
        return { success: true, orders: result.rows };
    } catch (error) {
        console.error('Get active orders error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

// --- Kitchen Display System (KDS) -------------------------------------------

/**
 * Get kitchen queue
 */
export async function getKitchenQueueAction(businessId, station = null) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, client, 'restaurant.view_kds', 'restaurant_kds');
        let query = `
            SELECT ko.*, ro.order_number, ro.order_type, rt.table_number,
                   EXTRACT(EPOCH FROM (NOW() - ko.created_at))::int as seconds_elapsed
            FROM kitchen_orders ko
            JOIN restaurant_orders ro ON ko.order_id = ro.id
            LEFT JOIN restaurant_tables rt ON ro.table_id = rt.id
            WHERE ko.business_id = $1 AND ko.status IN ('pending', 'preparing')
        `;
        const params = [businessId];
        if (station) {
            query += ` AND ko.station = $2`;
            params.push(station);
        }
        query += ` ORDER BY ko.priority DESC, ko.created_at ASC`;
        const result = await client.query(query, params);
        return { success: true, queue: result.rows };
    } catch (error) {
        console.error('Get kitchen queue error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Update kitchen order status
 */
export async function updateKitchenOrderAction(data) {
    try {
        await checkAuth(data.businessId, null, 'restaurant.view_kds', 'restaurant_kds');
        return await RestaurantService.updateKitchenOrder(data);
    } catch (error) {
        console.error('Update kitchen order error:', error);
        return { success: false, error: error.message };
    }
}
