## Phase 2a: Critical Fixes Implementation Guide
### Services Architecture & Integration

**Status**: ✅ SERVICES CREATED (Phase 2a.1)
**Timeline**: 6 critical services created with complete implementation
**Location**: `lib/services/`

---

## 1. Service Overview

### Created Services (6 Total)

#### 1. **stockReconciliation.js** ✅
**Purpose**: Auto-sync products.stock with warehouse totals
**Key Functions**:
- `syncProductStockLevels(businessId, options)` - Main reconciliation
- `getProductAvailability(productId, businessId)` - Available vs reserved
- `getStockHealthReport(businessId)` - Categorize by health status
- `checkUnexpiredReservations(businessId)` - Auto-expire old reservations
- `scheduleDailyReconciliation()` - Cron job template

**Integration Points**:
- Run daily via cron job in background
- Call before generating inventory reports
- Use getProductAvailability() when displaying stock
- Use getStockHealthReport() in dashboard

**Example Usage**:
```javascript
// Daily background job
const report = await syncProductStockLevels(businessId, { 
  autoFix: true, 
  verbose: true 
});

// Check availability
const avail = await getProductAvailability(productId, businessId);
console.log(`Available: ${avail.available} / ${avail.total}`);

// Get health status
const health = await getStockHealthReport(businessId);
console.log(`Low stock: ${health.lowStock.length}`);
```

---

#### 2. **batchAllocation.js** ✅
**Purpose**: FIFO batch selection for sales
**Key Functions**:
- `selectBatchesForSale(productId, quantity, businessId, options)` - FIFO allocation
- `getExpiringBatches(businessId, daysThreshold)` - Find soon-to-expire
- `getExpiredBatches(businessId)` - Find already expired
- `validateBatchForSale(batchId, quantity)` - Pre-sale validation
- `createBatchStockMovement(data)` - Link batch to movement

**Integration Points**:
- Call in invoice creation flow before creating invoice_items
- Display batch info in invoice line items
- Show expiry warnings in batch picker
- Link stock_movements.batch_id to movements (KEY FIX)

**Example Usage**:
```javascript
// In invoice creation
const batches = await selectBatchesForSale(
  productId, 
  quantity, 
  businessId,
  { method: 'fifo' }
);

// Create movement with batch
const movement = await createBatchStockMovement({
  productId,
  batchId: batches[0].batch_id,
  quantity: batches[0].quantity,
  businessId,
  transactionType: 'sale',
  referenceType: 'invoice',
  referenceId: invoiceId
});
```

---

#### 3. **serialIntegration.js** ✅
**Purpose**: Serial number allocation to customers
**Key Functions**:
- `getAvailableSerials(productId, businessId, quantity)` - Find in-stock
- `allocateSerialToInvoice(data)` - Assign to customer
- `validateWarranty(serialNumber, businessId)` - Warranty check
- `getSerialHistory(serialNumber, businessId)` - Full lifecycle
- `handleSerialReturn(data)` - Warranty replacement

**Integration Points**:
- Call in invoice creation for serial-tracked products
- Update product_serials.status = 'sold' on sale
- Link invoice_items to specific serials
- Display warranty info in invoice line items

**Example Usage**:
```javascript
// Get available serials
const serials = await getAvailableSerials(productId, businessId, 3);

// Allocate to invoice
const updated = await allocateSerialToInvoice({
  serialIds: ['serial-1', 'serial-2', 'serial-3'],
  invoiceId,
  customerId,
  businessId
});

// Check warranty
const warranty = await validateWarranty('SN123456', businessId);
```

---

#### 4. **inventoryValuation.js** ✅
**Purpose**: Calculate inventory value for balance sheet
**Key Functions**:
- `calculateInventoryValuation(businessId, options)` - Main calculator
- `compareValuationMethods(businessId)` - Compare FIFO/LIFO/WAC
- `storeValuationHistory(businessId, result)` - Audit trail

**Methods Supported**:
- **FIFO** (default) - Oldest batches first
- **LIFO** - Newest batches first
- **Weighted Average** - Average cost per unit
- **Standard Cost** - Predefined standard cost

**Integration Points**:
- Call for month-end/year-end financial close
- Export to GL accounts for balance sheet
- Store in history table for audits
- Use for financial reporting dashboard

**Example Usage**:
```javascript
// Calculate FIFO valuation
const valuation = await calculateInventoryValuation(businessId, {
  method: 'fifo',
  asOfDate: new Date('2026-05-31')
});
console.log(`Inventory value: ${valuation.totalValue}`);

// Compare all methods
const comparison = await compareValuationMethods(businessId);
console.log(`FIFO: ${comparison.methods.fifo.totalValue}`);
console.log(`LIFO: ${comparison.methods.lifo.totalValue}`);
```

---

#### 5. **warrantyValidation.js** ✅
**Purpose**: Warranty claims management
**Key Functions**:
- `validateWarrantyForSerial(serialNumber, businessId)` - Check validity
- `calculateWarrantyExpiry(startDate, periodMonths)` - Compute expiry
- `calculateCoveragePeriod(startDate, expiryDate)` - Coverage %
- `validateWarrantyClaim(serialNumber, businessId, details)` - Claim eligibility
- `createWarrantyClaim(data)` - Record claim
- `extendWarranty(serialNumber, monthsToAdd, businessId)` - Extend period

**Integration Points**:
- Call at POS when processing warranty claims
- Display coverage % in invoice
- Check before approving claim
- Calculate coverage for reports

