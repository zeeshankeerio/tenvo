# Team Management Integration Guide

## Quick Start: Integrating TeamManagementPanel into Your App

This guide shows how to replace the basic team management in `SettingsManager.jsx` with the enhanced `TeamManagementPanel.jsx`.

---

## Option 1: Use Enhanced Panel (Recommended)

### Step 1: Import the Component

In `components/SettingsManager.jsx`, add:

```javascript
import { TeamManagementPanel } from '@/components/TeamManagementPanel';
```

### Step 2: Replace Team Tab Content

Find the `<TabsContent value="team">` section and replace it with:

```javascript
<TabsContent value="team" className="space-y-4 pt-4">
  <TeamManagementPanel
    businessId={business?.id}
    canManageUsers={canManageUsers}
    canManageBilling={canManageBilling}
    role={normalizedRole}
  />
</TabsContent>
```

### Step 3: Remove Old State (Optional Cleanup)

If not used elsewhere, remove these state variables:

```javascript
// Can remove these if only used in team tab
const [team, setTeam] = useState([]);
const [inviteEmail, setInviteEmail] = useState('');
const [inviteRole, setInviteRole] = useState('salesperson');
const [teamBusy, setTeamBusy] = useState(false);

// Remove these functions
const refreshTeam = useCallback(async () => { ... }, [business?.id]);
const handleInviteMember = async () => { ... };
const handleRoleUpdate = async (member, nextRole) => { ... };
const handleRemoveMember = async (member) => { ... };

// Remove this useEffect
useEffect(() => {
  if (!businessId) { ... }
}, [businessId]);
```

---

## Option 2: Keep Both (Side-by-Side Comparison)

If you want to test the new panel alongside the old one:

### Add Both Tabs

```javascript
<TabsList>
  {/* Existing tabs */}
  <TabsTrigger value="team">Team (Basic)</TabsTrigger>
  <TabsTrigger value="team-enhanced">Team (Enhanced)</TabsTrigger>
</TabsList>

{/* Keep existing team tab */}
<TabsContent value="team" className="space-y-4 pt-4">
  {/* ...existing team management code... */}
</TabsContent>

{/* Add enhanced team tab */}
<TabsContent value="team-enhanced" className="space-y-4 pt-4">
  <TeamManagementPanel
    businessId={business?.id}
    canManageUsers={canManageUsers}
    canManageBilling={canManageBilling}
    role={normalizedRole}
  />
</TabsContent>
```

### Test Both Versions

1. Navigate to Settings → Team (Basic) - see original
2. Navigate to Settings → Team (Enhanced) - see new features
3. Compare UX and feature completeness
4. Remove basic version once satisfied

---

## Option 3: Standalone Route (Advanced Users)

If you want a dedicated team management page outside of Settings:

### Create New Route

Create `app/team/page.jsx`:

```javascript
'use client';

import { TeamManagementPanel } from '@/components/TeamManagementPanel';
import { useBusiness } from '@/lib/context/BusinessContext';
import { redirect } from 'next/navigation';

export default function TeamManagementPage() {
  const { business, role, isPlatformOwner } = useBusiness();
  
  const canManageUsers = isPlatformOwner || ['owner', 'admin'].includes(role);
  const canManageBilling = isPlatformOwner || role === 'owner';

  if (!canManageUsers) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-600 mt-2">
            Manage team members, roles, and access permissions
          </p>
        </div>

        <TeamManagementPanel
          businessId={business?.id}
          canManageUsers={canManageUsers}
          canManageBilling={canManageBilling}
          role={role}
        />
      </div>
    </div>
  );
}
```

### Add to Navigation

In your sidebar/navigation component:

```javascript
{canManageUsers && (
  <NavLink href="/team" icon={Users}>
    Team Management
  </NavLink>
)}
```

---

## Features Comparison

| Feature | Basic Team Tab | Enhanced TeamManagementPanel |
|---------|----------------|------------------------------|
| Active members list | ✅ | ✅ |
| Add members | ✅ | ✅ |
| Change roles | ✅ | ✅ |
| Remove members | ✅ | ✅ |
| Pending invitations | ❌ | ✅ |
| Resend invitations | ❌ | ✅ |
| Cancel invitations | ❌ | ✅ |
| Reset passwords | ❌ | ✅ |
| Change emails | ❌ | ✅ |
| Tabbed interface | ❌ | ✅ |
| Action dialogs | ❌ | ✅ |
| Auto-refresh | ❌ | ✅ |
| Owner protection UI | Basic | Enhanced |

---

## Configuration Options

### Props Reference

```typescript
interface TeamManagementPanelProps {
  businessId: string;        // Required: Current business UUID
  canManageUsers: boolean;   // Required: Can user manage team?
  canManageBilling: boolean; // Required: Can user access billing features?
  role: string;             // Required: Current user's role
}
```

### Customization

#### Hide Specific Actions

Edit `TeamManagementPanel.jsx`:

```javascript
// Hide password reset
{canManageBilling && false && (
  <Button onClick={() => openResetPasswordDialog(member)}>
    <Key className="w-3 h-3" />
  </Button>
)}

// Hide email change
{isOwner && false && (
  <Button onClick={() => openChangeEmailDialog(member)}>
    <Mail className="w-3 h-3" />
  </Button>
)}
```

#### Change Role Options

