
import { z } from 'zod';

/**
 * Validation Schemas for Financial Hub
 * Using Zod for type-safe validation across frontend and backend.
 * This is the CONSOLIDATED source of truth for all system validations.
 */

// ============================================
// Common Schemas
// ============================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const businessIdSchema = z.object({
    businessId: uuidSchema
});

export const paginationSchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// ============================================
// Product Schemas
// ============================================

export const productSchema = z.object({
    name: z.string().min(1, "Product name is required").max(255, "Name too long"),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    unit: z.string().min(1, "Unit is required").default("pcs"),

    // Pricing - all must be non-negative
    price: z.number().min(0, "Price must be non-negative"),
    cost_price: z.number().min(0, "Cost price must be non-negative").optional().nullable(),
    mrp: z.number().min(0, "MRP must be non-negative").optional().nullable(),

    // Stock levels
    stock: z.number().min(0, "Stock cannot be negative").default(0),
    min_stock: z.number().min(0).optional().nullable(),
    max_stock: z.number().min(0).optional().nullable(),
    reorder_point: z.number().min(0).optional().nullable(),
    reorder_quantity: z.number().min(0).optional().nullable(),

    // Tax
    tax_percent: z.number().min(0).max(100, "Tax cannot exceed 100%").default(17),
    hsn_code: z.string().optional().nullable(),
    sac_code: z.string().optional().nullable(),

    // Required IDs
    business_id: z.string().uuid("Invalid business ID"),

    // Optional fields
    image_url: z.string().url().optional().nullable().or(z.literal('')),
    is_active: z.boolean().default(true),
    domain_data: z.record(z.any()).optional().nullable(),
    unit_conversions: z.record(z.number()).optional().nullable().default({}),

    // Dates
    expiry_date: z.union([z.string(), z.date()]).optional().nullable().transform(val => val === '' ? null : val),
    manufacturing_date: z.union([z.string(), z.date()]).optional().nullable().transform(val => val === '' ? null : val),

    // Arrays for Relational Creation (Batches, Serials, Variants)
    // These are passed through validation to be handled by createProductAction
    batches: z.array(z.any()).optional().default([]),
    serial_numbers: z.array(z.any()).optional().default([]), // snake_case
    serialNumbers: z.array(z.any()).optional().default([]),  // camelCase alias
    variants: z.array(z.any()).optional().default([]),
}).refine(data => {
    // MRP should be >= selling price
    if (data.mrp && data.price && data.mrp < data.price) {
        return false;
    }
    return true;
}, {
    message: "MRP must be greater than or equal to selling price",
    path: ["mrp"]
}).refine(data => {
    // Max stock should be >= min stock
    if (data.max_stock && data.min_stock && data.max_stock < data.min_stock) {
        return false;
    }
    return true;
}, {
    message: "Max stock must be greater than or equal to min stock",
    path: ["max_stock"]
});

export const variantSchema = z.object({
    business_id: z.string().uuid("Invalid business ID"),
    product_id: z.string().uuid("Invalid product ID"),
    variant_sku: z.string().min(1, "Variant SKU is required").max(100),
    variant_name: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    pattern: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
    custom_attributes: z.record(z.any()).optional().nullable().default({}),
    price: z.number().min(0).default(0),
    cost_price: z.number().min(0).default(0),
    mrp: z.number().min(0).default(0),
    stock: z.number().min(0).default(0),
    min_stock: z.number().min(0).default(0),
    image_url: z.string().url().optional().nullable().or(z.literal(''))
});

export const batchSchema = z.object({
    business_id: z.string().uuid("Invalid business ID"),
    product_id: z.string().uuid("Invalid product ID"),
    batch_number: z.string().min(1, "Batch number is required").max(100),
    quantity: z.number().min(0).default(0),
    manufacturing_date: z.union([z.string(), z.date()]).optional().nullable().transform(val => val === '' ? null : val),
    expiry_date: z.union([z.string(), z.date()]).optional().nullable().transform(val => val === '' ? null : val),
    cost_price: z.number().min(0).default(0),
    mrp: z.number().min(0).default(0),
    warehouse_id: z.string().uuid("Invalid warehouse ID").optional().nullable(),
    is_active: z.boolean().default(true)
});

