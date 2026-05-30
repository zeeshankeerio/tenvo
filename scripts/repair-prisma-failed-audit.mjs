/**
 * Repair Prisma P3009 for failed migration `20260517_audit_fixes`.
 *
 * 1) Marks the migration as rolled back in _prisma_migrations (does not undo applied SQL).
 * 2) Runs `bun run db:migrate` (`prisma migrate deploy`) so Prisma can re-apply the fixed migration file.
 *
 * Usage (from repo root, with .env / .env.local containing DATABASE_URL or DIRECT_URL):
 *   CONFIRM_REPAIR=1 bun run db:repair:failed-audit
 * PowerShell: $env:CONFIRM_REPAIR="1"; bun run db:repair:failed-audit
 *
 * Dry run (prints commands only):
 *   bun run db:repair:failed-audit -- --dry-run
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

const root = process.cwd();
const envPath = path.join(root, '.env');
const localPath = path.join(root, '.env.local');
if (existsSync(envPath)) dotenv.config({ path: envPath });
if (existsSync(localPath)) dotenv.config({ path: localPath, override: true });

const dry = process.argv.includes('--dry-run');

function run(label, cmd, args) {
  console.log(`\n→ ${label}\n  ${cmd} ${args.join(' ')}`);
  if (dry) return 0;
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
    shell: process.platform === 'win32',
  });
  return r.status ?? 1;
}

console.log('Prisma failed-migration repair: 20260517_audit_fixes (P3009)');
console.log('See: scripts/migrations/README.md');

if (dry) {
  console.log('\n[dry-run] Set CONFIRM_REPAIR=1 to execute.');
  process.exit(0);
}

if (process.env.CONFIRM_REPAIR !== '1') {
  console.log(`
Set CONFIRM_REPAIR=1 to run (mutates _prisma_migrations, then migrate deploy).

  CONFIRM_REPAIR=1 bun run db:repair:failed-audit

Or run manually:

  bunx prisma migrate resolve --rolled-back "20260517_audit_fixes"
  bun run db:migrate
`);
  process.exit(0);
}

let code = run(
  'Mark failed migration as rolled back',
  'bunx',
  ['prisma', 'migrate', 'resolve', '--rolled-back', '20260517_audit_fixes']
);
if (code !== 0) process.exit(code);

code = run('Apply pending migrations', 'bun', ['run', 'db:migrate']);
process.exit(code ?? 0);
