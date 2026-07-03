# Platform Owner Quick Start Guide

**Your Email**: `zeeshan.keerio@mindscapeanalytics.com`  
**Role**: Platform Owner (Full Access)

---

## 🎯 What You Can Do

As the platform owner, you have **complete control** over the entire Tenvo platform:

### ✅ Automatic Benefits
- **Auto-approved registrations** - Your registrations never wait for approval
- **Enterprise plan** - Unlimited users, products, warehouses, everything
- **Full admin access** - Access to all platform administration features
- **No billing restrictions** - All features enabled, no payment required

---

## 🔑 Accessing Admin Features

### 1. **Main Admin Dashboard**
- **URL**: `http://localhost:3000/admin` (or your production URL)
- **What you see**:
  - Overview (platform statistics)
  - **Registrations** (NEW! Approve/reject new users)
  - Businesses (all registered businesses)
  - Users (all platform users)
  - Subscriptions (billing & plans)
  - Roles & Access (manage permissions)
  - Feature Flags (enable/disable platform features)

### 2. **Registration Approvals** (NEW!)
- **URL**: `http://localhost:3000/admin/registrations`
- **Purpose**: Review and approve new business registrations
- **Features**:
  - ✅ Approve registrations (users get email + dashboard access)
  - ❌ Reject registrations (users get professional email explaining why)
  - 💬 Request more information (users get notification to provide details)
  - 📊 View registration statistics
  - 🔍 Search and filter registrations
  - ✅ Bulk approve multiple registrations at once

---

## 📋 Managing New Registrations

### When Someone Registers

1. **You receive an email** with subject: "New Registration: {Business Name}"
2. Email contains:
   - Business name, email, category, country
   - Plan tier they selected
   - Domain handle they chose
   - **"Review Registration" button** → Opens admin panel

3. **User sees**: "Registration Under Review" page
   - They can "Book a Demo" (tracked in system)
   - They can "Check Status" (refreshes approval state)
   - They wait for your approval

### Approving a Registration

**Option 1: Quick Approve** (from email or registrations list)
1. Click **"Approve"** button
2. User immediately gets:
   - ✅ Email: "Welcome to Tenvo - Your workspace is ready!"
   - 🔔 In-app notification with dashboard link
   - 🚀 Dashboard access activated

**Option 2: Approve with Notes** (from expanded view)
1. Click **"More"** to expand registration details
2. Scroll to approve section (top of expanded area)
3. Add optional notes (sent to user in email)
4. Click **"Approve"**

**Option 3: Bulk Approve** (multiple at once)
1. Check boxes next to registrations you want to approve
2. Click **"Approve Selected (N)"** button at top
3. All selected users get approved instantly

### Rejecting a Registration

1. Click **"More"** to expand registration details
2. Scroll to **"Reject Registration"** section
3. Enter reason (will be sent to user via email)
4. Click **"Reject Registration"**
5. User receives professional rejection email with your reason

### Requesting More Information

1. Click **"More"** to expand registration details
2. Find **"Request More Information"** section
3. Enter what information you need
4. Click **"Send Request"**
5. User gets:
   - 📧 Email explaining what's needed
   - 🔔 In-app notification with your message
   - Status changes to "Info Requested"

---

## 🎨 Admin Panel Navigation

### Tabs in Admin Panel

1. **Overview** → Platform statistics and KPIs
2. **Registrations** (NEW!) → Approve/reject new signups
3. **Businesses** → All registered businesses
   - Change plans (upgrade/downgrade)
   - Extend trial periods
   - View business details
   - Manage team members
4. **Users** → All platform users
   - Change roles
   - Deactivate users
   - Platform admin promotion
5. **Subscriptions** → Billing management
   - Subscription stats
   - Manual payments (offline billing)
   - Trial extensions
6. **Roles & Access** → Permission management
7. **Feature Flags** → Enable/disable features

---

## 🔔 Notifications You'll Receive

### Email Notifications
- **New Registration** - Someone registers → You get immediate email
- **Demo Requested** - User clicks "Book a Demo" → Tracked in system

### Where Registrations Appear
- **Email inbox** - Immediate notification
- **Admin panel** - `/admin` → Registrations tab
- **Direct panel** - `/admin/registrations` → Full approval interface

