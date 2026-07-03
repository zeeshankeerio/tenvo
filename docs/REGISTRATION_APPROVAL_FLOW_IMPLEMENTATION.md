# Registration Approval Flow - Implementation Guide

## Date: 2026-06-30

## 🎯 Objective

Implement a professional onboarding flow similar to **Zoho** and **Busy** where:
1. User registers and creates account
2. Email verification required
3. **Platform owner receives notification** for access approval
4. User sees "**Pending Approval**" page instead of direct dashboard access
5. **"Book a Demo" option** for immediate sales engagement
6. Platform owner has **admin panel** to approve/reject/manage registrations
7. **Subscription control** and **access management** from platform admin
8. Email notifications to user when approved/rejected

---

## 📋 Current Flow vs Desired Flow

### **Current Flow** (Direct Access):
```
User Registration
  ↓
Email Verification
  ↓
Business Creation
  ↓
✅ Direct Dashboard Access
```

### **Desired Flow** (Approval Required):
```
User Registration
  ↓
Email Verification
  ↓
Business Creation (status: pending_approval)
  ↓
📧 Notification to Platform Owner
  ↓
⏳ User sees "Pending Approval" Page
  │   ├─ "Your request is under review"
  │   ├─ "Book a Demo" button
  │   └─ "Contact Support" link
  ↓
Platform Owner Reviews
  │   ├─ Approve → Status: active
  │   ├─ Reject → Status: rejected
  │   └─ Request Info → Status: info_requested
  ↓
📧 Email to User (Approved/Rejected)
  ↓
✅ Dashboard Access (if approved)
```

---

## 🗄️ Database Schema Changes

### 1. **Add `approval_status` to businesses table**

```sql
-- Migration: Add approval status to businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'pending_approval',
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_by TEXT,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS is_demo_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS demo_requested_at TIMESTAMPTZ;

-- Index for platform admin queries
CREATE INDEX IF NOT EXISTS idx_businesses_approval_status ON businesses(approval_status, approval_requested_at DESC);

-- Check constraint for valid statuses
ALTER TABLE businesses
ADD CONSTRAINT chk_approval_status CHECK (
  approval_status IN (
    'pending_approval',  -- Waiting for platform owner review
    'approved',          -- Access granted
    'rejected',          -- Access denied
    'info_requested',    -- More information needed
    'auto_approved'      -- Auto-approved (platform owners, whitelisted emails)
  )
);

COMMENT ON COLUMN businesses.approval_status IS 'Registration approval workflow status';
COMMENT ON COLUMN businesses.approval_requested_at IS 'When registration approval was requested';
COMMENT ON COLUMN businesses.approval_decided_at IS 'When platform owner approved/rejected';
COMMENT ON COLUMN businesses.approval_decided_by IS 'User ID of platform owner who decided';
COMMENT ON COLUMN businesses.is_demo_requested IS 'Whether user clicked Book a Demo';
COMMENT ON COLUMN businesses.demo_requested_at IS 'When demo was requested';
```

### 2. **Add registration_requests table for audit trail**

```sql
-- Table: registration_requests
-- Comprehensive audit trail for all registration attempts
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  business_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  plan_tier TEXT NOT NULL,
  domain_package_key TEXT,
  
  -- Request metadata
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  
  -- Status tracking
  status VARCHAR(32) DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  
  -- Demo tracking
  demo_requested BOOLEAN DEFAULT FALSE,
  demo_requested_at TIMESTAMPTZ,
  demo_scheduled_at TIMESTAMPTZ,
  demo_completed BOOLEAN DEFAULT FALSE,
  
  -- Platform owner notes
  internal_notes TEXT,
  tags TEXT[], -- ['high-value', 'needs-follow-up', 'competitor']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registration_requests_status ON registration_requests(status, requested_at DESC);
CREATE INDEX idx_registration_requests_user ON registration_requests(user_id);
CREATE INDEX idx_registration_requests_business ON registration_requests(business_id);
CREATE INDEX idx_registration_requests_demo ON registration_requests(demo_requested, demo_requested_at DESC) WHERE demo_requested = TRUE;

COMMENT ON TABLE registration_requests IS 'Audit trail for all registration approval requests';
```

---

## 🔧 Implementation Files

### 1. **Registration Approval Action**

**File**: `lib/actions/admin/registrationApproval.js` (NEW)

