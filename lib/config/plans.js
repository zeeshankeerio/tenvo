/**
 * Plan Tier Configuration -- 5-Tier Model
 * Defines feature access, usage limits, and pricing tiers
 * Competitive with Zoho, Odoo, and Pakistani POS market leaders
 * 
 * Tiers: free -> starter -> professional -> business -> enterprise
 * 
 * Module Groups:
 *   CORE        -- Invoicing, Inventory, Customers, Vendors, Purchases, Basic Reports
 *   POS         -- Point of Sale, Refunds, Barcode Scanning
 *   FINANCE     -- Expenses, Credit Notes, Payments, Journal Entries, Fiscal Periods, Tax/GST
 *   OPERATIONS  -- Multi-Warehouse, Batch/Serial Tracking, Manufacturing, Delivery Challans
 *   CRM         -- Loyalty Programs, Campaigns, Promotions, Price Lists
 *   HR          -- Payroll, Attendance, Shift Scheduling
 *   INTELLIGENCE -- AI Analytics, Demand Forecasting, Smart Restock, Custom Reports
 *   GOVERNANCE  -- Approval Workflows, Audit Logs, Multi-Branch, Multi-Domain
 *   PLATFORM    -- API Access, White Label, Custom Workflows, Priority Support
 */

export const PLAN_TIERS = {
    // ----------------------------------
    // TIER 1: FREE -- Solo / Micro-business
    // ----------------------------------
    free: {
        key: 'free',
        name: 'Free',
        tagline: 'Perfect for solo entrepreneurs getting started',
        description: 'Core invoicing, inventory, and customer management for micro-businesses',
        price_pkr: 0,
        price_usd: 0,
        billing: 'free',
        badge: null,
        limits: {
            max_users: 1,
            max_products: 50,
            max_customers: 50,
            max_vendors: 25,
            max_warehouses: 1,
            max_invoices_per_month: 30,
            max_pos_terminals: 0,
            max_storage_mb: 50,
            max_branches: 1,
        },
        modules: {
            core: true,
            pos: false,
            finance: false,
            operations: false,
            crm: false,
            hr: false,
            intelligence: false,
            governance: false,
            platform: false,
        },
        features: {
            // CORE -- always available
            invoicing: true,
            purchases: true,
            customers: true,
            vendors: true,
            basic_accounting: true,
            basic_reports: true,
            quotations: true,

            // POS
            pos: false,
            pos_refunds: false,
            barcode_scanning: false,
            restaurant_pos: false,
            restaurant_kds: false,

            // FINANCE
            expense_tracking: false,
            credit_notes: false,
            payment_allocations: false,
            fiscal_periods: false,
            multi_currency: false,
            exchange_rates: false,
            tax_compliance: false,

            // OPERATIONS
            multi_warehouse: false,
            batch_tracking: false,
            serial_tracking: false,
            manufacturing: false,
            delivery_challans: false,
            stock_reservations: false,

            // CRM
            loyalty_programs: false,
            campaigns: false,
            promotions_crm: false,
            price_lists: false,
            supplier_quotes: false,

            // HR
            payroll: false,
            attendance_tracking: false,
            shift_scheduling: false,

            // INTELLIGENCE
            ai_analytics: false,
            ai_forecasting: false,
            ai_restock: false,
            advanced_reports: false,
            custom_reports: false,

            // GOVERNANCE
            approval_workflows: false,
            audit_logs: false,
            multi_branch: false,
            multi_domain: false,

            // PLATFORM
            custom_workflows: false,
            api_access: false,
            priority_support: false,
            white_label: false,
            webhook_integrations: false,

            /** Storefront / online orders tab — default on; disable via `settings.packaging` for modular SKUs */
            storefront_orders: true,
            /** Sales workspace tab — default on; disable via `settings.packaging` for modular SKUs */
            sales_hub: true,
        },
    },

    // ----------------------------------
    // TIER 2: STARTER -- Small shops & stores
    // ----------------------------------
    starter: {
        key: 'starter',
        name: 'Starter',
        tagline: 'POS + Inventory for growing retail businesses',
        description: 'Point of Sale, expense tracking, credit notes, and basic financial tools',
        price_pkr: 1499,       // ~$5/mo -- undercuts Pakistani market
        price_usd: 5,
        billing: 'monthly',
        badge: null,
        limits: {
            max_users: 3,
            max_products: 250,
            max_customers: 200,
            max_vendors: 100,
            max_warehouses: 1,
            max_invoices_per_month: 200,
            max_pos_terminals: 1,
            max_storage_mb: 250,
            max_branches: 1,
        },
        modules: {
            core: true,
            pos: true,
            finance: true,
            operations: false,
            crm: false,
            hr: false,
            intelligence: false,
            governance: false,
            platform: false,
        },
        features: {
            // CORE
            invoicing: true,
            purchases: true,
            customers: true,
            vendors: true,
            basic_accounting: true,
            basic_reports: true,
            quotations: true,

            // POS
            pos: true,
            pos_refunds: true,
            barcode_scanning: true,
            restaurant_pos: false,
            restaurant_kds: false,

            // FINANCE
            expense_tracking: true,
            credit_notes: true,
            payment_allocations: true,
            fiscal_periods: false,
            multi_currency: false,
            exchange_rates: false,
            tax_compliance: true,

            // OPERATIONS
            multi_warehouse: false,
            batch_tracking: false,
            serial_tracking: false,
            manufacturing: false,
            delivery_challans: false,
            stock_reservations: false,

            // CRM
            loyalty_programs: false,
            campaigns: false,
            promotions_crm: false,
            price_lists: false,
            supplier_quotes: false,

            // HR
            payroll: false,
            attendance_tracking: false,
            shift_scheduling: false,

            // INTELLIGENCE
            ai_analytics: false,
            ai_forecasting: false,
            ai_restock: false,
            advanced_reports: false,
            custom_reports: false,

            // GOVERNANCE
            approval_workflows: false,
            audit_logs: false,
            multi_branch: false,
            multi_domain: false,

            // PLATFORM
            custom_workflows: false,
            api_access: false,
            priority_support: false,
            white_label: false,
            webhook_integrations: false,

            storefront_orders: true,
            sales_hub: true,
        },
    },

    // ----------------------------------
    // TIER 3: PROFESSIONAL -- Growing businesses
    // ----------------------------------
    professional: {
        key: 'professional',
        name: 'Professional',
        tagline: 'Multi-warehouse, CRM, and advanced operations',
        description: 'Complete inventory operations with batch/serial tracking, loyalty, and multi-location',
        price_pkr: 3999,       // ~$14/mo
        price_usd: 14,
        billing: 'monthly',
        badge: 'Popular',
        limits: {
            max_users: 8,
            max_products: 2000,
            max_customers: 1000,
            max_vendors: 500,
            max_warehouses: 5,
            max_invoices_per_month: 1000,
            max_pos_terminals: 3,
            max_storage_mb: 1000,
            max_branches: 3,
        },
        modules: {
            core: true,
            pos: true,
            finance: true,
            operations: true,
            crm: true,
            hr: false,
            intelligence: false,
            governance: false,
            platform: false,
        },
        features: {
            // CORE
            invoicing: true,
            purchases: true,
            customers: true,
            vendors: true,
            basic_accounting: true,
            basic_reports: true,
            quotations: true,

            // POS
            pos: true,
            pos_refunds: true,
            barcode_scanning: true,
            restaurant_pos: true,
            restaurant_kds: false,

            // FINANCE
            expense_tracking: true,
            credit_notes: true,
            payment_allocations: true,
            fiscal_periods: true,
            multi_currency: false,
            exchange_rates: false,
            tax_compliance: true,

            // OPERATIONS
            multi_warehouse: true,
            batch_tracking: true,
            serial_tracking: true,
            manufacturing: false,
            delivery_challans: true,
            stock_reservations: true,

            // CRM
            loyalty_programs: true,
            campaigns: false,
            promotions_crm: true,
            price_lists: true,
            supplier_quotes: true,

            // HR
            payroll: false,
            attendance_tracking: false,
            shift_scheduling: false,

            // INTELLIGENCE
            ai_analytics: false,
            ai_forecasting: false,
            ai_restock: false,
            advanced_reports: true,
            custom_reports: false,

            // GOVERNANCE
            approval_workflows: false,
            audit_logs: false,
            multi_branch: false,
            multi_domain: false,

            // PLATFORM
            custom_workflows: false,
            api_access: false,
            priority_support: false,
            white_label: false,
            webhook_integrations: false,

            storefront_orders: true,
            sales_hub: true,
        },
    },

    // ----------------------------------
    // TIER 4: BUSINESS -- Full ERP suite
    // ----------------------------------
    business: {
        key: 'business',
        name: 'Business',
        tagline: 'Full ERP with HR, manufacturing, and AI insights',
        description: 'Everything in Professional plus payroll, manufacturing, AI analytics, and governance',
        price_pkr: 9999,       // ~$35/mo
        price_usd: 35,
        billing: 'monthly',
        badge: 'Best Value',
        limits: {
            max_users: 25,
            max_products: 10000,
            max_customers: 5000,
            max_vendors: 2000,
            max_warehouses: 15,
            max_invoices_per_month: 10000,
            max_pos_terminals: 10,
            max_storage_mb: 5000,
            max_branches: 10,
        },
        modules: {
            core: true,
            pos: true,
            finance: true,
            operations: true,
            crm: true,
            hr: true,
            intelligence: true,
            governance: true,
            platform: false,
        },
        features: {
            // CORE
            invoicing: true,
            purchases: true,
            customers: true,
            vendors: true,
            basic_accounting: true,
            basic_reports: true,
            quotations: true,

            // POS
            pos: true,
            pos_refunds: true,
            barcode_scanning: true,
            restaurant_pos: true,
            restaurant_kds: true,

            // FINANCE
            expense_tracking: true,
            credit_notes: true,
            payment_allocations: true,
            fiscal_periods: true,
            multi_currency: true,
            exchange_rates: true,
            tax_compliance: true,

            // OPERATIONS
            multi_warehouse: true,
            batch_tracking: true,
            serial_tracking: true,
            manufacturing: true,
            delivery_challans: true,
            stock_reservations: true,

            // CRM
            loyalty_programs: true,
            campaigns: true,
            promotions_crm: true,
            price_lists: true,
            supplier_quotes: true,

            // HR
            payroll: true,
            attendance_tracking: true,
            shift_scheduling: true,

            // INTELLIGENCE - AI & GenAI
            ai_analytics: true,
            ai_forecasting: true,
            ai_restock: true,
            ai_price_optimization: false,
            ai_promotion_recommendations: true,
            ai_churn_prediction: false,
            advanced_reports: true,
            custom_reports: true,
            
            // GENAI - Professional Tier
            genai_product_descriptions: true,
            genai_content_writer: false,
            genai_email_campaigns: false,
            genai_chatbot: false,
            genai_business_analyst: true,
            genai_procurement_agent: false,
            semantic_search: true,
            ai_anomaly_detection: true,
            
            // MARKETING AUTOMATION
            marketing_automation: true,
            email_campaigns: true,
            sms_campaigns: true,
            whatsapp_business: false,
            social_media_posting: false,
            lead_capture_forms: true,
            lead_scoring: false,
            lead_nurturing: true,
            customer_journey_mapping: false,
            abandoned_cart_recovery: true,
            review_requests: true,
            referral_programs: false,
            
            // CUSTOMER ENGAGEMENT
            customer_portal: true,
            vendor_portal: false,
            appointment_booking: true,
            feedback_surveys: true,
            helpdesk_tickets: true,
            live_chat: true,

            // GOVERNANCE
            approval_workflows: true,
            audit_logs: true,
            multi_branch: true,
            multi_domain: false,

            // PLATFORM
            custom_workflows: false,
            api_access: true,
            priority_support: true,
            white_label: false,
            webhook_integrations: true,

            storefront_orders: true,
            sales_hub: true,
        },
    },

    // ----------------------------------
    // TIER 5: ENTERPRISE -- Unlimited, white-label
    // ----------------------------------
    enterprise: {
        key: 'enterprise',
        name: 'Enterprise',
        tagline: 'Unlimited everything with white-label and dedicated support',
        description: 'Multi-domain, multi-branch, API access, custom workflows, and white-label branding',
        price_pkr: 29999,      // ~$99/mo
        price_usd: 99,
        billing: 'monthly',
        badge: null,
        limits: {
            max_users: -1,       // Unlimited
            max_products: -1,
            max_customers: -1,
            max_vendors: -1,
            max_warehouses: -1,
            max_invoices_per_month: -1,
            max_pos_terminals: -1,
            max_storage_mb: -1,   // Unlimited
            max_branches: -1,
        },
        modules: {
            core: true,
            pos: true,
            finance: true,
            operations: true,
            crm: true,
            hr: true,
            intelligence: true,
            governance: true,
            platform: true,
        },
        features: {
            // CORE
            invoicing: true,
            purchases: true,
            customers: true,
            vendors: true,
            basic_accounting: true,
            basic_reports: true,
            quotations: true,

            // POS
            pos: true,
            pos_refunds: true,
            barcode_scanning: true,
            restaurant_pos: true,
            restaurant_kds: true,

            // FINANCE
            expense_tracking: true,
            credit_notes: true,
            payment_allocations: true,
            fiscal_periods: true,
            multi_currency: true,
            exchange_rates: true,
            tax_compliance: true,

            // OPERATIONS
            multi_warehouse: true,
            batch_tracking: true,
            serial_tracking: true,
            manufacturing: true,
            delivery_challans: true,
            stock_reservations: true,

            // CRM
            loyalty_programs: true,
            campaigns: true,
            promotions_crm: true,
            price_lists: true,
            supplier_quotes: true,

            // HR
            payroll: true,
            attendance_tracking: true,
            shift_scheduling: true,

            // INTELLIGENCE - Full AI Suite
            ai_analytics: true,
            ai_forecasting: true,
            ai_restock: true,
            ai_price_optimization: true,
            ai_promotion_recommendations: true,
            ai_churn_prediction: true,
            advanced_reports: true,
            custom_reports: true,
            
            // GENAI - Full Generative AI Suite
            genai_product_descriptions: true,
            genai_content_writer: true,
            genai_email_campaigns: true,
            genai_chatbot: true,
            genai_business_analyst: true,
            genai_procurement_agent: true,
            semantic_search: true,
            ai_anomaly_detection: true,
            
            // MARKETING AUTOMATION - Full Suite
            marketing_automation: true,
            email_campaigns: true,
            sms_campaigns: true,
            whatsapp_business: true,
            social_media_posting: true,
            lead_capture_forms: true,
            lead_scoring: true,
            lead_nurturing: true,
            customer_journey_mapping: true,
            abandoned_cart_recovery: true,
            review_requests: true,
            referral_programs: true,
            
            // CUSTOMER ENGAGEMENT - Full Suite
            customer_portal: true,
            vendor_portal: true,
            appointment_booking: true,
            feedback_surveys: true,
            helpdesk_tickets: true,
            live_chat: true,

            // GOVERNANCE
            approval_workflows: true,
            audit_logs: true,
            multi_branch: true,
            multi_domain: true,

            // PLATFORM
            custom_workflows: true,
            api_access: true,
            priority_support: true,
            white_label: true,
            webhook_integrations: true,

            storefront_orders: true,
            sales_hub: true,
        },
    },
};

