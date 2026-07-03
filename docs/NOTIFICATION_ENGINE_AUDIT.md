# Notification Engine Deep Dive & Gap Analysis

## Current Architecture

### 1. Database Schema (`notifications` table)
```sql
- id: UUID (PK)
- business_id: UUID (tenant isolation) ✅
- user_id: String (optional - can be business-wide) ✅
- title: String
- message: String
- type: String (order, payment, inventory, system)
- is_read: Boolean
- is_dismissed: Boolean
- action_url: String (deep link to hub) ✅
- metadata: JSON (extensible payload) ✅
- priority: String (low, medium, high, urgent)
- created_at: Timestamp
- read_at: Timestamp
```

**Indexes:**
- `[business_id, is_read]` ✅
- `[business_id, is_dismissed]` ✅

### 2. API Routes

#### `/api/notifications` (GET/PATCH/DELETE)
- **Tenant-aware**: ✅ Uses `businessId` param + `verifyBusinessAccess`
- **GET**: Fetch notifications with filters (unread, limit)
- **PATCH**: Mark as read (single or all)
- **DELETE**: Soft delete via `is_dismissed`
- **Auth**: Session-based with proper access verification ✅

#### `/api/notifications/sse` (SSE Stream)
- **Real-time**: Polls `notifications` table every 5s
- **Tenant-aware**: ✅ Filters by `businessId`
- **Graceful degradation**: Falls back to polling if table missing
- **Error handling**: Fatal vs retryable errors ✅

### 3. Frontend Components

#### `useNotifications` Hook
- Manages SSE connection per business
- Fetches initial notifications on mount
- Handles reconnection logic (max 5 attempts)
- Session storage flag for SSE disable
- Audio notification on new items ✅

#### `useHubOperationalAlerts` Hook
- **Computed alerts from DataContext** (not persisted notifications)
- Low stock alerts
- Out of stock alerts
- Overdue invoices
- Open purchase orders
- Expiring batches
- Pending approvals
- **Hub navigation via custom events** ✅

#### `NotificationBell` Component
- **Unified badge**: persisted notifications + operational alerts ✅
- Split sections: "Needs attention" (alerts) + "Activity" (notifications)
- Business context aware
- Action URL navigation
- Mark read/dismiss controls

### 4. Notification Service (`lib/services/notifications.js`)

**Current Implementation Issues:**
- ❌ Uses Supabase client (`createClient`) instead of `pool` or `prismaBase`
- ❌ Not actually integrated with the notification creation flows
- ❌ Functions exist but are never called

**Available but unused functions:**
- `sendApprovalRequest`
- `sendApprovalDecision`
- `sendTransferNotification`
- `sendBatchExpiryNotification`

## Critical Gaps Identified

### 🔴 GAP 1: No Storefront Order Notifications
**File**: `app/api/storefront/[businessDomain]/orders/route.js`

**Current behavior:**
- Order created successfully ✅
- Email sent to customer ✅
- Analytics recorded ✅
- **NO notification created for business owner/staff** ❌

**Impact**: Business owners don't get notified when orders arrive from their storefront.

