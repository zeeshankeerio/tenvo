# Implementation Tasks: ERP System Architecture Audit and Improvements

## Overview

Tasks are organized by priority and dependency order. Each task maps directly to requirements in `requirements.md` and design decisions in `design.md`. The system already has a solid foundation — service layer, RBAC, audit logging, Zod validation, and double-entry accounting are all in place. These tasks address the **real gaps** identified through deep codebase analysis.

---

## Phase 1: Schema & Data Integrity Hardening

### 1. Add missing composite indexes to high-traffic tables

- [x] 1.1 Add composite index `[business_id, status, date DESC]` to `invoices` table in schema
- [x] 1.2 Add composite index `[business_id, customer_id, payment_status]` to `invoices` table
- [x] 1.3 Add composite index `[business_id, product_id, created_at DESC]` to `stock_movements` table
- [x] 1.4 Add composite index `[business_id, reference_type, reference_id]` to `stock_movements` table
- [x] 1.5 Add composite index `[business_id, account_id, transaction_date DESC]` to `gl_entries` table
- [x] 1.6 Add composite index `[business_id, reference_type, reference_id]` to `gl_entries` table
- [x] 1.7 Add composite index `[business_id, entity_type, entity_id]` to `audit_logs` table
- [x] 1.8 Add composite index `[business_id, user_id, created_at DESC]` to `audit_logs` table
- [x] 1.9 Add composite index `[business_id, category, is_active]` to `products` table
- [x] 1.10 Add composite index `[business_id, vendor_id, payment_status]` to `purchases` table
- [x] 1.11 Create and run Prisma migration for all new indexes

### 2. Fix soft-delete consistency gaps

- [x] 2.1 Audit all models with `is_deleted` — verify each also has `deleted_at` (vendors, products, invoices, purchases, customers, expenses, product_serials, product_variants)
- [x] 2.2 Add `deleted_at` to `vendors` model (currently truncated in schema — confirm and add if missing)
- [x] 2.3 Add database-level CHECK constraint: `(is_deleted = false AND deleted_at IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL)` via raw migration for all soft-delete models
- [x] 2.4 Audit all Prisma queries in `lib/actions/` and `lib/api/` — ensure every list query includes `WHERE is_deleted = false` or `is_deleted IS NULL` filter
- [x] 2.5 Create shared utility `lib/utils/softDelete.js` with `softDeleteRecord(client, table, id, businessId)` and `restoreRecord(client, table, id, businessId)` helpers

### 3. Enforce payment allocation integrity

- [x] 3.1 Add database CHECK constraint to `payment_allocations`: exactly one of `invoice_id` or `purchase_id` must be non-null
- [x] 3.2 Add server-side validation in `PaymentService.allocatePayment` to prevent over-allocation (sum of allocations > payment amount)
- [x] 3.3 Add server-side validation to prevent allocating to invoices/purchases from a different customer/vendor than the payment
- [x] 3.4 Write Zod schema `paymentAllocationSchema` in `lib/validation/schemas.js` covering the above rules

### 4. Expand `assertEntityBelongsToBusiness` coverage

- [x] 4.1 Add missing entity types to `OWNED_ENTITY_TABLES` in `lib/actions/_shared/tenant.js`: `invoice_item`, `purchase_item`, `sales_order`, `quotation`, `delivery_challan`, `pos_transaction`, `journal_entry`, `gl_account`, `warehouse`, `product_batch`, `product_serial`
- [x] 4.2 Audit all `lib/actions/` files — add `assertEntityBelongsToBusiness` calls before any update/delete that accepts an entity ID from the client

---

## Phase 2: Service Layer Completeness

### 5. Complete `InvoiceService` — missing operations

- [x] 5.1 Implement `InvoiceService.fulfillInvoice(invoiceId, context)` — converts active inventory reservations to confirmed stock movements, updates status to `fulfilled`
- [x] 5.2 Implement `InvoiceService.getInvoiceWithItems(invoiceId, businessId)` — single query with JOIN to `invoice_items`, `customers`, and `products`
- [x] 5.3 Fix `voidInvoice` — currently deletes GL entries with raw DELETE; replace with proper reversal journal entry via `AccountingService.createJournalEntry` with negated amounts
- [x] 5.4 Add `InvoiceService.convertFromPOSTransaction(transactionId, context)` — creates a formal invoice from a completed POS transaction, links `pos_transactions.invoice_id`, prevents duplicates

### 6. Complete `InventoryService` — missing operations

