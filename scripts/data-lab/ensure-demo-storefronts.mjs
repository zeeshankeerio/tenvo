#!/usr/bin/env node
/**
 * Idempotent demo storefront repair — creates missing demo-* businesses without purging data.
 *
 * Usage:
 *   npx tsx scripts/data-lab/ensure-demo-storefronts.mjs
 *   npx tsx scripts/data-lab/ensure-demo-storefronts.mjs --owner you@tenvo.store
 *   npx tsx scripts/data-lab/ensure-demo-storefronts.mjs --only demo-restaurant,demo-fitness
 *   npx tsx scripts/data-lab/ensure-demo-storefronts.mjs --refresh-catalog
 *
 * Env: DEMO_SEED_OWNER_EMAIL, PLATFORM_OWNER_EMAILS, DATABASE_URL
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../../lib/dataLab/pool.mjs';
import { resolveDomainKey } from '../../lib/config/domainKeyAliases.js';
import { ALL_DEMO_SEEDS } from '../../lib/dataLab/domains.mjs';
import { FEATURED_DEMO_STORES } from '../../lib/marketing/demoStores.js';
import { bootstrapDemoBusiness } from '../../lib/dataLab/bootstrapBusiness.mjs';
import { seedOperationalData } from '../../lib/dataLab/seedOperations.mjs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();

function resolveDefaultOwnerEmail() {
  const candidates = [
    process.env.DEMO_SEED_OWNER_EMAIL,
    process.env.PLATFORM_OWNER_EMAIL,
    ...(process.env.PLATFORM_OWNER_EMAILS || '').split(','),
    ...(process.env.PLATFORM_OWNER_EMAIL_EXTRA || '').split(','),
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  return candidates[0] || null;
}

function parseArgs(argv) {
  const ownerIdx = argv.indexOf('--owner');
  const onlyIdx = argv.indexOf('--only');
  const onlyRaw = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
  return {
    ownerEmail: ownerIdx >= 0 ? argv[ownerIdx + 1] : resolveDefaultOwnerEmail(),
    onlyFilters: onlyRaw
      ? onlyRaw.split(',').map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
      : [],
    refreshCatalog: argv.includes('--refresh-catalog'),
    skipOps: argv.includes('--catalog-only'),
    dryRun: argv.includes('--dry-run'),
  };
}

async function resolveOwner(pool, emailHint) {
  const client = await pool.connect();
  try {
    if (emailHint) {
      const r = await client.query('SELECT id, email, name FROM "user" WHERE LOWER(email) = LOWER($1) LIMIT 1', [
        emailHint,
      ]);
      if (!r.rows[0]) throw new Error(`User not found: ${emailHint}. Register first or pass --owner email`);
      return r.rows[0];
    }
    const r = await client.query('SELECT id, email, name FROM "user" ORDER BY "createdAt" ASC LIMIT 1');
    if (!r.rows[0]) throw new Error('No users in database. Register an account first.');
    return r.rows[0];
  } finally {
    client.release();
  }
}

function filterSeeds(seeds, onlyFilters) {
  if (!onlyFilters.length) return seeds;
  const keys = new Set(onlyFilters.flatMap((f) => [f, resolveDomainKey(f)].filter(Boolean)));
  return seeds.filter(
    (s) =>
      keys.has(String(s.key).toLowerCase()) ||
      keys.has(String(s.domain).toLowerCase()) ||
      keys.has(resolveDomainKey(s.key))
  );
}

async function auditDemos(pool) {
  const client = await pool.connect();
  try {
    const domains = ALL_DEMO_SEEDS.map((s) => s.domain);
    const r = await client.query(
      `
      SELECT b.domain, b.category, b.is_active,
             COALESCE(bs.is_storefront_enabled, true) AS storefront_enabled,
             (SELECT COUNT(*)::int FROM products p
              WHERE p.business_id = b.id AND (p.is_deleted = false OR p.is_deleted IS NULL)) AS products
      FROM businesses b
      LEFT JOIN business_settings bs ON bs.business_id = b.id
      WHERE LOWER(b.domain) = ANY($1::text[])
      ORDER BY b.domain
      `,
      [domains.map((d) => d.toLowerCase())]
    );
    const byDomain = new Map(r.rows.map((row) => [String(row.domain).toLowerCase(), row]));
    return ALL_DEMO_SEEDS.map((spec) => {
      const row = byDomain.get(spec.domain.toLowerCase());
      const canonical = resolveDomainKey(spec.key);
      return {
        spec,
        canonical,
        exists: Boolean(row),
        category: row?.category || null,
        categoryOk: row ? resolveDomainKey(row.category) === canonical : false,
        active: row?.is_active !== false,
        storefrontEnabled: row?.storefront_enabled !== false,
        products: Number(row?.products ?? 0),
      };
    });
  } finally {
    client.release();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pool = createPool();

  console.log('\n🔧 Tenvo — Ensure demo storefronts');
  console.log('═'.repeat(60));

  const owner = await resolveOwner(pool, opts.ownerEmail);
  console.log(`Owner: ${owner.name} <${owner.email}>`);

  const before = await auditDemos(pool);
  const missing = before.filter((r) => !r.exists);
  const needsRepair = before.filter(
    (r) =>
      r.exists &&
      (!r.categoryOk || !r.active || !r.storefrontEnabled || (r.spec.fullSeed !== false && r.products < 1))
  );

  console.log(`\nAudit: ${before.length} curated demos — ${missing.length} missing, ${needsRepair.length} need repair`);

  for (const row of before.filter((r) => r.exists)) {
    const flags = [
      row.categoryOk ? 'category ok' : `category=${row.category}`,
      row.active ? 'active' : 'inactive',
      row.storefrontEnabled ? 'storefront on' : 'storefront off',
      `${row.products} products`,
    ].join(' · ');
    console.log(`  ${row.spec.domain}: ${flags}`);
  }

  for (const row of missing) {
    console.log(`  ${row.spec.domain}: MISSING`);
  }

  const seedsToBootstrap = filterSeeds(
    ALL_DEMO_SEEDS.filter((spec) => {
      const audit = before.find((r) => r.spec.domain === spec.domain);
      if (!audit?.exists) return true;
      if (needsRepair.some((r) => r.spec.domain === spec.domain)) return true;
      // Scoped catalog refresh: --only demo-restaurant --refresh-catalog
      if (opts.refreshCatalog && opts.onlyFilters.length) return true;
      return false;
    }),
    opts.onlyFilters
  );

  if (!seedsToBootstrap.length) {
    console.log('\n✅ All demo storefronts present. Nothing to bootstrap.');
    await pool.end();
    return;
  }

  if (opts.refreshCatalog && opts.onlyFilters.length) {
    console.log(`\nRefreshing catalog for: ${seedsToBootstrap.map((s) => s.domain).join(', ')}`);
  }

  if (opts.dryRun) {
    console.log(`\nDry run — would bootstrap: ${seedsToBootstrap.map((s) => s.domain).join(', ')}`);
    await pool.end();
    return;
  }

  console.log(`\nBootstrapping ${seedsToBootstrap.length} demo(s)…`);
  const results = [];
  for (const spec of seedsToBootstrap) {
    const boot = await bootstrapDemoBusiness({
      userId: owner.id,
      ownerEmail: owner.email,
      domainKey: spec.key,
      businessName: spec.name,
      domainHandle: spec.domain,
      country: spec.country,
      planTier: 'enterprise',
      refreshCatalog: opts.refreshCatalog || !before.find((r) => r.spec.domain === spec.domain)?.exists,
    });
    results.push({ ...spec, ...boot });
    console.log(
      `  ${boot.created ? '✅ Created' : '↩️  Repaired'} ${spec.domain} (${resolveDomainKey(spec.key)}) — ${boot.productCount ?? '?'} products`
    );

    if (!opts.skipOps && spec.fullSeed !== false && boot.businessId) {
      const stats = await seedOperationalData({ businessId: boot.businessId, userId: owner.id });
      console.log(
        `     ops: inv=${stats.invoices} pos=${stats.posTransactions ?? stats.pos_tx ?? '—'} orders=${stats.storefrontOrders ?? '—'}`
      );
    }
  }

  const after = await auditDemos(pool);
  const stillMissing = after.filter((r) => !r.exists);
  const featuredMissing = FEATURED_DEMO_STORES.filter(
    (s) => !after.find((r) => r.spec.domain === s.domain && r.exists && r.storefrontEnabled)
  );

  await pool.end();

  console.log('\n' + '═'.repeat(60));
  if (stillMissing.length) {
    console.error(`❌ Still missing: ${stillMissing.map((r) => r.spec.domain).join(', ')}`);
    process.exit(1);
  }
  if (featuredMissing.length) {
    console.error(`❌ Featured demos not storefront-ready: ${featuredMissing.map((s) => s.domain).join(', ')}`);
    process.exit(1);
  }
  console.log('✅ Demo storefront ensure complete.');
  console.log(`Featured stores: ${FEATURED_DEMO_STORES.map((s) => `/store/${s.domain}`).join(', ')}\n`);
}

main().catch((err) => {
  console.error('\n❌ Ensure failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
