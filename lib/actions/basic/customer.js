'use server';

import pool from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

async function checkAuth(businessId, permission = 'customers.view', client = null) {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

export async function getCustomersAction(businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'customers.view', client);

        const result = await client.query(`
            SELECT * FROM customers 
            WHERE business_id = $1
              AND is_deleted = false
              AND is_active = true
            ORDER BY created_at DESC
        `, [businessId]);
        return { success: true, customers: result.rows };
    } catch (error) {
        console.error('getCustomersAction Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

export async function createCustomerAction(customerData) {
    const client = await pool.connect();
    try {
        await checkAuth(customerData.business_id, 'customers.create', client);

        const customerCountRes = await client.query(
            'SELECT COUNT(*)::int as count FROM customers WHERE business_id = $1 AND is_deleted = false',
            [customerData.business_id]
        );
        const currentCustomerCount = Number(customerCountRes.rows[0]?.count || 0);
        await checkPlanLimit(customerData.business_id, 'max_customers', currentCustomerCount + 1, client);

        const {
            business_id, name, email, phone, address, city,
            state, pincode, country, tax_id, ntn, cnic, srn,
            credit_limit, outstanding_balance, opening_balance, filer_status,
            type, notes, domain_data
        } = customerData;

        // Map tax_id to ntn (Schema Requirement)
        const normalizedNtn = tax_id || ntn || null;

        const result = await client.query(`
            INSERT INTO customers (
                business_id, name, email, phone, address, city, 
                state, pincode, country, ntn, cnic, srn,
                credit_limit, outstanding_balance, opening_balance, filer_status,
                type, notes, domain_data,
                is_active, is_deleted, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16,
                $17, $18, $19,
                true, false, NOW(), NOW()
            )
            RETURNING *
        `, [
            business_id, name, email || null, phone || null,
            address || null, city || null,
            state || null, pincode || null, country || 'Pakistan',
            normalizedNtn, cnic || null, srn || null,
            Number(credit_limit || 0), Number(outstanding_balance || 0), Number(opening_balance || 0), filer_status || 'none',
            type || 'individual', notes || null,
            JSON.stringify(domain_data || {})
        ]);

        return { success: true, customer: result.rows[0] };
    } catch (error) {
        console.error('createCustomerAction Error:', error);
        return {
            success: false,
            error: error.message,
            errorCode: error.code || null,
            requiredPlan: error.requiredPlan || null,
            limitKey: error.limitKey || null,
            limit: Number.isFinite(Number(error.limit)) ? Number(error.limit) : null,
        };
    } finally {
        client.release();
    }
}

export async function updateCustomerAction(id, businessId, updates) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'customers.edit', client);
        
        // Assert customer belongs to business before updating
        await assertEntityBelongsToBusiness(client, 'customer', id, businessId);

        const fields = [];
        const values = [];
        let idx = 1;

        // Clean updates to match schema
        const cleanUpdates = { ...updates };
        if (cleanUpdates.tax_id) {
            cleanUpdates.ntn = cleanUpdates.tax_id;
            delete cleanUpdates.tax_id;
        }

        const allowedUpdates = [
            'name', 'email', 'phone', 'address', 'city',
            'state', 'pincode', 'country',
            'ntn', 'cnic', 'srn',
            'credit_limit', 'outstanding_balance', 'opening_balance', 'filer_status',
            'type', 'notes', 'is_active',
            'domain_data'
        ];

        for (const key of Object.keys(cleanUpdates)) {
            if (allowedUpdates.includes(key)) {
                fields.push(`${key} = $${idx++}`);
                const numericFields = ['credit_limit', 'outstanding_balance', 'opening_balance'];
                if (key === 'domain_data') {
                    values.push(JSON.stringify(cleanUpdates[key] || {}));
                } else if (numericFields.includes(key)) {
                    values.push(Number(cleanUpdates[key] || 0));
                } else {
                    values.push(cleanUpdates[key]);
                }
            }
        }

        if (fields.length === 0) return { success: true, message: 'No changes', customer: updates };

        values.push(id);
        values.push(businessId);

        const result = await client.query(`
            UPDATE customers 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${idx++} AND business_id = $${idx++} AND is_deleted = false
            RETURNING *
        `, values);

        if (result.rows.length === 0) return { success: false, error: 'Customer not found or deleted' };
        return { success: true, customer: result.rows[0] };
    } catch (error) {
        console.error('updateCustomerAction Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

export async function deleteCustomerAction(id, businessId) {
    const client = await pool.connect();
    try {
        await checkAuth(businessId, 'customers.delete', client);
        
        // Assert customer belongs to business before deleting
        await assertEntityBelongsToBusiness(client, 'customer', id, businessId);

        // Soft delete
        const result = await client.query(`
            UPDATE customers 
            SET is_deleted = true, is_active = false, deleted_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND business_id = $2
            RETURNING id
        `, [id, businessId]);

        if (result.rows.length === 0) return { success: false, error: 'Customer not found' };
        return { success: true, message: 'Customer soft-deleted successfully' };
    } catch (error) {
        console.error('deleteCustomerAction Error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}
