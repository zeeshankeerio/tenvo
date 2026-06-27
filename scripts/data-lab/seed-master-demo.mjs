#!/usr/bin/env node
/**
 * Master demo data feed — bootstrap businesses per domain + transactional depth.
 *
 * Usage:
 *   npx tsx scripts/data-lab/seed-master-demo.mjs
 *   npx tsx scripts/data-lab/seed-master-demo.mjs --owner you@example.com
 *   npx tsx scripts/data-lab/seed-master-demo.mjs --all-domains   # every vertical key
 *   bun run data-lab:seed-all
 *   npx tsx scripts/data-lab/seed-master-demo.mjs --only vehicle-dealership
 *   npx tsx scripts/data-lab/seed-master-demo.mjs --only demo-showroom
 *
 * Env: DEMO_SEED_OWNER_EMAIL, PLATFORM_OWNER_EMAILS (default owner), DATABASE_URL
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createPool } from '../../lib/dataLab/pool.mjs';
import { purgeAllBusinessData } from '../../lib/dataLab/purge.mjs';
import { resolveDomainKey } from '../../lib/config/domainKeyAliases.js';
import {
  ALL_DEMO_SEEDS,
  DEMO_BUSINESS_PACK,
  getCoveredDemoDomainKeys,
} from '../../lib/dataLab/domains.mjs';
import {
  bootstrapDemoBusiness,
  bootstrapMinimalDomainBusiness,
  DOMAIN_KNOWLEDGE_KEYS,
} from '../../lib/dataLab/bootstrapBusiness.mjs';
import { seedOperationalData } from '../../lib/dataLab/seedOperations.mjs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();

/** Prefer explicit demo owner, then platform owner list from env. */
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
  const ownerEmail = ownerIdx >= 0 ? argv[ownerIdx + 1] : resolveDefaultOwnerEmail();
  const onlyIdx = argv.indexOf('--only');
  const onlyRaw = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
  const onlyFilters = onlyRaw
    ? onlyRaw.split(',').map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    : [];
  return {
    ownerEmail,
    allDomains: argv.includes('--all-domains'),
    reset: argv.includes('--reset'),
    skipOps: argv.includes('--catalog-only'),
    refreshCatalog: argv.includes('--refresh-catalog') || argv.includes('--reset'),
    onlyFilters,
  };
}

function filterDemoSeeds(seeds, onlyFilters) {
  if (!onlyFilters.length) return seeds;
  const keys = new Set(
    onlyFilters.flatMap((f) => [f, resolveDomainKey(f)].filter(Boolean))
  );
  return seeds.filter(
    (s) =>
      keys.has(String(s.key).toLowerCase()) ||
      keys.has(String(s.domain).toLowerCase()) ||
      keys.has(resolveDomainKey(s.key))
  );
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pool = createPool();

  console.log('\n🌱 Tenvo Data Lab — Master demo seed');
  console.log('═'.repeat(60));

  if (opts.reset) {
    console.log('Step 1/3: Purging existing business data…');
    await purgeAllBusinessData({ confirm: true });
  }

  const owner = await resolveOwner(pool, opts.ownerEmail);
  console.log(`Owner: ${owner.name} <${owner.email}>`);

  const results = [];

  console.log('\nStep 2/3: Bootstrapping demo businesses…');
  const demoSeeds = filterDemoSeeds(ALL_DEMO_SEEDS, opts.onlyFilters);
  if (opts.onlyFilters.length && !demoSeeds.length) {
    throw new Error(`No demo seeds matched --only ${opts.onlyFilters.join(',')}`);
  }
  console.log(`  Pack: ${demoSeeds.length} demo(s) selected${opts.onlyFilters.length ? ` (--only ${opts.onlyFilters.join(',')})` : ''}`);
  for (const spec of demoSeeds) {
    const boot = await bootstrapDemoBusiness({
      userId: owner.id,
      ownerEmail: owner.email,
      domainKey: spec.key,
      businessName: spec.name,
      domainHandle: spec.domain,
      country: spec.country,
      planTier: 'enterprise',
      refreshCatalog: opts.refreshCatalog,
    });
    results.push({ ...spec, ...boot });
    console.log(
      `  ${boot.created ? '✅ Created' : '↩️  Exists'} ${spec.domain} (${spec.key}) — ${boot.productCount ?? '?'} products`
    );
  }

  if (opts.allDomains) {
    const covered = getCoveredDemoDomainKeys();
    const remaining = DOMAIN_KNOWLEDGE_KEYS.filter((k) => !covered.has(k));
    console.log(`\n  Adding ${remaining.length} minimal domain catalogs (--all-domains)…`);
    for (const key of remaining) {
      const boot = await bootstrapMinimalDomainBusiness({
        userId: owner.id,
        ownerEmail: owner.email,
        domainKey: key,
        country: 'Pakistan',
      });
      console.log(`  · ${boot.domain} (${key}) — ${boot.productCount ?? '?'} products`);
      results.push({ key, domain: boot.domain, businessId: boot.businessId, fullSeed: false });
    }
  }

  if (!opts.skipOps) {
    console.log('\nStep 3/3: Seeding operational data (invoices, POS, storefront, POs)…');
    for (const row of results.filter((r) => r.fullSeed !== false && r.businessId)) {
      const stats = await seedOperationalData({ businessId: row.businessId, userId: owner.id });
      console.log(
        `  ${row.domain}: wh=${stats.warehouses} batches=${stats.batches} inv=${stats.invoices} pay=${stats.invoicePayments} je=${stats.journals} hr=${stats.payrollEmployees} xfer=${stats.stockTransfers}`
      );
    }
  }

  await pool.end();

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Demo seed complete.\n');
  console.log(`Storefronts: ${ALL_DEMO_SEEDS.length} curated demos seeded (run with --all-domains for every vertical).`);
  console.log('Next: npx tsx scripts/data-lab/verify-demo-wiring.mjs');
  console.log('Hub:  /business/textile/demo-textile');
  console.log('Store: /store/demo-bakery, /store/demo-electronics, …\n');
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
