# Textile Storefront - Deployment Checklist

**Date:** June 30, 2026  
**Feature:** Customer Receipt Download + Full Textile Storefront Verification

---

## ✅ Pre-Deployment Verification

### Code Changes
- [x] **Created:** `lib/storefront/storefrontReceiptDownload.js`
- [x] **Modified:** `app/store/[businessDomain]/checkout/page.jsx` (Download Receipt button)
- [x] **Modified:** `app/api/storefront/[businessDomain]/orders/route.js` (return line items)
- [x] **Created:** Documentation files (3 comprehensive docs)
- [x] **Created:** Verification script (`scripts/verify-textile-storefront.mjs`)

### Dependencies
- [ ] Verify `jspdf` installed: `npm list jspdf`
- [ ] Verify `jspdf-autotable` installed: `npm list jspdf-autotable`
- [ ] If missing: `npm install jspdf jspdf-autotable`

### Database
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify `storefront_orders` table exists
- [ ] Verify `storefront_order_items` table exists
- [ ] Verify `store_payment_settings` table exists

### Environment Variables
- [ ] `DATABASE_URL` configured
- [ ] `RESEND_API_KEY` configured (for order emails)
- [ ] `STRIPE_SECRET_KEY` configured (optional, for card payments)
- [ ] `NEXT_PUBLIC_SALES_MEETING_URL` configured (optional, for booking)

---

## 🧪 Testing

### Automated Testing
```bash
# Run textile storefront verification
node scripts/verify-textile-storefront.mjs

# Verify domain verticals
bun run verify:domains

# Verify storefront tenancy (stock/cart security)
npm run verify:storefront-tenancy

# Verify regional market standards
bun run verify:regional-market
```

### Manual Testing Sequence

#### 1. Business Registration
- [ ] Register new business with category: `garments`
- [ ] Set country: `Pakistan`
- [ ] Confirm rich catalog seeded (10+ SKUs)
- [ ] Verify brands: Khaadi, Gul Ahmed, Al-Karam, Turkey/China imports

#### 2. Storefront Navigation
- [ ] Visit `/store/<domain>`
- [ ] Confirm hero loads (luxury fashion variant)
- [ ] Confirm products display with images
- [ ] Confirm "Local" / "Imported" badges visible

#### 3. Product Filtering
- [ ] Filter by fabric: `/products?fabric=Lawn`
- [ ] Filter by sourcing: `/products?sourcing=local`
- [ ] Filter by sourcing: `/products?sourcing=imported`
- [ ] Filter by brand: `/products?brand=Khaadi`
- [ ] Filter by price range: `/products?minPrice=2000&maxPrice=5000`
- [ ] Toggle "In Stock Only"
- [ ] Toggle "On Sale"

#### 4. Product Detail Page
- [ ] Click any product
- [ ] Verify attribute chips display: Brand, Fabric, Sourcing
- [ ] Verify sourcing badge (green "Local" or blue "Imported")
- [ ] Verify stock status (In Stock / Low Stock / Out of Stock)
- [ ] Add to cart

#### 5. Cart
- [ ] View cart (`/store/<domain>/cart`)
- [ ] Adjust quantity (+ / -)
- [ ] Remove item
- [ ] Add multiple items
- [ ] Proceed to checkout

#### 6. Checkout Flow
- [ ] **Step 1 - Information:**
  - [ ] Email: `test@example.com`
  - [ ] First name: `Ali`
  - [ ] Last name: `Khan`
  - [ ] Phone: `+92 300 1234567`
  - [ ] Click "Continue"

- [ ] **Step 2 - Shipping:**
  - [ ] Address: `House 123, Street 5, DHA Phase 6`
  - [ ] City: `Karachi`
  - [ ] Postal code: `75500`
  - [ ] Select shipping method: `Standard Delivery`
  - [ ] Click "Continue"

- [ ] **Step 3 - Payment:**
  - [ ] Confirm payment methods load (COD, Stripe, etc.)
  - [ ] Select: `Cash on Delivery (COD)`
  - [ ] Click "Continue"

- [ ] **Step 4 - Review:**
  - [ ] Verify order summary (items, subtotal, tax, shipping, total)
  - [ ] Verify customer info (name, address)
  - [ ] Verify payment method (COD)
  - [ ] Click "Place Order"

#### 7. Order Success & Receipt Download ⭐ NEW
- [ ] **Success screen displays:**
  - [ ] Order number (e.g., `TN-2026-00042`)
  - [ ] Customer name confirmation
  - [ ] Email confirmation sent message
  - [ ] "Track My Order" button
  - [ ] **"Download Receipt" button** ← NEW FEATURE

- [ ] **Click "Download Receipt":**
  - [ ] Button shows "Generating Receipt..." (loading state)
  - [ ] PDF download starts (filename: `TN-2026-00042-receipt.pdf`)
  - [ ] Toast shows "Receipt downloaded!"