export const serialSchema = z.object({
    business_id: z.string().uuid("Invalid business ID"),
    product_id: z.string().uuid("Invalid product ID"),
    serial_number: z.string().min(1, "Serial number is required").max(100),
    status: z.enum(['in_stock', 'sold', 'returned', 'damaged', 'reserved']).default('in_stock'),
    notes: z.string().optional().nullable()
});

export const bulkSerialsSchema = z.object({
    business_id: z.string().uuid("Invalid business ID"),
    product_id: z.string().uuid("Invalid product ID"),
    serials: z.array(z.string().min(1)).min(1, "At least one serial number is required")
});

// Alias for createProductAction compatibility
export const createProductSchema = productSchema;

// ============================================
// Invoice Schemas
// ============================================

export const invoiceItemSchema = z.object({
    product_id: z.string().uuid("Invalid product ID").optional().nullable(),
    name: z.string().min(1, "Item name is required"),
    description: z.string().optional().nullable(),
    quantity: z.number().positive("Quantity must be positive"),
    unit_price: z.number().min(0, "Unit price must be non-negative"),
    tax_percent: z.number().min(0).max(100).default(17),
    tax_amount: z.number().min(0).optional(),
    discount_amount: z.number().min(0).default(0),
    total_amount: z.number().min(0).optional(),
    metadata: z.record(z.any()).optional().nullable().default({}),
});

export const invoiceSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    customer_id: z.string().uuid().optional().nullable(),
    invoice_number: z.string().min(1, "Invoice number is required"),
    date: z.union([z.string(), z.date()]),
    due_date: z.union([z.string(), z.date()]).optional().nullable(),

    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),

    subtotal: z.number().min(0).default(0),
    total_tax: z.number().min(0).default(0),
    discount_total: z.number().min(0).default(0),
    grand_total: z.number().min(0),

    status: z.enum(['draft', 'sent', 'paid', 'cancelled', 'overdue']).default('draft'),
    payment_status: z.string().optional().nullable(),
    payment_method: z.string().optional().nullable(),

    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    tax_details: z.record(z.any()).optional().nullable().default({}),
    domain_data: z.record(z.any()).optional().nullable().default({}),
}).refine(data => {
    // Due date should be after invoice date
    if (data.due_date && data.date && new Date(data.due_date) < new Date(data.date)) {
        return false;
    }
    return true;
}, {
    message: "Due date must be after invoice date",
    path: ["due_date"]
});

export const createInvoiceSchema = invoiceSchema;

// ============================================
// Stock Movement & Adjustment Schemas
// ============================================

export const addStockSchema = z.object({
    business_id: uuidSchema,
    product_id: uuidSchema,
    warehouse_id: uuidSchema.optional().nullable(),
    quantity: z.number().positive('Quantity must be positive'),
    cost_price: z.number().nonnegative('Cost price cannot be negative').optional(),
    batch_number: z.string().max(100).optional().nullable(),
    manufacturing_date: z.union([z.string(), z.date()]).optional().transform(val => val === '' ? null : val),
    expiry_date: z.union([z.string(), z.date()]).optional().transform(val => val === '' ? null : val),
    notes: z.string().max(500).optional(),
    reference_type: z.string().max(50).default('purchase'),
    reference_id: uuidSchema.optional(),
    domain_data: z.record(z.any()).default({}),
    serial_numbers: z.array(z.string()).optional(),
    unit: z.string().optional(),
    state: z.string().optional().default('sellable')
});

