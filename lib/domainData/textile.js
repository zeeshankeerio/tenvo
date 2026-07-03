export const textileDomains = {
    'textile-wholesale': {
        icon: 'Scroll',
        imageUrl: '/textile_hero.png',
        productFields: ['Article No', 'Design No', 'Fabric Type', 'Kora/Finished', 'Width (Arz)', 'Thaan Length', 'Suit Cutting'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'Zero Rated (Export)', 'Unregistered Buyer (3% Further Tax)'],
        units: ['meter', 'gaz', 'suit', 'thaan', 'guth', 'kg'],
        alternateUnits: { 'thaan': 'meter', 'guth': 'suit' },
        defaultTax: 18,
        defaultHSN: '5208', // Woven fabrics of cotton (Textile Wholesale)
        fieldConfig: {
            articleno: { label: 'Article No', type: 'text', placeholder: 'e.g. GA-101', required: true },
            designno: { label: 'Design No', type: 'text', placeholder: 'e.g. D-505', required: true },
            fabrictype: {
                label: 'Fabric Type',
                type: 'select',
                options: ['Lawn', 'Cotton', 'Wash & Wear', 'Chiffon', 'Silk', 'Khaddar', 'Linen', 'Jacquard', 'Karandi', 'Organza'],
                required: true
            },
            korafinished: {
                label: 'Kora/Finished',
                type: 'select',
                options: [
                    { value: 'Kora', label: 'Kora (Raw)' },
                    { value: 'Finished', label: 'Finished (Processed)' },
                    { value: 'Dyed', label: 'Dyed' },
                    { value: 'Printed', label: 'Printed' },
                    { value: 'Embroidered', label: 'Embroidered' }
                ],
                required: true
            },
            widtharz: { label: 'Width (Arz)', type: 'number', placeholder: 'e.g. 40, 44, 60', required: false },
            thaanlength: { label: 'Thaan Length', type: 'number', placeholder: 'Meters per Thaan', required: false },
            suitcutting: { label: 'Suit Cutting', type: 'number', placeholder: 'Meters per Suit', required: false }
        },
        customerFields: ['Shop Name', 'Market Location', 'Credit Limit', 'Broker Name'],
        vendorFields: ['Mill Name', 'Agent Name', 'Payment Terms', 'Quality Grade'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'bank_transfer', 'cheque', 'cash'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'further_tax', 'withholding'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            wholesalerMode: true,
            marketLocations: ['Jama Cloth', 'Lunda Bazaar', 'Tariq Road', 'Faisalabad Market'],
        },
        inventoryFeatures: [
            'Thaan Management', 'Roll Tracking', 'Cutting Management', 'Design-wise Stock',
            'Article-wise Stock', 'Fabric Quality Tracking', 'Multi-Location Inventory',
            'Barcode Scanning (Article No)', 'Stock Valuation (Average)', 'Reorder Points',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management',
            'Challan Management (Gate Pass)', 'Sales Tax Invoicing', 'FBR Compliance',
            'Stock Transfer', 'Stock Adjustment', 'Season-wise Analysis',
            'Customer Ledger (Udhaar)', 'Supplier Ledger', 'Broker/Agent Commission'
        ],
        reports: [
            'Design-wise Sales', 'Article-wise Stock', 'Customer Ledger', 'Supplier Ledger',
            'Stock Summary (Thaan/Meter)', 'Daily Sales Report', 'Broker Commission Report',
            'Season Performance', 'Dead Stock Analysis', 'FBR Tax Report'
        ],
        paymentTerms: ['Cash', 'Credit 15 Days', 'Credit 30 Days', 'Cheque (PDC)', 'Cash on Delivery (COD)'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['April', 'May', 'June', 'July', 'November', 'December', 'Ramadan'],
            perishability: 'low',
            shelfLife: 1000,
            demandVolatility: 0.8,
            minOrderQuantity: 100,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Lawn', 'Cotton', 'Wash & Wear', 'Chiffon', 'Silk', 'Khaddar', 'Linen', 'Imported Fabric', 'Lunda Bazaar', 'Mens Unstitched', 'Bridal Collection'],
            suggestedProducts: [
                { name: 'Gul Ahmed Digital Print Lawn', unit: 'suit', category: 'Lawn', startingStock: 50, defaultPrice: 4500, description: 'Premium digital print lawn 3pc' },
                { name: 'Grace Wash & Wear Executive', unit: 'suit', category: 'Wash & Wear', startingStock: 100, defaultPrice: 2800, description: 'Premium mens wash & wear' },
                { name: 'Al-Karam Egyptian Cotton', unit: 'suit', category: 'Cotton', startingStock: 30, defaultPrice: 3500, description: 'Fine Egyptian cotton mens collection' },
                { name: 'Sana Safinaz Luxury Chiffon', unit: 'suit', category: 'Chiffon', startingStock: 15, defaultPrice: 12500, description: 'Luxury embroidered wedding wear' },
                { name: 'Standard Thaan Rolling - Cotton', unit: 'thaan', category: 'Cotton', startingStock: 10, defaultPrice: 15000, description: 'Cotton thaan (35-40 meters)' }
            ]
        }
    }
};
