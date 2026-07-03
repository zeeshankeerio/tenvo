/**
 * Autocomplete suggestions for inventory grid fields.
 * Merges catalog values, domain fieldConfig options, and regional brand packs.
 */

import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { getBrandsForMarket } from '@/lib/regionalMarket/index.js';
import { resolveDomainFieldKey, normalizeKey } from '@/lib/utils/domainHelpers';
import { GARMENTS_SEED_CATEGORIES, TEXTILE_WHOLESALE_SEED_CATEGORIES } from '@/lib/dataLab/pakistanClothingSeedCatalog.js';
import { PK_CLOTHING_REGISTRATION_VERTICALS } from '@/lib/onboarding/registrationRichVerticals.js';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases.js';

const SUGGESTIBLE_SCALAR_KEYS = new Set([
  'name',
  'sku',
  'brand',
  'category',
  'barcode',
  'unit',
  'hsn_code',
  'sac_code',
  'location',
]);

export const PK_FABRIC_OPTIONS = [
  'Lawn',
  'Cotton',
  'Wash & Wear',
  'Chiffon',
  'Silk',
  'Khaddar',
  'Linen',
  'Jacquard',
  'Karandi',
  'Organza',
  'Velvet',
  'Denim',
];

export const PK_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

export const PK_SOURCING_OPTIONS = ['local', 'imported', 'Turkey', 'China', 'UAE', 'Lunda Bazaar'];

function uniqueStrings(values, limit = 80) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    if (raw == null) continue;
    const s = String(raw).trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

function collectFromProducts(products, picker) {
  if (!Array.isArray(products)) return [];
  return uniqueStrings(products.map(picker).filter(Boolean));
}

function domainFieldKeyFromAccessor(accessorKey) {
  if (!accessorKey) return null;
  if (accessorKey.startsWith('domain_data.')) {
    return accessorKey.slice('domain_data.'.length);
  }
  return null;
}

function resolveCategoryKnowledge(category, countryIso = 'PK') {
  return getDomainKnowledge(category, { countryIso });
}

function getDomainSelectOptions(category, fieldKey, countryIso) {
  const knowledge = resolveCategoryKnowledge(category, countryIso);
  const config =
    knowledge?.fieldConfig?.[fieldKey] ||
    knowledge?.fieldConfig?.[normalizeKey(fieldKey)];
  if (!config?.options) return [];
  return config.options.map((opt) =>
    typeof opt === 'object' && opt != null && 'value' in opt ? opt.value : opt
  );
}

function getPkClothingCategoryPresets(category, countryIso) {
  const canonical = resolveDomainKey(category);
  if (canonical === 'garments') return GARMENTS_SEED_CATEGORIES;
  if (canonical === 'textile-wholesale') return TEXTILE_WHOLESALE_SEED_CATEGORIES;
  if (PK_CLOTHING_REGISTRATION_VERTICALS.has(canonical)) {
    const knowledge = resolveCategoryKnowledge(category, countryIso);
    return knowledge?.setupTemplate?.categories || [];
  }
  return [];
}

/**
 * @param {string} accessorKey - Column accessorKey (supports domain_data.*)
 * @param {{ category: string, countryIso?: string, products?: Array, row?: Record<string, unknown> }} ctx
 * @returns {string[]}
 */