- [ ] **Open downloaded PDF:**
  - [ ] Business name, address, phone displayed
  - [ ] NTN/SRN displayed (if Pakistan)
  - [ ] Order number, date, customer name displayed
  - [ ] Line items with SKU, qty, unit price displayed
  - [ ] Subtotal, tax, discount, total displayed
  - [ ] Payment method displayed (COD)
  - [ ] "Thank you" footer displayed
  - [ ] "Powered by Tenvo" displayed

#### 8. Order Tracking
- [ ] Visit `/store/<domain>/orders?email=test@example.com`
- [ ] Order appears in list
- [ ] Order details expandable (items, status, total)
- [ ] Fulfillment status shows "Unfulfilled"
- [ ] Payment status shows "Pending" (COD)

#### 9. Hub Verification
- [ ] Login to hub
- [ ] Navigate to Orders tab
- [ ] Storefront orders tab shows new order
- [ ] "Online" badge visible (vs "POS")
- [ ] Customer name, email, phone displayed
- [ ] Order items listed
- [ ] Navigate to Inventory tab
- [ ] Stock decremented for ordered products

---

## 🐛 Known Issues to Watch

### Potential Edge Cases
- [ ] Cart from different business (should be rejected)
- [ ] Insufficient stock (should show error before order placement)
- [ ] Invalid promo code (should show error message)
- [ ] Payment method not configured (should show "No payment methods" message)
- [ ] Receipt download when no items (should handle gracefully)
- [ ] Multiple rapid order placements (row locks should prevent double-charge)

### Browser Compatibility
- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on mobile Safari (iOS)
- [ ] Test on mobile Chrome (Android)

---

## 🚀 Deployment Steps

### 1. Commit & Push
```bash
git add .
git commit -m "feat: Add customer receipt download for textile storefront orders

- New: lib/storefront/storefrontReceiptDownload.js
- Updated: checkout success screen with Download Receipt button
- Updated: orders API to return line items for receipt generation
- Added: Comprehensive docs for textile storefront
- Added: Verification script for textile features"

git push origin main
```

### 2. Deploy to Production
```bash
# If using Vercel
vercel --prod

# If using custom deployment
npm run build
npm run start
```

### 3. Post-Deployment Smoke Test
- [ ] Visit production storefront URL
- [ ] Place test order (use test payment if Stripe)
- [ ] Download receipt
- [ ] Verify receipt PDF downloads correctly
- [ ] Check order in hub

### 4. Monitor
- [ ] Check logs for errors: `npm run logs` or Vercel dashboard
- [ ] Monitor Sentry/error tracking (if configured)
- [ ] Check Resend dashboard for email delivery
- [ ] Monitor database for `storefront_orders` inserts

---

## 📊 Success Metrics

### Immediate (First 24 Hours)
- [ ] At least 1 test order placed successfully
- [ ] Receipt downloaded without errors
- [ ] No critical errors in logs
- [ ] Email confirmations delivering

### Short-Term (First Week)
- [ ] 5+ textile businesses registered
- [ ] 10+ orders placed (demo + real)
- [ ] Receipt download success rate > 95%
- [ ] Average order completion time < 3 minutes
- [ ] Stock accuracy maintained (no overselling)

### Medium-Term (First Month)
- [ ] Business owners report positive feedback
- [ ] Receipt feature used on 80%+ of orders
- [ ] No major bug reports
- [ ] Average cart abandonment rate < 30%

---

## 🔧 Rollback Plan

### If Critical Issues Arise

#### Option 1: Quick Fix
```bash
# Fix the issue in code
git add .
git commit -m "fix: Critical issue in receipt download"
git push origin main
vercel --prod  # or your deployment command
```

#### Option 2: Rollback
```bash
# Revert to previous deployment
vercel rollback  # or your rollback command

# Or revert commit
git revert HEAD
git push origin main
```

#### Option 3: Feature Flag (If Available)
- Disable receipt download feature via feature flag
- Keep rest of storefront functional
- Fix issue offline, re-enable after verification

---

## 📝 Post-Deployment Actions

### Documentation
- [ ] Update user documentation with receipt download instructions
- [ ] Create video tutorial showing order placement + receipt download
- [ ] Update FAQ with common receipt download questions

### Communication
- [ ] Email existing textile business owners about new feature
- [ ] Post announcement in community/support channels
- [ ] Update changelog/release notes

### Monitoring
- [ ] Set up alerts for receipt download failures
- [ ] Track receipt download usage metrics
- [ ] Monitor customer feedback/support tickets

---

## ✅ Final Sign-Off

### Development Team
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Documentation complete
- [ ] Deployment checklist reviewed

### QA Team
- [ ] Manual testing complete
- [ ] Edge cases tested
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete

### Product Team
- [ ] Feature requirements met
- [ ] User experience approved
- [ ] Business metrics defined
- [ ] Go-live approved

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Sign-Off:** _________________

---

## 🎉 Congratulations!

Once all checkboxes are complete, the textile storefront with customer receipt download is ready for production! 🚀

**Key Achievement:** World-class textile e-commerce platform with full order flow, regional support, and professional receipts.

**Next Steps:** Monitor usage, collect feedback, iterate based on business owner needs.
