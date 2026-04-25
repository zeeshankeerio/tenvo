'use server';

import pool from '@/lib/db';
import { reserveStockAction, releaseStockAction, removeStockAction } from '@/lib/actions/standard/inventory/stock';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { withGuard } from '@/lib/rbac/serverGuard';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

async function checkAuth(businessId, permission = 'sales.view', client = null) {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Server Action: Get all quotations for a business
 */
export async function getQuotationsAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'sales.view', client);

        const result = await client.query(`
            SELECT 
                q.*,
                c.name as customer_name,
                c.email as customer_email
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.business_id = $1
            ORDER BY q.created_at DESC
        `, [businessId]);

        return { success: true, quotations: result.rows };
    } catch (error) {
        console.error('Get quotations error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Create quotation with items
 */
export async function createQuotationAction(quotationData) {
    const client = await pool.connect();

    try {
        const session = await checkAuth(quotationData.business_id, 'sales.create_quotation', client);

        await client.query('BEGIN');

        const { items, ...header } = quotationData;

        // Create quotation header
        const headerResult = await client.query(`
            INSERT INTO quotations (
                business_id, customer_id, quotation_number, date,
                valid_until, subtotal, tax_total, total_amount,
                notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            header.business_id,
            header.customer_id,
            header.quotation_number || `QT-${Date.now()}`,
            header.date || new Date().toISOString(),
            header.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            header.subtotal || 0,
            header.tax_total || 0,
            header.total_amount || 0,
            header.notes || null,
            header.status || 'draft'
        ]);

        const quotation = headerResult.rows[0];

        // Create quotation items
        if (items && items.length > 0) {
            const itemsToInsert = items.map(item => [
                quotation.id,
                header.business_id,
                item.product_id,
                item.quantity,
                item.unit_price,
                item.quantity * item.unit_price
            ]);

            for (const itemData of itemsToInsert) {
                await client.query(`
                    INSERT INTO quotation_items (
                        quotation_id, business_id, product_id,
                        quantity, unit_price, total_amount
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, itemData);
            }
        }

        await client.query('COMMIT');

        // Audit log
        auditWrite({
            business_id: header.business_id,
            user_id: session.user.id,
            action: 'create_quotation',
            entity_type: 'quotation',
            entity_id: quotation.id,
            meta: { total: header.total_amount }
        });

        return { success: true, quotation };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create quotation error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get quotation details including items
 */
export async function getQuotationDetailAction(quotationId) {
    const client = await pool.connect();
    try {
        // First get business_id from the quotation to perform auth check
        const headerResult = await client.query(`
            SELECT q.*, c.name as customer_name
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.id = $1
        `, [quotationId]);

        if (headerResult.rows.length === 0) {
            return { success: false, error: 'Quotation not found' };
        }

        const businessId = headerResult.rows[0].business_id;
        await checkAuth(businessId, 'sales.view', client);

        const itemsResult = await client.query(`
            SELECT qi.*, p.name as product_name
            FROM quotation_items qi
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE qi.quotation_id = $1 AND qi.business_id = $2
        `, [quotationId, businessId]);

        return {
            success: true,
            quotation: {
                ...headerResult.rows[0],
                items: itemsResult.rows
            }
        };
    } catch (error) {
        console.error('Get quotation detail error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get all sales orders for a business
 */
export async function getSalesOrdersAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'sales.view', client);
        const result = await client.query(`
            SELECT 
                so.*,
                c.name as customer_name,
                c.email as customer_email
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE so.business_id = $1
            ORDER BY so.created_at DESC
        `, [businessId]);

        return { success: true, salesOrders: result.rows };
    } catch (error) {
        console.error('Get sales orders error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Create sales order with items
 */
export async function createSalesOrderAction(orderData) {
    const client = await pool.connect();

    try {
        const session = await checkAuth(orderData.business_id, 'sales.create_order', client);

        await client.query('BEGIN');

        const { items, ...header } = orderData;

        // Create sales order header
        const headerResult = await client.query(`
            INSERT INTO sales_orders (
                business_id, customer_id, quotation_id, order_number, date,
                delivery_date, subtotal, tax_total, total_amount,
                notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            header.business_id,
            header.customer_id,
            header.quotation_id || null,
            header.order_number || `SO-${Date.now()}`,
            header.date || new Date().toISOString(),
            header.delivery_date || null,
            header.subtotal || 0,
            header.tax_total || 0,
            header.total_amount || 0,
            header.notes || null,
            header.status || 'pending'
        ]);

        const salesOrder = headerResult.rows[0];

        // Create sales order items and handle reservation
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(`
                    INSERT INTO sales_order_items (
                        business_id, sales_order_id, product_id, name, description,
                        quantity, unit_price, tax_percent, tax_amount,
                        discount_amount, total_amount, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    header.business_id,
                    salesOrder.id,
                    item.product_id,
                    item.name || null,
                    item.description || null,
                    item.quantity || 1,
                    item.unit_price || 0,
                    item.tax_percent || 0,
                    item.tax_amount || 0,
                    item.discount_amount || 0,
                    item.total_amount || (item.quantity * item.unit_price),
                    JSON.stringify(item.metadata || {})
                ]);

                // Handle reservation if batch_id is provided
                if (item.batch_id) {
                    const res = await reserveStockAction({
                        business_id: header.business_id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        batch_id: item.batch_id
                    }, client);

                    if (!res.success) throw new Error(`Reservation failed: ${res.error}`);
                }
            }
        }

        // Mark source quotation as converted
        if (header.quotation_id) {
            // Assert quotation belongs to business before updating
            await assertEntityBelongsToBusiness(client, 'quotation', header.quotation_id, header.business_id);
            
            await client.query(
                `UPDATE quotations SET status = 'converted', converted_to_order = true, updated_at = NOW() WHERE id = $1 AND business_id = $2`,
                [header.quotation_id, header.business_id]
            );
        }

        await client.query('COMMIT');

        // Audit log
        auditWrite({
            business_id: header.business_id,
            user_id: session.user.id,
            action: 'create_sales_order',
            entity_type: 'sales_order',
            entity_id: salesOrder.id,
            meta: { quotation_id: header.quotation_id || null, total: header.total_amount }
        });

        return { success: true, salesOrder };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create sales order error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get sales order details including items
 */
export async function getSalesOrderDetailAction(orderId) {
    const client = await pool.connect();
    try {
        const headerResult = await client.query(`
            SELECT so.*, c.name as customer_name
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE so.id = $1
        `, [orderId]);

        if (headerResult.rows.length === 0) {
            return { success: false, error: 'Sales Order not found' };
        }

        const businessId = headerResult.rows[0].business_id;
        await checkAuth(businessId, 'sales.view', client);

        const itemsResult = await client.query(`
            SELECT soi.*, p.name as product_name
            FROM sales_order_items soi
            LEFT JOIN products p ON soi.product_id = p.id
            WHERE soi.sales_order_id = $1 AND soi.business_id = $2
        `, [orderId, businessId]);

        return {
            success: true,
            salesOrder: {
                ...headerResult.rows[0],
                items: itemsResult.rows
            }
        };
    } catch (error) {
        console.error('Get sales order detail error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get all delivery challans for a business
 */
export async function getChallansAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'sales.view', client);
        const result = await client.query(`
            SELECT 
                dc.*,
                c.name as customer_name,
                c.email as customer_email
            FROM delivery_challans dc
            LEFT JOIN customers c ON dc.customer_id = c.id
            WHERE dc.business_id = $1
            ORDER BY dc.created_at DESC
        `, [businessId]);

        return { success: true, challans: result.rows };
    } catch (error) {
        console.error('Get challans error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Create delivery challan with items
 * Automatically deducts stock from inventory
 */
export async function createChallanAction(challanData) {
    const client = await pool.connect();

    try {
        const session = await checkAuth(challanData.business_id, 'sales.create_challan', client);

        await client.query('BEGIN');

        const { items, ...header } = challanData;

        // Validate stock availability before creating challan
        if (items && items.length > 0) {
            for (const item of items) {
                const stockCheck = await client.query(
                    'SELECT stock FROM products WHERE id = $1 AND business_id = $2 AND is_deleted = false',
                    [item.product_id, header.business_id]
                );

                if (stockCheck.rows.length === 0) {
                    throw new Error(`Product ${item.product_id} not found`);
                }

                const availableStock = stockCheck.rows[0].stock || 0;
                if (availableStock < item.quantity) {
                    // Get product name for better error message
                    const productName = await client.query(
                        'SELECT name FROM products WHERE id = $1 AND business_id = $2 AND is_deleted = false',
                        [item.product_id, header.business_id]
                    );
                    throw new Error(
                        `Insufficient stock for ${productName.rows[0]?.name || 'product'}. ` +
                        `Available: ${availableStock}, Requested: ${item.quantity}`
                    );
                }
            }
        }

        // Create delivery challan header
        const headerResult = await client.query(`
            INSERT INTO delivery_challans (
                business_id, customer_id, sales_order_id, challan_number, date,
                delivery_address, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            header.business_id,
            header.customer_id,
            header.sales_order_id || null,
            header.challan_number || `DC-${Date.now()}`,
            header.date || new Date().toISOString(),
            header.delivery_address || null,
            header.notes || null,
            header.status || 'issued'
        ]);

        const challan = headerResult.rows[0];

        // Create delivery challan items AND deduct stock
        if (items && items.length > 0) {
            for (const item of items) {
                // Insert challan item
                await client.query(`
                    INSERT INTO challan_items (
                        business_id, challan_id, product_id, batch_id, name,
                        quantity, serial_numbers
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    header.business_id,
                    challan.id,
                    item.product_id,
                    item.batch_id || null,
                    item.name || null,
                    item.quantity,
                    item.serial_numbers || []
                ]);

                // Release reservation if this was from a sales order
                if (header.sales_order_id && item.batch_id) {
                    await releaseStockAction({
                        business_id: header.business_id,
                        batch_id: item.batch_id,
                        quantity: item.quantity
                    }, client);
                }

                // Deduct stock from inventory
                // Use warehouse from challan data or get default
                const warehouseId = header.warehouse_id || null;

                try {
                    // Use the standardized removeStockAction for consistent logic and accounting
                    const stockRes = await removeStockAction({
                        business_id: header.business_id,
                        product_id: item.product_id,
                        warehouse_id: warehouseId,
                        quantity: Number(item.quantity) || 0,
                        batch_id: item.batch_id,
                        serial_numbers: item.serial_numbers || [],
                        reference_type: 'delivery_challan',
                        reference_id: challan.id,
                        notes: `Delivery Challan ${challan.challan_number}`
                    }, client); // Share the transaction

                    if (!stockRes.success) {
                        throw new Error(stockRes.error);
                    }

                } catch (stockError) {
                    console.error('Stock deduction error:', stockError);
                    throw new Error(`Failed to deduct stock for item: ${stockError.message}`);
                }
            }
        }

        // Mark source sales order as dispatched
        if (header.sales_order_id) {
            // Assert sales order belongs to business before updating
            await assertEntityBelongsToBusiness(client, 'sales_order', header.sales_order_id, header.business_id);
            
            await client.query(
                `UPDATE sales_orders SET status = 'dispatched', updated_at = NOW() WHERE id = $1 AND business_id = $2`,
                [header.sales_order_id, header.business_id]
            );
        }

        await client.query('COMMIT');

        // Audit log
        auditWrite({
            business_id: header.business_id,
            user_id: session.user.id,
            action: 'create_delivery_challan',
            entity_type: 'delivery_challan',
            entity_id: challan.id,
            meta: { sales_order_id: header.sales_order_id || null, total: header.total_amount }
        });

        return { success: true, challan };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create challan error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Server Action: Get delivery challan details including items
 */
export async function getChallanDetailAction(challanId) {
    const client = await pool.connect();
    try {
        const headerResult = await client.query(`
            SELECT dc.*, c.name as customer_name
            FROM delivery_challans dc
            LEFT JOIN customers c ON dc.customer_id = c.id
            WHERE dc.id = $1
        `, [challanId]);

        if (headerResult.rows.length === 0) {
            return { success: false, error: 'Delivery Challan not found' };
        }

        await checkAuth(headerResult.rows[0].business_id, 'sales.view', client);

        const itemsResult = await client.query(`
            SELECT ci.*, p.name as product_name
            FROM challan_items ci
            LEFT JOIN products p ON ci.product_id = p.id
            WHERE ci.challan_id = $1
        `, [challanId]);

        return {
            success: true,
            challan: {
                ...headerResult.rows[0],
                items: itemsResult.rows
            }
        };
    } catch (error) {
        console.error('Get challan detail error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