- [x] 6.1 Implement `InventoryService.reconcileStock(productId, warehouseId, physicalCount, context)` — calculates variance, creates adjustment `stock_movement`, updates `inventory_ledger` and `product_stock_locations`
- [x] 6.2 Fix `transferStock` — currently marks transfer as `completed` immediately; implement proper two-step flow: `initiate` (status: `in_transit`, deduct source) → `receive` (status: `received`, add destination)
- [x] 6.3 Add `InventoryService.getAvailableStock(productId, businessId, warehouseId?)` — returns `stock - active_reservations` as the true available quantity
- [x] 6.4 Add `InventoryService.expireReservations(businessId)` — marks expired `inventory_reservations` as `expired` and releases batch `reserved_quantity`; designed to be called by a scheduled job

### 7. Complete `AccountingService` — missing operations

- [x] 7.1 Implement `AccountingService.reverseJournalEntry(journalId, context)` — creates a mirror journal entry with all debits/credits swapped, links `reversed_by` on the original
- [x] 7.2 Implement `AccountingService.getTrialBalance(businessId, asOfDate)` — aggregates all `gl_entries` by account, returns debit/credit totals per account
- [x] 7.3 Implement `AccountingService.closeFiscalPeriod(periodId, context)` — validates no open transactions, marks period `closed`, prevents future postings to that period via `checkFiscalPeriodOpen`
- [x] 7.4 Add `expense` transaction type to `recordBusinessTransaction` switch — DR expense account, CR cash/bank/AP based on payment method

### 8. Complete `PaymentService` — missing operations

- [x] 8.1 Implement `PaymentService.voidPayment(paymentId, reason, context)` — reverses all `payment_allocations`, restores invoice/purchase `payment_status`, reverses GL entries via `AccountingService.reverseJournalEntry`, marks payment `voided`
- [x] 8.2 Implement `PaymentService.getOutstandingBalance(entityType, entityId, businessId)` — calculates real-time balance from `payment_allocations` rather than relying on denormalized `outstanding_balance`
- [x] 8.3 Add `PaymentService.reconcileOutstandingBalances(businessId)` — recalculates and corrects `customers.outstanding_balance` and `vendors.outstanding_balance` from source-of-truth `payment_allocations`

### 9. Complete `ManufacturingService` — missing operations

- [x] 9.1 Implement `ManufacturingService.startProduction(orderId, context)` — validates status is `planned`, checks raw material availability in `warehouse_id`, reserves materials via `InventoryService.reserveStock`, updates status to `in_progress`
- [x] 9.2 Implement `ManufacturingService.completeProduction(orderId, actualQuantity, context)` — consumes raw materials (negative `stock_movements`), produces finished goods in `output_warehouse_id` (positive `stock_movements`), creates GL entries via `AccountingService`, updates status to `completed`
- [x] 9.3 Implement `ManufacturingService.cancelProduction(orderId, reason, context)` — releases all raw material reservations, updates status to `cancelled`, audit logs with reason
- [x] 9.4 Implement `ManufacturingService.explodeBOM(bomId, quantity)` — returns flat list of required materials with quantities scaled to production quantity

### 10. Implement `DocumentSequenceService` as a proper service

- [x] 10.1 Create `lib/services/DocumentSequenceService.js` wrapping the existing `generateScopedDocumentNumber` utility
- [x] 10.2 Add `resetSequence(businessId, documentType, startNumber, context)` method with validation that no higher-numbered documents exist
- [x] 10.3 Add `getSequenceStatus(businessId, documentType)` method returning current number and prefix
- [x] 10.4 Replace all inline `generateScopedDocumentNumber` calls across actions with `DocumentSequenceService` calls

---

## Phase 3: API Route Coverage

### 11. Create REST API routes for modules missing them

- [x] 11.1 Create `app/api/v1/invoices/route.js` — GET (list with pagination/filters), POST (create) — delegates to `InvoiceService`
- [x] 11.2 Create `app/api/v1/invoices/[id]/route.js` — GET (single), PUT (update), DELETE (void)
- [x] 11.3 Create `app/api/v1/purchases/route.js` — GET, POST
- [x] 11.4 Create `app/api/v1/purchases/[id]/route.js` — GET, PUT, DELETE
- [x] 11.5 Create `app/api/v1/products/route.js` — GET (with search/filter/pagination), POST
- [x] 11.6 Create `app/api/v1/products/[id]/route.js` — GET, PUT, DELETE
- [x] 11.7 Create `app/api/v1/inventory/stock/route.js` — POST (add/remove/adjust/transfer)
- [x] 11.8 Create `app/api/v1/payments/route.js` — GET, POST
- [x] 11.9 Create `app/api/v1/payments/[id]/route.js` — GET, DELETE (void)
- [x] 11.10 Create `app/api/v1/pos/transactions/route.js` — GET, POST
- [x] 11.11 Create `app/api/v1/pos/sessions/route.js` — GET, POST (open), PUT (close)