export const removeStockSchema = z.object({
    business_id: uuidSchema,
    product_id: uuidSchema,
    warehouse_id: uuidSchema.optional().nullable(),
    quantity: z.number().positive('Quantity must be positive'),
    valuation_method: z.enum(['FIFO', 'FEFO', 'LIFO', 'AVG']).default('FIFO'),
    reference_type: z.string().max(50).default('sale'),
    reference_id: uuidSchema.optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    serial_numbers: z.array(z.string()).optional().nullable(),
    batch_id: uuidSchema.optional().nullable(),
    unit: z.string().optional().nullable(),
    state: z.string().optional().default('sellable')
});

export const transferStockSchema = z.object({
    business_id: uuidSchema,
    product_id: uuidSchema,
    from_warehouse_id: uuidSchema,
    to_warehouse_id: uuidSchema,
    quantity: z.number().positive('Quantity must be positive'),
    batch_id: uuidSchema.optional(),
    serial_numbers: z.array(z.string()).optional(),
    notes: z.string().max(500).optional()
}).refine(
    (data) => data.from_warehouse_id !== data.to_warehouse_id,
    { message: 'Source and destination warehouses must be different' }
);

export const reserveStockSchema = z.object({
    business_id: uuidSchema,
    product_id: uuidSchema,
    quantity: z.number().positive(),
    warehouse_id: uuidSchema.optional(),
    batch_id: uuidSchema.optional(),
    expires_at: z.coerce.date().optional(),
    reference: z.string().max(500).optional()
});

export const releaseStockSchema = z.object({
    business_id: uuidSchema,
    reservation_id: uuidSchema.optional(),
    batch_id: uuidSchema.optional(),
    quantity: z.number().positive()
}).refine(
    (data) => Boolean(data.reservation_id || data.batch_id),
    { message: 'Either reservation_id or batch_id is required' }
);

export const adjustStockSchema = z.object({
    business_id: uuidSchema,
    product_id: uuidSchema,
    warehouse_id: uuidSchema.optional(),
    quantity_change: z.number().refine(val => val !== 0, 'Quantity change cannot be zero'),
    serial_numbers: z.array(z.string()).optional(),
    reason: z.string().min(1, 'Reason is required').max(100),
    notes: z.string().max(500).optional()
});

// ============================================
// Warehouse/Location Schemas
// ============================================

export const createWarehouseLocationSchema = z.object({
    business_id: uuidSchema,
    name: z.string().min(1, 'Location name is required').max(100),
    address: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    type: z.enum(['warehouse', 'showroom', 'hub', 'cutting']).default('warehouse'),
    code: z.string().max(50).optional(),
    contact_person: z.string().max(100).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email('Invalid email format').max(100).optional(),
    is_active: z.boolean().default(true),
    is_primary: z.boolean().default(false)
});

// ============================================
// Payment Schemas
// ============================================

export const paymentSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    amount: z.number().positive("Amount must be positive"),

    payment_type: z.enum(['received', 'paid'], {
        errorMap: () => ({ message: "Payment type must be 'received' or 'paid'" })
    }),
    payment_mode: z.enum(['cash', 'cheque', 'bank_transfer', 'card', 'other']).optional().nullable(),
    payment_date: z.union([z.string(), z.date()]),

    reference_type: z.string().optional().nullable(),
    reference_id: z.string().uuid().optional().nullable(),

    customer_id: z.string().uuid().optional().nullable(),
    vendor_id: z.string().uuid().optional().nullable(),

    bank_name: z.string().optional().nullable(),
    cheque_number: z.string().optional().nullable(),
    transaction_id: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
}).refine(data => {
    // Either customer or vendor must be provided
    return data.customer_id || data.vendor_id;
}, {
    message: "Either customer or vendor is required",
    path: ["customer_id"]
});

/**
 * Payment Allocation Schema
 * Validates payment allocations to invoices or purchases
 * 
 * Business Rules:
 * 1. Exactly one of invoice_id or purchase_id must be provided
 * 2. Amount must be positive
 * 3. Payment ID is required
 */
