# Prisma Schema Comprehensive Audit

**Generated:** May 14, 2026  
**Scope:** Multi-tenancy design, multi-domain support, data integrity, performance, industry alignment  
**Focus:** Financial Hub ERP System

---

## EXECUTIVE SUMMARY

### Overall Assessment: ⚠️ STRONG FOUNDATION WITH CRITICAL GAPS

| Category | Status | Risk Level |
|----------|--------|-----------|
| Multi-Tenancy | ✅ Good | Low |
| Domain Support | ⚠️ Partial | Medium |
| Data Integrity | ⚠️ Inconsistent | Medium |
| Performance | ⚠️ Needs Work | Medium-High |
| Industry Standards | ❌ Significant Gaps | High |

---

## 1. MULTI-TENANCY DESIGN ANALYSIS

### 1.1 Business ID Scoping - TABLE BY TABLE

#### ✅ PROPERLY SCOPED (business_id present with enforced isolation)

| Table | business_id Status | FK Constraint | Uniqueness Scope |
|-------|---|---|---|
| products | ✅ Present | Cascade | `(business_id, sku)` |
| invoices | ✅ Present | Cascade | `(business_id, invoice_number)` |
| purchases | ✅ Present | Cascade | `(business_id, purchase_number)` |
| sales_orders | ✅ Present | Cascade | `(business_id, order_number)` |
| customers | ✅ Present | Cascade | Optional; `(business_id, email)` indexed |
| vendors | ✅ Present | Cascade | None (should have one) |
| invoices | ✅ Present | Cascade | `(business_id, invoice_number)` ✅ |
| delivery_challans | ✅ Present | Cascade | `(business_id, challan_number)` |
| quotations | ✅ Present | Cascade | `(business_id, quotation_number)` |
| warehouse_locations | ✅ Present | Cascade | None |
| payments | ✅ Present | Cascade | None |
| stock_movements | ✅ Present | Cascade | None |
| audit_logs | ✅ Present | Cascade | None |
| gl_accounts | ✅ Present | Cascade | `(business_id, code)` ✅ |
| journal_entries | ✅ Present | Cascade | `(business_id, journal_number)` |
| expenses | ✅ Present | Cascade | `(business_id, expense_number)` |

#### ⚠️ PARTIALLY SCOPED (business_id present but missing uniqueness scope)

```
❌ CRITICAL ISSUE: Multiple tables lack business-scoped uniqueness constraints:

1. customers: No unique constraint on (business_id, name, email) - could have duplicates
2. vendors: No unique constraint - could have duplicate names per business
3. warehouse_locations: No constraint - could have duplicate warehouse names
4. payments: No constraint - no document number uniqueness
5. stock_movements: No constraint - risk of duplicate records
6. delivery_challan_items: Missing business_id on FK relationships
7. quotation_items: Has business_id but no constraint linking back to quotation
8. sales_order_items: Has business_id but orphaned items possible
```

#### ❌ MISSING business_id (VIOLATION)

```
Shared/Global Tables (THESE VIOLATE MULTI-TENANCY):

1. User - NO business_id
   - Problem: Users span all businesses via business_users junction
   - Risk: User data not isolated; global user table
   - Recommendation: Keep as-is but note this is intentional multi-business user support

2. Account - NO business_id
   - Problem: OAuth/login credentials not tenant-scoped
   - Risk: Security boundary violation
   - Recommendation: Should reference business_id indirectly or keep global (acceptable for auth)

3. Session - NO business_id
   - Problem: Sessions not tenant-scoped
   - Risk: Cross-business session access possible
   - Recommendation: Add business_id from user context

4. TwoFactor - NO business_id
   - Problem: 2FA not tenant-scoped
   - Risk: 2FA secrets global
   - Recommendation: Add business_id for security

5. Verification - NO business_id
   - Problem: Email verification not tenant-scoped
   - Risk: Verification tokens could leak across tenants
   - Recommendation: Add business_id

6. bom_materials: ⚠️ HAS business_id but material_id FK to products doesn't validate business match
   - Problem: Can link materials from different businesses
   - Recommendation: Add composite FK or application-level validation

7. bom_materials, bom: ⚠️ No check that product_id belongs to same business
```

### 1.2 Foreign Key Enforcement Analysis

#### ✅ GOOD: Explicit business_id + FK pattern
```prisma
// Example: Good pattern (invoices)
invoices {
  business_id String @db.Uuid
  invoice_items invoice_items[]
}
invoice_items {
  business_id String @db.Uuid
  invoice_id String @db.Uuid
  invoices invoices @relation(fields: [invoice_id], references: [id], onDelete: Cascade)
}
```

#### ⚠️ RISK: business_id FK without cross-validation
```prisma
// Example: Risky - no check that FK objects share business_id
sales_order_items {
  business_id String @db.Uuid
  sales_order_id String @db.Uuid
  product_id String @db.Uuid
  sales_orders @relation(fields: [sales_order_id])  // OK
  products @relation(fields: [product_id])          // ⚠️ Product could be from different business
}
```

#### ❌ CRITICAL: Missing cross-tenant data validation

```
Affected areas:
1. quotation_items → quotations + products
2. sales_order_items → sales_orders + products
3. delivery_challan_items → delivery_challans + products
4. bom_materials → boms + products
5. stock_transfers → warehouse_locations (from & to)
```

**Fix Required:**
```prisma
// Add application-level validation:
- When creating child items, verify FK object business_id matches
- Consider database constraints or check conditions
```

### 1.3 Soft Delete Pattern Consistency

