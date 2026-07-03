# Storefront Order Flow - Quick Reference

## 🚀 Quick Start

### Place a Test Order
```bash
# 1. Start dev server
npm run dev

# 2. Visit storefront
http://localhost:3000/store/{your-domain}

# 3. Add products → Checkout → Submit
```

### Verify Integration
```bash
# Run verification
node scripts/verify-storefront-order-files.js

# Expected: All ✅ checks pass
```

## 📊 Where Orders Appear

| Location | What You See | How to Access |
|----------|--------------|---------------|
| **Dashboard** | Pending orders count, Revenue total | `/business/{domain}` |
| **Notifications** | "New Online Order" alert | Bell icon (header) |
| **Orders Tab** | Full order list & details | Hub → Orders tab |
| **Reminders** | "Pending Orders" with count | Dashboard portlet |

## 🔄 Order Flow Diagram

```
Customer Places Order
         ↓
POST /api/storefront/[domain]/orders
         ↓
┌────────────────────────────────┐
│ 1. Validate & Price (server)  │
│ 2. Create in storefront_orders │
│ 3. Decrement stock             │
│ 4. Create notification         │
│ 5. Send email confirmation     │
└────────────────────────────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
Dashboard   Bell Icon
 Updates    Shows Badge
    ↓         ↓
Pending+1   Click→Details
Revenue+X
```

## 🎯 Key Files Modified

```
lib/actions/premium/ai/analytics.js
├─ getDashboardMetricsAction
│  ├─ Orders count (invoices + storefront)
│  ├─ Revenue (GL + storefront paid)
│  └─ Customers (invoices + storefront emails)
│
app/api/storefront/[businessDomain]/orders/route.js
├─ POST - Create order
│  ├─ Server-side pricing
│  ├─ Stock validation
│  ├─ notifyStorefrontOrder() ← Creates notification
│  └─ Email confirmation
│
lib/notifications/notificationHelpers.js
└─ notifyStorefrontOrder()
   ├─ Type: 'storefront_order'
   ├─ Priority: HIGH/MEDIUM
   └─ Action URL: /business/{domain}?tab=orders
```

## 💡 Common Tasks

### Check Order Count
```sql
SELECT COUNT(*) FROM storefront_orders 
WHERE business_id = '{id}' 
  AND status IN ('pending', 'processing');
```

### Find Recent Orders
```sql
SELECT order_number, customer_name, total_amount, status
FROM storefront_orders
WHERE business_id = '{id}'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Notifications
```sql
SELECT title, message, created_at, is_read
FROM notifications
WHERE business_id = '{id}' 
  AND type = 'storefront_order'
ORDER BY created_at DESC
LIMIT 5;
```

### Update Order Status
```javascript
await updateOrderStatus(orderId, businessId, 'processing', 'Order is being prepared');
```

## 🐛 Quick Debugging

### Order not in dashboard?
```javascript
// 1. Check order exists
const order = await client.query(
  'SELECT * FROM storefront_orders WHERE id = $1',
  [orderId]
);

// 2. Check status (must not be cancelled)
console.log(order.status); // Should be 'pending', 'processing', etc.

// 3. Refresh dashboard
window.location.reload();
```

### Notification missing?
```javascript
// 1. Check notification created
const notif = await client.query(
  'SELECT * FROM notifications WHERE business_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
  [businessId, 'storefront_order']
);

// 2. If missing, check server logs
// Look for: "[Create Order] notification skipped"

// 3. Manually create (if needed)
await notifyStorefrontOrder({
  businessId,
  business,
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  totalAmount,
  itemCount
});
```

### Revenue not updated?
```javascript
// Only paid orders count
// Check payment_status
const order = await client.query(
  'SELECT payment_status FROM storefront_orders WHERE id = $1',
  [orderId]
);

// If pending, mark as paid
await updateOrderPaymentStatus(orderId, businessId, 'paid');
```

## 📱 API Endpoints

### Create Order (Checkout)
```http
POST /api/storefront/{domain}/orders

{
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+92 300 1234567"
  },
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "shippingAddress": {
    "address": "123 Main St",
    "city": "Karachi",
    "country": "Pakistan",
    "postalCode": "75500"
  },
  "paymentMethod": "cod"
}

