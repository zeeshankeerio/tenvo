/**
 * Inventory Valuation Service
 * 
 * Calculates inventory value using multiple methods:
 * - FIFO (First In First Out)
 * - LIFO (Last In First Out)  
 * - Weighted Average Cost
 * - Standard Cost
 * 
 * Used for balance sheet and financial reporting
 * 
 * @module lib/services/inventoryValuation
 */

import { db } from '@/lib/db';

/**
 * Calculate inventory valuation using specified method
 * 
 * @param {string} businessId
 * @param {Object} options
 * @param {string} [options.method='weighted-average'] - Valuation method
 * @param {Date} [options.asOfDate] - Valuation date (default: today)
 * @param {boolean} [options.verbose=false] - Include detailed calculations
 * @returns {Promise<Object>} Valuation report
 * 
 * @example
 * const valuation = await calculateInventoryValuation(businessId, {
 *   method: 'fifo',
 *   asOfDate: new Date('2026-05-12')
 * });
 * console.log(`Total inventory value: ${valuation.totalValue}`);
 */
export async function calculateInventoryValuation(businessId, options = {}) {
  const {
    method = 'weighted-average',
    asOfDate = new Date(),
    verbose = false
  } = options;

  const methodMap = {
    'fifo': calculateFIFOValuation,
    'lifo': calculateLIFOValuation,
    'weighted-average': calculateWeightedAverageValuation,
    'standard-cost': calculateStandardCostValuation
  };

  if (!methodMap[method]) {
    throw new Error(
      `Unknown valuation method: ${method}. ` +
      `Supported: ${Object.keys(methodMap).join(', ')}`
    );
  }

  const valuationFn = methodMap[method];
  const result = await valuationFn(businessId, asOfDate, verbose);

  return {
    businessId,
    valuationDate: asOfDate,
    method,
    totalValue: result.totalValue,
    productCount: result.products.length,
    totalQuantity: result.totalQuantity,
    averageCostPerUnit: result.totalQuantity > 0
      ? (result.totalValue / result.totalQuantity).toFixed(2)
      : 0,
    products: result.products,
    timestamp: new Date()
  };
}

/**
 * FIFO Valuation
 * Values inventory using oldest (first) purchased items
 * Most commonly used method
 * 
 * @private
 */
async function calculateFIFOValuation(businessId, asOfDate, verbose) {
  const products = await db.products.findMany({
    where: {
      business_id: businessId,
      is_deleted: false,
      stock: { gt: 0 }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true
    }
  });

  let totalValue = 0;
  let totalQuantity = 0;
  const productValuations = [];

  for (const product of products) {
    const stock = parseFloat(product.stock) || 0;
    if (stock <= 0) continue;

    // Get purchases in chronological order (oldest first)
    const movements = await db.stock_movements.findMany({
      where: {
        product_id: product.id,
        transaction_type: 'purchase',
        created_at: { lte: asOfDate }
      },
      orderBy: { created_at: 'asc' },
      select: {
        quantity_change: true,
        unit_cost: true,
        created_at: true
      }
    });

    let remainingStock = stock;
    let productValue = 0;
    const detail = {
      sku: product.sku,
      name: product.name,
      currentStock: stock,
      unitCost: 0,
      totalValue: 0,
      method: 'FIFO',
      purchases: []
    };

    // Allocate from oldest purchases first
    for (const movement of movements) {
      if (remainingStock <= 0) break;

      const cost = parseFloat(movement.unit_cost) || 0;
      const unitsFromThisPurchase = Math.min(
        movement.quantity_change || 0,
        remainingStock
      );

      const valueFromThisPurchase = unitsFromThisPurchase * cost;
      productValue += valueFromThisPurchase;

      detail.purchases.push({
        date: movement.created_at,
        quantity: unitsFromThisPurchase,
        costPerUnit: cost,
        totalValue: valueFromThisPurchase
      });

      remainingStock -= unitsFromThisPurchase;
    }

    detail.unitCost = stock > 0 ? (productValue / stock).toFixed(2) : 0;
    detail.totalValue = parseFloat(productValue.toFixed(2));

    productValuations.push(detail);
    totalValue += productValue;
    totalQuantity += stock;

    if (verbose) {
      console.log(
        `✓ ${product.sku}: ${stock} units @ ${detail.unitCost} = ${detail.totalValue}`
      );
    }
  }

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalQuantity,
    products: productValuations
  };
}

