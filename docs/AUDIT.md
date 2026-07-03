# Inventory Data Entry Forms — Deep Audit Report

**Scope:** `E:/tenvo-main` — Visual / Busy / Cards / Excel modes, backend persistence, Prisma schema alignment.  
**Canonical hub path:** `DashboardClient` → `DashboardTabs` → `InventoryTab` → `InventoryManager`.

---

## 1. Architecture Map

### 1.1 Where forms and grids live

| Layer | Path | Role |
|-------|------|------|
| **Page shell** | `E:/tenvo-main/app/business/[category]/DashboardClient.jsx` | Owns `products`, `handleSaveProduct`, global `ProductForm` via `ActionModals` |
| **Tab wrapper** | `E:/tenvo-main/app/business/[category]/components/tabs/InventoryTab.tsx` | Passes props into `InventoryManager`; `onUpdate \|\| onProductSave` fallback |
| **Tab routing** | `E:/tenvo-main/app/business/[category]/components/DashboardTabs.jsx` | Wires `onUpdate` → `handleSaveProduct` with composite upsert |
| **Main hub UI** | `E:/tenvo-main/components/InventoryManager.jsx` | All four product views, Excel modal, internal ProductForm, Busy/Excel save handlers |
| **Visual table** | `DataTable` (used inside `InventoryManager`) | Rich columns, bulk delete/export |
| **Busy / Excel grid** | `E:/tenvo-main/components/BusyGrid.jsx` | Shared keyboard grid; `variant="busy"` vs `variant="excel"` |
| **Excel shell** | `E:/tenvo-main/components/ExcelModeModal.jsx` | Full-screen modal, local state, undo/redo, smart paste |
| **Visual form** | `E:/tenvo-main/components/ProductForm.jsx` | Tabbed create/edit (Basic / Domain / batches / serials) |
| **Toolbar** | `E:/tenvo-main/components/inventory/InventoryCommandBar.jsx` | View switcher, Excel/import/export shortcuts |
| **Mobile hub** | `E:/tenvo-main/components/inventory/mobile/InventoryMobileHub.jsx` | Tile to open Excel; cards on small screens |
| **Field utilities** | `E:/tenvo-main/lib/utils/productFieldMapper.js`, `productMutationPayload.js` | Documented standardization; mapper **not imported anywhere in app code** |
| **Client API** | `E:/tenvo-main/lib/api/product.js` | Wraps server actions + `upsertIntegrated` |
| **Docs** | `E:/tenvo-main/docs/INVENTORY_UI_MODES_WORKFLOW.md` | Mode matrix and recent wiring notes |

**Alternate / legacy entry (not production dashboard):**  
`E:/tenvo-main/app/business/[category]/page-enhanced.jsx` — `onUpdate` only mutates local React state (no server save).

**Unused in main inventory flow:** `ProductWizard.jsx` (separate wizard; not mounted from `InventoryManager`).

---

### 1.2 The three (plus one) modes and how they switch

Documented “three modes” plus a fourth Cards layout:

| Mode | UI | Switch mechanism | Default |
|------|-----|------------------|---------|
| **Visual** | `DataTable` + KPI sections | `InventoryCommandBar` → `viewMode='visual'`; **Alt+V** | Yes (`useState('visual')` in `InventoryManager`) |
| **Busy** | `BusyGrid` `variant="busy"` | Command bar; **Alt+B** | — |
| **Cards** | `ProductCardGrid` | Command bar `viewMode='cards'` | — |
| **Excel** | `ExcelModeModal` → `BusyGrid` `variant="excel"` | Command bar “Excel mode”; mobile tile; `inventory-open-excel-mode` event; dashboard quick action `excel-mode` | Modal overlay (not a `viewMode` value) |

**Separate global toggle:** `BusyModeContext` (`E:/tenvo-main/lib/context/BusyModeContext.js`) — “Command Center” density (`GlobalBusyToggle`). Affects formula bar and row height in `BusyGrid` when `isBusyMode` is true; **not** the same as inventory `viewMode='busy'`.

**Mobile:** Below `lg`, only card grid is shown; Busy/Visual desktop switcher is hidden (`InventoryManager` ~1641–1656).

