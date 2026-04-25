'use server';

import pool from '@/lib/db';
import { createGLEntryAction } from '@/lib/actions/basic/accounting';
import { ACCOUNT_CODES } from '@/lib/config/accounting';
import { vendorSchema, validateWithSchema } from '@/lib/validation/schemas';
import { withGuard } from '@/lib/rbac/serverGuard';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { assertEntityBelongsToBusiness } from '@/lib/actions/_shared/tenant';

async function checkAuth(businessId, permission = 'vendors.view', client = null) {
    const { session } = await withGuard(businessId, { permission, client });
    return session;
}

/**
 * Server Action: Get all vendors for a business
 * 
 * @param {string} businessId - Business UUID
 * @returns {Promise<{success: boolean, vendors?: any[], error?: string}>}
 */
export async function getVendorsAction(businessId) {
    try {
        await checkAuth(businessId, 'vendors.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM vendors 
                WHERE business_id = $1
                  AND is_deleted = false
                  AND is_active = true
                ORDER BY name ASC
            `, [businessId]);

            return { success: true, vendors: result.rows };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('getVendorsAction Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get vendor by ID
 */
export async function getVendorByIdAction(businessId, vendorId) {
    try {
        await checkAuth(businessId, 'vendors.view');

        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM vendors 
                WHERE id = $1 AND business_id = $2 AND is_deleted = false
            `, [vendorId, businessId]);

            if (result.rows.length === 0) {
                return { success: false, error: 'Vendor not found or deleted' };
            }

            return { success: true, vendor: result.rows[0] };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('getVendorByIdAction Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Create vendor
 */
export async function createVendorAction(vendorData) {
    try {
        const numericFields = ['credit_limit', 'opening_balance', 'outstanding_balance'];
        const sanitizedData = { ...vendorData };

        numericFields.forEach(field => {
            if (sanitizedData[field] !== undefined) {
                if (typeof sanitizedData[field] === 'string') {
                    const val = parseFloat(sanitizedData[field]);
                    sanitizedData[field] = isNaN(val) ? 0 : val;
                } else if (sanitizedData[field] === null) {
                    sanitizedData[field] = 0;
                }
            }
        });

        if (vendorData.creditLimit !== undefined) sanitizedData.credit_limit = parseFloat(vendorData.creditLimit) || 0;
        if (vendorData.openingBalance !== undefined) sanitizedData.opening_balance = parseFloat(vendorData.openingBalance) || 0;

        const validation = validateWithSchema(vendorSchema, sanitizedData);
        if (!validation.success) {
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        const validated = validation.data;

        await checkAuth(validated.business_id, 'vendors.create');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const vendorCountRes = await client.query(
                'SELECT COUNT(*)::int as count FROM vendors WHERE business_id = $1 AND is_deleted = false',
                [validated.business_id]
            );
            const currentVendorCount = Number(vendorCountRes.rows[0]?.count || 0);
            await checkPlanLimit(validated.business_id, 'max_vendors', currentVendorCount + 1, client);

            const result = await client.query(`
                INSERT INTO vendors (
                    business_id, name, email, phone, contact_person, ntn, srn, 
                    address, city, state, pincode, country,
                    credit_limit, outstanding_balance, opening_balance, filer_status, domain_data,
                    is_active, is_deleted, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, false, NOW(), NOW())
                RETURNING *
            `, [
                validated.business_id, validated.name, validated.email, validated.phone,
                validated.contact_person || vendorData.contactPerson || null,
                validated.ntn, validated.srn || vendorData.strn,
                validated.address, validated.city, validated.state, validated.pincode, validated.country,
                validated.credit_limit, validated.outstanding_balance,
                validated.opening_balance, validated.filer_status,
                JSON.stringify(validated.domain_data || {})
            ]);

            const vendor = result.rows[0];

            if (Number(vendor.opening_balance) !== 0) {
                await createGLEntryAction({
                    businessId: validated.business_id,
                    date: new Date().toISOString(),
                    description: `Opening Balance for Supplier: ${vendor.name}`,
                    referenceType: 'vendor_opening',
                    referenceId: vendor.id,
                    entries: [
                        { accountCode: ACCOUNT_CODES.SUSPENSE_ACCOUNT || '3000', debit: Math.abs(Number(vendor.opening_balance)), credit: 0 },
                        { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: 0, credit: Math.abs(Number(vendor.opening_balance)) }
                    ]
                }, client);
            }

            await client.query('COMMIT');
            return { success: true, vendor };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('createVendorAction Error:', error);
        return {
            success: false,
            error: error.message,
            errorCode: error.code || null,
            requiredPlan: error.requiredPlan || null,
            limitKey: error.limitKey || null,
            limit: Number.isFinite(Number(error.limit)) ? Number(error.limit) : null,
        };
    }
}

/**
 * Server Action: Update vendor
 */
export async function updateVendorAction(businessId, vendorId, updates) {
    try {
        await checkAuth(businessId, 'vendors.edit');

        const client = await pool.connect();
        try {
            // Assert vendor belongs to business before updating
            await assertEntityBelongsToBusiness(client, 'vendor', vendorId, businessId);
            
            const numericFields = ['credit_limit', 'opening_balance', 'outstanding_balance'];
            const sanitizedUpdates = { ...updates };

            numericFields.forEach(field => {
                if (sanitizedUpdates[field] !== undefined) {
                    if (typeof sanitizedUpdates[field] === 'string') {
                        const val = parseFloat(sanitizedUpdates[field]);
                        sanitizedUpdates[field] = isNaN(val) ? 0 : val;
                    } else if (sanitizedUpdates[field] === null) {
                        sanitizedUpdates[field] = 0;
                    }
                }
            });

            if (updates.creditLimit !== undefined) sanitizedUpdates.credit_limit = parseFloat(updates.creditLimit) || 0;
            if (updates.openingBalance !== undefined) sanitizedUpdates.opening_balance = parseFloat(updates.openingBalance) || 0;

            const validation = validateWithSchema(vendorSchema, { ...sanitizedUpdates, business_id: businessId, id: vendorId });
            if (!validation.success) {
                return { success: false, error: 'Validation failed', errors: validation.errors };
            }
            const validated = validation.data;

            const validColumns = [
                'name', 'email', 'phone', 'contact_person', 'ntn', 'srn',
                'address', 'city', 'state', 'payment_terms', 'credit_limit',
                'outstanding_balance', 'domain_data', 'filer_status', 'opening_balance',
                'is_active'
            ];

            const filteredUpdates = {};
            for (const [key, val] of Object.entries(validated)) {
                let dbKey = key;
                if (key === 'contactPerson') dbKey = 'contact_person';
                if (key === 'strn') dbKey = 'srn';
                if (key === 'tax_number') dbKey = 'ntn';
                if (key === 'tax_id') dbKey = 'ntn';

                if (validColumns.includes(dbKey) && key !== 'id' && key !== 'business_id') {
                    filteredUpdates[dbKey] = val;
                }
            }

            const fields = Object.keys(filteredUpdates);
            const values = Object.values(filteredUpdates).map((value, idx) => {
                if (fields[idx] === 'domain_data') {
                    return typeof value === 'string' ? value : JSON.stringify(value || {});
                }
                return value;
            });

            if (fields.length === 0) return { success: true, vendor: updates };

            const setClause = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ');

            const result = await client.query(`
                UPDATE vendors 
                SET ${setClause}, updated_at = NOW()
                WHERE id = $1 AND business_id = $2 AND is_deleted = false
                RETURNING *
            `, [vendorId, businessId, ...values]);

            if (result.rows.length === 0) {
                return { success: false, error: 'Vendor not found or deleted' };
            }

            return { success: true, vendor: result.rows[0] };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('updateVendorAction Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Delete vendor (Soft Delete)
 */
export async function deleteVendorAction(businessId, vendorId) {
    try {
        await checkAuth(businessId, 'vendors.delete');

        const client = await pool.connect();
        try {
            // Assert vendor belongs to business before deleting
            await assertEntityBelongsToBusiness(client, 'vendor', vendorId, businessId);
            
            const result = await client.query(`
                UPDATE vendors 
                SET is_deleted = true, is_active = false, deleted_at = NOW(), updated_at = NOW()
                WHERE id = $1 AND business_id = $2
                RETURNING id
            `, [vendorId, businessId]);

            if (result.rows.length === 0) {
                return { success: false, error: 'Vendor not found' };
            }

            return { success: true, message: 'Vendor soft-deleted successfully' };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('deleteVendorAction Error:', error);
        return { success: false, error: error.message };
    }
}
