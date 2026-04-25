/**
 * Soft Delete Utility
 * 
 * Provides consistent soft-delete and restore operations across all entities.
 * Ensures is_deleted and deleted_at are always in sync.
 * 
 * @module lib/utils/softDelete
 */

/**
 * Soft deletes a record by setting is_deleted=true and deleted_at=NOW()
 * 
 * @param {import('@prisma/client').PrismaClient} client - Prisma client or transaction
 * @param {string} table - Table name (e.g., 'products', 'invoices', 'customers')
 * @param {string} id - Record ID (UUID)
 * @param {string} businessId - Business ID for multi-tenancy validation
 * @returns {Promise<Object>} Updated record
 * @throws {Error} If record not found or doesn't belong to business
 * 
 * @example
 * await softDeleteRecord(prisma, 'products', productId, businessId);
 */
export async function softDeleteRecord(client, table, id, businessId) {
  // Validate table name to prevent SQL injection
  const allowedTables = [
    'customers',
    'vendors',
    'products',
    'invoices',
    'purchases',
    'expenses',
    'product_serials',
    'product_variants',
    'product_batches',
  ];

  if (!allowedTables.includes(table)) {
    throw new Error(`Soft delete not supported for table: ${table}`);
  }

  // Verify record exists and belongs to business
  const record = await client[table].findFirst({
    where: {
      id,
      business_id: businessId,
    },
    select: { id: true, is_deleted: true },
  });

  if (!record) {
    throw new Error(`Record not found in ${table} with id ${id} for business ${businessId}`);
  }

  if (record.is_deleted) {
    throw new Error(`Record ${id} in ${table} is already deleted`);
  }

  // Perform soft delete
  const updated = await client[table].update({
    where: { id },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
    },
  });

  return updated;
}

/**
 * Restores a soft-deleted record by setting is_deleted=false and deleted_at=NULL
 * 
 * @param {import('@prisma/client').PrismaClient} client - Prisma client or transaction
 * @param {string} table - Table name (e.g., 'products', 'invoices', 'customers')
 * @param {string} id - Record ID (UUID)
 * @param {string} businessId - Business ID for multi-tenancy validation
 * @returns {Promise<Object>} Restored record
 * @throws {Error} If record not found or not deleted
 * 
 * @example
 * await restoreRecord(prisma, 'products', productId, businessId);
 */
export async function restoreRecord(client, table, id, businessId) {
  // Validate table name to prevent SQL injection
  const allowedTables = [
    'customers',
    'vendors',
    'products',
    'invoices',
    'purchases',
    'expenses',
    'product_serials',
    'product_variants',
    'product_batches',
  ];

  if (!allowedTables.includes(table)) {
    throw new Error(`Restore not supported for table: ${table}`);
  }

  // Verify record exists and belongs to business
  const record = await client[table].findFirst({
    where: {
      id,
      business_id: businessId,
    },
    select: { id: true, is_deleted: true },
  });

  if (!record) {
    throw new Error(`Record not found in ${table} with id ${id} for business ${businessId}`);
  }

  if (!record.is_deleted) {
    throw new Error(`Record ${id} in ${table} is not deleted`);
  }

  // Restore record
  const restored = await client[table].update({
    where: { id },
    data: {
      is_deleted: false,
      deleted_at: null,
    },
  });

  return restored;
}

/**
 * Builds a Prisma where clause that excludes soft-deleted records
 * 
 * @param {Object} baseWhere - Existing where clause
 * @returns {Object} Where clause with soft-delete filter
 * 
 * @example
 * const where = excludeSoftDeleted({ business_id: businessId, category: 'electronics' });
 * // Returns: { business_id: businessId, category: 'electronics', is_deleted: false }
 */
export function excludeSoftDeleted(baseWhere = {}) {
  return {
    ...baseWhere,
    is_deleted: false,
  };
}

/**
 * Builds a Prisma where clause that includes only soft-deleted records
 * 
 * @param {Object} baseWhere - Existing where clause
 * @returns {Object} Where clause with soft-delete filter
 * 
 * @example
 * const where = onlySoftDeleted({ business_id: businessId });
 * // Returns: { business_id: businessId, is_deleted: true }
 */
export function onlySoftDeleted(baseWhere = {}) {
  return {
    ...baseWhere,
    is_deleted: true,
  };
}

/**
 * Permanently deletes a soft-deleted record (hard delete)
 * WARNING: This is irreversible. Use with extreme caution.
 * 
 * @param {import('@prisma/client').PrismaClient} client - Prisma client or transaction
 * @param {string} table - Table name
 * @param {string} id - Record ID (UUID)
 * @param {string} businessId - Business ID for multi-tenancy validation
 * @returns {Promise<Object>} Deleted record
 * @throws {Error} If record not found or not soft-deleted
 * 
 * @example
 * await hardDeleteRecord(prisma, 'products', productId, businessId);
 */
export async function hardDeleteRecord(client, table, id, businessId) {
  // Validate table name
  const allowedTables = [
    'customers',
    'vendors',
    'products',
    'invoices',
    'purchases',
    'expenses',
    'product_serials',
    'product_variants',
    'product_batches',
  ];

  if (!allowedTables.includes(table)) {
    throw new Error(`Hard delete not supported for table: ${table}`);
  }

  // Verify record exists, belongs to business, and is soft-deleted
  const record = await client[table].findFirst({
    where: {
      id,
      business_id: businessId,
      is_deleted: true,
    },
    select: { id: true },
  });

  if (!record) {
    throw new Error(
      `Record not found or not soft-deleted in ${table} with id ${id} for business ${businessId}`
    );
  }

  // Permanently delete
  const deleted = await client[table].delete({
    where: { id },
  });

  return deleted;
}