#### ✅ Present in key tables:
- customers: `is_deleted`, `deleted_at`
- vendors: `is_deleted`, `deleted_at`
- products: `is_deleted`, `deleted_at`
- product_variants: `is_deleted`, `deleted_at`
- product_serials: `is_deleted`, `deleted_at`
- product_batches: `is_deleted`, `deleted_at`
- invoices: `is_deleted`, `deleted_at`
- purchases: `is_deleted`, `deleted_at`
- expenses: `is_deleted`, `deleted_at`
- pos_transactions: `is_voided`, `voided_at` (partial)

#### ❌ MISSING in critical tables:
```
- sales_orders: NO soft delete (only status "cancelled")
- quotations: NO soft delete (only status)
- payments: NO soft delete
- stock_movements: NO soft delete (immutable? but unsafe)
- journal_entries: NO soft delete (immutable? but no deletion tracking)
- purchase_returns: NO soft delete
- delivery_challans: NO soft delete
- pos_sessions: NO soft delete
```

**Problem:** Inconsistent deletion patterns break audit trails and data recovery.

---

## 2. MULTI-DOMAIN SUPPORT ANALYSIS

### 2.1 Domain Field Usage

#### Location: `businesses` table
```prisma
domain String @unique(map: "unique_business_domain")
```

✅ **Present**: Unique domain constraint
⚠️ **Limited Usage**: Domain stored but NOT used in:
- Data filtering queries
- Domain-specific settings
- Domain isolation

#### Domain-Specific Configurations:

1. **tax_configurations** - PARTIAL domain support
   ```prisma
   model tax_configurations {
     business_id String?    // Optional - PROBLEMATIC
     domain String         // Domain field present
     // Problem: business_id is optional; unclear relationship
   }
   ```
   **Issue**: Domain and business_id mismatch; tax rules per domain but business optional

2. **domain_data JSON** - Exists but underutilized
   ```
   Tables with domain_data field:
   - customers
   - products
   - vendors
   - boms
   - purchases
   - quotations
   - sales_orders
   - delivery_challans
   - stock_movements
   - product_batches
   - production_orders
   
   PROBLEM: domain_data is unstructured JSON
   - No schema validation
   - No index optimization (only BRIN GIN indexes)
   - Unclear what data is stored
   - No migrations when domain requirements change
   ```

### 2.2 Domain-Specific Isolation

#### ⚠️ MAJOR GAP: No domain-specific table separation

```
Expected for true multi-domain support:
1. Domain-specific configurations
   - Workflows differ by domain (retail vs manufacturing)
   - Validation rules differ
   - Field requirements differ
   
Current state: Single schema forced to support all domains
Result: Complex application logic, not database-level isolation
```

#### Domain Variants Needed:

**For Retail vs Wholesale vs Manufacturing:**
```
Missing:
- Sales channels (online, physical, wholesale)
- Shipping policies per domain
- Return policies per domain
- Tax exemptions per domain
- Pricing strategies per domain
- Inventory locations per domain
```

### 2.3 Tax Configuration Issue - Critical

```prisma
model tax_configurations {
  business_id String? @db.Uuid      // ⚠️ OPTIONAL!
  domain String                      // Required
  // ...
}
```

**Problems:**
1. `business_id` is optional - allows NULL values
2. Tax rules can exist without business association
3. Multiple businesses could share tax config (unintended)
4. No FK constraint on business_id when present

**Recommended Fix:**
```prisma
model tax_configurations {
  id String @id
  business_id String @db.Uuid       // REQUIRED, add @unique with domain
  domain String
  // ...
  
  @@unique([business_id, domain])    // Enforce: one config per business+domain
}
```

---

## 3. DATA RELATIONSHIPS & INTEGRITY ANALYSIS

### 3.1 Orphaned Data Risks

#### ⚠️ IDENTIFIED RISKS:

```
1. **invoice_items → invoices (risky)**
   - FK: onDelete: Cascade ✅ (good)
   - Risk: Deleted invoices cascade-delete items (ok for soft delete)
   - Issue: Hard deletes would orphan (no soft delete on invoices)

2. **payment_allocations → invoices/purchases**
   - FK: onDelete: NoAction ⚠️
   - Risk: Can't delete invoice if payment allocated
   - Better: onDelete: SetNull (allow payment reallocation)

3. **stock_transfers**
   - FKs: from_warehouse_id, to_warehouse_id with Cascade
   - Risk: Deleting warehouse cascades all transfers (destructive!)
   - Better: SetNull for archived warehouses

4. **production_orders → boms, products, warehouses**
   - Multiple FKs to products/boms
   - Risk: Cross-business linking via no business_id validation
   - Better: Add cross-validation in app

5. **delivery_challan_items → products**
   - FK: onDelete: Restrict
   - Risk: Can't delete product if linked to any challan
   - Issue: No soft delete on products means hard blocker

6. **quotation_items, sales_order_items → products**
   - FK: onDelete: Restrict
   - Risk: Can't delete products used in historic quotations/orders
   - Better: onDelete: SetNull (keep history)
```

### 3.2 Audit Trail Completeness

#### ✅ PRESENT:
- `audit_logs` table with comprehensive tracking
- `created_at`, `updated_at` on most tables
- `created_by`, `approval_by`, `sent_by`, `viewed_date` on invoices
- `workflow_history` for tracking state changes

#### ❌ GAPS:

```
1. **No audit logging on:**
   - Users created/modified (only User table exists globally)
   - business_users changes (who granted access)
   - permissions changes
   - sensitive fields (passwords, tokens)

2. **Incomplete audit fields:**
   - products: NO created_by, NO tracking of price changes
   - customers: NO last_modified_by
   - vendors: NO modification tracking
   - payments: NO approval_by, NO approval_date
   - stock_movements: NO user who initiated

3. **Missing change tracking:**
   - No OLD vs NEW value comparison in audit_logs.changes
   - No field-level audit (which exact field changed)
   - No reason/description for user actions
   - No IP/user_agent tracking on all transactions

4. **Audit retention:**
   - No policy on audit log retention
   - No archival strategy for old logs
   - Large table management not addressed

5. **No temporal queries:**
   - No way to query product prices as of a date
   - No inventory history at a point in time
   - No customer credit limit history
```