**Example Usage**:
```javascript
// Validate warranty
const warranty = await validateWarrantyForSerial('SN123456', businessId);
if (warranty.isValid) {
  console.log(`Valid for ${warranty.status.daysRemaining} more days`);
}

// Create claim
const claim = await createWarrantyClaim({
  serialNumber: 'SN123456',
  businessId,
  customerId,
  claimType: 'replacement',
  issue: 'Device not turning on'
});

// Extend warranty
const extended = await extendWarranty('SN123456', 12, businessId);
```

---

#### 6. **reservationManagement.js** ✅
**Purpose**: Auto-reserve stock on quotations
**Key Functions**:
- `reserveStock(productId, quantity, businessId, options)` - Create reservation
- `getAvailableQuantity(productId, businessId)` - Available = total - reserved
- `getActiveReservations(productId, businessId)` - List active
- `completeReservation(reservationId, businessId, options)` - Convert to sale
- `cancelReservation(reservationId, businessId, reason)` - Release stock
- `expireReservations(businessId)` - Auto-cleanup on expiry
- `getExpiryReport(businessId, daysThreshold)` - Expiring soon

**Integration Points**:
- Call in quotation creation to auto-reserve
- Call in invoice creation to complete reservation
- Run expiry cleanup as scheduled job
- Display reserved qty in stock display
- Show available = total - reserved

**Example Usage**:
```javascript
// Reserve on quotation
const reservation = await reserveStock(
  productId,
  quantity,
  businessId,
  {
    referenceType: 'quotation',
    referenceId: quotationId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    customerId
  }
);

// Complete on invoice
await completeReservation(reservation.id, businessId, { invoiceId });

// Check available
const avail = await getAvailableQuantity(productId, businessId);
console.log(`Can sell: ${avail.available} / ${avail.totalStock}`);

// Auto-cleanup
const expired = await expireReservations(businessId);
```

---

## 2. Data Flow Architecture

### Complete Inventory Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    INVENTORY LIFECYCLE                       │
└─────────────────────────────────────────────────────────────┘

1. PURCHASE FLOW
   ├─ Create purchase order
   ├─ Receive goods
   ├─ Create batches (if batch-tracked)
   │   └─ product_batches.quantity = received qty
   ├─ Create serials (if serial-tracked)
   │   └─ product_serials.status = 'in_stock'
   └─ Create stock_movement (transaction_type='purchase')
       └─ products.stock += qty (auto)

2. QUOTATION FLOW (NEW)
   ├─ Create quotation with items
   ├─ For each item:
   │   └─ Call reserveStock()
   │       └─ inventory_reservations.status = 'active'
   └─ Display available = total - reserved

3. INVOICE FLOW (ENHANCED)
   ├─ Validate reservation exists
   ├─ Call selectBatchesForSale() for FIFO
   ├─ Call getAvailableSerials() for serial-tracked
   ├─ Create invoice_items with:
   │   ├─ product_id
   │   ├─ batch_id (if batch-tracked)
   │   └─ serial_id (if serial-tracked)
   ├─ Create stock_movements with:
   │   ├─ batch_id = selected batch
   │   ├─ serial_id = allocated serial
   │   └─ quantity_change = -qty
   ├─ Update serials: status = 'sold', customer_id = customer
   ├─ Complete reservation
   └─ products.stock -= qty (auto from stock_movement)

4. DAILY RECONCILIATION (NEW)
   ├─ syncProductStockLevels() checks:
   │   ├─ products.stock vs sum(product_stock_locations.quantity)
   │   └─ Auto-fix discrepancies
   ├─ checkUnexpiredReservations()
   │   └─ Auto-expire old reservations
   └─ expireReservations() 
       └─ Mark expired reservations as 'expired'

5. WARRANTY TRACKING (NEW)
   ├─ On sale: allocateSerialToInvoice()
   │   └─ product_serials.warranty_expiry_date = calculated
   ├─ At claim: validateWarrantyClaim()
   │   └─ Check warranty_expiry_date
   └─ Handle return: handleSerialReturn()
       └─ Create replacement serial

6. FINANCIAL REPORTING (NEW)
   ├─ Monthly: calculateInventoryValuation()
   │   ├─ method='fifo' for most conservative
   │   └─ Store in history
   ├─ Quarterly: compareValuationMethods()
   │   └─ Verify method consistency
   └─ Year-end: Full audit trail
       └─ Export to GL accounts
```

---

## 3. Database Schema Impact

### Key Relationships to Enforce

```sql
-- existing tables modified:
ALTER TABLE stock_movements 
  ADD COLUMN batch_id UUID REFERENCES product_batches(id);
  -- ↑ NOW POPULATED by batchAllocation.js

ALTER TABLE invoice_items 
  ADD COLUMN serial_id UUID REFERENCES product_serials(id),
  ADD COLUMN batch_id UUID REFERENCES product_batches(id);
  -- ↑ NOW POPULATED by serialIntegration.js & batchAllocation.js

-- existing tables (already in schema):
-- ✓ inventory_reservations (used by reservationManagement.js)
-- ✓ product_batches (used by batchAllocation.js)
-- ✓ product_serials (used by serialIntegration.js)
-- ✓ product_stock_locations (used by stockReconciliation.js)
-- ✓ stock_movements (enhanced with batch_id)