---

### 1.3 Hub entry points

```
Dashboard → Inventory tab
  └─ InventoryCommandBar / InventoryMobileHub
       ├─ Add → onAdd() → Dashboard setShowProductForm(true) → ActionModals ProductForm → handleSaveProduct
       ├─ Edit (Visual/Busy row) → internal ProductForm OR dashboard form (depends on path)
       ├─ Busy inline edit → onUpdate → handleSaveProduct (composite)
       ├─ Excel modal → handleExcelSave → onUpdate (composite) per changed row
       └─ Import → ExcelImportModal → bulkImportProductsAction (ProductService tx, not composite)

Command palette / quick action "Excel Fast Entry"
  └─ DashboardClient dispatches inventory-open-excel-mode
       └─ InventoryManager sets showExcelMode=true
```

---

## 2. Frontend Wiring (by mode)

### 2.1 Visual mode

**Components:** `DataTable` + `columns` `useMemo` in `InventoryManager` (~1076–1371).

**Interaction:** Row menu → view / edit / batch / serial / variant dialogs; bulk delete/export.

**Save path:**
- **Add (primary):** `onAdd()` → dashboard `ActionModals` `ProductForm` → `handleSaveProduct` → `productAPI.upsertIntegrated` (**correct atomic path**).
- **Edit from table:** Opens **internal** `ProductForm` dialog (~2577–2602):
  - Update → `handleUpdateProduct` → `onUpdate` → composite (good).
  - Create (fallback if no `onAdd`) → `handleAddProduct` → `createProductAction` (**not composite** — see gaps).

**Columns:**
- Standard: `name`, `sku`, `category`, `stock`, `price`, `tax_percent`, computed `value` (read-only).
- Domain: `accessorKey: domain_data.${attrKey}` with `readDomainFieldValue` in cell renderer (~1348–1367).
- Batch/serial/expiry columns when domain flags enabled.

**Validation:** Full `ProductForm` — `productSchema` + `validateDomainLogic` + `validateDomainRegex` (~400–477 in `ProductForm.jsx`).

---

### 2.2 Busy mode

**Components:** `BusyGrid` `variant="busy"` with `gridColumns` (~1408–1434, ~1657–1856).

**Column source:** `getDomainTableColumns(category, currencySymbol)` from `E:/tenvo-main/lib/utils/domainHelpers.ts` (~839–911) — **different from Visual/Excel column defs**.

**State:** Optimistic `setProducts` on each cell commit; stale-save guard via `busyCellSaveGenRef`; flash on success via `tenvo:inventory-busy-cell-saved` custom event.

**Field mapping (inline in `InventoryManager`, not `productFieldMapper`):**
- Numeric coercion for `stock`, `price`, `cost_price`, reorder fields, etc.
- Dot paths → nested assign.
- Flat domain keys → `domain_data[domainKey]` via `resolveDomainFieldKey` (~1717–1731).
- Special: `unitcost` → also sets `cost_price` (~1740–1743).
- Preserves meaningful batches/serials from original row before save (~1745–1760).

**Add row:** `onAddRow` calls `onQuickAdd` / `onAdd` / opens internal form — **does not insert an empty grid row** (~1668–1674). **Ctrl+Shift+N** in `BusyGrid` (~473–476) triggers same behavior.

**Keyboard:** Tab/Enter commit + advance (`commitAndAdvance` in `BusyGrid` ~292–339); F2 edit; Ctrl+C/V single-cell; formula bar when global `isBusyMode` (~498–526).

**Smart fill:** UI handle rendered (~687–689) but **no drag-fill logic** — decorative only.

---

### 2.2 Excel mode

**Components:** `ExcelModeModal` (~2724–2738 in `InventoryManager`) wrapping `BusyGrid` `variant="excel"`.

**Data:** Loads **full** `products` array into local state on open (~49–69 `ExcelModeModal.jsx`); edits are session-local until Save.

**Columns:** `columns.filter(c => c.id !== 'actions')` — **Visual/DataTable column defs**, then `enhancedColumns` adds batch/serial/HSN/etc. (~114–193). **Not the same set as Busy `gridColumns`.**

