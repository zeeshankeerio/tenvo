#!/usr/bin/env node
/**
 * Purge all business/tenant data. Auth users are preserved.
 *
 * Usage:
 *   node scripts/data-lab/purge-business-data.mjs --confirm PURGE_ALL_BUSINESS_DATA
 *   node scripts/data-lab/purge-business-data.mjs --confirm PURGE_ALL_BUSINESS_DATA --keep demo-textile,demo-retail
 */
import { purgeAllBusinessData } from '../../lib/dataLab/purge.mjs';

function parseArgs(argv) {
  const confirmIdx = argv.indexOf('--confirm');
  const confirm = confirmIdx >= 0 ? argv[confirmIdx + 1] : null;
  const keepIdx = argv.indexOf('--keep');
  const keepDomains =
    keepIdx >= 0
      ? argv[keepIdx + 1]
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
  return { confirm, keepDomains };
}

async function main() {
  const { confirm, keepDomains } = parseArgs(process.argv.slice(2));

  console.log('\n⚠️  Tenvo Data Lab — Purge business data');
  console.log('═'.repeat(60));
  console.log('Preserves: user, session, account, verification, twoFactor');
  console.log('Deletes:   all businesses (+ cascaded tenant rows)\n');

  if (confirm !== 'PURGE_ALL_BUSINESS_DATA') {
    console.error('Aborted. Re-run with: --confirm PURGE_ALL_BUSINESS_DATA');
    process.exit(1);
  }

  const result = await purgeAllBusinessData({
    confirm: true,
    keepDomains: keepDomains.length ? keepDomains : undefined,
  });

  console.log('\n✅ Purge complete.', result);
}

main().catch((err) => {
  console.error('\n❌ Purge failed:', err.message);
  process.exit(1);
});
