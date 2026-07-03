/**
 * Excel Import Service
 * Handles Excel file parsing, validation, and data transformation
 * CRITICAL: Production-ready Excel import for inventory system
 */

import * as XLSX from 'xlsx';
import {
  COLUMN_SYNONYMS,
  detectColumnMapping,
  applyColumnMapping,
  parseImportNumber as parseNumeric,
} from '@/lib/utils/inventoryColumnMapping';

// Re-export the pure column-mapping helpers so existing importers keep working.
export { COLUMN_SYNONYMS, detectColumnMapping, applyColumnMapping };

/**
 * Parse Excel file and extract sheets
 * @param {File} file - Excel file to parse
 * @returns {Promise<{success: boolean, sheets: Object, error?: string}>}
 */
export async function parseExcelFile(file) {
  try {
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      return { success: false, error: 'Invalid file format. Please upload .xlsx, .xls, or .csv' };
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large. Maximum 10MB allowed' };
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    // Extract all sheets
    const sheets = {};
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
      sheets[sheetName] = data;
    });

    return {
      success: true,
      sheets,
      fileName: file.name,
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    return { success: false, error: `Failed to parse file: ${error.message}` };
  }
}

/**
 * Validate imported row against schema.
 * @param {Object} row - Raw data row from Excel/CSV
 * @param {Object} existingProducts - Map of existing products by SKU
 * @param {string} category - Product category for domain validation
 * @param {Record<string,string>|null} columnMapping - Optional canonical->header map from detectColumnMapping.
 *   When provided, columns are read intelligently regardless of the sheet's header names.
 * @returns {Object} - {isValid: boolean, errors: Array, warnings: Array, cleaned: Object}
 */