// --- Module Labels (for plan comparison cards) -----------------------------

export const MODULE_LABELS = {
    core: 'Core Business',
    pos: 'Point of Sale',
    finance: 'Finance & Accounting',
    operations: 'Operations & Logistics',
    crm: 'CRM & Marketing',
    hr: 'HR & Payroll',
    intelligence: 'AI & Analytics',
    governance: 'Governance & Compliance',
    platform: 'Platform & API',
};

// --- Human-Readable Feature Labels -------------------------------------------

export const FEATURE_LABELS = {
    // CORE
    invoicing: 'Invoicing',
    purchases: 'Purchase Management',
    customers: 'Customer Management',
    vendors: 'Vendor Management',
    basic_accounting: 'Basic Accounting',
    basic_reports: 'Basic Reports',
    quotations: 'Quotations & Estimates',
    storefront_orders: 'Online store orders',
    sales_hub: 'Sales workspace',

    // POS
    pos: 'Point of Sale',
    pos_refunds: 'POS Refunds & Returns',
    barcode_scanning: 'Barcode Scanning',
    restaurant_pos: 'Restaurant POS',
    restaurant_kds: 'Kitchen Display System',

    // FINANCE
    expense_tracking: 'Expense Tracking',
    credit_notes: 'Credit Notes',
    payment_allocations: 'Payment Allocations',
    fiscal_periods: 'Fiscal Period Management',
    multi_currency: 'Multi-Currency',
    exchange_rates: 'Exchange Rate Management',
    tax_compliance: 'Tax / GST Compliance',

    // OPERATIONS
    multi_warehouse: 'Multi-Warehouse',
    batch_tracking: 'Batch Tracking',
    serial_tracking: 'Serial Number Tracking',
    manufacturing: 'Manufacturing & BOM',
    delivery_challans: 'Delivery Challans',
    stock_reservations: 'Stock Reservations',

    // CRM
    loyalty_programs: 'Loyalty Programs',
    campaigns: 'Campaigns & Marketing',
    promotions_crm: 'Promotions & CRM',
    price_lists: 'Price Lists',
    supplier_quotes: 'Supplier Quotes',

    // HR
    payroll: 'Payroll & HR',
    attendance_tracking: 'Attendance Tracking',
    shift_scheduling: 'Shift Scheduling',

    // INTELLIGENCE - AI & GenAI Capabilities
    ai_analytics: 'AI Analytics Dashboard',
    ai_forecasting: 'AI Demand Forecasting',
    ai_restock: 'AI Smart Restock',
    ai_price_optimization: 'AI Price Optimization',
    ai_promotion_recommendations: 'AI Promotion Recommendations',
    ai_churn_prediction: 'AI Customer Churn Prediction',
    advanced_reports: 'Advanced Reports',
    custom_reports: 'Custom Report Builder',
    
    // GENAI - Generative AI Features
    genai_product_descriptions: 'AI Product Description Generator',
    genai_content_writer: 'AI Marketing Content Writer',
    genai_email_campaigns: 'AI Email Campaign Generator',
    genai_chatbot: 'AI Customer Support Chatbot',
    genai_business_analyst: 'AI Business Analyst (Ask Questions)',
    genai_procurement_agent: 'Autonomous Procurement Agent',
    semantic_search: 'AI Semantic Product Search',
    ai_anomaly_detection: 'AI Anomaly Detection',
    
    // MARKETING AUTOMATION
    marketing_automation: 'Marketing Automation Workflows',
    email_campaigns: 'Email Campaigns (Bulk Email)',
    sms_campaigns: 'SMS Campaigns (Twilio/Local Gateways)',
    whatsapp_business: 'WhatsApp Business Integration',
    social_media_posting: 'Social Media Auto-Posting',
    lead_capture_forms: 'Lead Capture Forms',
    lead_scoring: 'AI Lead Scoring',
    lead_nurturing: 'Lead Nurturing Workflows',
    customer_journey_mapping: 'Customer Journey Mapping',
    abandoned_cart_recovery: 'Abandoned Cart Recovery',
    review_requests: 'Automated Review Requests',
    referral_programs: 'Referral Programs',
    
    // CUSTOMER ENGAGEMENT
    customer_portal: 'Customer Self-Service Portal',
    vendor_portal: 'Vendor Self-Service Portal',
    appointment_booking: 'Appointment Booking System',
    feedback_surveys: 'Customer Feedback & Surveys',
    helpdesk_tickets: 'Helpdesk & Support Tickets',
    live_chat: 'Live Chat Widget',

    // GOVERNANCE
    approval_workflows: 'Approval Workflows',
    audit_logs: 'Audit Trail',
    multi_branch: 'Multi-Branch',
    multi_domain: 'Multi-Domain',

    // PLATFORM
    custom_workflows: 'Custom Workflows',
    api_access: 'API Access',
    priority_support: 'Priority Support',
    white_label: 'White-Label Branding',
    webhook_integrations: 'Webhook Integrations',
};

