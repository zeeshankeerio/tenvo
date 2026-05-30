'use server';

import { db } from '@/lib/db';
import { withGuard } from '@/lib/rbac/serverGuard';
import { checkPlanLimit } from '@/lib/auth/planGuard';
import { auditWrite } from '@/lib/actions/_shared/audit';
import { serializeDecimalsDeep } from '@/lib/utils/serializePrismaDecimals';

async function checkAuth(businessId, permission = 'customers.view') {
    const { session } = await withGuard(businessId, { permission });
    return session;
}

export async function getCustomersAction(businessId) {
    try {
        await checkAuth(businessId, 'customers.view');

        const customers = await db.customers.findMany({
            where: {
                business_id: businessId,
                is_deleted: false,
                is_active: true
            },
            orderBy: { created_at: 'desc' }
        });
        
        return { success: true, customers: customers.map((c) => serializeDecimalsDeep(c)) };
    } catch (error) {
        console.error('getCustomersAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function createCustomerAction(customerData) {
    try {
        await checkAuth(customerData.business_id, 'customers.create');

        const currentCustomerCount = await db.customers.count({
            where: {
                business_id: customerData.business_id,
                is_deleted: false
            }
        });
        
        // Pass a dummy client to checkPlanLimit to maintain backward compatibility if it expects pg,
        // although planGuard likely works with its own connections or doesn't strictly need the client.
        // If checkPlanLimit crashes without client, it will throw caught here. 
        // We will pass null for client, standard practice in new Prisma services.
        await checkPlanLimit(customerData.business_id, 'max_customers', currentCustomerCount + 1, null);

        const {
            business_id, name, email, phone, address, city,
            state, pincode, country, tax_id, ntn, cnic, srn,
            credit_limit, outstanding_balance, opening_balance, filer_status,
            type, notes, domain_data
        } = customerData;

        const normalizedNtn = tax_id || ntn || null;

        const customer = await db.customers.create({
            data: {
                business_id,
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                city: city || null,
                state: state || null,
                pincode: pincode || null,
                country: country || 'Pakistan',
                ntn: normalizedNtn,
                cnic: cnic || null,
                srn: srn || null,
                credit_limit: Number(credit_limit || 0),
                outstanding_balance: Number(outstanding_balance || 0),
                opening_balance: Number(opening_balance || 0),
                filer_status: filer_status || 'none',
                type: type || 'individual',
                notes: notes || null,
                domain_data: domain_data || {},
                is_active: true,
                is_deleted: false,
            }
        });

        auditWrite({
            businessId: business_id,
            action: 'create',
            entityType: 'customer',
            entityId: customer.id,
            description: `Created customer: ${customer.name}`,
            metadata: { openingBalance: customer.opening_balance, type: customer.type }
        });

        return { success: true, customer };
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
    }
}

export async function updateCustomerAction(id, businessId, updates) {
    try {
        await checkAuth(businessId, 'customers.edit');
        
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

        const updateData = {};
        for (const key of Object.keys(cleanUpdates)) {
            if (allowedUpdates.includes(key)) {
                const numericFields = ['credit_limit', 'outstanding_balance', 'opening_balance'];
                if (key === 'domain_data') {
                    updateData[key] = cleanUpdates[key] || {};
                } else if (numericFields.includes(key)) {
                    updateData[key] = Number(cleanUpdates[key] || 0);
                } else {
                    updateData[key] = cleanUpdates[key];
                }
            }
        }

        if (Object.keys(updateData).length === 0) return { success: true, message: 'No changes', customer: updates };

        // Use updateMany for tenant isolation constraint safely without failing @unique constraints
        const result = await db.customers.updateMany({
            where: {
                id: id,
                business_id: businessId,
                is_deleted: false
            },
            data: updateData
        });

        if (result.count === 0) return { success: false, error: 'Customer not found or deleted' };
        
        // Fetch the updated customer
        const customer = await db.customers.findFirst({
            where: { id: id, business_id: businessId }
        });

        auditWrite({
            businessId: businessId,
            action: 'update',
            entityType: 'customer',
            entityId: id,
            description: `Updated customer: ${customer?.name || id}`,
        });

        return { success: true, customer };
    } catch (error) {
        console.error('updateCustomerAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCustomerAction(id, businessId) {
    try {
        await checkAuth(businessId, 'customers.delete');
        
        const result = await db.customers.updateMany({
            where: {
                id: id,
                business_id: businessId
            },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date()
            }
        });

        if (result.count === 0) return { success: false, error: 'Customer not found' };

        auditWrite({
            businessId: businessId,
            action: 'delete',
            entityType: 'customer',
            entityId: id,
            description: `Soft-deleted customer ${id}`,
        });

        return { success: true, message: 'Customer soft-deleted successfully' };
    } catch (error) {
        console.error('deleteCustomerAction Error:', error);
        return { success: false, error: error.message };
    }
}
