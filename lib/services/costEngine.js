/**
 * Weighted Average Cost Engine
 *
 * Recalculates a product's `cost_price` using the weighted average method
 * whenever new inventory is received (purchases, returns, adjustments).
 *
 * Formula:
 *   new_avg_cost = ((current_qty × current_cost) + (incoming_qty × incoming_cost))
 *                  / (current_qty + incoming_qty)
 *
 * This MUST be called within an active database transaction to ensure ACID integrity.
 *
 * @module costEngine
 */

/**
 * Recalculate and update a product's weighted average cost price.
 *
 * @param {import('pg').PoolClient} client - Active transaction client (required)
 * @param {string} productId             - Product UUID
 * @param {number} incomingQuantity       - Quantity being added
 * @param {number} incomingUnitCost       - Cost per unit of incoming stock
 * @returns {Promise<{ previousCost: number, newCost: number, totalQuantity: number }>}
 */
export async function updateWeightedAverageCost(client, productId, incomingQuantity, incomingUnitCost) {
    if (!client) {
        throw new Error('updateWeightedAverageCost requires an active transaction client');
    }

    if (!productId || incomingQuantity <= 0 || incomingUnitCost < 0) {
        return null; // Skip for invalid inputs
    }

    // Get current product cost and total stock across all locations
    const productRes = await client.query(
        `SELECT
            p.cost_price,
            COALESCE(SUM(psl.quantity), 0)::numeric AS current_stock
         FROM products p
         LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
         WHERE p.id = $1
         GROUP BY p.id, p.cost_price`,
        [productId]
    );

    if (productRes.rows.length === 0) {
        return null; // Product not found
    }

    const currentCost = parseFloat(productRes.rows[0].cost_price || 0);
    const currentStock = parseFloat(productRes.rows[0].current_stock || 0);
    const qty = parseFloat(incomingQuantity);
    const cost = parseFloat(incomingUnitCost);

    // Calculate weighted average
    let newCost;
    const totalQuantity = currentStock + qty;

    if (totalQuantity <= 0) {
        // Edge case: no stock remains -> keep the incoming cost as the new baseline
        newCost = cost;
    } else if (currentStock <= 0) {
        // No existing stock -> incoming cost is the new cost
        newCost = cost;
    } else {
        // Standard weighted average formula
        newCost = ((currentStock * currentCost) + (qty * cost)) / totalQuantity;
    }

    // Round to 2 decimal places for currency precision
    newCost = Math.round(newCost * 100) / 100;

    // Update product cost_price
    await client.query(
        `UPDATE products SET cost_price = $1, updated_at = NOW() WHERE id = $2`,
        [newCost, productId]
    );

    return {
        previousCost: currentCost,
        newCost,
        totalQuantity
    };
}
