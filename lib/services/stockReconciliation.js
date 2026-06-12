/**
 * Stock Reconciliation Service
 * 
 * Ensures product.stock always matches sum of product_stock_locations
 * Runs daily and on-demand to catch and fix discrepancies
 * 
 * @module lib/services/stockReconciliation
 */

import { db } from '@/lib/db';
import { auditLog } from '@/lib/services/auditLog';

/**
 * Synchronize product stock levels with location totals
 * Calculates actual stock from all warehouse locations and updates product table
 * 
 * @param {string} businessId - Business UUID to reconcile
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoFix=true] - Automatically fix discrepancies
 * @param {number} [options.discrepancyThreshold=0] - Max allowed difference before alert
 * @param {boolean} [options.verbose=false] - Log all details
 * @returns {Promise<Object>} Reconciliation report
 * 
 * @example
 * const report = await syncProductStockLevels(businessId, { autoFix: true });
 * console.log(`Fixed ${report.fixed} discrepancies`);
 */
export async function syncProductStockLevels(
  businessId,
  options = {}
) {
  const {
    autoFix = true,
    discrepancyThreshold = 0,
    verbose = false
  } = options;

  const report = {
    businessId,
    timestamp: new Date(),
    productsChecked: 0,
    discrepanciesFound: 0,
    discrepanciesFixed: 0,
    totalVariance: 0,
    issues: [],
    details: []
  };

  try {
    // Get all active products for this business
    const products = await db.products.findMany({
      where: {
        business_id: businessId,
        is_deleted: false
      },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        business_id: true
      }
    });

    report.productsChecked = products.length;

    // Check each product
    for (const product of products) {
      try {
        // Calculate actual stock from all locations (sellable only)
        const locationData = await db.product_stock_locations.aggregate({
          _sum: { quantity: true },
          where: {
            product_id: product.id,
            state: 'sellable'  // Only sellable stock counts
          }
        });

        const actualStock = locationData._sum.quantity || 0;
        const dbStock = parseFloat(product.stock) || 0;
        const variance = actualStock - dbStock;

        if (Math.abs(variance) > discrepancyThreshold) {
          report.discrepanciesFound++;
          report.totalVariance += Math.abs(variance);

          const issue = {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            dbStock,
            actualStock,
            variance,
            fixed: false,
            fixedAt: null
          };

          // Fix if enabled
          if (autoFix && variance !== 0) {
            try {
              // Update product to actual value
              await db.products.update({
                where: { id: product.id },
                data: { stock: actualStock }
              });

              // Log the fix
              await auditLog({
                businessId,
                action: 'STOCK_RECONCILIATION',
                entityType: 'product',
                entityId: product.id,
                description: `Stock auto-corrected from ${dbStock} to ${actualStock}`,
                changes: {
                  from: dbStock,
                  to: actualStock,
                  variance,
                  reason: 'Daily reconciliation'
                },
                metadata: {
                  sku: product.sku,
                  type: 'auto_fix'
                }
              });

              issue.fixed = true;
              issue.fixedAt = new Date();
              report.discrepanciesFixed++;

              if (verbose) {
                console.log(
                  `✓ Fixed stock for ${product.sku}: ` +
                  `${dbStock} -> ${actualStock} (${variance > 0 ? '+' : ''}${variance})`
                );
              }
            } catch (error) {
              issue.error = error.message;
              report.issues.push(`Failed to fix ${product.sku}: ${error.message}`);
              if (verbose) {
                console.error(`✗ Failed to fix ${product.sku}:`, error.message);
              }
            }
          }

          report.details.push(issue);
        }
      } catch (error) {
        report.issues.push(
          `Error checking product ${product.sku}: ${error.message}`
        );
      }
    }

    // Also check for unreserved stock in reservations
    const reservationCheck = await checkUnexpiredReservations(businessId);
    if (reservationCheck.issues.length > 0) {
      report.issues.push(...reservationCheck.issues);
    }
    report.details.push(...reservationCheck.details);

  } catch (error) {
    report.issues.push(`Stock reconciliation failed: ${error.message}`);
    console.error('Stock reconciliation error:', error);
  }

  // Summary
  if (verbose) {
    console.log('[CHART] Stock Reconciliation Report:');
    console.log(`  Products checked: ${report.productsChecked}`);
    console.log(`  Discrepancies found: ${report.discrepanciesFound}`);
    console.log(`  Discrepancies fixed: ${report.discrepanciesFixed}`);
    console.log(`  Total variance: ${report.totalVariance} units`);
    if (report.issues.length > 0) {
      console.log(`  Issues: ${report.issues.length}`);
      report.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  }

  return report;
}

/**
 * Check for expired inventory reservations
 * Mark as expired if past expiry date
 * 
 * @param {string} businessId
 * @returns {Promise<Object>}
 * @private
 */