/**
 * Ordered feature keys for `/pricing` tier cards: bullets are derived from
 * `PLAN_TIERS[tier].features` in this order (no arbitrary truncation).
 * Mirrors `docs/MODULAR_PACKAGING_AND_DASHBOARD_MATRIX.md` groupings.
 */
export const PRICING_PAGE_MARKETING_FEATURE_ORDER = [
    'pos',
    'restaurant_pos',
    'expense_tracking',
    'credit_notes',
    'tax_compliance',
    'fiscal_periods',
    'exchange_rates',
    'multi_currency',
    'multi_warehouse',
    'batch_tracking',
    'serial_tracking',
    'manufacturing',
    'delivery_challans',
    'stock_reservations',
    'promotions_crm',
    'loyalty_programs',
    'price_lists',
    'supplier_quotes',
    'campaigns',
    'advanced_reports',
    'custom_reports',
    'ai_analytics',
    'ai_forecasting',
    'ai_restock',
    'payroll',
    'attendance_tracking',
    'shift_scheduling',
    'approval_workflows',
    'audit_logs',
    'multi_branch',
    'api_access',
    'webhook_integrations',
    'priority_support',
    'white_label',
    'multi_domain',
    'storefront_orders',
    'sales_hub',
];

// ============================================
// TENVO COMPETITIVE ADVANTAGES
// ============================================