### 3.3 Critical Data Integrity Issues

#### 1️⃣ Invoice Status State Machine - INCOMPLETE

```prisma
invoices {
  status String?  // ⚠️ Optional, unvalidated
  // Expected: draft, sent, viewed, approved, payment_pending, 
  //           partially_paid, paid, overdue, voided, amended
  
  approval_status String?  // Another status field!
  // Possible: none, pending, approved, rejected
  
  payment_status String?   // THIRD status field!
  // Possible: pending, partially_paid, paid
  
  fbr_status String?       // FOURTH status field!
  // Possible: pending, valid, invalid, sync_error
}
```

**Problems:**
- ❌ Multiple status fields create state confusion
- ❌ No state machine validation (bad statuses possible)
- ❌ No enforcement of valid transitions (draft → sent OK, but paid → draft?)
- ❌ Status values hardcoded in comments, not in enum or CHECK constraint
- ❌ No check that all statuses are consistent (e.g., paid but approval_status=pending)

**Fix:** Create status enums and CHECK constraints:
```prisma
model invoices {
  status InvoiceStatus           // Use enum
  approval_status ApprovalStatus // Use enum
  payment_status PaymentStatus   // Use enum
  fbr_status FBRStatus          // Use enum
  
  // ADD CHECK CONSTRAINT:
  // IF status == "paid" THEN payment_status MUST be "paid"
  // IF status == "pending" THEN approval_status CANNOT be "approved"
}
```

#### 2️⃣ Purchase Return Items - No Quantity Validation

```prisma
model purchase_return_items {
  quantity Decimal              // No check quantity > 0
  unit_price Decimal            // No check price > 0
  total Decimal                 // Not calculated; could be wrong
}
```

**Missing:**
- CHECK (quantity > 0)
- CHECK (unit_price >= 0)
- CHECK (total = quantity * unit_price) - Calculate in trigger
- FK to original purchase_items (no lineage)

#### 3️⃣ Credit Notes - Incomplete Reversal Tracking

```prisma
model credit_notes {
  invoice_id String?            // Source invoice (optional!)
  applied_to_invoice_id String? // Applied to another invoice
  // Problem: Could be orphaned (no source)
  // Problem: Could be applied to wrong invoice
  // Problem: Could be applied multiple times (no check)
}
```

**Missing:**
- Unique constraint on (business_id, credit_note_number)
- CHECK: invoice_id NOT NULL
- CHECK: if applied_to_invoice_id, then status != "draft"
- Tracking: applied_at timestamp
- Prevent: applying same credit note twice

#### 4️⃣ Inventory - Impossible to Reconcile

```prisma
// NO SINGLE SOURCE OF TRUTH for inventory
products {
  stock Decimal?                // Denormalized stock
}

product_stock_locations {
  quantity Decimal              // Stock per location
  // But warehouse_id is optional!
}

product_batches {
  quantity Decimal              // Batch quantity
  reserved_quantity Decimal     // Reserved for orders
}

stock_movements {
  quantity_change Decimal       // Log of changes
}

inventory_ledger {
  quantity_change Decimal       // Duplicate log
  running_balance Decimal?      // Could be wrong
}

inventory_reservations {
  quantity Decimal              // Reserved quantity
}
```

**Problems:**
- ❌ Multiple sources of truth (products.stock, product_stock_locations, product_batches)
- ❌ No reconciliation mechanism
- ❌ stock_movements and inventory_ledger both exist (duplicate?)
- ❌ product.stock is denormalized (get out of sync)
- ❌ No triggers to update stock on stock_movement insert
- ❌ Reservations not automatically deducted from available stock
- ❌ No check: product_stock_locations.quantity = SUM(batches in warehouse)

#### 5️⃣ GL Entries - Unbalanced Journal

```prisma
model gl_entries {
  debit Decimal?  @default(0)
  credit Decimal? @default(0)
  // No check: exactly one of debit/credit is non-zero
  // No check: total debits = total credits in journal_entries
  // No trigger to validate ledger balanced
}
```

**Missing:**
- CHECK (debit * credit = 0) - Can't have both
- CHECK ((debit != 0 OR credit != 0)) - Must have one
- Journal-level integrity check
- No automatic reversal journal support

---

## 4. PERFORMANCE & OPTIMIZATION ISSUES

### 4.1 Missing Critical Indexes

#### ⚠️ HIGH IMPACT - Currently Missing:

```sql
-- 1. Invoices frequently filtered by due date
ALTER TABLE invoices ADD INDEX idx_invoices_due_date 
  (business_id, due_date DESC);

-- 2. Payments by customer (AR aging)
ALTER TABLE payments ADD INDEX idx_payments_customer_date 
  (business_id, customer_id, payment_date DESC);

-- 3. Payable analysis
ALTER TABLE purchases ADD INDEX idx_purchases_vendor_date 
  (business_id, vendor_id, date DESC);

-- 4. Stock availability (very hot)
ALTER TABLE product_stock_locations ADD INDEX idx_psl_warehouse_product 
  (warehouse_id, product_id, quantity DESC)
  WHERE quantity > 0;

-- 5. Batch expiry lookups
ALTER TABLE product_batches ADD INDEX idx_batch_expiry_active 
  (expiry_date, is_active)
  WHERE is_active = true AND expiry_date < NOW();

-- 6. GL account hierarchy
ALTER TABLE gl_accounts ADD INDEX idx_gl_parent_children 
  (parent_id, is_active);

-- 7. Journal entry reconciliation
ALTER TABLE gl_entries ADD INDEX idx_gl_balance_check 
  (business_id, journal_id, transaction_date);

-- 8. Sales order fulfillment
ALTER TABLE sales_orders ADD INDEX idx_so_status_delivery 
  (business_id, status, delivery_date DESC);

-- 9. Customer credit limit check
ALTER TABLE customers ADD INDEX idx_customers_credit 
  (business_id, is_deleted, outstanding_balance DESC);

-- 10. Vendor payment analysis
ALTER TABLE vendors ADD INDEX idx_vendors_credit 
  (business_id, is_deleted, outstanding_balance DESC);

-- 11. POS transaction reconciliation
ALTER TABLE pos_transactions ADD INDEX idx_pos_reconcile 
  (business_id, session_id, created_at DESC);

-- 12. Delivery challan tracking
ALTER TABLE delivery_challans ADD INDEX idx_dc_status_date 
  (business_id, status, created_at DESC);

-- 13. Expense auditing
ALTER TABLE expenses ADD INDEX idx_expenses_date_category 
  (business_id, date DESC, category);

-- 14. Purchase return reconciliation
ALTER TABLE purchase_returns ADD INDEX idx_pr_status_date 
  (business_id, status, return_date DESC);
```

### 4.2 N+1 Query Risks

#### ⚠️ IDENTIFIED PATTERNS:

```
1. Invoice → invoice_items → products → product_stock_locations
   Problem: Loading invoice with items requires fetching each product's
            stock in each warehouse
   Fix: Use select(include) carefully; consider denormalizing available_qty

2. Sales Order → sales_order_items → products → GL accounts (cost)
   Problem: Need GL accounts to calculate COGS impact
   Fix: Denormalize cost_price on sales_order_items

3. Customer → invoices → invoice_items → products
   Problem: Customer statement report requires loading all data
   Fix: Create materialized view or denormalized customer_summary table

4. Warehouse → product_stock_locations → product → batches → serials
   Problem: Stock reconciliation cascading loads
   Fix: Use aggregation queries; avoid loading full objects

5. Purchase → purchase_items → products → tax_configurations
   Problem: Tax calculation on loads
   Fix: Store tax_percent on purchase_items directly
```

### 4.3 Large Table Management

#### 📊 TABLES LIKELY TO GROW VERY LARGE:

| Table | Est. Rows/Year | Management Issue |
|-------|---|---|
| audit_logs | 1-10M | Retention policy needed |
| stock_movements | 100K-1M | Archive old movements |
| inventory_ledger | 100K-1M | Duplicate with stock_movements? |
| gl_entries | 10K-100K | Partition by period |
| pos_transaction_items | 100K-1M | Archive by year |
| workflow_history | 50K-500K | Archive old workflows |
| campaign_messages | 100K-10M | Archive sent campaigns |
| loyalty_transactions | 100K-1M | Archive expired points |
| invoice_payment_reminders | 100K-500K | Auto-cleanup sent |
| kitchen_orders | 50K-500K | Archive daily |

#### ❌ MISSING: Archival Strategy

```
No tables have:
- Partition keys (by date/business)
- Archival procedures
- Data retention policies
- Cleanup triggers
- Materialized views for reporting
```

**Recommendation:**
```sql
-- Add partitioning to hot tables
ALTER TABLE audit_logs PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Add retention policy metadata
ALTER TABLE audit_logs ADD COLUMN retention_expires_at TIMESTAMP;
CREATE INDEX idx_audit_retention ON audit_logs(retention_expires_at);
```

### 4.4 Denormalization Opportunities

#### ⚠️ Excessive Normalization (Killing Performance):

```
Current:
- invoice_items.total_amount = quantity * unit_price - discount_amount
- Must calculate every query
- No index on total_amount

Better: Store calculated field + trigger

Current:
- Payment status = custom calculation from payment_allocations
- Must JOIN and SUM to know payment status
- Repeated on invoice pages

Better: Denormalize payment_status on invoices with trigger
```

#### ✅ Good Denormalization:
- customer.outstanding_balance (should have trigger)
- vendor.outstanding_balance (should have trigger)
- product_batches.reserved_quantity (good)
- product_stock_locations.quantity (good)

#### ❌ Missing Denormalization:
- Invoice line item totals (calculated on read)
- Purchase line item totals (calculated on read)
- Customer YTD sales (calculated on read)
- Vendor spend (calculated on read)

---

## 5. GAPS VS INDUSTRY STANDARDS (Zoho, Odoo, SAP)

### 5.1 Missing Standard Fields

#### 📋 ACCOUNTING/TAX FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| VAT Registration | ✅ | ✅ | ✅ | ❌ | Not stored for businesses |
| Tax ID Type | ✅ | ✅ | ✅ | ❌ (hardcoded to ntn) | Only supports Pakistan NTN |
| Tax Bracket/Slab | ✅ | ✅ | ✅ | ❌ | No tax bracket configuration |
| Effective Tax Rate | ✅ | ✅ | ✅ | ❌ | No calculation logic |
| GST/HST/PST Split | ✅ | ✅ | ✅ | ⚠️ (only single tax_percent) | Multi-component tax unsupported |
| Tax Exemption Reason | ✅ | ✅ | ✅ | ❌ | No exemption tracking |
| Reverse Charge Applicable | ✅ | ✅ | ✅ | ❌ | Not tracked |
| Tax Holiday / Exemption Period | ✅ | ✅ | ✅ | ❌ | No date-based exemptions |

