/**
 * Validates inventory schema alignment + hub wiring (locations, transfers, dates, migrations).
 * Run: bun run verify:inventory-wiring
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

function pass(msg) {
  console.log(`OK: ${msg}`);
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

// --- Prisma schema columns ---
const schema = read('prisma/schema.prisma');

if (!schema.includes('variant_id') || !schema.match(/model stock_movements[\s\S]*?variant_id/)) {
  fail('prisma/schema.prisma: stock_movements.variant_id missing');
} else {
  pass('stock_movements.variant_id in Prisma schema');
}

if (!schema.match(/model product_stock_locations[\s\S]*?created_at/)) {
  fail('prisma/schema.prisma: product_stock_locations.created_at missing');
} else {
  pass('product_stock_locations.created_at in Prisma schema');
}

if (!schema.includes('stock_movements_variant_id_fkey') && !schema.includes('product_variants')) {
  fail('prisma/schema.prisma: stock_movements → product_variants relation missing');
} else if (schema.match(/model stock_movements[\s\S]*?product_variants/)) {
  pass('stock_movements → product_variants relation in schema');
}

// --- Migration file ---
const migrationPath = 'prisma/migrations/20260706_inventory_stock_integrity/migration.sql';
if (!existsSync(join(root, migrationPath))) {
  fail(`${migrationPath} missing`);
} else {
  const sql = read(migrationPath);
  if (!sql.includes('variant_id') || !sql.includes('created_at')) {
    fail('inventory stock integrity migration incomplete');
  } else {
    pass('20260706_inventory_stock_integrity migration present');
  }
}

// --- Locations tab prop wiring (P0 fix) ---
const inventoryManager = read('components/InventoryManager.jsx');
if (/\bonAdd=\{onLocationAdd\}/.test(inventoryManager)) {
  fail('InventoryManager still passes onAdd={onLocationAdd} to MultiLocationInventory');
} else if (!inventoryManager.includes('onLocationAdd={onLocationAdd}')) {
  fail('InventoryManager missing onLocationAdd={onLocationAdd} for MultiLocationInventory');
} else {
  pass('InventoryManager uses onLocationAdd for MultiLocationInventory');
}

// --- MultiLocationInventory fallbacks ---
const multiLoc = read('components/MultiLocationInventory.tsx');
for (const api of ['warehouseAPI.createLocation', 'warehouseAPI.updateLocation', 'warehouseAPI.deleteLocation', 'warehouseAPI.createTransfer']) {
  if (!multiLoc.includes(api)) {
    fail(`MultiLocationInventory missing fallback ${api}`);
  }
}
if (!failed || multiLoc.includes('warehouseAPI.createTransfer')) {
  pass('MultiLocationInventory warehouseAPI fallbacks wired');
}

// --- InventoryService tenancy ---
const invSvc = read('lib/services/InventoryService.js');
if (!invSvc.match(/product_stock_locations WHERE warehouse_id.*business_id/)) {
  fail('InventoryService.removeStock location lock missing business_id');
} else {
  pass('InventoryService.removeStock scopes location lock by business_id');
}

if (!invSvc.match(/transferStock[\s\S]*?COALESCE\(state, 'sellable'\)/)) {
  fail('InventoryService.transferStock missing sellable state filter');
} else {
  pass('InventoryService.transferStock filters sellable state');
}

// --- Cycle count warehouse ---
const cycleRoute = read('app/api/v1/inventory/cycle-counts/[id]/route.js');
if (!cycleRoute.includes('cycleWarehouseId')) {
  fail('cycle-counts PATCH does not use cycle_counts.warehouse_id');
} else {
  pass('cycle-counts uses parent warehouse_id for adjustments');
}

// --- Date formatter (Finance crash fix) ---
if (!existsSync(join(root, 'lib/utils/formatDisplayDate.ts'))) {
  fail('lib/utils/formatDisplayDate.ts missing');
} else {
  pass('formatDisplayDate.ts present');
}

const expenseMgr = read('components/finance/ExpenseManager.jsx');
if (!expenseMgr.includes('formatDisplayDate(expense.date)')) {
  fail('ExpenseManager still renders raw expense.date');
} else {
  pass('ExpenseManager uses formatDisplayDate');
}

// --- Storefront FIFO ordering ---
const sfStock = read('lib/storefront/storefrontOrderStock.js');
if (!sfStock.includes('COALESCE(created_at, updated_at)')) {
  fail('storefrontOrderStock FIFO missing resilient date ordering');
} else {
  pass('storefrontOrderStock resilient FIFO ordering');
}

// --- Storefront checkout uses InventoryService ---
const sfInventory = read('lib/storefront/storefrontOrderInventory.js');
if (!sfInventory.includes('InventoryService.removeStock') || !sfInventory.includes('removeVariantStock')) {
  fail('storefrontOrderInventory must route through InventoryService');
} else {
  pass('storefront checkout stock uses InventoryService');
}

const ordersRoute = read('app/api/storefront/[businessDomain]/orders/route.js');
if (!ordersRoute.includes('decrementStorefrontOrderLineStock')) {
  fail('storefront orders route still uses raw SQL stock decrement');
} else {
  pass('storefront orders route uses decrementStorefrontOrderLineStock');
}

if (!invSvc.match(/transferStock[\s\S]*?transaction_type, quantity_change, notes[\s\S]*?'transfer'/)) {
  fail('InventoryService.transferStock missing stock_movements audit rows');
} else {
  pass('InventoryService.transferStock records stock_movements');
}

if (!invSvc.includes('removeVariantStock')) {
  fail('InventoryService.removeVariantStock missing');
} else {
  pass('InventoryService.removeVariantStock present');
}

// --- inventory_reservations FK relations ---
if (!schema.match(/model inventory_reservations[\s\S]*?product_batches/)) {
  fail('inventory_reservations → product_batches relation missing');
} else {
  pass('inventory_reservations batch FK in schema');
}

if (!schema.match(/model inventory_reservations[\s\S]*?warehouse_locations/)) {
  fail('inventory_reservations → warehouse_locations relation missing');
} else {
  pass('inventory_reservations warehouse FK in schema');
}

const reservationFkMigration = 'prisma/migrations/20260707_inventory_reservation_fks/migration.sql';
if (!existsSync(join(root, reservationFkMigration))) {
  fail(`${reservationFkMigration} missing`);
} else {
  pass('20260707_inventory_reservation_fks migration present');
}

// --- ApprovalQueue no longer uses Supabase stock_adjustments ---
const approvalQueue = read('components/inventory/ApprovalQueue.jsx');
if (approvalQueue.includes("from('stock_adjustments')") || approvalQueue.includes('createClient')) {
  fail('ApprovalQueue still queries Supabase stock_adjustments');
} else if (!approvalQueue.includes('useStockAdjustment')) {
  fail('ApprovalQueue not wired to useStockAdjustment');
} else {
  pass('ApprovalQueue uses Prisma-backed useStockAdjustment');
}

// --- Excel mobile bulk entry ---
if (!existsSync(join(root, 'lib/utils/inventoryExcelMobile.js'))) {
  fail('lib/utils/inventoryExcelMobile.js missing');
} else {
  pass('inventoryExcelMobile helpers present');
}

const excelModal = read('components/ExcelModeModal.jsx');
if (!excelModal.includes('useCompactViewport') || !excelModal.includes('touchOptimized={isMobileExcel}')) {
  fail('ExcelModeModal missing mobile touch-optimized grid wiring');
} else {
  pass('ExcelModeModal mobile touch layout wired');
}

const busyGrid = read('components/BusyGrid.jsx');
if (!busyGrid.includes('touchOptimized') || !busyGrid.includes('handleTouchNextField')) {
  fail('BusyGrid missing mobile excel touch toolbar');
} else {
  pass('BusyGrid mobile excel touch toolbar present');
}

if (!existsSync(join(root, 'components/inventory/mobile/ExcelModeMobileCardView.jsx'))) {
  fail('ExcelModeMobileCardView missing');
} else if (!excelModal.includes('ExcelModeMobileCardView')) {
  fail('ExcelModeModal not wired to mobile card entry view');
} else {
  pass('ExcelModeMobileCardView wired in ExcelModeModal');
}

if (!existsSync(join(root, 'lib/utils/inventoryGridCellTypes.js'))) {
  fail('inventoryGridCellTypes.js missing');
} else {
  pass('shared inventory grid cell types present');
}

// --- Visual / Busy mode domain-aware wiring ---
if (!inventoryManager.includes('handleInventoryCellEdit')) {
  fail('InventoryManager missing handleInventoryCellEdit');
} else if (!inventoryManager.includes('mapProductField')) {
  fail('InventoryManager cell edit missing mapProductField');
} else if (!inventoryManager.includes('mapExcelRowForSave')) {
  fail('InventoryManager cell edit missing mapExcelRowForSave save path');
} else {
  pass('InventoryManager cell edits use mapProductField + mapExcelRowForSave');
}

if (!inventoryManager.includes("mode: 'busy'")) {
  fail('InventoryManager gridColumns missing busy mode buildInventoryGridColumns');
} else if (!inventoryManager.includes("mode: 'visual'")) {
  fail('InventoryManager columns missing visual mode buildInventoryGridColumns');
} else {
  pass('Visual and Busy modes use buildInventoryGridColumns');
}

if (!inventoryManager.includes('getFieldSuggestions={getFieldSuggestions}')) {
  fail('InventoryManager BusyGrid missing getFieldSuggestions');
} else if (!inventoryManager.includes('domain_data.')) {
  fail('InventoryManager visual columns missing domain_data quick edit');
} else {
  pass('BusyGrid datalist + visual domain_data cells wired');
}

const mobileView = read('lib/utils/inventoryMobileView.js');
if (!mobileView.includes('busy') || !mobileView.includes('normalizeInventoryMobileView')) {
  fail('inventoryMobileView missing busy/visual mobile modes');
} else {
  pass('inventoryMobileView includes visual + busy mobile modes');
}

const mobileToggle = read('components/inventory/mobile/InventoryMobileViewToggle.jsx');
if (!mobileToggle.includes('INVENTORY_MOBILE_VIEWS.busy')) {
  fail('InventoryMobileViewToggle missing busy mode');
} else {
  pass('InventoryMobileViewToggle offers visual, busy, and cards');
}

if (!inventoryManager.includes('mobileViewMode === \'busy\'')) {
  fail('InventoryManager mobile section missing busy grid');
} else if (!inventoryManager.includes('resolveExcelMobileEssentialKeys')) {
  fail('InventoryManager mobile busy missing domain-aware column filter');
} else {
  pass('InventoryManager mobile busy grid domain-filtered');
}

if (!existsSync(join(root, 'components/mobile/index.ts'))) {
  fail('components/mobile/index.ts barrel missing');
} else {
  const barrel = read('components/mobile/index.ts');
  if (!barrel.includes('HubSectionHeader')) {
    fail('mobile/index.ts does not export HubSectionHeader');
  } else {
    pass('mobile/index.ts exports HubSectionHeader');
  }
}

if (failed) {
  console.error('\nverify:inventory-wiring FAILED');
  process.exit(1);
}

console.log('\nverify:inventory-wiring passed');