/**
 * Tenvo Advantages over Zoho and other competitors
 * Use these in marketing, pricing pages, and sales materials
 */
export const TENVO_ADVANTAGES = {
    // AI & GenAI Capabilities
    ai_capabilities: {
        title: '🤖 Advanced AI & GenAI Suite',
        icon: 'Brain',
        points: [
            'AI Business Analyst - Ask questions in natural language',
            'Autonomous Procurement Agent - Auto-generates purchase orders',
            'AI Product Description Generator - GenAI-powered content',
            'AI Chatbot for Customer Support - 24/7 automated responses',
            'Semantic Product Search - AI-powered search understanding',
            'AI Anomaly Detection - Automatic fraud & error detection',
            'AI Price Optimization - Dynamic pricing recommendations',
            'AI Churn Prediction - Predict customer attrition',
        ],
    },
    
    // Marketing Automation
    marketing: {
        title: '📢 Complete Marketing Automation',
        icon: 'Megaphone',
        points: [
            'WhatsApp Business API Integration (Zoho: Not available)',
            'AI Email Campaign Generator - GenAI writes your emails',
            'SMS Campaigns via Twilio & Local Pakistani Gateways',
            'Social Media Auto-Posting & Scheduling',
            'Lead Scoring with AI - Prioritize hot leads',
            'Lead Nurturing Workflows - Automated follow-ups',
            'Abandoned Cart Recovery - Win back lost sales',
            'Customer Journey Mapping - Visual funnel builder',
        ],
    },
    
    // Customer Engagement
    engagement: {
        title: '💬 Superior Customer Engagement',
        icon: 'MessageCircle',
        points: [
            'Customer Self-Service Portal (Zoho: Higher tier only)',
            'Vendor Self-Service Portal - Collaborate with suppliers',
            'Appointment Booking System - Integrated scheduling',
            'Live Chat Widget - Real-time customer support',
            'Helpdesk & Support Tickets - Complete ticketing system',
            'Customer Feedback & NPS Surveys',
            'Automated Review Requests - Boost online reputation',
            'Referral Programs - Turn customers into advocates',
        ],
    },
    
    // Pakistan-Specific Features
    local: {
        title: '🇵🇰 Pakistan launch depth',
        icon: 'MapPin',
        points: [
            'Full Urdu Language Support - Complete UI localization',
            'Pakistani Tax Compliance - FBR integration built-in',
            'JazzCash & Easypaisa Payment Integration',
            'Pakistani SMS Gateways - Local providers supported',
            'Biometric Attendance - Fingerprint/face recognition',
            'Pakistani Payroll with Tax Deductions',
            'Local Support - Urdu-speaking team in Pakistan timezone',
            'Offline POS Mode - Works without internet (Zoho: Requires internet)',
        ],
    },
    
    // Pricing Advantage
    pricing: {
        title: '💰 Unbeatable Value',
        icon: 'Banknote',
        points: [
            '5-6x Cheaper than Zoho for equivalent features',
            'Free Tier: 100 customers (Zoho: 50K revenue cap)',
            'API Access at Starter Tier (Zoho: Professional+)',
            'Shopify Integration at Growth (Zoho: Elite only)',
            'KDS Included in Growth (Zoho: Separate expensive product)',
            'No Per-User Pricing - Unlimited users within tier limits',
            'Bundle Discounts - 10% off 3 modules, 20% off 5+',
            'Custom Enterprise Packages - Negotiated pricing available',
        ],
    },
    
    // Operations & Inventory
    operations: {
        title: '🏭 Advanced Operations',
        icon: 'Warehouse',
        points: [
            'Manufacturing & BOM - Complete production management',
            'Batch & Serial Tracking - Full traceability',
            'Multi-Warehouse with Inter-Location Transfers',
            'Stock Reservations - Reserve inventory for orders',
            'AI Smart Restock - Never run out of stock',
            'Delivery Challans - Pakistan-specific documentation',
            'Role-Based Access Control - Granular permissions',
            'Custom Workflows - Automate business processes',
        ],
    },
};

