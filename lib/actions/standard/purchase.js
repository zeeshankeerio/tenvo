'use server';

import pool from '@/lib/db';
import { addStockAction } from '@/lib/actions/standard/inventory/stock';
import { createBatchAction } from '@/lib/actions/standard/inventory/batch';
import { createGLEntryAction } from '@/lib/actions/basic/accounting';
import { ACCOUNT_CODES } from '@/lib/config/accounting';
import { insertPurchaseItemCompat } from '@/lib/actions/_shared/purchaseItems';
import { actionSuccess, actionFailure, getErrorMessage } from '@/lib/actions/_shared/result';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';
import { withGuard } from '@/lib/rbac/serverGuard';
import { auditWrite } from '@/lib/actions/_shared/audit';

async function checkAuth(businessId, permission, client = null) {
    return withGuard(businessId, { permission, feature: 'purchases', client });
}

/**
 * Server Action: Get all purchases for a business
 */
export async function getPurchasesAction(businessId) {
    try {
        await checkAuth(businessId, 'purchases.view');

        const client = await pool.connect();
        try {
            let result;
            try {
                result = await client.query(`
                    SELECT 
                        p.*,
                        v.name as vendor_name,
                        v.email as vendor_email
                    FROM purchases p
                    LEFT JOIN vendors v ON p.vendor_id = v.id
                    WHERE p.business_id = $1
                      AND (p.is_deleted = false OR p.is_deleted IS NULL)
                    ORDER BY p.date DESC, p.created_at DESC
                `, [businessId]);
            } catch (queryError) {
                if (queryError?.code !== '42703') {
                    throw queryError;
                }
                result = await client.query(`
                    SELECT 
                        p.*,
                        v.name as vendor_name,
                        v.email as vendor_email
                    FROM purchases p
                    LEFT JOIN vendors v ON p.vendor_id = v.id
                    WHERE p.business_id = $1
                    ORDER BY p.date DESC, p.created_at DESC
                `, [businessId]);
            }

            return actionSuccess({ purchases: result.rows });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get purchases error:', error);
        return actionFailure('GET_PURCHASES_FAILED', await getErrorMessage(error));
    }
}

/**
 * Server Action: Get purchase by ID with items
 */
export async function getPurchaseByIdAction(businessId, purchaseId) {
    try {
        await checkAuth(businessId, 'purchases.view');

        const client = await pool.connect();
        try {
            // Get purchase header
            const headerResult = await client.query(`
                SELECT 
                    p.*,
                    v.name as vendor_name,
                    v.email as vendor_email,
                    v.phone as vendor_phone
                FROM purchases p
                LEFT JOIN vendors v ON p.vendor_id = v.id
                WHERE p.id = $1 AND p.business_id = $2
            `, [purchaseId, businessId]);

            if (headerResult.rows.length === 0) {
                return actionFailure('PURCHASE_NOT_FOUND', 'Purchase not found');
            }

            const purchase = headerResult.rows[0];

            // Get purchase items
            const itemsResult = await client.query(`
                SELECT 
                    pi.*,
                    pr.name as product_name,
                    pr.sku as product_sku
                FROM purchase_items pi
                JOIN purchases p ON p.id = pi.purchase_id
                LEFT JOIN products pr ON pi.product_id = pr.id
                WHERE pi.purchase_id = $1 AND p.business_id = $2
                ORDER BY pi.created_at
            `, [purchaseId, businessId]);

            purchase.items = itemsResult.rows;

            return actionSuccess({ purchase });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get purchase by ID error:', error);
        return actionFailure('GET_PURCHASE_BY_ID_FAILED', await getErrorMessage(error));
    }
}

/**
 * Server Action: Create purchase with full transaction support
 * Handles: purchase creation, items, batch creation, inventory update, GL entries
 */
export async function createPurchaseAction(purchaseData) {
    const client = await pool.connect();

    try {
        await checkAuth(purchaseData.business_id, 'purchases.create', client);

        await client.query('BEGIN');

        const { items, ...header } = purchaseData;

        await assertEntityBelongsToBusiness(client, 'vendor', header.vendor_id, header.business_id);
        await assertEntityBelongsToBusiness(client, 'warehouse', header.warehouse_id, header.business_id);

        const duplicatePurchase = await client.query(
            `SELECT id FROM purchases WHERE business_id = $1 AND purchase_number = $2 LIMIT 1`,
            [header.business_id, header.purchase_number]
        );
        if (duplicatePurchase.rows.length > 0) {
            await client.query('ROLLBACK');
            return actionFailure('DUPLICATE_PURCHASE_NUMBER', 'Purchase number already exists for this business');
        }

        // 1. Create Purchase Header
        const headerResult = await client.query(`
            INSERT INTO purchases (
                business_id, vendor_id, warehouse_id, purchase_number,
                date, subtotal, tax_total, total_amount, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            header.business_id,
            header.vendor_id,
            header.warehouse_id || null,
            header.purchase_number,
            header.date || new Date().toISOString(),
            header.subtotal || 0,
            header.tax_total || 0,
            header.total_amount || 0,
            header.notes || null,
            header.status || 'received'
        ]);

        const purchase = headerResult.rows[0];

        if (!items || items.length === 0) {
            await client.query('COMMIT');
            return actionSuccess({ purchase });
        }

        // 2. Process Each Item
        const processedItems = [];
        for (const item of items) {
            await assertEntityBelongsToBusiness(client, 'product', item.product_id, header.business_id);
            let batchId = item.batch_id;

            // Auto-create batch if batch info provided
            if (!batchId && item.batch_number) {
                const batchResult = await createBatchAction({
                    businessId: header.business_id,
                    productId: item.product_id,
                    warehouseId: header.warehouse_id,
                    batchNumber: item.batch_number,
                    manufacturingDate: item.manufacturing_date,
                    expiryDate: item.expiry_date,
                    quantity: item.quantity,
                    costPrice: item.unit_cost,
                    notes: `Purchase #${header.purchase_number}`
                }, client); // Pass shared client

                if (batchResult.success) {
                    batchId = batchResult.batch.id;
                }
            }

            // Insert purchase item with schema-compatible column mapping.
            const itemResult = await insertPurchaseItemCompat(client, {
                businessId: header.business_id,
                purchaseId: purchase.id,
                productId: item.product_id,
                description: item.description,
                quantity: item.quantity,
                unitCost: item.unit_cost,
                taxRate: item.tax_rate,
                totalAmount: item.total_amount,
                batchId,
                withReturning: true,
            });

            processedItems.push(itemResult.rows[0]);

            // 3. Update Inventory (ONLY IF RECEIVED)
            if (header.status === 'received') {
                const stockResult = await addStockAction({
                    businessId: header.business_id,
                    productId: item.product_id,
                    warehouseId: header.warehouse_id,
                    quantity: item.quantity,
                    unitCost: item.unit_cost,
                    batchId: batchId,
                    referenceType: 'purchase',
                    referenceId: purchase.id,
                    notes: `Purchase #${header.purchase_number}`
                }, client); // Pass shared client

                if (!stockResult.success) {
                    throw new Error(`Inventory update failed: ${stockResult.error}`);
                }
            }
        }

        // 4. Create GL Entry & 5. Update Vendor Balance (ONLY IF RECEIVED)
        if (header.status === 'received') {
            await createGLEntryAction({
                businessId: header.business_id,
                date: header.date,
                description: `Purchase #${header.purchase_number}`,
                referenceType: 'purchase',
                referenceId: purchase.id,
                entries: [
                    { accountCode: ACCOUNT_CODES.INVENTORY_ASSET, debit: header.total_amount, credit: 0 },
                    { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: 0, credit: header.total_amount }
                ]
            }, client); // Pass shared client

            // 5. Update Vendor Balance
            await client.query(`
                UPDATE vendors 
                SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1,
                updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [header.total_amount, header.vendor_id, header.business_id]);
        }

        await client.query('COMMIT');

        return actionSuccess({
            purchase: {
                ...purchase,
                items: processedItems
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create purchase error:', error);
        if (error?.code === '23505') {
            return actionFailure('DUPLICATE_PURCHASE_NUMBER', 'Purchase number already exists for this business');
        }
        return actionFailure('CREATE_PURCHASE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Server Action: Update purchase status and trigger stock movement if received
 */
export async function updatePurchaseStatusAction(businessId, purchaseId, status) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'purchases.approve', client);

        await client.query('BEGIN');

        // 1. Get current purchase status and data
        const currentRes = await client.query(
            'SELECT status, vendor_id, total_amount, warehouse_id, purchase_number FROM purchases WHERE id = $1 AND business_id = $2 FOR UPDATE',
            [purchaseId, businessId]
        );

        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return actionFailure('PURCHASE_NOT_FOUND', 'Purchase not found');
        }

        const purchase = currentRes.rows[0];

        // 2. If transitioning to 'received' and wasn't already received, process stock
        if (status === 'received' && purchase.status !== 'received') {
            // Fetch items
            const itemsRes = await client.query(
                `SELECT pi.*
                 FROM purchase_items pi
                 JOIN purchases p ON p.id = pi.purchase_id
                 WHERE pi.purchase_id = $1 AND p.business_id = $2`,
                [purchaseId, businessId]
            );

            for (const item of itemsRes.rows) {
                // Update Inventory
                const stockResult = await addStockAction({
                    businessId: businessId,
                    productId: item.product_id,
                    warehouseId: purchase.warehouse_id,
                    quantity: item.quantity,
                    unitCost: item.unit_cost,
                    batchId: item.batch_id,
                    referenceType: 'purchase',
                    referenceId: purchaseId,
                    notes: `Purchase received: ${purchase.purchase_number}`
                }, client);

                if (!stockResult.success) {
                    throw new Error(`Inventory update failed: ${stockResult.error}`);
                }
            }

            // 3. Create GL Entry
            await createGLEntryAction({
                businessId: businessId,
                date: new Date().toISOString(),
                description: `Purchase #${purchase.purchase_number} received`,
                referenceType: 'purchase',
                referenceId: purchaseId,
                entries: [
                    { accountCode: ACCOUNT_CODES.INVENTORY_ASSET, debit: purchase.total_amount, credit: 0 },
                    { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: 0, credit: purchase.total_amount }
                ]
            }, client);

            // 4. Update Vendor Balance
            await client.query(`
                UPDATE vendors 
                SET outstanding_balance = COALESCE(outstanding_balance, 0) + $1,
                updated_at = NOW()
                WHERE id = $2 AND business_id = $3
            `, [purchase.total_amount, purchase.vendor_id, businessId]);
        }

        // 5. Update Status
        const result = await client.query(`
            UPDATE purchases 
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND business_id = $3
            RETURNING *
        `, [status, purchaseId, businessId]);

        await client.query('COMMIT');

        // Audit log
        auditWrite({
            businessId: businessId,
            action: 'update',
            entityType: 'purchase',
            entityId: purchaseId,
            description: `Updated purchase status to ${status}`,
            metadata: { previousStatus: purchase.status, newStatus: status, total: purchase.total_amount }
        });

        return actionSuccess({ purchase: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update purchase status error:', error);
        return actionFailure('UPDATE_PURCHASE_STATUS_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Server Action: Create multiple purchase orders in bulk (Smart Restock Integration)
 */
export async function createBulkPurchaseOrdersAction(businessId, orders) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'purchases.create', client);

        await client.query('BEGIN');

        for (const orderData of orders) {
            const purchase_number = orderData.purchase_number || `PO-AI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            await assertEntityBelongsToBusiness(client, 'vendor', orderData.vendor_id, businessId);
            await assertEntityBelongsToBusiness(client, 'warehouse', orderData.warehouse_id, businessId);
            await assertEntityBelongsToBusiness(client, 'product', orderData.product_id, businessId);

            // Create PO Header
            const headerResult = await client.query(`
                INSERT INTO purchases (
                    business_id, vendor_id, warehouse_id, purchase_number,
                    date, subtotal, tax_total, total_amount, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                businessId,
                orderData.vendor_id || null,
                orderData.warehouse_id || null,
                purchase_number,
                new Date().toISOString(),
                orderData.subtotal || 0,
                0,
                orderData.total_amount || 0,
                orderData.notes || 'Generated by Smart Restock Engine',
                'draft'
            ]);

            const purchaseId = headerResult.rows[0].id;

            // Create PO Item
            await insertPurchaseItemCompat(client, {
                businessId,
                purchaseId,
                productId: orderData.product_id,
                description: orderData.description || 'Restock item',
                quantity: orderData.quantity,
                unitCost: orderData.unit_cost || 0,
                totalAmount: orderData.total_amount || 0,
            });

            // Keep header totals aligned with lines (covers partial payloads / rounding).
            const sumRes = await client.query(
                `SELECT COALESCE(SUM(total_amount), 0)::numeric AS s FROM purchase_items WHERE purchase_id = $1`,
                [purchaseId]
            );
            const lineSum = Number(sumRes.rows[0]?.s ?? 0);
            await client.query(
                `UPDATE purchases SET subtotal = $1, total_amount = $1, updated_at = NOW()
                 WHERE id = $2 AND business_id = $3`,
                [lineSum, purchaseId, businessId]
            );
        }

        await client.query('COMMIT');
        return actionSuccess({ message: `Successfully created ${orders.length} draft purchase orders` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create bulk purchase orders error:', error);
        return actionFailure('BULK_PURCHASE_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}

/**
 * Server Action: Create an individual auto-reorder purchase order
 */
export async function createAutoReorderPOAction(params) {
    const { businessId, productId, quantity, vendorId } = params;
    const client = await pool.connect();

    try {
        await checkAuth(businessId, 'purchases.create', client);

        await client.query('BEGIN');

        // 1. Get Product and Vendor details
        const pRes = await client.query(
            'SELECT name, sku, cost_price FROM products WHERE id = $1 AND business_id = $2 AND is_deleted = false',
            [productId, businessId]
        );
        if (pRes.rows.length === 0) throw new Error('Product not found');
        const product = pRes.rows[0];

        await assertEntityBelongsToBusiness(client, 'vendor', vendorId, businessId);

        const purchase_number = `PO-AUTO-${Date.now()}`;
        const total_amount = (product.cost_price || 0) * quantity;

        // 2. Create PO Header
        const headerResult = await client.query(`
            INSERT INTO purchases (
                business_id, vendor_id, purchase_number,
                date, subtotal, total_amount, notes, status
            ) VALUES ($1, $2, $3, NOW(), $4, $4, $5, 'draft')
            RETURNING id
        `, [
            businessId,
            vendorId || null,
            purchase_number,
            total_amount,
            `Auto-generated PO for low stock item: ${product.name}`
        ]);

        const purchaseId = headerResult.rows[0].id;

        // 3. Create PO Item
        await insertPurchaseItemCompat(client, {
            businessId,
            purchaseId,
            productId,
            description: `Restock for ${product.name} (SKU: ${product.sku})`,
            quantity,
            unitCost: product.cost_price || 0,
            totalAmount: total_amount,
        });

        await client.query('COMMIT');

        return actionSuccess({ purchaseId, purchase_number: purchase_number, purchaseNumber: purchase_number });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create auto-reorder PO error:', error);
        return actionFailure('AUTO_REORDER_PO_FAILED', await getErrorMessage(error));
    } finally {
        client.release();
    }
}
