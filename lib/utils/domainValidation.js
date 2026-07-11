/**
 * Domain-Specific Field Validation
 * Provides validation rules and validators for domain-specific fields
 */

/**
 * Domain field validation patterns
 */
export const domainFieldValidators = {
    // Textile Wholesale
    'textile-wholesale': {
        articleno: {
            pattern: /^[A-Z0-9\s-]{3,20}$/i,
            message: 'Article No should be 3-20 alphanumeric characters (can include hyphens)',
        },
        designno: {
            pattern: /^[A-Z0-9\s-]{2,20}$/i,
            message: 'Design No should be 2-20 characters (letters, numbers, hyphens)',
        },
        widtharz: {
            pattern: /^\d+(\.\d+)?$/,
            message: 'Width should be a valid number',
            min: 20,
            max: 200,
        },
        thaanlength: {
            pattern: /^\d+(\.\d+)?$/,
            message: 'Thaan length should be a valid number',
            min: 1,
            max: 200,
        },
    },

    // Mobile/Electronics
    'mobile': {
        imei: {
            pattern: /^\d{15}$/,
            message: 'IMEI must be exactly 15 digits',
        },
        model: {
            pattern: /^[A-Z0-9\s-]{2,50}$/i,
            message: 'Model should be 2-50 characters',
        },
    },

    'electronics-goods': {
        'imei/macaddress': {
            pattern: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$|^\d{15}$/i,
            message: 'Invalid IMEI or MAC address format',
        },
        modelnumber: {
            pattern: /^[A-Z0-9\s-]{2,50}$/i,
            message: 'Model number should be 2-50 characters',
        },
    },

    'computer-hardware': {
        modelnumber: {
            pattern: /^[A-Z0-9\s-]{2,50}$/i,
            message: 'Model number should be 2-50 characters',
        },
        compatibility: {
            pattern: /^.{2,100}$/,
            message: 'Compatibility info should be 2-100 characters',
        },
    },

    // Pharmacy
    'pharmacy': {
        druglicense: {
            pattern: /^[A-Z]{2}\d{6,10}$/i,
            message: 'Drug license should be 2 letters followed by 6-10 digits',
        },
        scheduleh1: {
            pattern: /^(Yes|No|H1|H|Schedule\s*H1?)$/i,
            message: 'Schedule H1 should be Yes/No or H1',
        },
    },

    // Auto Parts
    'auto-parts': {
        partnumber: {
            pattern: /^[A-Z0-9-]{3,20}$/i,
            message: 'Part number should be 3-20 alphanumeric characters',
        },
        oemnumber: {
            pattern: /^[A-Z0-9-]{3,20}$/i,
            message: 'OEM number should be 3-20 alphanumeric characters',
        },
        vehiclecompatibility: {
            pattern: /^.{2,200}$/,
            message: 'Vehicle compatibility should be 2-200 characters',
        },
    },

    // Agriculture
    'agriculture': {
        grade: {
            pattern: /^[A-Z0-9\s-]{1,20}$/i,
            message: 'Grade should be 1-20 characters',
        },
        moisturecontent: {
            pattern: /^\d+(\.\d+)?%?$/,
            message: 'Moisture content should be a valid percentage',
            min: 0,
            max: 100,
        },
    },

    // Book Publishing
    'book-publishing': {
        isbn: {
            pattern: /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/i,
            message: 'Invalid ISBN-10 or ISBN-13 format',
        },
    },

    // Auto Workshop / Sales
    'auto-workshop': {
        vin: {
            pattern: /^[A-HJ-NPR-Z0-9]{17}$/i,
            message: 'Invalid 17-character VIN (excluding I, O, Q)',
        },
    },

    // Vehicle marketplace & dealership listings
    'auto-marketplace': {
        vehiclemake: {
            pattern: /^.{1,60}$/,
            message: 'Make is required',
        },
        vehiclemodel: {
            pattern: /^.{1,80}$/,
            message: 'Model is required',
        },
        modelyear: {
            pattern: /^(19|20)\d{2}$/,
            message: 'Model year must be a 4-digit year',
        },
        mileage: {
            pattern: /^\d+(\.\d+)?$/,
            message: 'Mileage must be a non-negative number (km)',
            min: 0,
            max: 9999999,
        },
        condition: {
            pattern: /^(new|pre-owned|preowned|used|rental)$/i,
            message: 'Condition must be new, pre-owned, or rental',
        },
    },

    'vehicle-dealership': {
        vehiclemake: {
            pattern: /^.{1,60}$/,
            message: 'Make is required',
        },
        vehiclemodel: {
            pattern: /^.{1,80}$/,
            message: 'Model is required',
        },
        modelyear: {
            pattern: /^(19|20)\d{2}$/,
            message: 'Model year must be a 4-digit year',
        },
        mileage: {
            pattern: /^\d+(\.\d+)?$/,
            message: 'Mileage must be a non-negative number (km)',
            min: 0,
            max: 9999999,
        },
        condition: {
            pattern: /^(new|pre-owned|preowned|used)$/i,
            message: 'Condition must be new or pre-owned',
        },
        transmission: {
            pattern: /^.{0,40}$/,
            message: 'Transmission must be 40 characters or fewer',
        },
    },

    // Specialized Retail / E-commerce (Barcode validation)
    'retail-shop': {
        barcode: {
            pattern: /^\d{8}$|^\d{12,14}$/,
            message: 'Invalid GTIN/EAN (8, 12, 13, or 14 digits)',
        },
    },

    // Petrol Pump
    'petrol-pump': {
        tankid: {
            pattern: /^[A-Z0-9-]{2,10}$/i,
            message: 'Tank ID should be 2-10 alphanumeric characters',
        },
        nozzlenumber: {
            pattern: /^\d+$/,
            message: 'Nozzle number should be a valid number',
            min: 1,
            max: 50,
        },
    },

    // Generic HSN Validation (Pakistani standard)
    'global': {
        hsn: {
            pattern: /^\d{4,8}$/,
            message: 'HSN code should be 4 to 8 digits',
        }
    }
};