/**
 * Get advantages as array for display
 */
export function getAllAdvantages() {
    return Object.values(TENVO_ADVANTAGES);
}

/**
 * Get advantages by category key
 */
export function getAdvantagesByCategory(category) {
    return TENVO_ADVANTAGES[category] || null;
}

// ============================================
// FEATURE MINIMUM PLAN MAPPING
// ============================================

/**
 * Map a feature key to its minimum required plan
 */
export const FEATURE_MIN_PLAN = Object.keys(PLAN_TIERS.enterprise.features).reduce((map, feature) => {
    for (const tier of ['free', 'starter', 'professional', 'business', 'enterprise']) {
        if (PLAN_TIERS[tier].features[feature]) {
            map[feature] = tier;
            break;
        }
    }
    return map;
}, {});

/**
 * Check if a plan tier includes a feature
 * @param {string} planTier - free | starter | professional | business | enterprise (or legacy aliases)
 * @param {string} feature - Feature key from the features object
 * @returns {boolean}
 */
export function planHasFeature(planTier, feature) {
    const resolved = resolvePlanTier(planTier);
    const plan = PLAN_TIERS[resolved];
    if (!plan) return false;
    return plan.features[feature] === true;
}

/**
 * Check if a plan tier's limit allows more of a resource
 * Returns true if under limit, false if at/over limit
 * -1 means unlimited
 */
