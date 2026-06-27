/**
 * Copy latin Open Sans woff2 files from @fontsource into public/fonts for next/font/local.
 * Run after upgrading @fontsource/open-sans: `bun run fonts:sync`
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', '@fontsource', 'open-sans', 'files');
const destDir = join(root, 'public', 'fonts', 'open-sans');

const weights = ['400', '500', '600', '700'];

mkdirSync(destDir, { recursive: true });

for (const weight of weights) {
  const name = `open-sans-latin-${weight}-normal.woff2`;
  copyFileSync(join(srcDir, name), join(destDir, name));
  console.log(`synced ${name}`);
}