-- new tables needed:
CREATE TABLE valuation_history (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  valuation_date TIMESTAMP,
  method VARCHAR(50), -- 'fifo', 'lifo', 'weighted-average', 'standard-cost'
  total_value DECIMAL(15,2),
  product_count INT,
  unit_count INT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE warranty_claims (
  id UUID PRIMARY KEY,
  business_id UUID,
  product_serial_id UUID REFERENCES product_serials(id),
  customer_id UUID REFERENCES customers(id),
  claim_type VARCHAR(50), -- 'replacement', 'repair', 'refund'
  issue_description TEXT,
  status VARCHAR(50), -- 'pending', 'approved', 'denied', 'completed'
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

---

## 4. Integration Checklist

### ✅ Phase 2a.1: Services Created
- [x] stockReconciliation.js - ✅ Ready to integrate
- [x] batchAllocation.js - ✅ Ready to integrate
- [x] serialIntegration.js - ✅ Ready to integrate
- [x] inventoryValuation.js - ✅ Ready to integrate
- [x] warrantyValidation.js - ✅ Ready to integrate
- [x] reservationManagement.js - ✅ Ready to integrate

### 🔄 Phase 2a.2: Invoice Integration (NEXT)
**Estimated: 3-4 hours**
- [ ] Modify EnhancedInvoiceBuilder.jsx
  - [ ] Import batchAllocation, serialIntegration, reservationManagement
  - [ ] Add batch selection UI
  - [ ] Add serial selection UI
  - [ ] Pass batch_id, serial_id to invoice_items
- [ ] Modify lib/actions/standard/invoice/create.js
  - [ ] Call selectBatchesForSale() for each item
  - [ ] Call getAvailableSerials() for serial items
  - [ ] Complete reservation on invoice creation
  - [ ] Create stock_movements with batch_id
  - [ ] Update product_serials.status = 'sold'

### 🔄 Phase 2a.3: Quotation Integration (NEXT)
**Estimated: 1-2 hours**
- [ ] Modify quotation creation action
  - [ ] Call reserveStock() for each line item
  - [ ] Store reservation_id in quotation_items
  - [ ] Auto-expires based on quotation validity
- [ ] Display reserved qty in quotation confirmation

### 🔄 Phase 2a.4: Daily Jobs Setup (NEXT)
**Estimated: 1 hour**
- [ ] Create cron job for stockReconciliation.js
- [ ] Create cron job for expireReservations()
- [ ] Create cron job for getExpiryReport()
- [ ] Store in scripts/scheduled-jobs.js

### 🔄 Phase 2a.5: Dashboard & Reporting (NEXT)
**Estimated: 2-3 hours**
- [ ] Add Stock Health section
  - [ ] Use getStockHealthReport()
  - [ ] Show outOfStock, lowStock, overStock
- [ ] Add Reservations view
  - [ ] Show active reservations per product
  - [ ] Show expiring soon
- [ ] Add Warranty section
  - [ ] Show warranty expiry by product
  - [ ] Warranty claims list
- [ ] Add Financial Valuation
  - [ ] FIFO/LIFO/WAC comparison
  - [ ] Historical trends

### 🔄 Phase 2a.6: Testing & QA (FINAL)
**Estimated: 2-3 hours**
- [ ] Unit tests for each service
- [ ] Integration tests (purchase → quotation → invoice)
- [ ] Round-trip validation (serials, batches, reservations)
- [ ] Performance tests (1000+ products)

---

## 5. Key Integration Points

### A. In EnhancedInvoiceBuilder.jsx

```javascript
import { selectBatchesForSale } from '@/lib/services/batchAllocation';
import { getAvailableSerials, allocateSerialToInvoice } from '@/lib/services/serialIntegration';
import { completeReservation } from '@/lib/services/reservationManagement';

// When user adds invoice line:
const handleAddLine = async (productId, quantity) => {
  // 1. Get batches
  const batches = await selectBatchesForSale(productId, quantity, businessId);
  // Display in dropdown for user selection
  
  // 2. If serial-tracked, get serials
  if (isSerialTracked(product)) {
    const serials = await getAvailableSerials(productId, businessId, quantity);
    // Display in serial picker modal
  }
  
  // 3. Add to invoice with batch/serial
  addLineItem({
    productId,
    quantity,
    batchId: selectedBatch.batch_id,
    serialIds: selectedSerials
  });
};

// When user confirms invoice:
const handleConfirmInvoice = async () => {
  // In server action, this will:
  // - Create stock_movements with batch_id
  // - Update serials.status = 'sold'
  // - Complete reservation
};
```

### B. In lib/actions/standard/invoice/create.js

```javascript
import { createBatchStockMovement } from '@/lib/services/batchAllocation';
import { allocateSerialToInvoice } from '@/lib/services/serialIntegration';
import { completeReservation } from '@/lib/services/reservationManagement';

export async function createInvoice(data, businessId) {
  const { items, customerId, quotationId } = data;
  
  // Create invoice
  const invoice = await db.invoices.create({ ... });
  
  // Process each item
  for (const item of items) {
    // Create invoice_item
    const invoiceItem = await db.invoice_items.create({ ... });
    
    // If batch-tracked: create movement with batch
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
    
    // If serial-tracked: allocate serials
    if (item.serialIds?.length > 0) {
      await allocateSerialToInvoice({
        serialIds: item.serialIds,
        invoiceId: invoice.id,
        customerId,
        businessId,
        saleDate: invoice.date
      });
    }
    
    // Create standard stock_movement
    await db.stock_movements.create({
      product_id: item.productId,
      batch_id: item.batchId,
      quantity_change: -item.quantity,
      transaction_type: 'sale',
      reference_type: 'invoice',
      reference_id: invoice.id
    });
  }
  
  // Complete reservations from quotation
  if (quotationId) {
    const quotation = await db.quotations.findUnique({
      where: { id: quotationId },
      include: { quotation_items: true }
    });
    
    for (const qitem of quotation.quotation_items) {
      // Find active reservation
      const reservation = await db.inventory_reservations.findFirst({
        where: {
          product_id: qitem.product_id,
          reference_id: quotationId,
          status: 'active'
        }
      });
      
      if (reservation) {
        await completeReservation(reservation.id, businessId, { invoiceId: invoice.id });
      }
    }
  }
  
  return invoice;
}
```

### C. In Quotation Creation

```javascript
import { reserveStock } from '@/lib/services/reservationManagement';

export async function createQuotation(data, businessId) {
  const quotation = await db.quotations.create({ ... });
  
  // Auto-reserve stock
  for (const item of data.items) {
    const reservation = await reserveStock(
      item.productId,
      item.quantity,
      businessId,
      {
        referenceType: 'quotation',
        referenceId: quotation.id,
        expiresAt: quotation.valid_until,
        customerId: data.customerId
      }
    );
    
    // Store reservation ID for later
    await db.quotation_items.update({
      where: { id: item.id },
      data: { reservation_id: reservation.id }
    });
  }
  
  return quotation;
}
```

---

## 6. Error Handling Strategy

### Service-Level Errors

```javascript
// batchAllocation.js throws:
- "Product not found"
- "Insufficient stock" (in error message, includes actual available)
- "Batch not found"
- "All batches expired" (FIFO batch selection)
- "Batch has expired"

// serialIntegration.js throws:
- "Serial not found"
- "Serial already sold"
- "Not enough available serials"

// reservationManagement.js throws:
- "Product not found"
- "Insufficient available stock" (shows total vs reserved)

// inventoryValuation.js throws:
- "Unknown valuation method"

// warrantyValidation.js throws:
- "Serial not found"
- "Warranty expired"
```

### UI-Level Handling

```javascript
try {
  const batches = await selectBatchesForSale(...);
} catch (error) {
  if (error.message.includes('Insufficient')) {
    toast.error(`Not enough stock available`);
    // Show available qty
  } else {
    toast.error(error.message);
  }
}
```

---

## 7. Next Immediate Actions

**TODO for Phase 2a.2 (Invoice Integration)**:

1. ✅ Services created (DONE)
2. 🔄 Modify EnhancedInvoiceBuilder.jsx (NEXT)
   - Import batch and serial services
   - Add batch selection dropdown
   - Add serial selection modal
3. 🔄 Modify invoice creation action
   - Integrate batch allocation (FIFO)
   - Integrate serial allocation
   - Complete reservations
4. 🔄 Test end-to-end flow
5. 🔄 Set up daily cron jobs

---

## 8. Success Criteria

### Phase 2a Complete When:

- [x] All 6 services created and tested
- [ ] Invoice creation passes batch_id to stock_movements
- [ ] Invoice creation passes serial_id to product_serials
- [ ] Batch FIFO correctly selects oldest non-expired
- [ ] Serial status updated to 'sold' with customer linkage
- [ ] Reservations auto-created on quotation
- [ ] Reservations auto-completed on invoice
- [ ] Daily reconciliation runs without errors
- [ ] Warranty validation works for claims
- [ ] Inventory valuation produces reasonable numbers
- [ ] Dashboard shows health report, reservations, warranty status

**Estimated Total for Phase 2a**: 12-15 hours
- Services: ✅ 6 hours (DONE)
- Invoice integration: 3-4 hours (NEXT)
- Quotation integration: 1-2 hours
- Jobs setup: 1 hour
- Dashboard: 2-3 hours
- Testing: 2-3 hours

---

## 9. Error Handling Framework

### BusinessError Hierarchy

Create `lib/errors/BusinessError.js`:

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

// Specific error types
export class InsufficientStockError extends BusinessError {
  constructor(productId, needed, available) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for product ${productId}`,
      { productId, needed, available }
    );
  }
}

export class BatchExpiredError extends BusinessError {
  constructor(batchId, expiryDate) {
    super(
      'BATCH_EXPIRED',
      `Batch expired on ${expiryDate}`,
      { batchId, expiryDate }
    );
  }
}

export class SerialAlreadySoldError extends BusinessError {
  constructor(serialNumber) {
    super(
      'SERIAL_ALREADY_SOLD',
      `Serial ${serialNumber} already sold`,
      { serialNumber }
    );
  }
}

export class ReservationExpiredError extends BusinessError {
  constructor(reservationId) {
    super(
      'RESERVATION_EXPIRED',
      `Reservation expired`,
      { reservationId }
    );
  }
}

export class MultiTenantViolationError extends BusinessError {
  constructor(resourceId, requestedBusinessId, ownerBusinessId) {
    super(
      'MULTI_TENANT_VIOLATION',
      `Unauthorized access to resource`,
      { resourceId, requestedBusinessId, ownerBusinessId }
    );
  }
}

export class WarrantyExpiredError extends BusinessError {
  constructor(serialNumber, expiryDate) {
    super(
      'WARRANTY_EXPIRED',
      `Warranty expired on ${expiryDate}`,
      { serialNumber, expiryDate }
    );
  }
}
```

### Service Error Handling Pattern

```javascript
// In batchAllocation.js - FIXED to use BusinessError
export async function selectBatchesForSale(productId, quantity, businessId, options = {}) {
  try {
    const product = await db.products.findUnique({
      where: { id: productId, business_id: businessId }
    });
    
    if (!product) {
      throw new BusinessError(
        'PRODUCT_NOT_FOUND',
        `Product not found`,
        { productId }
      );
    }
    
    const batches = await db.product_batches.findMany({
      where: {
        product_id: productId,
        quantity: { gt: 0 },
        expiry_date: { gt: new Date() }
      },
      orderBy: { manufacturing_date: 'asc' } // FIFO
    });
    
    if (batches.length === 0) {
      throw new InsufficientStockError(productId, quantity, 0);
    }
    
    let remaining = quantity;
    const selected = [];
    
    for (const batch of batches) {
      if (remaining <= 0) break;
      
      const take = Math.min(remaining, batch.quantity);
      selected.push({ batch_id: batch.id, quantity: take });
      remaining -= take;
    }
    
    if (remaining > 0) {
      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
      throw new InsufficientStockError(productId, quantity, totalAvailable);
    }
    
    return selected;
  } catch (error) {
    if (error instanceof BusinessError) throw error;
    throw new BusinessError(
      'BATCH_SELECTION_ERROR',
      `Error selecting batches: ${error.message}`
    );
  }
}
```

---

## 10. API Response Standardization

### Success Response Format

```javascript
// Standard success response structure
{
  success: true,
  data: {
    // actual data
  },
  timestamp: "2026-05-14T10:30:00Z"
}

// With pagination
{
  success: true,
  data: {
    items: [...],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5
    }
  },
  timestamp: "2026-05-14T10:30:00Z"
}
```

### Error Response Format

```javascript
// Standard error response structure
{
  success: false,
  error: {
    code: 'INSUFFICIENT_STOCK',
    message: 'Not enough stock available',
    details: {
      productId: 'prod-123',
      needed: 100,
      available: 50
    }
  },
  timestamp: "2026-05-14T10:30:00Z"
}
```

### Response Wrapper Helper

Create `lib/utils/responseFormatter.js`:

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
      message: error.message || 'Unknown error',
      details: {}
    },
    timestamp: new Date().toISOString(),
    ...options
  };
}