**Local intelligence:**
- Undo/redo (30 steps), row search, column visibility picker.
- `handleLocalCellEdit`: numeric cleanse, name/SKU auto-capitalize (~294–354).
- `handleLocalAddRow`: `_tempId`, duplicate naming `(Copy)` (~356–398).
- Smart Paste: clipboard TSV, header detection, maps name/sku/price/stock/batch/expiry (~400–437).
- Ctrl+D duplicate last row (~256–258).
- Empty-row filter before save (~224–236, ~268–269).
- Validation: name required; price/stock non-negative only (~214–221) — **much weaker than ProductForm**.

**Save:** `handleExcelSave` in `InventoryManager` (~486–666):
- Diff vs original via `JSON.stringify` (fragile for object order / Decimals).
- Concurrency `runWithConcurrency(..., 5)`.
- If `onUpdate` wired (dashboard): composite per row via `leanProductPayloadForCreate/Update`.
- Fallback: `createProductAction` / `updateProductAction` directly.

**Not wired from parent:** `onAddRow`, `onCellEdit` props on `ExcelModeModal` — modal owns add/edit locally.

---

### 2.3 Field mapping: UI ↔ `domain_data` ↔ variants

| Concern | Visual columns | Busy columns | Excel columns | Persisted |
|---------|----------------|--------------|---------------|-----------|
| Domain fields | `domain_data.{key}` dot accessor | Flat `accessorKey: key`; cell reads `domain_data` | Same as Visual (dot paths) + enhanced cols | `products.domain_data` JSON |
| Variants | Variant editor dialog only | Not in grid | Not in grid | `product_variants` table + legacy `products.variants` JSON |
| Batches | Manager dialog; badge in Visual | Not inline in Busy cols | `batch_number`, `batch_quantity`, dates as **flat columns** | `product_batches` via composite when meaningful |
| Stock display | `product.stock` (already `resolveDisplayStock` from server) | Same | Same | Headline `products.stock` + `product_stock_locations` via `InventoryService` on composite path |
| `productFieldMapper.js` | Unused | Unused | Unused | — |

**Busy edit prefilling bug (medium):** `BusyGrid.getValue` reads `row[flatKey]` (~80–94). Domain values live in `domain_data`. Custom `cell` renderers show correct values, but **F2/edit initializes from empty** for domain columns unless value was flattened on the row object.

---

## 3. Backend Wiring

### 3.1 Persistence paths (by caller)

| Caller | Function | Stock / ledger |
|--------|----------|----------------|
| Dashboard `handleSaveProduct` | `upsertIntegratedProductAction` | `InventoryService.addStock/removeStock` on **same pg client** |
| Busy inline (dashboard) | → `onUpdate` → above | Same |
| Excel bulk save (dashboard) | → `onUpdate` per row | Same |
| Excel/Busy fallback (no `onUpdate`) | `createProductAction` / `updateProductAction` | `ProductService` direct column update; **no ledger** for stock deltas |
| Internal ProductForm **create** | `handleAddProduct` → `createProductAction` | Prisma nested create; stock on row, not `InventoryService` |
| Internal ProductForm **update** | `handleUpdateProduct` → `onUpdate` | Composite when dashboard wired |
| Excel **Import** modal | `bulkImportProductsAction` | `ProductService.createProduct/updateProduct` in Prisma tx |
| Quick add / templates | `handleAddProduct` | `createProductAction` |

**Client wrapper:** `E:/tenvo-main/lib/api/product.js` — `upsertIntegrated` → `inventory_composite.js`.

### 3.2 `upsertIntegratedProductAction` (`inventory_composite.js`)

- Raw SQL transaction on shared `pool` client; RBAC via `withGuard`.
- `safeFields` whitelist for UPDATE/INSERT (~66–76).
- Omits `stock` from SQL UPDATE when meaningful batches/serials present (~63–75).
- Batch delta reconciliation → `invokeAddStockInTx` / `invokeRemoveStockInTx` (~177–256).
- Serial **addition-only** (~258–308) — deletions not mirrored from grid.
- Simple stock: opening balance on create; delta reconcile on update (~310–355).
- Headline stock reconciliation when batch mode but client sent explicit `stock` (~358–412).
- Returns raw SQL row (**not** `serializeDecimalsDeep`) (~418–419).

