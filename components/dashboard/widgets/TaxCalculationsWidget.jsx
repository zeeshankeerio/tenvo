'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';
import { getTaxCalculations } from '@/lib/actions/dashboard/widgets';
import toast from 'react-hot-toast';

/**
 * TaxCalculationsWidget Component
 * 
 * Dashboard widget showing PST/FST tax calculations and liability
 * Displays tax breakdown by period with payment status
 * 
 * Features:
 * - Display PST and FST totals
 * - Show tax liability by period
 * - Add tax payment status
 * - Quick action: "View Tax Reports"
 * 
 * Requirements: 6.7, 7.1, 7.2
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {Object} props.data - Tax calculations data (optional, will fetch if not provided)
 * @param {string} [props.currency] - Currency code (default: 'PKR')
 * @param {Function} [props.onViewDetails] - Callback when user clicks to view details
 */
export function TaxCalculationsWidget({ 
  businessId,
  data,
  currency = 'PKR',
  onViewDetails
}) {
  const { language } = useLanguage();
  const t = translations[language] || translations['en'] || {};
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) {
      setTaxData(data);
      setLoading(false);
    } else {
      loadTaxCalculations();
      
      // Refresh every 5 minutes
      const interval = setInterval(loadTaxCalculations, 300000);
      return () => clearInterval(interval);
    }
  }, [businessId, data]);

  const loadTaxCalculations = async () => {
    try {
      setLoading(true);
      
      const result = await getTaxCalculations(businessId, currency);
      
      if (result.success) {
        setTaxData(result.data);
      } else {
        console.error('Failed to load tax calculations:', result.error);
        toast.error(result.error || 'Failed to load tax data');
      }
    } catch (err) {
      console.error('Failed to load tax calculations:', err);
      toast.error('Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taxData) {
    return (
      <Card className="glass-card border-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-gray-900">
            {t.tax_calculations || 'Tax Calculations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t.no_tax_data || 'No tax data available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-gray-900">
              {t.tax_calculations || 'Tax Calculations'}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.pst_fst_calculations || 'PST/FST calculations'}
            </CardDescription>
          </div>
          <div className="p-2.5 rounded-2xl bg-wine-50 border border-wine-200 shadow-inner">
            <Calculator className="w-5 h-5 text-wine-600" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Tax Breakdown */}
        <div className="p-3 rounded-lg bg-gray-50/50 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">
              {t.taxable_sales || 'Taxable Sales'}
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(taxData.taxableAmount, currency)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
            <div className="text-xs text-blue-700 font-medium mb-1">
              {t.pst || 'PST'} ({taxData.pst.rate}%)
            </div>
            <div className="text-xl font-semibold text-blue-900">
              {formatCurrency(taxData.pst.amount, currency)}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gradient-to-br from-wine-50 to-wine-100/50 border border-wine-200">
            <div className="text-xs text-wine-700 font-medium mb-1">
              {t.fst || 'FST'} ({taxData.fst.rate}%)
            </div>
            <div className="text-xl font-semibold text-wine-900">
              {formatCurrency(taxData.fst.amount, currency)}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-green-900">
              {t.total_tax_liability || 'Total Tax Liability'}
            </span>
            <span className="text-2xl font-semibold text-green-900">
              {formatCurrency(taxData.totalTax, currency)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div>
              <div className="text-gray-600">{t.paid || 'Paid'}</div>
              <div className="font-bold text-green-700">
                {formatCurrency(taxData.taxPaid, currency)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">{t.pending || 'Pending'}</div>
              <div className="font-bold text-orange-700">
                {formatCurrency(taxData.taxPending, currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <button
          onClick={() => onViewDetails?.('view-tax-details')}
          className="w-full text-xs font-bold text-wine-600 hover:text-wine-700 transition-colors py-2"
        >
          {t.view_detailed_calculations || 'View Detailed Calculations'} →
        </button>

        {/* Last Updated */}
        <div className="text-center text-[10px] text-gray-400">
          {t.last_updated || 'Last updated'}: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}