---

## 🎯 Quick Actions

### Scenario 1: Legitimate Business Registration
```
1. Receive email notification
2. Click "Review Registration" in email
3. Click "Approve" button
4. ✅ Done! User can access dashboard
```

### Scenario 2: Suspicious Registration
```
1. Receive email notification
2. Go to /admin/registrations
3. Click "More" on the registration
4. Read details carefully
5. Enter rejection reason
6. Click "Reject Registration"
7. ✅ Done! User gets professional rejection email
```

### Scenario 3: Need More Info
```
1. Go to /admin/registrations
2. Click "More" on the registration
3. Click "Request More Information"
4. Type what you need (e.g., "Please provide your business registration number")
5. Click "Send Request"
6. ✅ Done! User gets notification to provide info
```

### Scenario 4: Bulk Approve (Multiple Registrations)
```
1. Go to /admin/registrations
2. Check boxes for legitimate registrations
3. Click "Approve Selected (N)" at top
4. ✅ Done! All selected users approved
```

---

## 📊 Registration Statistics

View in **Overview** or **Registrations** tab:
- **Pending** - Awaiting your approval (amber badge)
- **Info Requested** - Waiting for user to provide more info (blue badge)
- **Approved** - Active businesses (green badge)
- **Rejected** - Declined registrations (red badge)
- **Demo Requested** - Users who clicked "Book a Demo" (purple badge)

---

## ⚙️ Your Platform Owner Powers

### What Makes You Special
```javascript
// Your email is configured in .env
PLATFORM_OWNER_EMAILS=zeeshan.keerio@mindscapeanalytics.com

// This gives you:
✅ Auto-approved registrations (no waiting)
✅ Enterprise plan (unlimited everything)
✅ Full admin panel access
✅ Can manage all businesses
✅ Can manage all users
✅ Can approve/reject registrations
✅ Can change any business's plan
✅ Can override any feature/limit
✅ No billing restrictions
```

### When You Register a Test Business
- You skip approval → Go directly to dashboard
- You get enterprise plan automatically
- No trial period
- All features unlocked
- No payment required

### When Anyone Else Registers
- They wait for your approval
- They see "Pending Approval" page
- They can book a demo
- You get email notification
- You approve/reject from admin panel

---

## 🚨 Important Notes

1. **Check Admin Panel Daily** - New registrations may be waiting
2. **Respond Within 24-48 Hours** - Users are told to expect approval in 1-2 business days
3. **Be Professional** - Rejection reasons are sent to users via email
4. **Use Bulk Approve** - For multiple legitimate registrations, use bulk selection
5. **Track Demo Requests** - Purple badge shows who wants a sales call

---

## 🆘 Support & Help

### If You Need Assistance
- **Email**: zeeshan.keerio@mindscapeanalytics.com (your own email - you're the owner!)
- **Documentation**: Check `/REGISTRATION_APPROVAL_FLOW_COMPLETE.md` for technical details

### Common Questions

**Q: What if I accidentally reject someone?**  
A: Contact them directly via email to explain and manually create their business.

**Q: Can I approve registrations from my phone?**  
A: Yes! The admin panel is responsive and works on mobile.

**Q: How do I know if someone booked a demo?**  
A: Look for the purple "Demo Requested" badge in the registrations list.

**Q: What happens if I don't approve for a week?**  
A: Users stay on the pending page. They can still book a demo and contact support.

**Q: Can I delegate approval to someone else?**  
A: Not yet - only platform owners can approve. Coming in future updates.

---

## 🎉 Getting Started Checklist

- [x] Platform owner email configured: `zeeshan.keerio@mindscapeanalytics.com`
- [x] Database migration applied
- [x] Admin panel accessible at `/admin`
- [x] Registrations panel accessible at `/admin/registrations`
- [x] Email notifications enabled (Resend configured)
- [x] You're ready to approve registrations!

---

**Your Next Steps:**

1. Visit `http://localhost:3000/admin` (or your production URL)
2. Click **"Registrations"** tab
3. You'll see all pending registrations (if any)
4. Start approving legitimate businesses!

**Remember**: You have full control over the entire platform. Use your power wisely! 🚀

---

**Questions?** You're the platform owner - you make the rules! 😊