#### 🏢 BUSINESS/ENTITY FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| Business Type (Partnership/Sole/PLC/LLC) | ✅ | ✅ | ✅ | ❌ | No entity type |
| Legal Name vs Trading Name | ✅ | ✅ | ✅ | ⚠️ (only business_name) | No legal name field |
| Bank Account (multiple) | ✅ | ✅ | ✅ | ❌ | Only vendor.bank_account |
| IBAN/SWIFT | ✅ | ✅ | ✅ | ❌ | Not stored |
| Subsidiaries/Branches | ✅ | ✅ | ✅ | ❌ | No parent-child relationships |
| Financial Year Lock | ✅ | ✅ | ✅ | ⚠️ (fiscal_periods.status) | Partial implementation |
| Audit Trail Lock Date | ✅ | ✅ | ✅ | ❌ | No retention lock |
| Consolidation Group | ✅ | ✅ | ✅ | ❌ | No multi-entity rollup |

#### 💳 CUSTOMER/VENDOR FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| Tax Exemption Status | ✅ | ✅ | ✅ | ⚠️ (filer_status only) | Incomplete taxonomy |
| Industry Classification (ISIC/NACE) | ✅ | ✅ | ✅ | ❌ | No industry code |
| Preferred Incoterm | ✅ | ✅ | ✅ | ❌ | Not tracked |
| Credit Policy (Manual/Automatic) | ✅ | ✅ | ✅ | ❌ | No credit policy |
| Preferred Payment Terms by Document | ✅ | ✅ | ✅ | ⚠️ (only default_payment_terms) | Single term only |
| Credit Hold Status | ✅ | ✅ | ✅ | ❌ | No credit hold logic |
| Customer Segmentation (Auto) | ✅ | ✅ | ✅ | ⚠️ (customer_segments manual) | Not automated |
| Dunning Policy (Auto Invoice Generation) | ✅ | ✅ | ✅ | ⚠️ (invoice_payment_reminders) | Limited; no auto-invoice |
| Aging Bucket Calculation | ✅ | ✅ | ✅ | ❌ | Not calculated; query-only |
| Revenue Recognition Method | ✅ | ✅ | ✅ | ❌ | Not tracked |

#### 📦 INVENTORY FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| ABC Analysis Status | ✅ | ✅ | ✅ | ❌ | Not calculated |
| Lead Time (Days) | ✅ | ✅ | ✅ | ❌ | No vendor lead time |
| Safety Stock Calculation | ✅ | ✅ | ✅ | ❌ | No formula fields |
| Service Level (%) | ✅ | ✅ | ✅ | ❌ | Not tracked |
| Inventory Valuation Method | ✅ | ✅ | ✅ | ❌ | FIFO/LIFO not configured |
| Landed Cost Tracking | ✅ | ✅ | ✅ | ❌ | Only unit_cost on products |
| Scrap/Waste Tracking | ✅ | ✅ | ✅ | ❌ | No waste GL accounts |
| Slow Moving Items | ✅ | ✅ | ✅ | ❌ | Not calculated |
| Obsolescence Date | ✅ | ✅ | ✅ | ❌ | No obsolescence field |
| Quality Grade (A/B/C) | ✅ | ✅ | ✅ | ❌ | Not tracked |
| Lot Number (vs Serial) | ✅ | ✅ | ✅ | ⚠️ (batch_number present) | No lot/lot-serial distinction |

#### 📊 TRANSACTION FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| Round-off Adjustment (Auto) | ✅ | ✅ | ✅ | ❌ | Manual rounding only |
| Realized Gain/Loss (Foreign Exchange) | ✅ | ✅ | ✅ | ❌ | exchange_rates table exists but no realized GL postings |
| Inter-company Elimination | ✅ | ✅ | ✅ | ❌ | No consolidation support |
| Cost Center (Profit Center) | ✅ | ✅ | ✅ | ❌ | No cost center hierarchy |
| Project Billing (% Complete) | ✅ | ✅ | ✅ | ❌ | No project module |
| Retainage/Holdback | ✅ | ✅ | ✅ | ❌ | No retainage on invoices |
| Progress Billing | ✅ | ✅ | ✅ | ❌ | No milestone-based invoicing |
| Milestone Tracking | ✅ | ✅ | ✅ | ❌ | No milestones |
| Performance Obligation (ASC 606) | ✅ | ✅ | ✅ | ❌ | No revenue recognition tracking |

#### 🏭 MANUFACTURING FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| Bill of Material Versioning | ✅ | ✅ | ✅ | ❌ (only version JSON) | No version control |
| Engineering Change Order (ECO) | ✅ | ✅ | ✅ | ❌ | No ECO module |
| Scrap Allowance % | ✅ | ✅ | ✅ | ❌ | Not tracked on BOM |
| Co-product/By-product | ✅ | ✅ | ✅ | ❌ | Only finished goods |
| Phantom BOM | ✅ | ✅ | ✅ | ❌ | Not supported |
| Work in Progress (WIP) Accounts | ✅ | ✅ | ✅ | ❌ | No WIP GL accounts |
| Rework Orders | ✅ | ✅ | ✅ | ❌ | No rework tracking |
| Quality Inspection | ✅ | ✅ | ✅ | ⚠️ (only status field) | Minimal quality tracking |
| Downtime Tracking | ✅ | ✅ | ✅ | ❌ | No downtime records |
| Batch/Lot Tracking | ✅ | ✅ | ✅ | ⚠️ (batch_number) | Limited traceability |

#### 🏪 RETAIL/POS FIELDS:

| Field | Zoho | Odoo | SAP | Current | Issue |
|-------|------|------|-----|---------|-------|
| Fast Moving Consumer Goods (FMCG) Support | ✅ | ✅ | ✅ | ❌ | No FMCG-specific fields |
| Barcode/QR Code Auto-Generation | ✅ | ✅ | ✅ | ❌ | Only barcode storage |
| Promotional Calendar | ✅ | ✅ | ✅ | ⚠️ (promotions table exists) | Limited date management |
| Price Bands/Tiers | ✅ | ✅ | ✅ | ⚠️ (price_lists) | No time-based bands |
| Electronic Shelf Labels (ESL) | ✅ | ✅ | ✅ | ❌ | No ESL integration |
| Customer Self-Service Portal | ✅ | ✅ | ✅ | ❌ | Not implemented |
| Omnichannel Inventory | ✅ | ✅ | ✅ | ❌ | Single warehouse focus |
| Ship from Store | ✅ | ✅ | ✅ | ❌ | Not supported |

### 5.2 Missing Relationships

#### ❌ CRITICAL RELATIONSHIPS NOT MODELED:

```
1. Customers ← Invoices ← GL Entries
   Problem: Can't directly query which GL accounts are impacted by customer transactions
   Fix: Add customer_id to gl_entries or create summary table

2. Suppliers ← Purchase Prices → Products (Historical)
   Problem: Can't track supplier price history
   Fix: Add supplier_prices table with effective_date

3. Customers ← Orders ← Inventory Reservations
   Problem: Hard to track reserved inventory by customer
   Fix: Add customer_id to inventory_reservations

4. Products ← Stock Movements ← Users (Who moved stock?)
   Problem: No user tracking on stock movements
   Fix: Add created_by to stock_movements

5. Invoice ← Credit Notes ← Reason (Categorized)
   Problem: Can't report on credit note reasons
   Fix: Add credit_note_reason table with reason categories

6. Invoices ← Payment ← Bank Account
   Problem: Can't reconcile by bank account
   Fix: Add bank_account_id to payments

7. GL Accounts ← Budget Allocations
   Problem: No budget vs actual tracking
   Fix: Add budgets table linked to GL accounts

8. Customers ← Service Plans (SaaS model)
   Problem: No subscription/recurring revenue model
   Fix: Add subscription/service_plans table

9. Products ← Supplier Alternative
   Problem: Can't track alternative suppliers for same product
   Fix: Add product_suppliers table

10. Invoices ← Insurance Claims (for damaged goods)
    Problem: No claim tracking for insured losses
    Fix: Add insurance_claims table
```

### 5.3 Missing Status/Lifecycle Tracking

#### ⚠️ INCOMPLETE STATE MACHINES:

| Entity | Current Status | Missing States | Issue |
|--------|---|---|---|
| Invoices | draft, sent, viewed, approved, payment_pending, partially_paid, paid, overdue, voided, amended | **recurring_paused**, cancelled | No pause state for recurring; no explicit cancel |
| Purchases | pending, approved(?), received(?), paid(?), invoiced(?) | Many missing | Status not even documented |
| Sales Orders | pending, completed, cancelled(?) | **awaiting_approval**, **on_hold**, **returned** | No approval workflow states |
| Quotations | draft, accepted(?), rejected(?) | Many missing | No expiry state; no follow-up |
| Payments | pending, allocated(?) | **reconciled**, **cleared_at_bank** | No bank reconciliation states |
| Purchase Returns | pending, approved, completed | **rejected**, **partially_received** | No rejection state |
| POS Transactions | completed(?), voided | **refunded**, **exchanged** | Limited refund tracking |
| Delivery Challans | issued | **in_transit**, **received**, **exception** | Too simplistic |

### 5.4 Missing Audit & Control Fields

#### ⚠️ MISSING BUSINESS CONTROLS:

```
1. Approval Workflows
   Current: invoice_approvals table (limited)
   Missing: 
   - Multi-step approvals (not just approved/rejected)
   - Approval chains per document type
   - Approval amounts ($10K needs CFO, <$10K needs Manager)
   - Delegation support (approver can delegate)
   - Auto-escalation if not approved in X days

2. Segregation of Duties
   Missing:
   - User cannot both create AND approve same transaction
   - User cannot modify deleted records
   - User cannot modify invoices with status >= "sent"
   - No enforced controls in database

3. Change Tracking
   Missing:
   - Who changed what field from X to Y
   - When field history (point-in-time queries)
   - Reason for change on sensitive fields
   - Change request workflow on price/discount fields

4. Authorization Levels
   Current: business_users.permissions (JSON blob)
   Missing:
   - Structured permission matrix
   - Document-level access control
   - Branch-level restrictions
   - Customer/Vendor account restrictions
   - GL Account restrictions

5. Variance Analysis
   Missing:
   - Budget variance tracking
   - Inventory variance threshold
   - Price variance approvals
   - Quantity variance tracking
```

### 5.5 Missing Financial Features

#### 💼 STANDARD ACCOUNTING GAPS:

```
1. Consolidated Financial Statements
   Missing: No multi-entity rollup support

2. Inter-company Transactions
   Missing: No elimination entries for consolidation

3. Cost Allocation
   Missing: No cost center hierarchies
   Missing: No overhead allocation

4. Revenue Recognition
   Missing: No ASC 606 / IFRS 15 support
   Missing: No performance obligations
   Missing: No milestone-based revenue

5. Fixed Asset Management
   Missing: No asset register
   Missing: No depreciation schedules
   Missing: No asset disposal module

6. Lease Accounting (IFRS 16)
   Missing: No lease register
   Missing: No ROU asset calculations
   Missing: No lease liability tracking

7. Foreign Exchange
   Current: exchange_rates table exists
   Missing: No realized/unrealized gain/loss posting
   Missing: No revaluation of AP/AR in foreign currency
   Missing: No hedge accounting

8. Intercompany Billing
   Missing: No intercompany invoice routing

9. Transfer Pricing
   Missing: No TP documentation support

10. Deferred Revenue / Subscription
    Missing: No deferred revenue account linking
    Missing: No revenue recognition schedule
```

