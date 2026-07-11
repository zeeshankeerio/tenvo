/**
 * Invoice Helpers
 * Utilities for domain-specific invoice generation
 */

import { getDomainKnowledge } from '../domainKnowledge';
import { getDomainProductFields, getFieldLabel } from './domainHelpers';

/**
 * Get domain-specific invoice columns
 * 
 * @param {string} category - Business category
 * @returns {Array} Array of column objects { header: string, field: string, width: string }
 */
export function getDomainInvoiceColumns(category) {
    const columns = [];

    // 1. Explicit Overrides (for specific styling/widths)
    // Textile Wholesale
    if (category === 'textile-wholesale') {
        columns.push(
            { header: 'Article No', field: 'article_no', width: 'w-24', placeholder: 'Art #' },
            { header: 'Design No', field: 'design_no', width: 'w-24', placeholder: 'Des #' },
            { header: 'Thaan/Suit', field: 'thaan_length', width: 'w-20', placeholder: 'Len' }
        );
        return columns;
    }

    // Mobile / Electronics
    if (['mobile', 'electronics-goods', 'computer-hardware'].includes(category)) {
        columns.push(
            { header: 'IMEI / Serial', field: 'serialNumber', width: 'w-32', placeholder: 'IMEI/Serial #' }
        );
        return columns;
    }

    // Pharmacy / FMCG / Chemical
    if (['pharmacy', 'fmcg', 'chemical', 'medicine'].includes(category)) {
        columns.push(
            { header: 'Batch', field: 'batchNumber', width: 'w-24', placeholder: 'Batch #' },
            { header: 'Expiry', field: 'expiryDate', width: 'w-24', type: 'date' }
        );
        return columns;
    }

    // Auto Parts
    if (category === 'auto-parts') {
        columns.push(
            { header: 'Part No', field: 'partNumber', width: 'w-28', placeholder: 'Part #' },
            { header: 'Model', field: 'vehicleModel', width: 'w-28', placeholder: 'Vehicle Model' }
        );
        return columns;
    }

    // Garments / Footwear
    if (['garments', 'footwear', 'boutique-fashion'].includes(category)) {
        columns.push(
            { header: 'Size', field: 'size', width: 'w-16', placeholder: 'Size' },
            { header: 'Color', field: 'color', width: 'w-20', placeholder: 'Color' }
        );
        return columns;
    }

    // 2. Dynamic Fallback
    // If we haven't matched a specific group, let's try to intelligently guess useful columns
    // from the domain definition.
    const domainFields = getDomainProductFields(category);

    // We filter for "identifying" fields. 
    // This is heuristics. We favor fields that look like ID/Number/Code.
    const candidates = domainFields.filter(f =>
        !['description', 'brand', 'category', 'image', 'hsn'].includes(f) // Exclude basics
    );

    // Take top 2 candidates
    candidates.slice(0, 2).forEach(field => {
        columns.push({
            header: getFieldLabel(field) || field,
            field: field,
            width: 'w-24',
            placeholder: getFieldLabel(field)
        });
    });

    return columns;
}

/**
 * Format field value for invoice display
 */
export function formatInvoiceField(value, type) {
    if (!value) return '';
    if (type === 'date') {
        return new Date(value).toLocaleDateString();
    }
    return value;
}
