# Complete Architecture Analysis & Data Flow Deep Dive

## 🎯 Critical Finding: Orders Not Showing Actual Records

**Status:** INVESTIGATING  
**Priority:** CRITICAL  
**Date:** July 12, 2026

---

## 🔍 Root Cause Investigation

### Symptom
"Orders not showing actual records" despite our unified aggregation fix.

### Possible Causes

1. **DataContext Not Fetching Updated Data**
   - Cache not invalidated after our fix
   - Old snapshot still in memory
   - Need to restart server to apply backend changes

2. **Frontend Still Using Old Props**
   - `invoices` prop passed to `DomainDashboard`
   - `dashboardMetrics` might not have `orders.total` populated
   - Fallback to client-side calculation still occurring

3. **Date Range Filter Mismatch**
   - Backend using different date range than frontend
   - `dateFrom`/`dateTo` params not matching displayed range
   - Filter context out of sync

4. **Business ID Mismatch**
   - Wrong business context loaded
   - Session business_id differs from URL business_id
   - Multi-tenant filtering breaking

---

## 📊 Complete Data Flow Architecture

### Layer 1: Database (PostgreSQL)

```
┌─────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐│
│  │   invoices   │  │pos_trans...  │  │storefront_...  ││
│  ├──────────────┤  ├──────────────┤  ├────────────────┤│
│  │ id           │  │ id           │  │ id             ││
│  │ business_id  │  │ business_id  │  │ business_id    ││
│  │ date         │  │ created_at   │  │ created_at     ││
│  │ grand_total  │  │ total_amount │  │ total_amount   ││
│  │ status       │  │ is_voided    │  │ status         ││
│  │ is_deleted   │  │ payment_...  │  │ order_number   ││
│  └──────────────┘  └──────────────┘  └────────────────┘│
│                                                           │
│  Key Constraints:                                         │
│  - invoices: business_id FK, date NOT NULL               │
│  - pos_transactions: business_id FK, created_at NOT NULL │
│  - storefront_orders: business_id FK, order_number UNIQUE│
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Issues Found:**
- ✅ All foreign keys exist
- ⚠️  20 foreign keys missing indexes (performance)
- ✅ No orphaned records
- ❌ 4 products with NULL names

---

### Layer 2: Backend Actions (Server-Side)

```
┌───────────────────────────────────────────────────────────┐
│                  BACKEND ACTIONS LAYER                     │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  lib/actions/basic/dashboard.js                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ getDashboardKPIs(businessId, options)                │  │
│  │                                                       │  │
│  │ 1. Parse date range (dateFrom, dateTo)              │  │
│  │ 2. Query with CTEs:                                  │  │
│  │    - period_invoices                                 │  │
│  │    - period_pos         ← ADDED IN FIX               │  │
│  │    - period_storefront  ← ADDED IN FIX               │  │
│  │ 3. Aggregate:                                        │  │
│  │    - total_revenue (SUM all 3 ledgers)              │  │
│  │    - total_order_count (COUNT all 3 ledgers)        │  │
│  │    - invoice_count, pos_count, storefront_count     │  │
│  │ 4. Return structured response                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  lib/actions/dashboard/advancedDashboardSnapshot.js        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ getAdvancedDashboardSnapshotAction(businessId)       │  │
│  │                                                       │  │
│  │ 1. Call getDashboardKPIs()  ← Uses our fix          │  │
│  │ 2. Call getAccountingSummaryAction()                 │  │
│  │ 3. Merge results                                     │  │
│  │ 4. Return finance object                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

**Issues Found:**
- ✅ Backend aggregation fixed
- ⚠️  Need to verify server restarted with new code
- ⚠️  Need to check if cache invalidated

---

### Layer 3: Data Context (React Context)

