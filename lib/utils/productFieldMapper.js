import { resolveDomainFieldKey } from '@/lib/utils/domainHelpers';

/**
 * Product Field Mapping Utility
 *
 * Standardizes field mapping logic across Visual Form, Busy Mode, and Excel Mode
 * to ensure consistent data transformation and prevent field mapping discrepancies.
 */

/**
 * Numeric fields that should be parsed as numbers
 */
export const NUMERIC_FIELDS = [
    'stock',
    'price',
    'cost_price',
    'costPrice',
    'min_stock',
    'minStock',
    'max_stock',
    'maxStock',
    'reorder_point',
    'reorderPoint',
    'reorder_quantity',
    'reorderQuantity',
    'mrp',
    'tax_percent',
    'taxPercent',
    'quantity',
    'width',
    'length',
    'height',
    'weight'
];

/**
 * Set a nested value in an object using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot-separated path (e.g., 'domain_data.color')
 * @param {any} value - Value to set
 */
export function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
}

/**
 * Get a nested value from an object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated path
 * @returns {any} Value at path, or undefined
 */
export function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if a field is a domain-specific field
 * @param {string} field - Field name
 * @param {Object} domainKnowledge - Domain knowledge object
 * @returns {boolean}
 */
export function isDomainField(field, domainKnowledge) {
    if (!domainKnowledge?.productFields) return false;

    const normalizedField = field.toLowerCase().replace(/[_\s]/g, '');

    return domainKnowledge.productFields.some(f => {
        const normalizedDomainField = f.toLowerCase().replace(/[_\s]/g, '');
        return normalizedDomainField === normalizedField;
    });
}

/**
 * Process a field value based on its type
 * @param {string} field - Field name
 * @param {any} value - Raw value
 * @returns {any} Processed value
 */
export function processFieldValue(field, value) {
    // Handle numeric fields
    if (NUMERIC_FIELDS.includes(field) || field.includes('width') || field.includes('length') || field.includes('height') || field.includes('weight')) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Handle boolean fields
    if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
        return value.toLowerCase() === 'true';
    }

    // Return as-is for other types
    return value;
}

/**
 * Map a field update to a product object
 * 
 * @param {Object} product - Original product object
 * @param {string} field - Field name (supports dot notation)
 * @param {any} value - New value
 * @param {Object} domainKnowledge - Domain knowledge configuration
 * @returns {Object} Updated product object
 */
export function mapProductField(product, field, value, domainKnowledge = {}, category = '') {
    const updatedProduct = { ...product };
    const scalarKey = field.includes('.') ? field.split('.').pop() : field;
    const processedValue = processFieldValue(scalarKey, value);

    if (field.startsWith('domain_data.')) {
        const rawKey = field.slice('domain_data.'.length);
        const canonical = resolveDomainFieldKey(rawKey, category);
        updatedProduct.domain_data = {
            ...(updatedProduct.domain_data || {}),
            [canonical]: processedValue,
        };
        return updatedProduct;
    }

    // Handle nested keys (e.g. nested non-domain paths)
    if (field.includes('.')) {
        setNestedValue(updatedProduct, field, processedValue);
    }
    // Handle domain-specific fields
    else if (isDomainField(field, domainKnowledge)) {
        const canonical = resolveDomainFieldKey(field, category);
        updatedProduct.domain_data = {
            ...(updatedProduct.domain_data || {}),
            [canonical]: processedValue
        };
    }
    // Handle standard fields
    else {
        updatedProduct[field] = processedValue;
    }

    return updatedProduct;
}

/**
 * Preserve critical relational data (batches, serials) when updating a product
 * 
 * @param {Object} updatedProduct - Product with updates
 * @param {Object} originalProduct - Original product from database/state
 * @returns {Object} Product with preserved relational data
 */
export function preserveRelationalData(updatedProduct, originalProduct) {
    const preserved = { ...updatedProduct };

    // Preserve batches if not explicitly updated
    if (!preserved.batches && originalProduct?.batches) {
        preserved.batches = originalProduct.batches;
    }

    // Preserve serial numbers if not explicitly updated
    if (!preserved.serial_numbers && !preserved.serialNumbers) {
        preserved.serial_numbers = originalProduct?.serial_numbers || originalProduct?.serialNumbers || [];
    }

    // Preserve variants if not explicitly updated
    if (!preserved.variants && originalProduct?.variants) {
        preserved.variants = originalProduct.variants;
    }

    return preserved;
}

/**
 * Normalize field names between snake_case and camelCase
 * @param {string} field - Field name
 * @returns {Object} Object with both snake_case and camelCase versions
 */
export function normalizeFieldName(field) {
    const snakeCase = field.replace(/([A-Z])/g, '_$1').toLowerCase();
    const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    return { snakeCase, camelCase };
}
