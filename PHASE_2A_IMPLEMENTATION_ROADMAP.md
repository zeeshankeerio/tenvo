# Phase 2a Implementation Roadmap
**Target**: Complete all gaps across pages, flow, and architecture  
**Timeline**: 3 weeks  
**Status**: Ready for execution  

---

## Week 1: Core Integrations (Batch-Serial-Reservation)

### Day 1: Monday - Gap 2 (Batch-Serial Linkage) - 4 hours

#### Step 1: Modify EnhancedInvoiceBuilder.jsx

**File**: `components/invoice/EnhancedInvoiceBuilder.jsx`

**Changes**:
1. Import batch and serial services
2. Add batch selection dropdown
3. Add serial selection modal
4. Pass batch_id and serial_id to invoice items

**Code Template**:
```javascript
import { selectBatchesForSale } from '@/lib/services/batchAllocation';
import { getAvailableSerials } from '@/lib/services/serialIntegration';

export function EnhancedInvoiceBuilder() {
  // When user adds line item
  const handleAddLineItem = async (productId, quantity) => {
    const product = await getProduct(productId);
    
    // Get available batches (FIFO)
    if (product.is_batch_tracked) {
      const batches = await selectBatchesForSale(
        productId,
        quantity,
        businessId
      );
      
      // Show batch selection UI
      return showBatchSelector(batches);
    }
    
    // Get available serials
    if (product.is_serial_tracked) {
      const serials = await getAvailableSerials(
        productId,
        businessId,
        quantity
      );
      
      // Show serial selection modal
      return showSerialSelector(serials);
    }
    
    // Neither - add directly
    addLineItem({ productId, quantity });
  };
  
  // When confirming line item
  const handleConfirmLineItem = (productId, quantity, batchId, serialIds) => {
    addLineItem({
      productId,
      quantity,
      batchId,      // NEW
      serialIds    // NEW
    });
  };
}
```

**Files Affected**: 1
**Testing**: Manual - Create invoice with batch/serial selection

---

#### Step 2: Modify invoice/create.js

**File**: `lib/actions/standard/invoice/create.js`

**Changes**:
1. Import batchAllocation and serialIntegration services
2. Add batch selection logic for each item
3. Create stock_movements with batch_id
4. Update product_serials.status = 'sold'
5. Complete reservations

**Code Template**:
```javascript
import { createBatchStockMovement } from '@/lib/services/batchAllocation';
import { allocateSerialToInvoice } from '@/lib/services/serialIntegration';
import { completeReservation } from '@/lib/services/reservationManagement';

export async function createInvoice(data, businessId) {
  // ... existing invoice creation ...
  
  const invoice = await db.invoices.create({
    data: {
      business_id: businessId,
      customer_id: data.customerId,
      date: new Date(),
      // ... other fields
    }
  });
  
  // Process each item
  for (const item of data.items) {
    // 1. Create invoice_item with batch_id and serial_id
    const invoiceItem = await db.invoice_items.create({
      data: {
        invoice_id: invoice.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        batch_id: item.batchId,        // NEW
        serial_id: item.serialIds?.[0] // NEW (first serial)
      }
    });
    
    // 2. If batch-tracked: create movement with batch
    if (item.batchId) {
      await createBatchStockMovement({
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        businessId,
        transactionType: 'sale',
        referenceType: 'invoice',
        referenceId: invoice.id
      });
    }
    
    // 3. If serial-tracked: allocate serials
    if (item.serialIds?.length > 0) {
      await allocateSerialToInvoice({
        serialIds: item.serialIds,
        invoiceId: invoice.id,
        customerId: data.customerId,
        businessId,
        saleDate: invoice.date
      });
    }
    
    // 4. Create standard stock movement (already existing)
    await db.stock_movements.create({
      product_id: item.productId,
      batch_id: item.batchId,          // NEW
      serial_id: item.serialIds?.[0],  // NEW
      quantity_change: -item.quantity,
      transaction_type: 'sale',
      reference_type: 'invoice',
      reference_id: invoice.id,
      business_id: businessId
    });
  }
  
  // 5. Complete reservations
  if (data.quotationId) {
    const quotation = await db.quotations.findUnique({
      where: { id: data.quotationId },
      include: { quotation_items: true }
    });
    
    for (const qitem of quotation.quotation_items) {
      const reservation = await db.inventory_reservations.findFirst({
        where: {
          product_id: qitem.product_id,
          reference_id: data.quotationId,
          status: 'active'
        }
      });
      
      if (reservation) {
        await completeReservation(reservation.id, businessId, {
          invoiceId: invoice.id
        });
      }
    }
  }
  
  return invoice;
}
```