**Schema mismatch in `safeFields` (high if ever sent):** includes `tracking_mode`, `attributes` (~71) — **no such columns** on `products` in `prisma/schema.prisma`. Would cause SQL errors if present in payload.

### 3.3 `ProductService` paths

- **Display:** `resolveDisplayStock()` — locations → batches → variants → headline (~556–587).
- **Create:** nested `product_batches`, `product_serials`, `product_variants`; sets `products.stock` directly (~207–338).
- **Update:** strips relation mirrors; updates headline stock; syncs single active batch qty if exactly one (~428–443).
- **Sanitize:** `serializeDecimalsDeep` on read (~634).

### 3.4 Transaction boundaries

| Operation | Boundary |
|-----------|----------|
| Composite upsert | Single `BEGIN`/`COMMIT` on one pg client; stock + product row atomic |
| `createProductAction` | Prisma `$transaction` for product + nested relations |
| Excel save (N rows) | **N separate** server actions (concurrency 5) — not one bulk tx |
| Bulk import | One Prisma tx looping rows |

### 3.5 Tenancy

- Composite: `business_id` on all queries; `assertEntityBelongsToBusiness` on update (~145).
- `updateProductAction`: `business_id` in `updateMany` where clause.
- Excel rows get `business_id: businessId` on add/paste (~380, ~420).

---

## 4. Schema Alignment

### 4.1 Relevant Prisma models (`E:/tenvo-main/prisma/schema.prisma`)

**`products` (~672–752):** `name`, `sku`, `price`, `cost_price`, `mrp`, `stock`, reorder fields, `domain_data` Json, legacy JSON mirrors `batches`, `serial_numbers`, `variants`, `unit_conversions`, dates, `location`, tax/HSN fields. **No** `tracking_mode`, **no** `attributes` column.

**`product_batches` (~871+):** relational batch stock with `warehouse_id`, `quantity`, dates.

**`product_serials` (~537+):** unique per `(business_id, serial_number)`.

**`product_variants` (~575+):** per-variant `stock`, attributes.

**`product_stock_locations` (~1209+):** multi-warehouse qty; canonical write path via `InventoryService.syncProductStock`.

### 4.2 Frontend vs schema

| Frontend field | Schema | Issue |
|----------------|--------|-------|
| `batch_quantity` (Excel col) | `product_batches.quantity` | **Unmapped** on save — column is display-only noise |
| `serial_number` (Excel col) | `product_serials.serial_number` | Not converted to `serialNumbers` array on Excel save |
| `value` | computed | Correctly stripped by `leanProductPayloadForUpdate` |
| `_tempId` | n/a | Stripped by lean payload helpers |
| `tracking_mode`, `attributes` in composite safeFields | missing columns | **Critical** if payload includes them |
| `products.batches` JSON | duplicate of `product_batches` | Reads may use either; writes should prefer relational path |

### 4.3 AGENTS.md inventory facts (confirmed in code)

- Display stock: `ProductService.resolveDisplayStock()` — yes.
- Canonical writes: `InventoryService` via composite — yes for dashboard path only.
- `batchAllocation.js` / reservations unwired — still true; grid edits bypass location-level stock.
- Composite must use same pg client for stock — implemented via `invokeAddStockInTx` (~27–33).
- Placeholder batch/serial rows must not block headline stock — `filterMeaningfulBatches/Serials` used in Busy/Excel/dashboard (~1745–1758, `inventoryTrackingHelpers.js`).

### 4.4 Decimal serialization

- `ProductService.sanitizeProduct` → `serializeDecimalsDeep` for action responses.
- Composite returns raw pg row — **may still be string Decimals** if consumed client-side without re-fetch.
- Busy grid handles `.toNumber()` in `getValue` (~90–93) — partial mitigation.

---

## 5. Gaps, Conflicts, and Bugs

### Critical

