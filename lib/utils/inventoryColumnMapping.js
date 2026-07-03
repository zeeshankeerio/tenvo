/**
 * Intelligent inventory column mapping (pure, dependency-free).
 *
 * Shared by Excel/CSV file import (`excelImportService`) and the Excel-mode Smart Paste
 * so a business owner can upload or paste a sheet with their own column names and have
 * the columns auto-mapped to canonical product fields. Kept free of `xlsx` so client
 * grids can use it without bundling the parser.
 */

/** Canonical product field -> list of header synonyms a business owner might use. */
export const COLUMN_SYNONYMS = {
  name: ['name', 'product name', 'item', 'item name', 'product', 'description', 'item description', 'title', 'product title', 'particulars', 'goods', 'article name', 'product description', 'item desc'],
  sku: ['sku', 'sku code', 'item code', 'product code', 'code', 'article', 'article no', 'article number', 'part number', 'part no', 'item id', 'product id', 'stock code', 'item no', 'itemcode'],
  barcode: ['barcode', 'bar code', 'ean', 'ean13', 'upc', 'gtin', 'qr code', 'scan code'],
  price: ['price', 'selling price', 'sale price', 'unit price', 'retail price', 'rate', 'sell price', 'list price', 'sales price', 'price per unit', 'unit rate', 'sales rate', 'selling rate'],
  cost_price: ['cost', 'cost price', 'purchase price', 'buy price', 'buying price', 'wholesale price', 'landed cost', 'unit cost', 'purchase rate', 'cost rate', 'purchase cost'],
  mrp: ['mrp', 'maximum retail price', 'max retail price', 'printed price', 'label price', 'marked price'],
  stock: ['stock', 'quantity', 'qty', 'stock qty', 'available', 'available qty', 'on hand', 'in stock', 'opening stock', 'opening qty', 'current stock', 'balance', 'units', 'count', 'stock quantity', 'inventory', 'available quantity', 'closing stock'],
  min_stock: ['min stock', 'minimum stock', 'min qty', 'minimum quantity', 'safety stock', 'min level', 'low stock', 'low stock level', 'minimum level'],
  reorder_point: ['reorder point', 'reorder level', 'reorder', 'reorder qty', 'reorder quantity'],
  category: ['category', 'product group', 'group', 'product type', 'department', 'class', 'subcategory', 'sub category', 'item group'],
  brand: ['brand', 'make', 'manufacturer', 'company', 'brand name'],
  unit: ['unit', 'uom', 'unit of measure', 'measure', 'packing', 'pack size'],
  tax_percent: ['tax', 'tax percent', 'tax %', 'gst', 'gst %', 'gst percent', 'vat', 'vat %', 'tax rate', 'sales tax', 'gst rate'],
  hsn_code: ['hsn', 'hsn code', 'sac', 'sac code', 'hsn/sac', 'hsnsac'],
  batch_number: ['batch', 'batch number', 'batch no', 'lot', 'lot number', 'lot no'],
  expiry_date: ['expiry', 'expiry date', 'exp date', 'exp', 'expires', 'best before', 'use by', 'expiration', 'expiration date'],
  manufacturing_date: ['manufacturing date', 'mfg date', 'mfg', 'mfd', 'made on', 'production date', 'manufactured date'],
  serial_number: ['serial', 'serial number', 'serial no', 'imei', 'serialno'],
};

const CANONICAL_FIELD_ORDER = Object.keys(COLUMN_SYNONYMS);

/** Numeric canonical fields — used by callers to coerce mapped values. */
export const NUMERIC_CANONICAL_FIELDS = new Set([
  'price', 'cost_price', 'mrp', 'stock', 'min_stock', 'reorder_point', 'tax_percent',
]);

/** Lowercase + strip everything except a-z0-9 so "Selling Price (PKR)" == "sellingpricepkr". */
export function normalizeHeader(header) {
  return String(header ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Intelligently map arbitrary spreadsheet headers to canonical product fields.
 * Uses exact-normalized, prefix, and substring matching with a global greedy assignment
 * so each header and each canonical field is used at most once.
 * @param {string[]} headers - Header cell labels from the uploaded sheet
 * @returns {Record<string,string>} canonical field -> source header label
 */
export function detectColumnMapping(headers = []) {
  const normHeaders = headers
    .map((raw) => ({ raw, norm: normalizeHeader(raw) }))
    .filter((h) => h.norm);

  const candidates = [];
  CANONICAL_FIELD_ORDER.forEach((field, fieldIdx) => {
    const synonyms = COLUMN_SYNONYMS[field].map(normalizeHeader);
    normHeaders.forEach((h) => {
      let best = 0;
      synonyms.forEach((syn) => {
        if (!syn) return;
        if (h.norm === syn) {
          best = Math.max(best, 100 + syn.length);
        } else if (syn.length >= 4 && (h.norm.startsWith(syn) || syn.startsWith(h.norm))) {
          best = Math.max(best, 60 + syn.length);
        } else if (syn.length >= 4 && h.norm.includes(syn)) {
          best = Math.max(best, 40 + syn.length);
        } else if (syn.length >= 4 && h.norm.length >= 4 && syn.includes(h.norm)) {
          best = Math.max(best, 30 + h.norm.length);
        }
      });
      if (best > 0) candidates.push({ field, fieldIdx, header: h.raw, score: best });
    });
  });

  candidates.sort((a, b) => b.score - a.score || a.fieldIdx - b.fieldIdx);

  const mapping = {};
  const usedHeaders = new Set();
  const usedFields = new Set();
  for (const c of candidates) {
    if (usedFields.has(c.field) || usedHeaders.has(c.header)) continue;
    mapping[c.field] = c.header;
    usedFields.add(c.field);
    usedHeaders.add(c.header);
  }
  return mapping;
}

/** Project a raw sheet row onto canonical field keys using a mapping from detectColumnMapping. */
export function applyColumnMapping(row, mapping = {}) {
  const out = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (header != null && row[header] !== undefined) out[field] = row[header];
  }
  return out;
}

/** Lenient numeric parse: strips currency symbols, thousands separators and stray text. */
export function parseImportNumber(val) {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '').replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
  return parseFloat(cleaned);
}