export function planWithinLimit(planTier, limitKey, currentCount) {
    const resolved = resolvePlanTier(planTier);
    const plan = PLAN_TIERS[resolved];
    if (!plan) return false;
    const limit = plan.limits[limitKey];
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
}

/**
 * Get the plan tier order for comparison
 */
export const PLAN_ORDER = { free: 0, starter: 1, professional: 2, business: 3, enterprise: 4 };

/**
 * Backward-compatibility aliases for old tier names
 * Maps old 4-tier keys to new 5-tier keys
 */
export const PLAN_ALIASES = {
    basic: 'free',
    standard: 'starter',
    premium: 'business',
};

/**
 * Resolve a plan tier key, supporting legacy aliases
 * @param {string} tier - Plan tier key (may be old or new)
 * @returns {string} Resolved tier key
 */
export function resolvePlanTier(tier) {
    if (!tier || typeof tier !== 'string') return 'free';
    const normalized = tier.toLowerCase().trim();
    if (PLAN_TIERS[normalized]) return normalized;
    return PLAN_ALIASES[normalized] || 'free';
}

/**
 * List prices for marketing / pricing UI (optional 15% annual discount, same as in-app pricing cards).
 * @param {string} tierKey
 * @param {{ interval?: 'monthly' | 'yearly' }} [opts]
 * @returns {{ pkr: number; usd: number }}
 */