**Files Affected**: 1  
**Testing**: Unit test + integration test

---

#### Step 3: Database Migration

**File**: `prisma/migrations/add_batch_serial_linkage.sql`

**Changes**:
```sql
-- Add batch_id to stock_movements
ALTER TABLE stock_movements
ADD COLUMN batch_id UUID REFERENCES product_batches(id);

-- Add batch_id and serial_id to invoice_items
ALTER TABLE invoice_items
ADD COLUMN batch_id UUID REFERENCES product_batches(id),
ADD COLUMN serial_id UUID REFERENCES product_serials(id);

-- Create indexes for performance
CREATE INDEX idx_stock_movements_batch_id ON stock_movements(batch_id);
CREATE INDEX idx_invoice_items_batch_id ON invoice_items(batch_id);
CREATE INDEX idx_invoice_items_serial_id ON invoice_items(serial_id);
```

**Testing**: Run migration in dev, verify columns created

---

### Day 2: Tuesday - Gap 4 (Multi-Tenant Safety) + Gap 6 (Domain Validation) - 5 hours

#### Step 1: Fix Bulk Operations (Gap 4)

**File**: `lib/actions/premium/automation/bulk.js`

**Changes**: Add business_id verification before all deletes/updates

```javascript
export async function deleteBulkProducts(productIds, businessId) {
  // CRITICAL: Verify ALL products belong to this business
  const verified = await db.products.findMany({
    where: {
      id: { in: productIds },
      business_id: businessId  // ← KEY CHECK
    },
    select: { id: true }
  });
  
  if (verified.length !== productIds.length) {
    throw new MultiTenantViolationError(
      'products',
      businessId,
      productIds.length,
      verified.length
    );
  }
  
  // Only proceed if ALL verified
  const result = await db.products.updateMany({
    where: { id: { in: productIds } },
    data: {
      is_deleted: true,
      deleted_at: new Date()
    }
  });
  
  // Log audit
  await auditLog({
    businessId,
    action: 'bulk_delete_products',
    resourceType: 'product',
    count: result.count,
    resourceIds: productIds
  });
  
  return result;
}

// Apply same pattern to:
// - deleteBulkInvoices
// - deleteBulkCustomers
// - updateBulkProducts
```

**Files Affected**: 1  
**Testing**: Try cross-tenant delete (should fail)

---

#### Step 2: Add Domain Data Validation (Gap 6)

**File**: `lib/utils/validation/domainDataValidator.js` (NEW)

```javascript
import { z } from 'zod';
import { BusinessError } from '@/lib/errors/BusinessError';

// Define schema for batch tracking
const batchDataSchema = z.object({
  batch_number: z.string().min(1),
  batch_quantity: z.number().positive(),
  expiry_date: z.string().datetime(),
  manufacturing_date: z.string().datetime().optional(),
  cost_per_unit: z.number().nonnegative(),
  batch_status: z.enum(['active', 'expired', 'damaged']).optional()
});

// Define schema for serial tracking
const serialDataSchema = z.object({
  serial_number: z.string().min(1),
  warranty_months: z.number().positive().optional(),
  status: z.enum(['in_stock', 'sold', 'returned']).optional()
});

// Define domain schemas
const domainSchemas = {
  'pharmacy': z.object({
    batch_tracking: batchDataSchema.optional(),
    schedule_type: z.enum(['OTC', 'Rx', 'Schedule H']).optional()
  }),
  'retail': z.object({
    serial_tracking: serialDataSchema.optional(),
    color: z.string().optional(),
    size: z.string().optional()
  }),
  'restaurant': z.object({
    batch_tracking: batchDataSchema.optional(),
    ingredient_type: z.string().optional()
  })
};

export function validateDomainData(domain, data) {
  if (!data) return null;
  
  const schema = domainSchemas[domain];
  if (!schema) {
    throw new BusinessError(
      'UNKNOWN_DOMAIN',
      `Domain '${domain}' not recognized`
    );
  }
  
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BusinessError(
      'INVALID_DOMAIN_DATA',
      'Invalid domain data',
      { errors: result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    );
  }
  
  return result.data;
}
```