### 12. Create shared API middleware

- [x] 12.1 Create `lib/api/_shared/middleware.js` — `withApiAuth(handler)` wrapper that extracts session, validates `business_id` from query/body, returns 401/403 on failure
- [x] 12.2 Create `lib/api/_shared/response.js` — `apiSuccess(data, status?)` and `apiError(code, message, status?)` standardized response helpers
- [x] 12.3 Create `lib/api/_shared/pagination.js` — `parsePagination(searchParams)` returning `{ page, limit, offset, sortBy, sortOrder }`
- [x] 12.4 Apply `withApiAuth` to all new API routes in tasks 11.1–11.11
- [x] 12.5 Add rate limiting headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) to all API responses

---

## Phase 4: Frontend-Backend Integration Fixes

### 13. Fix form validation consistency

- [x] 13.1 Audit `components/CustomerForm.jsx` — ensure all fields match `customerSchema` field names exactly (check `contact_person` vs `contactPerson`, `pincode` vs `postal_code`)
- [x] 13.2 Audit `components/VendorForm.jsx` — same field name consistency check against `vendorSchema` (FIXED: contactPerson → contact_person)
- [x] 13.3 Audit `components/ProductForm.jsx` — verify `tax_percent`, `cost_price`, `mrp` field names match `productSchema`; ensure `unit_conversions` is serialized correctly
- [x] 13.4 Audit `components/SalesDocumentForm.jsx` — verify item-level fields (`tax_amount`, `discount_amount`, `total_amount`) match `invoiceItemSchema`
- [x] 13.5 Audit `components/PurchaseDocumentForm.jsx` — verify fields match `purchaseSchema` and `purchaseItemSchema`
- [x] 13.6 Audit `components/JournalEntryForm.jsx` — verify entries array matches `journalEntrySchema` and `glEntryLineSchema` (FIXED: accountId → account_id at line 195)
- [x] 13.7 Audit `components/StockAdjustmentForm.jsx` — verify fields match `adjustStockSchema`
- [x] 13.8 Audit `components/StockTransferForm.jsx` — verify fields match `transferStockSchema`

### 14. Add missing error handling to forms

- [x] 14.1 Create `lib/utils/formErrorHandler.js` — `parseActionError(result)` that maps `actionFailure` codes (`PLAN_UPGRADE_REQUIRED`, `LIMIT_REACHED`, `PERMISSION_DENIED`, `VALIDATION_ERROR`) to user-friendly messages with upgrade prompts where applicable
- [x] 14.2 Apply `parseActionError` in `components/CustomerForm.jsx`, `VendorForm.jsx`, `ProductForm.jsx`
- [x] 14.3 Apply `parseActionError` in `components/SalesDocumentForm.jsx`, `PurchaseDocumentForm.jsx`
- [x] 14.4 Apply `parseActionError` in `components/JournalEntryForm.jsx`, `components/ExpenseEntryForm.jsx`
- [ ] 14.5 Apply `parseActionError` in `components/pos/` POS transaction forms
- [ ] 14.6 Ensure all forms show field-level validation errors from `VALIDATION_ERROR` details (not just a generic toast)

### 15. Fix POS form wiring

- [ ] 15.1 Audit POS transaction form in `components/pos/` — verify it calls `createPOSTransactionAction` with correct payload shape matching `POSService.createTransaction`
- [ ] 15.2 Add "Convert to Invoice" button in POS transaction detail view — calls `InvoiceService.convertFromPOSTransaction` (task 5.4)
- [ ] 15.3 Verify POS session open/close forms pass `opening_balance` and `closing_balance` as numbers, not strings
- [ ] 15.4 Verify POS refund form calls `posRefundAction` with `items` array matching `pos_refund_items` schema

---

## Phase 5: Business Logic Correctness

### 16. Implement inventory reservation lifecycle in invoice workflow

- [ ] 16.1 Update `InvoiceService.createInvoice` — after creating invoice items, call `InventoryService.reserveStock` for each product item (reference: `invoice`, referenceId: `invoice.id`)
- [ ] 16.2 Update `InvoiceService.fulfillInvoice` (task 5.1) — call `InventoryService.fulfillReservation` for each active reservation linked to the invoice
- [ ] 16.3 Update `InvoiceService.voidInvoice` — call `InventoryService.releaseStock` for each active reservation before reversing GL entries
- [ ] 16.4 Update `InventoryService.removeStock` — check `inventory_reservations` for active reservations before allowing removal; subtract reserved quantity from available