Modify the role dropdown:

```javascript
// Current roles
['admin', 'manager', 'accountant', 'cashier', 'salesperson', 'warehouse_manager', 'waiter', 'viewer']

// Custom roles for retail
['admin', 'manager', 'cashier', 'salesperson', 'viewer']

// Custom roles for restaurant
['admin', 'manager', 'waiter', 'chef', 'cashier', 'viewer']
```

#### Styling

The component uses Tenvo's design system tokens:

```javascript
// Primary color: wine (#881337)
// Replace with your brand color:
className="bg-wine hover:bg-wine/90"
// Change to:
className="bg-blue-600 hover:bg-blue-700"

// Border radius: rounded-xl
// Change to squared:
className="rounded-xl"
// Change to:
className="rounded-md"
```

---

## Testing the Integration

### 1. Basic Functionality

```bash
# 1. Navigate to Settings → Team
# 2. Verify tabs render (Active Members, Pending Invitations)
# 3. Invite a new member with non-existing email
# 4. Check pending invitations tab shows the invitation
# 5. Check email was delivered
# 6. Accept invitation in incognito window
# 7. Verify member appears in active members tab
```

### 2. Permission Testing

```bash
# As Owner:
# - Can see all action buttons (reset password, change email, remove)
# - Can access both tabs
# - Can perform all actions

# As Admin:
# - Can see reset password and remove buttons
# - Cannot see change email button
# - Can access both tabs

# As Manager:
# - Cannot access team tab at all
# - Should redirect or show access denied
```

### 3. Edge Cases

```bash
# - Invite existing member (should add immediately)
# - Invite with same email twice (should show error)
# - Try to remove owner (should show protected)
# - Try to change owner role (should show protected)
# - Cancel pending invitation and try to accept (should fail)
# - Accept expired invitation (should show error)
```

---

## Troubleshooting

### Issue: Component Not Rendering

**Symptom:** Blank screen or error on team tab

**Solution:**
1. Check import path: `@/components/TeamManagementPanel`
2. Verify all dependencies installed
3. Check browser console for errors
4. Ensure `businessId` prop is not null

### Issue: Actions Not Working

**Symptom:** Clicking buttons does nothing

**Solution:**
1. Check `canManageUsers` prop is true
2. Verify user has owner/admin role
3. Check server action imports
4. Review browser network tab for failed requests

### Issue: Invitations Not Sending

**Symptom:** Member added but no email received

**Solution:**
1. Verify `RESEND_API_KEY` is set
2. Check `RESEND_FROM` is a verified sender
3. Review server logs for email errors
4. Test Resend API directly

### Issue: Styling Looks Off

**Symptom:** UI doesn't match design system

**Solution:**
1. Ensure Tailwind CSS is configured
2. Verify `wine` color is defined in tailwind.config
3. Check if custom CSS is overriding styles
4. Review component className props

---

## Migration Checklist

- [ ] Import `TeamManagementPanel` component
- [ ] Replace `<TabsContent value="team">` section
- [ ] Pass required props (businessId, canManageUsers, canManageBilling, role)
- [ ] Remove old team management state (optional cleanup)
- [ ] Remove old team management functions (optional cleanup)
- [ ] Test invitation flow end-to-end
- [ ] Test password reset as owner
- [ ] Test email change as owner
- [ ] Test role changes
- [ ] Test member removal
- [ ] Test pending invitations tab
- [ ] Test permission boundaries (manager cannot access)
- [ ] Deploy to staging
- [ ] Smoke test in staging
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Performance Considerations

### Lazy Loading

For large teams, consider lazy loading:

```javascript
import dynamic from 'next/dynamic';

const TeamManagementPanel = dynamic(
  () => import('@/components/TeamManagementPanel').then(mod => mod.TeamManagementPanel),
  {
    loading: () => <div>Loading team management...</div>,
    ssr: false
  }
);
```

### Pagination

For 50+ members, add pagination:

```javascript
// In TeamManagementPanel.jsx
const [page, setPage] = useState(1);
const [limit] = useState(20);

// Filter team members
const paginatedTeam = team.slice((page - 1) * limit, page * limit);

// Add pagination controls
<div className="flex justify-between items-center mt-4">
  <Button onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
  <span>Page {page} of {Math.ceil(team.length / limit)}</span>
  <Button onClick={() => setPage(p => p + 1)}>Next</Button>
</div>
```

### Caching

Use SWR for better caching:

```bash
npm install swr
```

```javascript
import useSWR from 'swr';

function TeamManagementPanel({ businessId }) {
  const { data: team, mutate } = useSWR(
    businessId ? `/api/businesses/${businessId}/team` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30s
  );
  
  // Use mutate() to invalidate cache after actions
}
```

---

## Additional Resources

- **Complete Guide:** `docs/TEAM_MANAGEMENT_GUIDE.md`
- **Implementation Summary:** `TEAM_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
- **RBAC Documentation:** `lib/rbac/permissions.js` (inline comments)
- **Email Templates:** `lib/email/templates/` directory
- **Verification Script:** `scripts/verify-team-management.mjs`

---

## Support

**Questions?** Contact the development team at engineering@tenvo.app

**Found a bug?** File an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser and environment details

---

**Last Updated:** June 30, 2026
**Version:** 1.0.0
**Component:** TeamManagementPanel.jsx