```
┌───────────────────────────────────────────────────────────┐
│                  DATA CONTEXT LAYER                        │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  lib/context/DataContext.js                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ DataProvider Component                               │  │
│  │                                                       │  │
│  │ const fetchData = useCallback(async () => {          │  │
│  │   const [                                            │  │
│  │     dashMetrics,                                     │  │
│  │     advancedSnapshot,  ← Should have our fix        │  │
│  │     salesPerf,                                       │  │
│  │     // ...                                           │  │
│  │   ] = await Promise.all([                           │  │
│  │     getDashboardMetricsAction(...),                  │  │
│  │     getAdvancedDashboardSnapshotAction(...),        │  │
│  │     getSalesPerformanceAction(...),                  │  │
│  │     // ...                                           │  │
│  │   ]);                                                │  │
│  │                                                       │  │
│  │   setDashboardMetrics(dashMetrics);                  │  │
│  │   setAdvancedDashboardSnapshot(advancedSnapshot);    │  │
│  │ }, [businessId, dateRange]);                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  State Provided to Children:                               │
│  - dashboardMetrics                                        │
│  - advancedDashboardSnapshot                               │
│  - invoices (array)                                        │
│  - products (array)                                        │
│  - customers (array)                                       │
│  - dateRange                                               │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

**Potential Issues:**
- ❓ Is `dashboardMetrics` populated with `orders.total`?
- ❓ Is server-side snapshot stale in memory?
- ❓ Cache invalidation after code change?

---

### Layer 4: Dashboard Component (Frontend)

```
┌───────────────────────────────────────────────────────────┐
│                  DASHBOARD COMPONENT                       │
├───────────────────────────────────────────────────────────┤
│                                                             │
│  app/business/[category]/components/tabs/                  │
│  DomainDashboard.tsx                                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ export function DomainDashboard({                    │  │
│  │   invoices,                                          │  │
│  │   products,                                          │  │
│  │   dashboardMetrics,         ← Should have orders    │  │
│  │   advancedDashboardSnapshot ← Should have finance   │  │
│  │ }) {                                                 │  │
│  │                                                       │  │
│  │   const periodMetrics = useMemo(() => {             │  │
│  │     // FIXED: Prefer server-side unified data       │  │
│  │     const serverOrderCount =                         │  │
│  │       dashboardMetrics?.orders?.total;              │  │
│  │                                                       │  │
│  │     const clientInvoiceCount =                       │  │
│  │       billableInvoices.filter(...).length;          │  │
│  │                                                       │  │
│  │     const currentOrders = serverOrderCount !==      │  │
│  │       undefined ? serverOrderCount :                 │  │
│  │       clientInvoiceCount;                            │  │
│  │                                                       │  │
│  │     return {                                         │  │
│  │       currentOrders,  ← THIS IS THE VALUE DISPLAYED │  │
│  │       currentRevenue,                                │  │
│  │       // ...                                         │  │
│  │     };                                               │  │
│  │   }, [dateRange, invoices, dashboardMetrics]);      │  │
│  │                                                       │  │
│  │   // Render KPIs                                     │  │
│  │   return (                                           │  │
│  │     <div>                                            │  │
│  │       <MetricCard                                    │  │
│  │         label="Orders"                               │  │
│  │         value={periodMetrics.currentOrders}         │  │
│  │       />                                             │  │
│  │     </div>                                           │  │
│  │   );                                                 │  │
│  │ }                                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└───────────────────────────────────────────────────────────┘
```

**Critical Check Points:**
1. ❓ Is `dashboardMetrics.orders.total` defined?
2. ❓ If undefined, falling back to `clientInvoiceCount`
3. ❓ Is the fallback still showing only invoices?

---

## 🔬 Debugging Checklist

### Step 1: Verify Server Restart
```bash
# Check if server is running with new code
pm2 logs tenvo-app --lines 50 | grep "getDashboardKPIs"
# Or
docker-compose logs app | grep "dashboard"
```

**Action Required:**
- [ ] Restart Node.js server to apply backend changes
- [ ] Clear any Redis/memory cache
- [ ] Verify new code is deployed

---

### Step 2: Check DataContext Response

Add debug logging to `lib/context/DataContext.js`:

```javascript
const fetchData = useCallback(async () => {
  const [dashMetrics, advancedSnapshot, ...] = await Promise.all([...]);
  
  // 🔍 DEBUG: Log what we're getting from backend
  console.log('🔍 Dashboard Metrics:', dashMetrics);
  console.log('🔍 Orders Object:', dashMetrics?.orders);
  console.log('🔍 Orders Total:', dashMetrics?.orders?.total);
  console.log('🔍 Advanced Snapshot:', advancedSnapshot);
  
  setDashboardMetrics(dashMetrics);
}, [businessId, dateRange]);
```

**Expected Output:**
```javascript
{
  revenue: {
    total: 199976.40,
    orderCount: 21,      // ← Unified count
    invoiceCount: 8      // ← Legacy count
  },
  orders: {
    total: 21,           // ← Should be populated
    invoices: 8,
    pos: 11,
    storefront: 2
  }
}
```

**Action Required:**
- [ ] Add console.log to DataContext
- [ ] Check browser console
- [ ] Verify `orders.total` is populated

---

### Step 3: Check getDashboardMetricsAction

The DataContext calls `getDashboardMetricsAction()`, but we fixed `getDashboardKPIs()`.

**Verify these are connected:**

```javascript
// lib/actions/basic/dashboard.js (the one we fixed)
export async function getDashboardKPIs(businessId, options) {
  // ... our unified aggregation code
}

