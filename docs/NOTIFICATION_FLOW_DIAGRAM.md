# Notification System - Complete Flow Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BUSINESS EVENTS                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. Storefront Order     4. Invoice Payment     7. Contact Message   │
│  2. POS Sale            5. Low Stock            8. Batch Expiry      │
│  3. POS Refund          6. Stock Transfer       9. Approvals         │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION HELPERS                            │
│                  (lib/notifications/notificationHelpers.js)          │
├─────────────────────────────────────────────────────────────────────┤
│  • notifyStorefrontOrder()      • notifyPaymentReceived()           │
│  • notifyPOSSale()              • notifyLowStock()                   │
│  • notifyStorefrontContact()    • notifyInvoiceOverdue()            │
│  • formatNotificationAmount()   [Regional currency formatting]       │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE INSERT                                │
│                     (notifications table)                            │
├─────────────────────────────────────────────────────────────────────┤
│  INSERT INTO notifications (                                         │
│    business_id,      -- Tenant isolation                            │
│    user_id,          -- Optional user targeting                     │
│    type,             -- order, payment, inventory, etc.             │
│    title,            -- "New Online Order"                          │
│    message,          -- "Order #123 from John • 3 items • PKR 1,250"│
│    action_url,       -- /business/domain?tab=orders&order=uuid      │
│    metadata,         -- { orderId, customerEmail, total }           │
│    priority,         -- low, medium, high, urgent                   │
│    is_read,          -- false                                       │
│    is_dismissed,     -- false                                       │
│    created_at        -- NOW()                                       │
│  ) RETURNING id;                                                     │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SSE POLLING MECHANISM                             │
│             (app/api/notifications/sse/route.js)                     │
├─────────────────────────────────────────────────────────────────────┤
│  Every 5 seconds:                                                    │
│                                                                      │
│  SELECT * FROM notifications                                         │
│  WHERE business_id = $1                                              │
│    AND is_dismissed = false                                          │
│    AND created_at > $lastCheck                                       │
│  ORDER BY created_at DESC;                                           │
│                                                                      │
│  If new rows found:                                                  │
│    Send SSE message: data: {"type":"notification","data":{...}}      │
│                                                                      │
│  Heartbeat: data: {"type":"heartbeat"}                               │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CLIENT-SIDE HOOK                               │
│                 (lib/hooks/useNotifications.js)                      │
├─────────────────────────────────────────────────────────────────────┤
│  const eventSource = new EventSource(                                │
│    `/api/notifications/sse?businessId=${business.id}`                │
│  );                                                                  │
│                                                                      │
│  eventSource.onmessage = (event) => {                                │
│    const data = JSON.parse(event.data);                              │
│    if (data.type === 'notification') {                               │
│      setNotifications(prev => [data.data, ...prev]);                 │
│      setUnreadCount(prev => prev + 1);                               │
│      playAudio('/sounds/notification.mp3');                          │
│    }                                                                 │
│  };                                                                  │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OPERATIONAL ALERTS HOOK                           │
│              (lib/hooks/useHubOperationalAlerts.js)                  │
├─────────────────────────────────────────────────────────────────────┤
│  Computed from DataContext (not persisted):                          │
│                                                                      │
│  • lowStock = products.filter(p => p.stock <= p.min_stock)          │
│  • outOfStock = products.filter(p => p.stock <= 0)                  │
│  • overdue = invoices.filter(i => i.due_date < now)                 │
│  • openPOs = purchaseOrders.filter(po => po.status = 'open')        │
│  • expiring = products.filter(p => expiry within 14 days)           │
│                                                                      │
│  Returns: { alerts[], alertCount }                                   │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION BELL UI                             │
│            (components/notifications/NotificationBell.jsx)           │
├─────────────────────────────────────────────────────────────────────┤
│  Combined Badge: unreadCount + alertCount                            │
│                                                                      │
│  ┌─────────────────────────────────────────┐                        │
│  │  🔔 Notifications        [Mark all read]│                        │
│  │  Your Business • Live                    │                        │
│  ├─────────────────────────────────────────┤                        │
│  │  Needs Attention (Computed)             │                        │
│  │  ⚠️ Low stock • 3 products below min    │                        │
│  │  📦 Out of stock • 2 products           │                        │
│  │  💰 Overdue invoices • 5 past due       │                        │
│  ├─────────────────────────────────────────┤                        │
│  │  Activity (Persisted)                   │                        │
│  │  🛒 New Online Order                    │                        │
│  │     Order #ORD-123 from John • PKR 1,250│                        │
│  │     5m ago                 [View →]  [X]│                        │
│  │                                          │                        │
│  │  💳 Payment Received                    │                        │
│  │     PKR 5,000 from ABC Corp via bank    │                        │
│  │     15m ago                [View →]  [X]│                        │
│  │                                          │                        │
│  │  📧 New Contact Message                 │                        │
│  │     John Doe • Product Inquiry          │                        │
│  │     1h ago                 [View →]  [X]│                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
│  Click alert → dispatchEvent('switch-tab', { tab: 'inventory' })    │
│  Click notification → router.push(action_url) & markAsRead()        │
└─────────────────────────────────────────────────────────────────────┘
```

## Event Trigger → Notification Flow

### 1. Storefront Order Flow

```
Customer submits order
  ↓