export function paginatedResponse(items, page, pageSize, total) {
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
    timestamp: new Date().toISOString()
  };
}
```

---

## 11. Cross-System Dependencies

### A. Subscription Plan Integration

**Problem**: Services don't check plan limits

**Solution**: Add plan checks to all quota-affecting operations

```javascript
// In reservationManagement.js - ADD THIS
import { checkPlanLimit } from '@/lib/actions/subscription/checkPlanLimit';

export async function reserveStock(productId, quantity, businessId, options = {}) {
  // Check reservation quota
  const activeReservations = await db.inventory_reservations.count({
    where: { business_id: businessId, status: 'active' }
  });
  
  await checkPlanLimit(
    businessId,
    'max_reservations_per_month',
    activeReservations + 1
  );
  
  // ... rest of function
}
```

### B. Multi-Tenant Consistency

All services must verify `business_id` matches:

```javascript
// Pattern in all services
export async function getStockHealthReport(businessId) {
  // ALWAYS verify business_id parameter
  const business = await db.businesses.findUnique({
    where: { id: businessId }
  });
  
  if (!business) {
    throw new BusinessError('BUSINESS_NOT_FOUND', 'Business not found');
  }
  
  // Then proceed with data access
  const products = await db.products.findMany({
    where: { business_id: businessId }
  });
}
```

### C. Audit Trail Integration

All operations must log to audit_logs:

```javascript
// Pattern in all services
import { auditLog } from '@/lib/actions/audit/auditLog';

