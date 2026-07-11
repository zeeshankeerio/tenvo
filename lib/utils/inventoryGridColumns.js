/**
 * Shared inventory grid column builder for Visual, Busy, and Excel modes.
 * Uses consistent `domain_data.{key}` accessors and readGridCellValue for reads.
 */

import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import {
  readDomainFieldValue,
  resolveDomainFieldKey,
  normalizeKey,
  isManufacturingEnabled,
} from '@/lib/utils/domainHelpers';
import { resolveInventoryDomainFeatures } from '@/lib/utils/inventoryDomainFeatures';

function resolveGridKnowledge(category, options = {}) {
  if (options.domainKnowledge?.productFields || options.domainKnowledge?.batchTrackingEnabled != null) {
    return options.domainKnowledge;
  }
  if (options.countryIso) {
    return getDomainKnowledge(category, { countryIso: options.countryIso });
  }
  if (options.business) {
    return getDomainKnowledgeForBusiness(category, options.business);
  }
  return getDomainKnowledge(category);
}

const STANDARD_SKIP_IN_DOMAIN = new Set([
  'name',
  'price',
  'stock',
  'category',
  'sku',
  'barcode',
  'expiry_date',
  'batch_number',
  'manufacturing_date',
  'brand',
  'images',
]);

/** Normalize cell values for display / edit (Decimals, empty). */
function normalizeCellOutput(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && typeof raw.toNumber === 'function') {
    const n = raw.toNumber();
    return Number.isFinite(n) ? n : '';
  }
  return raw;
}

/**
 * Read a grid cell value using accessorKey (supports domain_data.* dot paths).
 */
export function readGridCellValue(row, accessorKey, category) {
  if (!row || !accessorKey) return '';

  if (accessorKey.startsWith('domain_data.')) {
    const fieldKey = accessorKey.slice('domain_data.'.length);
    if (fieldKey === 'unitcost') {
      const v =
        row?.domain_data?.unitcost ??
        row?.domain_data?.unitCost ??
        row?.cost_price;
      return normalizeCellOutput(v);
    }
    return normalizeCellOutput(readDomainFieldValue(row.domain_data, fieldKey, category));
  }

  if (accessorKey.includes('.')) {
    const raw = accessorKey.split('.').reduce((o, i) => (o ? o[i] : undefined), row);
    return normalizeCellOutput(raw);
  }

  const knowledge = resolveGridKnowledge(category);
  const isDomain = knowledge?.productFields?.some(
    (f) => resolveDomainFieldKey(f, category) === accessorKey || normalizeKey(f) === accessorKey
  );
  if (isDomain) {
    if (accessorKey === 'unitcost') {
      const v =
        row?.domain_data?.unitcost ??
        row?.domain_data?.unitCost ??
        row?.cost_price;
      return normalizeCellOutput(v);
    }
    return normalizeCellOutput(readDomainFieldValue(row.domain_data, accessorKey, category));
  }

  return normalizeCellOutput(row[accessorKey]);
}

/** Domain-specific columns with canonical domain_data accessors. */
export function buildDomainDataColumns(category, mode = 'busy', options = {}) {
  const knowledge = resolveGridKnowledge(category, options);
  const productFields = knowledge?.productFields || [];

  return productFields
    .filter((field) => {
      const key = resolveDomainFieldKey(field, category);
      return !STANDARD_SKIP_IN_DOMAIN.has(key);
    })
    .map((field) => {
      const attrKey = resolveDomainFieldKey(field, category);
      const header =
        mode === 'visual'
          ? field.replace(/_/g, ' ').toUpperCase()
          : field;
      return {
        id: `domain_${attrKey}`,
        accessorKey: `domain_data.${attrKey}`,
        header,
        width: mode === 'visual' ? (field.length > 15 ? 108 : 96) : field.length > 15 ? 150 : 120,
        size: mode === 'visual' ? 96 : 120,
        minSize: mode === 'visual' ? 80 : 100,
      };
    });
}

/**
 * Build inventory grid columns for visual | busy | excel modes.
 * Visual mode returns metadata; callers attach rich React cell renderers.
 */
