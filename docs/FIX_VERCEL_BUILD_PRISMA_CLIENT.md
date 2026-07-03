# Fix: Vercel Build Failure - Prisma Client Generation

## Issue Summary

**Error:**
```
Error: Failed to load external module @prisma/client-2c3a283f134fdcb6: Error: Cannot find module '.prisma/client/default'
Error: Failed to collect page data for /api/billing/cancel
```

This error occurs during Vercel build when the Prisma client hasn't been generated before the Next.js build process attempts to collect page data from API routes that import `@prisma/client` or `prismaBase`.

## Root Cause

1. **Missing Prisma Generation Step**: The build script didn't include `prisma generate`, so the Prisma client wasn't available when Next.js tried to statically analyze API routes during build.

2. **Static Generation Attempts**: API routes that use Prisma were being statically analyzed during build time, causing the build process to try to import the Prisma client before it was generated.

## Solution

### 1. Update Build Scripts in package.json

Added Prisma client generation to the build pipeline:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

**Why this works:**
- `prisma generate` runs **before** `next build`, ensuring the client exists
- `postinstall` hook ensures Prisma client is generated after `npm install` in CI/CD environments like Vercel

### 2. Add Dynamic Export to API Routes

Added `export const dynamic = 'force-dynamic'` to all API routes that use Prisma:

**Files modified:**
- `app/api/billing/cancel/route.js`
- `app/api/billing/update/route.js`
- `app/api/billing/subscription/route.js`
- `app/api/billing/portal/route.js`
- `app/api/billing/crypto/create/route.js`
- `app/api/billing/create-checkout/route.js`
- `app/api/webhooks/stripe/route.js`
- `app/api/notifications/sse/route.js`
- `app/api/admin/feature-flags/route.js`
- `app/api/admin/feature-flags/[id]/route.js`

**Why this works:**
- Tells Next.js these routes are **dynamic** and should not be statically analyzed during build
- Prevents the build process from trying to execute code that requires database access
- Routes will be generated at runtime, not build time

## How It Works

### Before:
```
1. npm install
2. next build (tries to analyze routes)
3. Routes import prismaBase
4. Prisma client doesn't exist yet
5. ❌ Build fails
```

### After:
```
1. npm install
2. postinstall hook runs → prisma generate ✅
3. build script runs → prisma generate ✅ (ensures it exists)
4. next build (skips static analysis of dynamic routes)
5. ✅ Build succeeds
```

## Verification

After these changes, the Vercel build should:

1. ✅ Generate Prisma client during `postinstall`
2. ✅ Regenerate (idempotent) during `build` script
3. ✅ Skip static page data collection for dynamic API routes
4. ✅ Successfully complete the build

## Files Changed

### Modified:
- `package.json` - Updated build and added postinstall scripts
- 10 API route files - Added `dynamic = 'force-dynamic'` export

### Why Each Change is Safe:

1. **`postinstall` script**: 
   - Standard practice for Prisma projects
   - Only runs after dependencies are installed
   - Idempotent (can run multiple times safely)

2. **`dynamic = 'force-dynamic'` export**:
   - Only affects build-time behavior
   - Does NOT affect runtime behavior
   - Routes still function identically at runtime
   - Prevents unnecessary static generation for inherently dynamic routes (database-dependent)

## Best Practices Applied

1. **Prisma Generation**: Always generate Prisma client before build
2. **Route Configuration**: Mark database-dependent routes as dynamic
3. **CI/CD Compatibility**: Use postinstall hooks for automated deployments
4. **Idempotency**: Safe to run generation multiple times

## Related Next.js Documentation

- [Route Segment Config - dynamic](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
- [Dynamic Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering)

## Impact

- ✅ **No Breaking Changes** - All routes function identically
- ✅ **Build Process** - Now completes successfully on Vercel
- ✅ **Runtime Behavior** - Unchanged, routes work as before
- ✅ **Performance** - No negative impact (routes were already dynamic at runtime)