/**
 * LIFO Valuation
 * Values inventory using newest (last) purchased items
 * Generally results in lower inventory value in inflationary times
 */
async function calculateLIFOValuation(businessId, asOfDate, verbose) {
  const products = await db.products.findMany({
    where: {
      business_id: businessId,
      is_deleted: false,
      stock: { gt: 0 }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true
    }
  });

  let totalValue = 0;
  let totalQuantity = 0;
  const productValuations = [];

  for (const product of products) {
    const stock = parseFloat(product.stock) || 0;
    if (stock <= 0) continue;

    // Get purchases in reverse chronological order (newest first)
    const movements = await db.stock_movements.findMany({
      where: {
        product_id: product.id,
        transaction_type: 'purchase',
        created_at: { lte: asOfDate }
      },
      orderBy: { created_at: 'desc' },  // <- Newest first
      select: {
        quantity_change: true,
        unit_cost: true,
        created_at: true
      }
    });

    let remainingStock = stock;
    let productValue = 0;
    const detail = {
      sku: product.sku,
      name: product.name,
      currentStock: stock,
      unitCost: 0,
      totalValue: 0,
      method: 'LIFO',
      purchases: []
    };

    // Allocate from newest purchases first
    for (const movement of movements) {
      if (remainingStock <= 0) break;

      const cost = parseFloat(movement.unit_cost) || 0;
      const unitsFromThisPurchase = Math.min(
        movement.quantity_change || 0,
        remainingStock
      );

      const valueFromThisPurchase = unitsFromThisPurchase * cost;
      productValue += valueFromThisPurchase;

      detail.purchases.push({
        date: movement.created_at,
        quantity: unitsFromThisPurchase,
        costPerUnit: cost,
        totalValue: valueFromThisPurchase
      });

      remainingStock -= unitsFromThisPurchase;
    }

    detail.unitCost = stock > 0 ? (productValue / stock).toFixed(2) : 0;
    detail.totalValue = parseFloat(productValue.toFixed(2));

    productValuations.push(detail);
    totalValue += productValue;
    totalQuantity += stock;

    if (verbose) {
      console.log(
        `✓ ${product.sku}: ${stock} units @ ${detail.unitCost} = ${detail.totalValue}`
      );
    }
  }

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalQuantity,
    products: productValuations
  };
}

/**
 * Weighted Average Cost Valuation
 * Most conservative and neutral method
 * Uses average cost of all purchases
 */
async function calculateWeightedAverageValuation(businessId, asOfDate, verbose) {
  const products = await db.products.findMany({
    where: {
      business_id: businessId,
      is_deleted: false,
      stock: { gt: 0 }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true
    }
  });

  let totalValue = 0;
  let totalQuantity = 0;
  const productValuations = [];

  for (const product of products) {
    const stock = parseFloat(product.stock) || 0;
    if (stock <= 0) continue;

    // Get all purchases up to valuation date
    const purchases = await db.stock_movements.findMany({
      where: {
        product_id: product.id,
        transaction_type: 'purchase',
        created_at: { lte: asOfDate }
      },
      select: {
        quantity_change: true,
        unit_cost: true
      }
    });

    // Calculate weighted average cost
    let totalPurchaseQty = 0;
    let totalPurchaseValue = 0;

    for (const purchase of purchases) {
      const qty = purchase.quantity_change || 0;
      const cost = parseFloat(purchase.unit_cost) || 0;
      totalPurchaseQty += qty;
      totalPurchaseValue += qty * cost;
    }

    const averageCost = totalPurchaseQty > 0
      ? totalPurchaseValue / totalPurchaseQty
      : 0;

    const productValue = stock * averageCost;

    const detail = {
      sku: product.sku,
      name: product.name,
      currentStock: stock,
      unitCost: parseFloat(averageCost.toFixed(2)),
      totalValue: parseFloat(productValue.toFixed(2)),
      method: 'Weighted Average',
      totalPurchases: totalPurchaseQty,
      totalPurchaseValue: parseFloat(totalPurchaseValue.toFixed(2))
    };

    productValuations.push(detail);
    totalValue += productValue;
    totalQuantity += stock;

    if (verbose) {
      console.log(
        `✓ ${product.sku}: ${stock} units @ ${averageCost.toFixed(2)} = ${productValue.toFixed(2)}`
      );
    }
  }

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalQuantity,
    products: productValuations
  };
}