### 17. Fix stock consistency — denormalized `products.stock` sync

- [ ] 17.1 Create `lib/db/stockSync.js` — `syncProductStock(client, productId, businessId)` that recalculates `products.stock` as `SUM(product_stock_locations.quantity)` and updates the record
- [ ] 17.2 Call `syncProductStock` at the end of `InventoryService.addStock`, `removeStock`, `transferStock`, and `adjustStock`
- [ ] 17.3 Create a reconciliation script `scripts/reconcile_stock.js` that runs `syncProductStock` for all products in a business — for fixing historical drift

### 18. Implement FIFO/FEFO batch allocation in `removeStock`

- [ ] 18.1 Verify current `removeStock` batch allocation uses `ORDER BY expiry_date ASC NULLS LAST, created_at ASC` — this is FEFO; confirm it's correct for all domains
- [ ] 18.2 Add `valuation_method` parameter support: when `FIFO`, order by `created_at ASC`; when `FEFO`, order by `expiry_date ASC NULLS LAST, created_at ASC`; when `LIFO`, order by `created_at DESC`
- [ ] 18.3 Read `valuation_method` from business `settings` JSON as the default when not explicitly passed

### 19. Implement customer/vendor outstanding balance accuracy

- [ ] 19.1 Replace direct `outstanding_balance` increment/decrement in `InvoiceService` and `PaymentService` with calls to `PaymentService.reconcileOutstandingBalances` (task 8.3) after each transaction
- [ ] 19.2 Add database trigger (via raw migration) on `payment_allocations` INSERT/UPDATE/DELETE to recalculate `invoices.payment_status` automatically
- [ ] 19.3 Add `opening_balance` to outstanding balance calculation — `outstanding_balance = opening_balance + sum(unpaid_invoices) - sum(payments)`

---

## Phase 6: Security Hardening

### 20. Audit and enforce `withGuard` on all server actions

- [ ] 20.1 Audit all files in `lib/actions/basic/` — verify every exported function calls `withGuard` with an appropriate `permission`
- [ ] 20.2 Audit all files in `lib/actions/standard/` — same check
- [ ] 20.3 Audit all files in `lib/actions/premium/` — same check
- [ ] 20.4 Add missing `withGuard` calls to any action that currently uses a bare `checkAuth` helper without a permission string
- [ ] 20.5 Create `lib/rbac/permissionMap.js` — exhaustive map of all `domain.action` permission strings used across the codebase, with descriptions

### 21. Harden multi-tenancy in `lib/api/` modules

- [ ] 21.1 Audit `lib/api/invoice.js`, `lib/api/product.js`, `lib/api/purchases.js` — verify every query includes `AND business_id = $N` in WHERE clause
- [ ] 21.2 Audit `lib/api/pos.js`, `lib/api/restaurant.js`, `lib/api/manufacturing.js` — same check
- [ ] 21.3 Audit `lib/api/accounting.js`, `lib/api/payments.js`, `lib/api/expense.js` — same check
- [ ] 21.4 Add `business_id` validation to all `lib/api/` functions that accept it as a parameter — reject if it doesn't match the session's authorized business

### 22. Implement Row-Level Security (RLS) as defense-in-depth

- [ ] 22.1 Create migration `prisma/manual_migrations/rls_policies.sql` enabling RLS on the 10 highest-risk tables: `invoices`, `products`, `customers`, `vendors`, `payments`, `gl_entries`, `stock_movements`, `pos_transactions`, `purchases`, `audit_logs`
- [ ] 22.2 Create RLS policy `USING (business_id = current_setting('app.current_business_id')::uuid)` for each table
- [ ] 22.3 Update `lib/db.js` — add `SET LOCAL app.current_business_id = $businessId` at the start of each transaction
- [ ] 22.4 Test RLS policies don't break existing queries by running the test suite after applying

---

## Phase 7: Performance Optimization

### 23. Add pagination to all list queries

- [ ] 23.1 Audit `getInvoicesAction` in `lib/actions/basic/invoice.js` — add `LIMIT` and `OFFSET` with default `limit=50`
- [ ] 23.2 Audit `lib/api/product.js` list function — add cursor-based pagination for large catalogs
- [ ] 23.3 Audit `lib/api/stock.js` stock movements list — add date-range filter and `LIMIT`
- [ ] 23.4 Audit `lib/api/accounting.js` GL entries list — add date-range filter and pagination
- [ ] 23.5 Audit `lib/api/audit.js` (if exists) or `lib/actions/basic/audit.js` — add pagination and filter by `entity_type`, `action`, `user_id`

