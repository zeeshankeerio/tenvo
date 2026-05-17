// This file usually uses formatCurrency, but checking for hardcoded symbols

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Download, Printer, Save, Calculator, FileText, Loader2, Scan, Keyboard, AlertCircle, ShoppingCart, WandSparkles, Send, Clock3, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateInvoicePDF } from '@/lib/pdf';
import { PakistaniPaymentSelector } from '@/components/payment/PakistaniPaymentSelector';
import { PakistaniTaxCalculator } from '@/components/tax/PakistaniTaxCalculator';
import { calculatePakistaniTax, generateFBRInvoice, formatNTN, getTaxCategoryForDomain } from '@/lib/tax/pakistaniTax';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { getDomainDefaults, getDomainUnits, getDomainUnits as getUnits, getDomainProductFields, getDomainInvoiceColumns } from '@/lib/utils/domainHelpers';
import { getDomainColors } from '@/lib/domainColors';
import { formatCurrency } from '@/lib/utils/formatting';
import { getTaxStrategy } from '@/lib/utils/taxStrategies';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useStockAvailability, useCreditLimitCheck, useDueDateCalculator } from '@/lib/hooks/useInvoiceHelpers';
import { invoiceSchema, validateWithSchema } from '@/lib/validation/schemas';
import { getCurrentSeason, getSeasonalDiscount } from '@/lib/domainData/pakistaniSeasons';
import { hasSeasonalPricing } from '@/lib/utils/pakistaniFeatures';
import { ExpertActionPanel } from '@/components/domain/ExpertActionPanel';
import { AIInsightOverlay } from '@/components/domain/AIInsightOverlay';
import { submitInvoiceForApprovalAction, getApprovalHistoryAction, schedulePaymentRemindersAction } from '@/lib/actions/standard/invoice-approval';

/**
 * Enhanced Invoice Builder Component
 * Fully localized for Pakistani (FBR) and FBR-certified tax systems
 * Conditionally shows features based on domain category
 * 
 * @param {Object} props
 * @param {() => void} props.onClose
 * @param {(inv: any) => void} props.onSave
 * @param {any[]} [props.products]
 * @param {any[]} [props.customers]
 * @param {string} [props.category]
 * @param {any} [props.initialData]
 */
