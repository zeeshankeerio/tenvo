# Team Management System - Deployment Checklist

## 🚀 Pre-Deployment Verification

### ✅ Phase 1: Code Review & Testing

- [x] All files created and properly placed
  - [x] `app/accept-invitation/page.jsx`
  - [x] `components/TeamManagementPanel.jsx`
  - [x] `lib/actions/admin/teamManagement.js`
  - [x] `lib/email/templates/TeamInvitationEmail.jsx`
  - [x] Updated `lib/actions/admin/users.js`
  - [x] Updated `lib/actions/basic/business.js`

- [x] Verification script passes 100%
  ```bash
  node scripts/verify-team-management.mjs
  ```
  **Result:** ✅ 28/28 checks passed

- [ ] Manual testing completed
  - [ ] Owner can invite members
  - [ ] Admin can invite members
  - [ ] Manager cannot access team tab
  - [ ] Invitation emails delivered
  - [ ] New user can accept invitation
  - [ ] Existing user can accept invitation
  - [ ] Password reset works
  - [ ] Email change works (owner only)
  - [ ] Role changes persist
  - [ ] Member removal works
  - [ ] Pending invitations displayed
  - [ ] Resend invitation works
  - [ ] Cancel invitation works

---

## 🔧 Phase 2: Environment Configuration

### Production Environment Variables

```bash
# ✅ Check these are set in production

# Required - Email System
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM=notifications@yourdomain.com

# Required - Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Required - Authentication
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://yourdomain.com

# Optional - Development
NODE_ENV=production
```

### Verify Email Configuration

```bash
# 1. Test Resend API key is valid
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "notifications@yourdomain.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'

# 2. Expected response: 200 OK with email ID

# 3. Verify sender domain in Resend dashboard
# - Go to https://resend.com/domains
# - Ensure your domain has DNS records configured
# - Status should be "Verified"
```

---

## 📊 Phase 3: Database Verification

### Check Required Tables Exist

```sql
-- Run these queries to verify schema

-- 1. Check business_users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'business_users'
ORDER BY ordinal_position;

-- Expected columns:
-- id, business_id, user_id, role, status, invited_by, created_at, updated_at

-- 2. Check user_invitations table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_invitations'
ORDER BY ordinal_position;

-- Expected columns:
-- id, email, business_id, role, token, status, invited_by, accepted_by,
-- expires_at, custom_message, created_at, updated_at

-- 3. Check indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('business_users', 'user_invitations')
ORDER BY tablename, indexname;

-- Expected indexes:
-- business_users: PK, business_id index, user_id index, unique(business_id, user_id)
-- user_invitations: PK, business_id index, token unique index, status index
```

### Run Migrations (if needed)

```bash
# If using Prisma
npx prisma migrate deploy

# If using custom SQL migrations
# Ensure these are run:
# - user_invitations table creation
# - business_users invited_by column
# - Proper indexes and constraints
```

---

## 🎨 Phase 4: UI Integration

### Option A: Replace Existing Team Tab (Recommended)

**File:** `components/SettingsManager.jsx`

```javascript
// 1. Add import
import { TeamManagementPanel } from '@/components/TeamManagementPanel';

// 2. Find this section:
<TabsContent value="team" className="space-y-4 pt-4">
  {/* OLD TEAM MANAGEMENT CODE */}
</TabsContent>

// 3. Replace with:
<TabsContent value="team" className="space-y-4 pt-4">
  <TeamManagementPanel
    businessId={business?.id}
    canManageUsers={canManageUsers}
    canManageBilling={canManageBilling}
    role={normalizedRole}
  />
</TabsContent>
```

**Checklist:**
- [ ] Import added
- [ ] Old team tab code replaced
- [ ] Props passed correctly
- [ ] Old state removed (optional cleanup)
- [ ] Component renders without errors
- [ ] Tabs switch correctly

### Option B: Add as New Tab (Testing)