**File**: `lib/services/batchAllocation.js` (MODIFY)

Add validation:
```javascript
import { validateDomainData } from '@/lib/utils/validation/domainDataValidator';

export async function selectBatchesForSale(productId, quantity, businessId) {
  const product = await db.products.findUnique({
    where: { id: productId, business_id: businessId }
  });
  
  if (!product) throw new BusinessError('PRODUCT_NOT_FOUND', '...');
  
  // Validate domain data if present
  if (product.domain_data) {
    validateDomainData(product.domain, product.domain_data);
  }
  
  // ... rest of function
}
```

**Files Affected**: 2  
**Testing**: Try invalid domain data (should throw)

---

### Day 3: Wednesday - Gap 5 (Payment XOR) + Gap 7 & 8 (Error/Response) - 4 hours

#### Step 1: Payment Allocation XOR (Gap 5)

**File**: `prisma/schema.prisma` (MODIFY)

```prisma
model payment_allocations {
  id              String    @id @default(cuid())
  business_id     String
  invoice_id      String?
  purchase_id     String?
  amount          Decimal   @db.Decimal(15, 2)
  allocation_date DateTime  @default(now())
  
  invoice         invoices?           @relation(fields: [invoice_id], references: [id])
  purchase        purchase_orders?    @relation(fields: [purchase_id], references: [id])
  
  // ← ADD THIS CHECK CONSTRAINT
  @@check("(invoice_id IS NOT NULL AND purchase_id IS NULL) OR (invoice_id IS NULL AND purchase_id IS NOT NULL)")
  @@unique([business_id, invoice_id, purchase_id])
}
```

**File**: `prisma/migrations/add_payment_xor.sql` (NEW)

```sql
ALTER TABLE payment_allocations
ADD CONSTRAINT payment_allocation_xor_check CHECK (
  (invoice_id IS NOT NULL AND purchase_id IS NULL) 
  OR 
  (invoice_id IS NULL AND purchase_id IS NOT NULL)
);
```

**Files Affected**: 2  
**Testing**: Try setting both invoice_id and purchase_id (should fail)

---

#### Step 2: Error Handling Framework (Gap 7)

**File**: `lib/errors/BusinessError.js` (NEW)

```javascript
export class BusinessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'BusinessError';
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export class InsufficientStockError extends BusinessError {
  constructor(productId, needed, available) {
    super(
      'INSUFFICIENT_STOCK',
      `Not enough stock for ${productId}: need ${needed}, available ${available}`,
      { productId, needed, available }
    );
  }
}

export class BatchExpiredError extends BusinessError {
  constructor(batchId, expiryDate) {
    super('BATCH_EXPIRED', `Batch ${batchId} expired on ${expiryDate}`, {
      batchId,
      expiryDate
    });
  }
}

export class SerialAlreadySoldError extends BusinessError {
  constructor(serialNumber) {
    super('SERIAL_ALREADY_SOLD', `Serial ${serialNumber} already sold`, {
      serialNumber
    });
  }
}

export class MultiTenantViolationError extends BusinessError {
  constructor(resource, requestedTenant, actualTenant) {
    super(
      'MULTI_TENANT_VIOLATION',
      `Unauthorized access to ${resource}`,
      { resource, requestedTenant, actualTenant }
    );
  }
}

export class WarrantyExpiredError extends BusinessError {
  constructor(serialNumber, expiryDate) {
    super('WARRANTY_EXPIRED', `Warranty expired on ${expiryDate}`, {
      serialNumber,
      expiryDate
    });
  }
}
```

**Files Affected**: 1  
**Testing**: Throw different error types, catch correctly

---

#### Step 3: API Response Standardization (Gap 8)

