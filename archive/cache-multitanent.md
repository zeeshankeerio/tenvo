# Storefront domain resolution and cache (2026-07-05)

## Summary

Hardened multi-tenant storefront domain resolution and aligned Redis / Next.js cache keys with URL alias variants.

## Changes

### Unified resolver (`lib/tenancy/resolveStorefrontBusiness.js`)

- Single query path for API (`resolveStorefrontBusiness`) and RSC (`loadStorefrontBusinessShell`).
- **Exact domain match first**; hyphen/underscore alias only when it resolves to **one** canonical tenant.
- **Ambiguous matches** (e.g. `my-shop` and `my_shop` as different businesses) return `null` and log a warning.
- Redis L2 re-validates storefront-enabled flags on cache hit.
- Shared Next.js cache key: `['storefront-business', domain]` (replaces `storefront-resolve`).

### `fetchBusinessByDomain.js`

- Thin wrapper over `loadStorefrontBusinessShell` (no duplicate SQL).

### Cache invalidation

- `invalidateStorefrontBusiness` purges Next tags + Redis for all alias keys (`expandStorefrontDomainAliasKeys`).
- Redis `setCachedStorefrontBusiness` also writes canonical `business.domain` key.

### Custom domains (`admin.js`)

- Case-insensitive uniqueness in `business_custom_domains`.
- Blocks custom domains that collide with another tenant's `businesses.domain`.

### API routes

- **New:** `POST /api/storefront/[businessDomain]/products/[productId]/stock`
- **New:** `POST /api/storefront/[businessDomain]/cart/sync`
- **Removed:** domain-less `/api/storefront/products/.../stock` and `/api/storefront/cart/sync`
- `CartContext` uses domain-scoped stock URL.

## Verification

```bash
npm run verify:storefront-domain-resolution
npm run verify:cache-wiring
npm run verify:storefront-tenancy
```

## Not in scope

- Host-header custom domain routing (`x-tenvo-forwarded-host` still unused).
- DB migration for global `UNIQUE(LOWER(domain))` on `business_custom_domains`.
