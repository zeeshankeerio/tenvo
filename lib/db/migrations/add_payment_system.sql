-- Payment System Migration
-- Adds comprehensive payment method support for storefront

-- 1. Payment Methods Table for Store Owners
CREATE TABLE IF NOT EXISTS business_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Payment Provider
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'cod', 'bank_transfer', 'easypaisa', 'jazzcash'
    
    -- Display Name for customers
    display_name VARCHAR(100) NOT NULL,
    
    -- Configuration (encrypted/sensitive)
    config JSONB DEFAULT '{}',
    
    -- For Stripe Connect
    stripe_account_id VARCHAR(100),
    stripe_account_type VARCHAR(20), -- 'standard', 'express', 'custom'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    is_test_mode BOOLEAN DEFAULT true,
    
    -- Fees configuration
    fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    fee_fixed DECIMAL(10,2) DEFAULT 0.00,
    
    -- Supported payment types
    supports_cod BOOLEAN DEFAULT false,
    supports_cards BOOLEAN DEFAULT false,
    supports_wallet BOOLEAN DEFAULT false,
    supports_bank_transfer BOOLEAN DEFAULT false,
    
    -- Metadata
    description TEXT,
    icon_url VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_business_provider UNIQUE (business_id, provider)
);

-- 2. Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Transaction Details
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(100),
    
    -- Amount
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    
    -- Payment Method Details
    payment_method_type VARCHAR(50), -- 'card', 'wallet', 'bank_transfer', 'cod'
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    
    -- Stripe Specific
    stripe_payment_intent_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),
    stripe_refund_id VARCHAR(100),
    
    -- Response Data
    provider_response JSONB,
    error_message TEXT,
    
    -- Refund Info
    refund_amount DECIMAL(12,2),
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'))
);

-- 3. Stripe Connect Accounts Table
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Stripe Account Info
    stripe_account_id VARCHAR(100) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL DEFAULT 'standard', -- 'standard', 'express', 'custom'
    
    -- Account Status
    is_charges_enabled BOOLEAN DEFAULT false,
    is_payouts_enabled BOOLEAN DEFAULT false,
    requirements_due JSONB DEFAULT '[]',
    
    -- Business Details (as submitted to Stripe)
    business_type VARCHAR(20), -- 'individual', 'company'
    business_profile JSONB,
    
    -- Capabilities
    card_payments_enabled BOOLEAN DEFAULT false,
    transfers_enabled BOOLEAN DEFAULT false,
    
    -- Onboarding
    onboarding_complete BOOLEAN DEFAULT false,
    onboarding_url TEXT,
    onboarding_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    default_currency VARCHAR(3) DEFAULT 'PKR',
    payout_schedule JSONB DEFAULT '{"interval": "manual"}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    stripe_connected_at TIMESTAMP WITH TIME ZONE
);

-- 4. Store Payment Settings
CREATE TABLE IF NOT EXISTS store_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- General Settings
    auto_capture_payments BOOLEAN DEFAULT true,
    require_billing_address BOOLEAN DEFAULT true,
    allow_save_cards BOOLEAN DEFAULT false,
    
    -- Currency Settings
    default_currency VARCHAR(3) DEFAULT 'PKR',
    supported_currencies JSONB DEFAULT '["PKR"]',
    
    -- Payment Options
    allow_cod BOOLEAN DEFAULT true,
    allow_prepaid BOOLEAN DEFAULT true,
    allow_partial_payments BOOLEAN DEFAULT false,
    
    -- Security
    require_cvv BOOLEAN DEFAULT true,
    require_3ds BOOLEAN DEFAULT false,
    max_payment_attempts INTEGER DEFAULT 3,
    
    -- Local Payment Methods
    enable_easypaisa BOOLEAN DEFAULT false,
    enable_jazzcash BOOLEAN DEFAULT false,
    enable_bank_transfer BOOLEAN DEFAULT false,
    
    -- Bank Transfer Details
    bank_account_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    bank_iban VARCHAR(50),
    
    -- Instructions
    payment_instructions TEXT,
    cod_instructions TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Customer Saved Cards (if enabled)
CREATE TABLE IF NOT EXISTS customer_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Provider
    provider VARCHAR(50) NOT NULL,
    
    -- Card Details (tokenized/secure)
    provider_customer_id VARCHAR(100),
    provider_payment_method_id VARCHAR(100),
    
    -- Masked Info for Display
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    -- Billing Details
    billing_name VARCHAR(100),
    billing_email VARCHAR(100),
    billing_phone VARCHAR(20),
    billing_address JSONB,
    
    -- Status
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_customer_default UNIQUE (customer_id, is_default) WHERE is_default = true
);

-- Create Indexes for Performance
CREATE INDEX idx_payment_methods_business ON business_payment_methods(business_id);
CREATE INDEX idx_payment_methods_active ON business_payment_methods(business_id, is_active);
CREATE INDEX idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_transactions_business ON payment_transactions(business_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_provider ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_stripe_accounts_business ON stripe_connect_accounts(business_id);
CREATE INDEX idx_customer_methods_customer ON customer_payment_methods(customer_id);

-- Create Updated At Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_payment_methods_updated_at 
    BEFORE UPDATE ON business_payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at 
    BEFORE UPDATE ON stripe_connect_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_payment_settings_updated_at 
    BEFORE UPDATE ON store_payment_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_payment_methods_updated_at 
    BEFORE UPDATE ON customer_payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
