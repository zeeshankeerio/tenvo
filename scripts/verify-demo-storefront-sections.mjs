/**
 * Verify demo storefront homepage sections, catalog depth, and vertical settings.
 * Run: bun run verify:demo-storefront-sections
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../lib/dataLab/pool.mjs';
import { ALL_DEMO_SEEDS } from '../lib/dataLab/domains.mjs';
import { FEATURED_DEMO_STORES } from '../lib/marketing/demoStores.js';
import { resolveDomainKey } from '../lib/config/domainKeyAliases.js';
import { getActivePageSections } from '../lib/storefront/storePageSections.js';
import { supportsFashionGulSections, resolveFashionHomeEdit, resolveFashionSaleMosaic } from '../lib/storefront/fashionGulSections.js';
import { getRestaurantConfig } from '../lib/storefront/restaurantStorefront.js';
import { isFitnessElevatedStore } from '../lib/storefront/fitnessStorefront.js';
import { isPharmacyElevatedStore } from '../lib/storefront/pharmacyStorefront.js';
import { isSupermarketElevatedStore } from '../lib/storefront/supermarketStorefront.js';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();

import { resolveDemoCatalogMinProducts } from '../lib/dataLab/demoCatalogMinimum.js';

let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function hasHomepageMarketing(settings, category, domain) {
  const pageSections = getActivePageSections(settings?.pageSections);
  if (pageSections.length >= 2) return { kind: 'pageSections', count: pageSections.length };

  const canonical = resolveDomainKey(category);
  if (supportsFashionGulSections(canonical)) {
    const homeEdit = resolveFashionHomeEdit(settings, category, domain, `/store/${domain}`);
    const saleMosaic = resolveFashionSaleMosaic(settings, category, domain, `/store/${domain}`);
    const tiles = (homeEdit?.tiles?.length ?? 0) + (saleMosaic?.columns?.length ?? 0);
    const promo = settings?.storefront?.fashion?.promoBanners?.length ?? 0;
    if (tiles + promo >= 2) return { kind: 'fashion', count: tiles + promo };
  }

  if (resolveDomainKey(category) === 'restaurant-cafe') {
    const cfg = getRestaurantConfig(settings, domain);
    const flags = [
      cfg.showCuisineCarousel,
      cfg.showSuperPicks,
      cfg.showOrderModes,
      cfg.showDeliveryInfo,
    ].filter(Boolean).length;
    if (flags >= 2) return { kind: 'restaurant', count: flags };
  }

  if (isFitnessElevatedStore(category)) {
    const banners = settings?.storefront?.fitness?.promoBanners?.length ?? 0;
    if (banners >= 1) return { kind: 'fitness', count: banners };
  }

  if (pageSections.length >= 1) return { kind: 'pageSections', count: pageSections.length };
  return null;
}

const pool = createPool();
const client = await pool.connect();
try {
  const domains = ALL_DEMO_SEEDS.map((s) => s.domain.toLowerCase());
  const res = await client.query(
    `
    SELECT b.id, b.domain, b.category, b.is_active, bs.settings,
           COALESCE(bs.is_storefront_enabled, true) AS storefront_enabled,
           (SELECT COUNT(*)::int FROM products p
            WHERE p.business_id = b.id AND (p.is_deleted = false OR p.is_deleted IS NULL)) AS products,
           (SELECT COUNT(*)::int FROM products p
            WHERE p.business_id = b.id AND (p.is_deleted = false OR p.is_deleted IS NULL)
              AND image_url IS NOT NULL AND TRIM(image_url) <> '') AS with_images
    FROM businesses b
    LEFT JOIN business_settings bs ON bs.business_id = b.id
    WHERE LOWER(b.domain) = ANY($1::text[])
    ORDER BY b.domain
    `,
    [domains]
  );

  const byDomain = new Map(res.rows.map((r) => [String(r.domain).toLowerCase(), r]));

  for (const spec of ALL_DEMO_SEEDS) {
    const row = byDomain.get(spec.domain.toLowerCase());
    if (!row) {
      fail(`${spec.domain}: missing — run bun run data-lab:ensure-demos --only ${spec.domain}`);
      continue;
    }

    const settings = row.settings || {};
    const products = Number(row.products ?? 0);
    const withImages = Number(row.with_images ?? 0);
    const minProducts = resolveDemoCatalogMinProducts(spec);

    if (row.is_active === false) fail(`${spec.domain}: business inactive`);
    if (row.storefront_enabled === false) fail(`${spec.domain}: storefront disabled`);
    if (resolveDomainKey(row.category) !== resolveDomainKey(spec.key)) {
      fail(`${spec.domain}: category ${row.category} != ${spec.key}`);
    }
    if (products < minProducts) {
      fail(`${spec.domain}: expected ${minProducts}+ products, got ${products}`);
    } else if (withImages < Math.min(3, minProducts)) {
      fail(`${spec.domain}: expected catalog images, got ${withImages}/${products}`);
    } else {
      ok(`${spec.domain}: ${products} products (${withImages} imaged)`);
    }

    const marketing = hasHomepageMarketing(settings, row.category, spec.domain);
    if (!marketing) {
      fail(`${spec.domain}: no homepage sections/banners — run data-lab:ensure-demos`);
    } else {
      ok(`${spec.domain}: homepage content via ${marketing.kind} (${marketing.count})`);
    }
  }

  for (const demo of FEATURED_DEMO_STORES) {
    const row = byDomain.get(demo.domain.toLowerCase());
    if (!row) continue;
    const placements = new Set(getActivePageSections(row.settings?.pageSections).map((s) => s.placement));
    const hasFashion = supportsFashionGulSections(resolveDomainKey(row.category));
    const hasRestaurant = resolveDomainKey(row.category) === 'restaurant-cafe';
    const hasElevated =
      hasFashion ||
      hasRestaurant ||
      isFitnessElevatedStore(row.category) ||
      isPharmacyElevatedStore(row.category) ||
      isSupermarketElevatedStore(row.category);

    if (!hasElevated && placements.size < 2) {
      fail(`${demo.domain}: featured demo needs 2+ pageSection placements, got ${placements.size}`);
    } else if (!hasElevated) {
      ok(`${demo.domain}: pageSections placements ${[...placements].join(', ')}`);
    }
  }
} finally {
  client.release();
  await pool.end();
}

if (failed > 0) {
  console.error(`\nverify:demo-storefront-sections FAILED (${failed} issue(s))`);
  process.exit(1);
}

console.log('\nverify:demo-storefront-sections passed');
