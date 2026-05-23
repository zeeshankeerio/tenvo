-- ============================================
-- STOREFRONT TABLES MIGRATION - STANDALONE TABLES
-- No foreign keys to avoid dependency issues
-- ============================================

-- 1. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits, sort_order) 
VALUES
('Free', 'free', 'Perfect for getting started', 0, 0, '{"storefront": true}', '{"products": 100}', 1),
('Starter', 'starter', 'For small businesses', 29, 290, '{"storefront": true}', '{"products": 1000}', 2),
('Growth', 'growth', 'For growing businesses', 79, 790, '{"storefront": true}', '{"products": 10000}', 3),
('Enterprise', 'enterprise', 'For large businesses', 199, 1990, '{"storefront": true}', '{"products": -1}', 4)
ON CONFLICT (slug) DO NOTHING;

-- 2. BUSINESS SETTINGS (without FK constraint)
CREATE TABLE IF NOT EXISTS business_settings (
    id SERIAL PRIMARY KEY,
    business_id UUID NOT NULL,
    plan_id INTEGER,
    plan_tier VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    storefront_settings JSONB DEFAULT '{"enabled": true}',
    payment_settings JSONB DEFAULT '{}',
    shipping_settings JSONB DEFAULT '{}',
    tax_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);

-- 3. BUSINESS CUSTOM DOMAINS (without FK constraint)
CREATE TABLE IF NOT EXISTS business_custom_domains (
    id SERIAL PRIMARY KEY,
    business_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_business_custom_domains_domain ON business_custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_business_custom_domains_business_id ON business_custom_domains(business_id);

-- 4. PRODUCT CATEGORIES (without FK constraint)
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    business_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_business_id ON product_categories(business_id);

-- 5. STOREFRONT ORDERS (without FK constraint)
CREATE TABLE IF NOT EXISTS storefront_orders (
    id SERIAL PRIMARY KEY,
    business_id UUID NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_name VARCHAR(255),
    shipping_address JSONB,
    billing_address JSONB,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    shipping_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'PKR',
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storefront_orders_business_id ON storefront_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_status ON storefront_orders(status);
CREATE INDEX IF NOT EXISTS idx_storefront_orders_created_at ON storefront_orders(created_at);

-- 6. STOREFRONT ORDER ITEMS (without FK constraint)
CREATE TABLE IF NOT EXISTS storefront_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_storefront_order_items_order_id ON storefront_order_items(order_id);

-- 7. STOREFRONT ANALYTICS (without FK constraint)
CREATE TABLE IF NOT EXISTS storefront_analytics (
    business_id UUID NOT NULL,
    date DATE NOT NULL,
    orders_count INTEGER DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (business_id, date)
);