// Is there a wrapper action?
// Check lib/actions/ for getDashboardMetricsAction
```

**Potential Issue:**
- DataContext might be calling a different action
- Need to find where `getDashboardMetricsAction` is defined
- Ensure it calls our fixed `getDashboardKPIs`

---

### Step 4: Check Dashboard Props

Add debug logging to `DomainDashboard.tsx`:

```typescript
export function DomainDashboard({
  dashboardMetrics,
  advancedDashboardSnapshot,
  invoices,
  //...
}: DomainDashboardProps) {
  
  // 🔍 DEBUG: Log props received
  useEffect(() => {
    console.log('🔍 DomainDashboard Props:');
    console.log('  dashboardMetrics:', dashboardMetrics);
    console.log('  orders:', dashboardMetrics?.orders);
    console.log('  orders.total:', dashboardMetrics?.orders?.total);
    console.log('  invoices.length:', invoices.length);
  }, [dashboardMetrics, invoices]);
  
  // Rest of component...
}
```

**Expected:**
- `dashboardMetrics.orders.total` should be 21 (or actual unified count)
- If undefined, we're falling back to invoice-only count

**Action Required:**
- [ ] Add useEffect debug logging
- [ ] Check if `orders.total` exists
- [ ] If undefined, trace back to DataContext

---

### Step 5: Check Date Range Filters

The backend might be using different dates than the frontend displays.

```javascript
// In DataContext.js
const fetchData = useCallback(async () => {
  console.log('🔍 Fetching with date range:', dateRange);
  console.log('  From:', dateRange.from);
  console.log('  To:', dateRange.to);
  
  const advancedSnapshot = await getAdvancedDashboardSnapshotAction(
    businessId, 
    { from: dateFromISO, to: dateToISO }
  );
  
  console.log('🔍 Backend returned period:', advancedSnapshot.period);
}, [businessId, dateRange]);
```

**Check:**
- Frontend showing "Last 30 Days" but backend using "This Month"?
- Date range state vs display mismatch?

---

### Step 6: Verify Business ID Context

```javascript
// In DomainDashboard.tsx
const { business } = useBusiness();

