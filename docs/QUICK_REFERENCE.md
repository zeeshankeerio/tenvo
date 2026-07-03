# 🚀 Quick Reference Card - Tenvo ERP Team Management & Textile Storefront

## 📦 Features Implemented

### 1. Textile/Clothing Storefront ✅
- Customer receipt download (58mm thermal PDF)
- Complete order tracking
- Domain-specific filtering
- Mobile-responsive design

### 2. Team Management System ✅  
- Email invitations (new + existing users)
- Password reset (admin+)
- Email management (owner only)
- Role-based access control (9 roles)
- Pending invitations tracking

---

## 🔧 Quick Setup

### Environment Variables
```bash
# Required for Team Management
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM=notifications@yourdomain.com

# Already configured (verify)
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
```

### Installation
```bash
# No new dependencies needed
# All features use existing packages

# Verify setup
node scripts/verify-team-management.mjs
node scripts/verify-textile-storefront.mjs
```

---

## 📁 Key Files

### Team Management
```
app/accept-invitation/page.jsx          # Invitation acceptance
components/TeamManagementPanel.jsx      # Enhanced team UI
lib/actions/admin/teamManagement.js     # Password/email actions
lib/email/templates/TeamInvitationEmail.jsx # Email template
docs/TEAM_MANAGEMENT_GUIDE.md           # Complete guide
```

### Textile Storefront
```
lib/storefront/storefrontReceiptDownload.js  # Receipt generation
app/store/[domain]/checkout/page.jsx         # Checkout with download
docs/TEXTILE_STOREFRONT_IMPLEMENTATION_GUIDE.md # Setup guide
```

---

## 🎯 Common Tasks

### Invite a Team Member
```javascript
// Automatic - call from UI
await businessAPI.addMember(businessId, email, role);

// Result:
// - Existing user → Added immediately
// - New user → Invitation email sent
```

### Download Customer Receipt
```javascript
// Automatic - triggered on order success page
// Customer clicks "Download Receipt" button
// → 58mm thermal PDF generated
```

### Change User Role
```javascript
// From Settings → Team → Active Members
// Select new role from dropdown
await businessAPI.updateUserRole(userId, businessId, newRole);
```

### Reset Password
```javascript
// Admin/Owner only
await resetTeamMemberPassword({
  businessId,
  targetUserId,
  newPassword
});
// → Password reset email sent
```

### Check Permissions
```javascript
import { hasPermission } from '@/lib/rbac/permissions';

if (hasPermission(userRole, 'settings.manage_users')) {
  // User can manage team
}
```

---

## 🔐 Role Hierarchy

```
9. OWNER        → Full control
8. ADMIN        → Team management
7. MANAGER      → Operations
6. ACCOUNTANT   → Finance
5. WAREHOUSE_MGR→ Inventory
4. CASHIER      → POS
3. SALESPERSON  → Sales
2. WAITER       → Orders
1. VIEWER       → Read-only
```

---

## 🎨 UI Integration

### Add Team Management to Settings

```javascript
// In SettingsManager.jsx
import { TeamManagementPanel } from '@/components/TeamManagementPanel';

<TabsContent value="team">
  <TeamManagementPanel
    businessId={business?.id}
    canManageUsers={canManageUsers}
    canManageBilling={canManageBilling}
    role={normalizedRole}
  />
</TabsContent>
```

### Receipt Download (Already Integrated)

```javascript
// In checkout success page
<Button onClick={() => downloadStorefrontOrderReceipt(order, business)}>
  Download Receipt
</Button>
```

---

## 🧪 Testing

### Verify Implementation
```bash
# Team Management (28 checks)
node scripts/verify-team-management.mjs
# Expected: ✅ 28/28 passed

# Textile Storefront
node scripts/verify-textile-storefront.mjs
# Expected: ✅ All checks passed
```

### Manual Test Flow

**Team Invitation:**
1. Settings → Team
2. Enter email + role
3. Click "Invite Member"
4. Check email delivered
5. Accept invitation (incognito)
6. Verify member in active list

**Receipt Download:**
1. Place test order
2. Complete checkout
3. Click "Download Receipt"
4. Verify PDF downloads
5. Check receipt formatting

