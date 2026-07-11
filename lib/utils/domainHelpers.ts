/**
 * Domain Helper Functions
 * Utilities for working with domain-specific data and configurations
 */

import { getDomainKnowledge } from '../domainKnowledge';
import { getRegionalStandards } from './regionalHelpers';
import { resolveDomainKey } from '../config/domainKeyAliases';
export { getDomainKnowledge };

export type DomainKnowledgeOptions = { countryIso?: string };

function resolveKnowledge(category: string, options?: DomainKnowledgeOptions) {
  return options?.countryIso
    ? getDomainKnowledge(category, { countryIso: options.countryIso })
    : getDomainKnowledge(category);
}
import { Product } from '../types/domainTypes';

/**
 * Get domain-specific product fields for a category
 * 
 * @param category - Business category (e.g., 'auto-parts', 'pharmacy')
 * @returns Array of required product field names
 */
export const CORE_PRODUCT_KEYS = ['name', 'sku', 'barcode', 'price', 'cost_price', 'stock', 'category', 'brand', 'unit', 'description'];
export const KEY_BLOCKLIST = ['id', 'created_at', 'updated_at', 'tenant_id'];

export function getDomainProductFields(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.productFields || [];
}

/**
 * Get domain-specific customer fields for a category
 */
export function getDomainCustomerFields(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return (knowledge as any)?.customerFields || [];
}

/**
 * Get domain-specific vendor fields for a category
 */
export function getDomainVendorFields(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.vendorFields || [];
}

/**
 * Get domain-specific tax categories
 * 
 * @param category - Business category
 * @returns Array of tax category strings
 */
export function getDomainTaxCategories(category: string, options?: DomainKnowledgeOptions): string[] {
  const knowledge: any = resolveKnowledge(category, options);
  return knowledge?.taxCategories || [];
}

/**
 * Get domain-specific units of measurement
 * 
 * @param category - Business category
 * @returns Array of unit strings
 */
export function getDomainUnits(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.units || ['pcs'];
}

/**
 * Get default tax percentage for domain
 * 
 * @param category - Business category
 * @returns Default tax percentage
 */
export function getDomainDefaultTax(category: string, options?: DomainKnowledgeOptions): number {
  const knowledge: any = resolveKnowledge(category, options);
  const domainTax = Number(knowledge?.defaultTax);
  if (Number.isFinite(domainTax) && domainTax > 0) return domainTax;
  if (options?.countryIso) {
    return getRegionalStandards(options.countryIso).defaultTaxRate;
  }
  return Number.isFinite(domainTax) ? domainTax : 0;
}

/**
 * Get default HSN code for domain
 * 
 * @param category - Business category
 * @returns Default HSN code
 */
export function getDomainDefaultHSN(category: string): string {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.defaultHSN || '';
}

/**
 * Get stock valuation method for domain
 * 
 * @param category - Business category
 * @returns Valuation method ('FIFO', 'LIFO', 'Average', 'FEFO')
 */
export function getDomainValuationMethod(category: string): string {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.stockValuationMethod || 'Average';
}

/**
 * Check if domain has batch tracking enabled
 * 
 * @param category - Business category
 * @returns True if batch tracking is enabled
 */
export function isBatchTrackingEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.batchTrackingEnabled || false;
}

/**
 * Check if domain has serial tracking enabled
 * 
 * @param category - Business category
 * @returns True if serial tracking is enabled
 */
export function isSerialTrackingEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.serialTrackingEnabled || false;
}

/**
 * Check if domain has expiry tracking enabled
 * 
 * @param category - Business category
 * @returns True if expiry tracking is enabled
 */
export function isExpiryTrackingEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.expiryTrackingEnabled || false;
}

/**
 * Check if domain has manufacturing enabled
 * 
 * @param category - Business category
 * @returns True if manufacturing is enabled
 */
export function isManufacturingEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.manufacturingEnabled || false;
}

/**
 * Normalized manufacturing hints for BOM / production UIs.
 * Supports both legacy keys (defaultLossPercent, allowWastageTracking) and
 * UI keys (defaultLoss, trackWastage) so callers never see undefined%.
 */