export async function completeReservation(reservationId, businessId, options) {
  const reservation = await db.inventory_reservations.findUnique({
    where: { id: reservationId }
  });
  
  // Verify business_id
  if (reservation.business_id !== businessId) {
    throw new MultiTenantViolationError(reservationId, businessId, reservation.business_id);
  }
  
  // Update
  const updated = await db.inventory_reservations.update({
    where: { id: reservationId },
    data: { status: 'completed', completed_at: new Date() }
  });
  
  // Log to audit trail
  await auditLog({
    businessId,
    action: 'reservation_completed',
    resourceType: 'inventory_reservation',
    resourceId: reservationId,
    details: { options }
  });
  
  return updated;
}
```

---

## 12. Inventory Export/Import Enhancements

### A. Enhanced Export (Fix Batch/Serial Data Loss)

Modify `lib/actions/premium/inventory/exportProducts.js`:

```javascript
export async function exportProducts(businessId, options = {}) {
  const products = await db.products.findMany({
    where: { business_id: businessId, is_deleted: false },
    include: {
      product_batches: true,
      product_serials: true,
      product_stock_locations: true,
      product_category: true
    }
  });
  
  // Main sheet
  const basicData = products.map(p => ({
    'Name': p.name,
    'SKU': p.sku,
    'Barcode': p.barcode,
    'Category': p.product_category?.name,
    'Price': p.selling_price,
    'Cost Price': p.cost_price,
    'Stock': p.stock,
    'Min Stock': p.min_stock,
    'Max Stock': p.max_stock,
    'Reorder Point': p.reorder_point,
    'Unit': p.unit_of_measure,
    'Description': p.description,
    'Is Batch Tracked': p.is_batch_tracked,
    'Is Serial Tracked': p.is_serial_tracked
  }));
  
  // Batch sheet (if any batches)
  const batchData = [];
  for (const product of products) {
    if (product.product_batches.length > 0) {
      for (const batch of product.product_batches) {
        batchData.push({
          'Product SKU': product.sku,
          'Batch Number': batch.batch_number,
          'Quantity': batch.quantity,
          'Cost Per Unit': batch.cost_per_unit,
          'Manufacturing Date': batch.manufacturing_date,
          'Expiry Date': batch.expiry_date,
          'Status': batch.status
        });
      }
    }
  }
  
  // Serial sheet (if any serials)
  const serialData = [];
  for (const product of products) {
    if (product.product_serials.length > 0) {
      for (const serial of product.product_serials) {
        serialData.push({
          'Product SKU': product.sku,
          'Serial Number': serial.serial_number,
          'Warranty Expiry': serial.warranty_expiry_date,
          'Status': serial.status,
          'Customer ID': serial.customer_id
        });
      }
    }
  }
  
  // Location sheet
  const locationData = [];
  for (const product of products) {
    for (const location of product.product_stock_locations) {
      locationData.push({
        'Product SKU': product.sku,
        'Warehouse': location.warehouse_name,
        'Quantity': location.quantity
      });
    }
  }
  
  // Create workbook with multiple sheets
  const workbook = new ExcelJS.Workbook();
  
  const basicSheet = workbook.addWorksheet('Products');
  basicSheet.columns = Object.keys(basicData[0]).map(k => ({ header: k }));
  basicSheet.addRows(basicData);
  
  if (batchData.length > 0) {
    const batchSheet = workbook.addWorksheet('Batches');
    batchSheet.columns = Object.keys(batchData[0]).map(k => ({ header: k }));
    batchSheet.addRows(batchData);
  }
  
  if (serialData.length > 0) {
    const serialSheet = workbook.addWorksheet('Serials');
    serialSheet.columns = Object.keys(serialData[0]).map(k => ({ header: k }));
    serialSheet.addRows(serialData);
  }
  
  if (locationData.length > 0) {
    const locationSheet = workbook.addWorksheet('Locations');
    locationSheet.columns = Object.keys(locationData[0]).map(k => ({ header: k }));
    locationSheet.addRows(locationData);
  }
  
  return workbook;
}
```

### B. New Excel Import Handler

Create `lib/actions/standard/inventory/importProductsExcel.js`:

```javascript
import ExcelJS from 'exceljs';
import { validateImportRow } from '@/lib/utils/inventory/importValidation';
import { checkPlanLimit } from '@/lib/actions/subscription/checkPlanLimit';