1. **Dual create paths — ledger split**  
   Internal `ProductForm` create and `handleAddProduct` use `createProductAction` / `ProductService.createProduct`, **not** `upsertIntegrated`. Opening stock does not go through `InventoryService` ledger/`product_stock_locations`. Dashboard modal create does use composite.  
   **Files:** `InventoryManager.jsx` ~349–375, ~2587–2592; vs `DashboardClient.jsx` ~648–724.

2. **`safeFields` includes non-existent DB columns**  
   `tracking_mode`, `attributes` in `inventory_composite.js` ~71 — not in `prisma/schema.prisma`. Risk of SQL failure.  
   **Severity:** Critical if any mode sends these keys.

### High

3. **Column definition divergence across modes**  
   Busy uses `getDomainTableColumns`; Visual/Excel use `InventoryManager.columns` `useMemo`. Domain field accessors differ (flat vs `domain_data.*`). Users see/edit different shapes per mode.  
   **Files:** `InventoryManager.jsx` ~1076 vs ~1408; `domainHelpers.ts` ~839.

4. **`productFieldMapper.js` documented but unused**  
   Docs claim shared mapping; Busy duplicates logic inline. Drift guaranteed over time.  
   **File:** `docs/INVENTORY_UI_MODES_WORKFLOW.md` vs zero imports of `mapProductField`.

5. **Excel `batch_quantity` / batch columns not persisted**  
   Enhanced columns added in `ExcelModeModal` (~122–126) but `handleExcelSave` never maps them to `batches[]` for composite.  
   **Impact:** Pharmacy/FEFO verticals — Excel batch entry appears to work, data lost on save.

6. **Busy “Add row” does not add a row**  
   Opens quick-add/form instead of inline `_tempId` row (unlike Excel). Ctrl+Shift+N ineffective for rapid grid entry.  
   **File:** `InventoryManager.jsx` ~1668–1674.

7. **Fallback paths when `onUpdate` missing**  
   `page-enhanced.jsx` ~351–357: local-only update. Excel/Busy fall back to lean actions without inventory ledger.  
   **File:** `InventoryManager.jsx` ~513–553, ~1797–1798.

8. **Internal edit vs dashboard edit**  
   Visual “Edit” opens internal form whose **create** path bypasses composite; dashboard “Add” uses composite. Inconsistent UX and data integrity.

### Medium

9. **Smart fill handle non-functional** — visual affordance only (`BusyGrid.jsx` ~687–689).

10. **Busy domain field edit prefilling** — `getValue` does not read `domain_data` for flat keys (~80–94).

11. **Excel diff via `JSON.stringify`** — false positives/negatives with key order, Date objects, Decimal-like values (`InventoryManager.jsx` ~500–501).

12. **Validation asymmetry**  
    - ProductForm: Zod + domain logic + regex.  
    - Excel: name + non-negative price/stock only.  
    - Busy: no server-side validation on inline save (relies on composite SQL).  
    - `productSchema` imported in `product.js` but **not invoked** in actions.

13. **Excel Smart Paste** maps only 6 headers; domain columns ignored (~410–417).

14. **Duplicate `_tempId` risk** on bulk paste — `Date.now() + Math.random()` per row in same tick (`ExcelModeModal.jsx` ~420).

15. **Full catalog loaded into Excel modal** — no pagination/window (`ExcelModeModal` syncs all `data` on open). Documented in `INVENTORY_UI_MODES_WORKFLOW.md`.

16. **Composite return value not sanitized** — potential Decimal boundary issues if parent uses return without `fetchInventory`.

17. **Bulk import path** uses `ProductService`, not composite — stock/import_batch fields like `import_source` may not exist on schema (`product.js` ~215–216).

### Low

18. **Cards view mode** — fourth mode in command bar; docs usually say “three modes.”

19. **Global Busy toggle vs inventory Busy view** — naming confusion (`BusyModeContext` vs `viewMode='busy'`).

20. **`onUpdate || onProductSave` in InventoryTab** — if only `onProductSave` passed without options, Busy saves trigger full workspace refresh (no `skipFullWorkspaceRefresh`).

21. **Excel modal closes on full success only** — partial failure leaves modal open (good) but local state may diverge from server for failed rows.

22. **`isEmptyRow` treats price/stock 0 as empty** (~230–233) — can skip legitimate zero-price rows if name/sku also blank.