---

## 6. SPECIFIC RECOMMENDATIONS BY SEVERITY

### 🔴 CRITICAL (Implement ASAP)

```
1. ✅ DONE: Add uniqueness constraints to all tenant-scoped identifiers
   - customers: (business_id, email) unique
   - vendors: (business_id, name) unique
   - warehouse_locations: (business_id, code) unique
   - payments: (business_id, reference_id, reference_type) unique

2. ❌ TODO: Add cross-FK validation
   - Prevent sales_order_items.product_id from different business
   - Prevent bom_materials from cross-business linking
   - Add CHECK constraints or app-level validation

3. ❌ TODO: Fix tax_configurations
   - Make business_id required (NOT NULL)
   - Add unique (business_id, domain)
   - Rebuild existing rows

4. ❌ TODO: Implement soft deletes consistently
   - Add is_deleted, deleted_at to: sales_orders, quotations, payments, 
     journal_entries, delivery_challans, purchase_returns

5. ❌ TODO: Create invoice state machine
   - Add CHECK constraints on status transitions
   - Validate approval_status + payment_status consistency
   - Add CHECK (if payment_status='paid' then status='paid')

6. ❌ TODO: Inventory single source of truth
   - Determine: Use product_stock_locations as truth
   - Add trigger to maintain product.stock
   - Remove invoice/stock ledger duplication

7. ❌ TODO: Add missing business entity fields
   - entity_type (Sole/Partnership/PLC/LLC)
   - legal_name (vs business_name)
   - bank_accounts (separate table)
   - tax_exemption_reason (if applicable)
```

### 🟠 HIGH PRIORITY (Next Sprint)

```
1. Add missing performance indexes (12 listed above)
2. Implement audit trail for users/permissions
3. Add soft delete to remaining tables
4. Create tax bracket configuration table
5. Add cost center table and FK relationships
6. Implement approval workflow state machine
7. Add customer/vendor credit hold tracking
8. Create exchange rate revaluation GL postings
9. Add invoice line-item totals denormalization
10. Implement point-in-time audit queries
```

### 🟡 MEDIUM PRIORITY (Q2/Q3)

```
1. Add multi-component tax support (GST/HST/PST split)
2. Implement progress/milestone billing
3. Add project module (project, milestones, time tracking)
4. Create budget vs actual variance tables
5. Add supplier alternative products table
6. Implement subscription/recurring revenue table
7. Add cost center allocation rules
8. Create fixed asset management module
9. Implement dunning management (auto-invoice generation)
10. Add inter-company transaction support
```

### 🟢 NICE TO HAVE (Later)

```
1. IFRS 16 lease accounting module
2. Consolidated financial statements (multi-entity)
3. Transfer pricing documentation
4. Electronic Shelf Labels (ESL) integration
5. Omnichannel inventory support
6. Customer self-service portal schema
7. Field-level encryption for PII
8. Materialized views for reporting
9. Data warehouse denormalization layer
10. Real-time financial reporting cubes
```

---

## 7. TABLE-BY-TABLE RISK MATRIX

