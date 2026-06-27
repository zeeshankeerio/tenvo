#!/usr/bin/env node
/**
 * Normalize hub/dashboard typography: font-black/extrabold → font-semibold,
 * bump unreadable 8–9px labels to 10px minimum.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKIP_DIR = /[\\/]node_modules[\\/]|[\\/]marketing[\\/]|[\\/]storefront[\\/]/;
const EXT = /\.(jsx|tsx|js|ts)$/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(full)) walk(full, files);
    } else if (EXT.test(entry.name) && !SKIP_DIR.test(full)) {
      files.push(full);
    }
  }
  return files;
}

function normalize(content) {
  return content
    .replace(/font-extrabold/g, 'font-semibold')
    .replace(/font-black/g, 'font-semibold')
    .replace(/text-\[8px\]/g, 'text-[10px]')
    .replace(/text-\[9px\]/g, 'text-[10px]');
}

const targets = [
  path.join(ROOT, 'app', 'business'),
  path.join(ROOT, 'components'),
];

let changed = 0;
for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  for (const file of walk(target)) {
    const before = fs.readFileSync(file, 'utf8');
    const after = normalize(before);
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed += 1;
    }
  }
}

console.log(`normalize-hub-typography: updated ${changed} files`);