/**
 * Validate a domain-specific field
 * @param {string} category - Domain category
 * @param {string} field - Field name (normalized, lowercase, no spaces)
 * @param {*} value - Field value
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateDomainField(category, field, value) {
    // Normalize field name
    const normalizedField = field.toLowerCase().replace(/\s+/g, '');

    // Get validators for this domain
    const domainValidators = domainFieldValidators[category];
    if (!domainValidators) {
        return { valid: true }; // No validators for this domain
    }

    // Get validator for this field
    const validator = domainValidators[normalizedField];
    if (!validator) {
        return { valid: true }; // No validator for this field
    }

    // Skip validation for empty values (unless required)
    if (!value || value === '') {
        return { valid: true };
    }

    // Pattern validation
    if (validator.pattern && !validator.pattern.test(String(value))) {
        return {
            valid: false,
            message: validator.message || 'Invalid format',
        };
    }

    // Numeric range validation
    if (validator.min !== undefined || validator.max !== undefined) {
        const numValue = parseFloat(String(value).replace(/[^\d.]/g, ''));
        if (isNaN(numValue)) {
            return {
                valid: false,
                message: 'Must be a valid number',
            };
        }
        if (validator.min !== undefined && numValue < validator.min) {
            return {
                valid: false,
                message: `Minimum value is ${validator.min}`,
            };
        }
        if (validator.max !== undefined && numValue > validator.max) {
            return {
                valid: false,
                message: `Maximum value is ${validator.max}`,
            };
        }
    }

    return { valid: true };
}

/**
 * Validate all domain fields in a product
 * @param {Object} product - Product data with domain fields
 * @param {string} category - Domain category
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateDomainProduct(product, category) {
    const errors = {};
    const domainValidators = domainFieldValidators[category];

    if (!domainValidators) {
        return { valid: true, errors: {} };
    }

    // Validate each field that has a validator
    Object.keys(domainValidators).forEach(field => {
        const value =
            product[field] ??
            product.domain_data?.[field] ??
            product.domainData?.[field];
        // Skip empty optional fields — required checks live in fieldConfig / form layer
        if (value == null || value === '') return;
        const result = validateDomainField(category, field, value);
        if (!result.valid) {
            errors[field] = result.message;
        }
    });

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Get validation rules for a specific domain field
 * @param {string} category - Domain category
 * @param {string} field - Field name
 * @returns {Object|null} Validation rules or null
 */
export function getFieldValidationRules(category, field) {
    const normalizedField = field.toLowerCase().replace(/\s+/g, '');
    return domainFieldValidators[category]?.[normalizedField] || null;
}

/**
 * Check if a field has validation rules
 * @param {string} category - Domain category
 * @param {string} field - Field name
 * @returns {boolean}
 */
export function hasValidationRules(category, field) {
    return getFieldValidationRules(category, field) !== null;
}

/**
 * Validate expiry date based on domain intelligence
 * @param {Date} expiryDate - Expiry date
 * @param {Date} manufacturingDate - Manufacturing date
 * @param {number} shelfLife - Shelf life in days from domain intelligence
 * @returns {Object} { valid: boolean, message: string, warning: boolean }
 */
export function validateExpiryDate(expiryDate, manufacturingDate, shelfLife) {
    if (!expiryDate) {
        return { valid: true };
    }

    const expiry = new Date(expiryDate);
    const today = new Date();

    // Check if already expired
    if (expiry < today) {
        return {
            valid: false,
            message: 'Product has already expired',
        };
    }

    // Check if expiry is too soon (within 10% of shelf life)
    if (shelfLife) {
        const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
        const warningThreshold = Math.floor(shelfLife * 0.1);

        if (daysUntilExpiry <= warningThreshold) {
            return {
                valid: true,
                warning: true,
                message: `Product expires in ${daysUntilExpiry} days`,
            };
        }
    }

    // Check if expiry is before manufacturing
    if (manufacturingDate) {
        const mfg = new Date(manufacturingDate);
        if (expiry <= mfg) {
            return {
                valid: false,
                message: 'Expiry date must be after manufacturing date',
            };
        }

        // Check if shelf life is reasonable
        if (shelfLife) {
            const actualShelfLife = Math.floor((expiry - mfg) / (1000 * 60 * 60 * 24));
            const expectedShelfLife = shelfLife;
            const deviation = Math.abs(actualShelfLife - expectedShelfLife) / expectedShelfLife;

            if (deviation > 0.5) { // More than 50% deviation
                return {
                    valid: true,
                    warning: true,
                    message: `Shelf life (${actualShelfLife} days) differs significantly from expected (${expectedShelfLife} days)`,
                };
            }
        }
    }

    return { valid: true };
}