→ 200 { success: true, order: { id, orderNumber, total, status } }
```

### Get Orders (Hub)
```javascript
const result = await getBusinessOrders(businessId, {
  status: 'pending', // optional
  startDate: '2026-01-01', // optional
  limit: 50,
  offset: 0
});
// → { success: true, orders: [...], total: N }
```

### Update Status
```javascript
const result = await updateOrderStatus(
  orderId,
  businessId,
  'processing', // new status
  'Order confirmed and being prepared' // notes
);
// → { success: true, orderId, status }
```

### Record Payment
```javascript
const result = await recordManualPayment(orderId, businessId, {
  amount: 5000,
  paymentMode: 'cash',
  referenceId: 'REC-001',
  notes: 'Cash on delivery',
  receivedAt: '2026-07-01',
  markFullyPaid: true
});
// → { success: true, message: '...' }
```

## 🎨 UI Components

### NotificationBell
```jsx
import { NotificationBell } from '@/components/notifications/NotificationBell';

<NotificationBell className="..." />
// Shows badge count, opens dropdown on click
```

### OrdersManager
```jsx
import { OrdersManager } from '@/components/orders/OrdersManager';

<OrdersManager business={business} category={category} />
// Full orders management interface
```

### RemindersPortlet
```tsx
import { RemindersPortlet } from '@/app/business/[category]/components/islands/portlets/RemindersPortlet.client';

<RemindersPortlet 
  data={{ pendingOrders: 5, lowStock: 3, overdueInvoices: 2 }}
  onItemClick={(tab) => router.push(`?tab=${tab}`)}
/>
```

## 🔑 Key Concepts

### Order Status Lifecycle
```
pending → processing → shipped → delivered ✅
   ↓
cancelled ❌
   ↓
refunded 💰
```

### Payment Status
```
pending (awaiting payment)
   ↓
paid ✅ (payment received)
   ↓
failed ❌ (payment declined)
   ↓
refunded 💰 (money returned)
```

### Notification Priority
```javascript
// HIGH: Orders > 50,000
priority: totalAmount > 50000 ? 'high' : 'medium'
```

## 📦 Data Models

### storefront_orders
```typescript
{
  id: number; // Serial PK
  business_id: UUID;
  order_number: string; // "ORD-2024-0001"
  customer_email: string;
  customer_name: string;
  total_amount: Decimal;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  metadata: {
    payment_method: 'cod' | 'card' | 'wallet';
    discounts?: { member_discount, promo_discount };
    status_history?: Array<{ status, notes, created_at }>;
  };
  created_at: Date;
}
```

### notifications
```typescript
{
  id: UUID;
  business_id: UUID;
  type: 'storefront_order' | 'payment' | 'inventory' | ...;
  title: string; // "New Online Order"
  message: string; // "Order #XXX from Customer..."
  action_url: string; // "/business/{domain}?tab=orders&order={id}"
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  is_dismissed: boolean;
  created_at: Date;
}
```

## 🎯 Testing Checklist

- [ ] Place order via storefront
- [ ] Dashboard pending count +1
- [ ] Bell icon badge appears
- [ ] Click notification → navigates to order
- [ ] Order visible in Orders tab
- [ ] Can view order details
- [ ] Can update order status
- [ ] Can record payment
- [ ] Revenue updates (after payment)

## 🆘 Emergency Fixes

### Orders missing from dashboard
```sql
-- Force refresh dashboard data
UPDATE business_settings 
SET updated_at = NOW() 
WHERE business_id = '{id}';
```

### Notifications not working
```sql
-- Check SSE connection (client-side)
console.log('SSE:', useNotifications().isConnected);

-- Manually trigger notification
INSERT INTO notifications (business_id, type, title, message, created_at)
VALUES ('{id}', 'storefront_order', 'Test Order', 'Test message', NOW());
```

### Stock not decremented
```sql
-- Check stock before/after
SELECT stock FROM products WHERE id = '{id}';

-- Manually adjust if needed
UPDATE products SET stock = stock - {qty} WHERE id = '{id}';
```

---

**Quick Links:**
- [Full Documentation](../STOREFRONT_ORDER_INTEGRATION_SUMMARY.md)
- [Technical Fixes](../STOREFRONT_ORDER_FLOW_FIXES.md)
- [API Routes](../app/api/storefront/)
