// This file usually uses formatCurrency, but checking for hardcoded symbols

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Download, Printer, Save, Calculator, FileText, Loader2, Scan, Keyboard, AlertCircle, ShoppingCart, WandSparkles, Send, Clock3, CheckCircle2, XCircle, ShieldCheck, MoreHorizontal } from 'lucide-react';
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
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useStockAvailability, useCreditLimitCheck, useDueDateCalculator } from '@/lib/hooks/useInvoiceHelpers';
import { invoiceSchema, validateWithSchema } from '@/lib/validation/schemas';
import { getCurrentSeason, getSeasonalDiscount } from '@/lib/domainData/pakistaniSeasons';
import { hasSeasonalPricing } from '@/lib/utils/pakistaniFeatures';
import { ExpertActionPanel } from '@/components/domain/ExpertActionPanel';
import { submitInvoiceForApprovalAction, getApprovalHistoryAction, schedulePaymentRemindersAction } from '@/lib/actions/standard/invoice-approval';
import { MOBILE_OVERLAY, MOBILE_OVERLAY_CARD, MOBILE_FORM_FOOTER, MOBILE_GRID_FIELDS } from '@/lib/utils/formMobileStyles';
import { InvoiceMobileLineItems } from '@/components/invoice/mobile/InvoiceMobileLineItems';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const {
    business,
    currency: ctxCurrency,
    currencySymbol: ctxCurrencySymbol,
    registry: regionalStandards,
    defaultTaxRate,
    isPakistanMarket,
    domainKnowledge,
    taxLabel: regionalTaxLabel,
  } = useFormRegionalContext(category);
  const standards = regionalStandards || getRegionalStandards('PK');
  const currency = ctxCurrency || standards.currency;
  const strategy = getTaxStrategy(standards);
  const colors = getDomainColors(category);
  const isPakistaniDomain = isPakistanMarket;
  const currencySymbol = business?.settings?.financials?.currencySymbol || ctxCurrencySymbol || standards.currencySymbol;

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
      invoiceNumber: '', // Will be generated by server using DocumentSequenceService
      documentType: regionalTaxLabel || standards.taxLabel,
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
        const taxPercent = item.tax_percent || item.taxPercent || (isPakistaniDomain ? defaultTaxRate : 0);
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
              updated.taxPercent = Number(product.taxPercent) || (isPakistaniDomain ? defaultTaxRate : 0);
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
    // taxResult.totalTax is the canonical field; fall back to taxAmount for safety
    const totalTax = Number(taxResult.totalTax ?? taxResult.taxAmount ?? 0);

    const total = Number((finalSubtotal + totalTax).toFixed(2));
    const manualRoundOff = Number(invoice.roundOff || 0) || 0;
    const grandTotal = Number((total + manualRoundOff).toFixed(2));

    return {
      subtotal: finalSubtotal,
      rawSubtotal: subtotal,
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
          taxPercent: product.taxPercent || (isPakistaniDomain ? defaultTaxRate : 0),
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
      taxPercent: lastItem?.taxPercent ?? (isPakistaniDomain ? defaultTaxRate : 0),
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
      const taxPercent = Number(product?.taxPercent || product?.tax_percent || (isPakistaniDomain ? defaultTaxRate : 0)) || 0;
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
    const grandTotal = Number(totals.total) || 0;
    const rawSubtotal = Number(totals.rawSubtotal ?? totals.subtotal) || 0;
    const tax = Number(totals.totalTax || totals.tax_total || 0) || 0;
    const discount = Number(totals.discount || 0) || 0;
    const seasonal = Number(totals.seasonalDiscount || 0) || 0;
    const roundOff = Number(totals.roundOff || 0) || 0;
    // Expected: rawSubtotal - discount - seasonal + tax + roundOff = grandTotal
    const expected = Number((rawSubtotal - discount - seasonal + tax + roundOff).toFixed(2));
    const difference = Math.abs(grandTotal - expected);
    return {
      debit: grandTotal,
      credit: expected,
      balanced: difference < 0.02,
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
    const saved = await persistInvoice();
    if (saved) {
      onClose();
    }
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
      if (!savedInvoice) {
        // Save failed, error toast already shown by persistInvoice
        return;
      }
      
      const invoiceId = savedInvoice.id || invoice?.id || initialData?.id;

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
      
      // Close the modal after successful submission
      onClose();
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
    <div className={cn(MOBILE_OVERLAY, 'animate-in fade-in duration-300')}>
      <Card className={cn(MOBILE_OVERLAY_CARD, 'max-w-6xl shadow-2xl')}>
        <CardHeader className="relative shrink-0 flex flex-col gap-2 border-b bg-slate-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:py-5">
          <div className="min-w-0 space-y-1 pr-10 sm:pr-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-semibold tracking-tight text-slate-800 sm:text-2xl">
                {initialData ? 'Edit Invoice' : 'New Invoice'}
              </CardTitle>
              <Badge variant="outline" className="text-[11px] font-medium bg-white text-slate-600 border-slate-200 shadow-sm">
                {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('text-[10px] font-semibold uppercase tracking-wider shadow-sm border', activeApprovalStatus.className)}>
                <activeApprovalStatus.icon className="w-3.5 h-3.5 mr-1" />
                {activeApprovalStatus.label}
              </Badge>
              {currentSeason && (
                <Badge variant="outline" className="text-[10px] font-semibold text-orange-600 border-orange-200 bg-orange-50 shadow-sm uppercase tracking-wider">
                  {currentSeason.name.en} ({currentSeason.discountPercent}% OFF)
                </Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-200 sm:flex cursor-help" onClick={() => setShowKeyboardHints(!showKeyboardHints)}>
              <Keyboard className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Hotkeys</span>
            </div>
            <div className="text-right hidden md:block border-l pl-4 border-slate-200">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Invoice Number</p>
              <p className="font-mono text-sm font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-sm">{invoice.invoiceNumber}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-2 top-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors sm:static sm:ml-2">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        {showKeyboardHints && (
          <div className="border-b border-slate-700 bg-slate-800 px-3 py-2 text-[10px] font-medium text-slate-200 shadow-inner sm:px-8 sm:text-[11px]">
            <div className="flex flex-wrap gap-3 sm:gap-6">
            <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-sm">CTRL+S</kbd> Save</span>
            <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-sm">CTRL+B</kbd> Barcode Focus</span>
            <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 border border-slate-600 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-sm">ENTER</kbd> New Row</span>
            <span className="flex items-center gap-1.5"><kbd className="rounded border border-slate-600 bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] shadow-sm">ESC</kbd> Close</span>
            </div>
          </div>
        )}
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:p-8 sm:pb-8">
          {/* Business Header - Your Brand */}
          {business?.name && (
            <div className="pb-2 mb-2 flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-800 mb-1">
                  {business.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {business.address && <span>{business.address}</span>}
                  {business.ntn && <span><span className="font-semibold text-slate-600">NTN:</span> {business.ntn}</span>}
                  {business.srn && <span><span className="font-semibold text-slate-600">SRN:</span> {business.srn}</span>}
                  {business.phone && <span><span className="font-semibold text-slate-600">Tel:</span> {business.phone}</span>}
                  {business.email && <span><span className="font-semibold text-slate-600">Email:</span> {business.email}</span>}
                </div>
              </div>
            </div>
          )}

          <div className={cn('rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-5', MOBILE_GRID_FIELDS, 'lg:grid-cols-4')}>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Invoice Number</Label>
              <Input value={invoice.invoiceNumber} readOnly className="bg-slate-100/50 border-slate-200 shadow-none h-9 text-sm text-slate-700" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Date *</Label>
              <Input
                type="date"
                value={invoice.date || ''}
                onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                required
                className="h-9 text-sm shadow-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Due Date</Label>
              <Input
                type="date"
                value={invoice.dueDate || ''}
                onChange={(e) => {
                  setIsDueDateManuallyEdited(true);
                  setInvoice({ ...invoice, dueDate: e.target.value });
                }}
                className="h-9 text-sm shadow-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Document Type</Label>
              <Combobox
                options={[
                  { value: 'tax', label: `${standards.taxLabel} Invoice` },
                  { value: 'retail', label: 'Retail Invoice' },
                  { value: 'export', label: 'Export Invoice' },
                ]}
                value={invoice.invoiceType}
                onChange={(val) => setInvoice({ ...invoice, invoiceType: val })}
                placeholder="Select type..."
                className="h-9 text-sm shadow-sm border-slate-200"
              />
            </div>
          </div>

          {/* Customer Selection */}
          <div className="rounded-xl border border-slate-100 p-3 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold sm:text-lg">Customer Details</h3>
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
                  className="h-9 w-full shadow-sm sm:w-[300px]"
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Customer Name *</Label>
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
                  className="h-9 text-sm shadow-sm border-slate-200"
                />
              </div>
              {standards.countryCode === 'PK' && (
                <div className="space-y-1.5 flex flex-col justify-center mt-1">
                  <Label className="text-xs font-semibold text-slate-600">Province</Label>
                  <select
                    value={invoice.customer.province}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      customer: { ...invoice.customer, province: e.target.value }
                    })}
                    className="bg-transparent border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-slate-300 cursor-pointer"
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
                  "col-span-full mb-2 flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between",
                  totals.total + (invoice.customer.outstanding_balance || 0) > invoice.customer.credit_limit
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                )}>
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Credit Profile</span>
                    </div>
                    <span className="text-xs font-medium">Limit: {formatCurrency(invoice.customer.credit_limit, currency)} <span className="text-slate-300 mx-1">|</span> Balance: {formatCurrency(invoice.customer.outstanding_balance || 0, currency)}</span>
                  </div>
                  {totals.total + (invoice.customer.outstanding_balance || 0) > invoice.customer.credit_limit && (
                    <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      Limit Exceeded
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Email</Label>
                <Input
                  type="email"
                  value={invoice.customer.email || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, email: e.target.value }
                  })}
                  className="h-9 text-sm shadow-sm border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Phone</Label>
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
                  className="h-9 text-sm shadow-sm border-slate-200"
                />
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Billing Address</Label>
                <Input
                  value={invoice.customer.address || ''}
                  onChange={(e) => setInvoice({
                    ...invoice,
                    customer: { ...invoice.customer, address: e.target.value }
                  })}
                  className="h-9 text-sm shadow-sm border-slate-200"
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
          <div className="pt-2">
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShoppingCart className="w-4 h-4 text-slate-500" />
                Line Items
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                <div className="relative group w-full sm:w-48">
                  <Scan className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                  <Input
                    id="barcode-sniffer"
                    placeholder="Scan barcode"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleBarcodeScan(barcodeInput);
                    }}
                    className="h-9 w-full rounded-md border-dashed border-slate-300 bg-white pl-8 font-mono text-xs shadow-sm transition-all focus:bg-white sm:h-8"
                  />
                </div>
                <div className="flex gap-2">
                {isPakistaniDomain && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTaxCalculator(!showTaxCalculator)}
                    className="h-9 flex-1 rounded-md border-slate-200 text-xs shadow-sm sm:h-8 sm:flex-none"
                  >
                    <Calculator className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Tax
                  </Button>
                )}
                <Button onClick={addItem} size="sm" className="h-9 flex-1 rounded-md text-xs font-medium text-white shadow-sm transition-all hover:opacity-90 sm:h-8 sm:flex-none" style={{ backgroundColor: colors.primary }}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add line
                </Button>
                </div>
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
              {/* Mobile: stacked line cards (no horizontal scroll) */}
              <div className="lg:hidden">
                <InvoiceMobileLineItems
                  items={invoice.items}
                  products={products}
                  category={category}
                  currency={currency}
                  colors={colors}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  addItem={addItem}
                  onEnterLastRow={addItem}
                />
              </div>

              {/* Desktop: wide line table */}
              {invoice.items.length === 0 ? (
                <div className="hidden text-center py-10 bg-slate-50 text-slate-500 border border-dashed border-slate-200 rounded-xl lg:block">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-sm text-slate-600">No items added yet.</p>
                  <p className="text-xs mt-1">Click "Add Row" or scan a barcode to get started.</p>
                </div>
              ) : (
                <div className="relative hidden overflow-x-auto rounded-lg border border-slate-200 shadow-sm lg:block">
                  <table className="w-full text-sm text-left" style={{minWidth: '900px'}}>
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider w-12">#</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider">Item Details</th>
                        {getDomainInvoiceColumns(category).map(col => (
                          <th key={col.field} className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider ${col.width || 'w-24'}`}>
                            {col.header}
                          </th>
                        ))}
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{minWidth:'96px'}}>Qty</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{minWidth:'110px'}}>Rate</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{minWidth:'80px'}}>Disc%</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{minWidth:'80px'}}>Tax%</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{minWidth:'130px'}}>Amount</th>
                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider" style={{minWidth:'64px'}}>Expert</th>
                        <th className="px-4 py-2.5" style={{minWidth:'40px'}}></th>
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

                          <td className="px-3 py-2" style={{minWidth:'96px'}}>
                            <Input
                              type="number"
                              value={item.quantity || 0}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min={0}
                              className="h-8 text-xs text-right w-full"
                            />
                          </td>
                          <td className="px-3 py-2" style={{minWidth:'110px'}}>
                            <Input
                              type="number"
                              value={item.rate || 0}
                              onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              min={0}
                              step="0.01"
                              className="h-8 text-xs text-right w-full"
                            />
                          </td>
                          <td className="px-3 py-2" style={{minWidth:'80px'}}>
                            <Input
                              type="number"
                              value={item.discount || 0}
                              onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              min={0}
                              max={100}
                              className="h-8 text-xs w-full"
                            />
                          </td>
                          <td className="px-3 py-2" style={{minWidth:'80px'}}>
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
                              className="h-8 text-xs focus:ring-wine/20 w-full"
                            />
                          </td>
                          <td className="px-3 py-2" style={{minWidth:'130px'}}>
                            <Input
                              type="number"
                              value={item.amount || 0}
                              onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              min={0}
                              step={0.01}
                              className="h-8 text-xs font-semibold focus:ring-wine/20 w-full"
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
            <div className="flex justify-stretch lg:justify-end">
              <div className="w-full space-y-2 lg:w-80">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(totals.rawSubtotal ?? totals.subtotal, currency)}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-gray-400">Total Discount:</span>
                    <select
                      className="h-auto cursor-pointer border-0 bg-transparent p-0 text-[10px] font-bold text-wine focus:ring-0"
                      value={invoice.discountType}
                      onChange={(e) => setInvoice({ ...invoice, discountType: e.target.value })}
                    >
                      <option value="percent">% Ratio</option>
                      <option value="amount">Fixed {standards.currencySymbol}</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2">
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
                  <div className="flex flex-col gap-2 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-pink-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-orange-600">{currentSeason.name.en} Discount</span>
                      <Badge className="bg-orange-500 text-white text-[10px] font-semibold">
                        {currentSeason.discountPercent}% OFF
                      </Badge>
                    </div>
                    <span className="shrink-0 font-semibold text-orange-600">-{formatCurrency(totals.seasonalDiscount, currency)}</span>
                  </div>
                )}
                {/* Render dynamic tax breakdown from strategy */}
                {Object.entries(totals.taxDetails || {}).map(([label, detail]) => {
                  // detail.amount is already the computed tax amount (not a base)
                  const taxVal = Number(detail?.amount ?? 0);
                  if (taxVal <= 0) return null;
                  return (
                    <div key={label} className="flex justify-between text-sm text-slate-600">
                      <span>{label} ({((detail?.rate ?? 0) * 100).toFixed(0)}%):</span>
                      <span>{formatCurrency(taxVal, currency || 'PKR')}</span>
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
          <div className="grid grid-cols-1 gap-4 border-t pt-4 lg:grid-cols-2">
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
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex min-w-0 items-start gap-2 text-sm text-slate-700 sm:items-center">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-semibold shrink-0">Workflow:</span>
                <span className="min-w-0">{activeApprovalStatus.helper}</span>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-500">Ref: {invoice.invoiceNumber}</span>
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
        </CardContent>

        <div className={cn(MOBILE_FORM_FOOTER, 'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]')}>
          <div className="flex flex-col gap-3">
            <div className="hidden gap-2 overflow-x-auto pb-0.5 scrollbar-none sm:flex sm:flex-wrap">
              <Button type="button" variant="outline" onClick={() => applySmartDraft('items')} className="h-9 shrink-0 rounded-md border-indigo-200 px-3 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50">
                <WandSparkles className="mr-1.5 h-3.5 w-3.5" /> Smart Items
              </Button>
              <Button type="button" variant="outline" onClick={() => applySmartDraft('full')} className="h-9 shrink-0 rounded-md border-violet-200 px-3 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-50">
                <WandSparkles className="mr-1.5 h-3.5 w-3.5" /> Smart Full
              </Button>
              <Button type="button" variant="outline" onClick={() => toast.success('Link generated for WhatsApp message')} className="h-9 shrink-0 rounded-md border-emerald-200 px-3 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-50">
                WhatsApp
              </Button>
            </div>
            {smartDraftMeta && (
              <div className="hidden rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] text-indigo-600 sm:block">
                <span className="font-semibold text-indigo-800">Smart Draft:</span>{' '}
                {smartDraftMeta.scope === 'full' ? `Customer ${smartDraftMeta.customerLabel}` : (smartDraftMeta.customerMode === 'preserved' ? 'Customer preserved' : 'Customer unchanged')}; items {smartDraftMeta.productLabels.join(', ')}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-md border-slate-200 px-3 text-sm font-medium text-slate-700 shadow-sm sm:hidden"
                  >
                    <MoreHorizontal className="mr-1.5 h-4 w-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => applySmartDraft('items')}>
                    <WandSparkles className="mr-2 h-4 w-4" />
                    Smart items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => applySmartDraft('full')}>
                    <WandSparkles className="mr-2 h-4 w-4" />
                    Smart full draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success('Link generated for WhatsApp message')}>
                    WhatsApp share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} disabled={isSaving || isExporting}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button type="button" variant="ghost" onClick={onClose} className="h-9 flex-1 rounded-md px-4 text-sm font-medium text-slate-500 hover:bg-slate-100 sm:flex-none">
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={handleExportPDF} disabled={isSaving || isExporting} className="hidden h-9 rounded-md border-slate-200 px-3 text-sm font-medium text-slate-700 shadow-sm sm:inline-flex">
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4 text-slate-500" />}
                Print
              </Button>
              <Button type="button" disabled={isSaving} onClick={handleSave} className="h-9 flex-1 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 sm:flex-none">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
              <Button type="button" disabled={!canSubmitForApproval} onClick={handleSaveAndSubmitForApproval} className="h-9 flex-1 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:flex-none">
                {(isSaving || isSubmittingApproval) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
