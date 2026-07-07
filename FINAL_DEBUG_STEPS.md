# 🎯 FINAL DEBUG STEPS - Execute Now

## ⚡ Quick Test (30 seconds)

```bash
npm run test:pool
```

**This will tell you IMMEDIATELY:**
- ✅ Is pool connecting to the right database?
- ✅ Does demo-boutique exist in that database?
- ✅ Is storefront enabled?

---

## 📊 THEN: Restart Dev Server with Logging

```bash
# Stop current server (Ctrl+C)

# Start with full logging
npm run dev
```

**Visit:** `http://localhost:3000/store/demo-boutique`

**Click any product**

**Check terminal for detailed logs**

---

## 🔍 WHAT THE LOGS WILL SHOW

### Scenario A: Wrong Database (Most Likely)

**Pool Test Shows:**
```
❌ demo-boutique NOT FOUND in this database
Found these demo stores:
- some-other-demo
- different-demo
```

**Cause:** API routes connecting to DIFFERENT database than diagnostic script

**Fix:** Check `.env` vs `.env.local` - which one has correct DATABASE_URL?

### Scenario B: Storefront Disabled

**Pool Test Shows:**
```
✅ Found demo-boutique
⚠️  WARNING: Storefront is DISABLED
```

**Fix:** 
```sql
UPDATE business_settings 
SET is_storefront_enabled = true 
WHERE business_id = (SELECT id FROM businesses WHERE domain = 'demo-boutique');
```

### Scenario C: Connection Issue

**Pool Test Shows:**
```
❌ Error: connection refused
```

**Fix:** Database not running or DATABASE_URL wrong

---

## 🎯 EXPECTED: Pool Test SHOULD Show

```
✅ Pool connection successful

📊 Connection Info:
   Database: postgres
   Host: aws-0-...supabase.co  (or similar)
   Port: 5432

🔍 Testing query for demo-boutique...

✅ Found demo-boutique:
   ID: 71f6fc60-5f57-4769-9644-c3f227118e17
   Name: Tenvo Boutique Demo
   Domain: demo-boutique
   Active: true
   Storefront Enabled: true

✅ Storefront is ENABLED - should work!
```

**If you see this ✅** → The database connection is correct

**Then the issue is:** Runtime environment difference between pool in API routes vs diagnostic

---

## 🔧 IF POOL TEST PASSES BUT API STILL FAILS

This means:
- Diagnostic script ✅ works
- Pool test ✅ works  
- API routes ❌ fail

**Root Cause:** Next.js runtime environment issue

**Solutions to try:**

### 1. Clear Everything
```bash
npm run clear:caches
npm run build
npm run dev
```

### 2. Check .env Loading
```bash
# Check which .env files exist
dir .env*

# Verify DATABASE_URL in each
type .env | findstr DATABASE_URL
type .env.local | findstr DATABASE_URL
```

### 3. Verify Next.js Can Access Env
Create `app/api/test-env/route.js`:
```javascript
export async function GET() {
    return Response.json({
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        firstChars: process.env.DATABASE_URL?.substring(0, 20) + '...'
    });
}
```

Visit: `http://localhost:3000/api/test-env`

Should show: `{ "hasDatabaseUrl": true, "firstChars": "postgresql://..." }`

---

## 📋 EXECUTION CHECKLIST

**Step 1:** Run pool test
```bash
npm run test:pool
```

- [ ] Connection successful?
- [ ] Correct database/host?
- [ ] demo-boutique found?
- [ ] Storefront enabled?

**Step 2:** If pool test passes, restart dev server
```bash
npm run dev
```

- [ ] Visit demo store
- [ ] Check server logs
- [ ] Look for detailed resolution logs

**Step 3:** Based on logs
- [ ] If "0 rows" → Database mismatch (check .env files)
- [ ] If "disabled" → Enable storefront
- [ ] If connection error → DATABASE_URL wrong

---

## 🆘 COPY/PASTE THESE RESULTS

After running `npm run test:pool`, copy the output and share:

```
[Paste pool test output here]
```

After visiting demo store, copy server logs:

```
[Paste API route logs here]
```

This will give me EXACT information to fix precisely!

---

**Run `npm run test:pool` now!** 🚀
