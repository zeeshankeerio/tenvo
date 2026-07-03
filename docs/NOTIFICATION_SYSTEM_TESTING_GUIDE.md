# Notification System - Complete Testing Guide

## Overview

This guide documents all notification triggers implemented in the system and provides testing procedures for each.

## Notification Types Implemented

### 1. Storefront Order Notifications ✅
**File**: `app/api/storefront/[businessDomain]/orders/route.js`
**Trigger**: Customer places an order on the public storefront
**Function**: `notifyStorefrontOrder()`

**Test Procedure**:
1. Navigate to any public storefront (e.g., `http://localhost:3000/store/retail-shop`)
2. Add products to cart
3. Complete checkout with customer details
4. **Expected**: Notification appears in hub NotificationBell
   - Title: "New Online Order"
   - Message: "Order #[NUMBER] from [CUSTOMER] • [X] items • [CURRENCY AMOUNT]"
   - Action URL: Navigates to orders tab with order highlighted
   - Priority: HIGH if amount > 50,000, otherwise MEDIUM

**Database Verification**:
```sql
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
  AND type = 'storefront_order' 
ORDER BY created_at DESC LIMIT 5;
```

---

### 2. POS Sale Notifications ✅
**File**: `lib/services/POSService.js`
**Trigger**: Cashier completes a POS transaction
**Function**: `notifyPOSSale()`

**Test Procedure**:
1. Open POS interface (Hub → POS tab)
2. Open a shift/session
3. Add products to cart
4. Complete sale with payment
5. **Expected**: Notification appears in hub
   - Title: "POS Sale Completed"
   - Message: "[TERMINAL] • [CASHIER] • [X] items • [CURRENCY AMOUNT]"
   - Action URL: Navigates to POS tab with transaction
   - Priority: LOW (routine operation)

**Database Verification**:
```sql
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
  AND type = 'order' 
  AND metadata->>'source' = 'pos'
ORDER BY created_at DESC LIMIT 5;
```

---

### 3. Storefront Contact Notifications ✅
**File**: `app/api/storefront/[businessDomain]/contact/route.js`
**Trigger**: Customer submits contact form on storefront
**Function**: `notifyStorefrontContact()`

**Test Procedure**:
1. Navigate to storefront (e.g., `http://localhost:3000/store/retail-shop`)
2. Scroll to footer or find "Contact Us" link
3. Fill out contact form:
   - Name: John Doe
   - Email: john@test.com
   - Subject: Product Inquiry
   - Message: "I need information about..."
4. Submit form
5. **Expected**: Notification appears in hub
   - Title: "New Contact Message"
   - Message: "John Doe (john@test.com) • Product Inquiry"
   - Action URL: Navigates to Domain Operations tab
   - Priority: MEDIUM

**Database Verification**:
```sql
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
  AND type = 'storefront_contact' 
ORDER BY created_at DESC LIMIT 5;
```

---

### 4. Invoice Payment Notifications ✅
**File**: `lib/services/InvoicePaymentService.js`
**Trigger**: Payment recorded against an invoice
**Function**: `notifyPaymentReceived()`

**Test Procedure**:
1. Open Hub → Invoices tab
2. Find an unpaid invoice or create a new one
3. Click "Record Payment" action
4. Enter payment details:
   - Amount: Full or partial payment
   - Method: Cash / Card / Bank Transfer
   - Reference: Optional
5. Submit payment
6. **Expected**: Notification appears in hub
   - Title: "Payment Received"
   - Message: "[CURRENCY AMOUNT] from [CUSTOMER] for Invoice #[NUMBER] via [METHOD]"
   - Action URL: Navigates to invoices tab with invoice highlighted
   - Priority: MEDIUM

**Database Verification**:
```sql
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
  AND type = 'payment' 
ORDER BY created_at DESC LIMIT 5;
```

---

### 5. Low Stock Notifications ✅
**File**: `lib/services/InventoryService.js`
**Trigger**: Stock movement results in quantity ≤ reorder_point/min_stock
**Function**: `notifyLowStock()`

**Test Procedure**:
1. Open Hub → Inventory tab
2. Find a product or create one:
   - Set stock: 10 units
   - Set min_stock (reorder point): 5 units
3. Create a sale that brings stock to 5 or below:
   - Method A: Use POS to sell 6+ units
   - Method B: Manually adjust stock downward
   - Method C: Create invoice with 6+ units