```javascript
'use server';

import { prismaBase } from '@/lib/db';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/auth/platformOwners';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { RegistrationApprovedEmail } from '@/lib/email/templates/RegistrationApprovedEmail';
import { RegistrationRejectedEmail } from '@/lib/email/templates/RegistrationRejectedEmail';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from '@/lib/notifications/notificationHelpers';

/**
 * Get all pending registration requests (Platform Owner Only)
 */
export async function getPendingRegistrations() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized - Platform owner access required' };
  }

  try {
    const requests = await prismaBase.registration_requests.findMany({
      where: {
        status: {
          in: ['pending', 'info_requested']
        }
      },
      orderBy: {
        requested_at: 'desc'
      },
      take: 100
    });

    return { success: true, requests };
  } catch (error) {
    console.error('[getPendingRegistrations] Error:', error);
    return { success: false, error: 'Failed to fetch pending registrations' };
  }
}

/**
 * Approve a registration request
 */
export async function approveRegistration({ businessId, notes = '' }) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized - Platform owner access required' };
  }

  try {
    const result = await prismaBase.$transaction(async (tx) => {
      // Update business status
      const business = await tx.businesses.update({
        where: { id: businessId },
        data: {
          approval_status: 'approved',
          approval_decided_at: new Date(),
          approval_decided_by: session.user.id,
          approval_notes: notes,
          is_active: true
        },
        select: {
          id: true,
          business_name: true,
          email: true,
          domain: true,
          user_id: true
        }
      });

      // Update registration request
      await tx.registration_requests.updateMany({
        where: { business_id: businessId },
        data: {
          status: 'approved',
          status_updated_at: new Date(),
          decided_by: session.user.id,
          decided_at: new Date(),
          decision_notes: notes
        }
      });

      return business;
    });

    // Send approval email
    await sendTransactionalEmail({
      to: result.email,
      subject: `Welcome to Tenvo - Your ${result.business_name} workspace is ready!`,
      react: RegistrationApprovedEmail({
        businessName: result.business_name,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/business/${result.domain}`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@tenvo.app'
      })
    });

    // Create notification for user
    await createNotification({
      businessId: result.id,
      userId: result.user_id,
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'Registration Approved',
      message: `Your ${result.business_name} workspace has been approved and is now active!`,
      actionUrl: `/business/${result.domain}?tab=dashboard`,
      priority: NOTIFICATION_PRIORITY.HIGH
    });

    return { success: true, business: result };
  } catch (error) {
    console.error('[approveRegistration] Error:', error);
    return { success: false, error: 'Failed to approve registration' };
  }
}

/**
 * Reject a registration request
 */
export async function rejectRegistration({ businessId, reason = '' }) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized - Platform owner access required' };
  }

  try {
    const result = await prismaBase.$transaction(async (tx) => {
      // Update business status
      const business = await tx.businesses.update({
        where: { id: businessId },
        data: {
          approval_status: 'rejected',
          approval_decided_at: new Date(),
          approval_decided_by: session.user.id,
          approval_notes: reason,
          is_active: false
        },
        select: {
          id: true,
          business_name: true,
          email: true
        }
      });

      // Update registration request
      await tx.registration_requests.updateMany({
        where: { business_id: businessId },
        data: {
          status: 'rejected',
          status_updated_at: new Date(),
          decided_by: session.user.id,
          decided_at: new Date(),
          decision_notes: reason
        }
      });

      return business;
    });

    // Send rejection email
    await sendTransactionalEmail({
      to: result.email,
      subject: 'Tenvo Registration Update',
      react: RegistrationRejectedEmail({
        businessName: result.business_name,
        reason: reason || 'Your registration did not meet our current requirements.',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@tenvo.app'
      })
    });

    return { success: true, business: result };
  } catch (error) {
    console.error('[rejectRegistration] Error:', error);
    return { success: false, error: 'Failed to reject registration' };
  }
}

/**
 * Request more information from user
 */
export async function requestMoreInfo({ businessId, message }) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized - Platform owner access required' };
  }

  try {
    const business = await prismaBase.businesses.update({
      where: { id: businessId },
      data: {
        approval_status: 'info_requested',
        approval_notes: message
      },
      select: {
        id: true,
        business_name: true,
        email: true,
        user_id: true
      }
    });

    // Create notification for user
    await createNotification({
      businessId: business.id,
      userId: business.user_id,
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'More Information Needed',
      message: message || 'We need additional information to complete your registration.',
      priority: NOTIFICATION_PRIORITY.HIGH
    });

    return { success: true, business };
  } catch (error) {
    console.error('[requestMoreInfo] Error:', error);
    return { success: false, error: 'Failed to request information' };
  }
}

/**
 * Record demo request
 */
