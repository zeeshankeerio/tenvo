'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getBrandsForDomain } from '@/lib/utils/pakistaniFeatures';
import { getBrandPlaceholderExamples } from '@/lib/regionalMarket/index.js';
import { t } from '@/lib/translations';

/**
 * Brand Autocomplete, country- and domain-aware brand suggestions.
 */
export function BrandAutocomplete({
    value,
    onChange,
    domain,
    countryIso = 'PK',
    label,
    placeholder,
    required = false,
    className = "",
    language = 'en'
}) {
    const suggestions = useMemo(() => {
        return getBrandsForDomain(domain, null, countryIso) || [];
    }, [domain, countryIso]);

    const handleChange = (e) => {
        onChange(e.target.value);
    };

    const displayLabel = label || t('brand', language);
    const displayPlaceholder =
        placeholder || getBrandPlaceholderExamples(countryIso, domain) || t('selectBrand', language);

    return (
        <div className={`space-y-2 ${className}`}>
            <Label htmlFor="brand-autocomplete" className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                {displayLabel}
                {required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            <Input
                id="brand-autocomplete"
                list="brands-list"
                value={value || ''}
                onChange={handleChange}
                placeholder={displayPlaceholder}
                className="h-11 rounded-xl"
                required={required}
                dir={language === 'ur' ? 'rtl' : 'ltr'}
            />

            <datalist id="brands-list">
                {suggestions.map((brand, index) => (
                    <option key={index} value={brand} />
                ))}
            </datalist>

            {value && !suggestions.includes(value) && (
                <p className="text-xs text-gray-500 font-medium">
                    {language === 'ur' ? 'حسب ضرورت برانڈ' : 'Custom brand'}: &quot;{value}&quot;
                </p>
            )}
        </div>
    );
}
