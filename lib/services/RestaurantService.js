import pool from '@/lib/db';
import { DocumentSequenceService } from './DocumentSequenceService';
import { InventoryService } from './InventoryService';

/**
 * Restaurant Service (Enterprise SOA)
 * Orchestrates Tables, Orders, KDS, and Ingredients.
 */
export const RestaurantService = {

    async getClient(txClient) {
        return txClient || await pool.connect();
    },

    /**
     * Upsert Table
     */
    async upsertTable(data, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            const res = await client.query(`
                INSERT INTO restaurant_tables (
                    business_id, table_number, section, capacity, is_active, sort_order
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (business_id, table_number)
                DO UPDATE SET section = $3, capacity = $4, is_active = $5, sort_order = $6
                RETURNING *
            `, [
                data.businessId, data.tableNumber,
                data.section || null, data.capacity || 4,
                data.isActive !== false, data.sortOrder || 0
            ]);
            return res.rows[0];
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Create Order
     */
    async createOrder(data, userId, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            const orderNumber = await DocumentSequenceService.generateNumber({
                businessId: data.businessId, documentType: 'restaurant_order', prefix: 'ORD-', padLength: 6
            }, client);

            // Calculate totals
            let subtotal = 0;
            for (const item of data.items) {
                const modPrice = (item.modifiers || []).reduce((sum, m) => sum + parseFloat(m.price || 0), 0);
                subtotal += (parseFloat(item.unitPrice) + modPrice) * (item.quantity || 1);
            }
            const taxAmount = Math.round(subtotal * ((data.taxPercent || 0) / 100) * 100) / 100;
            const discountAmount = parseFloat(data.discountAmount || 0);
            const totalAmount = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;

            const res = await client.query(`
                INSERT INTO restaurant_orders (
                    business_id, order_number, table_id, order_type,
                    customer_id, waiter_id, status,
                    subtotal, tax_amount, discount_amount, total_amount, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                data.businessId, orderNumber, data.tableId, data.orderType,
                data.customerId, userId, subtotal, taxAmount, discountAmount, totalAmount, data.notes
            ]);
            const order = res.rows[0];

            // Items & KDS
            const kitchenItems = [];
            for (const item of data.items) {
                await client.query(`
                    INSERT INTO restaurant_order_items (
                        business_id, order_id, product_id, item_name, quantity,
                        unit_price, modifiers, special_instructions, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                `, [
                    data.businessId, order.id, item.productId, item.itemName,
                    item.quantity || 1, item.unitPrice, JSON.stringify(item.modifiers || []),
                    item.specialInstructions, 'pending'
                ]);
                kitchenItems.push({
                    item_name: item.itemName, qty: item.quantity || 1,
                    mods: item.modifiers || [], special: item.specialInstructions
                });

                // Institutional Stock Reservation for Kitchen (KOT)
                if (item.productId) {
                    try {
                        await InventoryService.reserveStock({
                            business_id: data.businessId,
                            product_id: item.productId,
                            quantity: item.quantity || 1,
                            reference: `KOT Order: ${orderNumber}`
                        }, client);
                    } catch (reserveError) {
                        console.warn(`[RestaurantService] Provisioning failed for item ${item.itemName}:`, reserveError.message);
                        // We allow the order to proceed for hospitality flexibility, 
                        // but log the stockout risk.
                    }
                }
            }

            await client.query(`
                INSERT INTO kitchen_orders (business_id, order_id, station, priority, status, items)
                VALUES ($1, $2, $3, $4, 'pending', $5)
            `, [data.businessId, order.id, data.station, data.priority || 0, JSON.stringify(kitchenItems)]);

            if (data.tableId && data.orderType !== 'takeaway') {
                await client.query(`UPDATE restaurant_tables SET status = 'occupied', current_order_id = $1 WHERE id = $2`, [order.id, data.tableId]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return order;
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update Order Status
     */
    async updateOrderStatus(data, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            await client.query(`UPDATE restaurant_orders SET status = $1, updated_at = NOW() WHERE id = $2`, [data.status, data.orderId]);

            if (data.status === 'completed' || data.status === 'cancelled') {
                await client.query(`UPDATE restaurant_tables SET status = 'available', current_order_id = NULL WHERE current_order_id = $1`, [data.orderId]);
            }

            if (data.status === 'completed') {
                const items = await client.query(`SELECT product_id, item_name, quantity FROM restaurant_order_items WHERE order_id = $1`, [data.orderId]);
                for (const item of items.rows) {
                    if (item.product_id) {
                        // 1. Release the KOT reservation
                        // We search by reference pattern since we didn't store reservation IDs explicitly in order_items
                        const orderRes = await client.query(`SELECT order_number FROM restaurant_orders WHERE id = $1`, [data.orderId]);
                        const orderNum = orderRes.rows[0]?.order_number;
                        
                        await client.query(`
                            UPDATE inventory_reservations 
                            SET status = 'completed', updated_at = NOW() 
                            WHERE business_id = $1 AND product_id = $2 AND reference = $3 AND status = 'active'
                        `, [data.businessId, item.product_id, `KOT Order: ${orderNum}`]);

                        // 2. Perform Permanent Stock Deduction
                        await InventoryService.removeStock({
                            business_id: data.businessId, product_id: item.product_id,
                            quantity: Number(item.quantity) || 1, reference_type: 'restaurant_order',
                            reference_id: data.orderId, notes: `Restaurant order: ${item.item_name}`
                        }, null, client);
                    }
                }
            } else if (data.status === 'cancelled') {
                // Return reserved stock to inventory pool
                const orderRes = await client.query(`SELECT order_number FROM restaurant_orders WHERE id = $1`, [data.orderId]);
                const orderNum = orderRes.rows[0]?.order_number;
                
                await client.query(`
                    UPDATE inventory_reservations SET status = 'cancelled', updated_at = NOW() 
                    WHERE business_id = $1 AND reference = $2 AND status = 'active'
                `, [data.businessId, `KOT Order: ${orderNum}`]);
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update Table Status
     */
    async updateTableStatus(params, txClient = null) {
        const client = await this.getClient(txClient);
        try {
            await client.query(
                `UPDATE restaurant_tables SET status = $1, current_order_id = $2 WHERE id = $3 AND business_id = $4`,
                [params.status, params.currentOrderId || null, params.tableId, params.businessId]
            );
            return { success: true };
        } finally {
            if (!txClient) client.release();
        }
    },

    /**
     * Update Kitchen Order Status (KDS)
     */
    async updateKitchenOrder(data, txClient = null) {
        const client = await this.getClient(txClient);
        const shouldManageTransaction = !txClient;
        try {
            if (shouldManageTransaction) await client.query('BEGIN');

            await client.query(`
                UPDATE kitchen_orders SET
                    status = $1,
                    started_at = CASE WHEN $1 = 'preparing' THEN NOW() ELSE started_at END,
                    completed_at = CASE WHEN $1 IN ('ready', 'completed') THEN NOW() ELSE completed_at END
                WHERE id = $2 AND business_id = $3
            `, [data.status, data.kitchenOrderId, data.businessId]);

            // If kitchen order is ready, check parent status
            if (data.status === 'ready') {
                const koRes = await client.query(`
                    SELECT ko.order_id,
                           COUNT(*) FILTER (WHERE ko.status NOT IN ('ready', 'completed'))::int as pending_count
                    FROM kitchen_orders ko
                    WHERE ko.id = $1
                    GROUP BY ko.order_id
                `, [data.kitchenOrderId]);

                if (koRes.rows.length > 0 && koRes.rows[0].pending_count === 0) {
                    await client.query(
                        `UPDATE restaurant_orders SET status = 'ready', updated_at = NOW() WHERE id = $1`,
                        [koRes.rows[0].order_id]
                    );
                }
            }

            if (shouldManageTransaction) await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            if (shouldManageTransaction) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (!txClient) client.release();
        }
    }
};