export function EnhancedInvoiceBuilder({
  onClose,
  onSave,
  products = [],
  customers = [],
  category = 'retail-shop', // Domain category for conditional features
  initialData = null,
  ...props
}) {
  const { business, currency, regionalStandards } = useBusiness();
  const standards = regionalStandards || { taxLabel: 'Tax', taxIdLabel: 'Tax ID', currency: 'PKR', countryCode: 'PK' };
  const strategy = getTaxStrategy(standards);
  const colors = getDomainColors(category);
  const domainKnowledge = getDomainKnowledge(category);
  const isPakistaniDomain = standards.countryCode === 'PK';
  const currencySymbol = business?.settings?.financials?.currencySymbol || standards.currencySymbol;

  const normalizeProvince = (value = 'punjab') => {
    const raw = String(value || '').trim().toLowerCase();
    const map = {
      punjab: 'punjab',
      sindh: 'sindh',
      kp: 'kp',
      kpk: 'kp',
      'khyber pakhtunkhwa': 'kp',
      balochistan: 'balochistan',
      'islamabad (federal)': 'islamabad',
      islamabad: 'islamabad',
    };
    return map[raw] || 'punjab';
  };

  const mapPreferredPaymentMethod = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    if (raw.includes('jazz')) return 'jazzcash';
    if (raw.includes('easy')) return 'easypaisa';
    if (raw.includes('payfast') || raw.includes('card')) return 'payfast';
    if (raw.includes('bank')) return 'bank_transfer';
    if (raw.includes('cod') || raw.includes('cash on delivery') || raw === 'cash') return 'cod';
    return null;
  };

  const extractCreditDays = (customer) => {
    const direct = Number(customer?.credit_days || customer?.creditDays || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const term = String(customer?.payment_terms || customer?.paymentTerms || '').match(/(\d{1,3})/);
    const parsed = Number(term?.[1] || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const addDaysLocal = (dateString, daysToAdd) => {
    const [year, month, day] = String(dateString || '').split('-').map(Number);
    if (!year || !month || !day) return '';
    const localDate = new Date(year, month - 1, day);
    localDate.setDate(localDate.getDate() + Number(daysToAdd || 0));
    const y = localDate.getFullYear();
    const m = String(localDate.getMonth() + 1).padStart(2, '0');
    const d = String(localDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Initialize invoice state with conditional fields
  const [invoice, setInvoice] = useState(() => {
    const baseInvoice = {
      invoiceNumber: `INV-${Date.now()}`,
      documentType: standards.taxLabel,
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      invoiceType: standards.taxStrategy === 'VAT' ? 'vat' : 'tax',
      customer: {
        name: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        secondaryTaxId: '',
        province: 'punjab',
      },
      items: [],
      taxDetails: {
        breakdown: {},
        totalTax: 0,
      },
      paymentMethod: isPakistaniDomain ? 'cod' : 'cash',
      discount: 0,
      discountType: 'percent', // percent or amount
      roundOff: 0,
      notes: '',
      terms: '',
      ewayBill: '',
      placeOfSupply: '',
    };

    if (initialData) {
      // Logic to map Source (Challan/Order) or existing Invoice back to state
      const mappedItems = (initialData.items || []).map(item => {
        const rate = item.unit_price || item.rate || 0;
        const discount = item.discount_amount || item.discount || 0;
        const taxPercent = item.tax_percent || item.taxPercent || (isPakistaniDomain ? 18 : 0);
        const quantity = item.quantity || 1;

        // Calculate line amount
        const baseAmount = quantity * rate;
        const discountVal = (baseAmount * discount) / 100;
        const taxable = baseAmount - discountVal;
        const taxVal = (taxable * taxPercent) / 100;

        return {
          id: item.id || Date.now() + Math.random(),
          productId: item.product_id || item.productId || '',
          name: item.product_name || item.name || '',
          hsn: item.hsn_code || item.hsn || '',
          quantity,
          unit: item.unit || 'pcs',
          rate,
          discount,
          taxPercent,
          amount: taxable + taxVal,
          taxCategory: item.tax_category || item.taxCategory || (isPakistaniDomain ? getTaxCategoryForDomain(category) : 'retail-standard'),
          batchNumber: item.batch_number || item.batchNumber || '',
          serialNumber: item.serial_number || item.serialNumber || '',
          expiryDate: item.expiry_date || item.expiryDate || '',
        };
      });

      // Find customer details if ID exists
      const customerDetail = customers.find(c => c.id === (initialData.customer_id || initialData.customer?.id)) || {};

      return {
        ...baseInvoice,
        ...initialData, // Spread original for ID and other metadata
        customer: {
          ...baseInvoice.customer,
          id: initialData.customer_id || customerDetail.id || '',
          name: initialData.customer_name || initialData.customer?.name || customerDetail.name || '',
          email: initialData.customer_email || customerDetail.email || '',
          phone: customerDetail.phone || '',
          address: initialData.delivery_address || customerDetail.address || '',
          taxId: initialData.customer_tax_id || initialData.customer?.taxId || customerDetail.tax_id || customerDetail.ntn || customerDetail.gstin || '',
          province: normalizeProvince(initialData.customer?.province || customerDetail.province || 'punjab'),
          ...customerDetail,
        },
        items: mappedItems,
        discount: initialData.discount_total || initialData.discount || 0,
        notes: initialData.notes || `Derived from document: ${initialData.invoice_number || initialData.challan_number || initialData.order_number || 'Source'}`,
      };
    }

    return baseInvoice;
  });

  // Invoice Intelligence Hooks
  const { checkAvailability, getStockStatus } = useStockAvailability(business?.id);
  const autoDueDate = useDueDateCalculator(invoice.date, 30); // 30 days payment terms

  // Auto-update due date if not manually set
  useEffect(() => {
    if (autoDueDate && !invoice.dueDate) {
      setInvoice(prev => ({ ...prev, dueDate: autoDueDate }));
    }
  }, [autoDueDate, invoice.dueDate]);

  // Find selected customer for credit limit check
  const selectedCustomerData = useMemo(() => {
    if (!invoice.customer?.id) return null;
    return customers.find(c => c.id === invoice.customer.id);
  }, [invoice.customer?.id, customers]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDueDateManuallyEdited, setIsDueDateManuallyEdited] = useState(Boolean(initialData?.due_date || initialData?.dueDate));
  const [smartDraftMeta, setSmartDraftMeta] = useState(null);
  const [showTaxCalculator, setShowTaxCalculator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const isSubmittingRef = useRef(false); // Submission lock
  const [isExporting, setIsExporting] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);

  const approvalStatus = String(invoice.approval_status || 'none').toLowerCase();
  const canSubmitForApproval = Boolean(
    business?.id &&
    !isSaving &&
    !isSubmittingApproval &&
    invoice.items.length > 0 &&
    invoice.customer?.name &&
    approvalStatus !== 'approved' &&
    approvalStatus !== 'pending'
  );

  const approvalStatusConfig = {
    none: {
      label: 'Draft',
      icon: FileText,
      className: 'bg-slate-100 text-slate-700 border-slate-200',
      helper: 'Save draft to continue editing.',
    },
    pending: {
      label: 'Pending Approval',
      icon: Clock3,
      className: 'bg-amber-100 text-amber-800 border-amber-200',
      helper: 'Awaiting reviewer decision.',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      helper: 'Ready for dispatch and payment follow-up.',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-rose-100 text-rose-800 border-rose-200',
      helper: 'Update invoice details and resubmit.',
    },
  };

  const activeApprovalStatus = approvalStatusConfig[approvalStatus] || approvalStatusConfig.none;

  // Pakistani Seasonal Pricing
  const seasonalPricingEnabled = hasSeasonalPricing(category);
  const currentSeason = seasonalPricingEnabled ? getCurrentSeason() : null;

  // Update item field (Hoisted for use in barcode scan)
  const updateItem = (id, field, value) => {
    const clampNumber = (num, min, max) => Math.min(max, Math.max(min, num));

    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          let normalizedValue = value;

          if (field === 'quantity') {
            normalizedValue = clampNumber(Number(value) || 0, 0, 999999);
          }
          if (field === 'rate' || field === 'amount') {
            normalizedValue = clampNumber(Number(value) || 0, 0, 999999999);
          }
          if (field === 'discount' || field === 'taxPercent') {
            normalizedValue = clampNumber(Number(value) || 0, 0, 100);
          }

          const updated = { ...item, [field]: normalizedValue };

          // Auto-fill from product
          if (field === 'productId' && value) {
            const product = products.find(p => p.id === value);
            if (product) {
              updated.name = product.name;
              updated.hsn = product.hsn || product.hsnCode || '';
              updated.rate = Number(product.price) || 0;
              updated.taxPercent = Number(product.taxPercent) || (isPakistaniDomain ? 18 : 0);
              updated.unit = product.unit || 'pcs';

              // Auto-fill domain metadata if available
              if (product.domain_data) {
                updated.article_no = product.domain_data.articleno || product.domain_data.article_no || '';
                updated.design_no = product.domain_data.designno || product.domain_data.design_no || '';
                updated.fabric_type = product.domain_data.fabrictype || product.domain_data.fabric_type || '';
              }
            }
          }

          // Back-calculate Rate if Amount is changed manually
          if (field === 'amount') {
            const taxPerc = Number(updated.taxPercent) || 0;
            const discPerc = Number(updated.discount) || 0;
            const qty = Number(updated.quantity) || 1;

            const taxFactor = 1 + (taxPerc / 100);
            const discFactor = 1 - (discPerc / 100);

            if (qty > 0 && discFactor > 0 && taxFactor > 0) {
              updated.rate = normalizedValue / (qty * discFactor * taxFactor);
            }
          }

          // Calculate amount (Forward calculation)
          if (field === 'quantity' || field === 'rate' || field === 'discount' || field === 'taxPercent' || field === 'productId') {
            const qty = Number(updated.quantity) || 0;
            const rate = Number(updated.rate) || 0;
            const disc = Number(updated.discount) || 0;
            const tax = Number(updated.taxPercent) || 0;

            const baseAmount = qty * rate;
            const discountAmount = (baseAmount * disc) / 100;
            const taxableAmount = baseAmount - discountAmount;
            const taxAmount = (taxableAmount * tax) / 100;
            updated.amount = taxableAmount + taxAmount;
          }

          return updated;
        }
        return item;
      })
    }));
  };



  // Calculate totals - supports both GST and Pakistani tax
  const calculateTotals = useMemo(() => {
    const subtotal = invoice.items.reduce((sum, item) => {
      const baseAmount = Number(item.quantity || 0) * Number(item.rate || 0);
      const discountAmount = (baseAmount * Number(item.discount || 0)) / 100;
      return sum + baseAmount - discountAmount;
    }, 0);

    const discountAmount = invoice.discountType === 'percent'
      ? (subtotal * (invoice.discount || 0)) / 100
      : (invoice.discount || 0);

    // Calculate seasonal discount if applicable
    let seasonalDiscountAmount = 0;
    let seasonalDiscountDetails = [];
    
    if (seasonalPricingEnabled && currentSeason) {
      invoice.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.category) {
          const seasonalDiscount = getSeasonalDiscount(product.category);
          if (seasonalDiscount > 0) {
            const itemBase = Number(item.quantity || 0) * Number(item.rate || 0);
            const itemDiscount = (itemBase * Number(item.discount || 0)) / 100;
            const itemAfterDiscount = itemBase - itemDiscount;
            const seasonalAmount = (itemAfterDiscount * seasonalDiscount) / 100;
            seasonalDiscountAmount += seasonalAmount;
            seasonalDiscountDetails.push({
              itemName: item.name,
              category: product.category,
              discountPercent: seasonalDiscount,
              amount: seasonalAmount
            });
          }
        }
      });
    }

    const finalSubtotal = subtotal - discountAmount - seasonalDiscountAmount;

    const globalDiscountFactor = subtotal > 0 ? (subtotal - discountAmount - seasonalDiscountAmount) / subtotal : 1;

    const itemsForTax = invoice.items.map(item => {
      const itemBase = Number(item.quantity || 0) * Number(item.rate || 0);
      const itemDiscount = (itemBase * Number(item.discount || 0)) / 100;
      const itemTaxable = itemBase - itemDiscount;

      return {
        amount: itemTaxable * globalDiscountFactor,
        taxPercent: item.taxPercent,
        category: item.taxCategory,
        domain: category
      };
    });

    const taxResult = strategy.calculateBulk(itemsForTax, standards);
    const totalTax = taxResult.totalTax;

    const total = Number((finalSubtotal + totalTax).toFixed(2));
    const manualRoundOff = Number(invoice.roundOff || 0) || 0;
    const grandTotal = Number((total + manualRoundOff).toFixed(2));

    return {
      subtotal: finalSubtotal,
      totalTax,
      tax_total: totalTax,
      taxDetails: taxResult.details,
      total: grandTotal,
      grand_total: grandTotal,
      roundOff: manualRoundOff,
      discount: discountAmount,
      discount_total: discountAmount,
      seasonalDiscount: seasonalDiscountAmount,
      seasonalDiscountDetails,
    };
  }, [invoice.items, invoice.discount, invoice.discountType, invoice.roundOff, standards, category, seasonalPricingEnabled, currentSeason, products]);

  // Credit limit warning
  const creditWarning = useCreditLimitCheck(selectedCustomerData, calculateTotals.total);

  // Keyboard Shortcuts moved below totals declaration

  // Barcode Sniffer Logic
  const handleBarcodeScan = (code) => {
    if (!code) return;
    const product = products.find(p => p.barcode === code || p.sku === code);
    if (product) {
      const existingItem = invoice.items.find(item => item.productId === product.id);
      if (existingItem) {
        updateItem(existingItem.id, 'quantity', existingItem.quantity + 1);
      } else {
        const newItem = {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          hsn: product.hsn || product.hsnCode || '',
          quantity: 1,
          unit: product.unit || 'pcs',
          rate: product.price,
          discount: 0,
          taxPercent: product.taxPercent || (isPakistaniDomain ? 18 : 0),
          amount: product.price,
          taxCategory: isPakistaniDomain ? getTaxCategoryForDomain(category) : 'retail-standard',
        };
        setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
      }
      toast.success(`Added: ${product.name}`);
      setBarcodeInput('');
    } else {
      toast.error('Product not found for barcode: ' + code);
    }
  };

  // Update customer details when selected
  const applyCustomerProfile = (customer, preserveDueDate = false) => {
    if (!customer) return;

    const preferredGateway = mapPreferredPaymentMethod(
      customer.preferred_payment_method || customer.payment_method || customer.preferredPaymentMethod
    );
    const creditDays = extractCreditDays(customer);

    setInvoice(prev => {
      const computedDueDate = creditDays > 0
        ? addDaysLocal(prev.date || new Date().toISOString().split('T')[0], creditDays)
        : '';

      return {
        ...prev,
        paymentMethod: preferredGateway || prev.paymentMethod,
        dueDate: preserveDueDate ? prev.dueDate : (computedDueDate || prev.dueDate),
        customer: {
          ...prev.customer,
          id: customer.id || prev.customer.id,
          name: customer.name || prev.customer.name,
          email: customer.email || prev.customer.email,
          phone: customer.phone || prev.customer.phone,
          address: customer.address || customer.delivery_address || prev.customer.address,
          taxId: customer.tax_id || customer.ntn || customer.gstin || prev.customer.taxId,
          secondaryTaxId: customer.srn || prev.customer.secondaryTaxId,
          province: normalizeProvince(customer.province || prev.customer.province || 'punjab'),
          credit_limit: Number(customer.credit_limit || customer.creditLimit || prev.customer.credit_limit || 0),
          outstanding_balance: Number(customer.outstanding_balance || customer.outstandingBalance || prev.customer.outstanding_balance || 0),
        }
      };
    });

    if (!preserveDueDate) {
      setIsDueDateManuallyEdited(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      applyCustomerProfile(selectedCustomer, isDueDateManuallyEdited);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer || isDueDateManuallyEdited) return;
    const creditDays = extractCreditDays(selectedCustomer);
    if (creditDays <= 0) return;

    const recomputedDueDate = addDaysLocal(invoice.date || new Date().toISOString().split('T')[0], creditDays);

    if (invoice.dueDate !== recomputedDueDate) {
      setInvoice(prev => ({ ...prev, dueDate: recomputedDueDate }));
    }
  }, [invoice.date, selectedCustomer, isDueDateManuallyEdited]);

  useEffect(() => {
    const invoiceId = invoice?.id || initialData?.id;
    if (!business?.id || !invoiceId) {
      setApprovalHistory([]);
      return;
    }

    let ignore = false;
    const loadApprovalHistory = async () => {
      try {
        const result = await getApprovalHistoryAction(business.id, invoiceId);
        if (!ignore) {
          setApprovalHistory(result?.success ? (result.history || []) : []);
        }
      } catch (error) {
        if (!ignore) setApprovalHistory([]);
      }
    };

    loadApprovalHistory();
    return () => { ignore = true; };
  }, [business?.id, invoice?.id, initialData?.id]);

  // Add item to invoice
  const addItem = () => {
    const lastItem = invoice.items[invoice.items.length - 1];
    const newItem = {
      id: Date.now(),
      productId: '',
      name: '',
      hsn: '',
      quantity: 1,
      unit: lastItem?.unit || 'pcs',
      rate: 0,
      discount: 0,
      taxPercent: lastItem?.taxPercent ?? (isPakistaniDomain ? 18 : 0),
      amount: 0,
      taxCategory: isPakistaniDomain ? getTaxCategoryForDomain(category) : 'retail-standard',
    };
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const applySmartDraft = (scope = 'items') => {
    if (!products?.length) {
      toast.error('No products available for smart draft');
      return;
    }

    if (invoice.items.length > 0) {
      const proceed = confirm('Smart Draft will replace current line items. Continue?');
      if (!proceed) return;
    }

    const domainHint = String(category || '').split('-')[0].toLowerCase();
    const getCustomerScore = (customer) => {
      const spend = Number(customer?.total_spent || customer?.lifetime_value || 0) || 0;
      const orders = Number(customer?.order_count || customer?.total_orders || 0) || 0;
      const outstanding = Number(customer?.outstanding_balance || 0) || 0;
      const contactBonus = customer?.phone || customer?.email ? 200 : 0;
      return (spend * 0.1) + (orders * 50) - (outstanding * 0.05) + contactBonus;
    };

    const getProductScore = (product) => {
      const sold = Number(product?.total_sold || product?.sales_count || product?.sold_quantity || 0) || 0;
      const stock = Number(product?.stock || 0) || 0;
      const categoryMatch = String(product?.category || '').toLowerCase().includes(domainHint) ? 150 : 0;
      return (sold * 20) + (stock * 2) + categoryMatch;
    };

    const recommendedCustomer = [...(customers || [])]
      .filter(c => c?.id)
      .sort((a, b) => getCustomerScore(b) - getCustomerScore(a))[0] || null;

    const candidateProducts = [...products]
      .filter(product => {
        const price = Number(product?.price || product?.selling_price || 0) || 0;
        return product?.is_active !== false && price > 0;
      })
      .sort((a, b) => getProductScore(b) - getProductScore(a))
      .slice(0, 3);

    if (candidateProducts.length === 0) {
      toast.error('No priced products available for smart draft');
      return;
    }

    const suggestedItems = candidateProducts.map((product, index) => {
      const quantity = 1;
      const rate = Number(product?.price || product?.selling_price || 0) || 0;
      const taxPercent = Number(product?.taxPercent || product?.tax_percent || (isPakistaniDomain ? 18 : 0)) || 0;
      const amount = rate + ((rate * taxPercent) / 100);

      return {
        id: Date.now() + index,
        productId: product.id,
        name: product.name || 'Item',
        hsn: product.hsn || product.hsn_code || product.hsnCode || '',
        quantity,
        unit: product.unit || 'pcs',
        rate,
        discount: 0,
        taxPercent,
        amount,
        taxCategory: isPakistaniDomain ? getTaxCategoryForDomain(category) : 'retail-standard',
        article_no: product?.domain_data?.articleno || product?.domain_data?.article_no || '',
        design_no: product?.domain_data?.designno || product?.domain_data?.design_no || '',
        fabric_type: product?.domain_data?.fabrictype || product?.domain_data?.fabric_type || '',
      };
    });

    const hasManualCustomer = Boolean(invoice.customer?.id || invoice.customer?.name);
    const shouldApplyCustomer = scope === 'full' && recommendedCustomer;

    if (shouldApplyCustomer) {
      setSelectedCustomer(recommendedCustomer);
      applyCustomerProfile(recommendedCustomer, false);
    }

    setInvoice(prev => ({
      ...prev,
      items: suggestedItems,
      notes: prev.notes || `Smart draft generated for ${category.replace('-', ' ')} workflow.`,
    }));

    setSmartDraftMeta({
      generatedAt: new Date().toISOString(),
      customerLabel: shouldApplyCustomer
        ? (recommendedCustomer?.name || 'No customer recommendation')
        : (invoice.customer?.name || 'Customer unchanged'),
      productLabels: suggestedItems.map(item => item.name).slice(0, 3),
      customerMode: shouldApplyCustomer ? 'recommended' : (hasManualCustomer ? 'preserved' : 'unchanged'),
      scope,
    });

    toast.success(
      scope === 'full'
        ? `Smart draft applied (customer + ${suggestedItems.length} item${suggestedItems.length > 1 ? 's' : ''})`
        : `Smart items applied (${suggestedItems.length} suggestion${suggestedItems.length > 1 ? 's' : ''})`
    );
  };



  // Remove item from invoice
  const removeItem = (id) => {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };



  const totals = calculateTotals;

  const postingHealth = useMemo(() => {
    const debit = Number(totals.total) || 0;
    const tax = Number(totals.totalTax || totals.tax_total || 0) || 0;
    const revenue = Math.max(0, debit - tax);
    const credit = revenue + tax;
    const difference = Math.abs(debit - credit);
    return {
      debit,
      credit,
      balanced: difference < 0.01,
      difference,
    };
  }, [totals]);

  const duplicateItemSignals = useMemo(() => {
    const grouped = new Map();

    invoice.items.forEach((item, index) => {
      const key = String(item.productId || item.name || '').trim().toLowerCase();
      if (!key) return;

      if (!grouped.has(key)) {
        grouped.set(key, { key, indexes: [], label: item.name || `Item ${index + 1}` });
      }

      const bucket = grouped.get(key);
      bucket.indexes.push(index + 1);
    });

    return Array.from(grouped.values()).filter((entry) => entry.indexes.length > 1);
  }, [invoice.items]);

  // Keyboard Shortcuts (Re-inserted here to access totals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl + B: Barcode Focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        document.getElementById('barcode-sniffer')?.focus();
      }
      // Escape: Dismiss
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoice, totals]);

  // Handle save with validation
  const persistInvoice = async () => {
    if (!invoice.items.length) {
      toast.error('Add at least one item before finalizing invoice');
      return null;
    }

    const invalidRowIndex = invoice.items.findIndex(item => {
      const quantity = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      return !item.name || quantity <= 0 || rate < 0;
    });

    if (invalidRowIndex !== -1) {
      toast.error(`Please complete row ${invalidRowIndex + 1} (item, quantity, rate)`);
      return null;
    }

    if (invoice.dueDate && invoice.date && invoice.dueDate < invoice.date) {
      toast.error('Due date cannot be earlier than invoice date');
      return null;
    }

    if (duplicateItemSignals.length > 0) {
      const duplicateSummary = duplicateItemSignals
        .slice(0, 3)
        .map((entry) => `${entry.label} (rows ${entry.indexes.join(', ')})`)
        .join('\n');

      const continueWithDuplicates = confirm(
        `Duplicate line items detected:\n${duplicateSummary}\n\nContinue anyway?`
      );

      if (!continueWithDuplicates) return null;
    }

    // Zod schema validation
    const schemaData = {
      business_id: business?.id,
      customer_id: invoice.customer?.id || null,
      invoice_number: invoice.invoiceNumber || `INV-${Date.now()}`,
      date: invoice.date || new Date().toISOString(),
      due_date: invoice.dueDate || null,
      items: invoice.items.map(item => ({
        product_id: item.productId || item.product_id || null,
        name: item.name || item.description || 'Item',
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.rate || item.unit_price || 0),
        tax_percent: Number(item.taxPercent || 17),
        discount_amount: ((Number(item.quantity || 0) * Number(item.rate || 0)) * Number(item.discount || 0)) / 100,
      })),
      subtotal: totals.subtotal || 0,
      total_tax: totals.totalTax || totals.tax_total || 0,
      discount_total: totals.discount || 0,
      grand_total: totals.total || 0,
      status: 'draft',
      notes: invoice.notes || null,
      terms: invoice.terms || null,
    };
    const validation = validateWithSchema(invoiceSchema, schemaData);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || 'Please fix validation errors');
      return null;
    }

    // Additional UI checks
    if (!invoice.customer.name) {
      toast.error('Please enter customer name');
      return null;
    }

    if (!postingHealth.balanced) {
      toast.error(`Posting check failed: debit ${postingHealth.debit.toFixed(2)} vs credit ${postingHealth.credit.toFixed(2)}`);
      return null;
    }

    if (isPakistaniDomain) {
      // NTN is optional but recommended
      if (!invoice.customer.taxId && invoice.invoiceType === 'fbr') {
        const proceed = confirm('NTN not provided. Continue anyway?');
        if (!proceed) return null;
      }
    }

    if (isSubmittingRef.current) return null;
    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      const normalizedItems = invoice.items.map(item => {
        const serialNumbers = Array.isArray(item.serial_numbers)
          ? item.serial_numbers
          : item.serialNumber
          ? [item.serialNumber]
          : [];

        return {
          ...item,
          quantity: Number(item.quantity || 0),
          rate: Number(item.rate || item.unit_price || 0),
          unit_price: Number(item.rate || item.unit_price || 0),
          discount: Number(item.discount || 0),
          taxPercent: Number(item.taxPercent || 0),
          tax_percent: Number(item.taxPercent || 0),
          amount: Number(item.amount || 0),
          batch_number: item.batch_number || item.batchNumber || '',
          batch_id: item.batch_id || item.batchId || null,
          serial_numbers: serialNumbers,
          metadata: {
            ...(item.metadata || {}),
            article_no: item.article_no || item.metadata?.article_no || '',
            design_no: item.design_no || item.metadata?.design_no || '',
            fabric_type: item.fabric_type || item.metadata?.fabric_type || '',
            batch_number: item.batch_number || item.batchNumber || item.metadata?.batch_number || null,
            batch_id: item.batch_id || item.batchId || item.metadata?.batch_id || null,
            serial_numbers: serialNumbers,
          },
        };
      });

      // Generate FBR-compliant invoice for Pakistani domains
      let finalInvoice = {
        ...invoice,
        items: normalizedItems,
        totals,
        business_id: business?.id // Ensure business_id is present
      };

      if (isPakistaniDomain) {
        finalInvoice = generateFBRInvoice({
          ...invoice,
          items: normalizedItems.map(item => ({
            ...item,
            domain: category,
          })),
        }, invoice.customer.province || 'punjab');
      }

      const savedInvoice = await onSave?.(finalInvoice);
      return savedInvoice || null;
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(error?.message || 'Failed to save invoice. Please try again.');
      isSubmittingRef.current = false; // Reset only on error
      return null;
    } finally {
      setIsSaving(false);
      // Note: We don't reset isSubmittingRef on success because component unmounts 
      // or we explicitly want to block further clicks until close.
      if (!onSave) isSubmittingRef.current = false;
    }
  };

  // Handle save with validation
  const handleSave = async () => {
    await persistInvoice();
  };

  const handleSaveAndSubmitForApproval = async () => {
    if (!canSubmitForApproval) {
      toast.error('Complete customer and item details before submitting for approval');
      return;
    }

    const confirmed = confirm('Submit this invoice for approval? It will move to pending approval.');
    if (!confirmed) return;

    setIsSubmittingApproval(true);
    try {
      const savedInvoice = await persistInvoice();
      const invoiceId = savedInvoice?.id || invoice?.id || initialData?.id;

      if (!invoiceId || !business?.id) {
        toast.error('Invoice saved but approval submission needs a valid invoice reference');
        return;
      }

      const submitRes = await submitInvoiceForApprovalAction(business.id, invoiceId);
      if (!submitRes?.success) {
        throw new Error(submitRes?.error || submitRes?.message || 'Failed to submit for approval');
      }

      if (invoice.dueDate) {
        await schedulePaymentRemindersAction(business.id, invoiceId);
      }

      setInvoice(prev => ({
        ...prev,
        id: invoiceId,
        approval_status: 'pending',
      }));

      const historyRes = await getApprovalHistoryAction(business.id, invoiceId);
      setApprovalHistory(historyRes?.success ? (historyRes.history || []) : []);

      toast.success('Invoice submitted for approval successfully');
    } catch (error) {
      console.error('Error submitting invoice for approval:', error);
      toast.error(error?.message || 'Failed to submit invoice for approval');
    } finally {
      setIsSubmittingApproval(false);
      isSubmittingRef.current = false;
    }
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateInvoicePDF(invoice, totals, business, isPakistaniDomain);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle tax calculation from calculator
  const handleTaxCalculation = (taxBreakdown) => {
    setInvoice(prev => ({
      ...prev,
      pakistaniTax: {
        federalSalesTax: taxBreakdown.federalSalesTax,
        provincialSalesTax: taxBreakdown.provincialSalesTax,
        withholdingTax: taxBreakdown.withholdingTax,
        totalTax: taxBreakdown.totalTax,
        province: prev.customer.province || 'punjab',
      }
    }));
    setShowTaxCalculator(false);
    toast.success('Tax calculated and applied');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl border-none">
        <CardHeader className="flex flex-row items-center justify-between border-b py-8 px-8" style={{ backgroundColor: `${colors.primary}08` }}>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic" style={{ color: colors.primary }}>
              {standards.taxLabel} Compliance Engine
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Compliance Mode:</span>
              <Badge className="bg-emerald-500 text-white border-0 text-[10px] font-black uppercase">Active</Badge>
              <Badge className={cn('text-[10px] font-black uppercase border', activeApprovalStatus.className)}>
                <activeApprovalStatus.icon className="w-3.5 h-3.5 mr-1" />
                {activeApprovalStatus.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: `${colors.primary}10`, color: colors.primary, borderColor: `${colors.primary}20` }}>
                {category.replace('-', ' ')}
              </Badge>
              {currentSeason && (
                <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 text-[10px] font-black uppercase animate-pulse">
                  [CELEBRATION] {currentSeason.name.en} - {currentSeason.discountPercent}% OFF
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl border border-white/30 text-white cursor-help" onClick={() => setShowKeyboardHints(!showKeyboardHints)}>
              <Keyboard className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Hotkeys</span>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-gray-400 uppercase">Document Ref</p>
              <p className="font-mono text-sm font-bold text-gray-900">{invoice.invoiceNumber}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>
        {showKeyboardHints && (
          <div className="bg-wine px-8 py-2 flex gap-6 text-[10px] font-bold text-white/80 uppercase tracking-widest animate-in slide-in-from-top-1">
            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">CTRL+S</kbd> Save</span>
            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">CTRL+B</kbd> Barcode Focus</span>
            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">ENTER</kbd> (in items) New Row</span>
            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">ESC</kbd> Close</span>
          </div>
        )}
        <CardContent className="space-y-8 p-8 bg-white/50">
          {/* Business Header - Your Brand */}
          {business?.name && (
            <div className="border-b-2 border-gray-200 pb-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-black text-gray-900 mb-2">
                    {business.name}
                  </h1>
                  <div className="space-y-1 text-sm text-gray-600">
                    {business.address && <p>{business.address}</p>}
                    <div className="flex gap-4">
                      {business.ntn && (
                        <p>
                          <span className="font-semibold">NTN:</span> {business.ntn}
                        </p>
                      )}
                      {business.srn && (
                        <p>
                          <span className="font-semibold">SRN:</span> {business.srn}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-4">
                      {business.phone && (
                        <p>
                          <span className="font-semibold">Phone:</span> {business.phone}
                        </p>
                      )}
                      {business.email && (
                        <p>
                          <span className="font-semibold">Email:</span> {business.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase text-gray-400 tracking-widest">Invoice</p>
                  <p className="text-2xl font-black" style={{ color: colors.primary }}>{invoice.invoiceNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Header */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Invoice Number</Label>
              <Input value={invoice.invoiceNumber} readOnly className="bg-gray-50" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={invoice.date || ''}
                onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoice.dueDate || ''}
                onChange={(e) => {
                  setIsDueDateManuallyEdited(true);
                  setInvoice({ ...invoice, dueDate: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Combobox
                options={[
                  { value: 'tax', label: `${standards.taxLabel} Invoice` },
                  { value: 'retail', label: 'Retail Invoice' },
                  { value: 'export', label: 'Export Invoice' },
                ]}
                value={invoice.invoiceType}
                onChange={(val) => setInvoice({ ...invoice, invoiceType: val })}
                placeholder="Select type..."
                className="h-10"
              />
            </div>
          </div>

          {/* Customer Selection */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Customer Details</h3>
              {customers.length > 0 && (
                <Combobox
                  options={customers.map(c => ({
                    value: String(c.id),
                    label: c.name,
                    description: c.phone || c.email || ''
                  }))}
                  value={String(invoice.customer?.id || '')}
                  onChange={(val) => {
                    const customer = customers.find(c => String(c.id) === String(val));
                    if (customer) {
                      setSelectedCustomer(customer);
                      applyCustomerProfile(customer, isDueDateManuallyEdited);
                    }
                  }}
                  placeholder="Search customers..."
                  emptyText="No customers found"
                  className="w-[280px]"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={invoice.customer.name || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, name: e.target.value }
                  })}
                  required
                />
              </div>
              {/* Conditional tax fields */}
              <div>
                <Label>{standards.taxIdLabel}</Label>
                <Input
                  value={invoice.customer.taxId || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, taxId: e.target.value }
                  })}
                  onBlur={() => {
                    const entered = String(invoice.customer.taxId || '').trim().toLowerCase();
                    if (!entered || selectedCustomer) return;
                    const matched = customers.find(c => {
                      const candidate = String(c.tax_id || c.ntn || c.gstin || '').trim().toLowerCase();
                      return candidate && candidate === entered;
                    });
                    if (matched) {
                      setSelectedCustomer(matched);
                      applyCustomerProfile(matched, isDueDateManuallyEdited);
                      toast.success('Customer auto-filled from tax ID');
                    }
                  }}
                  placeholder={`${standards.taxIdLabel} Number`}
                />
              </div>
              {standards.countryCode === 'PK' && (
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-[10px] font-bold text-gray-400">Province</Label>
                  <select
                    value={invoice.customer.province}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      customer: { ...invoice.customer, province: e.target.value }
                    })}
                    className="bg-transparent border-0 font-bold text-wine text-xs focus:ring-0 cursor-pointer"
                  >
                    <option value="punjab">Punjab</option>
                    <option value="sindh">Sindh</option>
                    <option value="kp">Khyber Pakhtunkhwa</option>
                    <option value="balochistan">Balochistan</option>
                    <option value="islamabad">Islamabad (Federal)</option>
                  </select>
                </div>
              )}
              {invoice.customer.credit_limit > 0 && (
                <div className={cn(
                  "col-span-2 p-3 rounded-xl border flex items-center justify-between",
                  totals.total + (invoice.customer.outstanding_balance || 0) > invoice.customer.credit_limit
                    ? "bg-red-50 border-red-100 text-red-600"
                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                )}>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Credit Profile:</span>
                    <span className="text-xs font-medium">Limit: {formatCurrency(invoice.customer.credit_limit, currency)} | Current Balance: {formatCurrency(invoice.customer.outstanding_balance || 0, currency)}</span>
                  </div>
                  {totals.total + (invoice.customer.outstanding_balance || 0) > invoice.customer.credit_limit && (
                    <div className="flex items-center gap-1 font-black text-[10px] uppercase">
                      <AlertCircle className="w-3 h-3" />
                      Credit Limit Exceeded
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={invoice.customer.email || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, email: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={invoice.customer.phone || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, phone: e.target.value }
                  })}
                  onBlur={() => {
                    const entered = String(invoice.customer.phone || '').replace(/\D/g, '');
                    if (!entered || selectedCustomer) return;
                    const matched = customers.find(c => String(c.phone || '').replace(/\D/g, '') === entered);
                    if (matched) {
                      setSelectedCustomer(matched);
                      applyCustomerProfile(matched, isDueDateManuallyEdited);
                      toast.success('Customer auto-filled from phone');
                    }
                  }}
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input
                  value={invoice.customer.address || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, address: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Payment Method - Pakistani domains only */}
          {isPakistaniDomain && (
            <div className="border-t pt-4">
              <PakistaniPaymentSelector
                selectedGateway={invoice.paymentMethod}
                onSelect={(gatewayId) => setInvoice({ ...invoice, paymentMethod: gatewayId })}
                amount={totals.total}
                showCOD={true}
                showHeader={false}
                compact={true}
              />
            </div>
          )}

          {/* Items Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Items</h3>
              <div className="flex gap-2">
                <div className="relative group lg:w-48">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-wine" />
                  <Input
                    id="barcode-sniffer"
                    placeholder="Scan Barcode (Ctrl+B)"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleBarcodeScan(barcodeInput);
                    }}
                    className="pl-10 h-9 rounded-xl border-dashed border-wine/30 bg-wine/5 focus:bg-white transition-all font-mono"
                  />
                </div>
                {isPakistaniDomain && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTaxCalculator(!showTaxCalculator)}
                    className="rounded-xl border-gray-200"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Tax Helper
                  </Button>
                )}
                <Button onClick={addItem} size="sm" className="text-white font-bold shadow-lg rounded-xl transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: colors.primary }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
              </div>
            </div>

            {/* Tax Calculator - Pakistani domains */}
            {isPakistaniDomain && showTaxCalculator && (
              <div className="mb-4">
                <PakistaniTaxCalculator
                  amount={totals.subtotal}
                  category={getTaxCategoryForDomain(category)}
                  province={invoice.customer.province || 'punjab'}
                  domain={category}
                  onCalculate={handleTaxCalculation}
                />
              </div>
            )}

            <div className="space-y-3">
              {invoice.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No items added yet.</p>
                  <p className="text-sm">Click "Add Item" to get started.</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase text-gray-400 tracking-wider w-12">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase text-gray-400 tracking-wider">Item Details</th>
                        {getDomainInvoiceColumns(category).map(col => (
                          <th key={col.field} className={`px-3 py-2 text-left text-[10px] font-black uppercase text-gray-400 tracking-wider ${col.width || 'w-24'}`}>
                            {col.header}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase text-gray-400 tracking-wider w-24">Qty</th>
                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase text-gray-400 tracking-wider w-24">Rate</th>
                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase text-gray-400 tracking-wider w-20">Disc%</th>
                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase text-gray-400 tracking-wider w-20">Tax%</th>
                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase text-gray-400 tracking-wider w-28">Amount</th>
                        <th className="px-3 py-2 text-right text-[10px] font-black uppercase text-gray-400 tracking-wider w-16">Expert</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, index) => (
                        <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-3 py-2 text-center">{index + 1}</td>
                          <td className="px-3 py-2">
                            <Combobox
                              options={products.map(p => ({
                                value: String(p.id),
                                label: p.name,
                                description: p.sku ? `SKU: ${p.sku}` : (p.price ? `${formatCurrency(p.price, currency)}` : '')
                              }))}
                              value={String(item.productId || '')}
                              onChange={(val) => updateItem(item.id, 'productId', val)}
                              placeholder="Search products..."
                              emptyText="No products found"
                              className="h-8 border-none bg-transparent shadow-none text-sm"
                            />
                          </td>

                          {/* Domain Specific Columns */}
                          {getDomainInvoiceColumns(category).map(col => (
                            <td key={col.field} className="px-3 py-2">
                              <Input
                                type={col.type || 'text'}
                                value={item[col.field] || ''}
                                onChange={(e) => updateItem(item.id, col.field, e.target.value)}
                                className="h-9 text-xs rounded-lg border-gray-100 bg-gray-50/50"
                                placeholder={col.header}
                              />
                            </td>
                          ))}

                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.quantity || 0}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min={0}
                              className="h-8 text-xs text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.rate || 0}
                              onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              min={0}
                              step="0.01"
                              className="h-8 text-xs text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.discount || 0}
                              onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              min={0}
                              max={100}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.taxPercent || 0}
                              onChange={(e) => updateItem(item.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (index === invoice.items.length - 1) addItem();
                                }
                              }}
                              min={0}
                              max={100}
                              className="h-8 text-xs focus:ring-wine/20"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.amount || 0}
                              onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              min={0}
                              step={0.01}
                              className="h-8 text-xs font-semibold focus:ring-wine/20"
                            />
                                            <div className="mt-1 text-[10px] text-gray-400 text-right whitespace-nowrap">
                                              {(() => {
                                                const qty = Number(item.quantity || 0);
                                                const rate = Number(item.rate || 0);
                                                const discountPct = Number(item.discount || 0);
                                                const taxPct = Number(item.taxPercent || 0);
                                                const base = qty * rate;
                                                const discountValue = (base * discountPct) / 100;
                                                const taxable = base - discountValue;
                                                const taxValue = (taxable * taxPct) / 100;
                                                return `${formatCurrency(taxable, currency)} + ${formatCurrency(taxValue, currency)} tax`;
                                              })()}
                                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <ExpertActionPanel 
                              category={category} 
                              item={item} 
                              onUpdate={(field, val) => updateItem(item.id, field, val)} 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-gray-400">Total Discount:</span>
                    <select
                      className="bg-transparent text-[10px] font-bold border-0 p-0 h-auto focus:ring-0 cursor-pointer text-wine"
                      value={invoice.discountType}
                      onChange={(e) => setInvoice({ ...invoice, discountType: e.target.value })}
                    >
                      <option value="percent">% Ratio</option>
                      <option value="amount">Fixed {standards.currencySymbol}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={invoice.discount || 0}
                      onChange={(e) => setInvoice({ ...invoice, discount: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-16 text-right text-xs p-1 rounded border-gray-200"
                    />
                    <span className="font-semibold text-red-600">-{formatCurrency(totals.discount, currency)}</span>
                  </div>
                </div>
                {/* Seasonal Discount Display */}
                {totals.seasonalDiscount > 0 && currentSeason && (
                  <div className="flex justify-between items-center bg-gradient-to-r from-orange-50 to-pink-50 p-3 rounded-2xl border border-orange-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-orange-600">[CELEBRATION] {currentSeason.name.en} Discount:</span>
                      <Badge className="bg-orange-500 text-white text-[9px] font-black">
                        {currentSeason.discountPercent}% OFF
                      </Badge>
                    </div>
                    <span className="font-semibold text-orange-600">-{formatCurrency(totals.seasonalDiscount, currency)}</span>
                  </div>
                )}
                {/* Render dynamic tax breakdown from strategy */}
                {Object.entries(totals.taxDetails || {}).map(([label, detail]) => {
                  const taxVal = (detail.amount * detail.rate) / 100;
                  if (taxVal <= 0) return null;
                  return (
                    <div key={label} className="flex justify-between">
                      <span>{label}:</span>
                      <span>{formatCurrency(taxVal, standards.currency)}</span>
                    </div>
                  );
                })}
                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Round Off:</span>
                    <span>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2 text-wine">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total, currency)}</span>
                </div>
                <div className={cn(
                  'flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg border',
                  postingHealth.balanced ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                )}>
                  <span className="font-bold uppercase tracking-wider">Posting Health</span>
                  <span className="font-semibold">{postingHealth.balanced ? 'Balanced' : `Diff ${postingHealth.difference.toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            {!isPakistaniDomain && (
              <>
                <div>
                  <Label>E-Way Bill No.</Label>
                  <Input
                    value={invoice.ewayBill || ''}
                    onChange={(e) => setInvoice({ ...invoice, ewayBill: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Place of Supply</Label>
                  <Input
                    value={invoice.placeOfSupply || ''}
                    onChange={(e) => setInvoice({ ...invoice, placeOfSupply: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border rounded-lg"
                value={invoice.notes || ''}
                onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <div>
              <Label>Terms & Conditions</Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border rounded-lg"
                value={invoice.terms || ''}
                onChange={(e) => setInvoice({ ...invoice, terms: e.target.value })}
                placeholder="Payment terms..."
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-semibold">Workflow Status:</span>
                <span>{activeApprovalStatus.helper}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Invoice Ref: {invoice.invoiceNumber}</span>
            </div>

            {approvalHistory.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recent Approval Activity</p>
                <div className="space-y-2">
                  {approvalHistory.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 capitalize">{entry.approval_status}</span>
                      <span className="text-slate-500">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {duplicateItemSignals.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Review Needed</p>
                <p className="text-xs text-amber-700">
                  Possible duplicate rows detected. Merge similar items when possible to reduce posting errors.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 z-20 -mx-8 mt-6 border-t bg-white/95 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-2 w-full md:w-auto">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applySmartDraft('items')}
                  className="rounded-xl border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold h-12 px-6"
                >
                  <WandSparkles className="w-4 h-4 mr-2" />
                  Smart Items
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applySmartDraft('full')}
                  className="rounded-xl border-violet-100 text-violet-600 hover:bg-violet-50 font-bold h-12 px-6"
                >
                  <WandSparkles className="w-4 h-4 mr-2" />
                  Smart Full
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toast.success('Link generated for WhatsApp message')}
                  className="rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-bold h-12 px-6"
                >
                  Share via WhatsApp
                </Button>
              </div>
              {smartDraftMeta && (
                <div className="text-[11px] text-gray-500 bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-2">
                  <span className="font-bold text-indigo-700">Smart Draft:</span>{' '}
                  {smartDraftMeta.scope === 'full'
                    ? `Customer ${smartDraftMeta.customerLabel}`
                    : (smartDraftMeta.customerMode === 'preserved' ? 'Customer preserved' : 'Customer unchanged')}; items {smartDraftMeta.productLabels.join(', ')}
                </div>
              )}
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1 md:flex-none font-bold text-gray-500 rounded-xl px-8 h-12">
                Dismiss
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleExportPDF}
                disabled={isSaving || isExporting}
                className="flex-1 md:flex-none font-bold border-gray-200 rounded-xl h-12 px-6"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                Print {standards.taxLabel} Invoice
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 md:flex-none bg-wine-600 hover:opacity-90 text-white font-black px-8 h-12 rounded-xl shadow-xl shadow-wine-600/20 transition-all active:scale-95"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Save Draft
              </Button>
              <Button
                type="button"
                disabled={!canSubmitForApproval}
                onClick={handleSaveAndSubmitForApproval}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 h-12 rounded-xl shadow-xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-60"
              >
                {(isSaving || isSubmittingApproval)
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Send className="w-5 h-5 mr-2" />}
                Save & Submit
              </Button>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>
      
      {/* AI Business Co-Pilot Overlay */}
      <AIInsightOverlay 
        domain={category} 
        items={invoice.items} 
        businessId={business?.id} 
      />
    </div >
  );
}
