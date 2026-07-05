# Storefront domain resolution hardening (2026-07-05)

## Problem

Multi-tenant storefront resolution had:

- Duplicate SQL in `resolveStorefrontBusiness` vs `fetchBusinessByDomain`
- Hyphen/underscore alias queries that could match two tenants (`my-shop` vs `my_shop`)
- Split Next.js cache keys (`storefront-resolve` vs `storefront-business`)
- Redis domain index not purged for URL alias variants
- Domain-less stock/cart APIs trusting client `businessId`

## Solution

1. **Unified resolver** in `lib/tenancy/resolveStorefrontBusiness.js` with `pickStorefrontDomainRow` guard
2. **`fetchBusinessByDomain`** delegates to `loadStorefrontBusinessShell`
3. **Invalidation** expands alias keys; Redis writes canonical domain key too
4. **Custom domain** admin checks case-insensitive uniqueness + `businesses.domain` collision
5. **Domain-scoped** stock and cart sync routes; `CartContext` updated

## Verification

All passing:

- `npm run verify:storefront-domain-resolution`
- `npm run verify:cache-wiring`
- `npm run verify:storefront-tenancy`

## Follow-up (not done)

- Host-header routing for real custom domains
- DB `UNIQUE(LOWER(domain))` on `business_custom_domains`
