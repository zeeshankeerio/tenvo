/**
 * Registration inventory seed state — idempotent provisioning helpers.
 */
import { prismaBase } from '../db.js';

function parseSettings(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
}

/**
 * @param {string} businessId
 */
export async function getRegistrationSeedState(businessId) {
  const [biz, productCount, categoryCount] = await Promise.all([
    prismaBase.businesses.findUnique({
      where: { id: businessId },
      select: { settings: true },
    }),
    prismaBase.products.count({
      where: {
        business_id: businessId,
        OR: [{ is_deleted: false }, { is_deleted: null }],
      },
    }),
    prismaBase.product_categories.count({
      where: { business_id: businessId, is_active: true },
    }),
  ]);

  const settings = parseSettings(biz?.settings);
  const registration = parseSettings(settings.registration);
  const seededAt = registration.categories_seeded_at || registration.inventory_seeded_at || null;

  return {
    seededAt,
    productCount,
    categoryCount,
    /** True when category shells were provisioned or legacy product seed ran */
    alreadySeeded: Boolean(seededAt) || categoryCount > 0,
  };
}

/**
 * @param {string} businessId
 * @param {{ productCount?: number, categoryCount?: number }} summary
 */
export async function markRegistrationInventorySeeded(businessId, summary = {}) {
  const stamp = {
    categories_seeded_at: new Date().toISOString(),
    inventory_seeded_at: new Date().toISOString(),
    inventory_seed_products: summary.productCount ?? 0,
    inventory_seed_categories: summary.categoryCount ?? 0,
    inventory_mode: (summary.productCount ?? 0) > 0 ? 'demo_products' : 'categories_only',
  };

  const biz = await prismaBase.businesses.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const prevBizSettings = parseSettings(biz?.settings);
  const nextBizSettings = {
    ...prevBizSettings,
    registration: {
      ...parseSettings(prevBizSettings.registration),
      ...stamp,
    },
  };

  await prismaBase.businesses.update({
    where: { id: businessId },
    data: { settings: nextBizSettings },
  });

  const row = await prismaBase.business_settings.findFirst({
    where: { business_id: businessId },
    select: { id: true, settings: true },
  });

  if (row) {
    const prev = parseSettings(row.settings);
    await prismaBase.business_settings.update({
      where: { id: row.id },
      data: {
        settings: {
          ...prev,
          registration: {
            ...parseSettings(prev.registration),
            ...stamp,
          },
        },
      },
    });
  }

  return stamp;
}
