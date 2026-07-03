export const industrialDomains = {
    'chemical': {
        icon: 'Thermometer',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['CAS Number', 'Hazard Class', 'Storage Conditions', 'SDS'],
        taxCategories: ['Sales Tax 18%', 'Sales Tax 17%', 'WHT 2%'],
        units: ['kg', 'litre', 'ton', 'drum'],
        alternateUnits: { 'ton': 'kg', 'drum': 'litre' },
        defaultTax: 18,
        fieldConfig: {
            casnumber: { label: 'CAS Number', type: 'text', placeholder: 'e.g. 64-17-5', required: true },
            hazardclass: { label: 'Hazard Class', type: 'select', options: ['Class 1: Explosives', 'Class 2: Gases', 'Class 3: Flammable Liquids', 'Class 4: Flammable Solids', 'Class 8: Corrosives', 'Non-Hazardous'], required: true },
            storageconditions: { label: 'Storage Conditions', type: 'select', options: ['Dry/Ventilated', 'Cold Storage', 'Explosion-Proof Room', 'Ambient'], required: true },
            sds: { label: 'SDS Available', type: 'checkbox', default: true, required: false }
        },
        customerFields: ['Industry Type', 'Safety License', 'Storage Facility'],
        vendorFields: ['Manufacturer Certification', 'MSDS Compliance', 'Delivery Terms'],
        inventoryFeatures: [
            'Hazard Classification', 'Storage Tracking', 'SDS Management', 'Batch Tracking',
            'Expiry Tracking', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management',
            'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance', 'IRIS Tracking',
            'Stock Transfer', 'Stock Adjustment', 'ABC Analysis', 'Manufacturing/BOM',
            'Production Orders', 'Material Requirement Planning', 'Hazard Report', 'Storage Report', 'Compliance Report'
        ],
        reports: [
            'Hazard Report', 'Storage Report', 'Compliance Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Production Reports', 'Material Usage Report', 'Stock Ledger', 'Sales by Product'
        ],
        paymentTerms: ['Advance', 'Credit 30 Days', 'LC'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'low',
            peakMonths: [],
            perishability: 'medium',
            shelfLife: 730,
            demandVolatility: 0.3,
            minOrderQuantity: 100, // kg
            leadTime: 15,
        },
        setupTemplate: {
            categories: ['Solvents', 'Acids', 'Bases', 'Pigments', 'Specialty Chemicals'],
            suggestedProducts: [
                { name: 'Industrial Ethanol (95%)', unit: 'drum', category: 'Solvents', startingStock: 50, defaultPrice: 45000, description: 'Medical grade industrial ethanol' },
                { name: 'Hydrochloric Acid (Bulk)', unit: 'kg', category: 'Acids', startingStock: 500, defaultPrice: 120, description: 'Concentrated hydrochloric acid for industrial use' },
                { name: 'Titanium Dioxide Powder', unit: 'kg', category: 'Pigments', startingStock: 200, defaultPrice: 1850, description: 'High-purity white pigment for paints' }
            ]
        }
    },
    'paper-mill': {
        icon: 'Notebook',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['GSM', 'Size', 'Grade', 'Finish', 'Ream Weight'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%'],
        units: ['ream', 'kg', 'ton', 'sheet'],
        alternateUnits: { 'ton': 'kg', 'ream': 'sheet' },
        defaultTax: 12,
        fieldConfig: {
            gsm: { label: 'GSM', type: 'number', placeholder: 'e.g. 80, 100, 300', required: true },
            size: { label: 'Sheet Size', type: 'text', placeholder: 'e.g. A4, A3, 23x36', required: true },
            grade: { label: 'Grade', type: 'select', options: ['Grade A', 'Grade B', 'Recycled', 'Premium'], required: true },
            finish: { label: 'Finish', type: 'select', options: ['Glossy', 'Matte', 'Uncoated', 'Coated'], required: false },
            reamweight: { label: 'Ream Weight (kg)', type: 'number', placeholder: 'e.g. 2.5', required: false }
        },
        customerFields: ['Business Type', 'Credit Terms', 'Delivery Schedule'],
        vendorFields: ['Pulp Source', 'Quality Grade', 'Bulk Discount'],
        inventoryFeatures: [
            'GSM Tracking', 'Grade Management', 'Quality Control', 'Batch Tracking',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance',
            'IRIS Sync', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis', 'Manufacturing/BOM',
            'Production Orders', 'Material Requirement Planning', 'Work-in-Progress (WIP)', 'Production Costing',
            'Grade-wise Sales', 'Quality Report', 'Production Report'
        ],
        reports: [
            'Grade-wise Sales', 'Quality Report', 'Production Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Production Reports', 'Material Usage Report', 'Stock Ledger', 'Sales by Product'
        ],
        paymentTerms: ['Credit 30 Days', 'Credit 60 Days', 'LC'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['August', 'September'], // School season
            perishability: 'low',
            shelfLife: 1095,
            demandVolatility: 0.5,
            minOrderQuantity: 50, // reams
            leadTime: 10,
        },
        setupTemplate: {
            categories: ['Writing Paper', 'Packaging Board', 'Specialty Paper', 'Pulp Material', 'Finished Reams'],
            suggestedProducts: [
                { name: 'A4 Printing Paper (80gsm)', unit: 'ream', category: 'Finished Reams', startingStock: 1000, defaultPrice: 1450, description: 'Double A grade premium printing paper' },
                { name: 'Bleached Kraft Pulp', unit: 'ton', category: 'Pulp Material', startingStock: 50, defaultPrice: 185000, description: 'High-brightness bleached kraft wood pulp' },
                { name: 'Duplex Board (250gsm)', unit: 'ton', category: 'Packaging Board', startingStock: 80, defaultPrice: 165000, description: 'White-lined duplex board for packaging' }
            ]
        }
    },
    'paint': {
        icon: 'Palette',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Color Code', 'Finish', 'Base Type', 'Coverage', 'Drying Time'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'WHT 2%'],
        units: ['litre', 'kg', 'can', 'drum'],
        alternateUnits: { 'can': 'litre', 'drum': 'litre' },
        defaultTax: 18,
        fieldConfig: {
            colorcode: { label: 'Color Code', type: 'text', placeholder: 'e.g. RAL 9010', required: true },
            finish: { label: 'Finish', type: 'select', options: ['High Gloss', 'Satin', 'Matte', 'Eggshell'], required: true },
            basetype: { label: 'Base Type', type: 'select', options: ['Water Based', 'Oil Based', 'Solvent Based'], required: true },
            coverage: { label: 'Coverage (sqft/L)', type: 'number', placeholder: 'e.g. 100', required: false },
            dryingtime: { label: 'Drying Time (Hrs)', type: 'number', placeholder: 'e.g. 4', required: false }
        },
        customerFields: ['Contractor License', 'Project Type', 'Color Preferences'],
        vendorFields: ['Brand Authorization', 'Tinting Capability', 'Delivery Terms'],
        inventoryFeatures: [
            'Color Matching', 'Tinting Options', 'Batch Tracking', 'Expiry Tracking',
            'Size-Color Matrix', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'Sales Tax Invoicing', 'FBR Compliance', 'IRIS QR', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Manufacturing/BOM', 'Production Orders', 'Material Requirement Planning', 'Tinting Management',
            'Color-wise Sales', 'Tinting Report', 'Coverage Analysis'
        ],
        reports: [
            'Color-wise Sales', 'Tinting Report', 'Coverage Analysis', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Production Reports', 'Tinting Reports', 'Stock Ledger', 'Sales by Product'
        ],
        paymentTerms: ['Cash', 'Credit 30 Days', 'Advance'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: true,
        sizeColorMatrixEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['October', 'November'], // Pre-festival renovation
            perishability: 'medium',
            shelfLife: 730,
            demandVolatility: 0.6,
            minOrderQuantity: 20, // cans
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Interior Emulsion', 'Exterior Weather-shield', 'Enamel Paints', 'Thinners & Primers', 'Equipment'],
            suggestedProducts: [
                { name: 'Premium Plastic Emulsion (White)', unit: 'can', category: 'Interior Emulsion', startingStock: 50, defaultPrice: 4800, description: 'High-quality washable interior paint' },
                { name: 'Weather-coat (Off-White)', unit: 'can', category: 'Exterior Weather-shield', startingStock: 30, defaultPrice: 12500, description: 'Durable exterior weather-shield paint' },
                { name: 'Standard Paint Thinner (5L)', unit: 'bottle', category: 'Thinners & Primers', startingStock: 100, defaultPrice: 850, description: 'Premium grade paint thinner' }
            ]
        }
    },
    'plastic-manufacturing': {
        icon: 'Recycle',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Polymer Type', 'Grade', 'Melt Flow Index', 'Color', 'Additives'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'WHT 2%'],
        units: ['kg', 'ton', 'bag', 'roll'],
        alternateUnits: { 'ton': 'kg', 'bag': 'kg' },
        defaultTax: 17,
        fieldConfig: {
            polymertype: { label: 'Polymer Type', type: 'select', options: ['HDPE', 'LDPE', 'PP', 'PVC', 'PET', 'PS'], required: true },
            grade: { label: 'Material Grade', type: 'text', placeholder: 'e.g. Injection Grade', required: true },
            meltflowindex: { label: 'Melt Flow Index (MFI)', type: 'number', placeholder: 'e.g. 2.0', required: false },
            color: { label: 'Color/Masterbatch', type: 'text', placeholder: 'e.g. Natural, Red', required: false },
            additives: { label: 'Additives', type: 'text', placeholder: 'e.g. UV Stabilizer', required: false }
        },
        customerFields: ['Industry Sector', 'Monthly Volume', 'Quality Requirements'],
        vendorFields: ['Polymer Source', 'Quality Certification', 'Minimum Order Quantity'],
        inventoryFeatures: [
            'Weight-based Consumption', 'Molding Logs', 'Machine Efficiency', 'Scrap Management',
            'Multi-Location (Silo/Store)', 'Barcode Scanning', 'Stock Valuation (FIFO)', 'Reorder Points',
            'Auto Reordering', 'Purchase Order Management', 'Production Lifecycle', 'Material Transfer',
            'Production Costing', 'Yield Analysis', 'Machine Downtime', 'Quality Check'
        ],
        reports: [
            'Production Costing', 'Yield Analysis', 'Machine Downtime', 'Quality Report',
            'Stock Summary', 'Raw Material Status', 'Finished Goods Status', 'Stock Movement',
            'Scrap Report', 'Electricity vs Production', 'Stock Ledger'
        ],
        paymentTerms: ['Advance', 'Credit 30 Days', 'LC', 'CAD'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'low',
            peakMonths: [],
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.4,
            minOrderQuantity: 100, // kg
            leadTime: 10,
        },
        setupTemplate: {
            categories: ['Resin Pellets', 'Masterbatch Colors', 'Molding Compounds', 'Recycled Plastic', 'Packaging Bags'],
            suggestedProducts: [
                { name: 'HDPE Resin Pellets', unit: 'bag', category: 'Resin Pellets', startingStock: 100, defaultPrice: 8500, description: 'High-density polyethylene pellets' },
                { name: 'UV Stabilized Masterbatch', unit: 'kg', category: 'Masterbatch Colors', startingStock: 500, defaultPrice: 1200, description: 'UV resistant masterbatch for plastics' },
                { name: 'Polypropylene (PP) Granules', unit: 'bag', category: 'Molding Compounds', startingStock: 80, defaultPrice: 7500, description: 'PP granules for general molding' }
            ]
        }
    },
    'textile-mill': {
        icon: 'Scissors',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Yarn Type', 'Count/GSM', 'Fabric Design', 'Bloom ID', 'Loom Number'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%'],
        units: ['kg', 'meter', 'yard', 'bag'],
        alternateUnits: { 'bag': 'kg', 'yard': 'meter' },
        defaultTax: 17,
        defaultHSN: '5205',
        fieldConfig: {
            yarntype: { label: 'Yarn Type', type: 'select', options: ['Cotton', 'Polyester', 'Blended', 'Viscose'], required: true },
            countgsm: { label: 'Count/GSM', type: 'text', placeholder: 'e.g. 30s, 150 GSM', required: true },
            fabricdesign: { label: 'Fabric Design', type: 'text', placeholder: 'e.g. Twill, Plain', required: false },
            bloomid: { label: 'Bloom/Batch ID', type: 'text', placeholder: 'e.g. BL-001', required: false },
            loomnumber: { label: 'Loom Number', type: 'text', placeholder: 'e.g. L-42', required: false }
        },
        customerFields: ['Buyer Type', 'Credit Limit', 'Delivery Terms'],
        vendorFields: ['Mill Certification', 'Quality Grade', 'Lead Time'],
        inventoryFeatures: [
            'Yarn-to-fabric conversion', 'Bloom Tracking', 'Loom Efficiency', 'Waste Management',
            'Multi-Location Mill/Godown', 'Barcode Scanning', 'Stock Valuation (FIFO)', 'Reorder Points',
            'Auto Reordering', 'Purchase Order Management', 'Production Lifecycle', 'Dyeing Tracking',
            'Quality Lab results', 'Shift Performance', 'Shrinkage logs', 'Contract tracking'
        ],
        reports: [
            'Production Lifecycle', 'Yarn Conversion', 'Loom Efficiency', 'Shrinkage Report',
            'Stock Summary', 'Raw Yarn Status', 'Finished Fabric Status', 'Stock Movement',
            'Waste Analysis', 'Quality Report', 'Stock Ledger'
        ],
        paymentTerms: ['Advance', 'Credit 60 Days', 'LC', 'DP'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'bank_transfer', 'cheque', 'cash'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'further_tax', 'withholding'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            wholesalerMode: true,
            marketLocations: ['Faisalabad', 'Karachi SITE', 'Sheikhupura', 'Multan', 'Lahore Kot Lakhpat'],
            popularBrands: ['Gul Ahmed Textile', 'Nishat Mills', 'Sapphire Textile', 'Al-Karam Textile', 'Crescent Textile', 'Masood Textile'],
        },
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['March', 'April', 'May', 'September', 'October'],
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.7,
            minOrderQuantity: 1000,
            leadTime: 45,
        },
        setupTemplate: {
            categories: ['Raw Yarn', 'Finished Fabric', 'Imported Yarn', 'Dyes & Chemicals', 'Packaging Material', 'Woven Labels'],
            suggestedProducts: [
                { name: 'Combed Cotton Yarn (30s/1)', unit: 'kg', category: 'Raw Yarn', startingStock: 1000, defaultPrice: 450, description: 'High quality combed cotton yarn' },
                { name: 'Dyed Plain Weave Fabric', unit: 'meter', category: 'Finished Fabric', startingStock: 5000, defaultPrice: 180, description: 'Finished plain weave cotton fabric' },
                { name: 'Reactive Blue Dye', unit: 'kg', category: 'Dyes & Chemicals', startingStock: 200, defaultPrice: 2400, description: 'Reactive dyes for textile processing' }
            ]
        }
    },
    'printing-packaging': {
        icon: 'Printer',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Paper GSM', 'Sheet Size', 'Ink Type', 'Finish', 'Die-cut ID'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%'],
        units: ['ream', 'kg', 'sheet', 'pcs'],
        alternateUnits: { 'ream': 'sheet', 'kg': 'pcs' },
        defaultTax: 17,
        fieldConfig: {
            papergsm: { label: 'Paper GSM', type: 'number', placeholder: 'e.g. 80, 128, 250', required: true },
            sheetsize: { label: 'Sheet Size', type: 'text', placeholder: 'e.g. 23x36', required: true },
            inktype: { label: 'Ink Type', type: 'select', options: ['Offset Ink', 'UV Ink', 'Pantone', 'Process'], required: false },
            finish: { label: 'Finish/Lamination', type: 'select', options: ['No Finish', 'Gloss Lamination', 'Matte Lamination', 'UV Coating'], required: false },
            diecutid: { label: 'Die-cut ID', type: 'text', placeholder: 'e.g. BOX-A4-01', required: false }
        },
        customerFields: ['Business Type', 'Order Volume', 'Delivery Schedule'],
        vendorFields: ['Equipment Type', 'Capacity', 'Quality Standards'],
        inventoryFeatures: [
            'GSM-based Stock', 'Ink Consumption Charts', 'Die-cut Management', 'Job-wise Billing',
            'Multi-Location Store', 'Barcode Scanning', 'Stock Valuation (FIFO)', 'Reorder Points',
            'Auto Reordering', 'Quotation Management', 'Production Tracking', 'Paper Wastage Tracking',
            'Plate Management', 'Ink Mix logs', 'Delivery Management', 'Customer Artwork logs'
        ],
        reports: [
            'Job-wise Profitability', 'Paper Wastage', 'Ink Consumption', 'Production Status',
            'Stock Summary', 'Ream-wise Status', 'Stock Movement', 'Stock Valuation',
            'Purchase Summary', 'Wastage Report', 'Stock Ledger'
        ],
        paymentTerms: ['Advance 50%', 'On Delivery', 'Credit 30 Days'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            // ... (keep existing)
            seasonality: 'medium',
            peakMonths: ['November', 'December'],
            perishability: 'low',
            shelfLife: 1825,
            demandVolatility: 0.5,
            minOrderQuantity: 50,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Paper Stock', 'Printing Inks', 'Corrugated Boxes', 'Marketing Collateral', 'Bindery Supplies'],
            suggestedProducts: [
                { name: 'Art Paper (128gsm)', unit: 'ream', category: 'Paper Stock', startingStock: 50, defaultPrice: 4500, description: 'High-gloss art paper for magazines' },
                { name: 'Cyan Offset Ink', unit: 'kg', category: 'Printing Inks', startingStock: 100, defaultPrice: 1850, description: 'Process cyan ink for offset printing' },
                { name: 'Standard Shipping Box (M)', unit: 'pcs', category: 'Corrugated Boxes', startingStock: 500, defaultPrice: 45, description: '3-ply corrugated shipping box' }
            ]
        }
    },
    'furniture': {
        icon: 'Sofa',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Material', 'Dimensions', 'Color', 'Finish', 'Assembly Required', 'Weight'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%'],
        units: ['pcs', 'set', 'sqft'],
        alternateUnits: { 'set': 'pcs' },
        defaultTax: 18,
        fieldConfig: {
            material: { label: 'Primary Material', type: 'select', options: ['Teak Wood', 'Sheesham', 'MDF', 'Chipboard', 'Metal', 'Plastic'], required: true },
            dimensions: { label: 'Dimensions', type: 'text', placeholder: 'e.g. 6x6 ft', required: true },
            color: { label: 'Finish/Color', type: 'text', placeholder: 'e.g. Walnut, Oak', required: false },
            finish: { label: 'Coating Finish', type: 'select', options: ['High Gloss', 'Matte', 'Melamine', 'Varnish'], required: false },
            assemblyrequired: { label: 'Assembly Required', type: 'checkbox', default: false, required: false },
            weight: { label: 'Weight (kg)', type: 'number', placeholder: 'e.g. 45', required: false }
        },
        customerFields: ['Customer Type', 'Delivery Address', 'Installation Required'],
        vendorFields: ['Manufacturer Type', 'Wood Source', 'Quality Certification'],
        inventoryFeatures: [
            'Customization Options', 'Assembly Tracking', 'Delivery Scheduling', 'Size-Color Matrix',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'Sales Tax Invoicing', 'FBR Compliance',
            'IRIS Integration', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis', 'Manufacturing/BOM',
            'Production Orders', 'Material Requirement Planning', 'Job Work Management',
            'Material Usage', 'Custom Orders', 'Delivery Performance'
        ],
        reports: [
            'Material Usage', 'Custom Orders', 'Delivery Performance', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Production Reports',
            'Material Usage Report', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Advance 50%', 'On Delivery', 'Credit 30 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        sizeColorMatrixEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['October', 'November'], // Wedding/Festival furniture
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.4,
            minOrderQuantity: 5,
            leadTime: 20,
        },
        setupTemplate: {
            categories: ['Bedroom Furniture', 'Living Room Sets', 'Office Desks', 'Dining Tables', 'Hardware & Fittings'],
            suggestedProducts: [
                { name: 'King Size Bed (Teak Wood)', unit: 'set', category: 'Bedroom Furniture', startingStock: 5, defaultPrice: 85000, description: 'Solid teak wood king size bed' },
                { name: '6-Seater Sofa Set', unit: 'set', category: 'Living Room Sets', startingStock: 3, defaultPrice: 145000, description: 'Modern 6-seater sofa with luxury fabric' },
                { name: 'Executive Office Table', unit: 'pcs', category: 'Office Desks', startingStock: 10, defaultPrice: 28000, description: 'L-shaped executive office desk' }
            ]
        }
    },
    'ceramics-tiles': {
        icon: 'Grid',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Design/Pattern', 'Tone/Shade ID', 'Size (mm)', 'Finish', 'Pallet Number'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%'],
        units: ['pcs', 'sqm', 'sqft', 'box'],
        alternateUnits: { 'box': 'pcs', 'sqm': 'sqft' },
        defaultTax: 17,
        fieldConfig: {
            designpattern: { label: 'Design/Pattern', type: 'text', placeholder: 'e.g. Marble, Wood', required: true },
            toneshadeid: { label: 'Tone/Shade ID', type: 'text', placeholder: 'e.g. B-12', required: true },
            sizemm: { label: 'Size (mm)', type: 'text', placeholder: 'e.g. 600x600', required: true },
            finish: { label: 'Surface Finish', type: 'select', options: ['Polished', 'Matte', 'Rustic', 'Lappato'], required: true },
            palletnumber: { label: 'Pallet Number', type: 'text', placeholder: 'e.g. P-450', required: false }
        },
        customerFields: ['Project Type', 'Contractor Name', 'Delivery Site'],
        vendorFields: ['Manufacturer', 'Quality Grade', 'Bulk Discount'],
        inventoryFeatures: [
            'Pallet Tracking', 'Tone/Shade Consistency', 'Breakage Logs', 'Project-wise Allocation',
            'Multi-Location Yard', 'Barcode Scanning', 'Stock Valuation (Average)', 'Reorder Points',
            'Auto Reordering', 'Quotation Management', 'Sample Management', 'Batch-wise Shade matching',
            'Loading Sheet management', 'Damage tracking', 'Return handling', 'Sales Agent Performance'
        ],
        reports: [
            'Tone/Shade Status', 'Breakage Logs', 'Project Allocation', 'Loading Sheet',
            'Stock Summary', 'Pallet Inventory', 'Sales by Shade', 'Stock Movement',
            'Damage Analysis', 'Agent Performance', 'Stock Ledger'
        ],
        paymentTerms: ['Cash', 'Bank Transfer', 'Credit 30 Days', 'Cheque'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['March', 'April'], // Construction
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.4,
            minOrderQuantity: 50, // boxes
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Floor Tiles', 'Wall Tiles', 'Sanitary Ware', 'Adhesives', 'Grout & Spacers'],
            suggestedProducts: [
                { name: 'Glossy Floor Tile (60x60)', unit: 'box', category: 'Floor Tiles', startingStock: 100, defaultPrice: 4500, description: 'Premium glossy ceramic floor tiles' },
                { name: 'Matte Wall Tile (30x60)', unit: 'box', category: 'Wall Tiles', startingStock: 150, defaultPrice: 3800, description: 'Elegant matte finish wall tiles' },
                { name: 'Standard Tile Adhesive (20kg)', unit: 'bag', category: 'Adhesives', startingStock: 200, defaultPrice: 850, description: 'Strong bonding tile adhesive' }
            ]
        }
    },
    'flour-mill': {
        icon: 'Wind',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Grain Quality', 'Moisture Content', 'Extraction Rate', 'Protein Content'],
        taxCategories: ['Exempt', 'GST 5%', 'GST 12%'],
        units: ['kg', 'maund', 'bag (20kg)', 'bag (50kg)', 'ton'],
        alternateUnits: { 'maund': 'kg', 'bag (20kg)': 'kg', 'bag (50kg)': 'kg', 'ton': 'kg' },
        defaultTax: 0,
        customerFields: ['Retailer License', 'Monthly Requirement', 'Payment Terms'],
        vendorFields: ['Wheat Source', 'Quality Certificate', 'Delivery Schedule'],
        fieldConfig: {
            grainquality: { label: 'Grain Quality', type: 'select', options: ['Premium', 'Average', 'Broken', 'Industrial Grade'], required: true },
            moisturecontent: { label: 'Moisture Content (%)', type: 'number', placeholder: 'e.g. 10', required: false },
            extractionrate: { label: 'Extraction Rate (%)', type: 'number', placeholder: 'e.g. 72', required: true },
            proteincontent: { label: 'Protein Content (%)', type: 'number', placeholder: 'e.g. 12', required: false }
        },
        inventoryFeatures: [
            'Wheat Silo Management', 'Extraction Ratio tracking', 'Moisture Monitoring', 'Bulk Receiving',
            'By-product tracking (Bran/Choker)', 'Weight bridge integration', 'Production Logs'
        ],
        reports: [
            'Extraction Efficiency', 'Milling Gain/Loss', 'Silo Status', 'By-product Sales',
            'Stock Summary', 'Wheat Consumption'
        ],
        paymentTerms: ['Cash', 'Advance', 'Credit 15 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        batchTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['April', 'May'], // Harvest season
            perishability: 'low',
            shelfLife: 180,
            demandVolatility: 0.3,
            minOrderQuantity: 1000,
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Fine Flour (Maida)', 'Wheat Flour (Atta)', 'Semolina (Suji)', 'Bran (Choker)'],
            suggestedProducts: [
                { name: 'Maida Premium', unit: 'bag', category: 'Fine Flour (Maida)', startingStock: 500, defaultPrice: 2850, description: 'Premium grade fine flour' },
                { name: 'Chakki Atta (20kg)', unit: 'bag', category: 'Wheat Flour (Atta)', startingStock: 1000, defaultPrice: 2650, description: 'Whole wheat stone-ground flour' },
                { name: 'Wheat Bran Fine', unit: 'bag', category: 'Bran (Choker)', startingStock: 200, defaultPrice: 1450, description: 'High-quality animal feed wheat bran' }
            ]
        }
    },
    'rice-mill': {
        icon: 'Grain',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Variety', 'Grade', 'Broken Percentage', 'Polish Type', 'Length'],
        taxCategories: ['Exempt', 'Zero Rated (Export)', 'GST 18%'],
        units: ['kg', 'maund', 'bag (25kg)', 'bag (50kg)', 'ton'],
        alternateUnits: { 'maund': 'kg', 'bag (25kg)': 'kg', 'bag (50kg)': 'kg', 'ton': 'kg' },
        defaultTax: 0,
        customerFields: ['Buyer Category', 'Quality Preference', 'Packaging Type'],
        vendorFields: ['Paddy Source', 'Milling Capacity', 'Quality Grade'],
        fieldConfig: {
            variety: { label: 'Variety', type: 'select', options: ['Super Basmati', 'Kainat (1121)', 'PK-386', 'IRRI-6', 'IRRI-9'], required: true },
            grade: { label: 'Grade', type: 'select', options: ['A-One', 'Double Polish', 'Silky Polish', 'Single Polish'], required: true },
            brokenpercentage: { label: 'Broken %', type: 'number', placeholder: 'e.g. 2', required: false },
            polishtype: { label: 'Polish Type', type: 'select', options: ['Dry Polish', 'Water Polish'], required: false },
            length: { label: 'Grain Length (mm)', type: 'number', placeholder: 'e.g. 7.5', required: false }
        },
        inventoryFeatures: [
            'Paddy-to-Rice conversion', 'Husker/Polisher logs', 'Broken rice tracking', 'Bagging Management',
            'Export Batch tracking', 'Multi-Location Godowns', 'Weight bridge integration'
        ],
        reports: [
            'Conversion Yield', 'Variety-wise Stock', 'Broken rice analysis', 'Godown Status',
            'Stock Summary', 'Production Costing'
        ],
        paymentTerms: ['Cash', 'LC (Export)', 'Advance', 'Credit 30 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        batchTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['October', 'November'], // Harvest season
            perishability: 'low',
            shelfLife: 730,
            demandVolatility: 0.5,
            minOrderQuantity: 1000,
            leadTime: 10,
        },
        setupTemplate: {
            categories: ['Basmati Rice', 'Non-Basmati Rice', 'Broken Rice (Tota)', 'Husk'],
            suggestedProducts: [
                { name: 'Super Kernel Basmati', unit: 'kg', category: 'Basmati Rice', startingStock: 5000, defaultPrice: 380, description: 'Premium long-grain super kernel basmati' },
                { name: 'Rice Broken A-Grade', unit: 'kg', category: 'Broken Rice (Tota)', startingStock: 2000, defaultPrice: 150, description: 'Grade-A broken rice for diverse use' },
                { name: 'Long Grain Sella', unit: 'kg', category: 'Non-Basmati Rice', startingStock: 3000, defaultPrice: 280, description: 'Export quality long grain sella rice' }
            ]
        }
    },
    'sugar-mill': {
        icon: 'Container',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Cane Variety', 'Sucrose Content', 'Crushing Rate', 'Bag Type'],
        taxCategories: ['Sales Tax 17%'],
        units: ['ton', 'kg', 'bag'],
        alternateUnits: { 'bag': 'kg', 'ton': 'kg' },
        defaultTax: 17,
        fieldConfig: {
            canevariety: { label: 'Cane Variety', type: 'select', options: ['CP-77/400', 'CPF-237', 'HSF-240', 'SPF-245', 'Others'], required: true },
            sucrosecontent: { label: 'Sucrose Content (%)', type: 'number', placeholder: 'e.g. 12.5', required: true },
            crushingrate: { label: 'Crushing Rate (TCD)', type: 'number', placeholder: 'e.g. 8000', required: false },
            bagtype: { label: 'Bag Type', type: 'select', options: ['50kg PP Bag', '100kg Jute Bag', 'Bulk Silo'], required: true }
        },
        customerFields: ['Industry Type', 'Monthly Volume', 'Payment Terms'],
        vendorFields: ['Cane Source', 'Processing Capacity', 'Quality Standards'],
        inventoryFeatures: [
            'Cane Weighment Logs', 'Sucrose Analysis', 'By-product tracking (Molasses/Bagasse)',
            'Crushing Season Tracking', 'Govt Regulatory Reporting', 'FBR Sales Tax integration'
        ],
        reports: [
            'Sucrose Recovery Report', 'Crushing Summary', 'By-product Production', 'Daily Production Report',
            'FBR Compliance Summary', 'Stock Summary'
        ],
        paymentTerms: ['Cash', 'Advance', 'Credit 30 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        batchTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['December', 'January', 'February'], // Crushing season
            perishability: 'medium', // Cane spoils fast
            shelfLife: 365,
            demandVolatility: 0.4,
            minOrderQuantity: 1000,
            leadTime: 1,
        },
        setupTemplate: {
            categories: ['White Sugar', 'Brown Sugar', 'Molasses', 'Bagasse'],
            suggestedProducts: [
                { name: 'Refined White Sugar (50kg)', unit: 'bag', category: 'White Sugar', startingStock: 10000, defaultPrice: 6500, description: 'Triple refined high-purity white sugar' },
                { name: 'Industrial Grade Molasses', unit: 'ton', category: 'Molasses', startingStock: 100, defaultPrice: 45000, description: 'Industrial grade molasses for fermentation' },
                { name: 'Bagasse Fuel', unit: 'ton', category: 'Bagasse', startingStock: 50, defaultPrice: 8500, description: 'Compressed bagasse for industrial fuel' }
            ]
        }
    },
};