export function getManufacturingConfig(category: string) {
  const knowledge: any = getDomainKnowledge(category);
  const raw = knowledge?.manufacturingConfig || {};
  const defaultLoss = Number(
    raw.defaultLoss ?? raw.defaultLossPercent ?? raw.recommendedWastagePercent ?? 0
  );
  const safeLoss = Number.isFinite(defaultLoss) ? defaultLoss : 0;
  const trackWastage = Boolean(raw.trackWastage ?? raw.allowWastageTracking ?? false);
  return {
    ...raw,
    defaultLoss: safeLoss,
    defaultLossPercent: safeLoss,
    trackWastage,
    allowWastageTracking: trackWastage,
    processSteps: Array.isArray(raw.processSteps) ? raw.processSteps : [],
  };
}

/**
 * Get domain-specific theme colors
 * 
 * @param category - Business category
 * @returns Object with primary color classes
 */
export function getDomainTheme(category: string) {
  void category;
  return { primary: 'wine-600', text: 'gray-950', bg: 'wine-50', border: 'wine-100' };
}

/**
 * Tailwind JIT safelist -- all dynamically composed domain theme classes.
 * These must appear as literal strings so Tailwind's scanner includes them in
 * the generated CSS. Do NOT delete or tree-shake this constant.
 */
const _TW_DOMAIN_SAFELIST = [
  'bg-wine','text-wine','border-wine','ring-wine','shadow-wine/20',
  'bg-wine/5','bg-wine/10','bg-wine/20','hover:bg-wine/20','border-wine/20',
  'data-[state=active]:text-wine','bg-wine-50','bg-wine-50/20','bg-wine-50/30',
  'to-wine-50/20','hover:bg-wine-50','border-wine-100','border-wine-100/50',
  'bg-wine-600','text-wine-600','border-wine-600','ring-wine-600','shadow-wine-600/20',
  'bg-wine-600/5','bg-wine-600/10','bg-wine-600/20','hover:bg-wine-600/20','border-wine-600/20',
  'data-[state=active]:text-wine-600',
] as const;
void _TW_DOMAIN_SAFELIST; // prevent unused-var warning

/**
 * Check if domain has size-color matrix enabled
 * 
 * @param category - Business category
 * @returns True if size-color matrix is enabled
 */
export function isSizeColorMatrixEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.sizeColorMatrixEnabled ||
    knowledge?.productFields?.includes('Size-Color Matrix') ||
    knowledge?.inventoryFeatures?.includes('Size-Color Matrix') ||
    false;
}

/**
 * Get default values for domain-specific product fields
 * 
 * @param category - Business category
 * @param product - Existing product object (optional)
 * @returns Object with default field values
 */
export function getDomainDefaults(category: string, product: any = null): any {
  const knowledge: any = getDomainKnowledge(category);
  const defaults: any = {
    unit: knowledge?.units?.[0] || 'pcs',
    taxPercent: knowledge?.defaultTax || 0,
    hsnCode: knowledge?.defaultHSN || '',
    stockValuationMethod: knowledge?.stockValuationMethod || 'Average',
  };

  // 1. Add Intelligent Standard Stock Defaults if it's a new product
  if (!product) {
    const stockFields = ['minStock', 'maxStock', 'reorderPoint', 'reorderQuantity', 'leadTime', 'shelfLife'];
    stockFields.forEach(field => {
      const intelligentVal = getIntelligentDefaults(category, field);
      if (intelligentVal !== undefined) {
        defaults[field] = intelligentVal;
      }
    });
  }

  // Initialize domain-specific fields with empty strings if not present in product
  const productFields = knowledge?.productFields || [];
  productFields.forEach((field: string) => {
    const key = resolveDomainFieldKey(field, category);

    // Skip standard fields that are handled separately in the UI
    const skipFields = ['hsncode', 'saccode', 'name', 'sku', 'barcode', 'price', 'mrp', 'costprice'];
    if (!skipFields.includes(key)) {
      const val =
        readDomainFieldValue(product?.domain_data, field, category) ??
        product?.[key] ??
        product?.[normalizeKey(field)];

      const configDefault = knowledge?.fieldConfig?.[key]?.default;
      defaults[key] = val ?? (configDefault != null && configDefault !== '' ? configDefault : '');
    }
  });

  return defaults;
}