POST /api/storefront/[domain]/orders
  ↓
Begin transaction
  ↓
Create order in storefront_orders
  ↓
Create order items
  ↓
Decrement stock
  ↓
Commit transaction
  ↓
notifyStorefrontOrder({
  businessId, business, orderId, orderNumber,
  customerName, customerEmail, totalAmount, itemCount
})
  ↓
INSERT INTO notifications (
  business_id, type: 'storefront_order',
  title: 'New Online Order',
  message: 'Order #ORD-123 from John • 3 items • PKR 1,250',
  action_url: '/business/domain?tab=orders&order=uuid',
  priority: grandTotal > 50000 ? 'high' : 'medium'
)
  ↓
SSE polls notifications table
  ↓
Client receives SSE message
  ↓
NotificationBell updates badge & list
  ↓
Audio plays (optional)
```

### 2. POS Sale Flow

```
Cashier completes sale
  ↓
POSService.createTransaction()
  ↓
Begin transaction
  ↓
Create pos_transactions record
  ↓
Create pos_transaction_items
  ↓
Deduct stock via InventoryService.removeStock()
  ↓
Record payments in pos_payments
  ↓
Post to accounting (AccountingService)
  ↓
Commit transaction
  ↓
Fetch terminal & cashier info
  ↓
notifyPOSSale({
  businessId, business, transactionId, transactionNumber,
  totalAmount, itemCount, terminalName, cashierName
})
  ↓
INSERT INTO notifications (
  type: 'order', metadata: { source: 'pos' },
  title: 'POS Sale Completed',
  message: 'Terminal A • John Doe • 3 items • PKR 1,250',
  priority: 'low'
)
  ↓
SSE delivery → NotificationBell
```

### 3. Low Stock Flow (Real-time)

```
Stock movement (sale, adjustment, transfer)
  ↓
InventoryService.removeStock()
  ↓
Deduct from product_stock_locations
  ↓
Allocate from batches (FIFO)
  ↓
Update product_batches
  ↓
Sync to products.stock
  ↓
newStock = syncProductStock()
  ↓
Check: newStock <= min_stock?
  ↓ YES
Fetch business info
  ↓
notifyLowStock({
  businessId, business, productId, productName,
  currentStock: newStock, minStock
})
  ↓
INSERT INTO notifications (
  type: 'low_stock',
  title: 'Low Stock Alert',
  message: 'Product XYZ running low (5 units, min: 10)',
  priority: newStock === 0 ? 'urgent' : 'high'
)
  ↓
