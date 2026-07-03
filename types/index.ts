/**
 * TypeScript Type Definitions for Multi-Location Inventory System
 * Comprehensive types for production-ready type safety
 */

// ============================================================================
// Database Entity Types
// ============================================================================

export interface Business {
    id: string;
    user_id: string | null;
    business_name: string;
    email: string;
    phone: string | null;
    ntn: string | null;
    cnic: string | null;
    srn: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    postal_code: string | null;
    domain: string;
    category: string;
    logo_url: string | null;
    created_at: Date;
    updated_at: Date;
    currency: string;
    timezone: string;
    settings: Record<string, any>;
}

export interface WarehouseLocation {
    id: string;
    business_id: string;
    name: string;
    address: string | null;
    city: string | null;
    type: 'warehouse' | 'showroom' | 'hub' | 'cutting';
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    code: string | null;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    is_primary: boolean;
}

export interface Product {
    id: string;
    business_id: string;
    sku: string | null;
    barcode: string | null;
    name: string;
    description: string | null;
    category: string | null;
    brand: string | null;
    price: number;
    cost_price: number | null;
    mrp: number | null;
    stock: number;
    min_stock: number;
    min_stock_level: number;
    max_stock: number | null;
    reorder_point: number | null;
    reorder_quantity: number | null;
    unit: string;
    hsn_code: string | null;
    sac_code: string | null;
    tax_percent: number;
    image_url: string | null;
    is_active: boolean;
    domain_data: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    locations?: Record<string, number>; // locationId -> quantity mapping
}

export interface ProductStockLocation {
    id: string;
    business_id: string;
    product_id: string;
    warehouse_id: string;
    quantity: number;
    updated_at: Date;
}

export interface ProductBatch {
    id: string;
    business_id: string;
    product_id: string;
    warehouse_id: string | null;
    batch_number: string;
    manufacturing_date: Date | null;
    expiry_date: Date | null;
    quantity: number;
    reserved_quantity: number;
    cost_price: number;
    mrp: number;
    notes: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    domain_data: Record<string, any>;
}

export interface StockMovement {
    id: string;
    business_id: string;
    product_id: string;
    warehouse_id: string | null;
    transaction_type: string;
    reference_id: string | null;
    reference_type: string | null;
    quantity_change: number;
    unit_cost: number | null;
    notes: string | null;
    created_at: Date;
    batch_id: string | null;
    movement_type: string | null;
    domain_data: Record<string, any>;
}

export interface StockTransfer {
    id: string;
    business_id: string;
    transfer_number: string;
    product_id: string;
    batch_id: string | null;
    from_warehouse_id: string;
    to_warehouse_id: string;
    quantity: number;
    status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
    transfer_date: Date | null;
    actual_arrival_date: Date | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface InventoryLedger {
    id: string;
    business_id: string;
    warehouse_id: string | null;
    product_id: string | null;
    transaction_type: string;
    reference_id: string | null;
    reference_type: string | null;
    quantity_change: number;
    running_balance: number | null;
    unit_cost: number | null;
    total_value: number | null;
    batch_number: string | null;
    serial_number: string | null;
    notes: string | null;
    created_at: Date;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface MultiLocationInventoryProps {
    locations: WarehouseLocation[];
    products: Product[];
    businessId: string;
    onLocationAdd?: (data: CreateWarehouseLocationData) => Promise<void>;
    onLocationUpdate?: (locationId: string, updates: UpdateWarehouseLocationData) => Promise<void>;
    onLocationDelete?: (locationId: string) => Promise<void>;
    onStockTransfer?: (data: StockTransferData) => Promise<void>;
    category?: string;
    domainKnowledge?: DomainKnowledge;
    refreshData?: () => Promise<void>;
}

export interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onReset?: () => void;
}

// ============================================================================
// Server Action Input Types
// ============================================================================

export interface CreateWarehouseLocationData {
    business_id: string;
    name: string;
    address?: string;
    city?: string;
    type?: 'warehouse' | 'showroom' | 'hub' | 'cutting';
    code?: string;
    contactPerson?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
    is_active?: boolean;
    isPrimary?: boolean;
    is_primary?: boolean;
}

export interface UpdateWarehouseLocationData {
    name?: string;
    address?: string;
    city?: string;
    type?: 'warehouse' | 'showroom' | 'hub' | 'cutting';
    code?: string;
    contactPerson?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
    is_active?: boolean;
    isPrimary?: boolean;
    is_primary?: boolean;
}

export interface StockTransferData {
    from_location_id: string;
    to_location_id: string;
    business_id: string;
    items: Array<{
        product_id: string;
        quantity: number;
    }>;
    reason?: string;
}

export interface AddStockData {
    businessId: string;
    productId: string;
    warehouseId?: string;
    quantity: number;
    costPrice?: number;
    batchNumber?: string;
    manufacturingDate?: string | Date;
    expiryDate?: string | Date;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
    domainData?: Record<string, any>;
}

export interface RemoveStockData {
    businessId: string;
    productId: string;
    warehouseId?: string;
    quantity: number;
    valuationMethod?: 'FIFO' | 'FEFO' | 'LIFO' | 'AVG';
    referenceType?: string;
    referenceId?: string;
    notes?: string;
}

// ============================================================================
// Server Action Response Types
// ============================================================================

export interface ServerActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface StockOperationResponse {
    success: boolean;
    newStock?: number;
    newCostPrice?: number;
    batchId?: string;
    movementId?: string;
    costOfGoodsSold?: number;
    error?: string;
}

// ============================================================================
// Domain Knowledge Types
// ============================================================================

export interface DomainKnowledge {
    name: string;
    icon: string;
    units: string[];
    defaultTax: number;
    productFields: ProductField[];
    paymentTerms: string[];
    inventoryFeatures: string[];
    reports: string[];
    setupTemplate: {
        categories: string[];
        suggestedProducts: Array<{
            name: string;
            category: string;
            unit: string;
        }>;
    };
}

export interface ProductField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date';
    required?: boolean;
    options?: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Sales & Customers
// ============================================================================

export interface Customer {
    id: string;
    business_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    ntn: string | null;
    cnic: string | null;
    srn: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    country: string;
    credit_limit: number;
    outstanding_balance: number;
    created_at: Date;
    updated_at: Date;
    domain_data: Record<string, any>;
    opening_balance: number;
    filer_status: string;
    type?: string | null;
    notes?: string | null;
    is_active?: boolean;
    is_deleted?: boolean;
}

export interface InvoiceItem {
    id: string;
    business_id: string;
    invoice_id: string;
    product_id: string | null;
    name: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    tax_percent: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    metadata: Record<string, any>;
}

export interface Invoice {
    id: string;
    business_id: string;
    invoice_number: string;
    customer_id: string | null;
    date: Date;
    due_date: Date | null;
    subtotal: number;
    total_tax: number;
    total_amount: number;
    status: string; // 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'sent' | 'partial' | 'voided';
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    tax_total: number;
    discount_total: number;
    grand_total: number;
    payment_method: string | null;
    payment_status: string | null;
    terms: string | null;
    tax_details: Record<string, any>;
    items?: InvoiceItem[];
    amount?: number; // fallback for legacy code
    customer?: Customer; // Relation
    balance?: number; // Remaining balance calculated from invoice_payments
    is_deleted?: boolean;
}
