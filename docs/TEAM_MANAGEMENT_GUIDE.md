# Team Management & User Invitation System

## Overview

The Tenvo ERP platform includes a comprehensive team management system that allows business owners and administrators to invite team members, manage roles, control access, and maintain account security.

## Table of Contents

1. [Key Features](#key-features)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Invitation Flow](#invitation-flow)
4. [Team Management](#team-management)
5. [Security & Access Control](#security--access-control)
6. [Technical Implementation](#technical-implementation)
7. [Testing Checklist](#testing-checklist)

---

## Key Features

### ✅ **Implemented Features**

- **Email Invitations**: Invite team members via email with custom messages
- **Role-Based Access Control (RBAC)**: 9 role levels from viewer to owner
- **Pending Invitations Management**: View, resend, and cancel pending invitations
- **Password Reset**: Admins can reset passwords for team members
- **Email Management**: Owners can change team member email addresses
- **Invitation Expiry**: Invitations expire after 7 days
- **Automatic User Creation**: New users can create accounts directly from invitation link
- **Existing User Support**: Existing users can accept invitations without re-registration

### 🎯 **Access Control Matrix**

| Action | Owner | Admin | Manager | Other Roles |
|--------|-------|-------|---------|-------------|
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Change Roles | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Reset Passwords | ✅ | ✅* | ❌ | ❌ |
| Change Emails | ✅ | ❌ | ❌ | ❌ |
| Manage Billing | ✅ | ❌ | ❌ | ❌ |

*Admins cannot reset passwords for owners or other admins

---

## User Roles & Permissions

### Role Hierarchy (9 Levels)

```
owner (highest)
├── admin
├── manager
├── accountant
├── warehouse_manager
├── cashier
├── salesperson
├── waiter
└── viewer (lowest)
```

### Role Capabilities

#### **Owner**
- Full system access
- Manage billing and subscriptions
- Change team member emails
- Reset any non-owner passwords
- Cannot be removed

#### **Admin**
- Invite and manage team members
- Reset passwords (except owner/admin)
- Manage business settings
- Cannot manage billing

#### **Manager**
- Operational management
- Approve transactions
- View reports
- No team management

#### **Accountant**
- Financial management
- GL and journal entries
- Tax compliance
- Payment allocation

#### **Warehouse Manager**
- Inventory control
- Stock adjustments
- Warehouse transfers

#### **Cashier**
- POS operations
- Process payments
- Open/close sessions

#### **Salesperson**
- Create invoices
- Manage customers
- View inventory

#### **Waiter** (Restaurant)
- Create orders
- Manage tables
- View KDS

#### **Viewer**
- Read-only dashboard access
- Cannot create or modify data

---

## Invitation Flow

### 1. **Inviting a New Member**

**Owner/Admin navigates to:** Settings → Team

**Steps:**
1. Enter member email address
2. Select role from dropdown
3. Click "Invite Member"
4. System sends invitation email

**Invitation Email Contents:**
- Business name
- Assigned role
- Custom message (optional)
- Accept invitation button (7-day validity)
- Alternative link for manual copy/paste

### 2. **New User Accepting Invitation**

**User clicks invitation link → Accept Invitation Page**

**For New Users:**
1. Pre-filled email (read-only)
2. Enter full name
3. Create password (min 8 characters)
4. Confirm password
5. Click "Create Account & Accept"
6. Auto-redirected to dashboard

**For Existing Users:**
1. Shows current signed-in account
2. Click "Accept Invitation"
3. Option to sign in with different account
4. Auto-redirected to business dashboard

### 3. **Invitation States**

| State | Description | Actions Available |
|-------|-------------|-------------------|
| **Pending** | Sent, not yet accepted | Resend, Cancel |
| **Accepted** | User joined team | View in Active Members |
| **Expired** | Past 7-day validity | None (must re-invite) |
| **Revoked** | Cancelled by admin | None |

---

## Team Management

### Active Members Tab

**Displays:**
- User name and email
- Current role (with dropdown to change)
- Status indicator (active/inactive)
- Action buttons (Reset Password, Change Email, Remove)

**Actions:**

#### **Change Role**
- Select new role from dropdown
- Auto-saves on change
- Owner role cannot be changed via dropdown

#### **Reset Password**
- Click key icon next to member
- Enter new password
- System sends password reset email
- Admins cannot reset owner/admin passwords

#### **Change Email** (Owner Only)
- Click mail icon next to member
- Enter new email address
- System validates email uniqueness
- Updates user's login email

#### **Remove Member**
- Click "Remove" button
- Confirmation prompt
- Member status set to inactive
- Owner cannot be removed

### Pending Invitations Tab

**Displays:**
- Invited email address
- Assigned role
- Inviter name
- Expiration date
- Actions (Resend, Cancel)

**Actions:**

#### **Resend Invitation**
- Re-sends invitation email with same token
- Expiration date unchanged
- Useful for email delivery issues

#### **Cancel Invitation**
- Marks invitation as revoked
- User cannot accept even with original link
- Removed from pending list

---

## Security & Access Control

### Permission Checks

**Server-Side Guards:**
- Every team management action checks `settings.manage_users` permission
- Only owner and admin roles pass this check
- Additional owner-only checks for sensitive actions (email changes)

**Client-Side Gating:**
- UI elements hidden based on role
- Team tab only visible to owner/admin
- Action buttons conditionally rendered

### Data Isolation

**Business Scoping:**
- All queries filter by `business_id`
- Users can only manage teams they belong to
- Cross-business access prevented

**User Validation:**
- Invitation email must match user email exactly
- Token validation checks expiry and business membership
- Duplicate email prevention

### Audit Trail

**Tracked Events:**
- Member invited (who invited, when, role)
- Invitation accepted (who accepted, when)
- Role changes (from, to, who changed)
- Password resets (who requested, for whom)
- Email changes (old, new, who changed)
- Member removals (who removed, whom)

---

## Technical Implementation

### Database Tables

#### **business_users**
```sql
- id (uuid)
- business_id (uuid, FK to businesses)
- user_id (text, FK to user)
- role (text)
- status (text: 'active', 'inactive')
- invited_by (text, FK to user)
- created_at, updated_at
- UNIQUE(business_id, user_id)
```

#### **user_invitations**
```sql
- id (uuid)
- email (text)
- business_id (uuid, FK to businesses)
- role (text)
- token (text, unique)
- status (text: 'pending', 'accepted', 'revoked')
- invited_by (text, FK to user)
- accepted_by (text, FK to user)
- expires_at (timestamp)
- custom_message (text)
- created_at, updated_at
```

### Key Files

**Frontend:**
- `app/accept-invitation/page.jsx` - Invitation acceptance page
- `components/TeamManagementPanel.jsx` - Enhanced team UI
- `components/SettingsManager.jsx` - Settings with team tab

**Backend Actions:**
- `lib/actions/admin/users.js` - Invitation CRUD operations
- `lib/actions/admin/teamManagement.js` - Password/email management
- `lib/actions/basic/business.js` - Team member operations

**Email Templates:**
- `lib/email/templates/TeamInvitationEmail.jsx` - Invitation email
- `lib/email/templates/AuthOtpEmail.jsx` - OTP/reset emails

**RBAC:**
- `lib/rbac/permissions.js` - Permission definitions and checks

### API Flow

#### **Invite Member**
```javascript
// Frontend
businessAPI.addMember(businessId, email, role)
  ↓
// Server Action
addBusinessMemberAction({ businessId, email, role })
  ↓
// Check if user exists
  ↓
// If exists: Add to business_users
// If not: Create user_invitation + Send email
  ↓
// Return success
```

#### **Accept Invitation**
```javascript
// Frontend
acceptInvitation(token, userId)
  ↓
// Server Action
validateInvitationToken(token)
  ↓
// Lock invitation row (FOR UPDATE)
  ↓
// Update invitation status to 'accepted'
  ↓
// Insert/update business_users
  ↓
// Return success with business_id
```

#### **Reset Password**
```javascript
// Frontend
resetTeamMemberPassword({ businessId, targetUserId, newPassword })
  ↓
// Server Action
checkTeamManagementPermission(businessId)
  ↓
// Verify target is member
  ↓
// Check permission hierarchy
  ↓
// Send password reset email
  ↓
// Return success
```

---

## Testing Checklist

### ✅ **Invitation Flow**

- [ ] Owner can invite new member (non-existing email)
- [ ] Admin can invite new member
- [ ] Manager cannot access team tab
- [ ] Invitation email is delivered
- [ ] Invitation email contains correct business name and role
- [ ] Accept invitation page loads with token
- [ ] New user can create account from invitation
- [ ] Existing user can accept invitation while signed in
- [ ] Expired invitation (7+ days) shows error
- [ ] Invalid token shows error
- [ ] Accepted invitation redirects to multi-business page

### ✅ **Team Management**

- [ ] Active members list displays correctly
- [ ] Role dropdown works (not for owner)
- [ ] Changing role persists and refreshes
- [ ] Remove member requires confirmation
- [ ] Removed member cannot sign in to business
- [ ] Owner row shows "Protected" instead of actions
- [ ] Pending invitations tab shows all pending
- [ ] Resend invitation sends new email
- [ ] Cancel invitation marks as revoked

### ✅ **Password Reset**

- [ ] Owner can reset any non-owner password
- [ ] Admin can reset manager/cashier/etc passwords
- [ ] Admin cannot reset owner password
- [ ] Admin cannot reset another admin password
- [ ] Password reset email is delivered
- [ ] Password must be 8+ characters
- [ ] Owner cannot reset own password via this method

### ✅ **Email Management**

- [ ] Only owner sees email change button
- [ ] Owner can change member email
- [ ] Admin cannot change member email
- [ ] New email must be unique
- [ ] Invalid email shows validation error
- [ ] Changed email works for sign-in

### ✅ **Access Control**

- [ ] Manager/below cannot access Settings → Team
- [ ] API calls fail for non-admin roles
- [ ] Cross-business member management fails
- [ ] Owner seat count respects plan limits
- [ ] Free plan limited to correct number of seats

### ✅ **Edge Cases**

- [ ] Inviting existing member updates their role
- [ ] Duplicate invitation to pending email shows message
- [ ] Invitation to owner email is rejected
- [ ] User can belong to multiple businesses
- [ ] Switching businesses shows correct team
- [ ] Invitation acceptance adds to correct business

---

## Best Practices

### For Business Owners

1. **Assign Minimum Required Roles**: Give users the lowest role that allows them to do their job
2. **Review Team Regularly**: Remove inactive members to free up seats
3. **Use Custom Messages**: Add context in invitation emails
4. **Monitor Pending Invitations**: Follow up on unaccepted invitations
5. **Protect Owner Account**: Enable 2FA on owner accounts

### For Developers

1. **Always Check Permissions**: Use `requirePermission()` in server actions
2. **Validate Business Membership**: Check `business_id` in all queries
3. **Use Transactions**: Invitation acceptance should be atomic
4. **Log Sensitive Actions**: Track password resets and email changes
5. **Test Role Boundaries**: Ensure admins cannot escalate privileges

### For Administrators

1. **Clear Role Descriptions**: Explain role capabilities during invitation
2. **Set Expiration Reminders**: Resend invitations before 7-day expiry
3. **Document Custom Roles**: If using custom packaging, document changes
4. **Regular Access Reviews**: Audit team access quarterly
5. **Coordinate with HR**: Align system roles with org chart

---

## Troubleshooting

### Issue: Invitation Email Not Received

**Possible Causes:**
- Resend API key not configured (`RESEND_API_KEY`)
- Email in spam folder
- Typo in email address

**Solutions:**
1. Check `.env` for `RESEND_API_KEY`
2. Ask user to check spam
3. Resend invitation from pending tab
4. Verify email address spelling

### Issue: "User Not Found" Error

**Cause**: Old flow required users to register first

**Solution**: Updated flow now creates invitation for new users automatically

### Issue: Cannot Reset Owner Password

**Expected Behavior**: Owners must reset their own password via Settings → Security

**Solution**: Direct owner to use "Change Password" section in Security tab

### Issue: Invitation Expired

**Solution**:
1. Cancel old invitation
2. Send new invitation
3. User uses new invitation link

### Issue: Member Can't Sign In After Invitation

**Possible Causes:**
- Invitation not yet accepted
- User signed in with different email
- Email verification pending

**Solutions:**
1. Check pending invitations tab
2. Verify user accepted invitation
3. Check user's email for verification link

---

## API Reference

### Server Actions

#### `addBusinessMemberAction({ businessId, email, role })`
Invite a team member or add existing user to business.

**Parameters:**
- `businessId` (string): Target business UUID
- `email` (string): Member email address
- `role` (string): One of the 9 defined roles

**Returns:**
```javascript
{
  success: boolean,
  membership?: object,
  invitation?: object,
  message: string
}
```

#### `resetTeamMemberPassword({ businessId, targetUserId, newPassword })`
Reset a team member's password (admin/owner only).

**Parameters:**
- `businessId` (string): Business UUID
- `targetUserId` (string): Target user ID
- `newPassword` (string): New password (min 8 chars)

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

#### `updateTeamMemberEmail({ businessId, targetUserId, newEmail })`
Change a team member's email address (owner only).

**Parameters:**
- `businessId` (string): Business UUID
- `targetUserId` (string): Target user ID
- `newEmail` (string): New email address

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  newEmail: string
}
```

#### `getPendingInvitations({ businessId })`
Get all pending invitations for a business.

**Returns:**
```javascript
{
  success: boolean,
  invitations: Array<{
    id: string,
    email: string,
    role: string,
    invited_by_name: string,
    expires_at: string
  }>
}
```

#### `resendInvitation({ invitationId })`
Resend invitation email.

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

#### `cancelInvitation({ invitationId })`
Cancel a pending invitation.

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

---

## Future Enhancements

### Planned Features

- [ ] **Invitation Templates**: Pre-defined message templates
- [ ] **Bulk Invitations**: Invite multiple members via CSV
- [ ] **Custom Role Builder**: Define custom roles with granular permissions
- [ ] **Team Activity Dashboard**: View team member activity logs
- [ ] **Time-Based Access**: Set role expiration dates
- [ ] **Department Grouping**: Organize members into departments
- [ ] **Invitation Analytics**: Track acceptance rates and time-to-accept

### Integration Opportunities

- [ ] **Slack Integration**: Team notifications
- [ ] **Microsoft Teams**: SSO and team sync
- [ ] **Google Workspace**: Auto-import users
- [ ] **SCIM Provisioning**: Enterprise user management

---

## Support & Feedback

**Documentation:** See `docs/` folder for additional guides
**Issues:** Report bugs via GitHub Issues
**Questions:** Contact support@tenvo.app
**Feature Requests:** Submit via product feedback form

---

**Last Updated:** June 30, 2026
**Version:** 1.0.0
**Maintainer:** Tenvo Engineering Team