4. **Expected**: Notification appears immediately
   - Title: "Low Stock Alert"
   - Message: "[PRODUCT] is running low ([X] units remaining, min: [Y])"
   - Action URL: Navigates to inventory tab with product highlighted
   - Priority: URGENT if stock = 0, otherwise HIGH

**Database Verification**:
```sql
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
  AND type = 'low_stock' 
ORDER BY created_at DESC LIMIT 5;
```

**Edge Cases to Test**:
- Product with stock = 0 (should be URGENT priority)
- Product with no min_stock set (defaults to 5)
- Multiple products hitting threshold simultaneously

---

## Operational Alerts (Computed, Not Persisted)

These are **not** stored in the database but computed on-demand from existing data via `useHubOperationalAlerts` hook.

### 6. Low Stock Alerts (Computed)
**Source**: `lib/hooks/useHubOperationalAlerts.js`
**Condition**: `product.stock <= product.min_stock`
**Display**: "Low stock • [X] products below minimum"

### 7. Out of Stock Alerts (Computed)
**Source**: `lib/hooks/useHubOperationalAlerts.js`
**Condition**: `product.stock <= 0`
**Display**: "Out of stock • [X] products need replenishment"

### 8. Overdue Invoices (Computed)
**Source**: `lib/hooks/useHubOperationalAlerts.js`
**Condition**: Invoice status = unpaid AND due_date < today
**Display**: "Overdue invoices • [X] invoices past due"

### 9. Open Purchase Orders (Computed)
**Source**: `lib/hooks/useHubOperationalAlerts.js`
**Condition**: PO status = pending/open/draft/ordered
**Display**: "Open purchase orders • [X] POs awaiting closure"

### 10. Expiring Batches (Computed)
**Source**: `lib/hooks/useHubOperationalAlerts.js`
**Condition**: Batch expiry_date within 14 days
**Display**: "Expiry risk • [X] batches expiring within 14 days"

---

## Multi-Tenant Isolation Testing

### Test Scenario: Cross-Tenant Notification Leak
**Purpose**: Verify notifications are properly isolated by business_id

**Procedure**:
1. Create two test businesses:
   - Business A: `retail-shop`
   - Business B: `demo-fitness`
2. Log in to Business A
3. Trigger a notification (e.g., place storefront order)
4. Switch to Business B
5. Open NotificationBell
6. **Expected**: Business A's notification should NOT appear
7. Trigger a notification for Business B
8. **Expected**: Only Business B's notification appears

**Database Verification**:
```sql
-- Should return 0 results
SELECT * FROM notifications 
WHERE business_id = 'BUSINESS_A_ID'
  AND id IN (
    SELECT id FROM notifications WHERE business_id = 'BUSINESS_B_ID'
  );
```

---

## Regional Formatting Testing

### Test Scenario: Multi-Currency Notifications
**Purpose**: Verify currency formatting respects business country/currency

**Procedure**:
1. Create businesses in different regions:
   - Pakistan business (PKR currency)
   - UAE business (AED currency)
   - US business (USD currency)
2. For each business:
   - Place a storefront order worth 1000 units
   - Record an invoice payment of 500 units
3. **Expected Notification Formats**:
   - Pakistan: "PKR 1,000" or "Rs 1,000"
   - UAE: "AED 1,000" or "AED 1,000"
   - US: "$1,000.00"

**Code Verification**:
```javascript
// In notificationHelpers.js
formatNotificationAmount(1000, pakistanBusiness) 
// → "PKR 1,000"

formatNotificationAmount(1000, uaeBusiness) 
// → "AED 1,000"

formatNotificationAmount(1000, usBusiness) 
// → "$1,000.00"
```

---

## SSE Real-Time Delivery Testing

### Test Scenario: Real-Time Notification Delivery
**Purpose**: Verify notifications appear without page refresh

**Procedure**:
1. Open hub in Browser A (e.g., Chrome)
2. Open NotificationBell (keep it open)
3. In Browser B (e.g., Firefox), trigger a notification:
   - Place storefront order
   - Or use API directly:
   ```bash
   curl -X POST http://localhost:3000/api/storefront/retail-shop/orders \
     -H "Content-Type: application/json" \
     -d '{ ... order payload ... }'
   ```
4. **Expected**: Within 5 seconds, notification appears in Browser A's NotificationBell
5. **Expected**: Badge count increments automatically
6. **Expected**: Optional audio notification plays

**Debug SSE Connection**:
Open browser DevTools → Network → Filter by `sse`
- Should see connection to `/api/notifications/sse?businessId=...`
- Status: 200
- Type: `text/event-stream`
- Messages: `data: {"type":"heartbeat"}` every 5 seconds

