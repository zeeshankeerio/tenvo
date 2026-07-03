import { z } from 'zod';

/**
 * Domain-Specific Validation Schemas
 * Standardizing vertical-specific metadata for 55+ Business Verticals.
 * Enforces data integrity for specialized workflows.
 */

// 1. Hospitality / Food & Beverage
export const HospitalitySchema = z.object({
    table_number: z.string().min(1, 'Table number is required for hospitality orders'),
    seating_capacity: z.number().int().positive().optional(),
    location_zone: z.enum(['indoor', 'outdoor', 'terrace', 'bar', 'vip']).default('indoor'),
    is_smoking: z.boolean().default(false),
});

// 2. Apparel / Footwear / Textile
// NOTE: keys mirror the clothing/textile domain `fieldConfig` (see lib/domainData/retail.js,
// textile.js). Uses `.passthrough()` so real domain_data fields (fabrictype, sourcing,
// sizecolormatrix, season, stitchingstatus, designertracking, articleno/designno, etc.) are
// never silently stripped on save. Nothing is hard-required at the schema layer — per-field
// requirements are enforced by the domain form (`fieldConfig`), not here, so entering a
// garment without an article number never blocks a save.
export const TextileFashionSchema = z
    .object({
        // Canonical clothing/textile field keys
        fabrictype: z.string().optional(),
        sourcing: z.string().optional(),
        season: z.string().optional(),
        stitchingstatus: z.string().optional(),
        stitchingtype: z.string().optional(),
        sizecolormatrix: z.string().optional(),
        designertracking: z.string().optional(),
        designer: z.string().optional(),
        collection: z.string().optional(),
        articleno: z.string().optional(),
        designno: z.string().optional(),
        korafinished: z.string().optional(),
        widtharz: z.string().optional(),
        thaanlength: z.string().optional(),
        suitcutting: z.string().optional(),
        // Generic / legacy aliases kept for backward compatibility
        size: z.string().optional(),
        color: z.string().optional(),
        material: z.string().optional(),
        gender: z.string().optional(),
        article_no: z.string().optional(),
        fabric_type: z.string().optional(),
    })
    .passthrough();

// 3. Automotive / Machinery / Electronics
export const TechnicalPartsSchema = z.object({
    oem_part_number: z.string().min(1, 'OEM Part Number is required for technical inventory'),
    compatibility: z.string().optional(),
    chassis_number: z.string().optional(),
    engine_number: z.string().optional(),
    warranty_months: z.number().min(0).default(0),
});

/** Auto-parts hub + storefront finder keys (matches `lib/domainData/specialized.js` fieldConfig). */
export const AutoPartsSchema = z
    .object({
        partnumber: z.string().min(1, 'Part number is required'),
        oemnumber: z.string().min(1, 'OEM number is required'),
        vehiclecompatibility: z.union([z.string(), z.array(z.string())]).optional(),
        vehiclemake: z.string().optional(),
        vehiclemodel: z.string().optional(),
        modelyear: z.string().optional(),
        bodytype: z.string().optional(),
        enginetype: z.string().optional(),
        engineno: z.string().optional(),
        vehicleclass: z.string().optional(),
        vehicletype: z.enum(['car', 'moto']).optional(),
        fitmentplates: z.string().optional(),
        fitmentvin: z.string().optional(),
        warrantyperiod: z.string().optional(),
        manufacturer: z.string().optional(),
        custom_parameters: z.array(z.unknown()).optional(),
        size_color_matrix: z.record(z.unknown()).optional(),
    })
    .passthrough();

// 4. Healthcare / Pharmacy / Chemical
export const HealthcareSchema = z.object({
    dosage_form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'powder', 'vial']).optional(),
    composition: z.string().min(1, 'Active composition is required for healthcare items'),
    requires_prescription: z.boolean().default(false),
    storage_conditions: z.string().default('Store in a cool, dry place'),
    lab_id: z.string().optional(), // For lab tests/diagnostics
});

// 5. Livestock / Agriculture
export const AgricultureSchema = z.object({
    tag_number: z.string().min(1, 'Animal Tag Number is required'),
    breed: z.string().optional(),
    age_months: z.number().positive().optional(),
    weight_kg: z.number().positive().optional(),
    vaccination_status: z.boolean().default(false),
});

// 6. Educational Institutions
export const EducationSchema = z.object({
    roll_number: z.string().optional(),
    class_grade: z.string().min(1, 'Class/Grade is required'),
    section: z.string().optional(),
    session_year: z.string().optional(),
});

// 7. General Manufacturing (Discrete & Process)
export const IndustrySchema = z.object({
    production_line: z.string().optional(),
    quality_grade: z.string().optional(),
    machine_id: z.string().optional(),
    operator_id: z.string().optional(),
    wastage_percent: z.number().min(0).max(100).default(0),
});

// Master Domain Resolver mapping 55+ domains to specialized schemas
export const DomainSchemaResolver = {
    // Retail & Wholesale
    'retail-shop': TextileFashionSchema,
    'boutique-fashion': TextileFashionSchema,
    'garments': TextileFashionSchema,
    'leather-footwear': TextileFashionSchema,
    'textile-wholesale': TextileFashionSchema,
    'jewelry-shop': TechnicalPartsSchema, // Uses technical for certs/purity
    
    // Technical & Industrial
    'auto-parts': AutoPartsSchema,
    'electronics-appliances': TechnicalPartsSchema,
    'mobile-accessories': TechnicalPartsSchema,
    'heavy-machinery': TechnicalPartsSchema,
    'hardware-tool-store': TechnicalPartsSchema,
    'manufacturing-industrial': IndustrySchema,
    'textile-mill': IndustrySchema,
    'chemical-plant': HealthcareSchema,
    
    // Healthcare
    'pharmacy': HealthcareSchema,
    'hospital-healthcare': HealthcareSchema,
    'diagnostic-lab': HealthcareSchema,
    'chemical': HealthcareSchema,
    
    // Hospitality
    'restaurant-fast-food': HospitalitySchema,
    'cafe-bakery': HospitalitySchema,
    'hotel-hospitality': HospitalitySchema,
    
    // Agriculture
    'livestock-farm': AgricultureSchema,
    'poultry-farm': AgricultureSchema,
    'agriculture-inputs': AgricultureSchema,
    
    // Education
    'school-education': EducationSchema,
    'college-university': EducationSchema,
    'coaching-center': EducationSchema,
    
    // Real Estate & Services
    'real-estate-property': z.object({ unit_number: z.string(), floor: z.string().optional() }),
    'gym-fitness': z.object({ membership_id: z.string().optional() }),
};

/**
 * Utility to validate domain data based on business type
 */
export function validateDomainData(domain, data) {
    const schema = DomainSchemaResolver[domain];
    if (!schema) return { success: true, data }; // Fallback to raw if no vertical schema defined
    
    return schema.safeParse(data);
}
