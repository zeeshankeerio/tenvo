# Marketing capability map

Public marketing must stay aligned with **what ships** in the product. This doc is the editorial companion to **`lib/marketing/capabilities.js`** (code) and **`lib/config/plans.js`** (entitlements).

## Status labels (public)

| Label | Meaning |
|-------|---------|
| **Available** | In production; usable when plan/env allows |
| **Partial** | Usable with caveats (config, plan gate, or incomplete depth) |
| **Roadmap** | Planned or scaffold only - do not badge as Live |

## Shipped today (high confidence)

- Inventory hub: products, stock adjustments, Excel import, product images, multi-warehouse (Professional+)
- POS: terminals, sessions, retail checkout, restaurant POS, browser thermal receipts
- Branded storefront: catalog, cart, checkout, order hub
- Finance: journal entries, GL hub, fiscal periods (Professional+)
- CRM: loyalty, promotions (Professional+), campaigns hub (Business+)
- AI: Business Analyst, forecasting signals (Business+, API keys)
- Billing: Stripe subscriptions, manual/offline path, optional NOWPayments
- Email: Resend transactional (OTP, orders, leads)

## Partial (say it plainly)

- **Pakistani tax**: configuration + summaries + exports - **not** live FBR IRIS filing
- **JazzCash / EasyPaisa**: checkout labels - **not** built-in wallet capture
- **Storefront stock**: shared catalog; multi-location businesses should validate stock rules
- **Manufacturing**: BOM + production orders - not full MES
- **HR**: payroll backend on Business+; attendance/shift UIs are early
- **Urdu**: toggle + partial strings - not 100% localized UI
- **Barcode**: SKU lookup - camera decode not production-grade

## Roadmap (never “Live” on /integrations)

- FBR IRIS / Tier-1 POS transmission
- Shopify, Daraz, WooCommerce sync
- WhatsApp Business API automation
- Bank feed API reconciliation
- Offline POS selling mode

## Pages updated from this map

- `/integrations` - honest status grid
- `/features` - advanced section bullets
- Solutions mega-menu - `capabilities.js` descriptions
- `/industries` - 62 presets, not “automatic compliance”
- `/why-tenvo`, `/solutions/marketing-crm` - tier and scope fixes
- `lib/marketing/content.js`, `lib/marketing/faqs.js`, `TENVO_ADVANTAGES`

## When product changes

1. Update `lib/marketing/capabilities.js`
2. Adjust affected page if not driven from catalog
3. Sync `PLAN_TIERS` / `FEATURE_LABELS` if entitlements change
4. Note in PR if a **Partial → Available** promotion is intentional
