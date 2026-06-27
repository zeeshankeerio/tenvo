#!/usr/bin/env node
/**
 * Normalize em/en dashes in user-facing source (components + app).
 * Run: node scripts/normalize-copy-dashes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TARGET_DIRS = [
  'components',
  'app',
  'lib/email',
  'lib/storefront',
  'lib/dataLab',
  'lib/domainData',
  'lib/regionalMarket',
  'lib/hooks',
  'lib/actions',
  'lib/config',
  'lib/services',
];
const EXT = new Set(['.jsx', '.tsx', '.js', '.ts']);

function normalizeContent(text) {
  const lines = text.split(/\r?\n/);
  const out = lines.map((line) => {
    const trimmed = line.trimStart();
    // Preserve comment-only lines (avoid breaking section headers like // —— Section ——)
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return line;
    return line
      .replace(/'[\u2014\u2013]'/g, "'-'")
      .replace(/"[\u2014\u2013]"/g, '"-"')
      .replace(/\s*\u2014\s*/g, ', ')
      .replace(/(\d)\u2013(\d)/g, '$1-$2')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '-')
      .replace(/,\s*,+/g, ', ');
  });
  return out.join('\n');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, files);
    } else if (EXT.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const raw = fs.readFileSync(file, 'utf8');
    if (!/[\u2013\u2014]/.test(raw)) continue;
    const next = normalizeContent(raw);
    if (next !== raw) {
      fs.writeFileSync(file, next, 'utf8');
      changed += 1;
      console.log('updated:', path.relative(ROOT, file));
    }
  }
}

console.log(`Done. ${changed} file(s) updated.`);
