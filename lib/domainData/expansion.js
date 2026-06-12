export const expansionDomains = {
  'salon-spa': {
    name: 'Salon & Spa',
    name_ur: 'سیلون اور سپا',
    icon: 'Scissors',
    imageUrl: '/services_hero_image.png',
    productFields: ['Service Type', 'Stylist', 'Duration', 'Room'],
    taxCategories: ['Services Tax 16%', 'Sales Tax 17%'],
    units: ['service', 'session', 'pcs'],
    alternateUnits: { service: 'session' },
    defaultTax: 16,
    customerFields: ['Preferred Stylist', 'Skin/Hair Notes', 'Membership Tier'],
    vendorFields: ['Product Brand', 'Supply Frequency', 'Commission Terms'],
    inventoryFeatures: [
      'Appointment Scheduling', 'Stylist Utilization', 'Service Package Management',
      'Retail + Service Billing', 'Low Stock Alerts', 'Client History Tracking'
    ],
    reports: ['Revenue by Stylist', 'Service Mix', 'Retail Sales', 'Repeat Client Rate'],
    paymentTerms: ['Cash', 'Card', 'Wallet', 'Membership Prepaid'],
    stockValuationMethod: 'Average',
    reorderEnabled: true,
    multiLocationEnabled: true,
    serialTrackingEnabled: false,
    batchTrackingEnabled: true,
    expiryTrackingEnabled: true,
    manufacturingEnabled: false,
    serviceMode: true,
    intelligence: {
      seasonality: 'high',
      peakMonths: ['March', 'April', 'October', 'November', 'December'],
      perishability: 'medium',
      shelfLife: 730,
      demandVolatility: 0.58,
      minOrderQuantity: 1,
      leadTime: 5,
    },
    setupTemplate: {
      categories: ['Hair Services', 'Skin Services', 'Nail Services', 'Retail Products'],
      suggestedProducts: [
        { name: 'Haircut & Styling', unit: 'service', category: 'Hair Services', startingStock: 200, defaultPrice: 2500, description: 'Standard haircut and styling service' },
        { name: 'Hydrating Facial', unit: 'service', category: 'Skin Services', startingStock: 120, defaultPrice: 4500, description: 'Hydrating facial treatment session' },
        { name: 'Keratin Shampoo (250ml)', unit: 'pcs', category: 'Retail Products', startingStock: 60, defaultPrice: 1800, description: 'Professional aftercare shampoo' }
      ]
    }
  },
  'dental-clinic': {
    name: 'Dental Clinic',
    name_ur: 'دندان سازی کلینک',
    icon: 'ShieldPlus',
    imageUrl: '/services_hero_image.png',
    productFields: ['Procedure Type', 'Doctor', 'Chair', 'Case Number'],
    taxCategories: ['Exempt', 'Services Tax 5%'],
    units: ['procedure', 'case', 'pcs'],
    alternateUnits: { case: 'procedure' },
    defaultTax: 0,
    customerFields: ['Patient MRN', 'Allergies', 'Insurance Provider'],
    vendorFields: ['Medical Device License', 'Consumables Lead Time'],
    inventoryFeatures: [
      'Procedure-linked Consumption', 'Chair Utilization', 'Sterile Stock Tracking',
      'Appointment Billing', 'Batch + Expiry Tracking', 'Patient Invoice History'
    ],
    reports: ['Procedure Revenue', 'Consumable Usage', 'Doctor Productivity', 'Expiry Alerts'],
    paymentTerms: ['Cash', 'Card', 'Insurance', 'Installments'],
    stockValuationMethod: 'FEFO',
    reorderEnabled: true,
    multiLocationEnabled: false,
    serialTrackingEnabled: true,
    batchTrackingEnabled: true,
    expiryTrackingEnabled: true,
    manufacturingEnabled: false,
    serviceMode: true,
    intelligence: {
      seasonality: 'medium',
      peakMonths: ['January', 'June', 'July', 'August', 'December'],
      perishability: 'critical',
      shelfLife: 180,
      demandVolatility: 0.42,
      minOrderQuantity: 1,
      leadTime: 10,
    },
    setupTemplate: {
      categories: ['Consultation', 'Restorative', 'Orthodontics', 'Consumables'],
      suggestedProducts: [
        { name: 'Dental Consultation', unit: 'procedure', category: 'Consultation', startingStock: 200, defaultPrice: 2000, description: 'Initial dental consultation visit' },
        { name: 'Tooth Filling', unit: 'procedure', category: 'Restorative', startingStock: 150, defaultPrice: 6500, description: 'Composite restoration treatment' },
        { name: 'Latex Gloves (Box)', unit: 'pcs', category: 'Consumables', startingStock: 80, defaultPrice: 2200, description: 'Clinical examination gloves' }
      ]
    }
  },
  'veterinary-clinic': {
    name: 'Veterinary Clinic',
    name_ur: 'ویٹرنری کلینک',
    icon: 'HeartPulse',
    imageUrl: '/services_hero_image.png',
    productFields: ['Animal Type', 'Breed', 'Visit Type', 'Vaccination'],
    taxCategories: ['Exempt', 'Services Tax 5%'],
    units: ['visit', 'procedure', 'pcs'],
    alternateUnits: { procedure: 'visit' },
    defaultTax: 0,
    customerFields: ['Pet Name', 'Breed', 'Vaccination Record'],
    vendorFields: ['Cold-chain Capability', 'Medicine License'],
    inventoryFeatures: [
      'Pet Visit Tracking', 'Vaccination Schedules', 'Medicine Batch Tracking',
      'Expiry Alerts', 'Clinical Billing', 'Follow-up Reminders'
    ],
    reports: ['Visit Volume', 'Vaccination Compliance', 'Medicine Usage', 'Revenue by Service'],
    paymentTerms: ['Cash', 'Card', 'Wallet'],
    stockValuationMethod: 'FEFO',
    reorderEnabled: true,
    multiLocationEnabled: false,
    serialTrackingEnabled: false,
    batchTrackingEnabled: true,
    expiryTrackingEnabled: true,
    manufacturingEnabled: false,
    serviceMode: true,
    intelligence: {
      seasonality: 'medium',
      peakMonths: ['March', 'April', 'May', 'September', 'October'],
      perishability: 'high',
      shelfLife: 365,
      demandVolatility: 0.55,
      minOrderQuantity: 1,
      leadTime: 7,
    },
    setupTemplate: {
      categories: ['Consultation', 'Vaccination', 'Surgery', 'Pharmacy'],
      suggestedProducts: [
        { name: 'General Pet Checkup', unit: 'visit', category: 'Consultation', startingStock: 250, defaultPrice: 2500, description: 'Routine veterinary checkup' },
        { name: 'Rabies Vaccination', unit: 'procedure', category: 'Vaccination', startingStock: 180, defaultPrice: 3500, description: 'Rabies vaccine administration' },
        { name: 'Deworming Tablets (Pack)', unit: 'pcs', category: 'Pharmacy', startingStock: 120, defaultPrice: 1200, description: 'Routine deworming medicine pack' }
      ]
    }
  }
};