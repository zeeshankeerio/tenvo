/**
 * Example: Using ManufacturingService.explodeBOM()
 * 
 * This example demonstrates how to use the explodeBOM method to calculate
 * material requirements for a production order.
 */

import { ManufacturingService } from '../ManufacturingService';

/**
 * Example 1: Basic BOM Explosion
 * Calculate material requirements for producing 10 units
 */
async function basicBOMExplosion() {
    const bomId = 'bom-123';
    const quantity = 10;
    const businessId = 'business-456';

    try {
        const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

        console.log('BOM Explosion Result:');
        console.log('=====================');
        console.log(`Product: ${result.bom.product_name}`);
        console.log(`Production Quantity: ${result.productionQuantity} units`);
        console.log(`Total Materials: ${result.totalMaterials}`);
        console.log(`Total Estimated Cost: $${result.totalEstimatedCost}`);
        console.log(`Can Produce: ${result.canProduce ? 'Yes' : 'No'}`);
        console.log(`\nMaterials Required:`);
        
        result.materials.forEach((material, index) => {
            console.log(`\n${index + 1}. ${material.material_name} (${material.sku})`);
            console.log(`   Unit Quantity: ${material.unit_quantity} ${material.unit}`);
            console.log(`   Required Quantity: ${material.required_quantity} ${material.unit}`);
            console.log(`   Cost per Unit: $${material.cost_price}`);
            console.log(`   Total Cost: $${material.total_cost}`);
            console.log(`   Available Stock: ${material.available_stock} ${material.unit}`);
            console.log(`   Sufficient: ${material.is_sufficient ? 'Yes' : `No (short ${material.shortage} ${material.unit})`}`);
        });

        if (result.insufficientMaterials > 0) {
            console.log(`\n[WARNING]  Warning: ${result.insufficientMaterials} material(s) have insufficient stock`);
        }

    } catch (error) {
        console.error('Error exploding BOM:', error.message);
    }
}

/**
 * Example 2: Check Material Availability Before Starting Production
 * Use explodeBOM to validate materials before creating a production order
 */
async function checkMaterialsBeforeProduction() {
    const bomId = 'bom-789';
    const plannedQuantity = 50;
    const businessId = 'business-456';

    try {
        const explosion = await ManufacturingService.explodeBOM(bomId, plannedQuantity, businessId);

        if (explosion.canProduce) {
            console.log('[OK] All materials available. Safe to start production.');
            console.log(`Estimated production cost: $${explosion.totalEstimatedCost}`);
            console.log(`Cost per unit: $${(explosion.totalEstimatedCost / plannedQuantity).toFixed(2)}`);
            
            // Proceed to create production order
            // await ManufacturingService.createProductionOrder({ ... });
        } else {
            console.log('[X] Cannot start production. Insufficient materials:');
            
            const insufficient = explosion.materials.filter(m => !m.is_sufficient);
            insufficient.forEach(material => {
                console.log(`  - ${material.material_name}: need ${material.required_quantity}, have ${material.available_stock}, short ${material.shortage} ${material.unit}`);
            });
            
            // Optionally create purchase orders for missing materials
            console.log('\n💡 Suggestion: Create purchase orders for missing materials');
        }

    } catch (error) {
        console.error('Error checking materials:', error.message);
    }
}

/**
 * Example 3: Calculate Material Requirements for Multiple Production Quantities
 * Compare costs for different production volumes
 */
async function compareProductionVolumes() {
    const bomId = 'bom-101';
    const businessId = 'business-456';
    const quantities = [10, 50, 100, 500];

    console.log('Production Volume Analysis:');
    console.log('===========================\n');

    for (const qty of quantities) {
        try {
            const result = await ManufacturingService.explodeBOM(bomId, qty, businessId);
            
            console.log(`Quantity: ${qty} units`);
            console.log(`  Total Cost: $${result.totalEstimatedCost}`);
            console.log(`  Cost per Unit: $${(result.totalEstimatedCost / qty).toFixed(2)}`);
            console.log(`  Can Produce: ${result.canProduce ? 'Yes' : 'No'}`);
            console.log('');

        } catch (error) {
            console.error(`Error for quantity ${qty}:`, error.message);
        }
    }
}

/**
 * Example 4: Generate Material Purchase List
 * Create a shopping list for materials needed
 */
async function generatePurchaseList() {
    const bomId = 'bom-202';
    const quantity = 100;
    const businessId = 'business-456';

    try {
        const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

        console.log('Material Purchase List:');
        console.log('======================\n');
        console.log(`For Production: ${result.bom.product_name} (${quantity} units)\n`);

        const insufficientMaterials = result.materials.filter(m => !m.is_sufficient);

        if (insufficientMaterials.length === 0) {
            console.log('[OK] All materials in stock. No purchases needed.');
        } else {
            console.log('Materials to Purchase:\n');
            
            let totalPurchaseCost = 0;
            
            insufficientMaterials.forEach((material, index) => {
                const purchaseQty = material.shortage;
                const purchaseCost = purchaseQty * material.cost_price;
                totalPurchaseCost += purchaseCost;
                
                console.log(`${index + 1}. ${material.material_name} (${material.sku})`);
                console.log(`   Quantity Needed: ${purchaseQty} ${material.unit}`);
                console.log(`   Estimated Cost: $${purchaseCost.toFixed(2)}`);
                console.log('');
            });
            
            console.log(`Total Purchase Cost: $${totalPurchaseCost.toFixed(2)}`);
        }

    } catch (error) {
        console.error('Error generating purchase list:', error.message);
    }
}

/**
 * Example 5: Fractional Quantities
 * Handle production of fractional units (e.g., 2.5 units)
 */
async function fractionalQuantityExample() {
    const bomId = 'bom-303';
    const quantity = 2.5; // Fractional quantity
    const businessId = 'business-456';

    try {
        const result = await ManufacturingService.explodeBOM(bomId, quantity, businessId);

        console.log('Fractional Quantity Production:');
        console.log('==============================\n');
        console.log(`Production Quantity: ${quantity} units\n`);

        result.materials.forEach(material => {
            console.log(`${material.material_name}:`);
            console.log(`  Unit Qty: ${material.unit_quantity} ${material.unit}`);
            console.log(`  Required: ${material.required_quantity} ${material.unit}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error with fractional quantity:', error.message);
    }
}

// Export examples for use in other modules
export {
    basicBOMExplosion,
    checkMaterialsBeforeProduction,
    compareProductionVolumes,
    generatePurchaseList,
    fractionalQuantityExample,
};

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Running BOM Explosion Examples...\n');
    
    // Uncomment to run specific examples:
    // await basicBOMExplosion();
    // await checkMaterialsBeforeProduction();
    // await compareProductionVolumes();
    // await generatePurchaseList();
    // await fractionalQuantityExample();
}
