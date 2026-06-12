/**
 * Batch Allocation Service
 * 
 * Implements FIFO (First In First Out) batch selection for sales
 * Ensures expired batches are never sold
 * Tracks batch allocation to stock movements
 * 
 * @module lib/services/batchAllocation
 */

import { db } from '@/lib/db';
import { auditLog } from '@/lib/services/auditLog';

/**
 * Select batches for a sale using FIFO method
 * Oldest non-expired batches picked first
 * 
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity needed
 * @param {string} businessId - Business UUID
 * @param {Object} options - Configuration
 * @param {string} [options.method='fifo'] - Batch selection method (fifo, lifo, largest)
 * @param {Date} [options.sellDate] - Date of sale for validation
 * @returns {Promise<Array>} Array of selected batches with allocation
 * 
 * @throws {Error} If not enough stock available or all batches expired
 * 
 * @example
 * const batches = await selectBatchesForSale(
 *   productId,
 *   10,
 *   businessId,
 *   { method: 'fifo' }
 * );
 * // Returns: [
 * //   { batch_id, batch_number, quantity: 10, expiry_date, available: true }
 * // ]
 */
export async function selectBatchesForSale(
  productId,
  quantity,
  businessId,
  options = {}
) {
  const { method = 'fifo', sellDate = new Date() } = options;

  // Validate product exists
  const product = await db.products.findFirst({
    where: { id: productId, business_id: businessId, is_deleted: false },
    select: { id: true, sku: true, name: true }
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const selectedBatches = [];
  let remainingQty = quantity;

  // Get batches based on selection method
  let batches;

  if (method === 'fifo') {
    // Oldest first (by expiry date, ascending)
    batches = await db.product_batches.findMany({
      where: {
        product_id: productId,
        business_id: businessId,
        is_active: true,
        is_deleted: false,
        expiry_date: {
          // Must not be expired on sell date
          gte: sellDate
        }
      },
      orderBy: { expiry_date: 'asc' },  // Oldest first
      select: {
        id: true,
        batch_number: true,
        quantity: true,
        reserved_quantity: true,
        expiry_date: true,
        manufacturing_date: true,
        cost_price: true
      }
    });
  } else if (method === 'lifo') {
    // Newest first
    batches = await db.product_batches.findMany({
      where: {
        product_id: productId,
        business_id: businessId,
        is_active: true,
        is_deleted: false,
        expiry_date: { gte: sellDate }
      },
      orderBy: { expiry_date: 'desc' },  // Newest first
      select: {
        id: true,
        batch_number: true,
        quantity: true,
        reserved_quantity: true,
        expiry_date: true,
        manufacturing_date: true,
        cost_price: true
      }
    });
  } else if (method === 'largest') {
    // Largest batch first
    batches = await db.product_batches.findMany({
      where: {
        product_id: productId,
        business_id: businessId,
        is_active: true,
        is_deleted: false,
        expiry_date: { gte: sellDate }
      },
      orderBy: { quantity: 'desc' },
      select: {
        id: true,
        batch_number: true,
        quantity: true,
        reserved_quantity: true,
        expiry_date: true,
        manufacturing_date: true,
        cost_price: true
      }
    });
  } else {
    throw new Error(`Unknown batch selection method: ${method}`);
  }

  // Allocate from available batches
  for (const batch of batches) {
    if (remainingQty <= 0) break;

    // Calculate available quantity in batch
    const available = batch.quantity - batch.reserved_quantity;

    if (available > 0) {
      const toAllocate = Math.min(available, remainingQty);

      selectedBatches.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        quantity: toAllocate,
        available: toAllocate,
        expiry_date: batch.expiry_date,
        manufacturing_date: batch.manufacturing_date,
        cost_price: batch.cost_price,
        allocationMethod: method
      });

      remainingQty -= toAllocate;
    }
  }

  // Check if we could allocate everything
  if (remainingQty > 0) {
    const allocated = quantity - remainingQty;
    throw new Error(
      `Insufficient stock for product ${product.sku}. ` +
      `Requested: ${quantity}, Available: ${allocated} ` +
      `(${batches.length} non-expired batches found)`
    );
  }

  return selectedBatches;
}

/**
 * Get expiring batches warning
 * Returns batches expiring within threshold
 * 
 * @param {string} businessId
 * @param {number} [daysThreshold=30] - Days until expiry to flag
 * @returns {Promise<Array>}
 * 
 * @example
 * const expiring = await getExpiringBatches(businessId, 30);
 * console.log(`${expiring.length} batches expiring within 30 days`);
 */
export async function getExpiringBatches(
  businessId,
  daysThreshold = 30
) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const expiring = await db.product_batches.findMany({
    where: {
      business_id: businessId,
      is_active: true,
      is_deleted: false,
      expiry_date: {
        gte: now,
        lte: futureDate
      }
    },
    select: {
      id: true,
      batch_number: true,
      product_id: true,
      quantity: true,
      reserved_quantity: true,
      expiry_date: true,
      manufacturing_date: true,
      created_at: true,
      products: {
        select: {
          sku: true,
          name: true,
          category: true
        }
      }
    },
    orderBy: { expiry_date: 'asc' }
  });

  return expiring.map(batch => ({
    id: batch.id,
    sku: batch.products.sku,
    name: batch.products.name,
    category: batch.products.category,
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    available: batch.quantity - batch.reserved_quantity,
    expiryDate: batch.expiry_date,
    daysUntilExpiry: Math.ceil(
      (batch.expiry_date - now) / (1000 * 60 * 60 * 24)
    ),
    ageInDays: Math.ceil(
      (now - batch.manufacturing_date) / (1000 * 60 * 60 * 24)
    )
  }));
}

