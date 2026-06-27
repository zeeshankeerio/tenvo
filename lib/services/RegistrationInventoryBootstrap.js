/**
 * Lightweight inventory depth for registration — primary warehouse + location stock.
 * Keeps hub display stock aligned with InventoryService (product_stock_locations).
 */
import { resolveDomainKey } from '../config/domainKeyAliases.js';
import { getDomainKnowledge } from '../domainKnowledge.js';

/** @type {Record<string, { name: string; code: string; city: string }>} */
const PRIMARY_WAREHOUSE_BY_ISO = {
  PK: { name: 'Main Warehouse', code: 'WH-MAIN', city: 'Lahore' },
  SG: { name: 'Distribution Hub', code: 'WH-MAIN', city: 'Singapore' },
  AE: { name: 'Main Warehouse', code: 'WH-MAIN', city: 'Dubai' },
  US: { name: 'Main Warehouse', code: 'WH-MAIN', city: 'Main' },
  GB: { name: 'Main Warehouse', code: 'WH-MAIN', city: 'Main' },
};

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} prismaTx
 * @param {string} businessId
 * @param {string} countryIso
 */
export async function ensurePrimaryWarehouse(prismaTx, businessId, countryIso) {
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const preset = PRIMARY_WAREHOUSE_BY_ISO[iso] || PRIMARY_WAREHOUSE_BY_ISO.PK;

  const existing = await prismaTx.warehouse_locations.findFirst({
    where: { business_id: businessId, code: preset.code },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prismaTx.warehouse_locations.create({
    data: {
      business_id: businessId,
      name: preset.name,
      code: preset.code,
      type: 'warehouse',
      city: preset.city,
      is_primary: true,
      is_active: true,
    },
  });
  return created.id;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} prismaTx
 * @param {string} businessId
 * @param {string} warehouseId
 * @param {Array<{ id: string; stock?: number | null }>} products
 */
export async function seedRegistrationLocationStock(prismaTx, businessId, warehouseId, products) {
  let count = 0;
  for (const product of products) {
    const qty = Math.max(Number(product.stock) || 0, 0);
    if (qty <= 0) continue;

    await prismaTx.product_stock_locations.upsert({
      where: {
        business_id_product_id_warehouse_id_state: {
          business_id: businessId,
          product_id: product.id,
          warehouse_id: warehouseId,
          state: 'sellable',
        },
      },
      create: {
        business_id: businessId,
        product_id: product.id,
        warehouse_id: warehouseId,
        quantity: qty,
        state: 'sellable',
      },
      update: {
        quantity: qty,
      },
    });
    count++;
  }
  return count;
}

/**
 * When a vertical enables multi-location inventory, mirror seeded headline stock into the primary warehouse.
 * @param {{
 *   prismaTx: import('@prisma/client').Prisma.TransactionClient,
 *   businessId: string,
 *   domainKey: string,
 *   countryIso: string,
 *   seededProducts: Array<{ id: string; stock?: number | null }>,
 * }} params
 */
export async function bootstrapRegistrationInventory({
  prismaTx,
  businessId,
  domainKey,
  countryIso,
  seededProducts,
}) {
  if (!Array.isArray(seededProducts) || seededProducts.length === 0) {
    return { warehouseId: null, locationRows: 0 };
  }

  const canonicalKey = resolveDomainKey(domainKey);
  const iso = String(countryIso || 'PK').trim().toUpperCase();
  const knowledge = getDomainKnowledge(canonicalKey, { countryIso: iso });
  if (!knowledge?.multiLocationEnabled) {
    return { warehouseId: null, locationRows: 0 };
  }

  const warehouseId = await ensurePrimaryWarehouse(prismaTx, businessId, iso);
  const locationRows = await seedRegistrationLocationStock(
    prismaTx,
    businessId,
    warehouseId,
    seededProducts
  );

  return { warehouseId, locationRows };
}