async function checkUnexpiredReservations(businessId) {
  const result = {
    issues: [],
    details: []
  };

  try {
    const expired = await db.inventory_reservations.findMany({
      where: {
        business_id: businessId,
        status: 'active',
        expires_at: { lt: new Date() }
      },
      select: {
        id: true,
        product_id: true,
        quantity: true,
        expires_at: true,
        reference: true
      }
    });

    if (expired.length > 0) {
      for (const reservation of expired) {
        try {
          await db.inventory_reservations.update({
            where: { id: reservation.id },
            data: { status: 'expired' }
          });

          result.details.push({
            type: 'reservation_expired',
            reservationId: reservation.id,
            productId: reservation.product_id,
            quantity: reservation.quantity,
            reference: reservation.reference,
            expiredAt: reservation.expires_at
          });
        } catch (error) {
          result.issues.push(
            `Failed to expire reservation ${reservation.id}: ${error.message}`
          );
        }
      }
    }
  } catch (error) {
    result.issues.push(`Reservation check failed: ${error.message}`);
  }

  return result;
}

/**
 * Validate stock level against reserved quantities
 * Returns available stock = total - reserved
 * 
 * @param {string} productId
 * @param {string} businessId
 * @returns {Promise<Object>}
 * 
 * @example
 * const availability = await getProductAvailability(productId, businessId);
 * console.log(`Available: ${availability.available} / ${availability.total}`);
 */
export async function getProductAvailability(productId, businessId) {
  const product = await db.products.findFirst({
    where: { id: productId, business_id: businessId, is_deleted: false },
    select: { stock: true }
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const totalStock = parseFloat(product.stock) || 0;

  // Get active reservations
  const reserved = await db.inventory_reservations.aggregate({
    _sum: { quantity: true },
    where: {
      product_id: productId,
      business_id: businessId,
      status: 'active'
    }
  });

  const reservedQty = reserved._sum.quantity || 0;
  const available = totalStock - reservedQty;

  return {
    productId,
    total: totalStock,
    reserved: reservedQty,
    available: Math.max(0, available),
    canFulfill: available >= 0,
    percentUtilized: totalStock > 0 ? (reservedQty / totalStock * 100).toFixed(2) : 0
  };
}

/**
 * Generate stock health report
 * Identifies products that are out of stock, low, or near max
 * 
 * @param {string} businessId
 * @returns {Promise<Object>}
 * 
 * @example
 * const health = await getStockHealthReport(businessId);
 * console.log(`Out of stock: ${health.outOfStock.length} products`);
 */
export async function getStockHealthReport(businessId) {
  const products = await db.products.findMany({
    where: {
      business_id: businessId,
      is_deleted: false
    },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true,
      min_stock: true,
      min_stock_level: true,
      max_stock: true,
      reorder_point: true,
      reorder_quantity: true
    },
    orderBy: { stock: 'asc' }
  });

  const report = {
    timestamp: new Date(),
    outOfStock: [],
    lowStock: [],
    overStock: [],
    atOptimal: [],
    total: products.length
  };

  for (const product of products) {
    const stock = parseFloat(product.stock) || 0;
    const minStock = parseFloat(product.min_stock || product.min_stock_level || 5);
    const maxStock = parseFloat(product.max_stock || Infinity);
    const reorderPoint = parseFloat(product.reorder_point || minStock);

    const item = {
      sku: product.sku,
      name: product.name,
      current: stock,
      min: minStock,
      max: maxStock,
      reorderPoint,
      reorderQty: product.reorder_quantity
    };

    if (stock === 0) {
      report.outOfStock.push(item);
    } else if (stock < minStock) {
      report.lowStock.push(item);
    } else if (stock > maxStock) {
      report.overStock.push(item);
    } else {
      report.atOptimal.push(item);
    }
  }

  return report;
}

/**
 * Schedule daily reconciliation
 * Call this in your app initialization or cron job
 * 
 * @example
 * // In your scheduled jobs:
 * scheduleDailyReconciliation();
 */
export function scheduleDailyReconciliation() {
  // This is a placeholder - implement with your chosen scheduler
  // Options: node-cron, bull, AWS Lambda, etc.
  
  console.log(
    '📅 Stock reconciliation scheduled. ' +
    'Implement with node-cron or your preferred scheduler.'
  );
  
  // Example with node-cron:
  // import cron from 'node-cron';
  // cron.schedule('0 2 * * *', async () => {
  //   const businesses = await db.businesses.findMany();
  //   for (const business of businesses) {
  //     await syncProductStockLevels(business.id, { autoFix: true, verbose: true });
  //   }
  // });
}

export default {
  syncProductStockLevels,
  getProductAvailability,
  getStockHealthReport,
  scheduleDailyReconciliation
};
