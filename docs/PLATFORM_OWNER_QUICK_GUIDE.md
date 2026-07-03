# Platform Owner Quick Guide

## 🚀 Getting Started

### 1. Configure Platform Owner
```env
# .env or .env.local
PLATFORM_OWNER_EMAILS=owner@tenvo.com,admin@tenvo.com
```

Multiple owners supported (comma-separated). Case-insensitive.

### 2. Login
Use any configured email to login. You'll be automatically recognized as platform owner.

### 3. Access Admin Panel
- **Sidebar:** Click "Platform Admin" in SYSTEM section (bottom)
- **Direct:** Navigate to `/admin`

## 👑 Platform Owner Powers

### Automatic Benefits:
- ✅ **Enterprise access** - Full feature access
- ✅ **All businesses** - Can view and manage any business
- ✅ **No restrictions** - Bypasses all guards and limits
- ✅ **Special badge** - Crown icon in user menu
- ✅ **Admin panel** - Full platform administration

### What You See:
```
┌─ User Badge ─────────────────┐
│ 👑 [Crown Icon]              │  ← Gold gradient background
│ Your Name                    │
│ Platform Owner               │  ← Instead of plan tier
└──────────────────────────────┘

┌─ Sidebar ────────────────────┐
│ ...                          │
│ SYSTEM                       │
│  ⚙️  Settings                │
│  🛡️  Platform Admin          │  ← Only visible to you
└──────────────────────────────┘
```

## 🎛️ Admin Panel Features

### Overview Tab
- **Total businesses** - Count and growth
- **Total users** - Platform-wide users
- **Plan distribution** - Free vs paid breakdown
- **Trial statistics** - Active and expired

### Registrations Tab (`/admin/registrations`)
- **Pending approvals** - New business signups
- **Approve/reject** - Control who can register
- **Email notifications** - Auto-sent on approval

### Businesses Tab
- **Search** - Find by name, email, domain
- **View details** - Full business profile
- **Change plan** - Update subscription tier
- **Extend trial** - Add 14 more days
- **Module control** - Enable/disable features
- **Limit overrides** - Custom quotas

### Users Tab
- **All platform users** - Complete list
- **Change roles** - Assign business roles
- **Deactivate** - Remove access
- **Promote admin** - Give platform admin role

### Subscriptions Tab
- **Manual payments** - Record offline payments
- **Approve requests** - Owner payment submissions
- **Extend access** - Grant additional time
- **Payment history** - View all transactions

### Feature Flags Tab
- **Platform flags** - Global feature toggles
- **Business overrides** - Per-tenant control
- **Rollout control** - Gradual feature releases

## 🔧 Common Tasks

### Approve New Business
```
1. Click "Platform Admin" in sidebar
2. Go to "Registrations" tab (or visit /admin/registrations)
3. Review pending business
4. Click "Approve" or "Reject"
5. Email sent automatically
```

### Change Business Plan
```
1. Admin Panel → Businesses tab
2. Search for business
3. Click "Plan" button
4. Select new tier (free/starter/professional/business/enterprise)
5. Saves immediately
```

### Extend Trial
```
1. Admin Panel → Businesses tab
2. Find business with trial
3. Click "+14 days" button
4. Trial extended automatically
```

### Record Manual Payment
```
1. Admin Panel → Businesses tab
2. Click "Details" on business
3. Scroll to "Manual Payment" section
4. Fill in:
   - Plan tier or domain package
   - Days to extend (default 30)
   - Amount (optional)
   - Reference (invoice number, etc.)
   - Notes
5. Click "Record Payment"
```

### Approve Owner Payment Request
```
1. Business owner submits payment via Settings → Billing
2. Admin Panel → Businesses tab
3. Click "Details" on business
4. See "Pending Owner Payment" section
5. Click "Approve" or "Reject"
6. If approved, extends access automatically
```