export const paymentAllocationSchema = z.object({
    payment_id: z.string().uuid("Payment ID is required"),
    invoice_id: z.string().uuid("Invalid invoice ID").optional().nullable(),
    purchase_id: z.string().uuid("Invalid purchase ID").optional().nullable(),
    amount: z.number().positive("Allocation amount must be positive"),
    notes: z.string().optional().nullable(),
}).refine(data => {
    // Exactly one of invoice_id or purchase_id must be provided
    const hasInvoice = !!data.invoice_id;
    const hasPurchase = !!data.purchase_id;
    return (hasInvoice && !hasPurchase) || (!hasInvoice && hasPurchase);
}, {
    message: "Exactly one of invoice_id or purchase_id must be provided",
    path: ["invoice_id"]
});

/**
 * Batch Payment Allocation Schema
 * For allocating a single payment across multiple invoices/purchases
 */
export const batchPaymentAllocationSchema = z.object({
    payment_id: z.string().uuid("Payment ID is required"),
    allocations: z.array(z.object({
        invoice_id: z.string().uuid().optional().nullable(),
        purchase_id: z.string().uuid().optional().nullable(),
        amount: z.number().positive("Allocation amount must be positive"),
        notes: z.string().optional().nullable(),
    }).refine(data => {
        const hasInvoice = !!data.invoice_id;
        const hasPurchase = !!data.purchase_id;
        return (hasInvoice && !hasPurchase) || (!hasInvoice && hasPurchase);
    }, {
        message: "Each allocation must have exactly one of invoice_id or purchase_id",
        path: ["invoice_id"]
    })).min(1, "At least one allocation is required"),
}).refine(data => {
    // Sum of allocations should not exceed payment amount (validated server-side with actual payment)
    return data.allocations.every(a => a.amount > 0);
}, {
    message: "All allocation amounts must be positive",
    path: ["allocations"]
});

// ============================================
// Customer/Vendor Schemas
// ============================================

export const customerSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    name: z.string().min(1, "Name is required").max(255),
    email: z.string().email("Invalid email").optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),
    contact_person: z.string().optional().nullable(),

    ntn: z.string().optional().nullable(),
    cnic: z.string().optional().nullable(),
    srn: z.string().optional().nullable(),

    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pincode: z.string().optional().nullable(),
    country: z.string().default("Pakistan"),

    credit_limit: z.number().min(0).default(0),
    outstanding_balance: z.number().default(0),
    opening_balance: z.number().default(0),

    filer_status: z.enum(['filer', 'non-filer', 'active', 'inactive', 'none']).default('none'),
    domain_data: z.record(z.any()).optional().nullable(),
});

export const vendorSchema = customerSchema;

// ============================================
// Quotation Schemas
// ============================================

export const quotationItemSchema = z.object({
    product_id: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().positive("Quantity must be positive"),
    unit_price: z.number().min(0, "Unit price must be non-negative"),
    tax_amount: z.number().min(0).default(0),
    total_amount: z.number().min(0).optional(),
    batch_number: z.string().optional().nullable(),
    serial_number: z.string().optional().nullable(),
});

export const quotationSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    customer_id: z.string().uuid().optional().nullable(),
    quotation_number: z.string().min(1, "Quotation number is required"),
    date: z.union([z.string(), z.date()]).optional(),
    valid_until: z.union([z.string(), z.date()]).optional().nullable(),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),

    items: z.array(quotationItemSchema).min(1, "At least one item is required"),

    subtotal: z.number().min(0).default(0),
    tax_total: z.number().min(0).default(0),
    grand_total: z.number().min(0),

    notes: z.string().optional().nullable(),
    terms: z.string().optional().nullable(),
    domain_data: z.record(z.any()).optional().nullable().default({}),
}).refine(data => {
    // Valid until should be after quotation date
    if (data.valid_until && data.date && new Date(data.valid_until) < new Date(data.date)) {
        return false;
    }
    return true;
}, {
    message: "Valid until date must be after quotation date",
    path: ["valid_until"]
});

// ============================================
// Sales Order Schemas
// ============================================

