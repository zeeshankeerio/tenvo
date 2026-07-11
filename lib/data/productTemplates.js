/**
 * Product Templates Database
 * Pre-configured product templates for quick setup
 * Realistic Pakistani market pricing (PKR)
 */

export const productTemplates = {
    // Mobile Phones
    'mobile': [
        {
            name: 'Samsung Galaxy A54 5G',
            brand: 'Samsung',
            storage: '128GB',
            color: 'Awesome Violet',
            warranty: '1 Year',
            price: 89999,
            costPrice: 82000,
            category: 'Smartphones',
            unit: 'pcs'
        },
        {
            name: 'Infinix Hot 40 Pro',
            brand: 'Infinix',
            storage: '256GB',
            color: 'Starlit Black',
            warranty: '1 Year',
            price: 42999,
            costPrice: 38000,
            category: 'Budget Phones',
            unit: 'pcs'
        },
        {
            name: 'Tecno Spark 20 Pro',
            brand: 'Tecno',
            storage: '128GB',
            color: 'Glossy White',
            warranty: '1 Year',
            price: 34999,
            costPrice: 31000,
            category: 'Budget Phones',
            unit: 'pcs'
        },
        {
            name: 'iPhone 15 Pro Max',
            brand: 'Apple',
            storage: '256GB',
            color: 'Natural Titanium',
            warranty: '1 Year',
            price: 469999,
            costPrice: 440000,
            category: 'Premium Phones',
            unit: 'pcs'
        }
    ],

    // Grocery Items
    'grocery': [
        {
            name: 'Tapal Danedar Tea (950g)',
            brand: 'Tapal',
            unit: 'pack',
            price: 1250,
            costPrice: 1100,
            category: 'Beverages',
            minStock: 50
        },
        {
            name: 'National Salt (800g)',
            brand: 'National',
            unit: 'pack',
            price: 45,
            costPrice: 38,
            category: 'Spices & Condiments',
            minStock: 100
        },
        {
            name: 'Dalda Cooking Oil (5L)',
            brand: 'Dalda',
            unit: 'bottle',
            price: 2850,
            costPrice: 2650,
            category: 'Cooking Oils',
            minStock: 30
        },
        {
            name: 'Shan Biryani Masala (50g)',
            brand: 'Shan',
            unit: 'pack',
            price: 85,
            costPrice: 70,
            category: 'Spices & Condiments',
            minStock: 100
        },
        {
            name: 'Nestle Everyday Milk Powder (400g)',
            brand: 'Nestle',
            unit: 'pack',
            price: 650,
            costPrice: 580,
            category: 'Dairy Products',
            minStock: 50
        }
    ],

    // Textile Products
    'textile-wholesale': [
        {
            name: 'Premium Lawn Suit 3pc',
            articleno: 'GA-2024-L01',
            designno: 'D-505',
            fabrictype: 'Lawn',
            korafinished: 'Printed',
            widtharz: 44,
            thaanlength: 35,
            suitcutting: 2.5,
            sourcing: 'local',
            price: 3500,
            costPrice: 2800,
            unit: 'suit',
            category: 'Lawn'
        },
        {
            name: 'Cotton Shirt Piece',
            articleno: 'AK-2024-C01',
            designno: 'D-301',
            fabrictype: 'Cotton',
            korafinished: 'Dyed',
            widtharz: 58,
            suitcutting: 2.25,
            sourcing: 'local',
            price: 1800,
            costPrice: 1400,
            unit: 'suit',
            category: 'Cotton'
        },
        {
            name: 'Chiffon Embroidered Suit',
            articleno: 'SS-2024-CH01',
            designno: 'D-701',
            fabrictype: 'Chiffon',
            korafinished: 'Embroidered',
            widtharz: 44,
            suitcutting: 3,
            sourcing: 'local',
            price: 12500,
            costPrice: 9500,
            unit: 'suit',
            category: 'Chiffon'
        }
    ],

    // Electronics
    'electronics-goods': [
        {
            name: 'Haier 1.5 Ton Inverter AC',
            brand: 'Haier',
            model: 'HSU-18HFM',
            warranty: '2 Years',
            price: 125000,
            costPrice: 110000,
            unit: 'pcs',
            category: 'Air Conditioners'
        },
        {
            name: 'Orient 56" Ceiling Fan',
            brand: 'Orient',
            model: 'Aeroslim',
            warranty: '2 Years',
            price: 8500,
            costPrice: 7200,
            unit: 'pcs',
            category: 'Fans'
        },
        {
            name: 'Dawlance Refrigerator 14 Cu Ft',
            brand: 'Dawlance',
            model: '9144 WB',
            warranty: '2 Years',
            price: 89000,
            costPrice: 78000,
            unit: 'pcs',
            category: 'Refrigerators'
        }
    ],

    // Pharmacy
    'pharmacy': [
        {
            name: 'Panadol Extra (20 Tablets)',
            brand: 'GSK',
            druglicense: 'DL-123456',
            scheduleh1: false,
            storageconditions: 'Room Temperature',
            price: 85,
            costPrice: 68,
            unit: 'pack',
            category: 'Pain Relief'
        },
        {
            name: 'Augmentin 625mg (14 Tablets)',
            brand: 'GSK',
            druglicense: 'DL-789012',
            scheduleh1: true,
            storageconditions: 'Room Temperature',
            price: 450,
            costPrice: 380,
            unit: 'pack',
            category: 'Antibiotics'
        }
    ],

    // Bakery
    'bakery-confectionery': [
        {
            name: 'Peek Freans Sooper Biscuits',
            brand: 'Peek Freans',
            batchnumber: 'PF-2024-001',
            expirydate: '2025-12-31',
            price: 120,
            costPrice: 95,
            unit: 'pack',
            category: 'Biscuits'
        },
        {
            name: 'English Biscuit Chocolate Chip Cookies',
            brand: 'English Biscuit',
            batchnumber: 'EB-2024-002',
            expirydate: '2025-10-31',
            price: 180,
            costPrice: 145,
            unit: 'pack',
            category: 'Cookies'
        }
    ]
};

/**
 * Get product templates for a domain
 * @param {string} domain - Business domain
 * @returns {Array} Array of product templates
 */
export function getTemplatesForDomain(domain) {
    return productTemplates[domain] || [];
}

/**
 * Get all available template domains
 * @returns {string[]} Array of domain names with templates
 */
export function getAvailableTemplateDomains() {
    return Object.keys(productTemplates);
}