useEffect(() => {
  console.log('🔍 Business Context:', business);
  console.log('  ID:', business?.id);
  console.log('  Name:', business?.business_name);
  console.log('  Category:', business?.category);
}, [business]);
```

**Check:**
- Is the correct business loaded?
- Does business.id match URL params?
- Multi-tenant filtering working?

---

## 🐛 Most Likely Issues

Based on the symptom "orders not showing actual records", ranked by probability:

### 1. **Server Not Restarted** (90% likely)
**Symptom:** Backend code changed but server still running old code

**Fix:**
```bash
pm2 restart tenvo-app
# Or
docker-compose restart app
# Or
vercel --prod  # if on Vercel
```

### 2. **getDashboardMetricsAction !== getDashboardKPIs** (80% likely)
**Symptom:** DataContext calling wrong action

**Fix:** Find and update the correct action wrapper

```bash
# Search for getDashboardMetricsAction
grep -r "getDashboardMetricsAction" lib/actions/
```

### 3. **dashboardMetrics.orders Undefined** (70% likely)
**Symptom:** Backend returning old structure without `orders` object

**Fix:** Verify backend return structure matches our fix

### 4. **Cache Not Invalidated** (60% likely)
**Symptom:** Stale data in Redis or React Query cache

**Fix:**
```javascript
// In DataContext
const fetchData = useCallback(async () => {
  // Force fresh data
  const timestamp = Date.now();
  const data = await getDashboardKPIs(businessId, { 
    ...options,
    _cache_bust: timestamp 
  });
}, []);
```

### 5. **Date Range Mismatch** (40% likely)
**Symptom:** Backend querying different period than displayed

**Fix:** Log and compare frontend dateRange vs backend period

---

## 🔧 Immediate Action Plan

### Phase 1: Verify Deployment (5 minutes)

```bash
# 1. Restart server
pm2 restart tenvo-app

# 2. Check logs for errors
pm2 logs tenvo-app --lines 100

# 3. Test backend directly
curl http://localhost:3000/api/health
```

### Phase 2: Add Debug Logging (10 minutes)

1. Add console.logs to `lib/context/DataContext.js`
2. Add console.logs to `DomainDashboard.tsx`
3. Open browser console
4. Navigate to dashboard
5. Check what data is flowing through

### Phase 3: Find the Gap (15 minutes)

Follow the data from database to UI:

1. ✅ Database has records (verified by audit)
2. ❓ Backend action returns unified data
3. ❓ DataContext receives correct data
4. ❓ DomainDashboard gets correct props
5. ❓ UI displays correct value

Find where the data is lost or transformed incorrectly.

### Phase 4: Fix the Gap (20 minutes)

Once identified:
- If server not restarted → restart
- If wrong action called → update DataContext
- If props undefined → add null checks
- If cache stale → invalidate
- If date mismatch → align ranges

---

## 📋 Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER OPENS DASHBOARD                                         │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js Route: /business/[category]                         │
│ - Loads layout with BusinessContext                         │
│ - Wraps in DataProvider                                     │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ DataContext.fetchData()                                      │
│ - Calls getAdvancedDashboardSnapshotAction(businessId)     │
│ - Calls getDashboardMetricsAction(businessId)               │
│ - Calls getSalesPerformanceAction(businessId)               │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend Action: getDashboardKPIs()                          │
│ - Parse businessId and date range                           │
│ - Connect to PostgreSQL                                     │
│ - Execute unified SQL query (invoices + POS + storefront)  │
│ - Return structured response with orders.total               │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                          │
│ - Query invoices WHERE business_id AND date BETWEEN...     │
│ - Query pos_transactions WHERE business_id AND created_at...│
│ - Query storefront_orders WHERE business_id AND created_at..│
│ - Aggregate counts and sums                                 │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Response flows back up:                                      │
│ Database → Backend Action → DataContext → Component         │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ DomainDashboard.tsx                                          │
│ - Receives dashboardMetrics prop                            │
│ - Checks dashboardMetrics.orders.total                      │
│ - Falls back to client-side calc if undefined               │
│ - Renders MetricCard with value                             │
└───────────┬─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ USER SEES ORDER COUNT                                        │
│ - Should show unified count (invoices + POS + storefront)  │
│ - Currently showing: ??? (needs investigation)              │
└─────────────────────────────────────────────────────────────┘
```

**WHERE IS THE BREAK?**
We need to trace through each step with logging to find where the unified count is lost.

---

## 🎯 Next Steps

1. **IMMEDIATE**: Restart server to apply backend changes
2. **DEBUG**: Add console.logs at each layer
3. **TRACE**: Follow data flow from DB to UI
4. **FIX**: Patch the identified gap
5. **VERIFY**: Check orders display correctly
6. **DOCUMENT**: Update this document with findings

---

**Status:** Awaiting investigation results  
**Owner:** Development Team  
**Priority:** CRITICAL - Core functionality broken
