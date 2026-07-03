/**
 * Static wiring checks for public storefront tenant isolation.
 * Run: node scripts/verify-storefront-tenancy.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  return true;
}

let failed = false;
const mark = (msg) => {
  if (fail(msg)) failed = true;
};

// --- Checkout must use secure API route, not legacy server action ---
const checkout = read('app/store/[businessDomain]/checkout/page.jsx');
if (checkout.includes('createStorefrontOrder')) {
  mark('checkout/page.jsx still imports or calls createStorefrontOrder');
}
if (!checkout.includes('/api/storefront/${businessDomain}/orders')) {
  mark('checkout/page.jsx must POST to /api/storefront/[businessDomain]/orders');
}

// --- Legacy action stubbed ---
const ordersAction = read('lib/actions/storefront/orders.js');
if (!ordersAction.includes("'DEPRECATED'")) {
  mark('createStorefrontOrder must return DEPRECATED');
}
if (ordersAction.includes('UPDATE products \n         SET stock = stock - $1')) {
  mark('orders.js still contains unscoped legacy stock deduction');
}
if (!ordersAction.includes('requireStorefrontHubAccess')) {
  mark('orders.js hub actions must use requireStorefrontHubAccess');
}

// --- Stock API tenant-scoped ---
const stockRoute = read('app/api/storefront/products/[productId]/stock/route.js');
if (!stockRoute.includes('businessId')) {
  mark('stock route must require businessId');
}
if (!stockRoute.includes('p.business_id = $3::uuid') && !stockRoute.includes('business_id = $2::uuid')) {
  mark('stock route product queries must filter by business_id');
}

const productsAction = read('lib/actions/storefront/products.js');
if (!productsAction.includes('checkProductStock(productId, variantId, quantity, businessId)')) {
  mark('checkProductStock must accept businessId');
}
if (!productsAction.includes('cost_price: _costPrice')) {
  mark('getProductBySlug must strip cost_price from public payload');
}
if (!productsAction.includes("coalesce(p.domain_data->>'fabrictype'")) {
  mark('products.js must support fabric filter via domain_data.fabrictype');
}
if (!productsAction.includes("coalesce(p.domain_data->>'sourcing'")) {
  mark('products.js must support sourcing filter via domain_data.sourcing');
}
if (!productsAction.includes('variants: normalizedVariants')) {
  mark('getProductBySlug must attach variants array on product payload');
}

const productDetailPage = read('app/store/[businessDomain]/products/[slug]/page.jsx');
if (!productDetailPage.includes('ProductPurchasePanel')) {
  mark('product detail page must use ProductPurchasePanel for variant + cart wiring');
}

if (!productsAction.includes('querySellableLocationQty')) {
  mark('checkProductStock must use warehouse-aware querySellableLocationQty');
}
if (!productsAction.includes('enrichStorefrontProductStock')) {
  mark('getProducts/getProductBySlug must enrich display stock via enrichStorefrontProductStock');
}
if (!productsAction.includes('serializeDecimalsDeep')) {
  mark('storefront products actions must serialize decimals for client payloads');
}

const productInfo = read('components/storefront/ProductInfo.jsx');
if (!productInfo.includes('getStorefrontStockState')) {
  mark('ProductInfo must use getStorefrontStockState for stock badges');
}
if (!productInfo.includes('ProductAttributeList')) {
  mark('ProductInfo must render clothing/parts attributes via ProductAttributeList');
}

// --- Orders API (continued) ---
const ordersRoute = read('app/api/storefront/[businessDomain]/orders/route.js');
if (!ordersRoute.includes('resolveStorefrontBusiness')) {
  mark('orders route must resolve business via resolveStorefrontBusiness');
}
if (!ordersRoute.includes('decrementHeadlineAndLocationsInTx')) {
  mark('orders route must decrement warehouse rows + headline stock via decrementHeadlineAndLocationsInTx');
}
if (!ordersRoute.includes('resolveSellableStockQty')) {
  mark('orders route must validate stock with resolveSellableStockQty');
}

// --- Reviews API ---
const reviewsRoute = read('app/api/storefront/[businessDomain]/products/[productId]/reviews/route.js');
if (!reviewsRoute.includes('resolveStorefrontBusiness')) {
  mark('reviews route must resolve storefront business');
}
if (!reviewsRoute.includes('p.business_id = $2::uuid')) {
  mark('reviews queries must join/filter by business_id');
}

// --- Cart passes businessId ---
const cartCtx = read('lib/context/CartContext.js');
if (!cartCtx.includes('businessId')) {
  mark('CartContext must send businessId to stock API');
}
if (!cartCtx.includes('getCartStorageKey')) {
  mark('CartContext must export getCartStorageKey for per-store cart isolation');
}
if (!cartCtx.includes('tenvo_storefront_cart_${businessId}')) {
  mark('CartContext must use per-store localStorage keys');
}

const storeProviders = read('components/storefront/StoreProviders.jsx');
if (!storeProviders.includes('businessId={business?.id}')) {
  mark('StoreProviders must pass businessId into CartProvider');
}

const cartPage = read('app/store/[businessDomain]/cart/page.jsx');
if (!cartPage.includes('cartMismatch')) {
  mark('cart/page.jsx must guard against cross-store cart mismatch');
}

const cartDrawer = read('components/storefront/CartDrawer.jsx');
if (!cartDrawer.includes('cartMismatch')) {
  mark('CartDrawer must guard against cross-store cart mismatch');
}

const checkoutPage = read('app/store/[businessDomain]/checkout/page.jsx');
if (!checkoutPage.includes('cart.businessId !== businessId')) {
  mark('checkout/page.jsx must redirect when cart businessId mismatches storefront');
}

// --- Hub auth on admin/payment actions ---
for (const rel of [
  'lib/actions/storefront/admin.js',
  'lib/actions/storefront/payments.js',
  'lib/actions/storefront/business.js',
]) {
  const src = read(rel);
  if (!src.includes('requireStorefrontHubAccess')) {
    mark(`${rel} must guard hub actions with requireStorefrontHubAccess`);
  }
}

const paymentsAction = read('lib/actions/storefront/payments.js');
if (!paymentsAction.includes('UPDATE storefront_orders SET metadata = $1 WHERE id = $2 AND business_id = $3::uuid')) {
  mark('payments.js metadata updates must scope by business_id');
}
if (!paymentsAction.includes('WHERE id = $3 AND business_id = $4::uuid')) {
  mark('recordManualPayment must scope order UPDATE by business_id');
}

// --- Shared resolver exists ---
for (const rel of [
  'lib/tenancy/resolveStorefrontBusiness.js',
  'lib/tenancy/storefrontHubAuth.js',
]) {
  if (!fs.existsSync(path.join(root, rel))) {
    mark(`missing ${rel}`);
  }
}

// --- Public buyer chat (domain-scoped, no client businessId) ---
const chatRoute = read('app/api/storefront/[businessDomain]/chat/route.js');
if (!chatRoute.includes('resolveStorefrontBusiness')) {
  mark('chat route must resolve business via resolveStorefrontBusiness');
}
if (!chatRoute.includes('body?.businessId')) {
  mark('chat route must reject client-supplied businessId');
}
if (!fs.existsSync(path.join(root, 'lib/storefront/publicBuyerChat.js'))) {
  mark('missing lib/storefront/publicBuyerChat.js');
}

// --- Hub analyst SQL guard ---
const analystGuard = read('lib/services/ai/analystSqlGuard.js');
if (!analystGuard.includes('assertAnalystSqlSafe')) {
  mark('analystSqlGuard must export assertAnalystSqlSafe');
}
const businessAnalyst = read('lib/services/ai/BusinessAnalyst.js');
if (!businessAnalyst.includes('assertAnalystSqlSafe')) {
  mark('BusinessAnalyst must use assertAnalystSqlSafe');
}
const agenticAction = read('lib/actions/premium/ai/agentic.js');
if (!agenticAction.includes('loadAnalystBusinessContext')) {
  mark('askBusinessAnalystAction must load business context server-side');
}

const storefrontSqlFiles = [
  'lib/actions/storefront/orders.js',
  'app/api/storefront/[businessDomain]/orders/route.js',
];
for (const rel of storefrontSqlFiles) {
  const src = read(rel);
  const updates = src.match(/UPDATE products[\s\S]*?WHERE id = \$[0-9]+::uuid(?![\s\S]*business_id)/g);
  if (updates?.length) {
    mark(`${rel} has UPDATE products ... WHERE id without business_id in same WHERE clause`);
  }
}

if (failed) process.exit(1);
console.log('OK: storefront tenant isolation wiring verified.');