/**
 * Validate product data against domain requirements
 * 
 * @param product - Product object to validate
 * @param category - Business category
 * @returns Validation result with errors array
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export function validateDomainProduct(
  product: Partial<Product>,
  category: string
): ValidationResult {
  const knowledge: any = getDomainKnowledge(category);
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!knowledge) {
    warnings.push(`No domain knowledge found for category: ${category}`);
    return { valid: true, errors, warnings };
  }

  // Check required fields
  const requiredFields = knowledge.productFields || [];
  requiredFields.forEach((field: string) => {
    // Check if this field is explicitly not required via config
    if (!isFieldRequired(field, category)) {
      return;
    }

    // Some fields might be optional (legacy check)
    const optionalFields = ['HSN Code', 'SAC Code', 'Description'];
    if (!optionalFields.includes(field)) {
      // Use normalized key for lookup (top-level or domain_data)
      const fieldKey = resolveDomainFieldKey(field, category);
      const value =
        product[fieldKey as keyof Product] ||
        product[normalizeKey(field) as keyof Product] ||
        readDomainFieldValue((product as any).domain_data, field, category);

      if ((value === undefined || value === '' || value === null) && fieldKey !== 'hsncode') {
        errors[fieldKey] = `${field} is required for ${category} products`;
      }
    }
  });

  // Domain-specific validations
  if (category === 'pharmacy') {
    if (!(product as any).drugLicense && 'drugLicense' in product) {
      errors['drugLicense'] = 'Drug License is required for pharmacy products';
    }
  }

  if (category === 'food-beverages') {
    if (!(product as any).psqcaLicense && 'psqcaLicense' in product) {
      errors['psqcaLicense'] = 'PSQCA License is required for food & beverage products';
    }
  }

  // Price Compliance: MRP Validation
  if ('mrp' in product || 'price' in product) {
    const mrp = (product as any).mrp;
    const price = product.price;
    if (mrp && price && price > mrp) {
      errors['price'] = `Selling Price (${price}) cannot exceed MRP (${mrp}) [Local Regulation]`;
    }
  }

  // HSN/SAC Code Validation (Regional standard check)
  if (product.hsnCode && !/^\d{4,10}$/.test(product.hsnCode)) {
    warnings.push('HSN/SAC Code usually follows a numeric format of 4 to 10 digits.');
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Get domain-specific inventory features
 * 
 * @param category - Business category
 * @returns Array of feature names
 */
export function getDomainInventoryFeatures(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.inventoryFeatures || [];
}

/**
 * Get domain-specific reports
 * 
 * @param category - Business category
 * @returns Array of report names
 */
export function getDomainReports(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.reports || [];
}

/**
 * Get payment terms for domain
 * 
 * @param category - Business category
 * @returns Array of payment term strings
 */
export function getDomainPaymentTerms(category: string): string[] {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.paymentTerms || ['Cash'];
}

/**
 * Check if reordering is enabled for domain
 * 
 * @param category - Business category
 * @returns True if reordering is enabled
 */
export function isReorderEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.reorderEnabled || false;
}

/**
 * Check if multi-location is enabled for domain
 * 
 * @param category - Business category
 * @returns True if multi-location is enabled
 */
export function isMultiLocationEnabled(category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  return knowledge?.multiLocationEnabled || false;
}

/**
 * Helper to normalize field keys for config lookup
 * lowercases and removes all non-alphanumeric characters
 * Exported for use in forms to ensure consistent normalization
 */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Legacy / label aliases → canonical domain_data keys. */
const DOMAIN_FIELD_KEY_ALIASES: Record<string, Record<string, string>> = {
  'auto-marketplace': {
    make: 'vehiclemake',
    model: 'vehiclemodel',
    listingtype: 'condition',
  },
  'vehicle-dealership': {
    make: 'vehiclemake',
    model: 'vehiclemodel',
  },
  'textile-wholesale': {
    articleno: 'articleno',
    articlenumber: 'articleno',
    article_no: 'articleno',
    designno: 'designno',
    designnumber: 'designno',
    design_no: 'designno',
    fabrictype: 'fabrictype',
    fabric_type: 'fabrictype',
    fabric: 'fabrictype',
    korafinished: 'korafinished',
    kora: 'korafinished',
    widtharz: 'widtharz',
    width: 'widtharz',
    arz: 'widtharz',
    thaanlength: 'thaanlength',
    thaan_length: 'thaanlength',
    thaan: 'thaanlength',
    suitcutting: 'suitcutting',
    suit_cutting: 'suitcutting',
  },
};