**Checklist:**
- [ ] New tab added: "Team (Enhanced)"
- [ ] Both tabs render side-by-side
- [ ] Can switch between old and new
- [ ] New tab shows all features
- [ ] Decision made on which to keep

---

## 🧪 Phase 5: Staging Deployment

### Deploy to Staging Environment

```bash
# 1. Merge feature branch
git checkout main
git merge feature/team-management
git push origin main

# 2. Deploy to staging
# (Your deployment process - e.g., Vercel, Netlify, custom)
vercel --prod --scope=staging

# 3. Wait for deployment to complete
# 4. Check deployment logs for errors
```

### Staging Testing Checklist

**Environment:**
- [ ] Staging URL: `https://staging.yourdomain.com`
- [ ] Test email: `staging-test@yourdomain.com`
- [ ] Test business created

**Smoke Tests:**
1. **Invitation Flow**
   - [ ] Navigate to Settings → Team
   - [ ] Invite `test-new-user@example.com` as "Manager"
   - [ ] Check email delivered (check spam too)
   - [ ] Open email, verify branding and content
   - [ ] Click "Accept Invitation" button
   - [ ] Create account with test credentials
   - [ ] Verify redirect to dashboard
   - [ ] Verify user appears in Active Members

2. **Existing User Flow**
   - [ ] Sign in as existing test user
   - [ ] Go to invitation acceptance page
   - [ ] Click "Accept Invitation"
   - [ ] Verify added to business
   - [ ] Verify correct role assigned

3. **Team Management**
   - [ ] Change team member role
   - [ ] Verify role persists after page refresh
   - [ ] Remove a team member
   - [ ] Verify member marked as inactive
   - [ ] Try to remove owner (should be protected)

4. **Password Reset** (Owner/Admin)
   - [ ] Click reset password for a member
   - [ ] Enter new password
   - [ ] Verify email sent
   - [ ] Try to reset owner password as admin (should fail)

5. **Email Change** (Owner Only)
   - [ ] Click change email for a member
   - [ ] Enter new email
   - [ ] Verify email updated
   - [ ] Try as admin (should not see button)

6. **Pending Invitations**
   - [ ] View pending invitations tab
   - [ ] Resend an invitation
   - [ ] Verify new email sent
   - [ ] Cancel an invitation
   - [ ] Try to accept cancelled invitation (should fail)

7. **Permission Boundaries**
   - [ ] Sign in as Manager
   - [ ] Verify cannot access Settings → Team
   - [ ] Try direct URL `/settings?section=team`
   - [ ] Verify access denied or redirect

8. **Error Handling**
   - [ ] Try invalid invitation token
   - [ ] Try expired invitation (mock expiry date)
   - [ ] Try duplicate email invitation
   - [ ] Try changing to existing email

---

## 🚢 Phase 6: Production Deployment

### Pre-Production Checklist

- [ ] All staging tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable (< 2s page load)
- [ ] Email delivery rate > 95%
- [ ] Security review completed
- [ ] Documentation reviewed
- [ ] Stakeholder approval obtained

### Production Deployment Steps

```bash
# 1. Create production deployment
git tag -a v1.0.0-team-management -m "Team Management System Release"
git push origin v1.0.0-team-management

# 2. Deploy to production
vercel --prod --scope=production

# 3. Monitor deployment
# - Check build logs
# - Verify no errors
# - Check health endpoints
```

### Post-Deployment Verification

**Immediate (First 5 minutes):**
- [ ] Site loads without errors
- [ ] Can access Settings → Team
- [ ] Active members display correctly
- [ ] Can click "Invite Member"
- [ ] No console errors

**Short-term (First hour):**
- [ ] Send test invitation to real email
- [ ] Verify email delivered within 2 minutes
- [ ] Accept invitation end-to-end
- [ ] Monitor error logs for issues
- [ ] Check database for orphaned records

**Medium-term (First 24 hours):**
- [ ] Monitor invitation success rate
- [ ] Check email delivery metrics in Resend dashboard
- [ ] Review server logs for errors
- [ ] Check customer feedback channels
- [ ] Monitor performance metrics