| Table | Multi-Tenancy | Domain Support | Data Integrity | Performance | Industry Gap | Overall Risk |
|-------|---|---|---|---|---|---|
| users | ⚠️ Global | ⚠️ Not needed | ⚠️ No audit | ⚠️ Many queries | ✅ OK | 🟡 Medium |
| businesses | ✅ OK | ⚠️ Domain used but not enforced | ✅ OK | ✅ OK | 🟠 Tax fields | 🟡 Medium |
| invoices | ✅ OK | ⚠️ domain_data unused | 🔴 State confusion | 🔴 No due date index | ✅ Close to standard | 🔴 HIGH |
| invoice_items | ✅ OK | ✅ OK | ⚠️ Orphan risk | ⚠️ N+1 risk | 🟠 Performance obligation | 🟡 Medium |
| products | ✅ OK | ⚠️ domain_data unused | 🔴 Inventory chaos | 🟠 Many FK types | 🔴 ABC/safety stock | 🔴 HIGH |
| product_stock_locations | ✅ OK | ✅ OK | 🔴 Warehouse NULL risk | 🔴 Needs index | 🟠 Inventory valuation | 🔴 HIGH |
| purchases | ✅ OK | ⚠️ domain_data unused | 🟠 Status undefined | ⚠️ No vendor date index | ✅ OK | 🟡 Medium |
| customers | ✅ OK | ⚠️ domain_data unused | 🔴 No unique constraint | ⚠️ Credit check slow | 🔴 Many missing fields | 🔴 HIGH |
| vendors | ✅ OK | ⚠️ domain_data unused | 🔴 No unique constraint | ⚠️ No index | 🔴 No supplier prices | 🔴 HIGH |
| gl_entries | ✅ OK | ✅ OK | 🔴 No journal balance check | ⚠️ No date index | 🟠 Cost center missing | 🟡 Medium |
| payments | ✅ OK | ⚠️ domain_data unused | 🔴 No allocation check | ⚠️ No date index | 🔴 Bank recon missing | 🔴 HIGH |
| audit_logs | ✅ OK | ✅ OK | ⚠️ Missing details | 🔴 No retention policy | ✅ Close to standard | 🟡 Medium |
| pos_transactions | ✅ OK | ✅ OK | 🟠 Void vs refund | ⚠️ No reconciliation index | ✅ OK | 🟡 Medium |
| inventory_ledger | ✅ OK | ✅ OK | 🔴 Duplicate with stock_movements | 🔴 No indexes | ✅ OK | 🔴 HIGH |
| stock_movements | ✅ OK | ⚠️ domain_data unused | 🟠 No user tracking | ⚠️ Few indexes | ✅ OK | 🟡 Medium |
| tax_configurations | 🔴 business_id optional | 🟠 Domain present | 🔴 No FK constraint | ✅ OK | 🔴 Single tax rate only | 🔴 CRITICAL |
| boms | ✅ OK | ⚠️ domain_data unused | 🟠 No cross-FK validation | ⚠️ Few indexes | 🟠 Limited BOM types | 🟡 Medium |
| production_orders | ✅ OK | ⚠️ domain_data unused | 🟠 Cross-FK risk | ⚠️ Few indexes | 🟠 No WIP/rework | 🟡 Medium |
| sales_orders | ✅ OK | ⚠️ domain_data unused | 🟠 No soft delete | 🟠 No status index | ✅ OK | 🟡 Medium |
| quotations | ✅ OK | ⚠️ domain_data unused | 🟠 No soft delete | ✅ OK | 🟠 No auto follow-up | 🟡 Medium |
| credit_notes | ✅ OK | ✅ OK | 🔴 No source invoice FK | ⚠️ Few indexes | ✅ OK | 🔴 HIGH |
| purchase_returns | ✅ OK | ✅ OK | 🔴 No item validation | ✅ OK | ⚠️ Limited reason tracking | 🟡 Medium |
| journal_entries | ✅ OK | ✅ OK | 🔴 No balance check; no soft delete | ⚠️ Few indexes | 🟠 No cost center | 🟡 Medium |
| expenses | ✅ OK | ✅ OK | ⚠️ Limited validation | ⚠️ No category index | ✅ OK | 🟡 Medium |
| pos_refunds | ✅ OK | ✅ OK | ⚠️ Restock assumption | ✅ OK | ✅ OK | 🟢 Low |
| restaurant_* | ✅ OK | ✅ OK | ⚠️ Few constraints | ✅ OK | ⚠️ Limited features | 🟡 Medium |
| loyalty_* | ✅ OK | ✅ OK | ⚠️ No expiry enforcement | ✅ OK | ⚠️ Limited features | 🟢 Low |
| promotions | ✅ OK | ✅ OK | ⚠️ Date range not validated | ✅ OK | ⚠️ Limited types | 🟢 Low |
| approval_requests | ✅ OK | ✅ OK | ⚠️ Limited states | ✅ OK | ✅ OK | 🟢 Low |
| payroll_* | ✅ OK | ✅ OK | ⚠️ Limited validations | ✅ OK | 🟠 Pakistan-specific | 🟡 Medium |

---

## 8. ACTION PLAN

### PHASE 1: DATA INTEGRITY (Weeks 1-2)

- [ ] Add missing uniqueness constraints
- [ ] Fix tax_configurations business_id
- [ ] Add soft delete fields to remaining tables
- [ ] Create state machine checks for invoices
- [ ] Fix inventory source-of-truth

### PHASE 2: PERFORMANCE (Weeks 3-4)

- [ ] Add 12 missing performance indexes
- [ ] Denormalize line item totals
- [ ] Create denormalized customer/vendor summary tables
- [ ] Profile and optimize N+1 risks
- [ ] Add table partitioning strategy

### PHASE 3: AUDIT & CONTROL (Weeks 5-6)

- [ ] Implement user action audit trail
- [ ] Add approval workflow state machine
- [ ] Create change tracking for sensitive fields
- [ ] Implement segregation of duties checks
- [ ] Add credit hold logic

### PHASE 4: INDUSTRY STANDARDS (Weeks 7-12)

- [ ] Add tax bracket configuration
- [ ] Implement cost centers
- [ ] Add budget vs actual tracking
- [ ] Create supplier alternative products
- [ ] Add subscription/recurring revenue support

---

## 9. TESTING RECOMMENDATIONS

```gherkin
# Multi-Tenancy Tests
Scenario: Cannot access other business records
  Given two businesses exist
  When Business A user queries Business B data
  Then no results returned

Scenario: Unique business ID constraints enforced
  Given Business A has customer "Acme Corp"
  When Business B tries to create customer "Acme Corp" with same email
  Then succeeds (different business_id)

# Invoice State Machine Tests
Scenario: Cannot skip states
  Given invoice in "draft" status
  When user attempts to change to "paid"
  Then error: must transition through valid states

# Inventory Tests
Scenario: Stock accuracy reconciliation
  Given product stock = 100
  When sum of (batches + reserved + movements) calculated
  Then should equal 100 or raise discrepancy alert

# Payment Allocation Tests
Scenario: Cannot over-allocate payment
  Given invoice amount = 1000
  When total allocations attempted = 1100
  Then error: exceeds invoice amount
```

---

## CONCLUSION

**Schema Maturity: 6.5/10**

**Strengths:**
- ✅ Solid multi-tenancy foundation with cascade deletes
- ✅ Comprehensive module coverage
- ✅ Good audit logging infrastructure
- ✅ Thoughtful soft delete patterns (where implemented)
- ✅ Proper foreign key relationships (mostly)

**Critical Weaknesses:**
- 🔴 Inventory management is fragmented (multiple sources of truth)
- 🔴 Invoice state machine lacks validation
- 🔴 Tax configuration broken (optional business_id)
- 🔴 Major gaps in industry-standard fields (ABC analysis, cost centers, tax brackets)
- 🔴 No cross-business FK validation
- 🔴 Performance indexes incomplete
- 🔴 Audit trail incomplete (user actions, permission changes)

**Recommendation:** Prioritize Phase 1 (Data Integrity) immediately, then move to Phase 2 (Performance) before full production deployment.
