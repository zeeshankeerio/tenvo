/**
 * Comprehensive Inventory Features Configuration
 * Based on Busy.in's complete inventory management system
 * All features are domain-aware and configurable per business type
 */

export const inventoryFeatures = {
  // Core Inventory Features
  core: {
    productMaster: {
      enabled: true,
      features: [
        'SKU/Barcode Management',
        'Product Name & Description',
        'Category & Subcategory',
        'Brand Management',
        'HSN/SAC Code',
        'Unit of Measurement',
        'Alternate Units',
        'Multiple Units Support',
        'Product Images',
        'Product Variants',
      ],
    },
    stockManagement: {
      enabled: true,
      features: [
        'Real-time Stock Tracking',
        'Opening Stock Balance',
        'Stock Valuation Methods (FIFO/LIFO/Average)',
        'Stock Adjustment',
        'Stock Transfer',
        'Stock Reservation',
        'Negative Stock Control',
        'Stock Aging Report',
      ],
    },
    multiLocation: {
      enabled: true,
      features: [
        'Multiple Godowns/Warehouses',
        'Location-wise Stock',
        'Stock Transfer Between Locations',
        'Location-wise Reports',
        'Location-wise Pricing',
        'Location-wise Reorder Points',
      ],
    },
  },

  // Advanced Tracking Features
  tracking: {
    batchTracking: {
      enabled: true,
      applicableDomains: [
        'pharmacy',
        'food-beverages',
        'fmcg',
        'chemical',
        'grocery',
        'paint',
        'textile-wholesale',
        'textile-mill',
      ],
      features: [
        'Batch Number Generation',
        'Batch-wise Stock',
        'Batch Expiry Tracking',
        'Batch-wise Costing',
        'FEFO (First Expiry First Out)',
        'Batch-wise Reports',
      ],
    },
    serialNumberTracking: {
      enabled: true,
      applicableDomains: [
        'auto-parts',
        'computer-hardware',
        'mobile',
        'electronics-goods',
        'electrical',
      ],
      features: [
        'Serial Number Generation',
        'Serial Number Validation',
        'Serial Number History',
        'Warranty Tracking by Serial',
        'Service History by Serial',
        'Serial-wise Reports',
      ],
    },
    expiryTracking: {
      enabled: true,
      applicableDomains: [
        'pharmacy',
        'food-beverages',
        'fmcg',
        'grocery',
        'chemical',
      ],
      features: [
        'Expiry Date Management',
        'Expiry Alerts',
        'Near Expiry Reports',
        'Expired Stock Reports',
        'Auto Block Expired Items',
        'FEFO (First Expiry First Out)',
      ],
    },
  },

  // Parameterized Inventory
  parameterized: {
    sizeColorMatrix: {
      enabled: true,
      applicableDomains: [
        'retail-shop',
        'garments',
        'furniture',
        'paint',
        'boutique-fashion',
        'leather-footwear',
      ],
      features: [
        'Size Variants',
        'Color Variants',
        'Size-Color Matrix',
        'Variant-wise Stock',
        'Variant-wise Pricing',
        'Variant-wise Reports',
      ],
    },
    customParameters: {
      enabled: true,
      features: [
        'Custom Attributes',
        'Parameter-wise Stock',
        'Parameter-wise Pricing',
        'Parameter Combinations',
        'Dynamic Attributes',
      ],
    },
  },

  // Manufacturing & Production
  manufacturing: {
    enabled: true,
    applicableDomains: [
      'chemical',
      'paint',
      'paper-mill',
      'furniture',
      'garments',
    ],
    features: [
      'Bill of Materials (BOM)',
      'Production Orders',
      'Work-in-Progress (WIP)',
      'Production Costing',
      'Material Requirement Planning (MRP)',
      'Production Reports',
      'Job Work Management',
      'Subcontracting',
    ],
  },

  // Order Management
  orderManagement: {
    quotation: {
      enabled: true,
      features: [
        'Create Quotations',
        'Convert Quotation to Order',
        'Convert Quotation to Invoice',
        'Quotation Validity',
        'Quotation Follow-up',
        'Quotation Reports',
      ],
    },
    salesOrder: {
      enabled: true,
      features: [
        'Sales Order Creation',
        'Order Status Tracking',
        'Partial Fulfillment',
        'Order Cancellation',
        'Order Modification',
        'Order Reports',
      ],
    },
    purchaseOrder: {
      enabled: true,
      features: [
        'Purchase Order Creation',
        'PO Approval Workflow',
        'PO Status Tracking',
        'GRN (Goods Receipt Note)',
        'PO vs GRN Comparison',
        'PO Reports',
      ],
    },
    challan: {
      enabled: true,
      features: [
        'Delivery Challan',
        'Challan to Invoice Conversion',
        'Challan Numbering',
        'E-way Bill Integration',
        'Challan Reports',
      ],
    },
  },

  // Pricing & Discounts
  pricing: {
    priceLists: {
      enabled: true,
      features: [
        'Multiple Price Lists',
        'Customer-wise Pricing',
        'Quantity Break Pricing',
        'Seasonal Pricing',
        'Promotional Pricing',
        'Price History',
      ],
    },
    discountSchemes: {
      enabled: true,
      features: [
        'Percentage Discount',
        'Fixed Amount Discount',
        'Quantity-based Discount',
        'Customer Category Discount',
        'Product Category Discount',
        'Bulk Discount',
        'Loyalty Discounts',
      ],
    },
  },

  // Reordering & Automation
  reordering: {
    reorderPoints: {
      enabled: true,
      features: [
        'Minimum Stock Level',
        'Maximum Stock Level',
        'Reorder Point',
        'Reorder Quantity',
        'Safety Stock',
        'Auto Reorder Alerts',
      ],
    },
    autoReordering: {
      enabled: true,
      features: [
        'Automatic PO Generation',
        'Vendor-wise Reorder',
        'Lead Time Consideration',
        'Demand Forecasting Integration',
        'Reorder Reports',
      ],
    },
  },

  // GST & Compliance
  gst: {
    gstInvoicing: {
      enabled: true,
      features: [
        'GST-compliant Invoices',
        'CGST/SGST/IGST Calculation',
        'GST Rate Configuration',
        'Place of Supply',
        'GSTIN Validation',
        'GST Reports',
      ],
    },
    eWayBill: {
      enabled: true,
      features: [
        'Auto E-way Bill Generation',
        'E-way Bill Number Tracking',
        'E-way Bill Validity',
        'E-way Bill Cancellation',
        'E-way Bill Reports',
      ],
    },
    eInvoice: {
      enabled: true,
      features: [
        'E-invoice Generation',
        'IRN (Invoice Reference Number)',
        'QR Code Generation',
        'E-invoice Validation',
        'E-invoice Reports',
      ],
    },
    gstr: {
      enabled: true,
      features: [
        'GSTR-1 Export',
        'GSTR-2 Import',
        'GSTR-2A Reconciliation',
        'GSTR-3B Preparation',
        'GSTR Reports',
      ],
    },
  },

  // Reports & Analytics
  reports: {
    inventoryReports: {
      enabled: true,
      features: [
        'Stock Summary',
        'Stock Valuation',
        'Stock Movement',
        'Stock Aging',
        'ABC Analysis',
        'Fast/Slow Moving Items',
        'Dead Stock Report',
        'Stock Ledger',
      ],
    },
    salesReports: {
      enabled: true,
      features: [
        'Sales Summary',
        'Sales by Product',
        'Sales by Customer',
        'Sales by Location',
        'Sales Trend Analysis',
        'Profitability Report',
      ],
    },
    purchaseReports: {
      enabled: true,
      features: [
        'Purchase Summary',
        'Purchase by Vendor',
        'Purchase by Product',
        'Purchase Trend',
        'Vendor Performance',
      ],
    },
  },

  // Integration Features
  integration: {
    barcode: {
      enabled: true,
      features: [
        'Barcode Generation',
        'Barcode Scanning',
        'Barcode Printing',
        'Multiple Barcode Formats',
        'Barcode Validation',
      ],
    },
    accounting: {
      enabled: true,
      features: [
        'Auto Journal Entries',
        'Ledger Integration',
        'Financial Reports',
        'Trial Balance',
        'Profit & Loss',
        'Balance Sheet',
      ],
    },
    pos: {
      enabled: true,
      features: [
        'POS Integration',
        'Real-time Sync',
        'Offline Mode',
        'Receipt Printing',
      ],
    },
  },
};

