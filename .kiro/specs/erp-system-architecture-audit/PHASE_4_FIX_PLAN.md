# Phase 4: Form Validation Consistency - Fix Plan

## Overview

This document outlines the systematic fix plan for all issues identified in the Phase 4 Form Audit. Fixes are prioritized by risk level and impact.

**Audit Completion Date**: Current session
**Total Issues Found**: 10 (2 critical, 4 medium, 4 low)

---

## 🔴 Critical Fixes (Must Do Immediately)

### Fix 1: VendorForm.jsx - contactPerson Field Name

**Issue**: Field uses camelCase (`contactPerson`) instead of snake_case (`contact_person`)

**Impact**: HIGH - Validation failures, data loss

**Files to Modify**:
- `components/VendorForm.jsx`

**Changes Required**:
1. Line 35: `contactPerson: ''` → `contact_person: ''`
2. Line 52: `contactPerson: initialData.domain_data?.contact_person || initialData.contact_person || ''` → `contact_person: ...`
3. Line 169: `<Label>Principal Contact</Label>` (no change needed)
4. Line 171: `value={formData.contactPerson || ''}` → `value={formData.contact_person || ''}`
5. Line 171: `onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}` → `onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}`

**Testing**:
- [ ] Create new vendor with contact person
- [ ] Edit existing vendor with contact person
- [ ] Verify field saves correctly
- [ ] Verify validation passes

**Risk**: LOW - Simple find/replace operation

---

### Fix 2: JournalEntryForm.jsx - accountId Field Name

**Issue**: Inconsistent transformation at line 195 (`accountId` should be `account_id`)

**Impact**: HIGH - Inconsistent payloads in different code paths

**Files to Modify**:
- `components/JournalEntryForm.jsx`

**Changes Required**:
1. Line 195: `accountId: e.account_id` → `account_id: e.account_id`

**Testing**:
- [ ] Create journal entry
- [ ] Verify entries save with correct account_id
- [ ] Check both code paths (lines 164 and 195)
- [ ] Verify no validation errors

**Risk**: LOW - Single line change

---

## 🟡 Medium Priority Fixes (Should Do)

### Fix 3: StockAdjustmentForm.jsx - Verify Action Signature

**Issue**: Form transforms snake_case to camelCase when calling action

**Impact**: MEDIUM - May cause issues if action expects snake_case

**Files to Check**:
- `lib/actions/*/stock.js` or similar
- Look for `adjustStockAction` definition

**Investigation Required**:
1. Find `adjustStockAction` definition
2. Check if it expects `productId` (camelCase) or `product_id` (snake_case)
3. Check if it expects `warehouseId` (camelCase) or `warehouse_id` (snake_case)

**If Action Expects snake_case**:
- Modify lines 102-103 in StockAdjustmentForm.jsx
- Change `productId: formData.product_id` → `product_id: formData.product_id`
- Change `warehouseId: formData.warehouse_id` → `warehouse_id: formData.warehouse_id`

**If Action Expects camelCase**:
- No changes needed
- Document that transformation is intentional

**Testing**:
- [ ] Adjust stock for a product
- [ ] Verify adjustment saves correctly
- [ ] Check database for correct field names

**Risk**: MEDIUM - Depends on action signature

---

### Fix 4: StockTransferForm.jsx - Verify Action Signature

**Issue**: Form transforms snake_case to camelCase when calling action

**Impact**: MEDIUM - May cause issues if action expects snake_case

**Files to Check**:
- `lib/actions/*/stock.js` or similar
- Look for `transferStockAction` definition

**Investigation Required**:
1. Find `transferStockAction` definition
2. Check parameter naming convention

**If Action Expects snake_case**:
- Modify lines 98-100 in StockTransferForm.jsx
- Change `productId: item.product_id` → `product_id: item.product_id`
- Change `sourceWarehouseId: formData.source_warehouse_id` → `source_warehouse_id: formData.source_warehouse_id`
- Change `destinationWarehouseId: formData.destination_warehouse_id` → `destination_warehouse_id: formData.destination_warehouse_id`

**If Action Expects camelCase**:
- No changes needed
- Document that transformation is intentional

**Testing**:
- [ ] Transfer stock between warehouses
- [ ] Verify transfer saves correctly
- [ ] Check database for correct field names

**Risk**: MEDIUM - Depends on action signature

---

### Fix 5: VendorForm.jsx - Add Missing Fields to Schema

**Issue**: Form uses fields not in schema (payment_terms, certificate_url, market_location)

**Impact**: MEDIUM - Fields are ignored during validation

**Options**:

**Option A: Add to vendorSchema** (Recommended)
- Modify `lib/validation/schemas.js`
- Add `payment_terms: z.string().optional().nullable()`
- Add `certificate_url: z.string().url().optional().nullable().or(z.literal(''))`
- Add `market_location: z.string().optional().nullable()`

**Option B: Move to domain_data**
- Modify VendorForm.jsx to store these in `domain_data` object
- No schema changes needed

**Recommendation**: Option A - These are common business fields

**Testing**:
- [ ] Create vendor with payment terms
- [ ] Upload certificate
- [ ] Set market location
- [ ] Verify all fields save correctly

**Risk**: LOW - Additive changes only

---

### Fix 6: CustomerForm.jsx - Add contact_person Field

**Issue**: Schema has `contact_person` but form doesn't include it

**Impact**: MEDIUM - Users cannot set contact person for customers

**Files to Modify**:
- `components/CustomerForm.jsx`

**Changes Required**:
1. Add to form state: `contact_person: ''`
2. Add input field in "Basic Details" tab
3. Add to payload when saving

**Testing**:
- [ ] Create customer with contact person
- [ ] Edit customer contact person
- [ ] Verify field saves correctly

**Risk**: LOW - Additive change only

---

## 🟢 Low Priority Fixes (Optional)

### Fix 7: ProductForm.jsx - Standardize on snake_case

**Issue**: Form uses camelCase internally, transforms to snake_case for API

**Impact**: LOW - Works correctly but adds complexity

**Recommendation**: Consider refactoring in future sprint

**Effort**: HIGH - Would require updating many lines

**Priority**: DEFER - Current implementation works

---

### Fix 8: CustomerForm.jsx - Add Optional Address Fields

**Issue**: Schema has optional fields (state, pincode, country) not in form

**Impact**: LOW - These are optional fields

**Recommendation**: Add if international customers are common

**Priority**: DEFER - Not critical for Pakistani market

---

### Fix 9: VendorForm.jsx - Add Optional Address Fields

**Issue**: Schema has optional fields (state, pincode, country, cnic) not in form

**Impact**: LOW - These are optional fields

**Recommendation**: Add if needed for completeness

**Priority**: DEFER - Not critical

---

### Fix 10: Decide on market_location Field

**Issue**: Used in both CustomerForm and VendorForm but not in schema

**Impact**: LOW - Field is ignored during validation

**Options**:
- Add to customerSchema and vendorSchema
- Move to domain_data in both forms

**Recommendation**: Add to schema (common Pakistani business field)

**Priority**: DEFER - Can be combined with Fix 5

---

## Implementation Order

### Phase 1: Critical Fixes (Do Now)
1. ✅ Fix 1: VendorForm contactPerson → contact_person
2. ✅ Fix 2: JournalEntryForm accountId → account_id

### Phase 2: Verification (Do Next)
3. ⏳ Fix 3: Verify StockAdjustmentForm action signature
4. ⏳ Fix 4: Verify StockTransferForm action signature

### Phase 3: Schema Updates (Do After Verification)
5. ⏳ Fix 5: Add missing fields to vendorSchema
6. ⏳ Fix 6: Add contact_person to CustomerForm

### Phase 4: Optional Improvements (Future Sprint)
7. ⏸️ Fix 7: Refactor ProductForm to snake_case
8. ⏸️ Fix 8: Add optional address fields to CustomerForm
9. ⏸️ Fix 9: Add optional address fields to VendorForm
10. ⏸️ Fix 10: Standardize market_location handling

---

## Testing Strategy

### Unit Testing
- [ ] Test each form with valid data
- [ ] Test each form with invalid data
- [ ] Verify validation errors display correctly

### Integration Testing
- [ ] Create records via forms
- [ ] Edit existing records
- [ ] Verify database has correct field names
- [ ] Test API endpoints with form payloads

### Regression Testing
- [ ] Verify existing records still load correctly
- [ ] Test backward compatibility
- [ ] Check for any breaking changes

---

## Rollback Plan

If issues arise after fixes:

1. **VendorForm contactPerson fix**:
   - Revert to camelCase
   - Add transformation layer in save handler

2. **JournalEntryForm accountId fix**:
   - Revert line 195 change
   - Investigate which code path is actually used

3. **Schema changes**:
   - Revert schema additions
   - Fields will be ignored (no data loss)

---

## Success Criteria

- [ ] All critical fixes implemented and tested
- [ ] No validation errors in production
- [ ] All forms save data correctly
- [ ] Database fields match schema expectations
- [ ] No breaking changes to existing functionality

---

## Notes

- All fixes are backward compatible
- No data migration required
- Forms will continue to work during fixes
- Changes can be deployed incrementally