/**
 * Get expired batches
 * Returns batches that have already expired
 * 
 * @param {string} businessId
 * @returns {Promise<Array>}
 */
export async function getExpiredBatches(businessId) {
  const now = new Date();

  const expired = await db.product_batches.findMany({
    where: {
      business_id: businessId,
      is_active: true,
      is_deleted: false,
      expiry_date: { lt: now }
    },
    select: {
      id: true,
      batch_number: true,
      product_id: true,
      quantity: true,
      expiry_date: true,
      products: {
        select: {
          sku: true,
          name: true
        }
      }
    },
    orderBy: { expiry_date: 'asc' }
  });

  return expired.map(batch => ({
    id: batch.id,
    sku: batch.products.sku,
    name: batch.products.name,
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    expiryDate: batch.expiry_date,
    daysExpired: Math.ceil(
      (now - batch.expiry_date) / (1000 * 60 * 60 * 24)
    )
  }));
}

/**
 * Validate batch can be used for sale
 * Checks: exists, not expired, has quantity available
 * 
 * @param {string} batchId
 * @param {number} quantityNeeded
 * @param {Date} [sellDate] - Date of sale for expiry check
 * @param {string} businessId - Tenant scope (required)
 * @returns {Promise<Object>} Validation result
 * 
 * @example
 * const validation = await validateBatchForSale(batchId, 10, new Date(), businessId);
 * if (!validation.valid) {
 *   console.error(validation.reason);
 * }
 */
export async function validateBatchForSale(
  batchId,
  quantityNeeded,
  sellDate = new Date(),
  businessId
) {
  if (!businessId) {
    throw new Error('validateBatchForSale: businessId is required');
  }

  const batch = await db.product_batches.findFirst({
    where: { id: batchId, business_id: businessId, is_deleted: false },
    select: {
      id: true,
      batch_number: true,
      quantity: true,
      reserved_quantity: true,
      expiry_date: true,
      is_active: true,
      is_deleted: true,
      products: {
        select: { sku: true, name: true }
      }
    }
  });

  if (!batch) {
    return {
      valid: false,
      reason: `Batch ${batchId} not found`
    };
  }

  if (batch.is_deleted) {
    return {
      valid: false,
      reason: `Batch ${batch.batch_number} has been deleted`
    };
  }

  if (!batch.is_active) {
    return {
      valid: false,
      reason: `Batch ${batch.batch_number} is not active`
    };
  }

  if (batch.expiry_date < sellDate) {
    const daysExpired = Math.ceil(
      (sellDate - batch.expiry_date) / (1000 * 60 * 60 * 24)
    );
    return {
      valid: false,
      reason: `Batch ${batch.batch_number} expired ${daysExpired} days ago (${batch.expiry_date.toDateString()})`
    };
  }

  const available = batch.quantity - batch.reserved_quantity;

  if (available < quantityNeeded) {
    return {
      valid: false,
      reason: `Batch ${batch.batch_number} has only ${available} units available (need ${quantityNeeded})`
    };
  }

  return {
    valid: true,
    batch: {
      id: batch.id,
      batchNumber: batch.batch_number,
      sku: batch.products.sku,
      name: batch.products.name,
      available,
      expiryDate: batch.expiry_date,
      daysUntilExpiry: Math.ceil(
        (batch.expiry_date - sellDate) / (1000 * 60 * 60 * 24)
      )
    }
  };
}

/**
 * Create stock movement with batch tracking
 * Links batch allocation to inventory movement
 * 
 * @param {Object} data
 * @param {string} data.productId
 * @param {string} data.batchId
 * @param {number} data.quantity
 * @param {string} data.businessId
 * @param {string} data.transactionType - 'sale', 'adjustment', etc.
 * @param {string} [data.referenceType] - 'invoice', 'adjustment', etc.
 * @param {string} [data.referenceId]
 * @param {number} [data.unitCost]
 * @param {string} [data.warehouseId]
 * @param {string} [data.notes]
 * @returns {Promise<Object>} Created movement
 */
export async function createBatchStockMovement(data) {
  const {
    productId,
    batchId,
    quantity,
    businessId,
    transactionType,
    referenceType,
    referenceId,
    unitCost = 0,
    warehouseId = null,
    notes = ''
  } = data;

  // Validate batch
  const validation = await validateBatchForSale(batchId, quantity, sellDate, businessId);
  if (!validation.valid) {
    throw new Error(`Invalid batch: ${validation.reason}`);
  }

  // Get batch for costing
  const batch = await db.product_batches.findFirst({
    where: { id: batchId, business_id: businessId, is_deleted: false },
    select: { cost_price: true, batch_number: true }
  });

  if (!batch) {
    throw new Error(`Batch ${batchId} not found for this business`);
  }

  // Create movement
  const movement = await db.stock_movements.create({
    data: {
      business_id: businessId,
      product_id: productId,
      batch_id: batchId,  // <- KEY: Link batch to movement
      warehouse_id: warehouseId,
      transaction_type: transactionType,
      quantity_change: -quantity,  // Negative for sales
      unit_cost: unitCost || batch.cost_price,
      reference_type: referenceType,
      reference_id: referenceId,
      notes: `Batch: ${batch.batch_number}\n${notes}`,
      domain_data: {
        batchTracked: true,
        batchNumber: batch.batch_number
      }
    }
  });

  // Update batch reserved quantity
  await db.product_batches.update({
    where: { id: batchId },
    data: {
      reserved_quantity: {
        increment: quantity
      }
    }
  });

  return movement;
}

export default {
  selectBatchesForSale,
  getExpiringBatches,
  getExpiredBatches,
  validateBatchForSale,
  createBatchStockMovement
};
