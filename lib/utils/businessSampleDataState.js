/**
 * Opt-in sample data state on business settings (Settings → Load / Remove demo data).
 */
import { prismaBase } from '../db.js';
import { parseSampleDataSettings } from '../dataLab/sampleDataConstants.js';

function parseSettings(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return {};
}

/**
 * @param {string} businessId
 */
export async function getBusinessSampleDataState(businessId) {
  const [biz, sampleProductCount, userProductCount] = await Promise.all([
    prismaBase.businesses.findUnique({
      where: { id: businessId },
      select: { settings: true, domain: true },
    }),
    prismaBase.products.count({
      where: {
        business_id: businessId,
        OR: [{ is_deleted: false }, { is_deleted: null }],
        domain_data: { path: ['sample_source'], equals: 'business-sample-data' },
      },
    }),
    prismaBase.products.count({
      where: {
        business_id: businessId,
        OR: [{ is_deleted: false }, { is_deleted: null }],
        NOT: { domain_data: { path: ['sample_source'], equals: 'business-sample-data' } },
      },
    }),
  ]);

  const settings = parseSettings(biz?.settings);
  const sample = parseSampleDataSettings(settings);
  const isPlatformDemoHandle = String(biz?.domain || '').startsWith('demo-');

  return {
    ...sample,
    sampleProductCount,
    userProductCount,
    isPlatformDemoHandle,
    canLoad: !isPlatformDemoHandle,
    canRemove: sample.loaded || sampleProductCount > 0,
  };
}

/**
 * @param {string} businessId
 * @param {string} batchId
 * @param {Record<string, unknown>} summary
 */
export async function markBusinessSampleDataLoaded(businessId, batchId, summary = {}) {
  const stamp = {
    loaded_at: new Date().toISOString(),
    batch_id: batchId,
    version: '1',
    summary,
  };

  const biz = await prismaBase.businesses.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const prev = parseSettings(biz?.settings);
  const next = {
    ...prev,
    sample_data: stamp,
    registration: {
      ...parseSettings(prev.registration),
      inventory_mode: 'sample_data',
      inventory_seeded_at: stamp.loaded_at,
    },
  };

  await prismaBase.businesses.update({
    where: { id: businessId },
    data: { settings: next },
  });

  const row = await prismaBase.business_settings.findFirst({
    where: { business_id: businessId },
    select: { id: true, settings: true },
  });
  if (row) {
    const prevRow = parseSettings(row.settings);
    await prismaBase.business_settings.update({
      where: { id: row.id },
      data: {
        settings: {
          ...prevRow,
          sample_data: stamp,
        },
      },
    });
  }

  return stamp;
}

/**
 * @param {string} businessId
 */
export async function clearBusinessSampleDataState(businessId) {
  const biz = await prismaBase.businesses.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const prev = parseSettings(biz?.settings);
  const { sample_data: _drop, ...rest } = prev;
  const next = {
    ...rest,
    registration: {
      ...parseSettings(prev.registration),
      inventory_mode: 'empty',
      sample_data_removed_at: new Date().toISOString(),
    },
  };

  await prismaBase.businesses.update({
    where: { id: businessId },
    data: { settings: next },
  });

  const row = await prismaBase.business_settings.findFirst({
    where: { business_id: businessId },
    select: { id: true, settings: true },
  });
  if (row) {
    const prevRow = parseSettings(row.settings);
    const { sample_data: _d2, ...rowRest } = prevRow;
    await prismaBase.business_settings.update({
      where: { id: row.id },
      data: { settings: rowRest },
    });
  }
}