export function validateImportRow(row, existingProducts = {}, category = 'retail-shop', columnMapping = null) {
  const errors = [];
  const warnings = [];
  const cleaned = {};

  // Resolve values via the intelligent mapping first, then fall back to conventional header names.
  const mapped = columnMapping ? applyColumnMapping(row, columnMapping) : {};
  const pick = (field, legacyKeys = []) => {
    if (mapped[field] !== undefined && mapped[field] !== '') return mapped[field];
    for (const key of legacyKeys) {
      if (row[key] !== undefined && row[key] !== '') return row[key];
    }
    return undefined;
  };

  // REQUIRED FIELDS
  const nameVal = pick('name', ['Name', 'name']);
  if (nameVal === undefined || String(nameVal).trim() === '') {
    errors.push('Product name is required');
  } else {
    cleaned.name = String(nameVal).trim();
  }

  // SKU
  const sku = String(pick('sku', ['SKU', 'sku']) ?? '').trim();
  if (sku) {
    if (existingProducts[sku] && !row.id) {
      warnings.push(`SKU "${sku}" already exists. Will update existing product.`);
    }
    cleaned.sku = sku;
  } else {
    warnings.push('SKU not provided. Will auto-generate.');
  }

  // PRICE
  const rawPrice = pick('price', ['Price', 'price']);
  if (rawPrice === undefined) {
    cleaned.price = 0;
    warnings.push('Price not provided. Setting to 0.');
  } else {
    const price = parseNumeric(rawPrice);
    if (isNaN(price) || price < 0) {
      errors.push(`Invalid price: "${rawPrice}". Must be a positive number.`);
    } else {
      cleaned.price = price;
      if (price === 0) warnings.push('Price is zero. This may be unintended.');
    }
  }

  // COST -> cost_price (matches products.cost_price column)
  const rawCost = pick('cost_price', ['Cost', 'cost', 'Cost Price', 'cost_price']);
  if (rawCost !== undefined) {
    const cost = parseNumeric(rawCost);
    if (isNaN(cost)) {
      warnings.push(`Invalid cost: "${rawCost}". Ignored.`);
    } else {
      cleaned.cost_price = Math.max(0, cost);
    }
  }

  // MRP
  const rawMrp = pick('mrp', ['MRP', 'mrp']);
  if (rawMrp !== undefined) {
    const mrp = parseNumeric(rawMrp);
    if (!isNaN(mrp) && mrp >= 0) cleaned.mrp = mrp;
  }

  // STOCK
  const rawStock = pick('stock', ['Stock', 'stock', 'Quantity', 'quantity', 'Qty', 'qty']);
  if (rawStock === undefined) {
    cleaned.stock = 0;
  } else {
    const stock = parseNumeric(rawStock);
    if (isNaN(stock) || stock < 0) {
      errors.push(`Invalid stock: "${rawStock}". Must be a non-negative number.`);
    } else {
      cleaned.stock = Math.floor(stock);
    }
  }

  // MIN STOCK -> min_stock (matches products.min_stock column)
  const rawMinStock = pick('min_stock', ['Min Stock', 'min_stock', 'minStock']);
  if (rawMinStock !== undefined) {
    const minStock = parseNumeric(rawMinStock);
    if (isNaN(minStock) || minStock < 0) {
      warnings.push('Invalid min stock. Ignored.');
    } else {
      cleaned.min_stock = Math.floor(minStock);
    }
  }

  // REORDER POINT
  const rawReorder = pick('reorder_point', ['Reorder Point', 'reorder_point']);
  if (rawReorder !== undefined) {
    const reorder = parseNumeric(rawReorder);
    if (!isNaN(reorder) && reorder >= 0) cleaned.reorder_point = Math.floor(reorder);
  }

  // TAX PERCENT
  const rawTax = pick('tax_percent', ['Tax', 'tax_percent', 'GST', 'gst']);
  if (rawTax !== undefined) {
    const tax = parseNumeric(rawTax);
    if (!isNaN(tax) && tax >= 0) cleaned.tax_percent = tax;
  }

  // OPTIONAL TEXT FIELDS
  const barcode = String(pick('barcode', ['Barcode', 'barcode']) ?? '').trim();
  if (barcode) cleaned.barcode = barcode;

  const categoryVal = String(pick('category', ['Category', 'category']) ?? '').trim();
  cleaned.category = categoryVal || category;

  const unitVal = String(pick('unit', ['Unit', 'unit']) ?? '').trim();
  if (unitVal) cleaned.unit = unitVal;

  const brandVal = String(pick('brand', ['Brand', 'brand']) ?? '').trim();
  if (brandVal) cleaned.brand = brandVal;

  const hsnVal = String(pick('hsn_code', ['HSN Code', 'hsn_code', 'HSN', 'hsn']) ?? '').trim();
  if (hsnVal) cleaned.hsn_code = hsnVal;

  // INLINE BATCH (for simple flat sheets)
  const batchNumber = pick('batch_number', ['Batch Number', 'batch_number']);
  if (batchNumber !== undefined && String(batchNumber).trim() !== '') {
    cleaned.batch_number = String(batchNumber).trim();
    cleaned.expiry_date = parseDateField(pick('expiry_date', ['Expiry Date', 'expiry_date'])) || null;
    cleaned.manufacturing_date = parseDateField(pick('manufacturing_date', ['Manufacturing Date', 'manufacturing_date'])) || null;
  }

  // INLINE SERIAL (for simple flat sheets)
  const serialNumber = pick('serial_number', ['Serial Number', 'serial_number']);
  if (serialNumber !== undefined && String(serialNumber).trim() !== '') {
    cleaned.serial_number = String(serialNumber).trim();
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleaned,
    originalRow: row
  };
}

/**
 * Parse date field flexibly
 * @param {string|Date} dateStr - Date string
 * @returns {string|null} - YYYY-MM-DD format or null
 */
