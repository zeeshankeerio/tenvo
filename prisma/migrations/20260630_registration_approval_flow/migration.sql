-- Migration: Registration Approval Workflow
-- Date: 2026-06-30
-- Description: Adds approval workflow for new business registrations similar to Zoho/Busy
--              Platform owner can approve/reject registrations, users see pending approval page

-- Add approval columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) DEFAULT 'auto_approved',
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_decided_by TEXT,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS is_demo_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS demo_requested_at TIMESTAMPTZ;

-- Index for platform admin queries (most common: filter by status, sort by date)
CREATE INDEX IF NOT EXISTS idx_businesses_approval_status 
ON businesses(approval_status, approval_requested_at DESC);

-- Add check constraint for valid approval statuses
DO $$ BEGIN
  ALTER TABLE businesses
  ADD CONSTRAINT chk_approval_status CHECK (
    approval_status IN (
      'pending_approval',  -- Waiting for platform owner review
      'approved',          -- Access granted
      'rejected',          -- Access denied
      'info_requested',    -- More information needed
      'auto_approved'      -- Auto-approved (platform owners, existing businesses)
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add column comments for documentation
COMMENT ON COLUMN businesses.approval_status IS 'Registration approval workflow status - pending_approval, approved, rejected, info_requested, auto_approved';
COMMENT ON COLUMN businesses.approval_requested_at IS 'When registration approval was requested (timestamp of business creation)';
COMMENT ON COLUMN businesses.approval_decided_at IS 'When platform owner approved/rejected the registration';
COMMENT ON COLUMN businesses.approval_decided_by IS 'User ID of platform owner who decided approval/rejection';
COMMENT ON COLUMN businesses.approval_notes IS 'Platform admin notes about approval decision or requirements';
COMMENT ON COLUMN businesses.is_demo_requested IS 'Whether user clicked Book a Demo during pending approval state';
COMMENT ON COLUMN businesses.demo_requested_at IS 'When demo was requested by user during pending approval';

-- Create registration_requests table for comprehensive audit trail
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
  
  -- Request metadata (capture environment/context)
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  
  -- Status tracking (mirrors businesses.approval_status but maintains audit history)
  status VARCHAR(32) DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  
  -- Demo tracking (business development pipeline)
  demo_requested BOOLEAN DEFAULT FALSE,
  demo_requested_at TIMESTAMPTZ,
  demo_scheduled_at TIMESTAMPTZ,
  demo_completed BOOLEAN DEFAULT FALSE,
  
  -- Platform owner notes and categorization
  internal_notes TEXT,
  tags TEXT[], -- ['high-value', 'needs-follow-up', 'competitor', 'urgent']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries in admin panel
CREATE INDEX IF NOT EXISTS idx_registration_requests_status 
ON registration_requests(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_registration_requests_user 
ON registration_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_registration_requests_business 
ON registration_requests(business_id);

CREATE INDEX IF NOT EXISTS idx_registration_requests_demo 
ON registration_requests(demo_requested, demo_requested_at DESC) 
WHERE demo_requested = TRUE;

COMMENT ON TABLE registration_requests IS 'Comprehensive audit trail for all registration approval requests - tracks entire lifecycle from request to decision';
COMMENT ON COLUMN registration_requests.status IS 'Current status - pending, approved, rejected, info_requested';
COMMENT ON COLUMN registration_requests.tags IS 'Internal categorization tags for sales pipeline management';

-- Update existing businesses to auto_approved (grandfather existing businesses)
-- Only update businesses without an approval_status value
UPDATE businesses 
SET 
  approval_status = 'auto_approved',
  approval_requested_at = created_at,
  approval_decided_at = created_at,
  approval_decided_by = user_id,
  approval_notes = 'Existing business - auto-approved during migration'
WHERE approval_status IS NULL OR approval_status = '';

-- Ensure all businesses have an approval status (default to auto_approved for safety)
UPDATE businesses 
SET approval_status = 'auto_approved'
WHERE approval_status IS NULL;

-- Make approval_status NOT NULL after setting defaults
ALTER TABLE businesses 
ALTER COLUMN approval_status SET NOT NULL;
