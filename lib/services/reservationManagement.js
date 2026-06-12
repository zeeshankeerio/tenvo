/**
 * Reservation Management Service
 * 
 * Handles inventory reservations for quotations and orders
 * Ensures stock is reserved before confirming sales
 * Manages reservation expiry and cleanup
 * 
 * @module lib/services/reservationManagement
 */

import { db } from '@/lib/db';
import { auditLog } from '@/lib/services/auditLog';

/**
 * Reserve stock for a quotation or order
 * Creates inventory_reservations record
 * 
 * @param {string} productId
 * @param {number} quantity
 * @param {string} businessId
 * @param {Object} options
 * @param {string} [options.referenceType] - 'quotation', 'order', etc.
 * @param {string} [options.referenceId] - Quotation or order UUID
 * @param {Date} [options.expiresAt] - When reservation expires
 * @param {string} [options.notes]
 * @param {string} [options.customerId]
 * @returns {Promise<Object>} Created reservation
 * 
 * @throws {Error} If not enough stock available
 * 
 * @example
 * const reservation = await reserveStock({
 *   productId: 'prod-123',
 *   quantity: 10,
 *   businessId: 'biz-456',
 *   referenceType: 'quotation',
 *   referenceId: 'quot-789',
 *   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
 * });
 */
export async function reserveStock(
  productId,
  quantity,
  businessId,
  options = {}
) {
  const {
    referenceType = 'quotation',
    referenceId = null,
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    notes = '',
    customerId = null
  } = options;

  // Check product exists
  const product = await db.products.findFirst({
    where: { id: productId, business_id: businessId, is_deleted: false },
    select: { sku: true, name: true, stock: true }
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  // Calculate available stock (total - already reserved)
  const reserved = await db.inventory_reservations.aggregate({
    _sum: { quantity: true },
    where: {
      product_id: productId,
      business_id: businessId,
      status: 'active'
    }
  });

  const reservedQty = reserved._sum.quantity || 0;
  const totalStock = parseFloat(product.stock) || 0;
  const available = totalStock - reservedQty;

  if (available < quantity) {
    throw new Error(
      `Insufficient available stock for ${product.sku}. ` +
      `Requested: ${quantity}, Available: ${available} ` +
      `(Total: ${totalStock}, Reserved: ${reservedQty})`
    );
  }

  // Create reservation
  const reservation = await db.inventory_reservations.create({
    data: {
      product_id: productId,
      business_id: businessId,
      quantity,
      status: 'active',
      reference_type: referenceType,
      reference_id: referenceId,
      customer_id: customerId,
      expires_at: expiresAt,
      created_at: new Date(),
      notes
    }
  });

  // Log reservation
  await auditLog({
    businessId,
    action: 'STOCK_RESERVED',
    entityType: 'product',
    entityId: productId,
    description: `${quantity} units reserved for ${referenceType}`,
    changes: {
      reserved: quantity,
      reference: { type: referenceType, id: referenceId }
    },
    metadata: {
      sku: product.sku,
      reservationId: reservation.id,
      expiresAt: expiresAt.toISOString()
    }
  });

  return reservation;
}

/**
 * Get available quantity for a product
 * Subtracts active reservations from total stock
 * 
 * @param {string} productId
 * @param {string} businessId
 * @returns {Promise<Object>}
 * 
 * @example
 * const avail = await getAvailableQuantity(productId, businessId);
 * console.log(`Can sell: ${avail.available}`);
 */
export async function getAvailableQuantity(productId, businessId) {
  const product = await db.products.findFirst({
    where: { id: productId, business_id: businessId, is_deleted: false },
    select: { stock: true, min_stock: true }
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const reserved = await db.inventory_reservations.aggregate({
    _sum: { quantity: true },
    where: {
      product_id: productId,
      business_id: businessId,
      status: 'active',
      expires_at: { gt: new Date() }
    }
  });

  const totalStock = parseFloat(product.stock) || 0;
  const reservedQty = reserved._sum.quantity || 0;
  const available = totalStock - reservedQty;

  return {
    productId,
    totalStock,
    reserved: reservedQty,
    available: Math.max(0, available),
    minStock: parseFloat(product.min_stock) || 0,
    belowMinimum: available < (parseFloat(product.min_stock) || 0)
  };
}

/**
 * Get all active reservations for a product
 * 
 * @param {string} productId
 * @param {string} businessId
 * @returns {Promise<Array>}
 */
export async function getActiveReservations(productId, businessId) {
  const now = new Date();

  const reservations = await db.inventory_reservations.findMany({
    where: {
      product_id: productId,
      business_id: businessId,
      status: 'active',
      expires_at: { gt: now }
    },
    select: {
      id: true,
      quantity: true,
      status: true,
      reference_type: true,
      reference_id: true,
      expires_at: true,
      created_at: true,
      customer_id: true,
      customers: {
        select: { name: true, email: true }
      }
    },
    orderBy: { expires_at: 'asc' }
  });

  return reservations.map(res => ({
    id: res.id,
    quantity: res.quantity,
    status: res.status,
    reference: {
      type: res.reference_type,
      id: res.reference_id
    },
    customer: res.customers ? {
      id: res.customer_id,
      name: res.customers.name,
      email: res.customers.email
    } : null,
    expiresAt: res.expires_at,
    expiresIn: Math.ceil((res.expires_at - now) / (1000 * 60 * 60 * 24)) + ' days',
    createdAt: res.created_at
  }));
}

/**
 * Complete a reservation
 * Converts reservation to actual sale (consumes reserved stock)
 * 
 * @param {string} reservationId
 * @param {string} businessId
 * @param {Object} options
 * @param {string} [options.invoiceId] - Link to invoice
 * @returns {Promise<Object>} Updated reservation
 */
export async function completeReservation(
  reservationId,
  businessId,
  options = {}
) {
  const { invoiceId = null } = options;

  const reservation = await db.inventory_reservations.update({
    where: { id: reservationId },
    data: {
      status: 'completed',
      completed_at: new Date(),
      ...(invoiceId && { reference_id: invoiceId })
    }
  });

  // Log completion
  await auditLog({
    businessId,
    action: 'RESERVATION_COMPLETED',
    entityType: 'inventory_reservation',
    entityId: reservationId,
    description: `Reservation completed for invoice ${invoiceId || 'N/A'}`,
    changes: {
      status: 'completed'
    }
  });

  return reservation;
}

/**
 * Cancel a reservation
 * Frees up reserved stock
 * 
 * @param {string} reservationId
 * @param {string} businessId
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} Updated reservation
 */
export async function cancelReservation(
  reservationId,
  businessId,
  reason = ''
) {
  const reservation = await db.inventory_reservations.update({
    where: { id: reservationId },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
      notes: reason
    }
  });

  // Log cancellation
  await auditLog({
    businessId,
    action: 'RESERVATION_CANCELLED',
    entityType: 'inventory_reservation',
    entityId: reservationId,
    description: `Reservation cancelled${reason ? ': ' + reason : ''}`,
    changes: {
      status: 'cancelled'
    }
  });

  return reservation;
}

/**
 * Auto-expire old reservations
 * Finds expired reservations and marks as expired
 * Run as scheduled job
 * 
 * @param {string} businessId - Optional: only expire for one business
 * @returns {Promise<Object>} Summary of expired reservations
 * 
 * @example
 * const result = await expireReservations();
 * console.log(`Expired ${result.count} old reservations`);
 */
export async function expireReservations(businessId = null) {
  const now = new Date();

  const expired = await db.inventory_reservations.findMany({
    where: {
      ...(businessId && { business_id: businessId }),
      status: 'active',
      expires_at: { lt: now }
    },
    select: { id: true, product_id: true, quantity: true }
  });

  let count = 0;
  const updated = [];

  for (const reservation of expired) {
    try {
      const result = await db.inventory_reservations.update({
        where: { id: reservation.id },
        data: { status: 'expired' }
      });
      count++;
      updated.push(result);
    } catch (error) {
      console.error(`Failed to expire reservation ${reservation.id}:`, error);
    }
  }

  return {
    count,
    expired: updated,
    timestamp: now
  };
}

/**
 * Get reservation expiry report
 * Shows reservations expiring soon
 * 
 * @param {string} businessId
 * @param {number} [daysThreshold=7] - Days until expiry to flag
 * @returns {Promise<Object>}
 */
export async function getExpiryReport(businessId, daysThreshold = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const expiring = await db.inventory_reservations.findMany({
    where: {
      business_id: businessId,
      status: 'active',
      expires_at: {
        gt: now,
        lte: futureDate
      }
    },
    select: {
      id: true,
      product_id: true,
      quantity: true,
      expires_at: true,
      reference_type: true,
      reference_id: true,
      customers: {
        select: { name: true }
      },
      products: {
        select: { sku: true, name: true }
      }
    },
    orderBy: { expires_at: 'asc' }
  });

  return {
    businessId,
    reportDate: now,
    threshold: `${daysThreshold} days`,
    expiringCount: expiring.length,
    reservations: expiring.map(res => ({
      id: res.id,
      sku: res.products.sku,
      name: res.products.name,
      quantity: res.quantity,
      customer: res.customers?.name,
      reference: `${res.reference_type}:${res.reference_id}`,
      expiresAt: res.expires_at,
      daysRemaining: Math.ceil((res.expires_at - now) / (1000 * 60 * 60 * 24))
    }))
  };
}

export default {
  reserveStock,
  getAvailableQuantity,
  getActiveReservations,
  completeReservation,
  cancelReservation,
  expireReservations,
  getExpiryReport
};