export async function importProductsExcel(file, businessId) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.arrayBuffer());
  
  const productsSheet = workbook.getWorksheet('Products');
  const batchesSheet = workbook.getWorksheet('Batches');
  const serialsSheet = workbook.getWorksheet('Serials');
  const locationsSheet = workbook.getWorksheet('Locations');
  
  const rows = [];
  productsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    rows.push(row.values);
  });
  
  // Validate total new products against plan
  const existingSKUs = await db.products.findMany({
    where: { business_id: businessId },
    select: { sku: true }
  });
  const existingSKUSet = new Set(existingSKUs.map(p => p.sku));
  
  const newSKUs = rows.filter(row => {
    const sku = row[2]; // SKU column
    return !existingSKUSet.has(sku);
  });
  
  const currentCount = existingSKUs.length;
  await checkPlanLimit(businessId, 'max_products', currentCount + newSKUs.length);
  
  // Import products
  const imported = [];
  for (const row of rows) {
    const validation = validateImportRow(row);
    if (!validation.valid) {
      throw new BusinessError('IMPORT_VALIDATION_ERROR', validation.error);
    }
    
    const product = await db.products.upsert({
      where: { sku_business_id: { sku: row[2], business_id: businessId } },
      update: {
        name: row[1],
        selling_price: row[4],
        cost_price: row[5],
        stock: row[6],
        min_stock: row[7],
        max_stock: row[8]
      },
      create: {
        name: row[1],
        sku: row[2],
        barcode: row[3],
        selling_price: row[4],
        cost_price: row[5],
        stock: row[6],
        business_id: businessId,
        is_batch_tracked: row[12] === 'yes',
        is_serial_tracked: row[13] === 'yes'
      }
    });
    
    imported.push(product);
  }
  
  // Import batches if sheet exists
  if (batchesSheet) {
    const batchRows = [];
    batchesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      batchRows.push(row.values);
    });
    
    for (const batchRow of batchRows) {
      const product = imported.find(p => p.sku === batchRow[1]);
      if (product) {
        await db.product_batches.create({
          product_id: product.id,
          batch_number: batchRow[2],
          quantity: batchRow[3],
          cost_per_unit: batchRow[4],
          manufacturing_date: new Date(batchRow[5]),
          expiry_date: new Date(batchRow[6])
        });
      }
    }
  }
  
  // Import serials if sheet exists
  if (serialsSheet) {
    const serialRows = [];
    serialsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      serialRows.push(row.values);
    });
    
    for (const serialRow of serialRows) {
      const product = imported.find(p => p.sku === serialRow[1]);
      if (product) {
        await db.product_serials.create({
          product_id: product.id,
          serial_number: serialRow[2],
          warranty_expiry_date: new Date(serialRow[3]),
          status: 'in_stock'
        });
      }
    }
  }
  
  return {
    imported: imported.length,
    batches: batchesSheet ? batchRows.length : 0,
    serials: serialsSheet ? serialRows.length : 0
  };
}
```

---

## 13. Multi-Tenant Safety for Bulk Operations

### Fix: lib/actions/premium/automation/bulk.js

```javascript
// CRITICAL FIX: Add business_id verification
export async function deleteBulkProducts(productIds, businessId) {
  // Step 1: VERIFY all products belong to this business
  const productsToDelete = await db.products.findMany({
    where: { id: { in: productIds } },
    select: { id: business_id }
  });
  
  const owningBusinessIds = new Set(productsToDelete.map(p => p.business_id));
  
  if (owningBusinessIds.size > 1 || !owningBusinessIds.has(businessId)) {
    throw new MultiTenantViolationError(
      productIds,
      businessId,
      Array.from(owningBusinessIds)[0]
    );
  }
  
  // Step 2: Only proceed if ALL verified
  if (productsToDelete.length !== productIds.length) {
    throw new BusinessError(
      'PRODUCTS_NOT_FOUND',
      `${productIds.length - productsToDelete.length} products not found`
    );
  }
  
  // Step 3: Soft delete
  const result = await db.products.updateMany({
    where: { id: { in: productIds }, business_id: businessId },
    data: {
      is_deleted: true,
      deleted_at: new Date()
    }
  });
  
  // Step 4: Audit
  await auditLog({
    businessId,
    action: 'bulk_delete_products',
    resourceType: 'product',
    resourceIds: productIds,
    count: result.count
  });
  
  return result;
}