export async function recordDemoRequest({ businessId }) {
  try {
    await prismaBase.$transaction(async (tx) => {
      // Update business
      await tx.businesses.update({
        where: { id: businessId },
        data: {
          is_demo_requested: true,
          demo_requested_at: new Date()
        }
      });

      // Update registration request
      await tx.registration_requests.updateMany({
        where: { business_id: businessId },
        data: {
          demo_requested: true,
          demo_requested_at: new Date()
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[recordDemoRequest] Error:', error);
    return { success: false, error: 'Failed to record demo request' };
  }
}
```

---

### 2. **Modified createBusiness Action**

**File**: `lib/actions/basic/business.js` (MODIFY)

Add approval logic after business creation:

```javascript
// After business creation, before returning
const ownerIsplatform = isPlatformOwner(email);

// Determine initial approval status
const approvalStatus = ownerIsplatform ? 'auto_approved' : 'pending_approval';

// Update business with approval status
await tx.businesses.update({
  where: { id: biz.id },
  data: {
    approval_status: approvalStatus,
    approval_requested_at: new Date(),
    ...(ownerIsplatform ? {
      approval_decided_at: new Date(),
      approval_decided_by: userId,
      approval_notes: 'Auto-approved - Platform owner'
    } : {})
  }
});

// Create registration request audit trail
await tx.registration_requests.create({
  data: {
    business_id: biz.id,
    user_id: userId,
    user_email: email,
    user_name: businessName,
    business_name: businessName,
    domain: normalizedDomain,
    category: registrationCategory,
    country: regional.countryName,
    phone: phone || null,
    plan_tier: effectivePlanTier,
    domain_package_key: domainPackageKey || null,
    status: ownerIsplatform ? 'auto_approved' : 'pending',
    ...(ownerIsplatform ? {
      status_updated_at: new Date(),
      decided_by: userId,
      decided_at: new Date(),
      decision_notes: 'Auto-approved - Platform owner'
    } : {})
  }
});

// If not platform owner, send notification to platform admins
if (!ownerIsplatform) {
  await notifyPlatformOwnersNewRegistration({
    businessId: biz.id,
    businessName,
    email,
    category: registrationCategory,
    country: regional.countryName,
    planTier: effectivePlanTier
  });
}
```

---

### 3. **Pending Approval Page**

**File**: `app/pending-approval/page.jsx` (NEW)

```jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Calendar, Mail, Phone, ExternalLink } from 'lucide-react';
import { businessAPI } from '@/lib/api/business';
import { recordDemoRequest } from '@/lib/actions/admin/registrationApproval';
import { toast } from 'react-hot-toast';
import { getBookMeetingHref } from '@/lib/marketing/salesLinks';

export default function PendingApprovalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoRequested, setDemoRequested] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchBusiness = async () => {
      try {
        const businesses = await businessAPI.getByUserId(user.id);
        if (businesses?.length > 0) {
          const biz = businesses[0];
          
          // If approved, redirect to dashboard
          if (biz.approval_status === 'approved' || biz.approval_status === 'auto_approved') {
            router.push(`/business/${biz.domain}`);
            return;
          }
          
          setBusiness(biz);
          setDemoRequested(biz.is_demo_requested || false);
        }
      } catch (error) {
        console.error('Failed to fetch business:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [user, router]);

  const handleBookDemo = async () => {
    if (business) {
      try {
        await recordDemoRequest({ businessId: business.id });
        setDemoRequested(true);
        toast.success('Demo request recorded!');
        // Open Calendly or redirect to booking page
        window.open(getBookMeetingHref(), '_blank');
      } catch (error) {
        console.error('Failed to record demo request:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 shadow-xl">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Registration Under Review
            </h1>
            <p className="text-lg text-gray-600">
              Thank you for registering <span className="font-semibold text-wine">{business?.business_name}</span>
            </p>
          </div>

          {/* Status Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="text-gray-700 leading-relaxed">
              Your registration has been submitted and is currently being reviewed by our team. 
              We typically process new registrations within <strong>24-48 hours</strong> during business days.
            </p>
          </div>

          {/* Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-left space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{business?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Submitted:</span>
              <span className="font-medium text-gray-900">
                {business?.approval_requested_at 
                  ? new Date(business.approval_requested_at).toLocaleDateString()
                  : 'Recently'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4 pt-4">
            <Button
              size="lg"
              onClick={handleBookDemo}
              disabled={demoRequested}
              className="w-full bg-wine hover:bg-wine/90 text-white h-14 text-lg font-semibold"
            >
              <Calendar className="w-5 h-5 mr-2" />
              {demoRequested ? 'Demo Requested ✓' : 'Book a Demo Call'}
            </Button>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tenvo.app'}`}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="flex-1"
              >
                Back to Home
              </Button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-gray-500 pt-6">
            You will receive an email notification once your registration is approved. 
            If you have any questions, please contact our support team.
          </p>
        </div>
      </Card>
    </div>
  );
}
```

---

### 4. **Platform Admin Panel**

**File**: `app/admin/registrations/page.jsx` (NEW)

```jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { isPlatformOwner } from '@/lib/auth/platformOwners';
import { 
  getPendingRegistrations, 
  approveRegistration, 
  rejectRegistration,
  requestMoreInfo 
} from '@/lib/actions/admin/registrationApproval';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Info, Calendar, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RegistrationApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!user || !isPlatformOwner(user.email)) {
      window.location.href = '/';
      return;
    }

    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    const result = await getPendingRegistrations();
    if (result.success) {
      setRequests(result.requests);
    }
    setLoading(false);
  };

  const handleApprove = async (businessId) => {
    setProcessing(businessId);
    const result = await approveRegistration({ businessId });
    if (result.success) {
      toast.success('Registration approved!');
      loadRequests();
    } else {
      toast.error(result.error);
    }
    setProcessing(null);
  };

  const handleReject = async (businessId, reason) => {
    setProcessing(businessId);
    const result = await rejectRegistration({ businessId, reason });
    if (result.success) {
      toast.success('Registration rejected');
      loadRequests();
    } else {
      toast.error(result.error);
    }
    setProcessing(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Registration Approvals</h1>
        
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{request.business_name}</h3>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span><Mail className="inline w-4 h-4 mr-1" />{request.user_email}</span>
                    <span>Category: {request.category}</span>
                    <span>Plan: {request.plan_tier}</span>
                    <span>Country: {request.country}</span>
                  </div>
                  {request.demo_requested && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Demo Requested
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.business_id)}
                    disabled={processing === request.business_id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(request.business_id, 'Registration declined')}
                    disabled={processing === request.business_id}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🔐 Platform Owner Access Control

### Environment Variables:

```env
# Platform Owner Emails (comma-separated)
PLATFORM_OWNER_EMAILS=admin@tenvo.app,owner@tenvo.app

# Support Email
SUPPORT_EMAIL=support@tenvo.app

# Enable/Disable Approval Flow
REGISTRATION_APPROVAL_REQUIRED=true
```

### Helper Function:

**File**: `lib/auth/platformOwners.js`

```javascript
const PLATFORM_OWNER_EMAILS = (process.env.PLATFORM_OWNER_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function isPlatformOwner(email) {
  if (!email) return false;
  return PLATFORM_OWNER_EMAILS.includes(email.toLowerCase());
}

export function getPlatformOwners() {
  return PLATFORM_OWNER_EMAILS;
}
```

---

## 📧 Email Notifications

### Platform Owner Notification:

**Function**: `notifyPlatformOwnersNewRegistration()`

```javascript
import { sendTransactionalEmail } from '@/lib/email/resend';
import { getPlatformOwners } from '@/lib/auth/platformOwners';

export async function notifyPlatformOwnersNewRegistration({ 
  businessId, 
  businessName, 
  email, 
  category, 
  country,
  planTier 
}) {
  const owners = getPlatformOwners();
  
  for (const ownerEmail of owners) {
    await sendTransactionalEmail({
      to: ownerEmail,
      subject: `New Registration: ${businessName}`,
      react: NewRegistrationNotificationEmail({
        businessName,
        email,
        category,
        country,
        planTier,
        approvalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/registrations`
      })
    });
  }
}
```

---

## ✅ Implementation Checklist

### Database:
- [ ] Run migration to add `approval_status` column
- [ ] Create `registration_requests` table
- [ ] Add indexes for performance

### Backend:
- [ ] Create `registrationApproval.js` actions
- [ ] Modify `createBusiness()` to set approval status
- [ ] Add platform owner notification function
- [ ] Create email templates (approved, rejected, new registration)

### Frontend:
- [ ] Create `/pending-approval` page
- [ ] Create `/admin/registrations` panel
- [ ] Modify registration redirect logic
- [ ] Add "Book a Demo" functionality

### Access Control:
- [ ] Set `PLATFORM_OWNER_EMAILS` env variable
- [ ] Test platform owner detection
- [ ] Test approval workflow

### Notifications:
- [ ] Email to platform owner on new registration
- [ ] Email to user on approval
- [ ] Email to user on rejection
- [ ] In-app notification on approval

---

## 🎯 Success Metrics

- ✅ Users see "Pending Approval" after registration
- ✅ Platform owners receive email notifications
- ✅ Platform owners can approve/reject from admin panel
- ✅ Users receive email when approved/rejected
- ✅ "Book a Demo" tracked in database
- ✅ Platform owners auto-approved (bypass flow)
- ✅ Complete audit trail in `registration_requests`

---

**Status**: 📋 READY FOR IMPLEMENTATION  
**Next**: Create database migration and implement backend logic