function parseDateField(dateStr) {
  if (!dateStr) return null;

  if (dateStr instanceof Date) {
    return dateStr.toISOString().split('T')[0];
  }

  dateStr = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    if (parseInt(month) < 13) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Transform validated rows into product objects with Relational Data (Batches, Serials)
 * @param {Array} validatedRows - Output from validateImportRow
 * @param {string} businessId - Business ID
 * @param {Object} domainData - Domain-specific data template
 * @param {Object} allSheets - All sheets parsed from Excel to extract batches and serials
 * @returns {Array} - Array of product objects ready for DB insertion
 */
export function transformImportedData(validatedRows, businessId, domainData = {}, allSheets = {}) {
  const batchesSheet = allSheets['Batches'] || [];
  const serialsSheet = allSheets['Serials'] || [];

  return validatedRows
    .filter(row => row.isValid || row.errors.length === 0)
    .map((row, index) => {
      const sku = row.cleaned.sku;
      
      // Extract Relational Batches
      const productBatches = batchesSheet
        .filter(b => (b['Product SKU'] || b.sku) === sku)
        .map(b => ({
          batch_number: b['Batch Number'] || b.batch_number || b.Batch,
          quantity: Number(b.Quantity || b.quantity) || 0,
          manufacturing_date: parseDateField(b['Manufacturing Date'] || b.manufacturing_date),
          expiry_date: parseDateField(b['Expiry Date'] || b.expiry_date),
          notes: b.Notes || b.notes || null
        }));
      
      // Add inline batch if provided and not in the batches sheet
      if (row.cleaned.batch_number && productBatches.length === 0) {
        productBatches.push({
          batch_number: row.cleaned.batch_number,
          quantity: row.cleaned.stock,
          manufacturing_date: row.cleaned.manufacturing_date,
          expiry_date: row.cleaned.expiry_date
        });
      }

      // Extract Relational Serials
      const productSerials = serialsSheet
        .filter(s => (s['Product SKU'] || s.sku) === sku)
        .map(s => ({
          serial_number: s['Serial Number'] || s.serial_number || s.Serial,
          status: s.Status || s.status || 'in_stock',
          warranty_expiry: parseDateField(s['Warranty Expiry'] || s.warranty_expiry),
          notes: s.Notes || s.notes || null
        }));

      // Add inline serial if provided and not in the serials sheet
      if (row.cleaned.serial_number && productSerials.length === 0) {
        productSerials.push({
          serial_number: row.cleaned.serial_number,
          status: 'in_stock'
        });
      }

      return {
        ...row.cleaned,
        business_id: businessId,
        domain_data: domainData,
        import_source: 'excel',
        import_batch: new Date().toISOString(),
        _rowIndex: index + 1,
        batches: productBatches,
        serialNumbers: productSerials
      };
    });
}

/**
 * Detect duplicate products in import data
 * @param {Array} rows - Validated rows
 * @returns {Array} - Array of duplicate SKU groups
 */
export function detectDuplicates(rows) {
  const skuMap = {};
  const duplicates = [];

  rows.forEach((row, index) => {
    const sku = row.cleaned.sku;
    if (sku) {
      if (!skuMap[sku]) {
        skuMap[sku] = [];
      }
      skuMap[sku].push({ rowIndex: index + 1, ...row.cleaned });
    }
  });

  Object.entries(skuMap).forEach(([sku, items]) => {
    if (items.length > 1) {
      duplicates.push({
        sku,
        count: items.length,
        rows: items
      });
    }
  });

  return duplicates;
}

/**
 * Auto-generate SKU from product name
 * @param {string} name - Product name
 * @param {number} index - Row index for uniqueness
 * @returns {string} - Generated SKU
 */
export function generateSkuFromName(name, index = 0) {
  if (!name) return `AUTO-${index}`;

  const words = name.trim().split(/\s+/);
  let sku = words[0].substring(0, 3).toUpperCase();

  if (words.length > 1) {
    sku += words[1].substring(0, 1).toUpperCase();
  }

  sku += `-${index + 1}`;
  return sku;
}

/**
 * Prepare import summary for review before commit
 * @param {Object} parseResult - Result from parseExcelFile
 * @param {Array} validationResults - Array of validateImportRow results
 * @returns {Object} - Summary object
 */
export function generateImportSummary(parseResult, validationResults) {
  const total = validationResults.length;
  const valid = validationResults.filter(r => r.isValid).length;
  const warnings = validationResults.filter(r => r.warnings.length > 0).length;
  const errors = validationResults.filter(r => r.errors.length > 0).length;

  const errorsByType = {};
  const warningsByType = {};

  validationResults.forEach(result => {
    result.errors.forEach(error => {
      errorsByType[error] = (errorsByType[error] || 0) + 1;
    });
    result.warnings.forEach(warning => {
      warningsByType[warning] = (warningsByType[warning] || 0) + 1;
    });
  });

  return {
    fileName: parseResult.fileName,
    sheetName: Object.keys(parseResult.sheets)[0],
    totalRows: total,
    validRows: valid,
    rowsWithWarnings: warnings,
    rowsWithErrors: errors,
    successRate: total > 0 ? ((valid / total) * 100).toFixed(1) : 0,
    errorSummary: errorsByType,
    warningSummary: warningsByType,
    canProceed: errors === 0,
    duplicatesDetected: validationResults.some(r => r.cleaned.sku && validationResults.filter(r2 => r2.cleaned.sku === r.cleaned.sku).length > 1)
  };
}

export default {
  parseExcelFile,
  validateImportRow,
  transformImportedData,
  detectDuplicates,
  generateSkuFromName,
  generateImportSummary
};