---

## 📊 Monitoring

### Key Metrics to Watch

**Email Delivery:**
- Dashboard: https://resend.com/emails
- Target: > 99% delivery rate

**Team Growth:**
- Query: `SELECT COUNT(*) FROM business_users WHERE status = 'active'`
- Track: Daily active team members

**Invitation Success:**
- Query: `SELECT COUNT(*) FROM user_invitations WHERE status = 'accepted'`
- Target: > 70% acceptance rate

**Receipt Downloads:**
- Event: Track "receipt_downloaded" in analytics
- Target: > 60% of orders

---

## 🐛 Troubleshooting

### Issue: Invitation email not received
```bash
# Check Resend API key
echo $RESEND_API_KEY

# Verify sender domain
# Go to https://resend.com/domains

# Resend from pending invitations tab
```

### Issue: "Permission denied" error
```javascript
// Check user role
console.log(role);

// Verify permission
import { hasPermission } from '@/lib/rbac/permissions';
console.log(hasPermission(role, 'settings.manage_users'));

// Expected: true for owner/admin
```

### Issue: Receipt not downloading
```javascript
// Check browser console for errors
// Verify order has line_items
// Check PDF generation in storefrontReceiptDownload.js
```

---

## 📖 Documentation

**Quick Guides:**
- `docs/TEAM_MANAGEMENT_GUIDE.md` - Complete user guide
- `docs/TEXTILE_STOREFRONT_IMPLEMENTATION_GUIDE.md` - Storefront setup
- `QUICK_REFERENCE.md` - This file

**Technical:**
- `TEAM_MANAGEMENT_IMPLEMENTATION_SUMMARY.md` - Technical details
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full overview

**Deployment:**
- `DEPLOYMENT_CHECKLIST_TEAM_MANAGEMENT.md` - Launch checklist
- `DEPLOYMENT_CHECKLIST.md` - Storefront launch

---

## 🚀 Deployment Commands

### Staging
```bash
git checkout main
git merge feature/team-management
git push origin main
vercel --prod --scope=staging
```

### Production
```bash
git tag -a v1.0.0 -m "Team Management & Storefront"
git push origin v1.0.0
vercel --prod --scope=production

# Monitor
vercel logs --follow
```

### Rollback (if needed)
```bash
vercel rollback
```

---

## 📞 Quick Links

- **Resend Dashboard:** https://resend.com/emails
- **Docs Folder:** `docs/`
- **Verification Scripts:** `scripts/verify-*.mjs`
- **Support:** support@tenvo.app
- **Engineering:** engineering@tenvo.app

---

## ✅ Pre-Launch Checklist

```bash
# 1. Verify code
node scripts/verify-team-management.mjs
node scripts/verify-textile-storefront.mjs

# 2. Check environment
echo $RESEND_API_KEY
echo $RESEND_FROM

# 3. Test invitation
# - Send test invitation
# - Accept in incognito
# - Verify email delivered

# 4. Test receipt
# - Place test order
# - Download receipt
# - Verify formatting

# 5. Deploy to staging
vercel --prod --scope=staging

# 6. Smoke test staging
# - Test full invitation flow
# - Test receipt download
# - Check for errors

# 7. Deploy to production
vercel --prod --scope=production

# 8. Monitor for 1 hour
vercel logs --follow
```

---

## 🎯 Success Criteria

✅ Email delivery rate > 99%
✅ Invitation acceptance > 70%
✅ Receipt downloads > 60%
✅ No critical errors
✅ Page load < 2s
✅ Support tickets normal

---

## 💡 Pro Tips

1. **Always test in incognito** when accepting invitations
2. **Check spam folder** if email not received
3. **Use staging first** before production
4. **Monitor logs** after deployment
5. **Keep documentation updated** as features evolve

---

## 🎉 You're Ready!

Everything is implemented, tested, and documented. 

**Status:** ✅ PRODUCTION READY

Deploy with confidence! 🚀

---

**Version:** 1.0.0  
**Last Updated:** June 30, 2026  
**Implementation:** Complete ✅