/**
 * Canonical domain_data key for a productFields label or config key.
 */
export function resolveDomainFieldKey(field: string, category: string): string {
  const normalized = normalizeKey(field);
  const vertical = resolveDomainKey(category);
  const aliases = DOMAIN_FIELD_KEY_ALIASES[vertical] || {};
  return aliases[normalized] || normalized;
}

function resolveFieldConfig(field: string, category: string, knowledge: any) {
  const canonical = resolveDomainFieldKey(field, category);
  return (
    knowledge?.fieldConfig?.[field] ||
    knowledge?.fieldConfig?.[field.toLowerCase()] ||
    knowledge?.fieldConfig?.[normalizeKey(field)] ||
    knowledge?.fieldConfig?.[canonical]
  );
}

/**
 * Read a domain_data value using canonical + legacy keys.
 */
export function readDomainFieldValue(
  domainData: Record<string, unknown> | null | undefined,
  field: string,
  category: string
): unknown {
  if (!domainData || typeof domainData !== 'object') return undefined;
  const canonical = resolveDomainFieldKey(field, category);
  const legacy = normalizeKey(field);
  return (
    domainData[canonical] ??
    domainData[legacy] ??
    domainData[field] ??
    domainData[field.toLowerCase().replace(/\s+/g, '_')]
  );
}

/**
 * Get field label for domain-specific field
 * Maps internal field names to display labels
 * 
 * @param field - Field name (e.g., 'partNumber', 'drugLicense')
 * @param category - Business category
 * @returns Display label
 */
export function getFieldLabel(field: string, category: string): string {
  const knowledge: any = getDomainKnowledge(category);
  const config = resolveFieldConfig(field, category, knowledge);

  if (config?.label) return config.label;
  const normalized = normalizeKey(field);

  const fieldLabels: Record<string, string> = {
    // ... (existing mapping)
    partNumber: 'Part Number',
    partnumber: 'Part Number',
    // ...
    articleno: 'Article No',
    article_no: 'Article No',
    designno: 'Design No',
    design_no: 'Design No',
    thaanlength: 'Thaan Length',
    suitcutting: 'Suit Cutting',
    widtharz: 'Width (Arz)',
    fabrictype: 'Fabric Type',
    korafinished: 'Kora/Finished',
  };

  return fieldLabels[field] || fieldLabels[normalized] || field;
}

/**
 * Get field input type for domain-specific field
 * 
 * @param field - Field name
 * @param category - Business category
 * @returns Input type ('text', 'number', 'date', 'select', 'multiselect', etc.)
 */
export function getFieldInputType(field: string, category: string): string {
  const knowledge: any = getDomainKnowledge(category);
  const normalized = normalizeKey(field);
  const config = resolveFieldConfig(field, category, knowledge);

  if (config?.type) return config.type;

  const canonical = resolveDomainFieldKey(field, category);
  /** Match raw label keys (e.g. `make`) and canonical domain_data keys (e.g. `vehiclemake`). */
  const matches = (keys: string[]) => keys.includes(canonical) || keys.includes(normalized);

  const dateFields = [
    'expirydate', 'manufacturingdate', 'purchasedate', 'warrantystartdate', 'warrantyenddate',
    'consumptiondate', 'eventdate', 'validity',
  ];
  const numberFields = [
    'price', 'stock', 'mrp', 'weight', 'warrantyperiod', 'gsm', 'carat', 'area',
    'weightlimit', 'duration', 'unitcost', 'preptime', 'consultationfee', 'commissionrate',
    'quantity', 'rate', 'amount', 'taxpercent', 'discountpercent',
    'mileage', 'depreciation',
  ];
  const selectFields = [
    'marketlocation', 'paymentterms', 'paymentmethod', 'brokername', 'agentname',
    'qualitygrade', 'korafinished', 'fabrictype', 'sizetype', 'unit', 'status',
    'province', 'type', 'category',
    'vehiclemake', 'make', 'modelyear', 'fueltype', 'bodytype', 'condition', 'transmission',
    'listingtype',
  ];
  const compatibilityFields = ['vehiclecompatibility', 'compatibility', 'models'];
  const oemFields = ['oemnumber', 'oemspec', 'originalpartnumber'];
  const partFields = ['partnumber', 'internalid', 'makernumber'];
  const warrantyFields = ['warrantyperiod', 'warranty'];

  if (matches(compatibilityFields)) return 'vehicle-compatibility';
  if (matches(oemFields)) return 'oem-number';
  if (matches(partFields)) return 'part-number';
  if (matches(warrantyFields)) return 'warranty';

  if (matches(dateFields)) return 'date';
  if (matches(numberFields)) return 'number';
  if (matches(selectFields)) return 'select';

  return 'text';
}