export const salesOrderItemSchema = z.object({
    product_id: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().positive("Quantity must be positive"),
    unit_price: z.number().min(0, "Unit price must be non-negative"),
    tax_amount: z.number().min(0).default(0),
    total_amount: z.number().min(0).optional(),
    batch_number: z.string().optional().nullable(),
    serial_number: z.string().optional().nullable(),
    expiry_date: z.union([z.string(), z.date()]).optional().nullable().transform(val => val === '' ? null : val),
});

export const salesOrderSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    quotation_id: z.string().uuid().optional().nullable(),
    customer_id: z.string().uuid().optional().nullable(),
    order_number: z.string().min(1, "Order number is required"),
    date: z.union([z.string(), z.date()]).optional(),
    delivery_date: z.union([z.string(), z.date()]).optional().nullable(),
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
    payment_status: z.enum(['pending', 'partial', 'paid', 'refunded']).default('pending'),

    items: z.array(salesOrderItemSchema).min(1, "At least one item is required"),

    subtotal: z.number().min(0).default(0),
    tax_total: z.number().min(0).default(0),
    grand_total: z.number().min(0),

    notes: z.string().optional().nullable(),
    shipping_address: z.string().optional().nullable(),
    domain_data: z.record(z.any()).optional().nullable().default({}),
}).refine(data => {
    // Delivery date should be after order date
    if (data.delivery_date && data.date && new Date(data.delivery_date) < new Date(data.date)) {
        return false;
    }
    return true;
}, {
    message: "Delivery date must be after order date",
    path: ["delivery_date"]
});

// ============================================
// Delivery Challan Schemas
// ============================================

export const deliveryChallanItemSchema = z.object({
    product_id: z.string().uuid().optional().nullable(),
    name: z.string().optional().nullable(),
    quantity: z.number().positive("Quantity must be positive"),
    batch_id: z.string().uuid().optional().nullable(),
    serial_numbers: z.array(z.string()).optional().default([]),
});

export const deliveryChallanSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    sales_order_id: z.string().uuid().optional().nullable(),
    customer_id: z.string().uuid().optional().nullable(),
    challan_number: z.string().min(1, "Challan number is required"),
    date: z.union([z.string(), z.date()]).optional(),
    status: z.enum(['issued', 'in_transit', 'delivered', 'returned']).default('issued'),

    items: z.array(deliveryChallanItemSchema).min(1, "At least one item is required"),

    driver_name: z.string().optional().nullable(),
    vehicle_number: z.string().optional().nullable(),
    delivery_address: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    domain_data: z.record(z.any()).optional().nullable().default({}),
});

// ============================================
// Purchase Schemas
// ============================================

export const purchaseItemSchema = z.object({
    product_id: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().positive("Quantity must be positive"),
    unit_cost: z.number().min(0, "Unit cost must be non-negative"),
    tax_rate: z.number().min(0).max(100).default(0),
    total_amount: z.number().min(0).optional(),
    batch_id: z.string().uuid().optional().nullable(),
});

export const purchaseSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    vendor_id: z.string().uuid().optional().nullable(),
    purchase_number: z.string().min(1, "Purchase number is required"),
    date: z.union([z.string(), z.date()]),
    warehouse_id: z.string().uuid().optional().nullable(),
    status: z.enum(['pending', 'ordered', 'received', 'cancelled']).default('pending'),

    items: z.array(purchaseItemSchema).min(1, "At least one item is required"),

    subtotal: z.number().min(0).default(0),
    tax_total: z.number().min(0).default(0),
    total_amount: z.number().min(0),

    notes: z.string().optional().nullable(),
    domain_data: z.record(z.any()).optional().nullable().default({}),
});

// ============================================
// BOM (Bill of Materials) Schemas
// ============================================

export const bomMaterialSchema = z.object({
    material_id: z.string().uuid("Material ID is required"),
    quantity: z.number().positive("Quantity must be positive"),
    unit: z.string().optional().nullable(),
});