---

## 📈 Phase 7: Monitoring & Metrics

### Key Metrics to Track

**Email Delivery (Resend Dashboard):**
- Emails sent
- Delivery rate (target: > 99%)
- Bounce rate (target: < 1%)
- Spam complaints (target: < 0.1%)

**Invitation Metrics (Application Analytics):**
- Invitations sent per day
- Acceptance rate (target: > 70%)
- Time to accept (target: < 24 hours)
- Expired invitations (target: < 10%)

**User Engagement:**
- Businesses with 2+ members (target: > 60%)
- Average team size (track growth)
- Daily active team management users
- Feature usage (password resets, email changes)

**Error Rates:**
- Failed invitation sends (target: < 1%)
- Failed invitation acceptances (target: < 5%)
- Permission denied errors (should be 0 for valid users)
- API errors (target: < 0.1%)

### Monitoring Tools

```javascript
// Add to your analytics/monitoring service

// Track invitation sent
analytics.track('team_invitation_sent', {
  business_id,
  role,
  inviter_role,
  is_new_user: !existingUser
});

// Track invitation accepted
analytics.track('team_invitation_accepted', {
  business_id,
  role,
  time_to_accept: Date.now() - invitation.created_at
});

// Track team action
analytics.track('team_action', {
  business_id,
  action: 'reset_password' | 'change_email' | 'remove_member',
  actor_role,
  target_role
});
```

---

## 🆘 Phase 8: Rollback Plan

### If Issues Arise

**Minor Issues (e.g., styling, non-critical bugs):**
1. Document issue
2. Create hotfix branch
3. Deploy fix to staging
4. Test fix
5. Deploy to production
6. Monitor

**Major Issues (e.g., invitations not working, data corruption):**

**Immediate Actions:**
1. Revert to previous deployment:
   ```bash
   vercel rollback
   ```
2. Announce issue to team
3. Disable team management feature via feature flag (if available)
4. Notify affected users

**Recovery Steps:**
1. Identify root cause from logs
2. Create fix in development
3. Test extensively in staging
4. Deploy fix with increased monitoring
5. Verify fix resolves issue
6. Communicate resolution to users

### Rollback Checklist

- [ ] Previous deployment identified
- [ ] Rollback command executed
- [ ] Verify site functional on old version
- [ ] Check affected users (if any)
- [ ] Document issue for post-mortem
- [ ] Plan fix implementation
- [ ] Schedule re-deployment

---

## 📞 Phase 9: Support Preparation

### Support Team Training

**Documentation to Review:**
- [ ] `docs/TEAM_MANAGEMENT_GUIDE.md` - Complete feature guide
- [ ] `docs/TEAM_MANAGEMENT_INTEGRATION_GUIDE.md` - Technical integration
- [ ] `TEAM_MANAGEMENT_IMPLEMENTATION_SUMMARY.md` - Executive overview

**Common Support Queries:**

1. **"I didn't receive the invitation email"**
   - Check spam folder
   - Verify email address spelling
   - Resend from pending invitations tab
   - Check Resend dashboard for delivery status

2. **"The invitation link says it's expired"**
   - Invitations expire after 7 days
   - Cancel old invitation and send new one
   - New link will arrive via email

3. **"I can't reset a team member's password"**
   - Only owner and admin can reset passwords
   - Admins cannot reset owner/admin passwords
   - Owner must use Settings → Security for their own password

4. **"How do I change someone's role?"**
   - Go to Settings → Team → Active Members
   - Use dropdown next to member's name
   - Owner role cannot be changed

5. **"Can I invite someone who doesn't have an account yet?"**
   - Yes! Just enter their email
   - They'll receive an invitation to create an account
   - They'll be added to your team once they accept

### Escalation Path

**Level 1: Self-Service**
- User documentation
- In-app help text
- FAQ section

**Level 2: Support Team**
- Email: support@tenvo.app
- Response time: < 24 hours
- Can resend invitations, check status