**File**: `lib/utils/responseFormatter.js` (NEW)

```javascript
export function successResponse(data, options = {}) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...options
  };
}

export function errorResponse(error, options = {}) {
  if (error instanceof BusinessError) {
    return {
      success: false,
      error: error.toJSON(),
      timestamp: new Date().toISOString(),
      ...options
    };
  }
  
  return {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Unknown error',
      details: {}
    },
    timestamp: new Date().toISOString(),
    ...options
  };
}

export function paginatedResponse(items, page, pageSize, total, options = {}) {
  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    },
    timestamp: new Date().toISOString(),
    ...options
  };
}
```

**File**: `lib/actions/standard/invoice/create.js` (MODIFY - wrap response)

```javascript
import { successResponse, errorResponse } from '@/lib/utils/responseFormatter';

export async function createInvoice(data, businessId) {
  try {
    const invoice = await db.invoices.create({ ... });
    return successResponse(invoice);
  } catch (error) {
    return errorResponse(error);
  }
}
```

**Files Affected**: 2+  
**Testing**: Check response format for success and errors

---

### Day 4: Thursday - Gap 3 (Excel Import/Export) - 5 hours

#### Step 1: Enhanced Export with Multiple Sheets

**File**: `lib/actions/premium/inventory/exportProducts.js` (MODIFY)

```javascript
import ExcelJS from 'exceljs';

export async function exportProducts(businessId, format = 'excel') {
  const products = await db.products.findMany({
    where: { business_id: businessId, is_deleted: false },
    include: {
      product_batches: true,
      product_serials: true,
      product_stock_locations: true,
      product_category: true
    }
  });
  
  // Products sheet
  const productRows = products.map(p => ({
    'Name': p.name,
    'SKU': p.sku,
    'Barcode': p.barcode,
    'Category': p.product_category?.name,
    'Price': p.selling_price,
    'Cost': p.cost_price,
    'Stock': p.stock,
    'Min Stock': p.min_stock,
    'Reorder Point': p.reorder_point,
    'Is Batch Tracked': p.is_batch_tracked ? 'YES' : 'NO',
    'Is Serial Tracked': p.is_serial_tracked ? 'YES' : 'NO'
  }));
  
  // Batches sheet
  const batchRows = [];
  for (const product of products) {
    for (const batch of product.product_batches) {
      batchRows.push({
        'Product SKU': product.sku,
        'Batch Number': batch.batch_number,
        'Quantity': batch.quantity,
        'Cost Per Unit': batch.cost_per_unit,
        'Mfg Date': batch.manufacturing_date,
        'Expiry Date': batch.expiry_date,
        'Status': batch.status
      });
    }
  }
  
  // Serials sheet
  const serialRows = [];
  for (const product of products) {
    for (const serial of product.product_serials) {
      serialRows.push({
        'Product SKU': product.sku,
        'Serial Number': serial.serial_number,
        'Warranty Expiry': serial.warranty_expiry_date,
        'Status': serial.status
      });
    }
  }
  
  // Create workbook
  const workbook = new ExcelJS.Workbook();
  
  const productsSheet = workbook.addWorksheet('Products');
  productsSheet.columns = Object.keys(productRows[0]).map(h => ({
    header: h,
    key: h
  }));
  productsSheet.addRows(productRows);
  
  if (batchRows.length > 0) {
    const batchesSheet = workbook.addWorksheet('Batches');
    batchesSheet.columns = Object.keys(batchRows[0]).map(h => ({
      header: h,
      key: h
    }));
    batchesSheet.addRows(batchRows);
  }
  
  if (serialRows.length > 0) {
    const serialsSheet = workbook.addWorksheet('Serials');
    serialsSheet.columns = Object.keys(serialRows[0]).map(h => ({
      header: h,
      key: h
    }));
    serialsSheet.addRows(serialRows);
  }
  
  return workbook;
}
```

**Files Affected**: 1

---

#### Step 2: Excel Import Handler

**File**: `lib/actions/standard/inventory/importProductsExcel.js` (NEW)