export function buildInventoryGridColumns(category, options = {}) {
  const { mode = 'busy', currencySymbol = '₨', domainKnowledge } = options;
  const features = resolveInventoryDomainFeatures(category, options);

  const standardCols = [
    {
      id: 'name',
      accessorKey: 'name',
      header: mode === 'visual' ? 'PRODUCT NAME' : 'Product Name',
      width: mode === 'busy' ? 200 : 200,
      size: mode === 'visual' ? 200 : 200,
      minSize: mode === 'visual' ? 160 : undefined,
      flexGrow: mode === 'busy' ? 1 : undefined,
    },
    {
      id: 'sku',
      accessorKey: 'sku',
      header: mode === 'visual' ? 'SKU' : 'SKU',
      width: mode === 'visual' ? 88 : 100,
      size: mode === 'visual' ? 88 : 110,
      minSize: mode === 'visual' ? 72 : 90,
    },
    ...(mode !== 'visual'
      ? [
          {
            id: 'barcode',
            accessorKey: 'barcode',
            header: 'Barcode',
            width: 110,
            size: 120,
            minSize: 100,
          },
          {
            id: 'brand',
            accessorKey: 'brand',
            header: 'Brand',
            width: 120,
            size: 130,
            minSize: 110,
          },
        ]
      : []),
    {
      id: 'category',
      accessorKey: 'category',
      header: mode === 'visual' ? 'CATEGORY' : 'Category',
      width: mode === 'visual' ? 96 : 100,
      size: mode === 'visual' ? 96 : 130,
      minSize: mode === 'visual' ? 80 : 110,
    },
    ...(mode !== 'visual'
      ? [
          {
            id: 'unit',
            accessorKey: 'unit',
            header: 'Unit',
            width: 70,
            size: 80,
            minSize: 60,
          },
        ]
      : []),
    {
      id: 'stock',
      accessorKey: 'stock',
      header: mode === 'visual' ? 'STOCK' : 'Stock',
      width: mode === 'visual' ? 72 : 80,
      size: mode === 'visual' ? 72 : 90,
      minSize: mode === 'visual' ? 64 : 80,
    },
    {
      id: 'price',
      accessorKey: 'price',
      header: mode === 'visual' ? 'PRICE' : 'Price',
      width: mode === 'visual' ? 92 : 100,
      size: mode === 'visual' ? 92 : 110,
      minSize: mode === 'visual' ? 80 : 100,
    },
    {
      id: 'tax_percent',
      accessorKey: 'tax_percent',
      header: mode === 'visual' ? 'TAX %' : 'Tax %',
      width: mode === 'visual' ? 56 : 80,
      size: mode === 'visual' ? 56 : 80,
      minSize: mode === 'visual' ? 48 : 70,
    },
  ];

  const cols = [...standardCols];

  if (features.batchTrackingEnabled) {
    const isTextileWholesale = category === 'textile-wholesale' || category === 'textile';
    cols.push({
      id: 'batch_number',
      accessorKey: 'batch_number',
      header: isTextileWholesale
        ? (mode === 'visual' ? 'ROLL / BALE' : 'Roll / Bale #')
        : (mode === 'visual' ? 'BATCH' : 'Batch #'),
      width: 120,
      size: 130,
      minSize: 110,
    });
    if (mode === 'excel') {
      cols.push({
        id: 'batch_quantity',
        accessorKey: 'batch_quantity',
        header: isTextileWholesale ? 'Roll Qty' : 'Batch Qty',
        width: 100,
      });
    }
  }

  if (features.serialTrackingEnabled) {
    cols.push({
      id: mode === 'visual' ? 'serials' : 'serial_number',
      accessorKey: mode === 'visual' ? 'serial_numbers' : 'serial_number',
      header: mode === 'visual' ? 'SERIALS' : 'Serial #',
      width: mode === 'visual' ? 110 : 150,
      size: mode === 'visual' ? 110 : 150,
      minSize: 100,
      readOnly: mode === 'visual',
    });
  }

  if (features.manufacturingEnabled) {
    cols.push({
      id: 'mfg_date',
      accessorKey: 'manufacturing_date',
      header: mode === 'visual' ? 'MFG DATE' : 'Mfg Date',
      width: 100,
      size: 100,
      minSize: 90,
    });
  }

  if (features.expiryTrackingEnabled) {
    cols.push({
      id: 'expiry_date',
      accessorKey: 'expiry_date',
      header: mode === 'visual' ? 'EXPIRY' : 'Expiry',
      width: 100,
      size: 100,
      minSize: 90,
    });
  }

  cols.push(...buildDomainDataColumns(category, mode, { ...options, domainKnowledge: domainKnowledge || features.knowledge }));

  cols.push({
    id: 'value',
    accessorKey: 'value',
    header: mode === 'visual' ? 'VALUE' : 'Total Value',
    width: mode === 'visual' ? 96 : 130,
    size: mode === 'visual' ? 96 : 120,
    minSize: mode === 'visual' ? 84 : 110,
    readOnly: true,
    ...(mode === 'busy'
      ? {
          cell: ({ row }) => {
            const stock = Number(row.original?.stock) || 0;
            const price = Number(row.original?.price) || 0;
            const val = stock * price;
            return val ? `${currencySymbol}${val.toLocaleString()}` : `${currencySymbol}0`;
          },
        }
      : {}),
  });

  return cols;
}

/**
 * Excel-mode tracking column defs (batch/serial/expiry) merged on top of base columns.
 * Mirrors ExcelModeModal enhancedColumns tracking block.
 */
export function getExcelTrackingColumnDefs(category, options = {}) {
  const features = resolveInventoryDomainFeatures(category, options);
  const cols = [];
  const isTextileWholesale = category === 'textile-wholesale' || category === 'textile';

  if (features.batchTrackingEnabled) {
    cols.push(
      {
        id: 'batch_number',
        accessorKey: 'batch_number',
        header: isTextileWholesale ? 'Roll / Bale #' : 'Batch #',
        width: 120,
      },
      {
        id: 'batch_quantity',
        accessorKey: 'batch_quantity',
        header: isTextileWholesale ? 'Roll Qty' : 'Batch Qty',
        width: 100,
      },
    );
    if (features.expiryTrackingEnabled) {
      cols.push({ id: 'expiry_date', accessorKey: 'expiry_date', header: 'Expiry', width: 120 });
    }
    if (features.manufacturingEnabled || features.expiryTrackingEnabled) {
      cols.push({
        id: 'manufacturing_date',
        accessorKey: 'manufacturing_date',
        header: 'Mfg Date',
        width: 120,
      });
    }
  }

  if (features.serialTrackingEnabled) {
    cols.push({
      id: 'serial_number',
      accessorKey: 'serial_number',
      header: 'Serial #',
      width: 150,
    });
  }

  return cols;
}
