'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { getDomainKnowledge } from '@/lib/domainKnowledge';
import { getRegionalStandards } from '@/lib/utils/regionalHelpers';

/**
 * TaxCategorySelector, domain + country-aware tax categories.
 */
export function TaxCategorySelector({
    category = 'retail-shop',
    countryIso = 'PK',
    value = '',
    onChange,
    className = '',
}) {
    const domainKnowledge = getDomainKnowledge(category, { countryIso });
    const regional = getRegionalStandards(countryIso);
    const taxCategories = domainKnowledge?.taxCategories || [`${regional.taxLabel} ${regional.defaultTaxRate}%`];
    const defaultTax = domainKnowledge?.defaultTax ?? regional.defaultTaxRate ?? 0;
    const isPkMarket = String(countryIso || domainKnowledge?.countryIso || 'PK').toUpperCase() === 'PK';

    // Parse tax percentage from category string
    const parseTaxPercent = (taxCategory) => {
        const match = taxCategory.match(/(\d+(?:\.\d+)?)\s*%/);
        return match ? parseFloat(match[1]) : defaultTax;
    };

    // Get tax info based on category
    const getTaxInfo = (taxCategory) => {
        const taxInfoMap = {
            // Pakistani Tax Categories
            'Sales Tax 17%': { rate: 17, description: 'Standard Sales Tax (FBR)', color: 'blue' },
            'Sales Tax 18%': { rate: 18, description: 'Standard Sales Tax (FBR)', color: 'blue' },
            'Sales Tax 0%': { rate: 0, description: 'Zero Rated (Export)', color: 'green' },
            'Provincial Tax': { rate: 0, description: 'Provincial Sales Tax', color: 'purple' },
            'WHT 2%': { rate: 2, description: 'Withholding Tax', color: 'orange' },
            'Zero Rated': { rate: 0, description: 'Zero Rated (Export)', color: 'green' },
            'Exempt': { rate: 0, description: 'Tax Exempt', color: 'gray' },
            'FBR Standard': { rate: 17, description: 'FBR Standard Rate', color: 'blue' },
            'Further Tax 3%': { rate: 3, description: 'Further Tax (Unregistered)', color: 'red' },
            'Zero Rated (Export)': { rate: 0, description: 'Export Sales', color: 'green' },
            'Unregistered Buyer (3% Further Tax)': { rate: 3, description: 'Further Tax', color: 'red' },
            'Services Tax 16%': { rate: 16, description: 'Services Tax', color: 'indigo' },
            'Petroleum Levy': { rate: 0, description: 'Petroleum Levy', color: 'yellow' },

            // Indian GST Categories
            'GST 0%': { rate: 0, description: 'Zero Rated GST', color: 'green' },
            'GST 5%': { rate: 5, description: 'GST 5%', color: 'blue' },
            'GST 12%': { rate: 12, description: 'GST 12%', color: 'indigo' },
            'GST 18%': { rate: 18, description: 'GST 18%', color: 'purple' },
            'GST 28%': { rate: 28, description: 'GST 28%', color: 'red' },
            'Ad Valorem Tax': { rate: 0, description: 'Ad Valorem Tax', color: 'orange' },
        };

        return taxInfoMap[taxCategory] || {
            rate: parseTaxPercent(taxCategory),
            description: taxCategory,
            color: 'gray'
        };
    };

    const selectedTaxInfo = value ? getTaxInfo(value) : null;

    // Static class map for Tailwind JIT
    const TAX_COLOR_CLASSES = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        purple: 'bg-brand-50 text-brand-primary-dark border-brand-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        gray: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    const handleChange = (e) => {
        const selectedCategory = e.target.value;
        const taxInfo = getTaxInfo(selectedCategory);
        onChange?.(selectedCategory, taxInfo.rate);
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                    Tax Category
                </Label>
                {selectedTaxInfo && (
                    <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase ${TAX_COLOR_CLASSES[selectedTaxInfo.color] || TAX_COLOR_CLASSES.gray}`}
                    >
                        {selectedTaxInfo.rate}%
                    </Badge>
                )}
            </div>

            <select
                value={value}
                onChange={handleChange}
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine transition-all"
            >
                <option value="">Select Tax Category</option>
                {taxCategories.map((category, index) => {
                    const taxInfo = getTaxInfo(category);
                    return (
                        <option key={index} value={category}>
                            {category} ({taxInfo.rate}%)
                        </option>
                    );
                })}
            </select>

            {selectedTaxInfo && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700">
                        <p className="font-semibold">{selectedTaxInfo.description}</p>
                        {isPkMarket ? (
                            <p className="text-blue-600 mt-1">
                                {selectedTaxInfo.rate > 0
                                    ? `FBR-compliant tax rate: ${selectedTaxInfo.rate}%`
                                    : 'No tax applicable for this category'}
                            </p>
                        ) : (
                            <p className="text-blue-600 mt-1">
                                {selectedTaxInfo.rate > 0
                                    ? `${regional.taxLabel} reference rate: ${selectedTaxInfo.rate}%`
                                    : 'No tax applicable for this category'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Domain-specific tax notes */}
            {isPkMarket && category === 'pharmacy' && (
                <p className="text-xs text-gray-500 italic">
                    Most pharmaceutical products are exempt or taxed at 5%
                </p>
            )}
            {isPkMarket && category === 'textile-wholesale' && (
                <p className="text-xs text-gray-500 italic">
                    Export sales are zero-rated. Further tax applies for unregistered buyers.
                </p>
            )}
            {isPkMarket && category === 'grocery' && (
                <p className="text-xs text-gray-500 italic">
                    Most grocery items are exempt or zero-rated
                </p>
            )}
            {isPkMarket && ['garments', 'boutique-fashion'].includes(category) && (
                <p className="text-xs text-gray-500 italic">
                    Unregistered buyers attract 3% Further Tax (Section 3(1A) Sales Tax Act 1990).
                </p>
            )}
        </div>
    );
}

/**
 * Get tax percentage from category string
 * @param {string} taxCategory - Tax category string (e.g., "Sales Tax 17%")
 * @returns {number} Tax percentage
 */
export function getTaxPercentFromCategory(taxCategory) {
    const match = taxCategory.match(/(\d+(?:\.\d+)?)\s*%/);
    return match ? parseFloat(match[1]) : 0;
}