### Enable Custom Features
```
1. Admin Panel → Businesses tab
2. Click "Details" on business
3. Find "Module Packaging" section
4. Switch mode to "Custom"
5. Toggle individual features
6. Click "Save Packaging"
```

### Override Plan Limits
```
1. Admin Panel → Businesses tab
2. Click "Details" on business
3. Find "Plan Limits Override" section
4. Enter custom values:
   - Max users
   - Max products
   - Max warehouses
   - Max invoices/month
   - etc.
5. Leave blank to use plan default
6. Click "Save Limits"
```

### Change User Role
```
1. Admin Panel → Users tab
2. Find user
3. Select business context
4. Choose new role from dropdown
5. Saves automatically
```

### Promote to Platform Admin
```
1. Admin Panel → Users tab
2. Find user
3. Click "Promote to Admin"
4. User gets platform-level access (not owner)
```

## 🔍 Search & Filter

### Business Search
```
Search by:
- Business name: "Tenvo Retail"
- Owner email: "owner@example.com"
- Domain: "tenvo-retail"
- Any partial match
```

### User Search
```
Search by:
- Name
- Email
- Business name
- Role
```

## 📊 Understanding Stats

### Plan Distribution
```
Free: XX businesses (XX%)
  ├─ X trials active
  └─ X trials expired
  
Starter: XX businesses (XX%)
Professional: XX businesses (XX%)
Business: XX businesses (XX%)
Enterprise: XX businesses (XX%)
```

### Business Health Indicators
- 🟢 **Green** - Active, healthy
- 🟡 **Yellow** - Trial active
- 🔴 **Red** - Trial expired
- ⚫ **Gray** - No activity

## 🛡️ Security Notes

### What You Can Do:
- ✅ View all businesses
- ✅ Update any plan
- ✅ Access all data
- ✅ Manage all users
- ✅ Control features
- ✅ Override limits

### What You Can't Do:
- ❌ Delete businesses (manually in DB if needed)
- ❌ Modify billing integration (Stripe config)
- ❌ Change platform owner list (requires env update)

### Best Practices:
1. **Log actions** - Keep notes of changes
2. **Communicate** - Tell business owners about changes
3. **Test first** - Try on demo business
4. **Backup data** - Before major changes
5. **Review regularly** - Check trial expirations

## 🚨 Emergency Actions

### Trial About to Expire
```
1. Extend trial +14 days
2. Or upgrade to paid plan
3. Or contact business owner
```

### Payment Failed
```
1. Check Stripe dashboard
2. Contact business owner
3. Offer manual payment option
4. Or extend trial temporarily
```

### Feature Not Working
```
1. Check plan tier includes feature
2. Check module packaging settings
3. Check feature flags
4. Check limit overrides
```

### Business Locked Out
```
1. Verify email/password works
2. Check membership status
3. Check plan expiration
4. Extend access if needed
```

## 📧 Communication Templates

### Trial Expiring Soon
```
Subject: Your Tenvo trial ends in 3 days

Hi {business_name},

Your 14-day trial ends on {expiry_date}. 

To continue using Tenvo:
1. Go to Settings → Billing
2. Choose a plan
3. Add payment method

Questions? Reply to this email.

Thanks,
Platform Team
```

### Plan Upgrade Completed
```
Subject: Welcome to {plan_name}!

Hi {business_name},

Your account has been upgraded to {plan_name}.

New features available:
- {feature_1}
- {feature_2}
- {feature_3}

Need help? Contact support.

Thanks,
Platform Team
```

## 🔗 Quick Links

- **Admin Panel:** `/admin`
- **Registrations:** `/admin/registrations`
- **User Dashboard:** `/`
- **Docs:** `/docs`
- **Support:** `support@tenvo.com`

## 🆘 Need Help?

### Technical Issues:
1. Check server logs
2. Check browser console
3. Verify env variables
4. Review database state

### Business Questions:
1. Contact business owner directly
2. Check business settings
3. Review activity history
4. Check integration status

---

**Remember:** With great power comes great responsibility. Always communicate changes to business owners!