SSE delivery → NotificationBell
  ↓
User clicks → Navigate to inventory tab
```

### 4. Invoice Payment Flow

```
User records payment
  ↓
InvoicePaymentService.recordPayment()
  ↓
Begin transaction
  ↓
Validate invoice exists & not voided
  ↓
Check current balance
  ↓
INSERT INTO invoice_payments
  ↓
Update customer outstanding_balance
  ↓
Post to accounting (AccountingService)
  ↓
Update invoice payment_status & status
  ↓
Fetch business & customer info
  ↓
notifyPaymentReceived({
  businessId, business, invoiceId, invoiceNumber,
  customerName, amount, paymentMethod
})
  ↓
INSERT INTO notifications (
  type: 'payment',
  title: 'Payment Received',
  message: 'PKR 5,000 from ABC Corp for INV-001 via bank',
  priority: 'medium'
)
  ↓
Commit transaction
  ↓
SSE delivery → NotificationBell
```

### 5. Storefront Contact Flow

```
Customer submits contact form
  ↓
POST /api/storefront/[domain]/contact
  ↓
Validate form data
  ↓
Fetch business by domain
  ↓
INSERT INTO storefront_contact_messages RETURNING id
  ↓
notifyStorefrontContact({
  businessId, business, contactId,
  customerName, customerEmail, subject
})
  ↓
INSERT INTO notifications (
  type: 'storefront_contact',
  title: 'New Contact Message',
  message: 'John Doe (john@email.com) • Product Inquiry',
  action_url: '/business/domain?tab=domain-operations',
  priority: 'medium'
)
  ↓
Send email to business owner (via Resend)
  ↓
SSE delivery → NotificationBell
```

## Regional Formatting Flow

```
notifyStorefrontOrder({ totalAmount: 1250, business })
  ↓
formatNotificationAmount(1250, business)
  ↓
getBusinessRegionalPack(business)
  ↓
{
  country: 'Pakistan',
  currency: 'PKR',
  locale: 'en-PK',
  currencySymbol: 'Rs',
  taxIdLabel: 'NTN'
}
  ↓
new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR'
}).format(1250)
  ↓
Returns: "PKR 1,250" or "Rs 1,250"
  ↓
Used in notification message
```

## Priority Resolution Flow

```
Notification Event
  ↓
Determine Priority:
  │
  ├─ POS Sale → LOW (routine operation)
  │
  ├─ Storefront Order
  │   └─ amount > 50,000 → HIGH
  │   └─ amount ≤ 50,000 → MEDIUM
  │
  ├─ Invoice Payment → MEDIUM
  │
  ├─ Storefront Contact → MEDIUM
  │
  └─ Low Stock
      └─ currentStock === 0 → URGENT
      └─ currentStock > 0 → HIGH
  ↓
Store in notifications.priority
  ↓
UI renders badge color:
  • LOW → bg-neutral-100 text-neutral-600
  • MEDIUM → bg-brand-50 text-brand-primary
  • HIGH → bg-warning-light text-warning-dark
  • URGENT → bg-red-50 text-red-600
```

## Tenant Isolation Flow

```
Notification Creation
  ↓
createNotification({ businessId, ... })
  ↓
INSERT INTO notifications (business_id = $1, ...)
  ↓
SSE Stream Request
  ↓
GET /api/notifications/sse?businessId=uuid
  ↓
verifyBusinessAccess(session.user.id, businessId)
  ↓ Authorized
SELECT * FROM notifications
WHERE business_id = $businessId  -- Tenant filter
  AND is_dismissed = false
  AND created_at > $lastCheck
  ↓
Return only notifications for this business
  ↓
Client receives & displays
  ↓
User switches business
  ↓
Old SSE connection closed
  ↓
New SSE connection opened with new businessId
  ↓
Only new business notifications displayed
```

## Error Handling & Graceful Degradation

```
Notification Creation Fails
  ↓