/**
 * Get enabled features for a specific domain
 */
export function getDomainInventoryFeatures(domain) {
  const features = {
    core: inventoryFeatures.core,
    tracking: {},
    parameterized: {},
    manufacturing: null,
    orderManagement: inventoryFeatures.orderManagement,
    pricing: inventoryFeatures.pricing,
    reordering: inventoryFeatures.reordering,
    gst: inventoryFeatures.gst,
    reports: inventoryFeatures.reports,
    integration: inventoryFeatures.integration,
  };

  // Add batch tracking if applicable
  if (inventoryFeatures.tracking.batchTracking.applicableDomains.includes(domain)) {
    features.tracking.batchTracking = inventoryFeatures.tracking.batchTracking;
  }

  // Add serial tracking if applicable
  if (inventoryFeatures.tracking.serialNumberTracking.applicableDomains.includes(domain)) {
    features.tracking.serialNumberTracking = inventoryFeatures.tracking.serialNumberTracking;
  }

  // Add expiry tracking if applicable
  if (inventoryFeatures.tracking.expiryTracking.applicableDomains.includes(domain)) {
    features.tracking.expiryTracking = inventoryFeatures.tracking.expiryTracking;
  }

  // Add size/color matrix if applicable
  if (inventoryFeatures.parameterized.sizeColorMatrix.applicableDomains.includes(domain)) {
    features.parameterized.sizeColorMatrix = inventoryFeatures.parameterized.sizeColorMatrix;
  }

  // Add manufacturing if applicable
  if (inventoryFeatures.manufacturing.applicableDomains.includes(domain)) {
    features.manufacturing = inventoryFeatures.manufacturing;
  }

  return features;
}

