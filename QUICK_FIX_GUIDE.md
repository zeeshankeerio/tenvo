# ⚡ Quick Fix Guide - Copy & Paste Solutions

**Use this for immediate code fixes. Full context in INVENTORY_ROOT_CAUSE_ANALYSIS.md**

---

## Fix #1: Remove Invalid Columns (2 minutes)

**File:** `lib/actions/premium/automation/inventory_composite.js`

**Find** (around line 66-76):
```javascript
const safeFields = [
  'business_id', 'name', 'sku', 'barcode', 'category', 'category_id', 
  'brand', 'unit', 'description', 'price', 'cost_price', 'mrp', 
  'tax_percent', 'min_stock', 'max_stock', 'min_stock_level',
  'reorder_point', 'reorder_quantity', 'location', 'image_url', 'status',
  'is_featured', 'is_tax_inclusive', 'expiry_date', 'batch_number',
  'manufacturing_date', 'domain_data', 'hsn_code', 'sac_code', 
  'is_active', 'unit_conversions',
  'tracking_mode', // ❌ DELETE THIS LINE
  'attributes',    // ❌ DELETE THIS LINE
  ...(!hasBatchesOrSerials ? ['stock'] : []),
];
```

**Replace with:**
```javascript
const safeFields = [
  'business_id', 'name', 'sku', 'barcode', 'category', 'category_id', 
  'brand', 'unit', 'description', 'price', 'cost_price', 'mrp', 
  'tax_percent', 'min_stock', 'max_stock', 'min_stock_level',
  'reorder_point', 'reorder_quantity', 'location', 'image_url',
  'is_featured', 'expiry_date', 'batch_number',
  'manufacturing_date', 'domain_data', 'hsn_code', 'sac_code', 
  'is_active', 'unit_conversions',
  ...(!hasBatchesOrSerials ? ['stock'] : []),
];
```

---

## Fix #2: Route ProductForm Creates Through Composite (5 minutes)

**File:** `components/InventoryManager.jsx`

**Find** (around line 2587-2592):
```javascript
const handleAddProduct = async (productData) => {
  try {
    const newProduct = await createProductAction({
      ...productData,
      business_id: businessId
    });
```

**Replace with:**
```javascript
const handleAddProduct = async (productData) => {
  try {
    // Use composite path if available (correct ledger integration)
    if (onUpdate) {
      const result = await onUpdate({
        productData: { ...productData, business_id: businessId },
        batches: productData.batches || [],
        serialNumbers: productData.serial_numbers || [],
        variants: productData.variants || [],
        initialStock: productData.stock || 0,
        isUpdate: false,
      });
      if (!result.success) throw new Error(result.error);
      const newProduct = result.product;
      
      // Rest of original code continues here...
      if (newProduct) {
        setProducts([newProduct, ...products]);
        toast.success('Product added successfully');
        setShowProductForm(false);
        setEditingProduct(null);
      }
      return newProduct;
    } else {
      // Fallback for standalone usage (logs warning)
      console.warn('handleAddProduct: onUpdate not available, using fallback path');
      const newProduct = await createProductAction({
        ...productData,
        business_id: businessId
      });
```

---

## Fix #3: Excel Batch Column Persistence (15 minutes)

**File:** `components/InventoryManager.jsx`

**Add this function** before `handleExcelSave` (around line 480):
```javascript
const extractBatchesFromRow = (row) => {
  // Start with existing batches array
  const existingBatches = row.batches || [];
  
  // If Excel batch columns were filled, add to batches array
  if (row.batch_number && String(row.batch_number).trim()) {
    const batchQty = row.batch_quantity || row.batch_qty || row.stock || 0;
    
    // Check if this batch already exists in array
    const existingBatch = existingBatches.find(
      b => b.batch_number === row.batch_number
    );
    
    if (existingBatch) {
      // Update existing
      existingBatch.quantity = Number(batchQty);
      existingBatch.expiry_date = row.expiry_date || existingBatch.expiry_date;
      existingBatch.manufacturing_date = row.manufacturing_date || existingBatch.manufacturing_date;
      existingBatch.cost_price = Number(row.cost_price || row.costPrice || existingBatch.cost_price || 0);
    } else {
      // Add new batch
      existingBatches.push({
        batch_number: row.batch_number,
        quantity: Number(batchQty),
        expiry_date: row.expiry_date || null,
        manufacturing_date: row.manufacturing_date || null,
        cost_price: Number(row.cost_price || row.costPrice || 0),
        warehouse_id: row.warehouse_id || null,
      });
    }
  }
  
  // Filter out empty batches
  return existingBatches.filter(b => 
    b.batch_number && 
    String(b.batch_number).trim() !== '' &&
    b.quantity > 0
  );
};
```