try {
  await notifyStorefrontOrder({ ... });
} catch (notifyErr) {
  console.warn('[Context] notification skipped:', err);
  // Main operation continues
}
  ↓
Order still created successfully
  ↓
No user-facing error
  ↓
Notification just doesn't appear
```

```
SSE Connection Fails
  ↓
eventSource.onerror
  ↓
Retry with exponential backoff
  ↓
After 5 failed attempts
  ↓
Disable SSE (set session storage flag)
  ↓
Show amber indicator on NotificationBell
  ↓
Tooltip: "Live updates paused"
  ↓
Fallback to manual fetch on open
  ↓
System remains functional
```

```
Notifications Table Missing
  ↓
Query fails with P2021 or 42P01
  ↓
isMissingNotificationsTable(error) → true
  ↓
Send SSE error message:
  data: {"type":"error","fatal":true}
  ↓
Client displays error banner
  ↓
SSE connection closes
  ↓
System continues to function
  ↓
Core business operations unaffected
```

## Action URL Navigation Flow

```
User clicks notification
  ↓
handlePersistedClick(notification)
  ↓
if (!notification.is_read) {
  await markAsRead(notification.id)
}
  ↓
if (notification.action_url) {
  setIsOpen(false)  // Close bell
  router.push(notification.action_url)
}
  ↓
Hub Navigation
  ↓
Parse URL: /business/domain?tab=orders&order=uuid
  ↓
Switch to 'orders' tab
  ↓
Highlight order with id=uuid
  ↓
Open order detail modal (if applicable)
```

## Database Indexes & Query Performance

```
Notification Query
  ↓
SELECT * FROM notifications
WHERE business_id = $1      -- Use idx_notifications_business_id_is_read
  AND is_read = false       -- Use idx_notifications_business_id_is_read
  AND is_dismissed = false  -- Use idx_notifications_business_id_is_dismissed
ORDER BY created_at DESC    -- Use created_at sort
LIMIT 50;
  ↓
PostgreSQL Query Planner
  ↓
Choose best index:
  • [business_id, is_read] for unread queries
  • [business_id, is_dismissed] for active queries
  ↓
Index Scan (not Sequential Scan)
  ↓
Execution time: < 10ms (even with 10k+ rows)
  ↓
Result set: 50 notifications
  ↓
Return to client
```

## SSE Heartbeat & Connection Management

```
Client opens SSE connection
  ↓
Server: data: {"type":"connected"}
  ↓
Every 5 seconds:
  │
  ├─ Poll notifications table
  │   └─ New rows? → Send data: {"type":"notification"}
  │   └─ No rows? → Send data: {"type":"heartbeat"}
  │
  └─ Client receives message
      └─ Updates lastCheck timestamp
      └─ Connection stays alive
  ↓
Client closes tab
  ↓
request.signal.addEventListener('abort')
  ↓
Cleanup: clear interval, close controller
  ↓
Connection terminated gracefully
```

## Complete System Flow Summary

```
┌──────────────┐
│ Business     │
│ Event        │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Service Layer        │
│ (POS, Inventory,     │
│  Invoice, Storefront)│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ notificationHelpers  │
│ • Regional format    │
│ • Metadata builder   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Database INSERT      │
│ (business_id scoped) │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ SSE Polling          │
│ (5-second interval)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Client Hook          │
│ (useNotifications)   │
└──────┬───────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌────────────────┐
│ Operational  │  │ Persisted      │
│ Alerts       │  │ Notifications  │
│ (Computed)   │  │ (DB-backed)    │
└──────┬───────┘  └────────┬───────┘
       │                   │
       └─────────┬─────────┘
                 ▼
       ┌──────────────────┐
       │ NotificationBell │
       │ • Badge count    │
       │ • Priority sort  │
       │ • Action nav     │
       └──────────────────┘
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-30  
**Purpose**: System understanding and onboarding