export function getPlanListPrice(tierKey, { interval = 'monthly' } = {}) {
    const resolved = resolvePlanTier(tierKey);
    const tier = PLAN_TIERS[resolved];
    if (!tier) return { pkr: 0, usd: 0 };
    const factor = interval === 'yearly' ? 0.85 : 1;
    return {
        pkr: Math.round(tier.price_pkr * factor),
        usd: Math.round(tier.price_usd * factor),
    };
}

/**
 * Ordered tier keys for marketing tables.
 */
export function getOrderedPlanTierKeys() {
    return Object.keys(PLAN_ORDER).sort((a, b) => PLAN_ORDER[a] - PLAN_ORDER[b]);
}

/**
 * Columns on `businesses` that should follow the subscription tier limits.
 * Use after checkout, webhooks, admin plan changes, and self-serve plan updates.
 * @param {string} planTier
 * @returns {{ plan_tier: string; plan_seats: number; max_products: number; max_warehouses: number } | null}
 */
export function getPlanTierQuotaUpdateData(planTier) {
    const resolved = resolvePlanTier(planTier);
    const plan = PLAN_TIERS[resolved];
    if (!plan) return null;
    return {
        plan_tier: resolved,
        plan_seats: plan.limits.max_users,
        max_products: plan.limits.max_products,
        max_warehouses: plan.limits.max_warehouses,
    };
}