/**
 * Get all feature names as a flat list for a domain
 */
export function getDomainFeatureList(domain) {
  const features = getDomainInventoryFeatures(domain);
  const featureList = [];

  // Core features
  if (features.core?.productMaster?.features) {
    featureList.push(...features.core.productMaster.features);
  }
  if (features.core?.stockManagement?.features) {
    featureList.push(...features.core.stockManagement.features);
  }
  if (features.core?.multiLocation?.features) {
    featureList.push(...features.core.multiLocation.features);
  }

  // Tracking features
  if (features.tracking?.batchTracking?.features) {
    featureList.push(...features.tracking.batchTracking.features);
  }
  if (features.tracking?.serialNumberTracking?.features) {
    featureList.push(...features.tracking.serialNumberTracking.features);
  }
  if (features.tracking?.expiryTracking?.features) {
    featureList.push(...features.tracking.expiryTracking.features);
  }

  // Parameterized features
  if (features.parameterized?.sizeColorMatrix?.features) {
    featureList.push(...features.parameterized.sizeColorMatrix.features);
  }
  if (features.parameterized?.customParameters?.features) {
    featureList.push(...features.parameterized.customParameters.features);
  }

  // Manufacturing
  if (features.manufacturing?.features) {
    featureList.push(...features.manufacturing.features);
  }

  // Order management
  if (features.orderManagement?.quotation?.features) {
    featureList.push(...features.orderManagement.quotation.features);
  }
  if (features.orderManagement?.salesOrder?.features) {
    featureList.push(...features.orderManagement.salesOrder.features);
  }
  if (features.orderManagement?.purchaseOrder?.features) {
    featureList.push(...features.orderManagement.purchaseOrder.features);
  }
  if (features.orderManagement?.challan?.features) {
    featureList.push(...features.orderManagement.challan.features);
  }

  // Pricing
  if (features.pricing?.priceLists?.features) {
    featureList.push(...features.pricing.priceLists.features);
  }
  if (features.pricing?.discountSchemes?.features) {
    featureList.push(...features.pricing.discountSchemes.features);
  }

  // Reordering
  if (features.reordering?.reorderPoints?.features) {
    featureList.push(...features.reordering.reorderPoints.features);
  }
  if (features.reordering?.autoReordering?.features) {
    featureList.push(...features.reordering.autoReordering.features);
  }

  // GST
  if (features.gst?.gstInvoicing?.features) {
    featureList.push(...features.gst.gstInvoicing.features);
  }
  if (features.gst?.eWayBill?.features) {
    featureList.push(...features.gst.eWayBill.features);
  }
  if (features.gst?.eInvoice?.features) {
    featureList.push(...features.gst.eInvoice.features);
  }
  if (features.gst?.gstr?.features) {
    featureList.push(...features.gst.gstr.features);
  }

  // Reports
  if (features.reports?.inventoryReports?.features) {
    featureList.push(...features.reports.inventoryReports.features);
  }
  if (features.reports?.salesReports?.features) {
    featureList.push(...features.reports.salesReports.features);
  }
  if (features.reports?.purchaseReports?.features) {
    featureList.push(...features.reports.purchaseReports.features);
  }

  // Integration
  if (features.integration?.barcode?.features) {
    featureList.push(...features.integration.barcode.features);
  }
  if (features.integration?.accounting?.features) {
    featureList.push(...features.integration.accounting.features);
  }
  if (features.integration?.pos?.features) {
    featureList.push(...features.integration.pos.features);
  }

  return [...new Set(featureList)]; // Remove duplicates
}