export const bomSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    product_id: z.string().uuid("Product ID is required"),
    name: z.string().min(1, "BOM name is required"),
    output_quantity: z.number().positive("Output quantity must be positive").default(1),
    version: z.string().default("1.0"),

    materials: z.array(bomMaterialSchema).min(1, "At least one material is required"),

    notes: z.string().optional().nullable(),
    domain_data: z.record(z.any()).optional().nullable().default({}),
});

// ============================================
// Production Order Schemas
// ============================================

export const productionOrderSchema = z.object({
    business_id: z.string().uuid("Business ID is required"),
    bom_id: z.string().uuid().optional().nullable(),
    product_id: z.string().uuid().optional().nullable(),
    quantity_to_produce: z.number().positive("Quantity must be positive"),
    warehouse_id: z.string().uuid().optional().nullable(),
    status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),

    scheduled_date: z.union([z.string(), z.date()]).optional().nullable(),
    start_date: z.union([z.string(), z.date()]).optional().nullable(),
    due_date: z.union([z.string(), z.date()]).optional().nullable(),

    batch_number: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    domain_data: z.record(z.any()).optional().nullable().default({}),
}).refine(data => {
    // Due date should be after start date
    if (data.due_date && data.start_date && new Date(data.due_date) < new Date(data.start_date)) {
        return false;
    }
    return true;
}, {
    message: "Due date must be after start date",
    path: ["due_date"]
}).refine(data => {
    // Must have either BOM or product
    return data.bom_id || data.product_id;
}, {
    message: "Either BOM or Product must be specified",
    path: ["bom_id"]
});

// ============================================
// Finance Schemas
// ============================================

export const expenseSchema = z.object({
    businessId: uuidSchema,
    accountId: uuidSchema.describe("GL Account UUID for the expense category"),
    category: z.string().optional().nullable(),
    amount: z.number().positive("Amount must be positive"),
    taxAmount: z.number().min(0, "Tax amount must be non-negative").default(0),
    vendorId: uuidSchema.optional().nullable(),
    paymentMethod: z.enum(['cash', 'bank', 'credit']).default('cash'),
    date: z.union([z.string().min(1, "Date is required"), z.date()]),
    description: z.string().max(500).optional().nullable(),
    receiptUrl: z.string().url("Invalid receipt URL").optional().nullable().or(z.literal('')),
});

export const glEntryLineSchema = z.object({
    account_id: uuidSchema.optional(),
    accountCode: z.string().optional(),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
}).refine(data => data.account_id || data.accountCode, {
    message: "Either account_id or accountCode is required",
}).refine(data => data.debit > 0 || data.credit > 0, {
    message: "Entry must have a non-zero debit or credit",
});

export const journalEntrySchema = z.object({
    businessId: uuidSchema,
    date: z.union([z.string(), z.date()]).optional(),
    description: z.string().min(1, "Description is required").max(500),
    referenceType: z.string().optional().nullable(),
    referenceId: z.string().optional().nullable(),
    createdBy: z.string().optional().nullable(),
    entries: z.array(glEntryLineSchema).min(2, "A journal entry must have at least 2 lines (debit + credit)"),
});

export const payrollRunSchema = z.object({
    businessId: uuidSchema,
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2099),
    employeeIds: z.array(uuidSchema).optional(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Simple validation helper that throws ZodError on failure
 */
export function validateSchema(schema, data) {
    return schema.parse(data);
}

/**
 * Validate data against a schema and return formatted errors
 */
export function validateWithSchema(schema, data) {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = {};
            error.errors.forEach(err => {
                const path = err.path.join('.');
                formattedErrors[path] = err.message;
            });
            return {
                success: false,
                errors: formattedErrors,
                details: error.errors
            };
        }
        return {
            success: false,
            errors: { _general: error.message }
        };
    }
}

/**
 * Safe parse - returns null if validation fails
 */
export function safeParse(schema, data) {
    const result = schema.safeParse(data);
    return result.success ? result.data : null;
}