/**
 * Get options for select fields
 * 
 * @param field - Field name
 * @param category - Business category
 * @returns Array of option strings or objects
 */
export function getSelectOptions(field: string, category: string): any[] {
  const knowledge: any = getDomainKnowledge(category);
  const normalized = normalizeKey(field);
  const config = resolveFieldConfig(field, category, knowledge);

  if (config?.options && Array.isArray(config.options)) {
    return config.options;
  }

  // 2. Fallback aliases for common fields
  if (normalized === 'marketlocation' && knowledge?.pakistaniFeatures?.marketLocations) {
    return knowledge.pakistaniFeatures.marketLocations;
  }

  if (normalized === 'paymentterms' && knowledge?.paymentTerms) {
    return knowledge.paymentTerms;
  }

  return [];
}

/**
 * Check if field is required for domain
 * 
 * @param field - Field name
 * @param category - Business category
 * @returns True if field is required
 */
export function isFieldRequired(field: string, category: string): boolean {
  const knowledge: any = getDomainKnowledge(category);
  if (!knowledge) return false;

  const config = resolveFieldConfig(field, category, knowledge);

  if (config && typeof config.required === 'boolean') {
    return config.required;
  }

  // 2. Fallback to list inclusion (default true if in productFields)
  const productFields = knowledge.productFields || [];
  // We need to compare labels or keys carefully. 
  // productFields usually contains Labels like "Article No".
  // If 'field' is "Article No", it matches.
  // If 'field' is "articleno", we verify against labels?
  // Easier: Assume strict match or normalize match if needed.
  // But usually this function is called with the string from productFields list.

  return productFields.includes(field) || productFields.includes(getFieldLabel(field, category));
}

/**
 * Get domain display name
 * 
 * @param category - Business category slug
 * @returns Display name
 */
export function getDomainDisplayName(category: string): string {
  const domainNames: Record<string, string> = {
    'auto-parts': 'Auto Parts',
    'retail-shop': 'Retail Shop',
    'pharmacy': 'Pharmacy',
    'chemical': 'Chemical',
    'food-beverages': 'Food & Beverages',
    'ecommerce': 'E-commerce',
    'computer-hardware': 'Computer Hardware',
    'furniture': 'Furniture',
    'book-publishing': 'Book Publishing',
    'travel': 'Travel',
    'fmcg': 'FMCG',
    'electrical': 'Electrical',
    'paper-mill': 'Paper Mill',
    'paint': 'Paint',
    'mobile': 'Mobile',
    'garments': 'Garments',
    'agriculture': 'Agriculture',
    'gems-jewellery': 'Gems & Jewellery',
    'electronics-goods': 'Electronics Goods',
    'real-estate': 'Real Estate',
    'grocery': 'Grocery',
    'hardware-sanitary': 'Hardware & Sanitary',
    'poultry-farm': 'Poultry Farm',
    'solar-energy': 'Solar & Energy',
    'auto-workshop': 'Auto Workshop',
    'diagnostic-lab': 'Diagnostic Lab',
    'restaurant-cafe': 'Restaurant & Cafe',
    'courier-logistics': 'Courier & Logistics',
    'school-library': 'School/Library',
    'gym-fitness': 'Gym & Fitness',
    'hotel-guesthouse': 'Hotel/Guest House',
    'event-management': 'Event Management',
    'rent-a-car': 'Rent-a-Car',
    'wholesale-distribution': 'Wholesale Distribution',
    'plastic-manufacturing': 'Plastic Manufacturing',
    'leather-footwear': 'Leather & Footwear',
    'ceramics-tiles': 'Ceramics & Tiles',
    'printing-packaging': 'Printing & Packaging',
    'petrol-pump': 'Petrol Pump & Oil',
    'cold-storage': 'Cold Storage',
    'textile-mill': 'Textile Mill',
    'textile-wholesale': 'Textile Wholesale (Jama Cloth)',
  };

  return domainNames[category] || category;
}