### 24. Implement query result caching for reference data

- [ ] 24.1 Create `lib/services/cache/memoryCache.js` — simple TTL-based in-memory cache with `get(key)`, `set(key, value, ttlSeconds)`, `invalidate(key)`, `invalidatePattern(prefix)`
- [ ] 24.2 Cache `gl_accounts` list per business (TTL: 5 minutes) in `AccountingService.getGLAccountsByTypes` — invalidate on account create/update
- [ ] 24.3 Cache `warehouse_locations` list per business (TTL: 5 minutes) — invalidate on warehouse create/update
- [ ] 24.4 Cache `tax_configurations` per business (TTL: 10 minutes) — invalidate on config update
- [ ] 24.5 Cache `businesses` plan/settings per business (TTL: 2 minutes) in `withGuard` — invalidate on business update

---

## Phase 8: Audit Trail Completeness

### 25. Ensure audit logging covers all critical operations

- [ ] 25.1 Add `auditWrite` call to `InventoryService.addStock` and `removeStock` (currently missing — service doesn't call audit)
- [ ] 25.2 Add `auditWrite` call to `InventoryService.transferStock` and `adjustStock`
- [ ] 25.3 Add `auditWrite` call to `AccountingService.createJournalEntry` with `changes: { entries }` payload
- [ ] 25.4 Add `auditWrite` call to `PaymentService.recordPayment` and `voidPayment`
- [ ] 25.5 Add `auditWrite` call to `ManufacturingService` for all status transitions
- [ ] 25.6 Add `auditWrite` call to `POSService.openSession`, `closeSession`, `createTransaction`, `processRefund`
- [ ] 25.7 Verify `lib/actions/_shared/audit.js` `auditWrite` is fire-and-forget (non-blocking) — confirm it doesn't `await` inside the main transaction

### 26. Create data consistency reconciliation utilities

- [ ] 26.1 Create `scripts/reconcile_financials.js` — runs `check_gl_balance()` SQL function and reports unbalanced journal entries
- [ ] 26.2 Create `scripts/reconcile_payments.js` — runs `check_payment_allocation_consistency()` and reports over-allocated payments
- [ ] 26.3 Create `scripts/reconcile_stock.js` — runs `check_product_stock_consistency()` and reports stock drift between `products.stock` and `product_stock_locations`
- [ ] 26.4 Create `app/api/admin/reconcile/route.js` — admin-only endpoint that runs all three reconciliation checks and returns a JSON report

---

## Phase 9: Testing

### 27. Write property-based tests for inventory business logic

- [ ] 27.1 Write PBT in `lib/services/__tests__/InventoryService.pbt.test.js` — property: `addStock(qty) then removeStock(qty)` always returns to original stock level
- [ ] 27.2 Write PBT — property: `products.stock` always equals `SUM(product_stock_locations.quantity)` after any operation
- [ ] 27.3 Write PBT — property: `reserveStock(qty)` never allows `available_stock < 0`
- [ ] 27.4 Write PBT — property: `transferStock` conserves total stock across warehouses (source decreases by X, destination increases by X)

### 28. Write property-based tests for financial logic

- [ ] 28.1 Write PBT in `lib/services/__tests__/AccountingService.pbt.test.js` — property: every `createJournalEntry` call results in `SUM(debit) === SUM(credit)` for that journal
- [ ] 28.2 Write PBT — property: `recordBusinessTransaction('sale', ...)` always creates exactly one AR debit and one revenue credit
- [ ] 28.3 Write PBT — property: `payment_allocations` for a payment never sum to more than `payments.amount`

### 29. Write integration tests for critical workflows

- [ ] 29.1 Write integration test: full invoice lifecycle — create → fulfill → payment → void
- [ ] 29.2 Write integration test: POS transaction → convert to invoice → refund
- [ ] 29.3 Write integration test: production order — create → start → complete → verify stock movements
- [ ] 29.4 Write integration test: multi-warehouse transfer — initiate → receive → verify both warehouse stocks
- [ ] 29.5 Write integration test: `withGuard` — verify 403 returned for wrong role, 401 for no session, correct pass-through for valid session

---

## Task Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1–4 | Schema integrity, indexes, soft-delete, constraints |
| 2 | 5–10 | Service layer completeness |
| 3 | 11–12 | REST API coverage |
| 4 | 13–15 | Frontend form wiring |
| 5 | 16–19 | Business logic correctness |
| 6 | 20–22 | Security hardening |
| 7 | 23–24 | Performance optimization |
| 8 | 25–26 | Audit trail and reconciliation |
| 9 | 27–29 | Testing |