/**
 * Standard Cost Valuation
 * Uses predefined standard cost, not actual purchase cost
 */
async function calculateStandardCostValuation(businessId, asOfDate, verbose) {
  const products = await db.products.findMany({
    where: {
      business_id: businessId,
      is_deleted: false,
      stock: { gt: 0 }
    },
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true,
      cost_price: true
    }
  });

  let totalValue = 0;
  let totalQuantity = 0;
  const productValuations = [];

  for (const product of products) {
    const stock = parseFloat(product.stock) || 0;
    const standardCost = parseFloat(product.cost_price) || 0;

    if (stock <= 0) continue;

    const productValue = stock * standardCost;

    productValuations.push({
      sku: product.sku,
      name: product.name,
      currentStock: stock,
      unitCost: standardCost,
      totalValue: parseFloat(productValue.toFixed(2)),
      method: 'Standard Cost'
    });

    totalValue += productValue;
    totalQuantity += stock;

    if (verbose) {
      console.log(
        `✓ ${product.sku}: ${stock} units @ ${standardCost} = ${productValue.toFixed(2)}`
      );
    }
  }

  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalQuantity,
    products: productValuations
  };
}

/**
 * Compare valuations across different methods
 * Shows impact of method choice on total inventory value
 * 
 * @param {string} businessId
 * @param {Date} [asOfDate]
 * @returns {Promise<Object>} Comparison report
 * 
 * @example
 * const comparison = await compareValuationMethods(businessId);
 * console.log(`FIFO: ${comparison.fifo.totalValue}`);
 * console.log(`LIFO: ${comparison.lifo.totalValue}`);
 * console.log(`Difference: ${comparison.difference.max}`);
 */
export async function compareValuationMethods(businessId, asOfDate = new Date()) {
  const fifo = await calculateInventoryValuation(businessId, {
    method: 'fifo',
    asOfDate
  });

  const lifo = await calculateInventoryValuation(businessId, {
    method: 'lifo',
    asOfDate
  });

  const weighted = await calculateInventoryValuation(businessId, {
    method: 'weighted-average',
    asOfDate
  });

  const standard = await calculateInventoryValuation(businessId, {
    method: 'standard-cost',
    asOfDate
  });

  const values = [
    fifo.totalValue,
    lifo.totalValue,
    weighted.totalValue,
    standard.totalValue
  ];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const diff = max - min;
  const diffPercent = max > 0 ? ((diff / max) * 100).toFixed(2) : 0;

  return {
    asOfDate,
    methods: {
      fifo,
      lifo,
      weighted,
      standard
    },
    comparison: {
      lowest: {
        method: values.indexOf(min) === 0 ? 'FIFO'
          : values.indexOf(min) === 1 ? 'LIFO'
          : values.indexOf(min) === 2 ? 'Weighted Average'
          : 'Standard Cost',
        value: min
      },
      highest: {
        method: values.indexOf(max) === 0 ? 'FIFO'
          : values.indexOf(max) === 1 ? 'LIFO'
          : values.indexOf(max) === 2 ? 'Weighted Average'
          : 'Standard Cost',
        value: max
      },
      range: {
        min,
        max,
        difference: diff,
        percentDifference: `${diffPercent}%`
      }
    }
  };
}

/**
 * Store valuation in history for audit trail
 * 
 * @param {string} businessId
 * @param {Object} valuationResult
 * @returns {Promise<Object>} Stored record
 */
export async function storeValuationHistory(businessId, valuationResult) {
  // Store in a valuation_history table if it exists
  // Otherwise store in domain_data of a audit or valuation record
  
  const record = {
    business_id: businessId,
    valuation_date: valuationResult.valuationDate,
    method: valuationResult.method,
    total_value: valuationResult.totalValue,
    product_count: valuationResult.productCount,
    unit_count: valuationResult.totalQuantity,
    average_cost_per_unit: valuationResult.averageCostPerUnit,
    details: valuationResult.products,
    created_at: new Date()
  };

  // TODO: Implement storage based on your schema
  // For now, log for audit purposes
  console.log('[CHART] Valuation stored:', record);

  return record;
}

export default {
  calculateInventoryValuation,
  compareValuationMethods,
  storeValuationHistory
};
