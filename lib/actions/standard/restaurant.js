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
            SELECT ko.id, ko.order_id, ko.station, ko.priority, ko.status,
                   ko.items, ko.estimated_time, ko.started_at, ko.completed_at, ko.created_at,
                   ro.order_number, ro.order_type, ro.notes,
                   rt.table_number,
                   EXTRACT(EPOCH FROM (NOW() - ko.created_at))::int as seconds_elapsed
            FROM kitchen_orders ko
            JOIN restaurant_orders ro ON ko.order_id = ro.id
            LEFT JOIN restaurant_tables rt ON ro.table_id = rt.id
            WHERE ko.business_id = $1 AND ko.status IN ('pending', 'preparing', 'ready')
        `;
        const params = [businessId];
        if (station) {
            query += ` AND ko.station = $2`;
            params.push(station);
        }
        query += ` ORDER BY ko.priority DESC, ko.created_at ASC`;
        const result = await client.query(query, params);

        // Normalize items, handle both JSON string and parsed array
        const queue = result.rows.map(row => ({
            ...row,
            items: (() => {
                try {
                    const raw = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
                    return raw.map(i => ({
                        ...i,
                        name: i.item_name || i.name || i.product_name || 'Item',
                        quantity: i.quantity || i.qty || 1,
                    }));
                } catch { return []; }
            })(),
        }));

        return { success: true, queue, orders: queue };
    } catch (error) {
        console.error('Get kitchen queue error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Settle a restaurant order, record payment, mark completed, free table.
 * Does NOT require an open POS session.
 */
export async function settleRestaurantOrderAction(data) {
    const client = await pool.connect();
    try {
        const session = await checkAuth(data.businessId, client, 'restaurant.create_order', 'restaurant_kds');

        await client.query('BEGIN');

        // 1. Get the order
        const orderRes = await client.query(
            `SELECT * FROM restaurant_orders WHERE id = $1 AND business_id = $2`,
            [data.orderId, data.businessId]
        );
        if (orderRes.rows.length === 0) throw new Error('Order not found');
        const order = orderRes.rows[0];

        let posTransactionId = null;

        // Optional: mirror restaurant payment into POS ledger when session provided
        if (data.sessionId) {
            const itemsRes = await client.query(
                `SELECT product_id, item_name, quantity, unit_price, tax_amount
                 FROM restaurant_order_items WHERE order_id = $1`,
                [order.id]
            );
            const payAmount = Number(data.amount || order.total_amount || 0);
            const posItems = itemsRes.rows
                .filter((i) => i.product_id)
                .map((i) => ({
                    productId: i.product_id,
                    productName: i.item_name,
                    quantity: Number(i.quantity) || 1,
                    unitPrice: Number(i.unit_price) || 0,
                    taxPercent: 0,
                    taxAmount: Number(i.tax_amount) || 0,
                }));

            if (posItems.length > 0) {
                const { POSService } = await import('@/lib/services/POSService');
                const posTx = await POSService.createTransaction({
                    businessId: data.businessId,
                    sessionId: data.sessionId,
                    customerId: order.customer_id || null,
                    items: posItems,
                    discountAmount: 0,
                    payments: [{
                        method: data.paymentMethod || 'cash',
                        amount: payAmount,
                    }],
                }, session.user.id, client);
                posTransactionId = posTx.id;
            }
        }

        // 2. Record payment
        await client.query(
            `INSERT INTO payments (
                business_id, payment_type, reference_type, reference_id,
                customer_id, amount, payment_mode, payment_date, notes,
                status, domain_data, created_at, updated_at
            ) VALUES ($1, 'in', 'restaurant_order', $2, $3, $4, $5, CURRENT_DATE, $6, 'active', $7, NOW(), NOW())`,
            [
                data.businessId,
                order.id,
                order.customer_id || null,
                data.amount || order.total_amount,
                data.paymentMethod || 'cash',
                `Restaurant order ${order.order_number}`,
                JSON.stringify({
                    restaurant_order_id: order.id,
                    order_number: order.order_number,
                    pos_transaction_id: posTransactionId,
                    settled_via_pos: Boolean(posTransactionId),
                }),
            ]
        );

        // 3. Mark order completed and paid
        await client.query(
            `UPDATE restaurant_orders
             SET status = 'completed', payment_status = 'paid', payment_method = $1, updated_at = NOW()
             WHERE id = $2`,
            [data.paymentMethod || 'cash', order.id]
        );

        // 4. Free the table
        if (order.table_id) {
            await client.query(
                `UPDATE restaurant_tables SET status = 'available', current_order_id = NULL WHERE id = $1`,
                [order.table_id]
            );
        }

        // 5. Mark all kitchen orders complete
        await client.query(
            `UPDATE kitchen_orders SET status = 'completed', completed_at = NOW() WHERE order_id = $1`,
            [order.id]
        );

        await client.query('COMMIT');

        auditWrite({
            businessId: data.businessId, action: 'settle', entityType: 'restaurant_order', entityId: order.id,
            description: `Settled restaurant order ${order.order_number} via ${data.paymentMethod || 'cash'}`,
            metadata: { amount: data.amount || order.total_amount, paymentMethod: data.paymentMethod },
        });

        return { success: true, order: { ...order, status: 'completed', payment_status: 'paid' } };
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Settle restaurant order error:', error);
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