---

## 6. UX Improvement Recommendations (prioritized)

### P0 — Wiring / integrity

1. **Unify create/update on composite upsert**  
   Route internal `ProductForm` save (create + update) through `onUpdate` / `handleSaveProduct`, not `handleAddProduct` → `createProductAction`. Single path for all modes.

2. **Single column builder**  
   Extract shared `buildInventoryGridColumns(category, { mode: 'visual'|'busy'|'excel' })` using consistent `domain_data.{key}` accessors and shared cell readers (`readDomainFieldValue`). Point Visual, Busy, and Excel at it.

3. **Wire `productFieldMapper.mapProductField` + `preserveRelationalData`** in Busy and Excel cell handlers; delete duplicated inline mapping in `InventoryManager`.

4. **Remove or guard `tracking_mode` / `attributes`** from `inventory_composite.js` `safeFields` unless migrations add columns.

5. **Map Excel batch columns on save** — translate `batch_number`, `batch_quantity`, dates into `batches: [{ batch_number, quantity, ... }]` before `onUpdate`.

### P1 — Excel mode intelligent auto-fill & add row

6. **Busy inline add row** — mirror Excel `handleLocalAddRow`: append `{ _tempId, name:'', sku:'', ... }` to `products` state; persist on first commit or bulk save.

7. **Implement drag-fill** or remove misleading fill handle until implemented.

8. **Extend Smart Paste** — map domain headers via `getDomainProductFields` + `resolveDomainFieldKey`; support multi-column TSV into nested `domain_data`.

9. **Stable row IDs on paste** — use `crypto.randomUUID()` per row.

10. **Replace JSON.stringify diff** with field-level diff keyed by `id`/`_tempId` and normalized numeric comparison.

11. **Align Excel validation** with `productSchema` (at least name, business_id, unit, price bounds) before save.

### P2 — Consistency & scale

12. **Paginate or window Excel data** — e.g. 500-row working set + “load more from server.”

13. **Bulk Excel save as server-side batch** — one action accepting array, single transaction option for atomic imports.

14. **Serialize composite response** through `ProductService.sanitizeProduct` before return.

15. **Document four view modes** and clarify global Busy toggle vs inventory Busy view in `ShortcutsHelp`.

16. **Deprecate or fix `page-enhanced.jsx`** inventory wiring to avoid accidental local-only saves.

---

## Quick Reference — Function / File Index

| Function | File |
|----------|------|
| `handleSaveProduct` | `E:/tenvo-main/app/business/[category]/DashboardClient.jsx` ~648 |
| `handleExcelSave` | `E:/tenvo-main/components/InventoryManager.jsx` ~486 |
| Busy `onCellEdit` | `E:/tenvo-main/components/InventoryManager.jsx` ~1679 |
| `upsertIntegratedProductAction` | `E:/tenvo-main/lib/actions/premium/automation/inventory_composite.js` ~39 |
| `getDomainTableColumns` | `E:/tenvo-main/lib/utils/domainHelpers.ts` ~839 |
| `handleLocalAddRow` / Smart Paste | `E:/tenvo-main/components/ExcelModeModal.jsx` ~356, ~400 |
| `leanProductPayloadForCreate/Update` | `E:/tenvo-main/lib/utils/productMutationPayload.js` |
| `resolveDisplayStock` | `E:/tenvo-main/lib/services/ProductService.js` ~556 |

---

### Bottom line

The **intended** golden path (dashboard Busy + Excel + dashboard ProductForm) is **`handleSaveProduct` → `upsertIntegratedProductAction` → `InventoryService`**, with recent fixes for Excel bulk concurrency and batch/serial preservation documented in `INVENTORY_UI_MODES_WORKFLOW.md`. Perfect wiring is **not yet achieved**: Visual/internal-form creates, import, and non-dashboard hosts still use **`ProductService` shortcuts**; column and domain-field mapping **differs by mode**; Excel “intelligent” features (**batch columns, smart fill, Busy add-row**) are **partially UI-only**. Closing P0 items (single save path + single column mapper + batch column mapping) would align all three primary modes with schema and backend truth.