/**
 * Get domain-specific form labels for standard fields
 * Reduces "dissonance" by using terminology the business owner understands.
 */
export function getDomainFormLabels(category: string) {
  const labels: Record<string, Record<string, string>> = {
    'livestock-farm': { name: 'Animal ID / Name', category: 'Herd / Breed Category', stock: 'Initial Count' },
    'school-education': { name: 'Fee / Service Title', category: 'Admission / Level', stock: 'Planned Admissions' },
    'auto-parts': { name: 'Part Name', category: 'Assembly Group', stock: 'Opening Units' },
    'pharmacy': { name: 'Medicine / Brand Name', category: 'Therapeutic Class', stock: 'Opening Units' },
    'restaurant-fast-food': { name: 'Dish / Item Name', category: 'Menu Section', stock: 'Kitchen Stock' },
  };

  return labels[category] || { name: 'Product Name', category: 'Category', stock: 'Opening Stock' };
}

/**
 * High-Precision domains are those where specialized metadata (Serial #, Batch, OEM)
 * is as important as the name itself.
 */
export function isHighPrecisionDomain(category: string): boolean {
  const precisionDomains = [
    'auto-parts', 'pharmacy', 'livestock-farm', 'poultry-farm', 
    'electronics-appliances', 'hospital-healthcare', 'diagnostic-lab',
    'heavy-machinery'
  ];
  return precisionDomains.includes(category);
}

/**
 * Sanitize domain data to ensure no overlap with core keys or blocklisted keys
 */
export function sanitizeDomainData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  // 1. Remove core product keys (they belong at the top level)
  CORE_PRODUCT_KEYS.forEach(key => delete sanitized[key]);
  
  // 2. Remove internal/system keys
  KEY_BLOCKLIST.forEach(key => delete sanitized[key]);
  
  return sanitized;
}

/**
 * Get intelligent default value for a specific field based on domain intelligence
 * Uses the intelligence config to suggest smart defaults
 * 
 * @param category - Business category
 * @param fieldName - Field name to get default for
 * @returns Intelligent default value or undefined
 */
