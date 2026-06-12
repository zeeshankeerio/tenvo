/**
 * Serial Number Integration Service
 * 
 * Manages serial tracking for product sales
 * Allocates specific serial numbers to customers
 * Tracks warranty and ownership
 * 
 * @module lib/services/serialIntegration
 */

import { db } from '@/lib/db';
import { auditLog } from '@/lib/services/auditLog';

/**
 * Find available serials for a product
 * Only returns in-stock serials with valid warranty
 * 
 * @param {string} productId
 * @param {string} businessId
 * @param {number} [quantity] - Number needed (for validation)
 * @returns {Promise<Array>} Available serials
 * 
 * @example
 * const serials = await getAvailableSerials(productId, businessId, 5);
 * // Returns array of at least 5 available serials
 */
export async function getAvailableSerials(
  productId,
  businessId,
  quantity = null
) {
  const now = new Date();

  const available = await db.product_serials.findMany({
    where: {
      product_id: productId,
      business_id: businessId,
      status: 'in_stock',
      is_deleted: false,
      warranty_expiry_date: {
        gt: now  // Warranty not expired
      }
    },
    select: {
      id: true,
      serial_number: true,
      imei: true,
      mac_address: true,
      warranty_expiry_date: true,
      warranty_period_months: true,
      batch_id: true,
      created_at: true,
      product_batches: {
        select: {
          batch_number: true,
          expiry_date: true
        }
      }
    },
    orderBy: { created_at: 'asc' }  // Oldest first
  });

  if (quantity && available.length < quantity) {
    throw new Error(
      `Not enough available serials. ` +
      `Requested: ${quantity}, Available: ${available.length}`
    );
  }

  return available.map(serial => ({
    id: serial.id,
    serialNumber: serial.serial_number,
    imei: serial.imei,
    macAddress: serial.mac_address,
    warrantyExpiryDate: serial.warranty_expiry_date,
    warrantyMonths: serial.warranty_period_months,
    batchNumber: serial.product_batches?.batch_number,
    batchExpiryDate: serial.product_batches?.expiry_date,
    createdAt: serial.created_at
  }));
}

/**
 * Allocate serials to an invoice
 * Updates serial status and links to customer and invoice
 * 
 * @param {Object} data
 * @param {Array<string>} data.serialIds - Serial IDs to allocate
 * @param {string} data.invoiceId - Invoice UUID
 * @param {string} data.customerId - Customer UUID
 * @param {string} data.businessId - Business UUID
 * @param {Date} [data.saleDate] - Date of sale (default: now)
 * @param {string} [data.notes] - Additional notes
 * @returns {Promise<Array>} Updated serials
 * 
 * @example
 * const updated = await allocateSerialToInvoice({
 *   serialIds: ['serial-1', 'serial-2'],
 *   invoiceId: 'invoice-123',
 *   customerId: 'customer-456',
 *   businessId: 'business-789'
 * });
 */
export async function allocateSerialToInvoice(data) {
  const {
    serialIds = [],
    invoiceId,
    customerId,
    businessId,
    saleDate = new Date(),
    notes = ''
  } = data;

  if (!serialIds || serialIds.length === 0) {
    throw new Error('No serial IDs provided');
  }

  const updated = [];

  for (const serialId of serialIds) {
    const serial = await db.product_serials.findFirst({
      where: { id: serialId, business_id: businessId, is_deleted: false },
      select: {
        id: true,
        serial_number: true,
        status: true,
        warranty_period_months: true,
        product_id: true
      }
    });

    if (!serial) {
      throw new Error(`Serial ${serialId} not found`);
    }

    if (serial.status !== 'in_stock') {
      throw new Error(
        `Serial ${serial.serial_number} is not available ` +
        `(Status: ${serial.status})`
      );
    }

    // Calculate warranty expiry
    const warrantyExpiry = new Date(saleDate);
    if (serial.warranty_period_months) {
      warrantyExpiry.setMonth(
        warrantyExpiry.getMonth() + serial.warranty_period_months
      );
    }

    // Update serial
    const updatedSerial = await db.product_serials.update({
      where: { id: serialId },
      data: {
        status: 'sold',
        sale_date: saleDate,
        customer_id: customerId,
        invoice_id: invoiceId,
        warranty_start_date: saleDate,
        warranty_end_date: warrantyExpiry,
        warranty_expiry_date: warrantyExpiry
      },
      select: {
        id: true,
        serial_number: true,
        status: true,
        sale_date: true,
        warranty_expiry_date: true
      }
    });

    // Log allocation
    await auditLog({
      businessId,
      action: 'SERIAL_ALLOCATED',
      entityType: 'product_serial',
      entityId: serialId,
      description: `Serial ${serial.serial_number} allocated to customer`,
      changes: {
        status: 'sold',
        customer_id: customerId,
        invoice_id: invoiceId
      },
      metadata: {
        serialNumber: serial.serial_number,
        warrantyExpiry: warrantyExpiry.toISOString()
      }
    });

    updated.push(updatedSerial);
  }

  return updated;
}

/**
 * Validate warranty for a serial number
 * Used at point-of-service (warranty claims)
 * 
 * @param {string} serialNumber
 * @param {string} businessId
 * @returns {Promise<Object>} Warranty validation result
 * 
 * @example
 * const warranty = await validateWarranty('SN123456', businessId);
 * if (warranty.valid) {
 *   console.log(`Warranty valid until ${warranty.expiryDate}`);
 * }
 */
