/**
 * Domain Expertise Configuration
 * Pakistan-first business domain registry for vertical-specific customization
 * 
 * Each domain defines:
 * - Tax configuration defaults
 * - Default units and categories
 * - Required/optional module flags
 * - UI label overrides for domain relevance
 * - Default product categories
 */

export const BUSINESS_DOMAINS = {
    'retail-shop': {
        key: 'retail-shop',
        name: 'Retail / General Store',
        name_ur: 'ریٹیل / جنرل اسٹور',
        icon: 'Store',
        description: 'General retail, supermarkets, departmental stores',
        tax_config: {
            default_tax_rate: 17,    // FBR standard GST
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'pack', 'dozen', 'carton', 'box'],
        default_categories: [
            'FMCG', 'Beverages', 'Snacks', 'Personal Care',
            'Household', 'Stationery', 'Cleaning', 'Other',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['pos', 'batch_tracking', 'expense_tracking', 'delivery_challans'],
        label_overrides: {
            product: 'Item',
            invoice: 'Sales Bill',
            purchase: 'Purchase Bill',
            customer: 'Customer',
        },
    },

    supermarket: {
        key: 'supermarket',
        name: 'Supermarket',
        name_ur: 'سپر مارکیٹ',
        icon: 'ShoppingCart',
        description: 'Large scale retail, multiple departments, high inventory',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'kg', 'pack', 'dozen', 'carton'],
        default_categories: [
            'Fresh Produce', 'Dairy', 'Meat', 'Frozen Foods',
            'Bakery', 'Pantry', 'Household', 'Health & Beauty',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting', 'pos'],
        recommended_modules: ['batch_tracking', 'multi_warehouse', 'expense_tracking'],
        label_overrides: {
            product: 'Product',
            invoice: 'Receipt',
        },
    },

    'wholesale-distribution': {
        key: 'wholesale-distribution',
        name: 'Wholesale / Distribution',
        name_ur: 'ہول سیل / ڈسٹری بیوشن',
        icon: 'Warehouse',
        description: 'Wholesale trading, distribution companies, stockists',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['carton', 'pallet', 'kg', 'ton', 'pcs', 'dozen'],
        default_categories: [
            'Category A', 'Category B', 'Category C',
            'Fast Moving', 'Slow Moving', 'Seasonal',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: [
            'credit_notes', 'delivery_challans', 'multi_warehouse',
            'batch_tracking', 'expense_tracking', 'quotations',
        ],
        label_overrides: {
            product: 'Item',
            invoice: 'Invoice',
            purchase: 'Purchase Order',
            customer: 'Dealer / Retailer',
            vendor: 'Supplier / Manufacturer',
        },
    },

    pharmacy: {
        key: 'pharmacy',
        name: 'Pharmacy / Medical Store',
        name_ur: 'فارمیسی / میڈیکل اسٹور',
        icon: 'Pill',
        description: 'Pharmacies, medical stores, drug distributors',
        tax_config: {
            default_tax_rate: 0,     // Most pharma items exempt in Pakistan
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: false,
        },
        default_units: ['pcs', 'strip', 'pack', 'bottle', 'tube', 'box', 'carton'],
        default_categories: [
            'Tablets', 'Capsules', 'Syrups', 'Injections',
            'Surgical', 'OTC', 'Baby Care', 'Cosmetics', 'Devices',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting', 'batch_tracking'],
        recommended_modules: ['serial_tracking', 'pos', 'expense_tracking'],
        label_overrides: {
            product: 'Medicine / Drug',
            invoice: 'Sales Bill',
            purchase: 'Purchase Bill',
            batch_number: 'Batch No.',
            expiry_date: 'Expiry Date',
        },
        special_rules: {
            expiry_tracking_mandatory: true,
            batch_tracking_mandatory: true,
            drug_license_required: true,
        },
    },

    'electronics-goods': {
        key: 'electronics-goods',
        name: 'Electronics / Mobile',
        name_ur: 'الیکٹرانکس / موبائل',
        icon: 'Smartphone',
        description: 'Mobile phones, electronics, gadgets, accessories',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'set', 'pair'],
        default_categories: [
            'Smartphones', 'Tablets', 'Laptops', 'Accessories',
            'Chargers', 'Cases', 'Audio', 'Wearables', 'Parts',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting', 'serial_tracking'],
        recommended_modules: ['pos', 'credit_notes', 'expense_tracking'],
        label_overrides: {
            product: 'Product',
            serial_number: 'IMEI / Serial',
            invoice: 'Sales Invoice',
        },
        special_rules: {
            imei_tracking_mandatory: true,
            warranty_tracking: true,
        },
    },

    'restaurant-cafe': {
        key: 'restaurant-cafe',
        name: 'Restaurant / Cafe',
        name_ur: 'ریسٹورنٹ / کیفے',
        icon: 'UtensilsCrossed',
        description: 'Restaurants, cafes, food delivery, dining',
        tax_config: {
            default_tax_rate: 16,    // Restaurant GST reduced rate
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'plate', 'serving', 'kg', 'litre', 'pack'],
        default_categories: [
            'Appetizers', 'Main Course', 'Desserts', 'Beverages',
            'Fast Food', 'Deals', 'Add-ons', 'Raw Materials',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'pos'],
        recommended_modules: ['expense_tracking', 'batch_tracking'],
        label_overrides: {
            product: 'Menu Item',
            invoice: 'Bill',
            customer: 'Guest / Customer',
            pos_terminal: 'Counter',
        },
    },

    'bakery-confectionery': {
        key: 'bakery-confectionery',
        name: 'Bakery / Confectionery',
        name_ur: 'بیکری / کنفیکشنری',
        icon: 'Cake',
        description: 'Bakers, sweets, cakes, and confectionery items',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'kg', 'lb', 'pack', 'serving'],
        default_categories: [
            'Cakes', 'Bread', 'Sweets', 'Biscuits',
            'Savories', 'Drinks', 'Custom Orders',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'pos'],
        recommended_modules: ['manufacturing', 'batch_tracking', 'expense_tracking'],
        label_overrides: {
            product: 'Bakery Item',
            invoice: 'Receipt',
        },
    },

    garments: {
        key: 'garments',
        name: 'Garments / Boutique',
        name_ur: 'گارمنٹس / بوتیک',
        icon: 'Shirt',
        description: 'Clothing stores, boutiques, apparel retail',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'set', 'pair', 'meter'],
        default_categories: [
            'Menswear', 'Womenswear', 'Kids', 'Accessories',
            'Traditional', 'Western', 'Footwear',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['pos', 'batch_tracking', 'multi_warehouse'],
        label_overrides: {
            product: 'Item',
            variant: 'Size / Color',
        },
        special_rules: {
            size_color_matrix: true,
            further_tax_unregistered: true,
        },
    },

    'boutique-fashion': {
        key: 'boutique-fashion',
        name: 'Boutique / Designer Fashion',
        name_ur: 'بوٹیک / ڈیزائنر فیشن',
        icon: 'Palette',
        description: 'Designer boutiques, luxury fashion, custom stitching',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'set', 'meter'],
        default_categories: [
            'Bridal', 'Luxury Pret', 'Semi-Formal', 'Casual',
            'Evening Wear', 'Unstitched', 'Accessories',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['pos', 'multi_warehouse', 'credit_notes'],
        label_overrides: {
            product: 'Design / Article',
            variant: 'Size / Color',
            customer: 'Client',
            invoice: 'Sales Order',
        },
        special_rules: {
            size_color_matrix: true,
            measurement_tracking: true,
            designer_tracking: true,
            stitching_orders: true,
        },
    },

    'leather-footwear': {
        key: 'leather-footwear',
        name: 'Leather & Footwear',
        name_ur: 'چمڑے اور جوتے',
        icon: 'Footprints',
        description: 'Shoe stores, leather goods, footwear wholesale/retail',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'pair', 'set'],
        default_categories: [
            "Men's Shoes", "Women's Shoes", "Kids Shoes",
            'Sports Shoes', 'Sandals', 'Leather Goods', 'Accessories',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['pos', 'batch_tracking', 'multi_warehouse'],
        label_overrides: {
            product: 'Article',
            variant: 'Size / Color',
            sku: 'Article Number',
        },
        special_rules: {
            size_color_matrix: true,
            footwear_sizes: true,
        },
    },

    'hardware-sanitary': {
        key: 'hardware-sanitary',
        name: 'Hardware / Sanitary',
        name_ur: 'ہارڈ ویئر / سینیٹری',
        icon: 'HardHat',
        description: 'Hardware stores, building materials, sanitary fittings',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'kg', 'ft', 'bag', 'sqft'],
        default_categories: [
            'Plumbing', 'Electrical', 'Hardware', 'Paint',
            'Tiles', 'Sanitary', 'Tools',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['delivery_challans', 'expense_tracking', 'multi_warehouse', 'quotations'],
        label_overrides: {
            product: 'Item',
            warehouse: 'Godown',
        },
    },

    'auto-parts': {
        key: 'auto-parts',
        name: 'Auto Parts / Vehicles',
        name_ur: 'آٹو پارٹس / گاڑیاں',
        icon: 'Car',
        description: 'Auto parts, vehicle dealers, service stations',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'set', 'pair', 'litre', 'kg'],
        default_categories: [
            'Engine Parts', 'Body Parts', 'Electrical', 'Suspension',
            'Brakes', 'Lubricants', 'Filters', 'Batteries', 'Tyres',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['serial_tracking', 'pos', 'expense_tracking'],
        label_overrides: {
            product: 'Part',
            sku: 'Part Number / OEM',
        },
    },

    grocery: {
        key: 'grocery',
        name: 'Grocery / Kiryana Store',
        name_ur: 'گروسری / کریانہ اسٹور',
        icon: 'ShoppingBasket',
        description: 'Kiryana stores, grocery shops, mini marts',
        tax_config: {
            default_tax_rate: 0,     // Most essential items exempt
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: false,
        },
        default_units: ['kg', 'g', 'pcs', 'pack', 'litre', 'ml', 'dozen'],
        default_categories: [
            'Atta / Flour', 'Rice / Pulses', 'Cooking Oil', 'Dairy',
            'Spices', 'Snacks', 'Beverages', 'Cleaning', 'Other',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting'],
        recommended_modules: ['pos', 'expense_tracking', 'batch_tracking'],
        label_overrides: {
            product: 'Item',
            invoice: 'Parchi / Bill',
            customer: 'Customer / Khata',
        },
    },

    services: {
        key: 'services',
        name: 'Professional Services',
        name_ur: 'پروفیشنل سروسز',
        icon: 'Briefcase',
        description: 'Consulting, legal, accounting, IT services, agencies',
        tax_config: {
            default_tax_rate: 16,    // Services GST (Sindh SRB rate)
            tax_label: 'SST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['hours', 'days', 'project', 'retainer', 'session'],
        default_categories: [
            'Consulting', 'Development', 'Design', 'Legal',
            'Accounting', 'Marketing', 'Training', 'Support',
        ],
        required_modules: ['invoicing', 'customers', 'basic_accounting'],
        recommended_modules: ['expense_tracking', 'quotations', 'credit_notes'],
        label_overrides: {
            product: 'Service',
            invoice: 'Service Invoice',
            purchase: 'Vendor Invoice',
            stock: 'N/A',
        },
    },

    ecommerce: {
        key: 'ecommerce',
        name: 'E-Commerce',
        name_ur: 'ای کامرس',
        icon: 'Globe',
        description: 'Online stores, marketplace sellers, dropshipping',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'pack', 'set'],
        default_categories: [
            'Fashion', 'Electronics', 'Home & Living', 'Beauty',
            'Sports', 'Books', 'Toys', 'Health',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: [
            'multi_warehouse', 'batch_tracking', 'serial_tracking',
            'delivery_challans', 'credit_notes', 'promotions_crm',
        ],
        label_overrides: {
            product: 'Product / SKU',
            invoice: 'Order Invoice',
            customer: 'Buyer',
            delivery_challan: 'Shipment',
        },
    },

    agriculture: {
        key: 'agriculture',
        name: 'Agriculture / Agri-Business',
        name_ur: 'زراعت / ایگری بزنس',
        icon: 'Wheat',
        description: 'Farms, seed companies, fertilizer dealers, agriculture trading',
        tax_config: {
            default_tax_rate: 0,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: false,
        },
        default_units: ['kg', 'maund', 'ton', 'bag', 'acre', 'pcs', 'litre'],
        default_categories: [
            'Seeds', 'Fertilizers', 'Pesticides', 'Crops',
            'Livestock Feed', 'Machinery', 'Irrigation', 'Packaging',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting'],
        recommended_modules: ['batch_tracking', 'expense_tracking', 'multi_warehouse'],
        label_overrides: {
            product: 'Commodity / Input',
            warehouse: 'Godown / Storage',
            invoice: 'Sales Bill',
        },
    },

    'school-education': {
        key: 'school-education',
        name: 'School / Coaching Centre',
        name_ur: 'اسکول / کوچنگ سینٹر',
        icon: 'GraduationCap',
        description: 'Private schools, colleges, coaching centres, academies',
        tax_config: {
            default_tax_rate: 5,     // Educational services tax
            tax_label: 'SST',
            withholding_enabled: false,
            input_tax_claimable: false,
        },
        default_units: ['month', 'session', 'student', 'course'],
        default_categories: [
            'Monthly Fees', 'Admission Fees', 'Stationery', 'Uniform',
            'Transport', 'Library Fee', 'Exams', 'Other',
        ],
        required_modules: ['invoicing', 'customers', 'basic_accounting', 'expense_tracking'],
        recommended_modules: ['promotions_crm'],
        label_overrides: {
            product: 'Fee Structure / Service',
            customer: 'Student / Parent',
            invoice: 'Fee Challan',
            stock: 'Enrolment',
        },
        special_rules: {
            recurring_billing: true,
            student_records: true,
            id_prefix: 'STU',
        },
    },

    'solar-energy': {
        key: 'solar-energy',
        name: 'Solar & Renewable Energy',
        name_ur: 'سولر اور قابل تجدید توانائی',
        icon: 'Sun',
        description: 'Solar panel installers, importers, renewable energy solutions',
        tax_config: {
            default_tax_rate: 0,     // Zero-rated for solar items in PK
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['pcs', 'set', 'kw', 'watt'],
        default_categories: [
            'Solar Panels', 'Inverters', 'Batteries', 'Mounting Structures',
            'DC Cables', 'Installation Services', 'Net Metering',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting', 'serial_tracking'],
        recommended_modules: ['quotations', 'multi_warehouse', 'expense_tracking', 'delivery_challans'],
        label_overrides: {
            product: 'Part / Component',
            serial_number: 'Panel / Inverter Serial',
            customer: 'Client / Site Owner',
            invoice: 'Project Invoice',
        },
        special_rules: {
            warranty_tracking: true,
            installation_logs: true,
            net_metering_tracker: true,
        },
    },

    'livestock-cattle': {
        key: 'livestock-cattle',
        name: 'Livestock & Cattle Farm',
        name_ur: 'لائیوسٹاک اور کیٹل فارم',
        icon: 'Beef',
        description: 'Dairy farms, cattle breeders, livestock trading',
        tax_config: {
            default_tax_rate: 0,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: false,
        },
        default_units: ['head', 'kg', 'maund', 'litre'],
        default_categories: [
            'Animal Stock', 'Milk / Dairy', 'Animal Feed', 'Vaccines',
            'Semen / Breeding', 'Farm Equipment',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting', 'batch_tracking'],
        recommended_modules: ['expense_tracking', 'multi_warehouse'],
        label_overrides: {
            product: 'Animal / Product',
            batch_number: 'Tag Number / Batch',
            invoice: 'Sales Bill',
            stock: 'Herd Size',
        },
        special_rules: {
            lifecycle_tracking: true,
            weight_tracking: true,
            vaccination_alerts: true,
        },
    },

    'mobile-repairing': {
        key: 'mobile-repairing',
        name: 'Mobile & Electronics Repair',
        name_ur: 'موبائل اور الیکٹرانکس مرمت',
        icon: 'Wrench',
        description: 'Mobile software/hardware repair, electronics service centers',
        tax_config: {
            default_tax_rate: 16,
            tax_label: 'SST',
            withholding_enabled: false,
            input_tax_claimable: true,
        },
        default_units: ['job', 'pcs', 'service'],
        default_categories: [
            'Screen Replacement', 'Battery Replacement', 'Software Flash',
            'Component Repair', 'Liquid Damage', 'Accessories', 'New/Used Spare Parts',
        ],
        required_modules: ['invoicing', 'purchases', 'customers', 'vendors', 'basic_accounting'],
        recommended_modules: ['pos', 'serial_tracking', 'expense_tracking'],
        label_overrides: {
            product: 'Service / Part',
            order: 'Job Card',
            invoice: 'Repair Bill',
            serial_number: 'Device IMEI',
        },
        special_rules: {
            job_card_tracking: true,
            status_tracking: ['Received', 'Diagnosed', 'Repairing', 'Ready', 'Delivered'],
        },
    },

    'textile-mill': {
        key: 'textile-mill',
        name: 'Textile / Garment Factory',
        name_ur: 'ٹیکسٹائل / گارمنٹ فیکٹری',
        icon: 'Scissors',
        description: 'Large scale textile manufacturing, weaving, and processing',
        tax_config: {
            default_tax_rate: 17,
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['kg', 'meter', 'yard', 'lbs', 'pcs'],
        default_categories: [
            'Raw Yarn', 'Fabric / Grey', 'Dyes & Chemicals', 'Finished Goods',
            'Wastage', 'Labels & Zips',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'manufacturing'],
        recommended_modules: ['batch_tracking', 'multi_warehouse', 'delivery_challans', 'quotations'],
        label_overrides: {
            product: 'Material / Article',
            warehouse: 'Mill Store / Godown',
            invoice: 'Export / Sales Invoice',
        },
        special_rules: {
            bom_mandatory: true,
            yarn_to_fabric_conversion: true,
        },
    },

    'sugar-mill': {
        key: 'sugar-mill',
        name: 'Sugar Mill',
        name_ur: 'شوگر مل',
        icon: 'Factory',
        description: 'Sugar production, cane processing units',
        tax_config: {
            default_tax_rate: 18,
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['ton', 'maund', 'bag (50kg)', 'kg'],
        default_categories: [
            'Sugar White', 'Molasses', 'Bagasse', 'Cane Procurement',
            'Chemicals', 'Spare Parts',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'manufacturing'],
        recommended_modules: ['multi_warehouse', 'batch_tracking', 'delivery_challans'],
        label_overrides: {
            product: 'Commodity',
            warehouse: 'Godown / Silo',
            invoice: 'Loading Order / Invoice',
        },
        special_rules: {
            cane_procurement_logs: true,
            sucrose_recovery_tracking: true,
        },
    },

    'rice-mill': {
        key: 'rice-mill',
        name: 'Rice Mill',
        name_ur: 'رائس مل',
        icon: 'Grain',
        description: 'Rice cleaning, husking, and export units',
        tax_config: {
            default_tax_rate: 0,
            tax_label: 'GST',
            withholding_enabled: false,
            input_tax_claimable: false,
        },
        default_units: ['kg', 'maund', 'bag (25kg)', 'bag (50kg)', 'ton'],
        default_categories: [
            'Super Basmati', 'Kainat 1121', 'IRRI-6', 'Broken Rice',
            'Rice Husk', 'Bran',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'manufacturing'],
        recommended_modules: ['batch_tracking', 'multi_warehouse', 'delivery_challans'],
        label_overrides: {
            product: 'Variety',
            warehouse: 'Godown',
            invoice: 'Export Invoice / Bill',
        },
    },

    'plastic-manufacturing': {
        key: 'plastic-manufacturing',
        name: 'Plastic Manufacturing',
        name_ur: 'پلاسٹک مینوفیکچرنگ',
        icon: 'Recycle',
        description: 'Plastic products, molding, and packaging units',
        tax_config: {
            default_tax_rate: 18,
            tax_label: 'GST',
            withholding_enabled: true,
            input_tax_claimable: true,
        },
        default_units: ['kg', 'ton', 'bag', 'pcs'],
        default_categories: [
            'Raw Resin', 'Masterbatch', 'Finished Products', 'Scrap',
            'Molds', 'Chemicals',
        ],
        required_modules: ['invoicing', 'purchases', 'vendors', 'basic_accounting', 'manufacturing'],
        recommended_modules: ['batch_tracking', 'multi_warehouse', 'expense_tracking'],
    },

};

/**
 * Get domain configuration by key
 * @param {string} domainKey
 * @returns {Object|null}
 */
export function getDomainConfig(domainKey) {
    return BUSINESS_DOMAINS[domainKey] || null;
}

/**
 * Get all domain keys for select/dropdown
 * @returns {Array<{value: string, label: string, label_ur: string}>}
 */
export function getDomainOptions() {
    return Object.values(BUSINESS_DOMAINS).map(d => ({
        value: d.key,
        label: d.name,
        label_ur: d.name_ur,
        icon: d.icon,
    }));
}

/**
 * Get recommended modules for a domain + plan combination
 * @param {string} domainKey
 * @param {string} planTier
 * @param {Function} planHasFeature - from plans.js
 * @returns {Array<{module: string, available: boolean, recommended: boolean}>}
 */
export function getModulesForDomainPlan(domainKey, planTier, planHasFeatureFn) {
    const domain = BUSINESS_DOMAINS[domainKey];
    if (!domain) return [];

    const allModules = [...new Set([...domain.required_modules, ...domain.recommended_modules])];

    return allModules.map(mod => ({
        module: mod,
        available: planHasFeatureFn(planTier, mod),
        required: domain.required_modules.includes(mod),
        recommended: domain.recommended_modules.includes(mod),
    }));
}

/**
 * Pakistan-specific tax constants
 */
export const PAKISTAN_TAX = {
    FBR_STANDARD_GST: 17,
    REDUCED_GST: 10,
    EXEMPT_GST: 0,
    SINDH_SRB: 13,
    PUNJAB_PRA: 16,
    KPK_KPRA: 15,
    BALOCHISTAN_BRA: 15,
    WHT_FILER: 4.5,           // Withholding tax for filers
    WHT_NON_FILER: 9,         // Withholding tax for non-filers
    FURTHER_TAX_NON_FILER: 3, // Further tax on non-filer sales
    ADVANCE_TAX_IMPORTS: 6,
};

/**
 * Pakistan-specific compliance
 */
export const PAKISTAN_COMPLIANCE = {
    fiscal_year: { start_month: 7, end_month: 6 },   // July-June
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    tax_authority: 'FBR',
    tax_id_label: 'NTN',
    secondary_tax_id: 'STRN',
    id_label: 'CNIC',
};

// --- Domain Classification Sets (Single Source of Truth) --------------------
// Import these in Sidebar, DashboardTabs, ActionModals, registration pages
// instead of duplicating the sets.

export const POS_RELEVANT_DOMAINS = new Set([
    'retail-shop', 'supermarket', 'grocery', 'pharmacy', 'bakery-confectionery',
    'restaurant-cafe', 'hotel-guesthouse', 'bookshop-stationery', 'boutique-fashion',
    'electronics-goods', 'mobile', 'computer-hardware', 'gems-jewellery', 'auto-parts',
    'garments', 'ecommerce', 'mobile-repairing'
]);


export const HOSPITALITY_DOMAINS = new Set([
    'restaurant-cafe', 'bakery-confectionery', 'hotel-guesthouse'
]);

export const CAMPAIGN_RELEVANT_DOMAINS = new Set([
    'retail-shop', 'supermarket', 'grocery', 'pharmacy', 'bakery-confectionery',
    'restaurant-cafe', 'hotel-guesthouse', 'ecommerce', 'gym-fitness', 'travel',
    'event-management', 'real-estate', 'bookshop-stationery', 'boutique-fashion'
]);

export const MANUFACTURING_DOMAINS = new Set([
    'garments', 'textile-mill', 'steel-iron', 'plastic-manufacturing',
    'flour-mill', 'rice-mill', 'sugar-mill', 'paper-mill',
    'furniture', 'ceramics-tiles', 'printing-packaging', 'paint',
    'bakery-confectionery', 'oil-ghee', 'marble-granite', 'leather-goods',
    'chemical-manufacturing'
]);


// --- Classification Helpers -------------------------------------------------

export function isPosRelevant(category, domainKnowledge = null) {
    if (POS_RELEVANT_DOMAINS.has(category)) return true;
    return !!(domainKnowledge?.retailMode || domainKnowledge?.posEnabled);
}

export function isHospitality(category) {
    return HOSPITALITY_DOMAINS.has(category);
}

export function isCampaignRelevant(category, domainKnowledge = null) {
    if (CAMPAIGN_RELEVANT_DOMAINS.has(category)) return true;
    return !!(domainKnowledge?.retailMode || domainKnowledge?.serviceMode);
}

export function isManufacturingRelevant(category, domainKnowledge = null) {
    if (MANUFACTURING_DOMAINS.has(category)) return true;
    return !!domainKnowledge?.manufacturingEnabled;
}

export function suggestPlanTier(category, domainKnowledge = null) {
    if (isManufacturingRelevant(category, domainKnowledge) || isHospitality(category)) return 'business';
    if (isPosRelevant(category, domainKnowledge)) return 'starter';
    return 'free';
}
