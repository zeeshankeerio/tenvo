import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const files = [
  'lib/dataLab/autoMarketplaceCatalog.js',
  'lib/dataLab/fashionDemoCatalog.js',
  'lib/dataLab/jewelleryDemoCatalog.js',
];

const BROKEN = /  \/\/,\s*(.+?),\s*\{\r?\n(\s+name:)/g;

for (const rel of files) {
  const file = path.join(ROOT, rel);
  let text = fs.readFileSync(file, 'utf8');
  const matches = [...text.matchAll(BROKEN)];
  const fixed = text.replace(BROKEN, '  // $1\r\n  {\r\n$2');
  if (fixed !== text) {
    fs.writeFileSync(file, fixed, 'utf8');
    console.log('fixed:', rel, 'sections:', matches.length);
  } else {
    console.log('no change:', rel, 'matches:', matches.length);
  }
}