```javascript
import ExcelJS from 'exceljs';
import { checkPlanLimit } from '@/lib/actions/subscription/checkPlanLimit';
import { BusinessError } from '@/lib/errors/BusinessError';

export async function importProductsExcel(file, businessId) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.stream());
  
  const productsSheet = workbook.getWorksheet('Products');
  const batchesSheet = workbook.getWorksheet('Batches');
  const serialsSheet = workbook.getWorksheet('Serials');
  
  // Parse product rows
  const productRows = [];
  productsSheet.eachRow((row, index) => {
    if (index === 1) return; // Skip header
    productRows.push({
      name: row.getCell(1).value,
      sku: row.getCell(2).value,
      barcode: row.getCell(3).value,
      category: row.getCell(4).value,
      price: row.getCell(5).value,
      cost: row.getCell(6).value,
      stock: row.getCell(7).value,
      is_batch_tracked: row.getCell(11).value === 'YES',
      is_serial_tracked: row.getCell(12).value === 'YES'
    });
  });
  
  // Check plan limit
  const existingCount = await db.products.count({
    where: { business_id: businessId, is_deleted: false }
  });
  
  const newCount = productRows.filter(p => {
    return !existingCount.find(ep => ep.sku === p.sku);
  }).length;
  
  await checkPlanLimit(businessId, 'max_products', existingCount + newCount);
  
  // Import products
  const imported = [];
  for (const row of productRows) {
    const product = await db.products.upsert({
      where: { sku_business_id: { sku: row.sku, business_id: businessId } },
      update: {
        name: row.name,
        selling_price: row.price,
        cost_price: row.cost
      },
      create: {
        name: row.name,
        sku: row.sku,
        selling_price: row.price,
        cost_price: row.cost,
        stock: row.stock || 0,
        business_id: businessId,
        is_batch_tracked: row.is_batch_tracked,
        is_serial_tracked: row.is_serial_tracked
      }
    });
    
    imported.push(product);
  }
  
  // Import batches if sheet exists
  if (batchesSheet) {
    const batchRows = [];
    batchesSheet.eachRow((row, index) => {
      if (index === 1) return;
      batchRows.push({
        sku: row.getCell(1).value,
        batch_number: row.getCell(2).value,
        quantity: row.getCell(3).value,
        cost_per_unit: row.getCell(4).value,
        mfg_date: row.getCell(5).value,
        expiry_date: row.getCell(6).value
      });
    });
    
    for (const batchRow of batchRows) {
      const product = imported.find(p => p.sku === batchRow.sku);
      if (product) {
        await db.product_batches.create({
          product_id: product.id,
          batch_number: batchRow.batch_number,
          quantity: batchRow.quantity,
          cost_per_unit: batchRow.cost_per_unit,
          manufacturing_date: new Date(batchRow.mfg_date),
          expiry_date: new Date(batchRow.expiry_date)
        });
      }
    }
  }
  
  // Import serials if sheet exists
  if (serialsSheet) {
    const serialRows = [];
    serialsSheet.eachRow((row, index) => {
      if (index === 1) return;
      serialRows.push({
        sku: row.getCell(1).value,
        serial_number: row.getCell(2).value,
        warranty_expiry: row.getCell(3).value
      });
    });
    
    for (const serialRow of serialRows) {
      const product = imported.find(p => p.sku === serialRow.sku);
      if (product) {
        await db.product_serials.create({
          product_id: product.id,
          serial_number: serialRow.serial_number,
          warranty_expiry_date: new Date(serialRow.warranty_expiry),
          status: 'in_stock'
        });
      }
    }
  }
  
  return {
    success: true,
    imported: imported.length,
    batches: batchesSheet ? batchRows.length : 0,
    serials: serialsSheet ? serialRows.length : 0
  };
}
```

**Files Affected**: 1  
**Testing**: Export → Import → Export comparison

---

### Day 5: Friday - Testing & Planning Gap 1 - 4 hours

#### Step 1: Integration Tests

**File**: `lib/services/__tests__/invoice-workflow.test.js` (NEW)