**Then modify** `handleExcelSave` (around line 520):
```javascript
// FIND this line:
const payload = leanProductPayloadForUpdate(changedRow);

// REPLACE the onUpdate call with:
const batches = extractBatchesFromRow(changedRow);
const serialNumbers = filterMeaningfulSerials(changedRow.serial_numbers || []);

const result = await onUpdate({
  productData: { ...payload, business_id: businessId },
  batches, // ✅ Now includes Excel columns
  serialNumbers,
  isUpdate: !!changedRow.id,
  productId: changedRow.id,
});
```

---

## Fix #4: Add Decimal Serialization Wrapper (10 minutes)

**File:** `lib/actions/premium/automation/inventory_composite.js`

**Find** (around line 418-419):
```javascript
const product = await ProductService.getProduct(finalProductId, businessId);
return { success: true, product: product || serializeDecimalsDeep({ id: finalProductId }) };
```

**Replace with:**
```javascript
const product = await ProductService.getProduct(finalProductId, businessId);
const serialized = product ? serializeDecimalsDeep(product) : serializeDecimalsDeep({ id: finalProductId });
return { success: true, product: serialized };
```

---

## Fix #5: Busy Domain Field Edit Prefilling (5 minutes)

**File:** `components/BusyGrid.jsx`

**Find** (around line 80-94):
```javascript
const getValue = (row, accessor) => {
  if (accessor.includes('.')) {
    return accessor.split('.').reduce((obj, key) => obj?.[key], row);
  }
  return row[accessor];
};
```

**Replace with:**
```javascript
const getValue = (row, accessor) => {
  if (accessor.includes('.')) {
    return accessor.split('.').reduce((obj, key) => obj?.[key], row);
  }
  
  // Check domain_data for flat domain columns
  if (row.domain_data && accessor in row.domain_data) {
    return row.domain_data[accessor];
  }
  
  return row[accessor];
};
```

---

## ✅ Verification After Fixes

Run these commands to verify:

```bash
# 1. Lint check
npm run lint

# 2. Type check (if using TypeScript)
npm run type-check

# 3. Build check
npm run build

# 4. Test checkout flow manually
# - Visit storefront
# - Add product to cart
# - Complete checkout
# - Verify order appears in hub

# 5. Test Excel batch save
# - Open Excel mode
# - Add product with batch_number + batch_quantity
# - Save
# - Refresh page
# - Verify batch shows in database:
```

```sql
SELECT p.name, pb.batch_number, pb.quantity, pb.expiry_date
FROM products p
JOIN product_batches pb ON pb.product_id = p.id
WHERE p.business_id = 'YOUR_BUSINESS_ID'
ORDER BY p.created_at DESC
LIMIT 5;
```

---

## 🆘 If Something Breaks

**Checkout still fails:**
- Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
- Look for column errors or constraint violations
- May need to run: `npx prisma migrate deploy`

**Excel save errors:**
- Check browser console for JavaScript errors
- Verify `filterMeaningfulBatches` import exists
- Check if `leanProductPayloadForUpdate` is available

**Stock still wrong:**
- Run this query to check for orphans:
```sql
SELECT COUNT(*) FROM products p
LEFT JOIN product_stock_locations psl ON psl.product_id = p.id
WHERE p.stock > 0 AND psl.id IS NULL;
```

**Need help:**
- Read: `INVENTORY_ROOT_CAUSE_ANALYSIS.md` (full details)
- Slack: #urgent-fixes
- Rollback: `git revert HEAD && npm run deploy`

---

**Last Updated:** July 12, 2026  
**Estimated Time to Apply All Fixes:** 45 minutes  
**Expected Outcome:** Checkout works, Excel batches persist, stock accurate