/**
 * Check if planA >= planB
 */
export function planAtLeast(planA, planB) {
    const resolvedA = resolvePlanTier(planA);
    const resolvedB = resolvePlanTier(planB);
    return (PLAN_ORDER[resolvedA] || 0) >= (PLAN_ORDER[resolvedB] || 0);
}

/**
 * Get upgrade benefits -- what features the user gains by upgrading
 */
export function getUpgradeBenefits(currentTier, targetTier) {
    const resolvedCurrent = resolvePlanTier(currentTier);
    const resolvedTarget = resolvePlanTier(targetTier);
    const currentPlan = PLAN_TIERS[resolvedCurrent];
    const targetPlan = PLAN_TIERS[resolvedTarget];
    if (!currentPlan || !targetPlan) return [];

    return Object.keys(targetPlan.features)
        .filter(f => targetPlan.features[f] && !currentPlan.features[f])
        .map(f => FEATURE_LABELS[f] || f);
}

/**
 * Get the next tier up from current
 * @param {string} currentTier
 * @returns {string|null}
 */
export function getNextTier(currentTier) {
    const resolved = resolvePlanTier(currentTier);
    const tiers = Object.keys(PLAN_ORDER);
    const idx = tiers.indexOf(resolved);
    return idx >= 0 && idx < tiers.length - 1 ? tiers[idx + 1] : null;
}

/**
 * Check if a plan tier's module group is enabled
 * @param {string} planTier
 * @param {string} moduleKey - core | pos | finance | operations | crm | hr | intelligence | governance | platform
 * @returns {boolean}
 */
export function planHasModule(planTier, moduleKey) {
    const resolved = resolvePlanTier(planTier);
    const plan = PLAN_TIERS[resolved];
    if (!plan) return false;
    return plan.modules?.[moduleKey] === true;
}

/**
 * Get all plan tiers as an ordered array for comparison UIs
 * @returns {Array}
 */
export function getAllPlansOrdered() {
    return Object.keys(PLAN_ORDER)
        .sort((a, b) => PLAN_ORDER[a] - PLAN_ORDER[b])
        .map(key => PLAN_TIERS[key]);
}