export async function validateWarranty(serialNumber, businessId) {
  const now = new Date();

  const serial = await db.product_serials.findFirst({
    where: {
      serial_number: serialNumber,
      business_id: businessId,
      is_deleted: false
    },
    select: {
      id: true,
      serial_number: true,
      status: true,
      sale_date: true,
      warranty_start_date: true,
      warranty_expiry_date: true,
      customer_id: true,
      customers: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      },
      products: {
        select: {
          sku: true,
          name: true
        }
      }
    }
  });

  if (!serial) {
    return {
      valid: false,
      reason: 'Serial number not found',
      serialNumber
    };
  }

  if (serial.status !== 'sold') {
    return {
      valid: false,
      reason: `Serial is ${serial.status}, not sold`,
      serialNumber
    };
  }

  const isExpired = serial.warranty_expiry_date < now;
  const daysRemaining = Math.ceil(
    (serial.warranty_expiry_date - now) / (1000 * 60 * 60 * 24)
  );

  return {
    valid: !isExpired,
    serialNumber: serial.serial_number,
    product: {
      sku: serial.products.sku,
      name: serial.products.name
    },
    customer: {
      name: serial.customers.name,
      email: serial.customers.email,
      phone: serial.customers.phone
    },
    purchaseDate: serial.sale_date,
    warrantyStartDate: serial.warranty_start_date,
    warrantyExpiryDate: serial.warranty_expiry_date,
    daysRemaining: Math.max(0, daysRemaining),
    isExpired,
    expiryStatus: isExpired
      ? `Expired ${Math.abs(daysRemaining)} days ago`
      : `Valid for ${daysRemaining} days`
  };
}

/**
 * Get serial history
 * Shows full lifecycle of a serial number
 * 
 * @param {string} serialNumber
 * @param {string} businessId
 * @returns {Promise<Object>} Complete serial history
 * 
 * @example
 * const history = await getSerialHistory('SN123456', businessId);
 * console.log(`Serial received: ${history.received}`);
 * console.log(`Serial sold to: ${history.solTo}`);
 */
export async function getSerialHistory(serialNumber, businessId) {
  const serial = await db.product_serials.findFirst({
    where: {
      serial_number: serialNumber,
      business_id: businessId
    },
    select: {
      id: true,
      serial_number: true,
      status: true,
      purchase_date: true,
      sale_date: true,
      warranty_expiry_date: true,
      warranty_period_months: true,
      product_id: true,
      batch_id: true,
      customer_id: true,
      invoice_id: true,
      created_at: true,
      products: {
        select: {
          sku: true,
          name: true,
          category: true
        }
      },
      product_batches: {
        select: {
          batch_number: true,
          expiry_date: true
        }
      },
      customers: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      },
      invoices: {
        select: {
          invoice_number: true,
          date: true
        }
      }
    }
  });

  if (!serial) {
    throw new Error(`Serial ${serialNumber} not found`);
  }

  return {
    serialNumber: serial.serial_number,
    status: serial.status,
    product: {
      sku: serial.products.sku,
      name: serial.products.name,
      category: serial.products.category
    },
    batch: serial.product_batches ? {
      number: serial.product_batches.batch_number,
      expiryDate: serial.product_batches.expiry_date
    } : null,
    lifecycle: {
      receivedDate: serial.purchase_date,
      saleDate: serial.sale_date,
      soldTo: serial.customers ? {
        name: serial.customers.name,
        email: serial.customers.email,
        phone: serial.customers.phone
      } : null,
      invoice: serial.invoices ? {
        number: serial.invoices.invoice_number,
        date: serial.invoices.date
      } : null
    },
    warranty: {
      periodMonths: serial.warranty_period_months,
      expiryDate: serial.warranty_expiry_date,
      isExpired: serial.warranty_expiry_date < new Date(),
      daysRemaining: Math.ceil(
        (serial.warranty_expiry_date - new Date()) / (1000 * 60 * 60 * 24)
      )
    },
    createdAt: serial.created_at
  };
}

/**
 * Handle serial return (warranty replacement)
 * Mark as returned and create replacement serial
 * 
 * @param {Object} data
 * @param {string} data.serialId - Original serial to return
 * @param {string} data.replacementSerialId - New serial to allocate
 * @param {string} data.businessId
 * @param {string} [data.reason] - Return reason
 * @returns {Promise<Object>} Updated serials
 */
export async function handleSerialReturn(data) {
  const {
    serialId,
    replacementSerialId,
    businessId,
    reason = 'warranty_replacement'
  } = data;

  const originalRow = await db.product_serials.findFirst({
    where: { id: serialId, business_id: businessId, is_deleted: false },
    select: {
      id: true,
      serial_number: true,
      customer_id: true,
      invoice_id: true,
    },
  });
  if (!originalRow) {
    throw new Error(`Serial ${serialId} not found for this business`);
  }

  const replacementRow = await db.product_serials.findFirst({
    where: { id: replacementSerialId, business_id: businessId, is_deleted: false },
    select: { id: true, serial_number: true },
  });
  if (!replacementRow) {
    throw new Error(`Replacement serial ${replacementSerialId} not found for this business`);
  }

  const original = await db.product_serials.update({
    where: { id: serialId },
    data: {
      status: 'returned',
      notes: `Returned: ${reason}`
    }
  });

  const replacement = await db.product_serials.update({
    where: { id: replacementSerialId },
    data: {
      status: 'sold',
      customer_id: originalRow.customer_id,
      invoice_id: originalRow.invoice_id,
      sale_date: new Date()
    }
  });

  // Log the return
  await auditLog({
    businessId,
    action: 'SERIAL_RETURN',
    entityType: 'product_serial',
    entityId: serialId,
    description: `Serial returned and replaced with ${replacement.serial_number}`,
    changes: {
      from: original.serial_number,
      to: replacement.serial_number,
      reason
    }
  });

  return {
    returned: original,
    replacement
  };
}

export default {
  getAvailableSerials,
  allocateSerialToInvoice,
  validateWarranty,
  getSerialHistory,
  handleSerialReturn
};
