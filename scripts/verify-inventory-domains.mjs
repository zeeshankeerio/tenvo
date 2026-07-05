/**
 * Sanity-check: inventory grid columns, domain features, and row defaults for every vertical.
 * Run: bun run verify:inventory-domains
 */
import { DOMAIN_KNOWLEDGE_KEYS } from '../lib/domainKnowledge.js';
import { resolveInventoryDomainFeatures, buildInventoryDomainChips } from '../lib/utils/inventoryDomainFeatures.js';
import { buildInventoryGridColumns, getExcelTrackingColumnDefs } from '../lib/utils/inventoryGridColumns.js';
import { buildNewInventoryRow } from '../lib/utils/inventoryRowDefaults.js';
import { resolveDomainFieldKey } from '../lib/utils/domainHelpers.ts';

const MODES = ['visual', 'busy', 'excel'];

let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

for (const category of DOMAIN_KNOWLEDGE_KEYS) {
  const features = resolveInventoryDomainFeatures(category, { countryIso: 'PK' });

  if (!features.knowledge) {
    fail(`${category}: resolveInventoryDomainFeatures returned no knowledge`);
    continue;
  }

  if (!Array.isArray(features.productFields)) {
    fail(`${category}: productFields is not an array`);
  }

  if (!features.intelligence || typeof features.intelligence !== 'object') {
    fail(`${category}: missing intelligence object`);
  }

  for (const mode of MODES) {
    let cols;
    try {
      cols = buildInventoryGridColumns(category, {
        mode,
        countryIso: 'PK',
        domainKnowledge: features.knowledge,
      });
    } catch (err) {
      fail(`${category} mode=${mode}: buildInventoryGridColumns threw — ${err.message}`);
      continue;
    }

    if (!Array.isArray(cols) || cols.length < 5) {
      fail(`${category} mode=${mode}: expected >= 5 columns, got ${cols?.length ?? 0}`);
    }

    for (const field of features.productFields) {
      const key = resolveDomainFieldKey(field, category);
      const domainCol = cols.find((c) => c.id === `domain_${key}`);
      if (!domainCol) continue;
      if (!domainCol.accessorKey?.startsWith('domain_data.')) {
        fail(`${category} mode=${mode}: domain col ${domainCol.id} missing domain_data accessor`);
      }
    }
  }

  try {
    getExcelTrackingColumnDefs(category, { countryIso: 'PK', domainKnowledge: features.knowledge });
  } catch (err) {
    fail(`${category}: getExcelTrackingColumnDefs threw — ${err.message}`);
  }

  let row;
  try {
    row = buildNewInventoryRow(category, 'test-business-id', null, { countryIso: 'PK' });
  } catch (err) {
    fail(`${category}: buildNewInventoryRow threw — ${err.message}`);
    continue;
  }

  if (!row || typeof row.domain_data !== 'object') {
    fail(`${category}: buildNewInventoryRow missing domain_data`);
  }

  const sampleProduct = {
    id: 'sample',
    name: 'Sample',
    domain_data: Object.fromEntries(
      (features.productFields || []).slice(0, 2).map((f) => [resolveDomainFieldKey(f, category), 'test'])
    ),
  };

  try {
    buildInventoryDomainChips(category, sampleProduct, {
      domainKnowledge: features.knowledge,
      countryIso: 'PK',
    });
  } catch (err) {
    fail(`${category}: buildInventoryDomainChips threw — ${err.message}`);
  }
}

if (failed) process.exit(1);
console.log(`OK: inventory domain wiring for ${DOMAIN_KNOWLEDGE_KEYS.length} verticals.`);