export function getIntelligentDefaults(category: string, fieldName: string): any {
  const knowledge: any = getDomainKnowledge(category);
  const intelligence = knowledge?.intelligence;

  if (!intelligence) return undefined;

  const normalized = normalizeKey(fieldName);

  // Determine turnover profile for smarter defaults
  const isHighTurnover = ['fmcg', 'retail-shop', 'pharmacy', 'grocery', 'food-beverages'].includes(category);
  const isHighValue = ['gems-jewellery', 'solar-energy', 'electronics-goods', 'computer-hardware'].includes(category);

  switch (normalized) {
    case 'minstock':
    case 'minstocklevel':
      // Base on minimum order quantity with safety buffer
      const baseMin = intelligence.minOrderQuantity || 10;
      if (isHighTurnover) return Math.ceil(baseMin * 0.8); // Higher safety stock for FMCG
      if (isHighValue) return 1; // Low minimum stock for expensive items
      return Math.ceil(baseMin * 0.5);

    case 'reorderpoint':
    case 'reorderlevel':
      // Set reorder point based on lead time and turnover
      const leadTime = intelligence.leadTime || 7;
      const minStockLevel = getIntelligentDefaults(category, 'minstock');

      if (isHighTurnover) {
        // FMCG needs reorder points far earlier
        return Math.ceil(minStockLevel + (leadTime * 5)); // Buffer for daily sales
      }
      return Math.ceil(minStockLevel * 1.5);

    case 'reorderquantity':
      // Use domain's minimum order quantity
      const baseQty = intelligence.minOrderQuantity || 50;
      if (isHighValue) return 5;
      return baseQty;

    case 'maxstock':
    case 'maxstocklevel':
      // Set max stock based on shelf life and demand volatility
      const baseMax = (intelligence.minOrderQuantity || 10) * (isHighTurnover ? 10 : 3);
      // Adjust for perishability
      if (intelligence.perishability === 'high' || intelligence.perishability === 'critical') {
        return Math.ceil(baseMax * 0.5); // Much lower max for highly perishable items
      }
      return baseMax;

    case 'leadtime':
    case 'leadtimedays':
      return intelligence.leadTime || 7;

    case 'shelflife':
    case 'shelflifedays':
      return intelligence.shelfLife || 365;

    case 'warrantyperiod':
    case 'warrantymonths':
      // Suggest warranty based on domain
      if (category === 'computer-hardware' || category === 'electrical' || category === 'solar-energy') return 12;
      if (category === 'auto-parts' || category === 'mobile') return 6;
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Get display-friendly unit preview for a field
 * @param field - Normalized field key
 * @param category - Business domain
 */
export function getDomainUnitPreview(field: string, category: string): string | null {
  const n = normalizeKey(field);

  if (category === 'textile-wholesale') {
    if (n.includes('length') || n.includes('cutting') || n.includes('thaan')) return 'Meters';
    if (n.includes('width') || n.includes('arz')) return 'Inches';
    if (n.includes('weight') || n.includes('gsm')) return 'GSM / Grams';
  }

  if (category === 'pharmacy') {
    if (n.includes('strength') || n.includes('dosage')) return 'mg / ml';
    if (n.includes('packsize')) return 'Tabs / Vial';
  }

  if (category === 'solar-energy') {
    if (n.includes('capacity') || n.includes('power')) return 'Watts / kWh';
    if (n.includes('voltage')) return 'Volts (V)';
  }

  if (category === 'agriculture') {
    if (n.includes('moisture')) return '% Percent';
    if (n.includes('weight')) return 'Kgs / Maunds';
  }

  return null;
}

/**
 * Get all enabled features for a domain
 * Returns a summary object
 */
export function getDomainFeatureSummary(category: string) {
  return {
    batchTracking: isBatchTrackingEnabled(category),
    serialTracking: isSerialTrackingEnabled(category),
    expiryTracking: isExpiryTrackingEnabled(category),
    manufacturing: isManufacturingEnabled(category),
    sizeColorMatrix: isSizeColorMatrixEnabled(category),
    multiLocation: isMultiLocationEnabled(category),
    reorderEnabled: isReorderEnabled(category),
    valuationMethod: getDomainValuationMethod(category),
    defaultTax: getDomainDefaultTax(category),
    units: getDomainUnits(category),
    paymentTerms: getDomainPaymentTerms(category),
  };
}

/**
 * Get dynamic table columns for the BusyGrid
 */
/**
 * Get dynamic table columns for the BusyGrid
 */
export function getDomainTableColumns(category: string, currencySymbol: string = '₨'): any[] {
  const knowledge: any = getDomainKnowledge(category);
  const fields = knowledge?.productFields || [];

  // Start with standard fixed columns
  const columns: any[] = [
    { accessorKey: 'name', header: 'Product Name', width: 200, flexGrow: 1 },
    { accessorKey: 'sku', header: 'SKU', width: 100 },
    { accessorKey: 'category', header: 'Category', width: 100 },
    { accessorKey: 'stock', header: 'Stock', width: 80 },
    { accessorKey: 'price', header: 'Price', width: 100 },
    { accessorKey: 'tax_percent', header: 'Tax %', width: 80 },
  ];

  // Add domain-specific dynamic columns
  fields.forEach((field: string) => {
    // Avoid adding columns that are already standard
    if (['Name', 'Price', 'Stock', 'Category', 'SKU', 'Barcode'].includes(field)) return;

    // Normalize key to match what is saved in DB (lowercase, alphanumeric)
    const key = normalizeKey(field);

    let width = 120;
    if (field.length > 15) width = 150;
    if (['Description', 'Specifications'].includes(field)) width = 250;

    columns.push({
      accessorKey: key, // Keep simple key for editing if flattened
      header: field,
      width: width,
      // Custom cell renderer to handle nested domain_data
      cell: ({ row }: any) => {
        if (key === 'unitcost') {
          const r = row.original;
          const v =
            r?.domain_data?.unitcost ??
            r?.domain_data?.unitCost ??
            r?.cost_price;
          if (v === 0 || v === '0') return '0';
          if (v !== undefined && v !== null && v !== '') return v;
          return '-';
        }
        // Handle both flattened and nested data structures
        const val = row.original?.[key] ||
          row.original?.domain_data?.[key] ||
          row.original?.attributes?.[key] || // Legacy support
          '-';
        return val;
      }
    });
  });

  // Add standard financial columns at the end ONLY if they weren't added at the start
  // Note: Standard columns are already added at the start (lines 727-731)
  // We only add 'Total Value' here as it's a computed column
  const hasValue = columns.some(c => c.accessorKey === 'value');
  if (!hasValue) {
    columns.push({
      accessorKey: 'value',
      header: 'Total Value',
      width: 130,
      readOnly: true,
      cell: ({ row }: any) => {
        const stock = Number(row.original?.stock) || 0;
        const price = Number(row.original?.price) || 0;
        const val = stock * price;
        return val ? `${currencySymbol}${val.toLocaleString()}` : `${currencySymbol}0`;
      }
    });
  }

  return columns;
}

/**
 * Get dynamic invoice columns for a domain
 */
export function getDomainInvoiceColumns(category: string): any[] {
  const knowledge: any = getDomainKnowledge(category);
  const columns: any[] = [];

  // 1. Traceability columns
  if (isBatchTrackingEnabled(category)) {
    columns.push({
      field: 'batch_number',
      header: category === 'textile-wholesale' ? 'Roll / Bale' : 'Batch',
      width: 'w-24',
    });
  }

  if (isExpiryTrackingEnabled(category)) {
    columns.push({ field: 'expiry_date', header: 'Expiry', width: 'w-24', type: 'date' });
  }

  if (isSerialTrackingEnabled(category)) {
    columns.push({ field: 'serial_number', header: 'Serial #', width: 'w-32' });
  }

  // 2. Domain specific identifiers (Article, Design, Part No, etc.)
  const fields = knowledge?.productFields || [];
  const identifiers = fields.filter((f: string) => {
    const l = f.toLowerCase();
    if (category === 'textile-wholesale') {
      return l.includes('article') || l.includes('design') || l.includes('thaan');
    }
    return l.includes('article') || l.includes('design') || l.includes('part') ||
      l.includes('model') || l.includes('oem') || l.includes('isbn') ||
      l.includes('fabric') || l.includes('registration') || l.includes('roll') ||
      l.includes('batch') || l.includes('chasis') || l.includes('engine');
  }).slice(0, 3); // Take first 3 key identifiers

  identifiers.forEach((field: string) => {
    const key = field.toLowerCase().replace(/\s+/g, '_'); // snake_case for invoice items
    columns.push({
      field: key,
      header: field.replace(' Number', ' #').replace(' No', ' #'),
      width: 'w-24'
    });
  });

  return columns;
}

/**
 * Get dynamic customer columns for the DataTable
 */
export function getDomainCustomerColumns(category: string): any[] {
  const knowledge: any = getDomainKnowledge(category);
  const fields = knowledge?.customerFields || [];
  const columns: any[] = [];

  fields.forEach((field: string) => {
    const key = field.toLowerCase().replace(/\s+/g, '');
    columns.push({
      accessorKey: key,
      header: field,
      width: field.length > 12 ? 150 : 120,
      cell: ({ row }: any) => row.original?.domain_data?.[key] || row.original?.[key] || '-'
    });
  });

  return columns;
}

/**
 * Get dynamic vendor columns for the DataTable
 */
export function getDomainVendorColumns(category: string): any[] {
  const knowledge: any = getDomainKnowledge(category);
  const fields = knowledge?.vendorFields || [];
  const columns: any[] = [];

  fields.forEach((field: string) => {
    // Normalize key to match DB (lowercase, no spaces)
    const key = field.toLowerCase().replace(/\s+/g, '');

    columns.push({
      accessorKey: key,
      header: field,
      width: field.length > 12 ? 150 : 120,
      cell: ({ row }: any) => {
        // Check for common variations in domain_data
        const val = row.original?.domain_data?.[key] ||
          row.original?.domain_data?.[field.toLowerCase().replace(/\s+/g, '_')] || // snake_case
          row.original?.[key] ||
          '-';
        return val;
      }
    });
  });

  return columns;
}