**Level 3: Engineering**
- For bugs, data issues, API errors
- Response time: < 4 hours for critical
- Can access logs, database, Resend dashboard

---

## 🎉 Phase 10: Launch Communication

### Internal Announcement

**To:** Engineering team
**Subject:** Team Management System Deployed ✅

```
Team,

The new team management system is now live in production!

Key Features:
- Email invitations for new and existing users
- Password reset for team members
- Email address management
- Pending invitations tracking
- Enhanced RBAC enforcement

What to Watch:
- Invitation email delivery rates
- Acceptance rates and time-to-accept
- Error logs for permission issues
- Customer feedback

Documentation:
- User Guide: docs/TEAM_MANAGEMENT_GUIDE.md
- Integration: docs/TEAM_MANAGEMENT_INTEGRATION_GUIDE.md
- Summary: TEAM_MANAGEMENT_IMPLEMENTATION_SUMMARY.md

Monitoring Dashboard: [link]
On-call: [team member]

Great work team! 🚀
```

### Customer Announcement (Optional)

**To:** Active business owners
**Subject:** New Feature: Invite Your Team to Tenvo

```
Hi [Name],

We're excited to announce a new feature that makes it easier to 
collaborate with your team on Tenvo.

🎉 What's New:
- Invite team members via email
- Assign roles and permissions
- Manage your team from one dashboard
- Track pending invitations

🚀 How to Get Started:
1. Go to Settings → Team
2. Enter your team member's email
3. Select their role
4. Click "Invite Member"

They'll receive an email with a link to join your business!

📖 Learn More: [link to help article]

Questions? Reply to this email or contact support@tenvo.app

Happy collaborating!
The Tenvo Team
```

---

## ✅ Final Sign-Off

### Deployment Approval

- [ ] **Engineering Lead:** Code review approved
- [ ] **Product Manager:** Features match requirements
- [ ] **QA Lead:** Testing complete, no blockers
- [ ] **Security Lead:** Security review passed
- [ ] **DevOps:** Infrastructure ready
- [ ] **Support Lead:** Team trained, docs reviewed

### Deployment Authorization

**Authorized By:** ___________________________
**Date:** ___________________________
**Time:** ___________________________
**Version:** v1.0.0-team-management
**Environment:** Production

**Signature:** ___________________________

---

## 📋 Post-Launch Checklist

**Day 1:**
- [ ] Monitor error rates
- [ ] Check email delivery metrics
- [ ] Review customer feedback
- [ ] Verify performance metrics
- [ ] Check for unexpected edge cases

**Week 1:**
- [ ] Analyze invitation acceptance rates
- [ ] Review support tickets
- [ ] Identify any usability issues
- [ ] Gather team feedback
- [ ] Plan any quick wins

**Month 1:**
- [ ] Full metrics review
- [ ] User satisfaction survey
- [ ] Identify enhancement opportunities
- [ ] Document lessons learned
- [ ] Celebrate success! 🎊

---

## 📊 Success Criteria

**Launch is considered successful if:**

✅ Email delivery rate > 99%
✅ Invitation acceptance rate > 60%
✅ No critical bugs reported
✅ Error rate < 1%
✅ Support ticket volume normal
✅ Customer feedback positive
✅ Team satisfaction > 8/10

**If any criterion not met:** Review, address, and re-evaluate

---

## 🔗 Quick Links

- **User Guide:** `docs/TEAM_MANAGEMENT_GUIDE.md`
- **Integration Guide:** `docs/TEAM_MANAGEMENT_INTEGRATION_GUIDE.md`
- **Implementation Summary:** `TEAM_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
- **Verification Script:** `scripts/verify-team-management.mjs`
- **Resend Dashboard:** https://resend.com/emails
- **Application Logs:** [Your logging service]
- **Analytics Dashboard:** [Your analytics service]

---

**Last Updated:** June 30, 2026
**Version:** 1.0.0
**Status:** ✅ READY FOR DEPLOYMENT
**Owner:** Tenvo Engineering Team

---

*Good luck with the deployment! 🚀*