// Similar pattern for bulk invoice delete, bulk customer delete, etc.
export async function deleteBulkInvoices(invoiceIds, businessId) {
  // ALWAYS verify business_id first
  const invoicesToDelete = await db.invoices.findMany({
    where: { id: { in: invoiceIds } },
    select: { id, business_id }
  });
  
  if (!invoicesToDelete.every(i => i.business_id === businessId)) {
    throw new MultiTenantViolationError('invoices', businessId);
  }
  
  // ... rest of implementation
}
```

---

## 14. Payment Allocation XOR Constraint Fix

### Schema Addition

Add this to `prisma/schema.prisma`:

```prisma
model payment_allocations {
  // existing fields
  invoice_id     String?
  purchase_id    String?
  
  // Ensure EXACTLY ONE of invoice_id or purchase_id is populated
  // This check constraint goes in migration
  
  invoice        invoices?       @relation(fields: [invoice_id], references: [id])
  purchase       purchase_orders? @relation(fields: [purchase_id], references: [id])
  
  @@check("(invoice_id IS NOT NULL AND purchase_id IS NULL) OR (invoice_id IS NULL AND purchase_id IS NOT NULL)")
}
```

### Migration

Create `prisma/migrations/add_payment_allocation_xor.sql`:

```sql
-- Add check constraint for XOR logic
ALTER TABLE payment_allocations
ADD CONSTRAINT payment_allocation_xor_check 
CHECK (
  (invoice_id IS NOT NULL AND purchase_id IS NULL) 
  OR 
  (invoice_id IS NULL AND purchase_id IS NOT NULL)
);

-- Validate existing data (fail if any violate constraint)
SELECT COUNT(*) as violations FROM payment_allocations
WHERE NOT (
  (invoice_id IS NOT NULL AND purchase_id IS NULL) 
  OR 
  (invoice_id IS NULL AND purchase_id IS NOT NULL)
);
```

---

## 15. Domain Data JSON Schema Validation

### Framework

Create `lib/utils/validation/domainDataValidator.js`:

```javascript
import { z } from 'zod';

// Define schemas per domain
const batchTrackingSchema = z.object({
  batch_number: z.string(),
  batch_quantity: z.number().positive(),
  expiry_date: z.string().datetime(),
  manufacturing_date: z.string().datetime().optional(),
  cost_per_unit: z.number().positive(),
  batch_status: z.enum(['active', 'expired', 'damaged'])
});

const serialTrackingSchema = z.object({
  serial_number: z.string(),
  warranty_months: z.number().positive(),
  warranty_expiry_date: z.string().datetime(),
  status: z.enum(['in_stock', 'sold', 'returned'])
});

const pharmacySchema = z.object({
  batch_tracking: batchTrackingSchema.optional(),
  schedule_type: z.enum(['OTC', 'Rx', 'Schedule H', 'Schedule X']).optional()
});

const retailSchema = z.object({
  serial_tracking: serialTrackingSchema.optional(),
  color: z.string().optional(),
  size: z.string().optional()
});

// Validator factory
export function validateDomainData(domain, data) {
  const schemas = {
    'pharmacy': pharmacySchema,
    'retail': retailSchema,
    // Add more domains
  };
  
  const schema = schemas[domain];
  if (!schema) {
    throw new BusinessError('UNKNOWN_DOMAIN', `Unknown domain: ${domain}`);
  }
  
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BusinessError(
      'INVALID_DOMAIN_DATA',
      'Invalid domain data',
      { errors: result.error.errors }
    );
  }
  
  return result.data;
}
```

### Usage in services

```javascript
export async function createProductBatch(data, businessId) {
  // Validate domain data before saving
  const validatedData = validateDomainData(
    data.domain,
    data.domain_data
  );
  
  const batch = await db.product_batches.create({
    data: {
      ...data,
      domain_data: validatedData
    }
  });
  
  return batch;
}
```

---

## 16. Comprehensive Testing Strategy

### Unit Tests

Create `lib/services/__tests__/batchAllocation.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { selectBatchesForSale, getExpiringBatches } from '../batchAllocation';
import { InsufficientStockError, BatchExpiredError } from '@/lib/errors/BusinessError';