export function getInventoryFieldSuggestions(accessorKey, ctx = {}) {
  const { category, countryIso = 'PK', products = [], row } = ctx;
  const scalarKey = accessorKey?.includes('.')
    ? accessorKey.split('.').pop()
    : accessorKey;

  if (!scalarKey) return [];

  if (scalarKey === 'name') {
    return collectFromProducts(products, (p) => p.name);
  }

  if (scalarKey === 'sku') {
    return collectFromProducts(products, (p) => p.sku);
  }

  if (scalarKey === 'barcode') {
    return collectFromProducts(products, (p) => p.barcode);
  }

  if (scalarKey === 'brand') {
    const marketBrands = getBrandsForMarket(countryIso, category) || [];
    const knowledge = resolveCategoryKnowledge(category, countryIso);
    const popular = knowledge?.marketFeatures?.popularBrands || knowledge?.pakistaniFeatures?.popularBrands || [];
    const fromCatalog = collectFromProducts(products, (p) => p.brand);
    return uniqueStrings([...marketBrands, ...popular, ...fromCatalog]);
  }

  if (scalarKey === 'category') {
    const knowledge = resolveCategoryKnowledge(category, countryIso);
    const templateCats = knowledge?.setupTemplate?.categories || [];
    const fromCatalog = collectFromProducts(products, (p) => p.category);
    const pkPresets = countryIso === 'PK' ? getPkClothingCategoryPresets(category, countryIso) : [];
    return uniqueStrings([...pkPresets, ...templateCats, ...fromCatalog]);
  }

  if (scalarKey === 'unit') {
    const knowledge = resolveCategoryKnowledge(category, countryIso);
    const units = knowledge?.units || ['pcs'];
    const fromCatalog = collectFromProducts(products, (p) => p.unit);
    return uniqueStrings([...units, ...fromCatalog]);
  }

  const domainKey = domainFieldKeyFromAccessor(accessorKey) || scalarKey;
  const canonical = resolveDomainFieldKey(domainKey, category);
  const knowledge = resolveCategoryKnowledge(category, countryIso);
  const isDomainField = knowledge?.productFields?.some(
    (f) => resolveDomainFieldKey(f, category) === canonical
  );

  if (!isDomainField && !SUGGESTIBLE_SCALAR_KEYS.has(scalarKey)) {
    return [];
  }

  const configOptions = getDomainSelectOptions(category, canonical, countryIso);
  const fromRows = collectFromProducts(products, (p) => {
    const dd = p?.domain_data;
    if (!dd || typeof dd !== 'object') return null;
    return dd[canonical] ?? dd[normalizeKey(domainKey)];
  });

  if (canonical === 'fabrictype' || canonical === 'fabric') {
    const pkFabrics = countryIso === 'PK' ? PK_FABRIC_OPTIONS : [];
    return uniqueStrings([...configOptions, ...pkFabrics, ...fromRows]);
  }

  if (canonical === 'sizecolormatrix' || canonical === 'size') {
    const pkSizes = countryIso === 'PK' ? PK_SIZE_OPTIONS : [];
    return uniqueStrings([...pkSizes, ...configOptions, ...fromRows]);
  }

  if (canonical === 'sourcing') {
    const pkSourcing = countryIso === 'PK' ? PK_SOURCING_OPTIONS : [];
    return uniqueStrings([...pkSourcing, ...configOptions, ...fromRows]);
  }

  if (canonical === 'season') {
    return uniqueStrings(['Summer', 'Winter', 'Eid', 'Spring', 'Ramadan', ...configOptions, ...fromRows]);
  }

  if (canonical === 'stitchingstatus' || canonical === 'stitchingtype') {
    return uniqueStrings([
      'Unstitched',
      'Ready-to-Wear',
      'Custom Stitched',
      'Boutique Stitched',
      'Semi-Stitched',
      ...configOptions,
      ...fromRows,
    ]);
  }

  if (row?.domain_data?.[canonical] && !fromRows.length) {
    return uniqueStrings([...configOptions, row.domain_data[canonical]]);
  }

  return uniqueStrings([...configOptions, ...fromRows]);
}

/** Columns that should show browser autocomplete (datalist) in BusyGrid. */
export function isSuggestibleInventoryColumn(accessorKey) {
  if (!accessorKey || accessorKey === 'value' || accessorKey === 'is_active') return false;
  if (accessorKey.startsWith('domain_data.')) return true;
  return SUGGESTIBLE_SCALAR_KEYS.has(accessorKey);
}