---

## Priority & Badge Color Testing

### Test Scenario: Notification Priority Levels
**Purpose**: Verify priority affects UI rendering

| Priority | Trigger | Badge Color | Expected |
|----------|---------|-------------|----------|
| LOW | POS sale | Gray | Routine operation |
| MEDIUM | Storefront order < 50k, Payment, Contact | Blue | Standard business event |
| HIGH | Low stock (stock > 0), Order > 50k | Orange | Needs attention |
| URGENT | Out of stock (stock = 0) | Red | Critical action required |

**Test Procedure**:
1. Trigger notifications of each priority
2. Open NotificationBell
3. Verify icon background color matches priority
4. Verify sorting (URGENT → HIGH → MEDIUM → LOW)

---

## Action URL Navigation Testing

### Test Scenario: Deep Link Navigation
**Purpose**: Verify clicking notification navigates to correct hub tab

**Test Matrix**:

| Notification Type | Action URL Pattern | Expected Tab |
|-------------------|-------------------|--------------|
| Storefront Order | `/business/[domain]?tab=orders&order=[id]` | Orders tab, order detail modal |
| POS Sale | `/business/[domain]?tab=pos&transaction=[id]` | POS tab, transaction view |
| Invoice Payment | `/business/[domain]?tab=invoices&invoice=[id]` | Invoices tab, invoice detail |
| Low Stock | `/business/[domain]?tab=inventory&product=[id]` | Inventory tab, product row |
| Contact Message | `/business/[domain]?tab=domain-operations` | Domain Operations tab |

**Procedure**:
1. Trigger each notification type
2. Click notification in NotificationBell
3. **Expected**: 
   - NotificationBell closes
   - Hub navigates to correct tab
   - Relevant entity is highlighted/selected
   - Notification marked as read

---

## Performance & Load Testing

### Test Scenario: High-Volume Notification Handling
**Purpose**: Verify system handles many notifications gracefully

**Procedure**:
1. Create 100+ notifications via script:
```javascript
// Run in browser console or Node script
for (let i = 0; i < 100; i++) {
  await fetch('/api/storefront/retail-shop/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* order payload */ })
  });
}
```
2. Open NotificationBell
3. **Expected**:
   - UI remains responsive
   - Scrolling is smooth
   - SSE connection stays alive
   - Only 50 notifications loaded (per limit)
   - Older notifications accessible via pagination (future feature)

---

## Error Handling & Graceful Degradation

### Test Scenario: Notification Table Missing
**Purpose**: Verify system doesn't crash if table unavailable

**Procedure**:
1. Temporarily rename notifications table:
```sql
ALTER TABLE notifications RENAME TO notifications_backup;
```
2. Trigger a notification (e.g., place order)
3. **Expected**:
   - Order still completes successfully
   - Console shows warning: `[Notifications SSE] Notifications table is not available`
   - NotificationBell shows error message
   - SSE connection closes gracefully (fatal error)
   - System continues to function normally

4. Restore table:
```sql
ALTER TABLE notifications_backup RENAME TO notifications;
```

### Test Scenario: SSE Connection Failure
**Purpose**: Verify fallback to polling mode

**Procedure**:
1. Block SSE endpoint via browser DevTools (Network → Block request URL)
2. Open NotificationBell
3. **Expected**:
   - After 5 reconnection attempts, SSE disabled
   - Amber indicator appears on NotificationBell icon
   - Tooltip: "Live updates paused, showing saved notifications"
   - Manual refresh button available
   - Notifications still accessible via REST API

---

## Database Indexes Performance Testing

### Test Scenario: Query Performance Under Load
**Purpose**: Verify indexed queries remain fast with large dataset

**Setup**:
```sql
-- Insert 10,000 test notifications
INSERT INTO notifications (business_id, type, title, message, created_at)
SELECT 
  'YOUR_BUSINESS_ID'::uuid,
  (ARRAY['order', 'payment', 'inventory', 'system'])[floor(random() * 4 + 1)],
  'Test notification ' || generate_series,
  'Test message',
  NOW() - (generate_series || ' minutes')::interval
FROM generate_series(1, 10000);
```

**Test Queries**:
```sql
-- Should use idx_notifications_business_id_is_read
EXPLAIN ANALYZE
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
  AND is_read = false 
  AND is_dismissed = false
ORDER BY created_at DESC 
LIMIT 50;

-- Expected: Index Scan, execution time < 10ms
```