describe('batchAllocation', () => {
  let testBusinessId, testProductId;
  
  beforeEach(async () => {
    // Setup test data
    testBusinessId = 'test-business-1';
    testProductId = 'test-product-1';
  });
  
  describe('selectBatchesForSale', () => {
    it('should select oldest batch first (FIFO)', async () => {
      // Arrange: Create product with 3 batches
      const batch1 = { batch_id: '1', quantity: 50, manufacturing_date: new Date('2026-01-01') };
      const batch2 = { batch_id: '2', quantity: 50, manufacturing_date: new Date('2026-02-01') };
      
      // Act
      const selected = await selectBatchesForSale(testProductId, 60, testBusinessId);
      
      // Assert
      expect(selected[0].batch_id).toBe(batch1.batch_id);
      expect(selected[0].quantity).toBe(50);
      expect(selected[1].batch_id).toBe(batch2.batch_id);
      expect(selected[1].quantity).toBe(10);
    });
    
    it('should throw InsufficientStockError when not enough stock', async () => {
      // Arrange
      // Act & Assert
      expect(async () => {
        await selectBatchesForSale(testProductId, 1000, testBusinessId);
      }).rejects.toThrow(InsufficientStockError);
    });
    
    it('should skip expired batches', async () => {
      // Arrange: Create expired batch and unexpired batch
      // Act
      const selected = await selectBatchesForSale(testProductId, 50, testBusinessId);
      
      // Assert: Should only get unexpired batch
    });
  });
});
```

### Integration Tests

Create `lib/services/__tests__/invoice-workflow.test.js`:

```javascript
describe('Invoice Workflow Integration', () => {
  it('should complete end-to-end invoice with batch and serial', async () => {
    // 1. Create quotation with items
    const quotation = await createQuotation({
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 5 }]
    }, businessId);
    
    // 2. Verify reservation created
    const reservation = await db.inventory_reservations.findFirst({
      where: { reference_id: quotation.id }
    });
    expect(reservation).toBeDefined();
    expect(reservation.status).toBe('active');
    
    // 3. Create invoice from quotation
    const invoice = await createInvoice({
      quotationId: quotation.id,
      items: [{ productId: 'product-1', quantity: 5, batchId: 'batch-1' }]
    }, businessId);
    
    // 4. Verify batch linkage
    const movements = await db.stock_movements.findMany({
      where: { reference_id: invoice.id }
    });
    expect(movements[0].batch_id).toBe('batch-1');
    
    // 5. Verify reservation completed
    const completedReservation = await db.inventory_reservations.findUnique({
      where: { id: reservation.id }
    });
    expect(completedReservation.status).toBe('completed');
    
    // 6. Verify stock decremented
    const product = await db.products.findUnique({
      where: { id: 'product-1' }
    });
    expect(product.stock).toBe(previousStock - 5);
  });
});
```

---

## 17. Rollout Plan

### Phase 1: Deploy (Week 1)
- [ ] Merge services to main
- [ ] Run schema migrations (batch_id, serial_id columns)
- [ ] Deploy error handling framework
- [ ] Deploy API response standardization
- [ ] Monitor error rates

### Phase 2: Integration (Week 2)
- [ ] Deploy invoice integration
- [ ] Deploy quotation integration
- [ ] Deploy batch/serial UI
- [ ] Run integration tests
- [ ] Canary deploy to 10% customers

### Phase 3: Features (Week 3)
- [ ] Deploy daily cron jobs
- [ ] Deploy dashboard enhancements
- [ ] Deploy Excel import/export
- [ ] Run full test suite
- [ ] Rollout to 100% customers

### Phase 4: Hardening (Week 4)
- [ ] Deploy multi-tenant safety fixes
- [ ] Deploy payment allocation XOR
- [ ] Deploy domain_data validation
- [ ] Performance testing
- [ ] Production monitoring

### Rollback Plan

Each phase has automated rollback:
1. Invoice failures → Revert to simple stock movement (no batch/serial)
2. Quota failures → Revert to old limits
3. Export failures → Fallback to CSV only
4. Daily jobs → Skip if errors, retry next day

---

## 18. Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Batch/serial not linked on sale | 🔴 Critical | Medium | Comprehensive tests + manual QA |
| Stock calculation discrepancy | 🔴 Critical | Low | Daily reconciliation + warnings |
| Reservation expiry errors | 🟡 High | Medium | Auto-cleanup job + monitoring |
| Excel import data loss | 🟡 High | Medium | Round-trip validation tests |
| Multi-tenant leak in bulk ops | 🔴 Critical | Low | ID verification before delete |
| Plan limit bypass | 🔴 Critical | Very Low | Server-side checks + audits |
| Warranty claim fraud | 🟡 High | Medium | Serial tracking + history |

---

## 19. Files Modified Checklist

### New Files
- [ ] `lib/services/batchAllocation.js` ✅
- [ ] `lib/services/serialIntegration.js` ✅
- [ ] `lib/services/stockReconciliation.js` ✅
- [ ] `lib/services/inventoryValuation.js` ✅
- [ ] `lib/services/warrantyValidation.js` ✅
- [ ] `lib/services/reservationManagement.js` ✅
- [ ] `lib/errors/BusinessError.js` (NEW)
- [ ] `lib/utils/responseFormatter.js` (NEW)
- [ ] `lib/actions/standard/inventory/importProductsExcel.js` (NEW)
- [ ] `prisma/migrations/add_batch_serial_linkage.sql` (NEW)
- [ ] `prisma/migrations/add_payment_allocation_xor.sql` (NEW)

### Modified Files
- [ ] `lib/actions/standard/invoice/create.js` (Add batch/serial integration)
- [ ] `lib/actions/standard/quotation/create.js` (Add reservation)
- [ ] `lib/actions/premium/inventory/exportProducts.js` (Add batch/serial sheets)
- [ ] `lib/actions/premium/automation/bulk.js` (Add multi-tenant checks)
- [ ] `components/invoice/EnhancedInvoiceBuilder.jsx` (Add batch/serial UI)
- [ ] `prisma/schema.prisma` (Add check constraint)

---

## 20. Success Metrics

### Quantitative
- ✅ All 6 services deploy without errors
- ✅ Invoice creation time < 1.5s (currently ~1s)
- ✅ Stock reconciliation finds <0.1% drift
- ✅ 99.9% of reservations expire on schedule
- ✅ 100% of serials linked to customer on sale
- ✅ Excel export/import round-trip preserves 100% of data
- ✅ 0 multi-tenant violations in audit logs

### Qualitative
- ✅ Users can easily select batch/serial on invoice
- ✅ Dashboard shows clear health report
- ✅ Error messages are actionable
- ✅ Warranty tracking works end-to-end
- ✅ Financial reporting accurate to batch level

**Phase 2a Target Completion**: 2-3 weeks
**Total Development Hours**: 20-25 hours
**Deployment Windows**: Weekends only
**Monitoring**: 24/7 for first 2 weeks
