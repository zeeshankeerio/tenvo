# 🔍 DEBUG NOW - Detailed Logging Added

## ✅ What I Added

Comprehensive logging to `lib/tenancy/resolveStorefrontBusiness.js`:

1. **Domain resolution start/end**
2. **Redis cache hit/miss**
3. **Database query execution**
4. **SQL result counts**
5. **Connection info**
6. **Every decision point**

---

## 🚀 Run This Now

```bash
# Stop current dev server (Ctrl+C)

# Start fresh
npm run dev
```

---

## 📊 Check Server Logs

When you visit `http://localhost:3000/store/demo-boutique`, you'll see detailed logs like:

### ✅ SUCCESS SCENARIO:
```
[resolveStorefrontBusiness] START - domain: demo-boutique
[resolveStorefrontBusiness] Redis cache: MISS
[resolveStorefrontBusiness] Querying database directly...
[queryBusinessByDomainSegment] Looking for domain: demo-boutique
[queryBusinessByDomainSegment] Client connection info: { database: 'postgres', host: '...', port: 5432 }
[queryBusinessByDomainSegment] Trying exact match query...
[queryBusinessByDomainSegment] SQL params: [ 'demo-boutique' ]
[queryBusinessByDomainSegment] Exact match result: 1 rows
[resolveStorefrontBusiness] Query result: ✅ 71f6fc60-5f57-4769-9644-c3f227118e17
[resolveStorefrontBusiness] Storefront disabled? false
[resolveStorefrontBusiness] RETURN resolved ✅
[reviews route] Business resolved: ✅
```

### ❌ FAILURE SCENARIO (Current):
```
[resolveStorefrontBusiness] START - domain: demo-boutique
[resolveStorefrontBusiness] Redis cache: MISS
[resolveStorefrontBusiness] Querying database directly...
[queryBusinessByDomainSegment] Looking for domain: demo-boutique
[queryBusinessByDomainSegment] Client connection info: { database: '???', host: '???', port: ??? }
[queryBusinessByDomainSegment] Trying exact match query...
[queryBusinessByDomainSegment] SQL params: [ 'demo-boutique' ]
[queryBusinessByDomainSegment] Exact match result: 0 rows  ← THE PROBLEM
[queryBusinessByDomainSegment] No exact match, trying aliases...
[queryBusinessByDomainSegment] Alias keys: [ 'demo_boutique' ]
... 
[resolveStorefrontBusiness] Query result: ❌ null
[resolveStorefrontBusiness] RETURN null - no row found
[reviews route] Business resolved: ❌ null
```

---

## 🎯 What To Look For

### Key Questions the Logs Will Answer:

1. **Is DATABASE_URL correct?**
   - Look at `Client connection info`
   - Should show correct database/host/port

2. **Is the SQL query executing?**
   - Look for `Trying exact match query...`
   - Should NOT show errors

3. **Does the query return rows?**
   - Look for `Exact match result: X rows`
   - Should show `1 rows` for demo-boutique

4. **Is Redis interfering?**
   - Look for `Redis cache: HIT` vs `MISS`
   - HIT with wrong ID could cause issues

5. **Is storefront disabled?**
   - Look for `Storefront disabled? true/false`
   - Should be `false`

---

## 🔧 LIKELY ROOT CAUSES

Based on the logs, we'll identify:

### Scenario A: Wrong Database Connection
```
Client connection info: { database: 'dummy', host: 'localhost', port: 5432 }
```
**Fix:** DATABASE_URL in .env is wrong or not loaded

### Scenario B: Query Returns 0 Rows
```
Exact match result: 0 rows
```
**Possible reasons:**
- Database doesn't have demo-boutique (unlikely - diagnostic proved it exists)
- Connection to DIFFERENT database than diagnostic
- Case sensitivity issue in SQL
- `is_active` is false

### Scenario C: Storefront Disabled
```
Storefront disabled? true
```
**Fix:** Check `business_settings.is_storefront_enabled`

### Scenario D: Redis Has Stale/Wrong Data
```
Redis cache: HIT (wrong-uuid-here)
```
**Fix:** Clear Redis cache

---

## 🆘 NEXT STEPS BASED ON LOGS

### After you run `npm run dev` and visit the store:

**1. Copy the logs from your terminal**

**2. Look for the FIRST error/unexpected value:**
   - If connection info looks wrong → DATABASE_URL issue
   - If exact match = 0 rows → Database mismatch or query issue
   - If disabled = true → Settings issue
   - If Redis HIT with wrong ID → Cache corruption

**3. Tell me what you see, and I'll fix it precisely**

---

## 💡 DIAGNOSTIC COMPARISON

**Why diagnostic script worked but API route fails:**

**Diagnostic Script:**
```javascript
import { Pool } from 'pg';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  // Direct env access
    ...
});
```

**API Route:**
```javascript
import pool from '@/lib/db';  // Imported from lib/db.js
// Uses SAME DATABASE_URL but through different path
```

**Possible Issue:**
- Different environment loading
- Module resolution differences
- Build-time vs runtime env variables
- Next.js edge runtime restrictions

The detailed logs will reveal EXACTLY what's different!

---

## ✅ CHECKLIST

After restarting dev server:

- [ ] Visit: http://localhost:3000/store/demo-boutique
- [ ] Click any product
- [ ] Check server terminal for detailed logs
- [ ] Look for the FIRST unexpected value
- [ ] Share those logs for precise fix

---

**The logs will tell us everything. Restart dev server and check!** 🔍