**Missing logic:**
```javascript
// After order commit, before email
await client.query(
  `INSERT INTO notifications (
    business_id, type, title, message, 
    action_url, metadata, priority, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
  [
    business.id,
    'order',
    'New Order Received',
    `Order #${orderNumber} from ${customerName} (${currency} ${grandTotal})`,
    `/business/${business.domain}?tab=orders&order=${orderId}`,
    JSON.stringify({ orderId, orderNumber, customerEmail: customer.email, total: grandTotal }),
    grandTotal > 50000 ? 'high' : 'medium'
  ]
);
```

### 🔴 GAP 2: No Domain-Aware Notification Types
**Issue**: Notification types are hardcoded (`order`, `payment`, `inventory`, `system`)

**Domain-specific needs:**
- `vehicle-dealership`: test drive requests, trade-in inquiries
- `pharmacy`: prescription refill reminders
- `gym-fitness`: membership expiry, class bookings
- `restaurant`: table reservations, online orders

**Solution**: Extend notification types based on `businesses.category`

### 🔴 GAP 3: No User-Level Notification Routing
**Current**: `user_id` is optional, notifications are business-wide
**Problem**: Can't target specific roles (owner, manager, salesperson)

**Missing scenarios:**
- Low stock → Inventory Manager
- Overdue invoices → Finance Manager
- New orders → Sales team
- Approval requests → Admin/Owner only

**Solution**: Use `business_users.role` and `business_users.permissions` for routing

### 🔴 GAP 4: Notification Service Not Integrated
**File**: `lib/services/notifications.js`

**Problems:**
1. Uses Supabase (`createClient`) - inconsistent with codebase patterns
2. Functions defined but never called
3. No integration points with actual business operations

**Files that should create notifications but don't:**
- ❌ Storefront orders (as identified above)
- ❌ POS transactions (`app/api/pos/checkout/route.js`)
- ❌ Invoice creation/approval (`app/api/invoices/*`)
- ❌ Purchase order receipt (`app/api/purchases/*`)
- ❌ Stock transfers (`lib/services/InventoryService.js`)
- ❌ Low stock threshold breaches
- ❌ Payment received

### 🔴 GAP 5: No Batch/Scheduled Notifications
**Missing capabilities:**
- Daily digest of pending actions
- Weekly inventory summary
- Monthly revenue reports
- Expiry warnings (7 days, 3 days, 1 day)

**Solution**: Cron job at `/api/internal/notifications/dispatch` (similar to campaigns)

### 🔴 GAP 6: No Notification Preferences
**Current**: All notifications sent to all users
**Missing**: User preferences table for:
- Email vs in-app
- Notification categories to enable/disable
- Quiet hours
- Digest frequency

### 🟡 GAP 7: Limited Regional Awareness
**Issue**: Notification content uses hardcoded currency/locale

**Example**: `PKR 50,000` shown to UAE business (should be `AED 50,000`)

**Solution**: Use `getBusinessRegionalPack` for formatting:
```javascript
const { currency, locale, currencySymbol } = getBusinessRegionalPack(business);
const formattedAmount = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency
}).format(grandTotal);
```

### 🟡 GAP 8: No Notification Templates
**Current**: Message strings hardcoded in service functions
**Better**: Template system with variable interpolation

```javascript
const NOTIFICATION_TEMPLATES = {
  'order.new': {
    title: 'New Order Received',
    message: (vars) => `Order #${vars.orderNumber} from ${vars.customerName} (${vars.formattedTotal})`,
    priority: (vars) => vars.total > 50000 ? 'high' : 'medium'
  }
};
```

## Recommendations

### Phase 1: Critical Fixes (Immediate)
1. ✅ **Add storefront order notifications** - implement in POST handler
2. ✅ **Fix notification service DB adapter** - migrate from Supabase to `pool`
3. ✅ **Add POS checkout notifications** - similar to storefront orders
4. ✅ **Integrate approval workflow notifications** - wire existing functions

### Phase 2: Enhanced Features (Next Sprint)
5. ⚠️ **Domain-aware notification types** - extend type enum per vertical
6. ⚠️ **User role-based routing** - target by `business_users.role`
7. ⚠️ **Regional formatting** - use `getBusinessRegionalPack`
8. ⚠️ **Notification templates** - centralized message generation

### Phase 3: Advanced (Future)
9. 📅 **Batch/scheduled notifications** - cron job + digest
10. 📅 **User preferences** - opt-in/opt-out controls
11. 📅 **Multi-channel delivery** - SMS, WhatsApp, Push
12. 📅 **Notification analytics** - open rates, click-through

## Files to Modify

### Immediate (Phase 1):
- `app/api/storefront/[businessDomain]/orders/route.js` - add order notifications
- `app/api/pos/checkout/route.js` - add POS sale notifications
- `lib/services/notifications.js` - replace Supabase with pool
- `lib/actions/invoices/*.js` - wire approval notifications
- `lib/services/InventoryService.js` - add transfer/adjustment notifications

### Next Sprint (Phase 2):
- `lib/config/domainNotifications.js` - NEW: domain notification config
- `lib/utils/notificationRouter.js` - NEW: role-based routing logic
- `lib/utils/notificationFormatter.js` - NEW: regional formatting
- `lib/notifications/templates.js` - NEW: template registry

### Future (Phase 3):
- `app/api/internal/notifications/dispatch-scheduled/route.js` - NEW: cron handler
- `prisma/schema.prisma` - add `notification_preferences` model
- `lib/notifications/channels/*.js` - NEW: SMS, WhatsApp adapters
