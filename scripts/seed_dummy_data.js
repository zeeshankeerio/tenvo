/**
 * @deprecated Use scripts/data-lab/seed-master-demo.mjs — this file contained hardcoded credentials.
 * Redirects operators to the data-lab toolchain.
 */
console.error(`
scripts/seed_dummy_data.js is deprecated and disabled.

Use the data lab instead:
  bun run data-lab:reset          # purge tenant data, seed demos, verify wiring
  bun run data-lab:purge          # remove all businesses (keeps users)
  bun run data-lab:seed           # bootstrap demo businesses + transactions
  bun run data-lab:verify         # tenancy + KPI checks

Set DEMO_SEED_OWNER_EMAIL in .env.local to target a specific owner account.
`);
process.exit(1);
