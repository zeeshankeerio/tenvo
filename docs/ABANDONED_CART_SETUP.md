# Abandoned Cart Recovery Setup

This guide explains how to configure abandoned cart recovery for clothing commerce and other domain packages that include this feature.

---

## Prerequisites

Abandoned cart recovery requires:
1. **Resend Email Service** configured
2. **Domain Package or Plan** with `abandoned_cart_recovery` feature enabled
3. **Public Storefront** active with checkout flow

---

## Configuration Steps

### 1. Set Up Resend API Key

Add your Resend API key to environment variables:

```bash
# .env.local or production environment
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Get your API key from: https://resend.com/api-keys

### 2. Configure Email Templates

Abandoned cart emails use templates in `lib/email/templates/abandonedCart.js`.

Default template includes:
- Cart items with images
- Total value
- Recovery link (24-hour expiry)
- Business branding (logo, colors)

**Customize for clothing/textile:**
- Show size/color variants
- Include "Limited Stock" urgency if applicable
- Add seasonal messaging (Eid sale, Wedding collection, etc.)

### 3. Enable Feature in Settings

**For Clothing Commerce Suite customers:**
- Feature is **pre-enabled** in domain package
- No additional configuration needed in hub

**For custom packaging:**
```javascript
// Platform admin only
await updateBusinessPackaging(businessId, {
  abandoned_cart_recovery: true
});
```

### 4. Configure Recovery Settings (Optional)

Default settings (works for most businesses):
- **Trigger Delay**: 1 hour after cart abandonment
- **Recovery Window**: 24 hours
- **Max Reminders**: 1 email per abandoned cart
- **Minimum Cart Value**: PKR 500 (configurable)

**Adjust for fashion retail:**
```javascript
// lib/storefront/abandonedCartConfig.js
export const FASHION_CART_RECOVERY_CONFIG = {
  triggerDelayMinutes: 60,        // 1 hour
  recoveryWindowHours: 24,        // 24 hours
  minCartValue: 1000,             // PKR 1000 for fashion
  urgencyThreshold: 3,            // "Only 3 left" if stock ≤ 3
  seasonalBoost: true,            // Add Eid/Wedding urgency
};
```

---

## How It Works

### Cart Tracking

1. **Cart Created**: When customer adds items and enters email
2. **Checkout Started**: Email captured at checkout step 1
3. **Abandoned**: No order completion within trigger window
4. **Recovery Sent**: Email dispatched with recovery link

### Recovery Link

Format: `https://yourdomain.com/store/{domain}/cart/recover?token=xxx`

- **Token expires**: 24 hours
- **Cart restored**: Original items, quantities, variants
- **Stock validated**: Out-of-stock items removed with notice

### Fashion-Specific Features

**Clothing Commerce Suite enhancements:**
- **Size/Color Display**: Shows selected variants in email
- **Seasonal Urgency**: "Eid sale ends soon" (if applicable)
- **Stock Alerts**: "Only 2 left in your size"
- **Collection Context**: "From our Bridal Collection"

---

## Testing

### 1. Test Cart Abandonment

```bash
# Start development server
npm run dev

# Visit storefront
http://localhost:3000/store/demo-boutique

# Add items to cart, proceed to checkout
# Enter email but don't complete order
# Wait 1 hour (or reduce delay in dev config)
```

### 2. Check Email Queue

```bash
# View Resend dashboard
https://resend.com/emails

# Or query database
SELECT * FROM abandoned_cart_emails 
WHERE business_id = 'xxx' 
ORDER BY created_at DESC;
```

### 3. Test Recovery Link

Click the link in the email - cart should restore with:
- Original items and quantities
- Selected variants (size/color)
- Stock validation (remove out-of-stock)
- Pricing at time of abandonment (or current, configurable)

---

## Monitoring

### Key Metrics

Track in Storefront Analytics (`StorefrontAnalyticsBeacon`):

```javascript
{
  abandoned_carts: 45,           // Total abandoned
  recovery_emails_sent: 45,      // Emails dispatched
  recovered_carts: 12,           // Completed after email
  recovery_rate: 26.7,           // 12/45 = 26.7%
  recovered_revenue: 185000      // PKR from recovered orders
}
```

### Fashion Retail Benchmarks

- **Good Recovery Rate**: 20-30%
- **Excellent Recovery Rate**: 30-40%
- **Peak Season**: 35-45% (Eid, Wedding)

**Improve recovery rate:**
- Add discount code for first-time abandoners
- Use urgency messaging during peak seasons
- Show customer reviews in recovery email
- Offer free shipping threshold reminder

---

## API Integration (Optional)

### Manual Recovery Trigger

```javascript
// POST /api/storefront/[domain]/cart/recover
import { triggerAbandonedCartRecovery } from '@/lib/storefront/abandonedCart';

const result = await triggerAbandonedCartRecovery({
  businessId,
  cartId,
  customerEmail,
  cartItems,
  totalValue,
});
```

### Webhook Events

Subscribe to recovery events:
- `cart.abandoned` - Cart abandoned (1 hour delay)
- `cart.recovery_sent` - Email dispatched
- `cart.recovered` - Order completed via recovery link

---

## Troubleshooting

### Email Not Sending

**Check:**
1. `RESEND_API_KEY` is set in environment
2. Resend domain is verified (if using custom domain)
3. Email template is valid (test in Resend UI)
4. Customer email is valid and not bounced

**Debug:**
```bash
# Check logs
grep "Abandoned cart email" logs/app.log

# Test Resend directly
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_xxxxx' \
  -H 'Content-Type: application/json' \
  -d '{"from":"noreply@yourdomain.com","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

### Recovery Link Broken

**Common issues:**
- Token expired (>24 hours)
- Cart items deleted from inventory
- Business storefront disabled
- Domain changed after cart creation

**Fix:**
- Increase `recoveryWindowHours` for longer window
- Handle out-of-stock gracefully in recovery flow
- Log token validation errors

### Low Recovery Rate

**Optimize:**
- **Reduce delay**: Try 30 minutes instead of 1 hour
- **Add discount**: 10% off for recovering cart
- **Urgency**: "Sale ends tonight" during promotions
- **Social proof**: "12 customers bought this today"
- **Free shipping**: "Add PKR 500 more for free delivery"

---

## Production Checklist

Before going live with abandoned cart recovery:

- [ ] Resend API key configured in production environment
- [ ] Email sender domain verified in Resend
- [ ] Email templates tested with real cart data
- [ ] Recovery links tested end-to-end
- [ ] Monitoring dashboard shows recovery metrics
- [ ] Customer service team trained on recovery flow
- [ ] Privacy policy mentions abandoned cart emails
- [ ] Unsubscribe link functional in email footer

---

## Clothing Commerce Suite Notes

**Pre-configured features:**
- Fashion-optimized email templates
- Size/color variant display
- Seasonal urgency messaging (Eid, Wedding)
- Stock alerts for fast-moving items
- Collection context ("Bridal", "Summer Lawn")

**Advanced features (roadmap):**
- Multi-email sequence (1hr, 24hr, 3 days)
- Dynamic discount codes
- SMS recovery (via JazzCash/Easypaisa)
- WhatsApp recovery messages
- AI-powered send time optimization

---

## Related Documentation

- `docs/MARKET_READINESS.md` - Launch checklist
- `docs/STOREFRONT_MOBILE_NAV.md` - Mobile cart UX
- `lib/storefront/storefrontCart.js` - Cart implementation
- `lib/email/templates/abandonedCart.js` - Email template

---

**Need Help?**

Contact platform support with:
- Business ID
- Example abandoned cart ID
- Resend email logs
- Expected vs actual behavior