```javascript
import { describe, it, expect } from 'vitest';
import { createInvoice } from '@/lib/actions/standard/invoice/create';

describe('Invoice Workflow with Batch & Serial', () => {
  it('should link batch to stock movement', async () => {
    const invoice = await createInvoice({
      customerId: 'cust-1',
      items: [{
        productId: 'prod-1',
        quantity: 5,
        batchId: 'batch-1',
        unitPrice: 100
      }]
    }, 'business-1');
    
    const movements = await db.stock_movements.findMany({
      where: { reference_id: invoice.id }
    });
    
    expect(movements[0].batch_id).toBe('batch-1');
  });
  
  it('should update serial status to sold', async () => {
    const invoice = await createInvoice({
      customerId: 'cust-1',
      items: [{
        productId: 'prod-1',
        quantity: 1,
        serialIds: ['serial-1'],
        unitPrice: 100
      }]
    }, 'business-1');
    
    const serial = await db.product_serials.findUnique({
      where: { id: 'serial-1' }
    });
    
    expect(serial.status).toBe('sold');
    expect(serial.customer_id).toBe('cust-1');
  });
  
  it('should complete reservation from quotation', async () => {
    const quotation = await db.quotations.create({...});
    const reservation = await db.inventory_reservations.create({...});
    
    const invoice = await createInvoice({
      quotationId: quotation.id,
      items: [{...}]
    }, 'business-1');
    
    const completed = await db.inventory_reservations.findUnique({
      where: { id: reservation.id }
    });
    
    expect(completed.status).toBe('completed');
  });
});
```

**Files Affected**: 1  
**Testing**: Run full test suite

---

#### Step 2: Gap 1 Planning Document

**Create**: `GAP_1_STOCK_DENORMALIZATION_PLAN.md`

```markdown
# Gap 1: Stock Denormalization Fix - Detailed Plan

## Problem (Recap)
- products.stock stored separately from product_stock_locations
- No transaction isolation
- Can cause overselling

## Current Architecture
```
products.stock (aggregate, manual update)
  ↓
product_stock_locations (multiple rows, one per location)
  ↓
stock_movements (transaction log)
  ↓
inventory_ledger (pharmacy only)
```

## Solution: Computed Column Approach

### Phase 1: Add Computed Column
- In Prisma: Add computed field
- In SQL: View or materialized view

### Phase 2: Gradual Migration
- Week 1: Read from computed column (fallback to products.stock if NULL)
- Week 2: Write to product_stock_locations only
- Week 3: Remove products.stock column

### Phase 3: Cleanup
- Run reconciliation
- Archive old stock_movements
- Performance test

## Implementation Timeline
Monday-Friday: Full implementation + testing + deploy
```

---

## Week 2: Advanced Features

### Day 1-2: Quotation Integration (Gap new) - 2 hours
Implement reserveStock() in quotation creation

### Day 3-4: Cron Jobs Setup - 2 hours
- Daily reconciliation
- Reservation expiry
- Health reports

### Day 5: Dashboard Integration - 3 hours
- Stock health component
- Reservation view
- Warranty section

---

## Week 3: Hardening

### Day 1-2: Comprehensive Testing
- Unit tests for all services
- Integration tests end-to-end
- Load tests with 10k+ products

### Day 3: Performance Optimization
- Query optimization
- Index verification
- Cache strategy

### Day 4-5: Deployment & Monitoring
- Staged rollout
- 24/7 monitoring
- Rollback plan ready

---

## Success Checklist

- [ ] Week 1: All 5 Gaps fixed (2, 4, 6, 7, 8, 5, 3)
- [ ] Week 2: Quotation + Jobs + Dashboard
- [ ] Week 3: Testing + Performance + Deploy
- [ ] All 6 services working end-to-end
- [ ] 0 multi-tenant violations
- [ ] Stock reconciliation < 0.1% drift
- [ ] Users can see batch/serial on invoice

---

## Documentation to Update

- [ ] PHASE_2A_SERVICES_INTEGRATION_GUIDE.md ✅ DONE
- [ ] CRITICAL_SYSTEM_GAPS_ANALYSIS.md ✅ DONE  
- [ ] This roadmap ✅ DONE
- [ ] API documentation (when complete)
- [ ] Database schema diagram
- [ ] User guide (batch/serial selection)

---

## Ready to Execute

All technical details provided. Start with Day 1 - Gap 2 implementation tomorrow.
