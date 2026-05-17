export const retailDomains = {
    'retail-shop': {
        icon: 'Store',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Size', 'Color', 'Brand'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'Provincial Tax', 'WHT 2%', 'Zero Rated', 'Exempt'],
        units: ['pcs', 'kg', 'litre', 'pack', 'set'],
        alternateUnits: { 'pack': 'pcs', 'dozen': 'pcs' },
        defaultTax: 18,
        defaultHSN: '6109', // T-shirts (Common retail)
        fieldConfig: {
            size: { label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size', 'Custom'], required: false },
            color: { label: 'Color', type: 'select', options: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Brown', 'Grey', 'Multicolor', 'Custom'], required: false },
            brand: { label: 'Brand', type: 'select', options: ['Bonanza', 'Gul Ahmed', 'Khaadi', 'Sapphire', 'J.', 'Limelight', 'Alkaram', 'Nishat', 'Outfitters', 'Kayseria', 'Local', 'Imported', 'Other'], required: true }
        },
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Bonanza', 'Gul Ahmed', 'Khaadi', 'Sapphire', 'J.', 'Limelight', 'Alkaram', 'Nishat', 'Outfitters', 'Kayseria', 'Sana Safinaz', 'Maria B', 'Zara Shahjahan'],
        },
        customerFields: ['Member ID', 'Preferred Brand', 'Size Preference'],
        vendorFields: ['Local Agent Name', 'Delivery Schedule'],
        inventoryFeatures: [
            'Barcode Scanning', 'Multi-size/Color', 'Expiry Tracking', 'Size-Color Matrix',
            'Multi-Location Inventory', 'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points',
            'Auto Reordering', 'Quotation Management', 'Sales Order Processing', 'Purchase Order Management',
            'Challan Management', 'FBR-Compliant Invoicing', 'Sales Tax Calculation', 'Provincial Tax',
            'Withholding Tax (WHT)', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Price Lists', 'Discount Schemes', 'Seasonal Pricing (Ramadan, Eid)',
            'JazzCash Integration', 'Easypaisa Integration', 'PayFast Integration',
            'Cash on Delivery (COD)', 'Urdu Receipt Printing', 'Daily Sales',
            'Category-wise Sales', 'Customer Purchase History', 'Brand Performance',
            'Pakistani Supplier Management', 'Local Payment Terms'
        ],
        reports: [
            'Daily Sales (PKR)', 'Category-wise Sales', 'Customer Purchase History', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Fast/Slow Moving Items',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer', 'Size-wise Sales',
            'Color Performance', 'Brand Performance', 'FBR Tax Report', 'Provincial Tax Report',
            'WHT Report', 'Payment Method Report', 'Seasonal Sales Report'
        ],
        paymentTerms: ['Cash', 'JazzCash', 'Easypaisa', 'PayFast', 'Bank Transfer', 'COD', 'Credit 7 Days', 'Credit 15 Days', 'Credit 30 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: true,
        manufacturingEnabled: false,
        sizeColorMatrixEnabled: true,
        posEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['March', 'April', 'November', 'December'], // Eid, Ramzan seasons
            perishability: 'low',
            shelfLife: 365,
            demandVolatility: 0.7,
            minOrderQuantity: 50,
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Clothing', 'Footwear', 'Electronics', 'Home & Living', 'Personal Care'],
            suggestedProducts: [
                { name: 'Standard T-Shirt', unit: 'pcs', category: 'Clothing', startingStock: 50, defaultPrice: 850, description: 'Cotton crew neck t-shirt' },
                { name: 'Leather Wallet', unit: 'pcs', category: 'Accessories', startingStock: 20, defaultPrice: 1500, description: 'Genuine leather men wallet' },
                { name: 'LED Desk Lamp', unit: 'pcs', category: 'Home & Living', startingStock: 15, defaultPrice: 2400, description: 'Adjustable LED desk lamp for office' }
            ]
        }
    },
    'grocery': {
        icon: 'ShoppingBag',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Weight', 'Expiry Date', 'Batch Number'],
        taxCategories: ['Sales Tax 0%', 'Exempt', 'Zero Rated'],
        units: ['kg', 'litre', 'pack', 'pcs'],
        alternateUnits: { 'pack': 'pcs', 'dozen': 'pcs' },
        defaultTax: 0,
        defaultHSN: '1006', // Rice (Common grocery)
        fieldConfig: {
            weight: { label: 'Net Weight', type: 'text', placeholder: 'e.g. 500g, 1kg', required: false },
            expirydate: { label: 'Expiry Date', type: 'date', required: false },
            batchnumber: { label: 'Batch Number', type: 'text', placeholder: 'e.g. BATCH-2024-001', required: false }
        },
        customerFields: ['Loyalty Card Number', 'Delivery Zone', 'Preferred Payment Method'],
        vendorFields: ['FSSAI License', 'Quality Certificate', 'Payment Cycle'],
        inventoryFeatures: [
            'Expiry Tracking', 'MRP Compliance', 'Category Management', 'Batch Tracking',
            'FEFO (First Expiry First Out)', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management',
            'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance', 'IRIS Integration',
            'Stock Transfer', 'Stock Adjustment', 'ABC Analysis', 'Expiry Alerts',
            'Near Expiry Reports', 'Expired Stock Reports', 'Category Sales', 'Expiry Report', 'Brand Performance'
        ],
        reports: [
            'Category Sales', 'Expiry Report', 'Brand Performance', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Expiry Alerts', 'Near Expiry Report', 'Expired Stock Report', 'Stock Ledger',
            'Sales by Product', 'Sales by Customer', 'Category-wise Sales'
        ],
        paymentTerms: ['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'COD', 'Credit 7 Days'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Shan', 'National', 'Mehran', 'Rafhan', 'Mitchell\'s', 'Shezan', 'Nestle Pakistan', 'Unilever Pakistan', 'Engro Foods', 'Tapal'],
        },
        stockValuationMethod: 'FEFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['May', 'June', 'July'],
            perishability: 'high',
            shelfLife: 7, // Highly perishable (Vegetables/Milk)
            demandVolatility: 0.4, // Steady demand
            minOrderQuantity: 20,
            leadTime: 1, // Daily restocking
        },
        customerFields: ['Loyalty Card Number', 'Delivery Zone'],
        vendorFields: ['Quality Certificate', 'Payment Cycle'],
        setupTemplate: {
            categories: ['Staples', 'Fresh Produce', 'Dairy & Eggs', 'Beverages', 'Cleaning Supplies'],
            suggestedProducts: [
                { name: 'Basmati Rice (5kg)', unit: 'pack', category: 'Staples', startingStock: 100, defaultPrice: 1850, description: 'Premium long-grain basmati rice' },
                { name: 'Farm Fresh Milk (1L)', unit: 'litre', category: 'Dairy & Eggs', startingStock: 50, defaultPrice: 210, description: 'Pure farm fresh milk' },
                { name: 'Cooking Oil (3L Tin)', unit: 'tin', category: 'Cleaning Supplies', startingStock: 80, defaultPrice: 1650, description: 'Vegetable cooking oil tin' }
            ]
        }
    },
    'fmcg': {
        icon: 'Package',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Batch Number', 'MRP', 'Expiry Date', 'Manufacturing Date'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'Provincial Tax'],
        units: ['pcs', 'pack', 'box', 'kg', 'litre'],
        alternateUnits: { 'pack': 'pcs', 'box': 'pack' },
        defaultTax: 5,
        defaultHSN: '3401', // Soaps/Organic surface-active products
        fieldConfig: {
            batchnumber: { label: 'Batch Number', type: 'text', placeholder: 'e.g. LOT-2024-001', required: true },
            mrp: { label: 'Maximum Retail Price (MRP)', type: 'number', placeholder: 'e.g. 150', required: true },
            expirydate: { label: 'Expiry Date', type: 'date', required: true },
            manufacturingdate: { label: 'Manufacturing Date', type: 'date', required: false }
        },
        customerFields: ['Distributor Code', 'Credit Terms', 'Delivery Route'],
        vendorFields: ['Manufacturer License', 'Brand Authorization', 'Minimum Order Quantity'],
        inventoryFeatures: [
            'Expiry Tracking', 'Batch Management', 'MRP Compliance', 'FEFO (First Expiry First Out)',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance',
            'IRIS Tracking', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis', 'Expiry Alerts',
            'Near Expiry Reports', 'Expired Stock Reports', 'Brand Performance', 'Expiry Report', 'Category Sales'
        ],
        reports: [
            'Brand Performance', 'Expiry Report', 'Category Sales', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Expiry Alerts', 'Near Expiry Report', 'Expired Stock Report', 'Stock Ledger',
            'Sales by Product', 'Sales by Customer', 'Brand-wise Sales'
        ],
        paymentTerms: ['Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Credit 15 Days', 'Credit 30 Days'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Safeguard', 'Lux', 'Dove', 'Pantene', 'Lifebuoy', 'Fair & Lovely', 'Ponds', 'Shan', 'National', 'Mehran'],
        },
        stockValuationMethod: 'FEFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'low',
            peakMonths: [],
            perishability: 'medium',
            shelfLife: 180,
            demandVolatility: 0.3,
            minOrderQuantity: 100,
            leadTime: 3,
        },
        setupTemplate: {
            categories: ['Snacks & Biscuits', 'Beverages', 'Personal Care', 'Home Care', 'Baby Care'],
            suggestedProducts: [
                { name: 'Digestive Biscuits (Family Pack)', unit: 'pack', category: 'Snacks & Biscuits', startingStock: 200, defaultPrice: 180, description: 'Health-focused digestive biscuits' },
                { name: 'Anti-Bacterial Soap', unit: 'pcs', category: 'Personal Care', startingStock: 500, defaultPrice: 95, description: 'Protection against germs' },
                { name: 'Dishwash Liquid (500ml)', unit: 'bottle', category: 'Home Care', startingStock: 150, defaultPrice: 450, description: 'Lemon fresh dishwash liquid' }
            ]
        }
    },
    'ecommerce': {
        icon: 'Globe',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Weight', 'Dimensions', 'SKU', 'Shipping Category'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'WHT 2%'],
        units: ['pcs', 'set', 'pack'],
        alternateUnits: { 'set': 'pcs', 'pack': 'pcs' },
        defaultTax: 18,
        defaultHSN: '8517', // Telephones (Mobile/Smartphones)
        fieldConfig: {
            weight: { label: 'Shipping Weight (kg)', type: 'number', placeholder: 'e.g. 0.5, 1.2', required: true },
            dimensions: { label: 'Dimensions (LxWxH cm)', type: 'text', placeholder: 'e.g. 30x20x10', required: false },
            sku: { label: 'SKU Code', type: 'text', placeholder: 'e.g. PROD-001-BLK-L', required: true },
            shippingcategory: { label: 'Shipping Category', type: 'select', options: ['Standard', 'Express', 'Fragile', 'Bulky'], required: true }
        },
        customerFields: ['Email Address', 'Shipping Address', 'Preferred Courier'],
        vendorFields: ['Dropship Enabled', 'Lead Time (Days)', 'Return Policy'],
        inventoryFeatures: [
            'Multi-channel Sync', 'Fulfillment Tracking', 'Return Management', 'Multi-Location Inventory',
            'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'Sales Tax Invoicing', 'FBR IRIS', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Price Lists', 'Discount Schemes', 'Channel Performance', 'Return Analysis', 'Customer Lifetime Value'
        ],
        reports: [
            'Channel Performance', 'Return Analysis', 'Customer Lifetime Value', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Fast/Slow Moving Items',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer', 'Multi-channel Reports'
        ],
        paymentTerms: ['Online Payment', 'COD', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Wallet'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Khaadi', 'Gul Ahmed', 'Sana Safinaz', 'Maria B', 'Nishat', 'Alkaram', 'Bonanza', 'Outfitters', 'ChenOne', 'Junaid Jamshed', 'Limelight'],
        },
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['November', 'December'], // Black Friday / Year end
            perishability: 'low',
            shelfLife: 365,
            demandVolatility: 0.8,
            minOrderQuantity: 10,
            leadTime: 5,
        },
        setupTemplate: {
            categories: ['Fashion', 'Electronics', 'Digital Goods', 'Home Decor', 'Beauty'],
            suggestedProducts: [
                { name: 'E-commerce Shipping Box (S)', unit: 'pcs', category: 'Packaging', startingStock: 1000, defaultPrice: 25, description: 'Small corrugated shipping box' },
                { name: 'Portable Power Bank', unit: 'pcs', category: 'Electronics', startingStock: 50, defaultPrice: 3800, description: '10000mAh fast charge power bank' },
                { name: 'Microfiber Cleaning Cloth', unit: 'pcs', category: 'Home Decor', startingStock: 200, defaultPrice: 450, description: 'High-absorbent cleaning cloth' }
            ]
        }
    },
    'garments': {
        icon: 'Shirt',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Size/Color Matrix', 'Designer Tracking', 'Stitching Status', 'Season'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'Provincial Tax', 'Further Tax 3%'],
        units: ['pcs', 'set', 'dozen', 'meter'],
        alternateUnits: { 'set': 'pcs', 'dozen': 'pcs' },
        defaultTax: 17,
        defaultHSN: '6203', // Men suits/ensembles (Garments)
        fieldConfig: {
            sizecolormatrix: { label: 'Size/Color Matrix', type: 'text', placeholder: 'e.g. M-Red, L-Blue', required: true },
            designertracking: { label: 'Designer/Brand', type: 'text', placeholder: 'e.g. Khaadi, J., Maria B', required: true },
            stitchingstatus: { label: 'Stitching Status', type: 'select', options: ['Unstitched', 'Ready-to-Wear', 'Custom Stitched'], required: true },
            season: { label: 'Season', type: 'select', options: ['Summer', 'Winter', 'Eid', 'Spring'], required: true }
        },
        customerFields: ['Size Preference', 'Favorite Designer', 'Stitching Measurements'],
        vendorFields: ['Fabric Source', 'Minimum Order Quantity', 'Seasonal Collection'],
        inventoryFeatures: [
            'Size/Color Matrix', 'Season Tracking', 'Fabric Management', 'Size-Color Matrix',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance',
            'IRIS Sync', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis', 'Manufacturing/BOM',
            'Production Orders', 'Material Requirement Planning', 'Job Work Management',
            'Size-wise Sales', 'Color Performance', 'Season Analysis'
        ],
        reports: [
            'Size-wise Sales', 'Color Performance', 'Season Analysis', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Production Reports',
            'Size-Color Matrix Reports', 'Fabric Usage Report', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Credit 30 Days', 'Credit 60 Days'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht', 'further_tax'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Khaadi', 'Gul Ahmed', 'Sana Safinaz', 'Maria B', 'Nishat', 'Alkaram', 'Bonanza', 'Outfitters', 'ChenOne', 'Junaid Jamshed', 'Limelight'],
        },
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        sizeColorMatrixEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['June', 'December'], // Summer/Winter collections
            perishability: 'medium', // Fashion obsolescence
            shelfLife: 90, // Seasonal fashion cycle
            demandVolatility: 0.9,
            minOrderQuantity: 50,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Mens Wear', 'Womens Wear', 'Kids Wear', 'Traditional', 'Accessories'],
            suggestedProducts: [
                { name: 'Cotton Shalwar Kameez', unit: 'set', category: 'Traditional', startingStock: 50, defaultPrice: 4500, description: 'Classic cotton shalwar kameez' },
                { name: 'Formal White Shirt', unit: 'pcs', category: 'Mens Wear', startingStock: 100, defaultPrice: 2800, description: 'Crisp white formal shirt' },
                { name: 'Denim Jeans (Standard)', unit: 'pcs', category: 'Mens Wear', startingStock: 80, defaultPrice: 3200, description: 'Durable blue denim jeans' }
            ]
        }
    },
    'mobile': {
        icon: 'Smartphone',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Model', 'IMEI', 'Storage', 'Color', 'Warranty'],
        taxCategories: ['Sales Tax 18%', 'Sales Tax 17%'],
        units: ['pcs', 'set'],
        alternateUnits: { 'set': 'pcs' },
        defaultTax: 18,
        defaultHSN: '8517', // Smartphones/Tablets
        fieldConfig: {
            model: { label: 'Model Name', type: 'text', placeholder: 'e.g. iPhone 15 Pro, Samsung S24', required: true },
            imei: { label: 'IMEI Number', type: 'text', placeholder: 'e.g. 123456789012345', required: true },
            storage: { label: 'Storage Capacity', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB'], required: true },
            color: { label: 'Color', type: 'text', placeholder: 'e.g. Black, White, Blue', required: false },
            warranty: { label: 'Warranty Period', type: 'select', options: ['No Warranty', '6 Months', '1 Year', '2 Years'], required: true }
        },
        customerFields: ['IMEI Registration', 'Preferred Brand', 'Trade-in Device'],
        vendorFields: ['Authorized Distributor', 'Import License', 'PTA Approval'],
        inventoryFeatures: [
            'IMEI Tracking', 'Warranty Management', 'Accessory Bundling', 'Serial Number Tracking',
            'Serial Number Validation', 'Serial Number History', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'Sales Tax Invoicing', 'FBR Verification', 'IRIS Tracking', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Warranty Tracking by Serial', 'Service History by Serial', 'Model Performance', 'Warranty Claims', 'Accessory Sales'
        ],
        reports: [
            'Model Performance', 'Warranty Claims', 'Accessory Sales', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Serial-wise Reports',
            'IMEI Reports', 'Warranty Report', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Card', 'EMI', 'Exchange', 'JazzCash', 'Easypaisa', 'Bank Transfer'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area', 'Hall Road'],
            popularBrands: ['Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Infinix', 'Tecno', 'QMobile', 'Huawei'],
        },
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['August', 'September'], // New phone launches
            perishability: 'medium', // Tech obsolescence
            shelfLife: 180,
            demandVolatility: 0.6,
            minOrderQuantity: 5,
            leadTime: 3,
        },
        setupTemplate: {
            categories: ['Smartphones', 'Tablets', 'Accessories', 'Smartwatches', 'Repair Parts'],
            suggestedProducts: [
                { name: 'Latest Smartphone Model', unit: 'pcs', category: 'Smartphones', startingStock: 10, defaultPrice: 85000, description: 'Flagship smartphone with high-res camera' },
                { name: 'Fast Charging Adapter', unit: 'pcs', category: 'Accessories', startingStock: 100, defaultPrice: 2500, description: 'Quick charge 3.0 wall adapter' },
                { name: 'Tempered Glass Screen Guard', unit: 'pcs', category: 'Accessories', startingStock: 500, defaultPrice: 450, description: 'High-transparency screen protection' }
            ]
        }
    },
    'electronics-goods': {
        icon: 'Tv',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Model', 'Warranty', 'Specifications', 'IMEI/MAC'],
        taxCategories: ['Sales Tax 18%', 'Ad Valorem Tax'],
        units: ['pcs', 'set'],
        alternateUnits: { 'set': 'pcs' },
        defaultTax: 18,
        fieldConfig: {
            model: { label: 'Model Number', type: 'text', placeholder: 'e.g. LED-43X1000', required: true },
            warranty: { label: 'Warranty Period', type: 'select', options: ['No Warranty', '1 Year', '2 Years', '3 Years', '5 Years'], required: true },
            specifications: { label: 'Key Specifications', type: 'text', placeholder: 'e.g. 4K, Smart, HDR', required: false },
            imeimac: { label: 'IMEI/MAC Address', type: 'text', placeholder: 'Serial identifier', required: false }
        },
        customerFields: ['Installation Required', 'Extended Warranty', 'Delivery Address'],
        vendorFields: ['Brand Authorization', 'Service Center', 'Spare Parts Availability'],
        inventoryFeatures: [
            'Serial Tracking', 'Warranty Management', 'Spec Management', 'Serial Number Validation',
            'Serial Number History', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'Sales Tax Invoicing', 'FBR QR Sync', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Warranty Tracking by Serial', 'Service History by Serial', 'Model Performance', 'Warranty Claims', 'Spec Analysis'
        ],
        reports: [
            'Model Performance', 'Warranty Claims', 'Spec Analysis', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Serial-wise Reports',
            'Warranty Report', 'Service History', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Card', 'EMI', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Credit 30 Days'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Orient', 'Haier', 'Dawlance', 'Pel', 'LG', 'Samsung', 'TCL', 'Gree', 'Kenwood', 'Waves'],
        },
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['October', 'November'], // Wedding season/Festivals
            perishability: 'low',
            shelfLife: 365,
            demandVolatility: 0.5,
            minOrderQuantity: 10,
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Home Appliances', 'Kitchen Appliances', 'TV & Audio', 'Computing', 'Air Conditioning'],
            suggestedProducts: [
                { name: '4k Smart LED TV (43")', unit: 'pcs', category: 'TV & Audio', startingStock: 5, defaultPrice: 75000, description: 'Crystal clear definition smart TV' },
                { name: 'Single Door Refrigerator', unit: 'pcs', category: 'Home Appliances', startingStock: 3, defaultPrice: 65000, description: 'Energy efficient single door fridge' },
                { name: 'Microwave Oven (Solo)', unit: 'pcs', category: 'Kitchen Appliances', startingStock: 10, defaultPrice: 18500, description: 'Standard solo microwave oven' }
            ]
        }
    },
    'bakery-confectionery': {
        icon: 'Cake',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Batch Number', 'Manufacturing Time', 'Shelf Life', 'Ingredients'],
        taxCategories: ['Sales Tax 17%', 'Exempt'],
        units: ['pcs', 'kg', 'pack', 'dozen'],
        alternateUnits: { 'dozen': 'pcs' },
        defaultTax: 17,
        fieldConfig: {
            batchnumber: { label: 'Batch Number', type: 'text', placeholder: 'e.g. BATCH-20240117', required: true },
            manufacturingtime: { label: 'Manufacturing Time', type: 'text', placeholder: 'e.g. 08:00 AM', required: false },
            shelflife: { label: 'Shelf Life (Hours)', type: 'number', placeholder: 'e.g. 24, 48, 72', required: true },
            ingredients: { label: 'Main Ingredients', type: 'text', placeholder: 'e.g. Flour, Sugar, Eggs', required: false }
        },
        customerFields: ['Advance Order', 'Delivery Time', 'Special Instructions'],
        vendorFields: ['PSQCA License', 'Halal Certification', 'Delivery Schedule'],
        inventoryFeatures: [
            'Short Expiry Tracking', 'Batch Management', 'Daily Production logs', 'FEFO Valuation',
            'Recipe BOM', 'Wastage Analysis', 'Advance Bookings (Cakes)', 'Multi-Location Store'
        ],
        reports: [
            'Daily Production Report', 'Wastage Report', 'Expiry Alerts', 'Category-wise Sales',
            'Stock Summary', 'Fast Moving Items'
        ],
        paymentTerms: ['Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Card'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Bundu Khan', 'Jalal Sons', 'Rahat Bakers', 'Delizia', 'Bread & Beyond', 'Hobnob', 'Tehzeeb Bakers', 'Masoom\'s', 'Pie in the Sky'],
        },
        stockValuationMethod: 'FEFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: true,
        posEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['December', 'January'],
            perishability: 'critical',
            shelfLife: 2,
            demandVolatility: 0.8,
            minOrderQuantity: 10,
            leadTime: 1,
        },
        setupTemplate: {
            categories: ['Cakes', 'Pastries', 'Breads', 'Cookies', 'Sweets'],
            suggestedProducts: [
                { name: 'Fresh Milk Bread', unit: 'pcs', category: 'Breads', startingStock: 50, defaultPrice: 80, description: 'Freshly baked daily milk bread' },
                { name: 'Chocolate Fudge Cake (2lb)', unit: 'pcs', category: 'Cakes', startingStock: 10, defaultPrice: 1200, description: 'Rich Belgian chocolate fudge cake' },
                { name: 'Fresh Cream Pastry', unit: 'pcs', category: 'Pastries', startingStock: 25, defaultPrice: 150, description: 'Assorted fresh fruit and cream pastries' }
            ]
        }
    },
    'boutique-fashion': {
        icon: 'Palette',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Designer', 'Collection', 'Fabric Type', 'Stitching Type', 'HSN Code'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'Zero Rated'],
        units: ['pcs', 'set', 'meter'],
        alternateUnits: { 'set': 'pcs' },
        defaultTax: 17,
        defaultHSN: '6204', // Women's suits/ensembles (Boutique Fashion)
        fieldConfig: {
            designer: { label: 'Designer', type: 'text', placeholder: 'e.g. HSY, Sana Safinaz', required: true },
            collection: { label: 'Collection', type: 'select', options: ['Bridal', 'Luxury Pret', 'Casual', 'Evening Wear', 'Summer', 'Winter'], required: true },
            fabrictype: { label: 'Fabric Type', type: 'select', options: ['Silk', 'Chiffon', 'Organza', 'Velvet', 'Lawn', 'Cotton', 'Karandi', 'Linen'], required: true },
            stitchingtype: { label: 'Stitching Type', type: 'select', options: ['Boutique Stitched', 'Semi-Stitched', 'Unstitched', 'Ready-to-Wear'], required: true }
        },
        customerFields: ['Preferred Designer', 'Size Measurements', 'Stitching Service'],
        vendorFields: ['Designer Contract', 'Exclusive Rights', 'Seasonal Delivery'],
        inventoryFeatures: [
            'Size/Color Matrix', 'Designer Tracking', 'Stitching Job Cards', 'Season Analysis',
            'Exclusive Collection Tagging', 'Customer Measurements', 'Alteration Tracking'
        ],
        reports: [
            'Designer-wise Performance', 'Collection Success Rate', 'Size-Color Matrix Sales',
            'Stock Summary', 'Stitching Status'
        ],
        paymentTerms: ['Cash', 'Bank Transfer', 'Credit Card', 'JazzCash', 'Easypaisa', 'Advance 50%'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['HSY', 'Sana Safinaz', 'Maria B', 'Elan', 'Faraz Manan', 'Nomi Ansari', 'Zara Shahjahan', 'Maheen Karim', 'Suffuse'],
        },
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        sizeColorMatrixEnabled: true,
        intelligence: {
            seasonality: 'high',
            // April-May (Eid ul-Fitr), June-July (Eid ul-Adha), November-January (wedding season)
            peakMonths: ['April', 'May', 'June', 'November', 'December'],
            perishability: 'medium',
            shelfLife: 90,
            demandVolatility: 0.9,
            minOrderQuantity: 1,
            leadTime: 15,
        },
        setupTemplate: {
            categories: ['Semi-Formal', 'Bridal Wear', 'Stitched Suits', 'Unstitched Fabric', 'Accessories'],
            suggestedProducts: [
                { name: 'Embroidered Lawn Suit', unit: 'set', category: 'Stitched Suits', startingStock: 20, defaultPrice: 4500, description: 'Three-piece embroidered lawn suit' },
                { name: 'Party Wear Chiffon', unit: 'set', category: 'Semi-Formal', startingStock: 15, defaultPrice: 8500, description: 'Designer party wear in premium chiffon' },
                { name: 'Silk Stole', unit: 'pcs', category: 'Accessories', startingStock: 40, defaultPrice: 1200, description: 'Pure silk stole with digital print' }
            ]
        }
    },
    'bookshop-stationery': {
        icon: 'Book',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Author', 'Publisher', 'Edition', 'ISBN', 'Genre'],
        taxCategories: ['Exempt', 'Sales Tax 17%'],
        units: ['pcs', 'set', 'copy', 'box'],
        alternateUnits: { 'set': 'pcs', 'box': 'pcs' },
        defaultTax: 0,
        fieldConfig: {
            author: { label: 'Author Name', type: 'text', placeholder: 'e.g. Ashfaq Ahmed', required: false },
            publisher: { label: 'Publisher', type: 'text', placeholder: 'e.g. Oxford University Press', required: false },
            edition: { label: 'Edition', type: 'text', placeholder: 'e.g. 1st Edition, Revised 2024', required: false },
            isbn: { label: 'ISBN Number', type: 'text', placeholder: 'e.g. 978-0-123456-78-9', required: false },
            genre: { label: 'Genre/Category', type: 'select', options: ['Fiction', 'Non-Fiction', 'Academic', 'Children', 'Reference'], required: false }
        },
        customerFields: ['School/Institution', 'Class/Grade', 'Bulk Order'],
        vendorFields: ['Publisher Agreement', 'Return Policy', 'Seasonal Stock'],
        inventoryFeatures: [
            'ISBN Scanning', 'Publisher-wise Stock', 'Back-to-School Seasonality', 'Stationery Bundling',
            'Library Supplies Tracking', 'Book Fair Management', 'Multi-Location Inventory'
        ],
        reports: [
            'Publisher Performance', 'Category Sales', 'Back-to-School Report', 'Stock Summary',
            'Dead Stock Analysis'
        ],
        paymentTerms: ['Cash', 'Credit Card', 'On Account'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['March', 'April', 'August'],
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.8,
            minOrderQuantity: 50,
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Textbooks', 'Novels', 'School Stationery', 'Office Supplies', 'Drawing Materials'],
            suggestedProducts: [
                { name: 'A4 Paper Rim (80gsm)', unit: 'box', category: 'Office Supplies', startingStock: 100, defaultPrice: 1450, description: 'Premium quality A4 printing paper' },
                { name: 'School Notebook (Premium)', unit: 'pcs', category: 'School Stationery', startingStock: 500, defaultPrice: 120, description: 'Hardcover 200 pages school notebook' },
                { name: 'Piano Ballpoint Pen (Pack of 10)', unit: 'pack', category: 'School Stationery', startingStock: 200, defaultPrice: 180, description: 'Smooth flow Piano ballpoint pens' },
                { name: 'Oxford School Atlas', unit: 'pcs', category: 'Textbooks', startingStock: 50, defaultPrice: 1500, description: 'Oxford atlas for schools' },
                { name: 'Geometry Box (Picasso)', unit: 'set', category: 'School Stationery', startingStock: 100, defaultPrice: 650, description: 'Complete geometry instrument set' }
            ]
        }
    },
    'supermarket': {
        icon: 'ShoppingCart',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Aisle Number', 'Storage Section'],
        taxCategories: ['Sales Tax 18%', 'Exempt', 'Zero Rated'],
        units: ['pcs', 'kg', 'pack', 'bottle', 'box', 'tray'],
        alternateUnits: { 'box': 'pcs', 'pack': 'pcs', 'tray': 'pcs' },
        defaultTax: 18,
        fieldConfig: {
            aislenumber: { label: 'Aisle Number', type: 'text', placeholder: 'e.g. Aisle 4, Shelf B', required: true },
            storagesection: { label: 'Storage Section', type: 'select', options: ['Chilled', 'Frozen', 'Dry', 'Ambient'], required: true }
        },
        customerFields: ['Loyalty Card Number', 'Membership Tier', 'Preferred Delivery Slot'],
        vendorFields: ['Supplier Code', 'Delivery Window', 'Minimum Order Value'],
        inventoryFeatures: [
            'Aisles/Rack Management', 'High-Speed POS Integration', 'Bulk Stock Receiving',
            'Price Audit', 'Expiry Tracking', 'Anti-Theft Tagging', 'Self-Checkout Support'
        ],
        reports: [
            'Aisle Performance', 'Basket Analysis', 'Expiry Report', 'Stock Summary',
            'Hourly Sales Report', 'Promotional Impact Analysis'
        ],
        paymentTerms: ['Cash', 'Card', 'JazzCash', 'Easypaisa'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        posEnabled: true,
        intelligence: {
            seasonality: 'low',
            peakMonths: ['Ramadan'],
            perishability: 'medium',
            shelfLife: 180,
            demandVolatility: 0.2,
            minOrderQuantity: 100,
            leadTime: 3,
        },
        setupTemplate: {
            categories: ['Dairy & Eggs', 'Beverages', 'Frozen Foods', 'Personal Care', 'Household'],
            suggestedProducts: [
                { name: 'Premium Cooking Oil (5L)', unit: 'bottle', category: 'Household', startingStock: 50, defaultPrice: 2850, description: 'Cholesterol-free premium cooking oil' },
                { name: 'Mineral Water (1.5L)', unit: 'bottle', category: 'Beverages', startingStock: 120, defaultPrice: 90, description: 'Pure mineral water 1.5L' },
                { name: 'Tea Whitener (1kg)', unit: 'pack', category: 'Dairy & Eggs', startingStock: 80, defaultPrice: 1150, description: 'Premium tea whitener for rich taste' }
            ]
        }
    },
    'leather-footwear': {
        icon: 'Footprints',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Article Number', 'Size', 'Color', 'Material', 'Style'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'Zero Rated'],
        units: ['pair', 'pcs', 'set'],
        alternateUnits: { 'pcs': 'pair' },
        defaultTax: 17,
        defaultHSN: '6403', // Footwear with leather uppers
        fieldConfig: {
            articlenumber: { label: 'Article Number', type: 'text', placeholder: 'e.g. BT-M-001', required: true },
            size: { label: 'Size', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'], required: true },
            color: { label: 'Color', type: 'text', placeholder: 'e.g. Black, Brown, Tan', required: true },
            material: { label: 'Material', type: 'select', options: ['Genuine Leather', 'Synthetic Leather', 'Suede', 'Canvas', 'Rubber', 'Mixed'], required: true },
            style: { label: 'Style', type: 'select', options: ['Formal', 'Casual', 'Sports', 'Sandal', 'Slipper', 'Boot', 'Loafer'], required: false },
        },
        customerFields: ['Size Preference', 'Preferred Style'],
        vendorFields: ['Factory Name', 'Article Sheet', 'Minimum Order'],
        inventoryFeatures: [
            'Size-Color Matrix', 'Article Tracking', 'Style-wise Stock', 'Season Analysis',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (Average)',
            'Reorder Points', 'Sales Order Processing', 'Purchase Order Management',
            'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance'
        ],
        reports: [
            'Article-wise Sales', 'Size Performance', 'Color Performance', 'Stock Summary',
            'Style Analysis', 'Dead Stock Report', 'Season Performance'
        ],
        paymentTerms: ['Cash', 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Credit 30 Days'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Saddar', 'Raja Bazaar', 'Hyderi Market'],
            popularBrands: ['Bata Pakistan', 'Service Shoes', 'Borjan', 'Stylo', 'Metro Shoes', 'Ndure', 'ECS', 'Servis Cheetah'],
        },
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        sizeColorMatrixEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['April', 'May', 'June', 'November', 'December'],
            perishability: 'low',
            shelfLife: 730,
            demandVolatility: 0.7,
            minOrderQuantity: 6, // Per size run
            leadTime: 7,
        },
        setupTemplate: {
            categories: ["Men's Shoes", "Women's Shoes", "Kids Shoes", 'Sports Shoes', 'Sandals', 'Leather Goods'],
            suggestedProducts: [
                { name: "Men's Formal Oxford (Art BT-M-001)", unit: 'pair', category: "Men's Shoes", startingStock: 30, defaultPrice: 4500, description: 'Classic genuine leather oxford shoe' },
                { name: "Women's Block Heel (Art BW-001)", unit: 'pair', category: "Women's Shoes", startingStock: 20, defaultPrice: 3800, description: 'Elegant block heel court shoe' },
                { name: "Kids Canvas Sneaker (Art BK-001)", unit: 'pair', category: "Kids Shoes", startingStock: 50, defaultPrice: 1800, description: 'Comfortable canvas sneaker for kids' }
            ]
        }
    },
};