---

## Cleanup & Maintenance

### Archive Old Notifications (Future Feature)
```sql
-- Move notifications older than 90 days to archive
INSERT INTO notifications_archive 
SELECT * FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitor Notification Volume
```sql
-- Notifications per business (last 30 days)
SELECT 
  b.business_name,
  COUNT(*) as notification_count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notifications n
JOIN businesses b ON b.id = n.business_id
WHERE n.created_at > NOW() - INTERVAL '30 days'
GROUP BY b.business_name
ORDER BY notification_count DESC;
```

---

## Known Limitations & Future Enhancements

### Current Limitations:
1. No user-level notification routing (all notifications are business-wide)
2. No notification preferences UI (can't opt-out of specific types)
3. No batch/scheduled notifications (e.g., daily digest)
4. No multi-channel delivery (SMS, WhatsApp, email)
5. No notification templates (messages hardcoded in helpers)
6. No notification analytics (open rates, click-through)

### Planned Enhancements:
- [ ] Phase 2: User role-based routing
- [ ] Phase 2: Notification preferences UI
- [ ] Phase 2: Batch notification scheduler
- [ ] Phase 3: Multi-channel delivery
- [ ] Phase 3: Template system
- [ ] Phase 3: Analytics dashboard

---

## Troubleshooting Common Issues

### Issue: Notifications Not Appearing
**Diagnosis**:
1. Check browser console for errors
2. Verify SSE connection: DevTools → Network → `sse` filter
3. Check database:
```sql
SELECT * FROM notifications 
WHERE business_id = 'YOUR_BUSINESS_ID' 
ORDER BY created_at DESC LIMIT 10;
```
4. Verify user has access to business (business_users table)

### Issue: Duplicate Notifications
**Diagnosis**:
1. Check for multiple SSE connections (should be 1 per tab)
2. Verify notification creation isn't called multiple times in code
3. Check for transaction rollback issues

### Issue: Incorrect Currency Format
**Diagnosis**:
1. Verify business country/currency settings
2. Check `getBusinessRegionalPack()` output
3. Test `formatNotificationAmount()` directly

### Issue: Action URLs Not Working
**Diagnosis**:
1. Verify business domain in database
2. Check URL format in notification metadata
3. Verify hub routing handles query parameters correctly

---

## Success Criteria Checklist

- [ ] All 5 notification types trigger correctly
- [ ] Notifications appear in real-time (< 5 seconds)
- [ ] Multi-tenant isolation verified (no cross-business leaks)
- [ ] Regional formatting works for PKR, AED, USD
- [ ] Action URLs navigate to correct hub tabs
- [ ] Priority levels affect UI correctly
- [ ] SSE connection stable with fallback
- [ ] Database queries remain fast (< 10ms)
- [ ] System gracefully handles missing table
- [ ] NotificationBell badge count accurate
- [ ] Operational alerts (computed) display correctly
- [ ] Click to mark as read works
- [ ] Dismiss notification works
- [ ] Mark all as read works
- [ ] No console errors in production mode

---

## Deployment Checklist

Before deploying to production:

1. **Database Migration**:
```bash
# Verify notifications table exists
psql -d your_db -c "\d notifications"

# If missing, run migration
bun run db:migrate
```

2. **Environment Variables**:
```env
# No new env vars required for notifications
# But verify these are set:
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

3. **Test in Staging**:
- [ ] Run full test suite above
- [ ] Verify with multiple businesses
- [ ] Load test with 1000+ notifications
- [ ] Monitor for memory leaks (leave SSE open for 1+ hour)

4. **Monitor After Deployment**:
```sql
-- Monitor notification creation rate
SELECT 
  date_trunc('hour', created_at) as hour,
  type,
  COUNT(*) as count
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, type
ORDER BY hour DESC, count DESC;
```

5. **Rollback Plan**:
If issues occur, notifications are non-critical:
- System continues to function without them
- Can disable SSE by setting session storage flag
- Can drop notifications table without affecting core business logic

---

## Contact & Support

For issues or questions about the notification system:
1. Check this testing guide first
2. Review `NOTIFICATION_SYSTEM_COMPLETE_AUDIT.md` for architecture details
3. Check code comments in:
   - `lib/notifications/notificationHelpers.js`
   - `lib/hooks/useNotifications.js`
   - `components/notifications/NotificationBell.jsx`
4. Review database schema in `prisma/schema.prisma`

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-30  
**Next Review**: After Phase 2 implementation
