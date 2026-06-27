export const specializedDomains = {
    'auto-parts': {
        icon: 'Car',
        imageUrl: '/industrial_hero_image.png',
        productFields: [
            'Part Number', 'OEM Number', 'Vehicle Compatibility',
            'Vehicle Make', 'Vehicle Model', 'Model Year', 'Body Type',
            'Engine Type', 'Engine No', 'Vehicle Class', 'Vehicle Type',
            'Fitment Plates', 'Fitment VIN',
            'Warranty Period', 'Manufacturer',
        ],
        taxCategories: ['GST 18%', 'GST 28%'],
        units: ['pcs', 'set', 'box', 'kg'],
        alternateUnits: { 'set': 'pcs', 'box': 'pcs' },
        defaultTax: 18,
        fieldConfig: {
            partnumber: { label: 'Part Number', type: 'text', placeholder: 'Internal tracking number', required: true },
            oemnumber: { label: 'OEM Number', type: 'text', placeholder: 'Original Equipment Manufacturer number', required: true },
            vehiclemake: { label: 'Vehicle Make', type: 'text', placeholder: 'e.g. Toyota, Honda', required: false },
            vehiclemodel: { label: 'Vehicle Model', type: 'text', placeholder: 'e.g. Corolla, Civic', required: false },
            modelyear: { label: 'Model Year', type: 'text', placeholder: 'e.g. 2014-2024 or 2020', required: false },
            bodytype: {
                label: 'Body Type',
                type: 'select',
                options: ['Sedan', 'Hatchback', 'SUV', 'MPV', 'Coupe', 'Wagon', 'Pickup', 'Van', 'Scooter', 'Naked', 'Sport'],
                required: false,
            },
            enginetype: { label: 'Engine Type', type: 'text', placeholder: 'e.g. 1.6 Petrol, 1.5 Turbo', required: false },
            engineno: { label: 'Engine No', type: 'text', placeholder: 'e.g. 2NR-FE, L15B7', required: false },
            vehicleclass: {
                label: 'Vehicle Class',
                type: 'select',
                options: ['Passenger', 'Commercial', 'Performance', 'Electric', 'Hybrid'],
                required: false,
            },
            vehicletype: { label: 'Vehicle Type', type: 'select', options: ['car', 'moto'], required: false },
            fitmentplates: {
                label: 'Fitment Plates',
                type: 'text',
                placeholder: 'Pipe-separated plate numbers, e.g. SBA1234A|SBA5678B',
                required: false,
            },
            fitmentvin: {
                label: 'Fitment VIN',
                type: 'text',
                placeholder: 'VIN or chassis numbers used for storefront VIN search',
                required: false,
            },
            vehiclecompatibility: {
                label: 'Vehicle Compatibility',
                type: 'multiselect',
                options: [
                    // Toyota
                    'Toyota Corolla 2014-2024', 'Toyota Yaris', 'Toyota Fortuner', 'Toyota Hilux', 'Toyota Prado', 'Toyota Vitz',
                    // Honda
                    'Honda Civic 2016-2024', 'Honda City', 'Honda Accord', 'Honda BR-V', 'Honda Vezel',
                    // Suzuki
                    'Suzuki Alto', 'Suzuki Swift', 'Suzuki Cultus', 'Suzuki Wagon R', 'Suzuki Bolan', 'Suzuki Ravi', 'Suzuki Mehran',
                    // Hyundai/Kia
                    'Hyundai Tucson', 'Hyundai Elantra', 'Hyundai Sonata', 'Kia Sportage', 'Kia Stonic', 'Kia Picanto', 'Kia Sorento',
                    // Changan
                    'Changan Alsvin', 'Changan Karvaan', 'Changan Oshan X7',
                    // MG
                    'MG HS', 'MG ZS', 'MG 5',
                    // Proton
                    'Proton Saga', 'Proton X70',
                    // Others
                    'Universal', 'Multi-Fit'
                ],
                required: true
            },
            warrantyperiod: { label: 'Warranty Period', type: 'select', options: ['No Warranty', '1 Month', '3 Months', '6 Months', '1 Year', '2 Years', '3 Years'], required: false },
            manufacturer: { label: 'Manufacturer', type: 'select', options: ['Denso', 'Bosch', 'Toyota Genuine', 'Honda Genuine', 'Suzuki Genuine', 'NGK', 'Exide', 'Atlas', 'AGS', 'Local', 'Imported', 'Other'], required: false }
        },
        inventoryFeatures: [
            'Serial Number Tracking', 'Warranty Management', 'Vehicle Compatibility',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'GST Invoicing', 'E-way Bill',
            'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Stock Aging Report', 'Parts Sales Report', 'Warranty Claims', 'Vehicle-wise Sales'
        ],
        reports: [
            'Parts Sales Report', 'Warranty Claims', 'Vehicle-wise Sales', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Fast/Slow Moving Items',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer', 'Purchase Summary'
        ],
        paymentTerms: ['Cash', 'Credit 15 Days', 'Credit 30 Days', 'Cheque', 'Bank Transfer'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'low',
            peakMonths: [],
            perishability: 'low',
            shelfLife: 1000,
            demandVolatility: 0.3,
            minOrderQuantity: 10,
            leadTime: 5,
        },
        customerFields: ['Vehicle Registration Number', 'Chassis Number', 'Model Year'],
        vendorFields: ['OEM Authorization', 'Import License'],
        setupTemplate: {
            categories: [
                'Car Care',
                'Accessories',
                'Electrical',
                'Lubricants',
                'Filters',
                'Brakes',
                'Engine',
                'Tyres',
            ],
            suggestedProducts: [
                { name: 'Toyota Corolla Oil Filter (OEM)', unit: 'pcs', category: 'Filters', startingStock: 50, defaultPrice: 1500, description: 'Genuine Toyota oil filter for 1.3/1.6 engines' },
                { name: 'Brake Pads Front - Honda Civic', unit: 'set', category: 'Brakes', startingStock: 30, defaultPrice: 4500, description: 'High-performance ceramic brake pads' },
                { name: 'NGK Spark Plugs Set (4pcs)', unit: 'set', category: 'Engine', startingStock: 100, defaultPrice: 3200, description: 'NGK Iridium spark plugs' },
                { name: 'LED Headlight Bulb H4 6000K', unit: 'pair', category: 'Electrical', startingStock: 40, defaultPrice: 2800, description: 'Bright white LED upgrade for H4 sockets' },
            ]
        }
    },

    /** Automotive marketplace portal (Tenvo Auto Marketplace template; distinct from single-brand dealership). */
    'auto-marketplace': {
        name: 'Tenvo Auto Marketplace',
        name_ur: 'آٹو مارکیٹ پلیس',
        icon: 'Car',
        imageUrl: '/services_hero_image.png',
        productFields: ['Vehicle Make', 'Vehicle Model', 'Model Year', 'Mileage', 'Fuel Type', 'Body Type', 'Condition'],
        taxCategories: ['GST 8%', 'GST 9%'],
        units: ['unit', 'pcs', 'set'],
        alternateUnits: {},
        defaultTax: 8,
        fieldConfig: {
            vehiclemake: { label: 'Make', type: 'select', options: ['Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'BYD', 'Tesla', 'Audi', 'Porsche', 'Hyundai', 'Mazda', 'Other'], required: true },
            vehiclemodel: { label: 'Model', type: 'text', placeholder: 'e.g. Vios, Model Y, Cayenne', required: true },
            modelyear: { label: 'Model Year', type: 'select', options: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'], required: true },
            mileage: { label: 'Mileage (km)', type: 'number', placeholder: '0 for new / rental', required: false },
            fueltype: { label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'], required: false },
            bodytype: { label: 'Body Type', type: 'select', options: ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Luxury', 'Sports', 'Electric', 'Hybrid'], required: false },
            condition: { label: 'Condition', type: 'select', options: ['new', 'pre-owned', 'rental'], required: true },
        },
        customerFields: ['NRIC / FIN', 'Driving Licence', 'COE Category', 'Financing Preference'],
        vendorFields: ['Dealer Licence', 'Auction House', 'Insurance Partner', 'Parts Supplier'],
        inventoryFeatures: [
            'Multi-Listing Portal', 'COE Ticker Display', 'Vehicle Search Filters', 'Rental Inventory',
            'e-Shop Parts Catalog', 'Valuation Requests', 'Insurance Quotes', 'Loan Calculator',
            'Articles & Resources', 'Forum Integration',
        ],
        reports: [
            'Listings by Condition', 'New vs Used Mix', 'Rental Utilisation', 'Parts Sales',
            'Lead Conversion', 'Brand Mix', 'Price Band Analysis',
        ],
        paymentTerms: ['Cash', 'Bank Loan', 'Lease', 'Rental Deposit', 'Trade-In'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['March', 'June', 'December'],
            perishability: 'low',
            shelfLife: 90,
            demandVolatility: 0.75,
            minOrderQuantity: 1,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['New Cars', 'Used Cars', 'Rental Cars', 'Tyres', 'Parts & Accessories', 'Batteries', 'Car Grooming', 'Engine Oil'],
            suggestedProducts: [
                { name: 'Toyota Vios 1.5A E (Used)', unit: 'unit', category: 'Used Cars', startingStock: 1, defaultPrice: 53000, description: 'Reliable Cat A sedan' },
                { name: 'Dunlop SP Sport LM705 Tyre', unit: 'pcs', category: 'Tyres', startingStock: 20, defaultPrice: 114.45, description: 'Premium touring tyre' },
            ],
        },
    },

    /** Authorised vehicle dealership, new & pre-owned sales (distinct from `auto-parts` parts finder). */
    'vehicle-dealership': {
        name: 'Vehicle Dealership',
        name_ur: 'گاڑی ڈیلرشپ',
        icon: 'CarFront',
        imageUrl: '/services_hero_image.png',
        productFields: ['Vehicle Make', 'Vehicle Model', 'Model Year', 'Mileage', 'Fuel Type', 'Transmission', 'Body Type', 'Condition'],
        taxCategories: ['GST 8%', 'GST 9%'],
        units: ['unit'],
        alternateUnits: {},
        defaultTax: 8,
        fieldConfig: {
            vehiclemake: { label: 'Make', type: 'select', options: ['GAC', 'Proton', 'Honda', 'Toyota', 'BYD', 'Mercedes-Benz', 'BMW', 'Audi', 'Other'], required: true },
            vehiclemodel: { label: 'Model', type: 'text', placeholder: 'e.g. Noah Hybrid, E9, S70', required: true },
            modelyear: { label: 'Model Year', type: 'select', options: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019'], required: true },
            mileage: { label: 'Mileage (km)', type: 'number', placeholder: 'e.g. 0 for new', required: true },
            fueltype: { label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'], required: true },
            transmission: { label: 'Transmission', type: 'select', options: ['Automatic', 'CVT', 'e-CVT', '7DCT', '8AT', '9G-TRONIC', 'Single-speed', 'Manual'], required: false },
            bodytype: { label: 'Body Type', type: 'select', options: ['Sedan', 'SUV', 'MPV', 'Hatchback', 'Coupe', 'Luxury', 'Electric'], required: false },
            condition: { label: 'Condition', type: 'select', options: ['new', 'pre-owned'], required: true },
        },
        customerFields: ['NRIC / FIN', 'Driving Licence', 'Trade-In Vehicle', 'Financing Preference'],
        vendorFields: ['OEM Distributor', 'Auction House', 'Insurance Partner', 'Finance Institution'],
        inventoryFeatures: [
            'VIN / Chassis Tracking', 'Test Drive Booking', 'Trade-In Valuation', 'Finance Calculator',
            'Multi-Showroom Inventory', 'Pre-Owned Certification', 'Warranty Management', 'Delivery Scheduling',
            'Quotation Management', 'Sales Order Processing', 'GST Invoicing', 'Stock Transfer',
        ],
        reports: [
            'Sales by Make', 'New vs Pre-Owned Mix', 'Test Drive Conversion', 'Finance Penetration',
            'Stock Ageing', 'Gross Margin by Model', 'Sales by Salesperson', 'Stock Summary',
        ],
        paymentTerms: ['Cash', 'Bank Loan', 'In-House Finance', 'Lease', 'Trade-In + Top-Up'],
        stockValuationMethod: 'Average',
        reorderEnabled: false,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['March', 'June', 'December'],
            perishability: 'low',
            shelfLife: 365,
            demandVolatility: 0.6,
            minOrderQuantity: 1,
            leadTime: 21,
        },
        setupTemplate: {
            categories: ['New Cars', 'Pre-Owned', 'Electric', 'Luxury', 'MPV', 'SUV'],
            suggestedProducts: [
                { name: 'GAC E9 Electric MPV', unit: 'unit', category: 'New Cars', startingStock: 3, defaultPrice: 198800, description: 'Flagship electric seven-seater' },
                { name: 'Toyota Noah Hybrid', unit: 'unit', category: 'New Cars', startingStock: 5, defaultPrice: 168888, description: 'Family MPV with hybrid efficiency' },
                { name: 'Certified Pre-Owned BMW 320i', unit: 'unit', category: 'Pre-Owned', startingStock: 1, defaultPrice: 158000, description: 'Low mileage executive sedan' },
            ],
        },
    },

    /** Industrial / machinery spare parts (generators, pumps, compressors, tractors), distinct from vehicle `auto-parts`. */
    'industrial-parts': {
        name: 'Industrial Spare Parts',
        name_ur: 'انڈسٹریل سپئر پارٹس',
        icon: 'PackageSearch',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Part Number', 'Equipment Type', 'Manufacturer', 'Criticality', 'Interchange Code'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'WHT 2%', 'Zero Rated'],
        units: ['pcs', 'set', 'kit', 'kg', 'box', 'pair'],
        alternateUnits: { set: 'pcs', kit: 'pcs', box: 'pcs' },
        defaultTax: 17,
        fieldConfig: {
            partnumber: { label: 'Part Number', type: 'text', placeholder: 'Internal / catalogue number', required: true },
            equipmenttype: {
                label: 'Equipment Type',
                type: 'select',
                options: [
                    'Diesel Generator', 'Air Compressor', 'Water Pump', 'Industrial Motor',
                    'Hydraulic System', 'Conveyor / Line', 'CNC / Machine Tool', 'Tractor / Farm Implement',
                    'HVAC Chiller', 'Boiler / Burner', 'Other',
                ],
                required: true,
            },
            manufacturer: { label: 'Manufacturer / OEM', type: 'text', placeholder: 'e.g. Siemens, WEG, Grundfos', required: false },
            criticality: { label: 'Stocking Class', type: 'select', options: ['A - Critical', 'B - Important', 'C - General'], required: false },
            interchangecode: { label: 'Interchange / Cross-ref', type: 'text', placeholder: 'Alternate part numbers', required: false },
        },
        customerFields: ['Site / Plant Name', 'Maintenance Contract ID', 'Payment Terms'],
        vendorFields: ['OEM Distributor', 'Lead Time (weeks)', 'Minimum Order Value'],
        inventoryFeatures: [
            'Criticality (ABC) stocking', 'Equipment-linked BOM hints', 'Multi-warehouse bins',
            'Batch / lot traceability', 'Quotation & tender lines', 'Project-wise issue tracking',
            'GST invoicing', 'WHT on supplies', 'Stock valuation (FIFO / Average)', 'Slow-mover alerts',
        ],
        reports: [
            'Parts usage by equipment', 'Critical A-item fill rate', 'Supplier lead-time variance',
            'Stock valuation', 'Stock movement', 'Project / site consumption',
        ],
        paymentTerms: ['Advance', 'Cash', 'Credit 15 Days', 'Credit 30 Days', 'LC'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'low',
            peakMonths: ['March', 'April', 'September', 'October'],
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.45,
            minOrderQuantity: 5,
            leadTime: 21,
        },
        setupTemplate: {
            categories: ['Bearings & Seals', 'Belts & Chains', 'Hydraulics', 'Electrical & Motors', 'Fasteners', 'Filters & Kits'],
            suggestedProducts: [
                { name: 'Deep Groove Ball Bearing 6305-2RS', unit: 'pcs', category: 'Bearings & Seals', startingStock: 40, defaultPrice: 1850, description: 'Rubber sealed bearing for motors and pumps' },
                { name: 'V-Belt B-68 Industrial', unit: 'pcs', category: 'Belts & Chains', startingStock: 25, defaultPrice: 2200, description: 'Classic V-belt for compressors and line shafts' },
                { name: 'Hydraulic Seal Kit (63mm rod)', unit: 'kit', category: 'Hydraulics', startingStock: 15, defaultPrice: 6500, description: 'Rod + wiper seal kit for cylinder overhaul' },
            ],
        },
    },

    /** Tyre retail, fitting, balancing, alignment, size/rim/DOT batch aware. */
    'tyre-shop': {
        name: 'Tyre Shop',
        name_ur: 'ٹائر شاپ',
        icon: 'Gauge',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Tyre Size', 'Load Index', 'Speed Rating', 'DOT Week', 'Rim Size', 'Run-flat'],
        taxCategories: ['Sales Tax 17%', 'Sales Tax 18%', 'FED where applicable'],
        units: ['pcs', 'pair', 'set'],
        alternateUnits: { pair: 'pcs', set: 'pcs' },
        defaultTax: 17,
        fieldConfig: {
            tyresize: { label: 'Tyre Size', type: 'text', placeholder: 'e.g. 205/55 R16', required: true },
            loadindex: { label: 'Load Index', type: 'text', placeholder: 'e.g. 91', required: false },
            speedrating: { label: 'Speed Rating', type: 'select', options: ['H', 'V', 'W', 'Y', 'Other'], required: false },
            dotweek: { label: 'DOT / Week Code', type: 'text', placeholder: 'e.g. 2524', required: false },
            rimsize: { label: 'Rim (inches)', type: 'select', options: ['13', '14', '15', '16', '17', '18', '19', '20', 'Other'], required: false },
            runflat: { label: 'Run-flat', type: 'select', options: ['No', 'Yes'], required: false },
        },
        customerFields: ['Vehicle Reg No.', 'Preferred Brand', 'Fitting Bay'],
        vendorFields: ['Regional Distributor', 'Warranty Policy', 'Seasonal Allocation'],
        inventoryFeatures: [
            'Size & rim matrix', 'DOT / batch age alerts', 'Seasonal stock (winter / all-season)',
            'Fitting & balancing as service SKUs', 'Warranty claim notes', 'POS lane for quick tyre sales',
            'Multi-location godowns', 'Purchase by container / mixed loads',
        ],
        reports: [
            'Sales by size & brand', 'DOT age / oldest batch', 'Fitting labour vs tyre margin',
            'Slow-moving sizes', 'Stock valuation', 'Purchase vs retail GP',
        ],
        paymentTerms: ['Cash', 'Card', 'Credit 7 Days', 'Credit 15 Days'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        posEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['October', 'November', 'December', 'January'],
            perishability: 'low',
            shelfLife: 1825,
            demandVolatility: 0.62,
            minOrderQuantity: 4,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Passenger Car', 'SUV / 4x4', 'Commercial LT', 'Motorcycle', 'Services (Fitting)'],
            suggestedProducts: [
                { name: 'PCR 185/65 R15 (Economy)', unit: 'pcs', category: 'Passenger Car', startingStock: 24, defaultPrice: 12500, description: 'Budget touring tyre for small sedans' },
                { name: 'SUV 265/65 R17 (AT)', unit: 'pcs', category: 'SUV / 4x4', startingStock: 16, defaultPrice: 28500, description: 'All-terrain pattern for pickups and SUVs' },
                { name: 'Tyre Fitting & Balancing (4 wheels)', unit: 'set', category: 'Services (Fitting)', startingStock: 999, defaultPrice: 2000, description: 'Labour bundle for mount, balance, disposal' },
            ],
        },
    },

    'pharmacy': {
        icon: 'Pill',
        imageUrl: '/specialized_hero_image.png',
        productFields: ['Drug License', 'Schedule H1', 'Storage Conditions'],
        taxCategories: ['GST 5%', 'GST 12%', 'GST 18%', 'Exempt'],
        units: ['strip', 'bottle', 'box', 'vial', 'ampoule', 'pcs'],
        alternateUnits: { 'strip': 'tablet', 'bottle': 'ml', 'box': 'strip' },
        defaultTax: 5,
        fieldConfig: {
            druglicense: { label: 'Drug License', type: 'text', placeholder: 'Registration ID', required: true },
            scheduleh1: { label: 'Schedule H1 (Controlled)', type: 'checkbox', default: false, required: false },
            storageconditions: {
                label: 'Storage Conditions',
                type: 'select',
                options: [
                    { value: 'ambient', label: 'Ambient (15-25°C)' },
                    { value: 'cool_dry', label: 'Cool & Dry (8-15°C)' },
                    { value: 'refrigerated', label: 'Refrigerated (2-8°C)' },
                    { value: 'frozen', label: 'Frozen (-20°C or below)' },
                    { value: 'controlled', label: 'Controlled Room Temperature' },
                    { value: 'protect_light', label: 'Protect from Light' }
                ],
                required: true
            }
        },
        customerFields: ['Prescription ID', 'Doctor Name', 'Insurance Provider'],
        vendorFields: ['Drug License Number', 'WHO-GMP Certified', 'Supply Schedule'],
        inventoryFeatures: [
            'Expiry Tracking', 'Batch Management', 'License Tracking', 'FEFO (First Expiry First Out)',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'GST Invoicing', 'E-way Bill',
            'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Batch Expiry Alerts', 'Near Expiry Reports', 'Expired Stock Reports',
            'Expiry Report', 'Prescription Sales', 'Schedule H1 Report'
        ],
        reports: [
            'Expiry Report', 'Prescription Sales', 'Schedule H1 Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Expiry Alerts', 'Near Expiry Report', 'Expired Stock Report', 'Stock Ledger',
            'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Insurance', 'Credit', 'Card', 'JazzCash', 'Easypaisa', 'Bank Transfer'],
        pakistaniFeatures: {
            paymentGateways: ['jazzcash', 'easypaisa', 'payfast', 'bank_transfer', 'cod'],
            taxCompliance: ['fbr', 'ntn', 'srn', 'provincial_tax', 'wht'],
            languages: ['en', 'ur'],
            seasonalPricing: true,
            localBrands: true,
            urduCategories: true,
            marketLocations: ['Anarkali Bazaar', 'Liberty Market', 'Tariq Road', 'Saddar', 'Raja Bazaar', 'Hyderi Market', 'Bolton Market', 'Fortress Stadium', 'Jinnah Super', 'Blue Area'],
            popularBrands: ['Getz Pharma', 'Searle', 'Abbott', 'GSK Pakistan', 'Novartis Pakistan', 'Pfizer Pakistan', 'Sanofi Pakistan', 'Hilton Pharma', 'Ferozsons', 'Martin Dow'],
        },
        stockValuationMethod: 'FEFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['December', 'January', 'July', 'August'],
            perishability: 'high',
            shelfLife: 365,
            demandVolatility: 0.4,
            minOrderQuantity: 50,
            leadTime: 2,
        },
        setupTemplate: {
            categories: ['Antibiotics', 'Pain Relief', 'Vitamins', 'First Aid', 'Skincare', 'Chronic Care', 'Surgicals', 'Diagnostics'],
            suggestedProducts: [
                { name: 'Panadol CF (Tab 10s)', unit: 'strip', category: 'Pain Relief', startingStock: 500, defaultPrice: 45, description: 'Cold and flu relief tablets' },
                { name: 'Augmentin 625mg (Tab 6s)', unit: 'strip', category: 'Antibiotics', startingStock: 100, defaultPrice: 280, description: 'Amoxicillin with Clavulanic acid' },
                { name: 'Cac-1000 Plus (Orange)', unit: 'tube', category: 'Vitamins', startingStock: 200, defaultPrice: 350, description: 'Calcium supplement with Vitamin C' },
                { name: 'Soft-Cotton Crepe Bandage', unit: 'pcs', category: 'First Aid', startingStock: 50, defaultPrice: 180, description: 'High-stretch supportive bandage' },
                { name: 'Brufen 400mg (Tab 10s)', unit: 'strip', category: 'Pain Relief', startingStock: 300, defaultPrice: 55 },
                { name: 'Arinac Forte (Tab 10s)', unit: 'strip', category: 'Pain Relief', startingStock: 250, defaultPrice: 65 },
                { name: 'Flagyl 400mg (Tab 10s)', unit: 'strip', category: 'Antibiotics', startingStock: 400, defaultPrice: 35 },
                { name: 'Surbex-Z (Tab 30s)', unit: 'bottle', category: 'Vitamins', startingStock: 50, defaultPrice: 450 },
                { name: 'Pampers Premium Protection (L)', unit: 'pack', category: 'Baby Care', startingStock: 20, defaultPrice: 3200 }
            ]
        }

    },
    'computer-hardware': {
        icon: 'Monitor',
        imageUrl: '/specialized_hero_image.png',
        productFields: ['Model Number', 'Compatibility', 'IMEI/MAC Address', 'Warranty'],
        taxCategories: ['GST 18%', 'GST 28%'],
        units: ['pcs', 'set', 'box'],
        alternateUnits: { 'set': 'pcs', 'box': 'pcs' },
        defaultTax: 18,
        fieldConfig: {
            modelnumber: { label: 'Model Number', type: 'text', placeholder: 'e.g. HP-15s-FQ5007TU', required: true },
            compatibility: { label: 'Compatibility', type: 'text', placeholder: 'e.g. Windows 11, MacOS', required: false },
            imeimacaddress: { label: 'IMEI/MAC Address', type: 'text', placeholder: 'Serial identifier', required: false },
            warranty: { label: 'Warranty Period', type: 'select', options: ['No Warranty', '6 Months', '1 Year', '2 Years', '3 Years'], required: true }
        },
        customerFields: ['Company Name', 'IT Contact Person', 'Bulk Purchase'],
        vendorFields: ['Authorized Distributor', 'RMA Policy', 'Technical Support'],
        inventoryFeatures: [
            'Serial Tracking', 'Warranty Management', 'Compatibility Matrix', 'Serial Number Validation',
            'Serial Number History', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'GST Invoicing', 'E-way Bill', 'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Service History by Serial', 'Warranty Report', 'Service History', 'Compatibility Report'
        ],
        reports: [
            'Warranty Report', 'Service History', 'Compatibility Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Serial-wise Reports',
            'Warranty Claims', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Card', 'Credit 30 Days', 'EMI'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['August', 'September'],
            perishability: 'medium',
            shelfLife: 1095,
            demandVolatility: 0.6,
            minOrderQuantity: 5,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Laptops', 'Desktops', 'Printers', 'Networking', 'Storage Devices'],
            suggestedProducts: [
                { name: 'Business Laptop (16GB RAM)', unit: 'pcs', category: 'Laptops', startingStock: 5, defaultPrice: 145000, description: 'High-performance business laptop with SSD' },
                { name: 'Laser Printer (Monochrome)', unit: 'pcs', category: 'Printers', startingStock: 10, defaultPrice: 35000, description: 'Fast monochrome laser printer' },
                { name: 'Wi-Fi 6 Router', unit: 'pcs', category: 'Networking', startingStock: 20, defaultPrice: 12500, description: 'Dual-band Wi-Fi 6 router' }
            ]
        }
    },
    'electrical': {
        icon: 'Zap',
        imageUrl: '/specialized_hero_image.png',
        productFields: ['Voltage', 'Current Rating', 'Certification', 'Warranty', 'Model Number'],
        taxCategories: ['GST 18%', 'GST 28%'],
        units: ['pcs', 'set', 'meter', 'roll'],
        alternateUnits: { 'set': 'pcs', 'roll': 'meter' },
        defaultTax: 18,
        fieldConfig: {
            voltage: { label: 'Voltage Rating', type: 'select', options: ['220V', '110V', '12V', '24V', '48V'], required: true },
            currentrating: { label: 'Current Rating (Amps)', type: 'number', placeholder: 'e.g. 10, 16, 32', required: true },
            certification: { label: 'Certification', type: 'select', options: ['CE', 'UL', 'PSQCA', 'ISO'], required: false },
            warranty: { label: 'Warranty Period', type: 'select', options: ['No Warranty', '1 Year', '2 Years', '5 Years'], required: true },
            modelnumber: { label: 'Model Number', type: 'text', placeholder: 'e.g. MCB-32A-SP', required: true }
        },
        customerFields: ['Contractor License', 'Project Name', 'Installation Required'],
        vendorFields: ['Manufacturer Certification', 'Technical Datasheet', 'Bulk Discount'],
        inventoryFeatures: [
            'Certification Tracking', 'Warranty Management', 'Technical Specs', 'Serial Number Tracking',
            'Serial Number Validation', 'Serial Number History', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'GST Invoicing', 'E-way Bill', 'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Warranty Tracking by Serial', 'Service History by Serial', 'Certification Report', 'Warranty Claims', 'Technical Analysis'
        ],
        reports: [
            'Certification Report', 'Warranty Claims', 'Technical Analysis', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Serial-wise Reports',
            'Warranty Report', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Credit 30 Days', 'Advance'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['May', 'June'], // Summer (Fans/ACs)
            perishability: 'low',
            shelfLife: 1825,
            demandVolatility: 0.5,
            minOrderQuantity: 20,
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Cables & Wiring', 'Switchgear', 'Lighting Fixtures', 'Circuit Breakers', 'Electrical Tools'],
            suggestedProducts: [
                { name: 'Copper Wire (7/29) 90m Roll', unit: 'roll', category: 'Cables & Wiring', startingStock: 50, defaultPrice: 8500, description: 'Premium quality 7/29 copper wire' },
                { name: '1-Gang Light Switch (White)', unit: 'pcs', category: 'Switchgear', startingStock: 200, defaultPrice: 250, description: 'Modern 1-gang light switch' },
                { name: 'LED Panel Light (12W)', unit: 'pcs', category: 'Lighting Fixtures', startingStock: 100, defaultPrice: 1200, description: 'Energy efficient 12W LED panel' }
            ]
        }
    },
    'agriculture': {
        icon: 'Sprout',
        imageUrl: '/agriculture_hero_image.png',
        productFields: ['Crop Type', 'Grade', 'Moisture Content', 'Origin', 'Certification', 'Harvest Date'],
        taxCategories: ['GST 0%', 'GST 5%', 'GST 12%'],
        units: ['kg', 'maund', 'quintal', 'ton', 'bag'],
        alternateUnits: { 'quintal': 'kg', 'ton': 'kg', 'bag': 'kg', 'maund': 'kg' },
        defaultTax: 0,
        fieldConfig: {
            croptype: { label: 'Crop Type', type: 'select', options: ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Onion'], required: true },
            grade: { label: 'Grade', type: 'select', options: ['Premium', 'A-Grade', 'B-Grade', 'Average', 'Broken'], required: true },
            moisturecontent: { label: 'Moisture Content (%)', type: 'number', placeholder: 'e.g. 12', required: false },
            origin: { label: 'Origin', type: 'text', placeholder: 'Punjab, Sindh, etc.', required: true },
            certification: { label: 'Certification', type: 'text', placeholder: 'FBR/Agri-Dept ID', required: false },
            harvestdate: { label: 'Harvest Date', type: 'date', required: true }
        },
        customerFields: ['Farm Name', 'Land Area (Acres)', 'Delivery Location'],
        vendorFields: ['Supplier Type', 'Organic Certification', 'Payment Cycle'],
        inventoryFeatures: [
            'Grade Management', 'Moisture Tracking', 'Origin Tracking', 'Batch Tracking',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)',
            'Reorder Points', 'Auto Reordering', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'GST Invoicing', 'E-way Bill',
            'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Crop-wise Sales', 'Grade Analysis', 'Season Report'
        ],
        reports: [
            'Crop-wise Sales', 'Grade Analysis', 'Season Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Grade-wise Reports', 'Origin Reports', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Credit 30 Days', 'Mandi Payment', 'Advance'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['April', 'October', 'November'],
            perishability: 'high',
            shelfLife: 180,
            demandVolatility: 0.8,
            minOrderQuantity: 1000,
            leadTime: 30,
        },
        setupTemplate: {
            categories: ['Crop Seeds', 'Pesticides', 'Organic Fertilizers', 'Farm Equipment', 'Field Tools'],
            suggestedProducts: [
                { name: 'Hybrid Corn Seeds (20kg)', unit: 'bag', category: 'Crop Seeds', startingStock: 200, defaultPrice: 18500, description: 'High-yield hybrid corn seeds' },
                { name: 'DAP Fertilizer (50kg)', unit: 'bag', category: 'Organic Fertilizers', startingStock: 500, defaultPrice: 12500, description: 'Phosphorus-rich fertilizer' },
                { name: 'Super Urea (White)', unit: 'bag', category: 'Organic Fertilizers', startingStock: 1000, defaultPrice: 4800, description: 'Nitrogen-rich urea for growth' },
                { name: 'Standard Agri Spray Machine', unit: 'pcs', category: 'Farm Equipment', startingStock: 25, defaultPrice: 12000, description: 'Manual backpack spray machine' }
            ]
        }
    },
    'gems-jewellery': {
        icon: 'Gem',
        imageUrl: '/retail_hero_image.png',
        productFields: ['Carat', 'Clarity', 'Cut', 'Certification', 'Hallmark', 'Weight'],
        taxCategories: ['GST 3%'],
        units: ['pcs', 'gram', 'tola', 'carat'],
        alternateUnits: { 'carat': 'gram', 'tola': 'gram' },
        defaultTax: 3,
        fieldConfig: {
            carat: { label: 'Carat/Purity', type: 'select', options: ['24K', '22K', '21K', '18K', '14K', '10K'], required: true },
            clarity: { label: 'Clarity Grade', type: 'select', options: ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2'], required: false },
            cut: { label: 'Cut Type', type: 'select', options: ['Round', 'Princess', 'Emerald', 'Oval', 'Cushion'], required: false },
            certification: { label: 'Certification', type: 'text', placeholder: 'e.g. GIA, IGI', required: false },
            hallmark: { label: 'Hallmark Number', type: 'text', placeholder: 'e.g. HM-123456', required: false },
            weight: { label: 'Weight (grams)', type: 'number', placeholder: 'e.g. 10.5', required: true }
        },
        customerFields: ['Occasion', 'Custom Design', 'Engraving'],
        vendorFields: ['Hallmark Certification', 'Buyback Policy', 'Assay Certificate'],
        inventoryFeatures: [
            'Certification Tracking', 'Hallmark Management', 'Valuation', 'Serial Number Tracking',
            'Serial Number Validation', 'Serial Number History', 'Multi-Location Inventory', 'Barcode Scanning',
            'Stock Valuation (FIFO/LIFO/Average)', 'Quotation Management', 'Sales Order Processing',
            'Purchase Order Management', 'Challan Management', 'GST Invoicing', 'E-way Bill',
            'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Carat-wise Sales', 'Certification Report', 'Valuation Report'
        ],
        reports: [
            'Carat-wise Sales', 'Certification Report', 'Valuation Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Serial-wise Reports',
            'Certification Reports', 'Valuation Reports', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Card', 'Gold Exchange'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: false,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['November', 'December', 'January'], // Wedding season
            perishability: 'low',
            shelfLife: 9999, // Gold doesn't expire
            demandVolatility: 0.9,
            minOrderQuantity: 1,
            leadTime: 10,
        },
        setupTemplate: {
            categories: ['Gold Rings', 'Necklace Sets', 'Loose Gemstones', 'Wedding Bands', 'Gold Coins'],
            suggestedProducts: [
                { name: '22K Gold Wedding Ring', unit: 'pcs', category: 'Gold Rings', startingStock: 10, defaultPrice: 45000, description: 'Traditional 22K gold wedding band' },
                { name: 'Certified 1ct Blue Sapphire', unit: 'carat', category: 'Loose Gemstones', startingStock: 5, defaultPrice: 85000, description: 'GIA certified blue sapphire' },
                { name: 'Pure Gold Coin (1 Tola)', unit: 'tola', category: 'Gold Coins', startingStock: 50, defaultPrice: 245000, description: '999.9 pure gold 1 tola coin' }
            ]
        }
    },
    'real-estate': {
        icon: 'Home',
        imageUrl: '/services_hero_image.png',
        productFields: ['Property Type', 'Area', 'Location', 'Amenities', 'Status', 'Registration Number', 'RERA Number'],
        taxCategories: ['GST 5%', 'GST 12%', 'GST 18%'],
        units: ['sqft', 'marla', 'kanal', 'sqm', 'acre'],
        alternateUnits: { 'sqm': 'sqft', 'acre': 'sqft', 'marla': 'sqft', 'kanal': 'marla' },
        defaultTax: 5,
        fieldConfig: {
            propertytype: { label: 'Property Type', type: 'select', options: ['Residential Plot', 'Commercial Plot', 'House', 'Apartment', 'Shop', 'Office'], required: true },
            area: { label: 'Area (sq ft)', type: 'number', placeholder: 'e.g. 1200, 2500', required: true },
            location: { label: 'Location', type: 'text', placeholder: 'e.g. DHA Phase 5, Bahria Town', required: true },
            amenities: { label: 'Amenities', type: 'text', placeholder: 'e.g. Park, Mosque, School', required: false },
            status: { label: 'Status', type: 'select', options: ['Available', 'Sold', 'Reserved', 'Under Construction'], required: true },
            registrationnumber: { label: 'Registration Number', type: 'text', placeholder: 'e.g. REG-123456', required: false },
            reranumber: { label: 'RERA Number', type: 'text', placeholder: 'e.g. RERA-PK-001', required: false }
        },
        customerFields: ['Buyer Type', 'Financing Required', 'Preferred Location'],
        vendorFields: ['Developer Name', 'NOC Status', 'Payment Plan'],
        inventoryFeatures: [
            'Property Management', 'Document Tracking', 'Payment Schedule', 'Multi-Location Inventory',
            'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)', 'Quotation Management',
            'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'GST Invoicing', 'E-way Bill', 'E-invoice', 'Stock Adjustment', 'ABC Analysis',
            'Property Sales', 'Payment Schedule', 'Location Analysis'
        ],
        reports: [
            'Property Sales', 'Payment Schedule', 'Location Analysis', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Property-wise Reports',
            'Payment Reports', 'Location Reports', 'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Booking Amount', 'Installment', 'Full Payment'],
        stockValuationMethod: 'Average',
        reorderEnabled: false,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['March', 'April'], // Construction season start
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.5,
            minOrderQuantity: 100,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Residential Plots', 'Commercial Shops', 'Luxury Apartments', 'Farm Houses', 'Consultancy Services'],
            suggestedProducts: [
                { name: '5-Marla Residential Plot', unit: 'marla', category: 'Residential Plots', startingStock: 25, defaultPrice: 4500000, description: 'Prime location residential plot' },
                { name: 'Executive Apartment (2 Bed)', unit: 'pcs', category: 'Luxury Apartments', startingStock: 10, defaultPrice: 12500000, description: '2 bedroom luxury apartment with parking' },
                { name: 'Property Consultation Fee', unit: 'pcs', category: 'Consultancy Services', startingStock: 100, defaultPrice: 5000, description: 'Initial file verification and consultation' }
            ]
        }
    },
    'hardware-sanitary': {
        icon: 'Wrench',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Shade/Color', 'Size/Dimension', 'Weight', 'Brand'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%', 'FBR Standard'],
        units: ['pcs', 'sqft', 'box', 'kg'],
        alternateUnits: { 'box': 'pcs', 'kg': 'pcs' },
        defaultTax: 17,
        fieldConfig: {
            shadecolor: { label: 'Shade/Color', type: 'text', placeholder: 'e.g. White, Beige, Grey', required: false },
            sizedimension: { label: 'Size/Dimension', type: 'text', placeholder: 'e.g. 2x2 ft, 12 inch', required: true },
            weight: { label: 'Weight (kg)', type: 'number', placeholder: 'e.g. 5.5', required: false },
            brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Master, Grohe', required: false }
        },
        customerFields: ['Project Name', 'Contractor License', 'Delivery Address'],
        vendorFields: ['Manufacturer', 'Quality Certificate', 'Bulk Discount'],
        inventoryFeatures: [
            'Batch-wise Shade Matching', 'Breakage Tracking', 'Project-wise Inventory', 'Multi-Location Inventory',
            'Barcode Scanning', 'Stock Valuation (Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'FBR-Compliant Invoicing', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Project Performance', 'Shade-wise Sales', 'Breakage Report'
        ],
        reports: [
            'Project Performance', 'Shade-wise Sales', 'Breakage Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Fast/Slow Moving Items',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer'
        ],
        paymentTerms: ['Cash', 'Bank Transfer', 'Credit 30 Days', 'Cheque'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['March', 'April'], // Construction season start
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.5,
            minOrderQuantity: 100,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Sanitary Ware', 'Hardware Tools', 'Tiles & Marbles', 'Pipe Fittings', 'Paints & Polishes'],
            suggestedProducts: [
                { name: 'Ceramic Floor Tile (2x2)', unit: 'sqft', category: 'Tiles & Marbles', startingStock: 5000, defaultPrice: 180, description: 'High-gloss ceramic floor tiles' },
                { name: 'PVC Pipe (3-inch) 10ft', unit: 'pcs', category: 'Pipe Fittings', startingStock: 200, defaultPrice: 1450, description: 'Heavy duty PVC drainage pipe' },
                { name: 'Stainless Steel Kitchen Sink', unit: 'pcs', category: 'Sanitary Ware', startingStock: 25, defaultPrice: 8500, description: 'Double bowl stainless steel sink' }
            ]
        }
    },
    'poultry-farm': {
        icon: 'Bird',
        imageUrl: '/agriculture_hero_image.png',
        productFields: ['Batch ID', 'Breed Type', 'Age (Days)', 'Feed Type', 'Vaccination Status', 'Shed Number'],
        taxCategories: ['Exempt', 'Zero Rated', 'Sales Tax 17%'],
        units: ['bird', 'kg', 'bag', 'dozen'],
        alternateUnits: { 'bag': 'kg', 'dozen': 'pcs' },
        defaultTax: 0,
        fieldConfig: {
            batchid: { label: 'Batch ID', type: 'text', placeholder: 'e.g. BATCH-2024-001', required: true },
            breedtype: { label: 'Breed Type', type: 'select', options: ['Broiler', 'Layer', 'Desi', 'Hybrid'], required: true },
            agedays: { label: 'Age (Days)', type: 'number', placeholder: 'e.g. 35', required: true },
            feedtype: { label: 'Feed Type', type: 'select', options: ['Starter', 'Grower', 'Finisher', 'Layer Feed'], required: true },
            vaccinationstatus: { label: 'Vaccination Status', type: 'select', options: ['Vaccinated', 'Pending', 'Not Required'], required: true },
            shednumber: { label: 'Shed Number', type: 'text', placeholder: 'e.g. Shed-A1', required: false }
        },
        customerFields: ['Farm Name', 'Delivery Schedule', 'Payment Terms'],
        vendorFields: ['Hatchery License', 'Breed Certification', 'Delivery Capacity'],
        inventoryFeatures: [
            'Mortality Tracking', 'Feed-to-Growth Ratio', 'Bird Batching', 'Vaccination Schedule',
            'Shed Management', 'Multi-Location Inventory', 'Stock Valuation (FIFO)', 'Reorder Points',
            'Auto Reordering', 'Purchase Order Management (Feed/Chicks)', 'Sales Order Processing (Birds/Eggs)',
            'Stock Adjustment (Mortality)', 'Growth Analysis', 'FCR Report', 'Mortality Analysis', 'Batch Lifecycle'
        ],
        reports: [
            'Growth Analysis', 'FCR Report', 'Mortality Analysis', 'Batch Lifecycle', 'Stock Summary',
            'Feed Consumption', 'Vaccination History', 'Stock Movement', 'Sales by Batch', 'Purchase Summary'
        ],
        paymentTerms: ['Cash', 'Advance', 'Credit 7 Days'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['December', 'January'], // High demand for chicken
            perishability: 'critical', // Live animals
            shelfLife: 45, // Days to maturity
            demandVolatility: 0.7,
            minOrderQuantity: 500, // chicks
            leadTime: 21, // Hatching cycle
        },
        setupTemplate: {
            categories: ['Broiler Birds', 'Layer Eggs', 'Poultry Feed', 'Medicines & Vaccines', 'Day-Old Chicks'],
            suggestedProducts: [
                { name: 'Live Broiler Chicken (Grade A)', unit: 'kg', category: 'Broiler Birds', startingStock: 5000, defaultPrice: 450, description: 'Market ready broiler chicken' },
                { name: 'Starter Feed (No. 1)', unit: 'bag', category: 'Poultry Feed', startingStock: 1000, defaultPrice: 6800, description: 'High protein chick starter feed' },
                { name: 'Table Eggs (Large Tray)', unit: 'dozen', category: 'Layer Eggs', startingStock: 500, defaultPrice: 380, description: 'Farm fresh large white eggs' }
            ]
        }
    },
    'solar-energy': {
        icon: 'Sun',
        imageUrl: '/specialized_hero_image.png',
        productFields: ['Serial/Panel ID', 'Capacity (Watts)', 'Type', 'Warranty Period', 'Efficiency'],
        taxCategories: ['Zero Rated', 'Sales Tax 17%'],
        units: ['pcs', 'set', 'kw'],
        alternateUnits: { 'set': 'pcs' },
        defaultTax: 0,
        fieldConfig: {
            serialpanelid: { label: 'Serial/Panel ID', type: 'text', placeholder: 'e.g. PANEL-2024-001', required: true },
            capacitywatts: { label: 'Capacity (Watts)', type: 'number', placeholder: 'e.g. 550, 600', required: true },
            type: { label: 'Panel Type', type: 'select', options: ['Mono PERC', 'Poly', 'Bifacial', 'Thin Film'], required: true },
            warrantyperiod: { label: 'Warranty Period', type: 'select', options: ['10 Years', '15 Years', '20 Years', '25 Years'], required: true },
            efficiency: { label: 'Efficiency (%)', type: 'number', placeholder: 'e.g. 21.5', required: false }
        },
        customerFields: ['Project Name', 'Installation Address', 'System Capacity (kW)'],
        vendorFields: ['Manufacturer', 'Tier Rating', 'Import License'],
        inventoryFeatures: [
            'Warranty Tracking (ID)', 'Installation Logs', 'Serial Number Management', 'Project-wise Stock',
            'Multi-Location Inventory', 'Barcode Scanning', 'Stock Valuation (FIFO)', 'Reorder Points',
            'Auto Reordering', 'Quotation Management', 'Sales Order Processing', 'Purchase Order Management',
            'Installation Schedule', 'Service Logs', 'Warranty Claims', 'Project Profitability'
        ],
        reports: [
            'Warranty Claims', 'Service Logs', 'Project Profitability', 'Stock Summary',
            'Serial-wise Status', 'Installation Report', 'Stock Valuation', 'Stock Movement',
            'Sales by Product', 'Sales by Project', 'Stock Ledger'
        ],
        paymentTerms: ['Advance 70%', 'On Installation', 'Credit 30 Days'],
        stockValuationMethod: 'FIFO',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['May', 'June', 'July'], // Summer peak
            perishability: 'low',
            shelfLife: 7300, // 20 years
            demandVolatility: 0.6,
            minOrderQuantity: 10,
            leadTime: 30,
        },
        setupTemplate: {
            categories: ['Solar Panels', 'Inverters', 'Lithium Batteries', 'Mounting Structures', 'DC Cables'],
            suggestedProducts: [
                { name: 'Mono Perc Tier-1 Panel (550W)', unit: 'pcs', category: 'Solar Panels', startingStock: 100, defaultPrice: 28000, description: 'High-efficiency mono-perc solar panels' },
                { name: 'Hybrid Inverter (6kW)', unit: 'pcs', category: 'Inverters', startingStock: 20, defaultPrice: 185000, description: '6kW Hybrid dual output inverter' },
                { name: 'Lithium Iron Phosphate Battery (100Ah)', unit: 'set', category: 'Lithium Batteries', startingStock: 15, defaultPrice: 245000, description: 'Deep cycle 48V 100Ah Lithium battery' }
            ]
        }
    },
    'courier-logistics': {
        icon: 'Truck',
        imageUrl: '/services_hero_image.png',
        productFields: ['Package Type', 'Weight Range', 'Dimensions', 'Tracking Series', 'Bag ID'],
        taxCategories: ['Services Tax 16%'],
        units: ['parcel', 'kg', 'bag'],
        alternateUnits: { 'bag': 'parcel' },
        defaultTax: 16,
        fieldConfig: {
            packagetype: { label: 'Package Type', type: 'select', options: ['Document', 'Parcel', 'Fragile', 'Bulk'], required: true },
            weightrange: { label: 'Weight Range (kg)', type: 'select', options: ['0-1kg', '1-5kg', '5-10kg', '10-25kg', '25kg+'], required: true },
            dimensions: { label: 'Dimensions (LxWxH cm)', type: 'text', placeholder: 'e.g. 30x20x10', required: false },
            trackingseries: { label: 'Tracking Series', type: 'text', placeholder: 'e.g. TRK-2024', required: true },
            bagid: { label: 'Bag ID', type: 'text', placeholder: 'e.g. BAG-001', required: false }
        },
        customerFields: ['Account Number', 'Pickup Address', 'Preferred Delivery Time'],
        vendorFields: ['Fleet Size', 'Coverage Area', 'Insurance Policy'],
        inventoryFeatures: [
            'RTO Tracking (Return to Origin)', 'Sorting Bag Management', 'Hub-wise Inventory', 'Manifest Logic',
            'Multi-Location Hubs', 'Barcode Scanning', 'Stock Valuation (n/a)', 'E-way Bill Support',
            'Order Lifecycle', 'Load Balancing', 'Route Management', 'Rider Inventory (Bags/Money)',
            'Delivery Status Tracking', 'Hub Transfer', 'Loss Management', 'Return Shipments'
        ],
        reports: [
            'Delivery Status Report', 'Hub Transfer Status', 'Loss Management', 'Return Shipments',
            'Hub Inventory Status', 'Rider Performance', 'Revenue by Hub', 'Stock Movement',
            'Pending Manifests', 'RTO Analysis', 'Stock Ledger'
        ],
        paymentTerms: ['Advance', 'COD', 'Monthly Invoicing'],
        stockValuationMethod: 'Average',
        reorderEnabled: false,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['November', 'December'], // Shopping season
            perishability: 'low',
            shelfLife: 365,
            demandVolatility: 0.8,
            minOrderQuantity: 50, // bags
            leadTime: 1,
        },
        setupTemplate: {
            categories: ['Local Courier', 'International Shipping', 'E-commerce Logistics', 'Packaging Material', 'Insurance'],
            suggestedProducts: [
                { name: 'Standard Next Day Delivery', unit: 'parcel', category: 'Local Courier', startingStock: 1000, defaultPrice: 250, description: 'Domestic overnight shipping' },
                { name: 'Logistics Flyer (Medium)', unit: 'bag', category: 'Packaging Material', startingStock: 5000, defaultPrice: 15, description: 'Tamper-proof courier flyers' },
                { name: 'E-commerce Cash on Delivery (COD)', unit: 'parcel', category: 'E-commerce Logistics', startingStock: 2000, defaultPrice: 350, description: 'COD delivery including collection' }
            ]
        }
    },
    'wholesale-distribution': {
        icon: 'Boxes',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Target Segment', 'Route/Area', 'Wholesale Price', 'Minimum Order Quantity'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%', 'FBR Standard'],
        units: ['pcs', 'case', 'dozen', 'kg'],
        alternateUnits: { 'case': 'pcs', 'dozen': 'pcs' },
        defaultTax: 17,
        fieldConfig: {
            targetsegment: { label: 'Target Segment', type: 'select', options: ['Retailers', 'Distributors', 'Institutions', 'Resellers'], required: true },
            routearea: { label: 'Route/Area', type: 'text', placeholder: 'e.g. Gulberg, Model Town', required: false },
            wholesaleprice: { label: 'Wholesale Price', type: 'number', placeholder: 'e.g. 1500', required: true },
            minimumorderquantity: { label: 'Minimum Order Quantity', type: 'number', placeholder: 'e.g. 100', required: true }
        },
        customerFields: ['Business Type', 'Credit Limit', 'Route Assignment'],
        vendorFields: ['Manufacturer Direct', 'Bulk Discount', 'Payment Terms'],
        inventoryFeatures: [
            'Multi-tiered Pricing', 'Fleet/Route Management', 'Bulk Order Processing', 'Scheme Logic',
            'Multi-Location Cold/Dry', 'Barcode Scanning', 'Stock Valuation (Average)', 'Reorder Points',
            'Auto Reordering', 'Purchase Order Management', 'Distribution Lifecycle', 'Stock Adjustment',
            'Salesman Inventory', 'Area Performance', 'Loading Sheet management', 'Beat tracking'
        ],
        reports: [
            'Salesman Inventory', 'Area Performance', 'Loading Sheet', 'Route Profitability',
            'Stock Summary', 'Scheme Performance', 'Bulk Order Status', 'Stock Movement',
            'Vendor Analysis', 'Market Outstanding', 'Stock Ledger'
        ],
        paymentTerms: ['Cash', 'Credit 15 Days', 'Post Dated Cheque', 'Bank Transfer'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['Ramzan', 'December'],
            perishability: 'low',
            shelfLife: 365,
            demandVolatility: 0.4,
            minOrderQuantity: 100,
            leadTime: 3,
        },
        setupTemplate: {
            categories: ['Bulk Staples', 'Cleaning Supplies', 'Personal Care', 'Beverages (Case)', 'Snacks'],
            suggestedProducts: [
                { name: 'Premium Cooking Oil (12 x 1L Pack)', unit: 'case', category: 'Bulk Staples', startingStock: 100, defaultPrice: 32000, description: 'Wholesale case of cooking oil' },
                { name: 'Tea Whitener (Pack of 24)', unit: 'dozen', category: 'Beverages (Case)', startingStock: 200, defaultPrice: 24000, description: 'Wholesale carton of tea whitener' },
                { name: 'Laundry Detergent (2kg x 6)', unit: 'case', category: 'Cleaning Supplies', startingStock: 50, defaultPrice: 8500, description: 'Bulk laundry detergent cases' }
            ]
        }
    },
    'petrol-pump': {
        icon: 'Fuel',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Fuel Type', 'Tank ID', 'Nozzle Number', 'Current Dip', 'Temperature'],
        taxCategories: ['Petroleum Levy', 'Sales Tax 17%'],
        units: ['litre', 'cm', 'load'],
        alternateUnits: { 'load': 'litre' },
        defaultTax: 17,
        fieldConfig: {
            fueltype: { label: 'Fuel Type', type: 'select', options: ['Petrol (92 RON)', 'Petrol (95 RON)', 'Diesel', 'Hi-Octane', 'CNG'], required: true },
            tankid: { label: 'Tank ID', type: 'text', placeholder: 'e.g. TANK-A1', required: true },
            nozzlenumber: { label: 'Nozzle Number', type: 'text', placeholder: 'e.g. NOZZLE-01', required: false },
            currentdip: { label: 'Current Dip (cm)', type: 'number', placeholder: 'e.g. 150', required: false },
            temperature: { label: 'Temperature (°C)', type: 'number', placeholder: 'e.g. 25', required: false }
        },
        customerFields: ['Fleet Card Number', 'Vehicle Number', 'Driver Name'],
        vendorFields: ['Oil Company', 'Supply Contract', 'Delivery Schedule'],
        inventoryFeatures: [
            'Tank Dip Logs', 'Evaporation loss tracking', 'Nozzle Sales tracking', 'Credit customer limits',
            'Multi-Location Tanks', 'Digital Meter Integration', 'Stock Valuation (n/a)', 'Reorder Points',
            'Price update alerts', 'Daily Reconciliation', 'Shift Management', 'Card vs Cash analysis',
            'Evaporation Analysis', 'Shortage tracking', 'Density tracking', 'Calibration history'
        ],
        reports: [
            'Daily Sales Reconciliation', 'Evaporation Analysis', 'Shortage Report', 'Shift-wise Sales',
            'Stock Summary', 'Tank Status', 'Credit Customer Aging', 'Stock Movement',
            'Density Report', 'Nozzle Performance', 'Stock Ledger'
        ],
        paymentTerms: ['Cash', 'Credit Card', 'Fleet Card', 'Corporate Credit'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'low',
            peakMonths: [],
            perishability: 'medium', // Evaporation
            shelfLife: 30,
            demandVolatility: 0.2, // Essential
            minOrderQuantity: 10000, // Litres
            leadTime: 2,
        },
        setupTemplate: {
            categories: ['High Octane', 'Premier Euro-5', 'Hi-Speed Diesel', 'Lubricants', 'Convenience Store'],
            suggestedProducts: [
                { name: 'Unleaded Petrol (92 Ron)', unit: 'litre', category: 'Premier Euro-5', startingStock: 25000, defaultPrice: 282, description: 'Standard unleaded petrol Ron 92' },
                { name: 'Premium Diesel (V-Power)', unit: 'litre', category: 'Hi-Speed Diesel', startingStock: 30000, defaultPrice: 295, description: 'High performance diesel for heavy engines' },
                { name: 'Synthetic Engine Oil (4L)', unit: 'pcs', category: 'Lubricants', startingStock: 50, defaultPrice: 7500, description: 'Full synthetic 5W-30 engine oil' }
            ]
        }
    },
    'cold-storage': {
        icon: 'Snowflake',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Customer Name', 'Chamber ID', 'Pallet Position', 'Item Type', 'Rent Start Date'],
        taxCategories: ['Services Tax 16%'],
        units: ['bag', 'crate', 'kg', 'day'],
        alternateUnits: { 'bag': 'kg' },
        defaultTax: 16,
        fieldConfig: {
            customername: { label: 'Customer Name', type: 'text', placeholder: 'e.g. ABC Traders', required: true },
            chamberid: { label: 'Chamber ID', type: 'text', placeholder: 'e.g. CHAMBER-A1', required: true },
            palletposition: { label: 'Pallet Position', type: 'text', placeholder: 'e.g. A1-R2-P3', required: false },
            itemtype: { label: 'Item Type', type: 'select', options: ['Frozen Meat', 'Fruits/Vegetables', 'Dairy', 'Pharmaceutical', 'Other'], required: true },
            rentstartdate: { label: 'Rent Start Date', type: 'date', required: true }
        },
        customerFields: ['Business Name', 'Storage Capacity Required', 'Temperature Requirement'],
        vendorFields: ['Cold Chain License', 'Temperature Range', 'Backup Power'],
        inventoryFeatures: [
            'Rental Space Management', 'Temperature Compliance Logs', 'Customer Inventory', 'Automatic Rent calc',
            'Multi-Location Chambers', 'Barcode Scanning', 'Stock Valuation (n/a)', 'Reorder Points',
            'Entry/Exit logs', 'Electricity consumption tracking', 'Weight bridge integration', 'Issue Notes',
            'Chamber mapping', 'Overdue alerts', 'Temperature logs', 'Space Utilization'
        ],
        reports: [
            'Space Utilization', 'Customer Stock Status', 'Rent Outstanding', 'Temperature Logs',
            'Stock Summary', 'Chamber Loading', 'Revenue by Chamber', 'Stock Movement',
            'Electricity Usage', 'Damage Report', 'Stock Ledger'
        ],
        paymentTerms: ['Monthly Rent', 'Advance Deposit', 'Season End'],
        stockValuationMethod: 'Average',
        reorderEnabled: false,
        multiLocationEnabled: true,
        serialTrackingEnabled: true,
        batchTrackingEnabled: false,
        expiryTrackingEnabled: true,
        manufacturingEnabled: false,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['June', 'July'], // Summer storage
            perishability: 'high', // Dependence on cooling
            shelfLife: 1, // Service integrity
            demandVolatility: 0.6,
            minOrderQuantity: 1, // Chamber
            leadTime: 0,
        },
        setupTemplate: {
            categories: ['Frozen Fruits/Veg', 'Meat & Poultry', 'Dairy Products', 'Pharmaceutical Storage', 'Dry Space'],
            suggestedProducts: [
                { name: 'Potato Storage (Monthly/Bag)', unit: 'bag', category: 'Frozen Fruits/Veg', startingStock: 1000, defaultPrice: 250, description: 'Monthly cold storage rent per 50kg bag' },
                { name: 'Frozen Chicken Carcass (Box)', unit: 'crate', category: 'Meat & Poultry', startingStock: 500, defaultPrice: 150, description: 'Daily cold storage rent per crate' },
                { name: 'Vaccine Cool Storage (Vial)', unit: 'pcs', category: 'Pharmaceutical Storage', startingStock: 10000, defaultPrice: 5, description: 'Temperature controlled storage per vial' }
            ]
        }
    },
    'book-publishing': {
        icon: 'BookOpen',
        imageUrl: '/services_hero_image.png',
        productFields: ['Author', 'Publisher', 'Edition', 'Language', 'Pages', 'Binding Type', 'ISBN'],
        taxCategories: ['GST 0%', 'GST 5%', 'GST 12%'],
        units: ['copy', 'set', 'box'],
        alternateUnits: { 'set': 'copy', 'box': 'copy' },
        defaultTax: 0,
        fieldConfig: {
            author: { label: 'Author Name', type: 'text', placeholder: 'e.g. Ashfaq Ahmed', required: true },
            publisher: { label: 'Publisher', type: 'text', placeholder: 'e.g. Oxford University Press', required: false },
            edition: { label: 'Edition', type: 'text', placeholder: 'e.g. 1st Edition, Revised 2024', required: false },
            language: { label: 'Language', type: 'select', options: ['English', 'Urdu', 'Arabic', 'Punjabi'], required: true },
            pages: { label: 'Number of Pages', type: 'number', placeholder: 'e.g. 250', required: false },
            bindingtype: { label: 'Binding Type', type: 'select', options: ['Hardcover', 'Paperback', 'Spiral'], required: true },
            isbn: { label: 'ISBN Number', type: 'text', placeholder: 'e.g. 978-0-123456-78-9', required: false }
        },
        customerFields: ['Distributor Type', 'Territory', 'Discount Tier'],
        vendorFields: ['Printing Press', 'Paper Quality', 'Binding Type'],
        inventoryFeatures: [
            'ISBN Tracking', 'Edition Management', 'Language Variants', 'Multi-Location Inventory',
            'Barcode Scanning', 'Stock Valuation (FIFO/LIFO/Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'GST Invoicing', 'E-way Bill', 'E-invoice', 'Stock Transfer', 'Stock Adjustment', 'ABC Analysis',
            'Author Sales', 'Category Performance', 'Edition-wise Sales'
        ],
        reports: [
            'Author Sales', 'Category Performance', 'Edition-wise Sales', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Fast/Slow Moving Items',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer', 'Publisher Performance'
        ],
        paymentTerms: ['Cash', 'Credit 30 Days', 'Credit 60 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['August', 'September'], // Academic year start
            perishability: 'low',
            shelfLife: 3650,
            demandVolatility: 0.8,
            minOrderQuantity: 50,
            leadTime: 14,
        },
        setupTemplate: {
            categories: ['Fiction & Novels', 'Educational Textbooks', 'Technical Guides', 'Children Books', 'Digital Prints'],
            suggestedProducts: [
                { name: 'Standard Urdu Novel (Hardcover)', unit: 'copy', category: 'Fiction & Novels', startingStock: 500, defaultPrice: 1200, description: 'Premium hardcover Urdu novel' },
                { name: 'Class 10th Math Textbook', unit: 'copy', category: 'Educational Textbooks', startingStock: 1000, defaultPrice: 450, description: 'Board certified grade 10 math textbook' },
                { name: 'Introduction to Accounting', unit: 'copy', category: 'Technical Guides', startingStock: 200, defaultPrice: 1850, description: 'Bachelors level accounting textbook' }
            ]
        }
    },
    'steel-iron': {
        icon: 'BicepFlexed',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Grade', 'Length', 'Thickness', 'Origin', 'Weight per Feet'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%'],
        units: ['ton', 'kg', 'bundle', 'pcs'],
        alternateUnits: { 'bundle': 'pcs', 'ton': 'kg' },
        defaultTax: 17,
        fieldConfig: {
            grade: { label: 'Steel Grade', type: 'select', options: ['Grade 40', 'Grade 60', 'Grade 75', 'Mild Steel'], required: true },
            length: { label: 'Length (feet)', type: 'number', placeholder: 'e.g. 20, 40', required: true },
            thickness: { label: 'Thickness (mm)', type: 'number', placeholder: 'e.g. 8, 10, 12', required: true },
            origin: { label: 'Origin', type: 'select', options: ['Local', 'China', 'Turkey', 'Japan'], required: true },
            weightperfeet: { label: 'Weight per Feet (kg)', type: 'number', placeholder: 'e.g. 0.888', required: false }
        },
        customerFields: ['Project Name', 'Contractor License', 'Delivery Site'],
        vendorFields: ['Mill Name', 'Quality Certificate', 'Payment Terms'],
        inventoryFeatures: [
            'Weight-based Stock', 'Length-based Stock', 'Grade Management', 'Project-wise Allocation',
            'Multi-Location Yard', 'Barcode Scanning', 'Stock Valuation (Average)', 'Reorder Points',
            'Auto Reordering', 'Quotation Management', 'Sales Order Processing', 'Purchase Order Management',
            'Bilty Tracking', 'Weight bridge integration', 'Grade-wise Analysis', 'Section Performance'
        ],
        reports: [
            'Grade-wise Sales', 'Section Performance', 'Weight bridge Report', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Fast/Slow Moving Items',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer', 'Purchase Summary'
        ],
        paymentTerms: ['Advance', 'Cash', 'Credit 30 Days', 'LC'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['March', 'April'], // Construction
            perishability: 'low',
            shelfLife: 7300,
            demandVolatility: 0.5,
            minOrderQuantity: 10, // tons
            leadTime: 7,
        },
        setupTemplate: {
            categories: ['Steel Rebar (G-60)', 'Iron Beams (I-Beam)', 'Scrap Iron', 'G.I Sheets', 'Wire Rods'],
            suggestedProducts: [
                { name: 'Deformed Bar (12mm)', unit: 'ton', category: 'Steel Rebar (G-60)', startingStock: 50, defaultPrice: 265000, description: 'Grade 60 structural steel rebar' },
                { name: 'Iron Angle (2x2)', unit: 'bundle', category: 'Iron Beams (I-Beam)', startingStock: 100, defaultPrice: 8500, description: 'Standard 2x2 structural iron angle' },
                { name: 'Scrap Metal Grade-A', unit: 'ton', category: 'Scrap Iron', startingStock: 20, defaultPrice: 185000, description: 'Sorted Grade-A heavy melting scrap' }
            ]
        }
    },

    /** Steel trading, stockists, coils/sheets/pipes, complements mill/rebar-focused `steel-iron`. */
    'steel-industry': {
        name: 'Steel Industry (Trading)',
        name_ur: 'اسٹیل انڈسٹری (ٹریڈنگ)',
        icon: 'Factory',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Grade / Spec', 'Section / Form', 'Finish', 'Mill or Origin', 'Weight (MT or kg)'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%', 'Further Tax where applicable'],
        units: ['ton', 'kg', 'bundle', 'pcs', 'sheet'],
        alternateUnits: { bundle: 'pcs', sheet: 'kg' },
        defaultTax: 17,
        fieldConfig: {
            grade: { label: 'Grade / Spec', type: 'select', options: ['ASTM A36', 'Grade 40', 'Grade 60', 'SS304', 'SS316', 'Commercial MS', 'Other'], required: true },
            section: { label: 'Section / Form', type: 'select', options: ['Rebar', 'Angle / Channel', 'HR Coil', 'CR Sheet', 'GI Sheet', 'Pipe / Tube', 'Plate', 'Billet / Bloom', 'Scrap'], required: true },
            finish: { label: 'Finish', type: 'select', options: ['Black', 'Galvanized', 'Pickled & Oiled', 'Bright', 'N/A'], required: false },
            mill: { label: 'Mill / Origin', type: 'select', options: ['Local', 'China', 'Turkey', 'Japan', 'UAE', 'Mixed'], required: false },
            weight: { label: 'Weight (MT)', type: 'number', placeholder: 'e.g. 2.5', required: false },
        },
        customerFields: ['Project / Site', 'Contractor STRN', 'Weighbridge Slip Ref'],
        vendorFields: ['Mill Certificate', 'LC / TT Terms', 'Transit Insurance'],
        inventoryFeatures: [
            'MT / kg dual valuation', 'Yard / godown locations', 'Mill test certificate tracking',
            'Grade & section mix reporting', 'Weighbridge reconciliation', 'Project allocation',
            'GST + WHT compliant billing', 'Import landed cost layers',
        ],
        reports: [
            'MT sold by grade', 'Margin by product form', 'Yard stock ageing',
            'Purchase vs sales spread', 'Project-wise off-take', 'Weighbridge variance',
        ],
        paymentTerms: ['Advance', 'LC', 'CAD', 'Credit 15 Days', 'Credit 30 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['February', 'March', 'April', 'September', 'October'],
            perishability: 'low',
            shelfLife: 7300,
            demandVolatility: 0.55,
            minOrderQuantity: 1,
            leadTime: 10,
        },
        setupTemplate: {
            categories: ['Rebar & Structurals', 'HR / CR Coils', 'GI & Colour Coated', 'Pipes & Hollow Sections', 'Plates & Flats', 'Scrap & Billets'],
            suggestedProducts: [
                { name: 'HR Coil 2.0mm (MT)', unit: 'ton', category: 'HR / CR Coils', startingStock: 25, defaultPrice: 195000, description: 'Hot rolled coil for profiling and drums' },
                { name: 'GI Sheet 24G (8x4 ft)', unit: 'sheet', category: 'GI & Colour Coated', startingStock: 200, defaultPrice: 6200, description: 'Galvanized roofing / ducting sheet' },
                { name: 'MS Black Pipe 2" SCH40', unit: 'pcs', category: 'Pipes & Hollow Sections', startingStock: 120, defaultPrice: 1850, description: 'Standard water / gas line pipe length' },
            ],
        },
    },

    'construction-material': {
        icon: 'BrickWall',
        imageUrl: '/industrial_hero_image.png',
        productFields: ['Material Type', 'Grade', 'Brand', 'Strength'],
        taxCategories: ['Sales Tax 17%', 'WHT 2%'],
        units: ['bag', 'pcs', 'truck', 'quintal'],
        alternateUnits: { 'truck': 'bag', 'quintal': 'kg' },
        defaultTax: 17,
        fieldConfig: {
            materialtype: { label: 'Material Type', type: 'select', options: ['Cement', 'Sand', 'Gravel', 'Bricks', 'Blocks'], required: true },
            grade: { label: 'Grade/Quality', type: 'select', options: ['Premium', 'Standard', 'Economy'], required: true },
            brand: { label: 'Brand', type: 'text', placeholder: 'e.g. DG Khan, Maple Leaf', required: false },
            strength: { label: 'Strength (PSI)', type: 'number', placeholder: 'e.g. 3000, 4000', required: false }
        },
        customerFields: ['Site Address', 'Project Manager', 'Delivery Schedule'],
        vendorFields: ['Supplier Type', 'Quality Certificate', 'Bulk Discount'],
        inventoryFeatures: [
            'Bag-based Inventory', 'Bulk Material Tracking', 'Site-wise Delivery', 'Multi-Location Godown',
            'Barcode Scanning', 'Stock Valuation (Average)', 'Reorder Points', 'Auto Reordering',
            'Quotation Management', 'Sales Order Processing', 'Purchase Order Management', 'Challan Management',
            'Delivery Schedule', 'Site Allocation', 'Material Usage Report', 'Truck Tracking'
        ],
        reports: [
            'Site-wise Delivery', 'Material Usage Report', 'Truck History', 'Stock Summary',
            'Stock Valuation', 'Stock Movement', 'ABC Analysis', 'Batch-wise Reports',
            'Stock Ledger', 'Sales by Product', 'Sales by Customer', 'Purchase Summary'
        ],
        paymentTerms: ['Advance', 'Cash', 'On Delivery', 'Credit 15 Days'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        serialTrackingEnabled: false,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: false,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'medium',
            peakMonths: ['March', 'April'],
            perishability: 'low',
            shelfLife: 365, // Cement hardens
            demandVolatility: 0.5,
            minOrderQuantity: 100, // bags
            leadTime: 3,
        },
        setupTemplate: {
            categories: ['OPC Cement', 'Crush/Bajri', 'Fine Sand', 'Bricks (First Class)', 'Chemical Admixtures'],
            suggestedProducts: [
                { name: 'Premium Cement (50kg)', unit: 'bag', category: 'OPC Cement', startingStock: 2000, defaultPrice: 1250, description: 'High-strength OPC cement' },
                { name: 'Red Bricks (Standard Size)', unit: 'pcs', category: 'Bricks (First Class)', startingStock: 50000, defaultPrice: 15, description: 'First class baked clay bricks' },
                { name: 'Construction Sand (Ravi)', unit: 'truck', category: 'Fine Sand', startingStock: 10, defaultPrice: 18000, description: 'Standard Ravi sand for construction' }
            ]
        }
    },
    'dairy-farm': {
        icon: 'Beef',
        imageUrl: '/agriculture_hero_image.png',
        productFields: ['Animal ID', 'Breed', 'Lactation Cycle', 'Daily Milk Yield', 'Feed Plan', 'Vaccination Status'],
        taxCategories: ['Exempt', 'Sales Tax 17%'],
        units: ['litre', 'animal', 'kg', 'bag'],
        alternateUnits: { 'bag': 'kg' },
        defaultTax: 0,
        fieldConfig: {
            animalid: { label: 'Animal ID/Tag', type: 'text', placeholder: 'e.g. COW-101', required: true },
            breed: { label: 'Breed', type: 'select', options: ['Sahiwal', 'Cholistani', 'Friesian', 'Jersey', 'Cross Breed', 'Nili Ravi', 'Kundi'], required: true },
            lactationcycle: { label: 'Lactation Cycle', type: 'number', placeholder: 'e.g. 1, 2', required: false },
            dailymilkyield: { label: 'Daily Milk Yield (L)', type: 'number', placeholder: 'e.g. 15', required: true },
            feedplan: { label: 'Feed Plan', type: 'select', options: ['Standard', 'High-Yield Mix', 'Dry Period', 'Calf Starter'], required: false },
            vaccinationstatus: { label: 'Vaccination Status', type: 'select', options: ['Fully Vaccinated', 'Pending', 'Due Soon'], required: true }
        },
        inventoryFeatures: [
            'Individual Animal Tracking', 'Milk Production Logs', 'Feed Consumption Analysis',
            'Breeding Calendar', 'Health & Vaccination Alerts', 'Fat Content tracking',
            'Multi-Location Sheds', 'Bulk Tank Management'
        ],
        reports: [
            'Daily Milk Production', 'Herd Health Report', 'Feed vs Production FCR',
            'Animal Lifecycle Status', 'Stock Summary', 'Breeding Efficiency'
        ],
        paymentTerms: ['Cash', 'Advance', 'Weekly Billing'],
        stockValuationMethod: 'Average',
        reorderEnabled: true,
        multiLocationEnabled: true,
        batchTrackingEnabled: true,
        expiryTrackingEnabled: true,
        manufacturingEnabled: true,
        intelligence: {
            seasonality: 'high',
            peakMonths: ['December', 'January'], // High milk demand
            perishability: 'critical', // Milk spoils
            shelfLife: 1,
            demandVolatility: 0.4,
            minOrderQuantity: 10,
            leadTime: 1,
        },
        setupTemplate: {
            categories: ['Fresh Milk', 'Livestock Feed', 'Breeding Cattle', 'Veterinary Supplies', 'Dairy Equipment'],
            suggestedProducts: [
                { name: 'Pure Cow Milk (Fresh)', unit: 'litre', category: 'Fresh Milk', startingStock: 250, defaultPrice: 210, description: 'Freshly milked pure cow milk' },
                { name: 'High-Protein Cattle Feed', unit: 'bag', category: 'Livestock Feed', startingStock: 100, defaultPrice: 4200, description: 'Balanced nutrition feed for dairy cattle' },
                { name: 'Standard Milking Machine', unit: 'pcs', category: 'Dairy Equipment', startingStock: 5, defaultPrice: 85000, description: 'Automatic single-bucket milking machine' }
            ]
        }
    },
};
