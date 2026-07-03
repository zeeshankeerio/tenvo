# Textile/Clothing Storefront - Implementation Guide

**Quick Start Guide for Setting Up and Testing Textile Public Stores**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Registration & Setup](#registration--setup)
3. [Product Catalog](#product-catalog)
4. [Storefront Customization](#storefront-customization)
5. [Testing Order Flow](#testing-order-flow)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Database Migrations

Ensure the following migrations are applied:

```bash
# Storefront orders & items
prisma migrate deploy

# Required tables:
# - storefront_orders
# - storefront_order_items
# - store_payment_settings
# - product_stock_locations (optional, for multi-location)
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...  # For order confirmation emails
STRIPE_SECRET_KEY=sk_test_...  # Optional, for card payments
```

### Verification

```bash
# Run textile storefront verification
node scripts/verify-textile-storefront.mjs

# Check domain verticals
bun run verify:domains

# Check regional standards (PK, AE, US, etc.)
bun run verify:regional-market
```

---

## Registration & Setup

### 1. Create Textile Business

**Via Registration Flow:**

```javascript
// POST /api/auth/register
{
  businessName: "Khaadi Fashion Store",
  email: "owner@khaadi.com",
  password: "...",
  category: "garments",  // or boutique-fashion, textile-wholesale, textile-mill
  country: "Pakistan",
  city: "Karachi"
}
```

**What Happens:**
- Business created with `category = 'garments'`
- Domain assigned (e.g., `khaadi-fashion-store`)
- **Rich catalog seeded** (10 SKUs: Khaadi, Gul Ahmed, Turkey/China imports)
- Primary warehouse created
- `product_stock_locations` rows initialized
- Default storefront settings applied

**Gating Logic:**
```javascript
// lib/onboarding/registrationRichVerticals.js
PK_CLOTHING_REGISTRATION_VERTICALS = ['garments', 'boutique-fashion', 'textile-wholesale', 'textile-mill']

shouldSeedRichCatalogOnRegistration('garments', 'PK') // => true
```

### 2. Verify Catalog Seeded

**Check inventory hub:**
- Navigate to hub → Inventory
- Confirm 10+ products exist
- Check `domain_data` fields: `fabrictype`, `sourcing`, `season`, `stitchingstatus`

**Sample SKUs:**
- Cotton Shalwar Kameez (Khaadi) - `sourcing: local`
- Digital Print Lawn 3pc (Gul Ahmed) - `sourcing: local`
- Turkey Import Formal Shirt - `sourcing: imported`
- China Import Polyester Kurta - `sourcing: imported`

### 3. Configure Payment Methods

**Navigate to:** Hub → Settings → Payments (Store Payment Settings)

**Enable:**
- ✅ Cash on Delivery (COD)
- ✅ Bank Transfer (optional)
- ✅ Stripe (if configured)
- ✅ JazzCash / EasyPaisa (Pakistan only)

**Database:**
```sql
INSERT INTO store_payment_settings (business_id, provider, is_enabled, display_name)
VALUES
  ('uuid', 'cod', true, 'Cash on Delivery'),
  ('uuid', 'stripe', true, 'Credit / Debit Card');
```

---

## Product Catalog

### Adding Products (Manual)

**Via Hub → Inventory → Add Product:**

**Fields:**
- **Name:** "Embroidered Chiffon 3pc"
- **Brand:** "Sana Safinaz"
- **Category:** "Bridal Collection"
- **Price:** 12500
- **Stock:** 15
- **Unit:** "set"

**Domain Data (Advanced):**
```json
{
  "fabrictype": "Chiffon",
  "sourcing": "local",
  "season": "Eid",
  "stitchingstatus": "Unstitched",
  "designertracking": "Sana Safinaz",
  "collection": "Luxury Bridal 2026"
}
```

### Bulk Import (CSV)

**Excel Template:**

| Name | Brand | Category | Price | Stock | Unit | Fabric Type | Sourcing | Season | Stitching Status |
|---|---|---|---|---|---|---|---|---|---|
| Lawn Print 3pc | Alkaram | Lawn | 4500 | 50 | set | Lawn | local | Summer | Unstitched |
| Turkey Suit Fabric | Turkey | Imported Fabric | 2200 | 80 | meter | Wash & Wear | imported | Spring | Ready-to-Wear |

**Upload:** Hub → Inventory → Import → Select Excel

### Product Images

**Recommended:**
- Main image: 800x800px, square crop
- Additional images (gallery): 800x800px
- Fabric texture close-up: optional

**Fallback:**
- Unsplash fashion stock images used when `image_url` is null
- Domain-aware placeholders via `getStorefrontProductPlaceholder()`

---

## Storefront Customization

### Settings Structure

**Database:** `businesses.settings` (JSONB) or `business_settings.settings`

```json
{
  "storefront": {
    "enabled": true,
    "currency": "PKR",
    "locale": "en-PK",
    "heroTitle": "Premium Lawn Collection",
    "heroSubtitle": "Summer 2026 Arrivals",
    "logoUrl": "https://...",
    "freeShippingThreshold": 5000,
    "taxRate": 0.18,
    "heroSlides": [
      {
        "title": "New Arrivals",
        "subtitle": "Shop the latest designs",
        "image": "https://..."
      }
    ]
  },
  "contact": {
    "email": "store@khaadi.com",
    "phone": "+92 300 1234567",
    "whatsapp": "+92 300 1234567",
    "address": "Shop 5, Main Market, Karachi",
    "city": "Karachi",
    "country": "Pakistan"
  },
  "freeShippingThreshold": 5000,
  "returnPolicyDays": 7
}
```

### Customization UI (Hub)

**Navigate to:** Hub → Settings → Store Settings

**Sections:**
1. **Store Profile**
   - Business name
   - Description (meta description)
   - Logo upload
   - Cover image upload

2. **Hero & Branding**
   - Hero title
   - Hero subtitle
   - Hero slides (optional multi-slide carousel)
   - Accent color (auto from vertical, or custom)

3. **Contact & Policies**
   - Store email
   - Phone number
   - WhatsApp number
   - Address (multi-line)
   - Free shipping threshold (PKR, AED, etc.)
   - Return policy (days)

4. **Payment Methods**
   - Enable/disable COD
   - Configure Stripe keys
   - Enable JazzCash/EasyPaisa (PK only)

5. **Regional Settings**
   - Currency (auto from country, or override)
   - Locale (en-PK, ur-PK, en-AE, etc.)
   - Tax rate (GST/VAT percentage)

### Programmatic Update

```javascript
// lib/actions/basic/business.js
await updateBusinessSettings(businessId, {
  storefront: {
    heroTitle: "New Season Collection",
    freeShippingThreshold: 3000,
  }
});
```

---

## Testing Order Flow

### 1. Visit Public Storefront

**URL:** `https://your-tenvo-domain.com/store/<business-domain>`

**Example:** `https://app.tenvo.pk/store/khaadi-fashion-store`

### 2. Browse & Filter

**Test filters:**
- ✅ Fabric type: `/products?fabric=Lawn`
- ✅ Sourcing: `/products?sourcing=local` or `/products?sourcing=imported`
- ✅ Size: `/products?size=M`
- ✅ Brand: `/products?brand=Khaadi`
- ✅ Price range: `/products?minPrice=2000&maxPrice=5000`
- ✅ In stock only: `/products?inStock=true`
- ✅ On sale: `/products?onSale=true`

### 3. Product Detail Page

**URL:** `/store/<domain>/products/<slug>`

**Verify:**
- ✅ Product images (main + gallery)
- ✅ Price, compare price (strikethrough if on sale)
- ✅ Stock status (In Stock / Low Stock / Out of Stock)
- ✅ Attribute chips: Brand, Fabric, Sourcing, Size, Season
- ✅ Local/Imported badge (green/blue)
- ✅ Size/color picker (if `has_variants = true`)
- ✅ Add to cart button

### 4. Cart

**URL:** `/store/<domain>/cart`

**Verify:**
- ✅ Cart items persist (localStorage)
- ✅ Quantity adjustment (+ / -)
- ✅ Remove item
- ✅ Promo code input (optional)
- ✅ Member pricing detection (if customer is enrolled)
- ✅ Shipping method selection (standard / express / pickup)
- ✅ Subtotal, shipping, tax, discount calculations
- ✅ Checkout button

### 5. Checkout

**URL:** `/store/<domain>/checkout`

**Steps:**

**Step 1 - Information:**
- Email: `test@example.com`
- First name: `Ali`
- Last name: `Khan`
- Phone: `+92 300 1234567`

**Step 2 - Shipping:**
- Address: `House 123, Street 5, DHA Phase 6`
- City: `Karachi`
- Postal code: `75500`
- Shipping method: `Standard Delivery` (3-5 days)

**Step 3 - Payment:**
- Select: `Cash on Delivery (COD)`

**Step 4 - Review:**
- Verify order summary
- Click "Place Order"

### 6. Order Success

**Verify:**
- ✅ Order confirmation screen
- ✅ Order number displayed (e.g., `TN-2026-00042`)
- ✅ Confirmation email sent to `test@example.com`
- ✅ **"Download Receipt" button** (58mm PDF)
- ✅ "Track My Order" button

### 7. Download Receipt

**Click:** "Download Receipt"

**Expected:**
- PDF download starts (filename: `TN-2026-00042-receipt.pdf`)
- 58mm thermal layout
- Business name, address, NTN/SRN (if PK)
- Order number, date, customer name
- Line items with SKU, qty, price
- Subtotal, tax, discount, total
- Payment method
- "Thank you" footer

**Receipt Preview:**
```
═══════════════════════════════════
    Khaadi Fashion Store
Shop 5, Main Market, Karachi
    NTN: 1234567 · SRN: 8901234
    +92 300 1234567
═══════════════════════════════════
       ORDER RECEIPT
         Garments & Fashion
───────────────────────────────────
Ref:    TN-2026-00042
Date:   30 Jun 2026, 10:30 AM
Customer: Ali Khan
Payment: COD
───────────────────────────────────
Item                    Qty    Amt
───────────────────────────────────
Digital Print Lawn 3pc   1  4,290
PK-LWN-GA-002

Turkey Import Shirt      2  4,400
IMP-TR-SHT-006
═══════════════════════════════════
Subtotal                    8,690
Sales Tax (18%)             1,564
Shipping                      150
TOTAL                  PKR 10,404
═══════════════════════════════════
  Thank you for your business!
     Powered by Tenvo
═══════════════════════════════════
```

### 8. Order Tracking

**URL:** `/store/<domain>/orders?email=test@example.com`

**Verify:**
- ✅ Order list displayed (filtered by customer email)
- ✅ Order number, date, status, total
- ✅ Line items expandable
- ✅ Fulfillment status (unfulfilled / fulfilled)
- ✅ Payment status (pending / paid)

### 9. Hub Verification

**Navigate to:** Hub → Orders (Storefront tab)

**Verify:**
- ✅ Order appears in hub orders list
- ✅ "Online" badge (vs "POS" or "Counter")
- ✅ Customer name, email, phone
- ✅ Order items with product names
- ✅ Stock decremented in Inventory tab
- ✅ `storefront_orders` and `storefront_order_items` tables populated

---

## Troubleshooting

### Products Not Showing

**Check:**
1. `products.is_active = true`
2. `products.business_id` matches tenant
3. Storefront enabled: `businesses.is_storefront_enabled = true`
4. Settings not disabled: `settings.storefront.enabled != false`

**Query:**
```sql
SELECT id, name, is_active, stock
FROM products
WHERE business_id = 'uuid'
AND is_active = true;
```

### Filters Not Working

**Check:**
1. `domain_data` fields populated: `fabrictype`, `sourcing`, `size`
2. Column names normalized: `fabrictype` vs `fabric_type` (use `normalizeKey()`)
3. Prisma extension applied: tenant scoping on products query

**Test filter directly:**
```sql
SELECT name, domain_data->>'sourcing' as sourcing
FROM products
WHERE business_id = 'uuid'
AND lower(domain_data->>'sourcing') = 'local';
```

### Stock Not Decremented

**Check:**
1. Order creation succeeded (check `storefront_orders` table)
2. Transaction committed (no rollback)
3. Stock location service called: `decrementHeadlineAndLocationsInTx()`
4. Variant stock updated: `UPDATE product_variants SET stock = stock - qty`

**Verify:**
```sql
-- Before order
SELECT stock FROM products WHERE id = 'uuid';

-- After order (should be decremented)
SELECT stock FROM products WHERE id = 'uuid';
```

### Receipt Download Fails

**Check:**
1. `jspdf` and `jspdf-autotable` installed:
   ```bash
   npm install jspdf jspdf-autotable
   ```
2. Browser allows PDF downloads (no pop-up blocker)
3. Order API returns `items` array: `GET /api/storefront/<domain>/orders?email=...`
4. Business data includes `settings` and `country` fields

**Debug:**
```javascript
// In browser console after clicking "Download Receipt"
// Check network tab for /api/storefront/.../orders response
// Verify response.orders[0].items is populated
```

### Payment Methods Not Showing

**Check:**
1. `store_payment_settings` table has rows for this business
2. `is_enabled = true` for at least one payment method
3. API endpoint returns methods: `/api/storefront/payments?businessId=uuid`

**Seed default:**
```sql
INSERT INTO store_payment_settings (business_id, provider, is_enabled, display_name)
VALUES
  ('uuid', 'cod', true, 'Cash on Delivery')
ON CONFLICT DO NOTHING;
```

### Regional Currency Wrong

**Check:**
1. `businesses.country` set correctly (e.g., `Pakistan`, `UAE`)
2. `settings.storefront.currency` not overridden
3. `getBusinessRegionalPack(business)` returns correct currency

**Force currency:**
```javascript
// In business settings
{
  storefront: {
    currency: "PKR"  // or AED, USD, etc.
  }
}
```

### Luxury Fashion Not Applied

**Check:**
1. Category is one of: `garments`, `boutique-fashion`, `textile-wholesale`, `textile-mill`, `gems-jewellery`, `leather-footwear`
2. `isLuxuryFashionStore(category)` returns `true`
3. Hero variant resolves: `getLuxuryFashionVariant(category)` returns `'textile'` or `'boutique'`

**Test:**
```javascript
import { isLuxuryFashionStore, getLuxuryFashionVariant } from '@/lib/storefront/luxuryFashion';

console.log(isLuxuryFashionStore('garments')); // => true
console.log(getLuxuryFashionVariant('textile-wholesale')); // => 'textile'
```

---

## Advanced Configuration

### Multi-Location Stock

**Enable:** Create warehouses in hub

```sql
-- Create warehouse
INSERT INTO warehouses (business_id, name, location, is_primary)
VALUES ('uuid', 'Main Warehouse', 'Karachi', true);

-- Add stock to location
INSERT INTO product_stock_locations (product_id, business_id, warehouse_id, quantity)
VALUES ('product-uuid', 'business-uuid', 'warehouse-uuid', 100);
```

**Storefront uses:** `querySellableLocationQty()` to sum location stock

### Custom Domain

**Setup:**
1. Add DNS CNAME: `store.khaadi.com` → `app.tenvo.pk`
2. Insert custom domain record:
   ```sql
   INSERT INTO business_custom_domains (business_id, domain, is_active)
   VALUES ('uuid', 'store.khaadi.com', true);
   ```
3. Restart app to pick up new domain mapping

### Membership Pricing

**Enable:** Create membership tiers in hub

```sql
-- Create membership tier
INSERT INTO membership_tiers (business_id, name, discount_percentage)
VALUES ('uuid', 'Gold Member', 10);
```

**Order flow:** If customer email matches enrolled member, discount auto-applies

### Promo Codes

**Create:** Hub → Marketing → Promo Codes

```sql
INSERT INTO storefront_promos (business_id, code, discount_percentage, min_order_amount)
VALUES ('uuid', 'SUMMER10', 10, 2000);
```

**Usage:** Customer enters `SUMMER10` in cart, 10% discount applied (min order 2000)

---

## Performance Optimization

### Database Indexes

```sql
-- Storefront product queries
CREATE INDEX idx_products_business_active ON products(business_id, is_active);
CREATE INDEX idx_products_category ON products(business_id, category_id);
CREATE INDEX idx_products_domain_data_gin ON products USING GIN(domain_data);

-- Order lookups
CREATE INDEX idx_storefront_orders_email ON storefront_orders(business_id, customer_email);
CREATE INDEX idx_storefront_orders_number ON storefront_orders(business_id, order_number);
```

### Caching (Future)

- Product list: Cache for 5 minutes (Redis)
- Category tree: Cache for 1 hour
- Business settings: Cache for 10 minutes

---

## Next Steps

1. ✅ Complete this guide checklist
2. ✅ Run `node scripts/verify-textile-storefront.mjs`
3. ✅ Place test order and download receipt
4. ✅ Share demo storefront with stakeholders
5. 🔄 Iterate on owner feedback for customization UI
6. 🔄 Add bulk import for thaan/article management
7. 🔄 Implement size/color variant picker enhancements

---

**Support:** For issues or questions, check `docs/TEXTILE_CLOTHING_STOREFRONT_ANALYSIS.md` for deep dive architecture.
