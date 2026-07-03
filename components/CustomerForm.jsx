'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsersIcon, Loader2, Sparkles, Building2, Smartphone, Wallet, Globe, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDomainCustomerFields, normalizeKey } from '@/lib/utils/domainHelpers';
import { DomainFieldRenderer } from './domain/DomainFieldRenderer';
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
import { getRegionalStandards, getPhoneCountryCodeOptions } from '@/lib/utils/regionalHelpers';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { MarketLocationSelector } from '@/components/MarketLocationSelector';
import { useAppMode } from '@/lib/context/BusyModeContext';
import { validateNTN, formatNTN } from '@/lib/tax/pakistaniTax';
import { formatPakistaniPhone, isValidCNIC, isValidPakistaniPhone, customerSchema, validateForm } from '@/lib/validation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormError } from '@/components/ui/form-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isEntitlementError, getEntitlementErrorMessage, isEntitlementErrorHandled } from '@/lib/utils/subscriptionErrors';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';
import { MOBILE_FORM_BODY, MOBILE_FORM_FOOTER, MOBILE_INPUT_CLASS, MOBILE_LABEL_CLASS } from '@/lib/utils/formMobileStyles';

const PHONE_COUNTRY_CODES = getPhoneCountryCodeOptions();

export function CustomerForm({
    onSave,
    onClose,
    onEntitlementError,
    initialData = null,
    category = 'retail-shop',
    embedded = false,
}) {
    const {
        business,
        currency,
        taxIdLabel,
        isPakistanMarket,
        registry,
    } = useFormRegionalContext(category);
    const standards = registry || getRegionalStandards('PK');
    const { isEasyMode } = useAppMode();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        ntn: '',
        cnic: '',
        srn: '',
        address: '',
        city: business?.city || '',
        market_location: '',
        credit_limit: 0,
        opening_balance: 0,
        filer_status: 'none',
        domain_data: initialData?.domain_data || {},
        ...initialData
    });

    const [countryCode, setCountryCode] = useState(standards.phoneCode || '+92');
    const [localPhone, setLocalPhone] = useState('');

    useEffect(() => {
        const phone = formData.phone || '';
        if (!phone) {
            setLocalPhone('');
            return;
        }
        const matcheCode = PHONE_COUNTRY_CODES.find(c => phone.startsWith(c.code));
        if (matcheCode) {
            setCountryCode(matcheCode.code);
            setLocalPhone(phone.slice(matcheCode.code.length).trim());
        } else {
            setLocalPhone(phone);
        }
    }, [initialData]);

    useEffect(() => {
        const cleanLocal = localPhone.replace(/\s+/g, ' ').trim();
        if (cleanLocal) {
            handleInputChange('phone', `${countryCode} ${cleanLocal}`);
        } else {
            handleInputChange('phone', '');
        }
    }, [countryCode, localPhone]);

    const domainFields = getDomainCustomerFields(category);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        } else if (business?.city && !formData.city) {
            setFormData(prev => ({ ...prev, city: business.city }));
        }
    }, [initialData, business?.city]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleCNICChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
        if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
        if (val.length > 15) val = val.slice(0, 15);
        handleInputChange('cnic', val);
    };

    const handleNTNChange = (e) => {
        handleInputChange('ntn', formatNTN(e.target.value));
    };

    const validateLocalInputs = () => {
        if (!formData.name) {
            toast.error('Customer name is required');
            return false;
        }
        if (formData.phone && formData.phone.length < 8) {
            toast.error('Phone number seems too short');
            return false;
        }
        if (formData.cnic && !isValidCNIC(formData.cnic)) {
            toast.error('Invalid CNIC format (e.g. 42201-1234567-1)');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateLocalInputs()) return;

        const validation = validateForm(customerSchema, formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            toast.error('Please fix highlighted errors');
            if (activeTab === 'basic' && ['ntn', 'cnic', 'srn'].some(k => validation.errors[k])) {
                setActiveTab('tax');
            }
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                credit_limit: Number(formData.credit_limit) || 0,
                opening_balance: Number(formData.opening_balance) || 0,
                srn: formData.srn || null,
                domain_data: formData.domain_data || {}
            };

            const result = await onSave(payload);

            if (result && !result.success) {
                if (isValidationError(result)) {
                    setErrors(formatValidationErrors(result));
                    toast.error('Please fix highlighted errors');
                    return;
                }
                showActionError(result);
                return;
            }

            onClose?.();
        } catch (error) {
            console.error('Customer save error:', error);
            if (isEntitlementError(error)) {
                if (!isEntitlementErrorHandled(error)) {
                    toast.error(getEntitlementErrorMessage(error, { action: 'save customer' }));
                }
                onEntitlementError?.(error);
            } else {
                showActionError({
                    success: false,
                    error: error.message || 'Failed to save customer',
                    code: error.code || null,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFillDemo = () => {
        const isTextile = category.includes('textile');
        const isPharmacy = category === 'pharmacy';
        const randomLocal = '3' + Math.floor(Math.random() * 90 + 10) + ' ' + Math.floor(Math.random() * 9000000 + 1000000);

        setCountryCode('+92');
        setLocalPhone(randomLocal);
        setFormData(prev => ({
            ...prev,
            name: isTextile ? 'Zubair Fabrics & Sons' : (isPharmacy ? 'Al-Shifa Medicos' : 'Global Traders'),
            email: 'contact@demo-client.com',
            ntn: Math.floor(Math.random() * 9000000 + 1000000) + '-' + Math.floor(Math.random() * 9),
            cnic: '42201-' + Math.floor(Math.random() * 9000000 + 1000000) + '-' + Math.floor(Math.random() * 9),
            address: isTextile ? 'Shop # 45, Jama Cloth Market' : 'Plot 123, Sector 5',
            city: isTextile ? 'Karachi' : 'Lahore',
            credit_limit: 500000,
            domain_data: {
                marketlocation: isTextile ? 'Jama Cloth' : '',
                brokername: isTextile ? 'Haji Bashoor' : '',
                shopname: isTextile ? 'Zubair Fabrics' : '',
                marketsegment: 'Wholesale',
            }
        }));
        toast.success('Generated realistic demo data');
    };

    return (
        <Card className={cn(
            'flex w-full flex-col overflow-hidden border-wine/15 shadow-xl',
            embedded ? 'border-none shadow-none rounded-none' : 'max-w-2xl rounded-2xl max-h-[min(88vh,820px)]'
        )}>
            <CardHeader className="shrink-0 space-y-1 border-b border-wine/10 bg-wine/[0.03] px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold text-wine">
                            <UsersIcon className="h-4 w-4 shrink-0" />
                            {initialData ? 'Edit Customer' : 'Add New Customer'}
                            {!initialData && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFillDemo}
                                    className="h-7 px-2 text-[10px] font-semibold uppercase tracking-tight border-wine/20 text-wine hover:bg-wine/5"
                                >
                                    <Sparkles className="mr-1 h-3 w-3" /> Magic Fill
                                </Button>
                            )}
                        </CardTitle>
                        <CardDescription className="text-xs text-wine/60">
                            Manage client details and tax information
                        </CardDescription>
                    </div>
                    {onClose && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 shrink-0 rounded-lg hover:bg-red-50 hover:text-red-500"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className={MOBILE_FORM_BODY}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn('mb-3 flex h-9 w-full gap-0.5 overflow-x-auto rounded-lg bg-gray-100/80 p-0.5 scrollbar-none sm:grid', isEasyMode ? 'grid-cols-1 sm:grid-cols-1' : 'sm:grid-cols-3')}>
                        <TabsTrigger value="basic" className="relative rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Basic Details
                            {['name', 'phone', 'city'].some(k => errors[k]) && (
                                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                            )}
                        </TabsTrigger>
                        {!isEasyMode && (
                            <>
                                <TabsTrigger value="tax" className="relative rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Financial & Tax
                                    {['ntn', 'cnic', 'srn', 'credit_limit'].some(k => errors[k]) && (
                                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="domain" className="relative rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Domain Info
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    <TabsContent value="basic" className="mt-0 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className={MOBILE_LABEL_CLASS}>Customer Name *</Label>
                                <Input value={formData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Full Name / Company" className={MOBILE_INPUT_CLASS} />
                                {errors?.name && <FormError message={errors.name} />}
                            </div>
                            <div className="space-y-1.5">
                                <Label className={MOBILE_LABEL_CLASS}>Phone *</Label>
                                <div className="flex gap-2">
                                    <Select value={countryCode} onValueChange={setCountryCode}>
                                        <SelectTrigger className="h-9 w-[100px] rounded-lg">
                                            <SelectValue placeholder="Code" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PHONE_COUNTRY_CODES.map((c) => (
                                                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="relative flex-1">
                                        <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input value={localPhone} onChange={(e) => setLocalPhone(e.target.value.replace(/[^\d\s-]/g, ''))} placeholder="300 1234567" className={cn(MOBILE_INPUT_CLASS, 'pl-9')} />
                                    </div>
                                </div>
                                {errors?.phone && <FormError message={errors.phone} />}
                            </div>
                            <div className="space-y-1.5">
                                <Label className={MOBILE_LABEL_CLASS}>Email</Label>
                                <Input value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="customer@example.com" className={MOBILE_INPUT_CLASS} />
                                {errors?.email && <FormError message={errors.email} />}
                            </div>
                            <div className="space-y-1.5">
                                <CityAutocomplete value={formData.city} onChange={(val) => handleInputChange('city', val)} required />
                                {errors?.city && <FormError message={errors.city} />}
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <MarketLocationSelector value={formData.market_location} onChange={(val) => handleInputChange('market_location', val)} city={formData.city} required={false} language="en" />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <Label className={MOBILE_LABEL_CLASS}>Billing Address</Label>
                                <Input value={formData.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="Shop #, Market, Area" className={MOBILE_INPUT_CLASS} />
                            </div>
                        </div>

                        {isEasyMode && (
                            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className={MOBILE_LABEL_CLASS}>Credit Limit ({currency})</Label>
                                    <Input type="number" value={formData.credit_limit || ''} onChange={(e) => handleInputChange('credit_limit', e.target.value)} placeholder="0" className={MOBILE_INPUT_CLASS} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className={MOBILE_LABEL_CLASS}>Opening Balance ({currency})</Label>
                                    <Input type="number" value={formData.opening_balance || ''} onChange={(e) => handleInputChange('opening_balance', e.target.value)} placeholder="0" className={MOBILE_INPUT_CLASS} />
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tax" className="mt-0 space-y-4">
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 md:grid-cols-2">
                            {isPakistanMarket ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className={MOBILE_LABEL_CLASS}>CNIC</Label>
                                        <Input value={formData.cnic || ''} onChange={handleCNICChange} placeholder="42201-1234567-1" className={cn(MOBILE_INPUT_CLASS, 'font-mono')} maxLength={15} />
                                        {errors?.cnic && <FormError message={errors.cnic} />}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={MOBILE_LABEL_CLASS}>{taxIdLabel || 'NTN'}</Label>
                                        <Input value={formData.ntn || ''} onChange={handleNTNChange} placeholder="1234567-8" className={cn(MOBILE_INPUT_CLASS, 'font-mono')} maxLength={9} />
                                        {errors?.ntn && <FormError message={errors.ntn} />}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={MOBILE_LABEL_CLASS}>SRN</Label>
                                        <Input value={formData.srn || ''} onChange={(e) => handleInputChange('srn', e.target.value)} placeholder="12-34-5678-910-1" className={cn(MOBILE_INPUT_CLASS, 'font-mono')} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={MOBILE_LABEL_CLASS}>FBR Filer Status</Label>
                                        <select className={cn(MOBILE_INPUT_CLASS, 'w-full border border-input bg-background px-3')} value={formData.filer_status || 'none'} onChange={(e) => handleInputChange('filer_status', e.target.value)}>
                                            <option value="none">Not Verified</option>
                                            <option value="active">Active (Filer)</option>
                                            <option value="inactive">Inactive (Non-Filer)</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className={MOBILE_LABEL_CLASS}>{taxIdLabel}</Label>
                                    <Input value={formData.ntn || ''} onChange={(e) => handleInputChange('ntn', e.target.value)} placeholder={`${taxIdLabel} / registration number`} className={MOBILE_INPUT_CLASS} />
                                    {errors?.ntn && <FormError message={errors.ntn} />}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className={MOBILE_LABEL_CLASS}>Credit Limit ({currency})</Label>
                                <Input type="number" value={formData.credit_limit || ''} onChange={(e) => handleInputChange('credit_limit', e.target.value)} placeholder="0" className={MOBILE_INPUT_CLASS} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={MOBILE_LABEL_CLASS}>Opening Balance ({currency})</Label>
                                <Input type="number" value={formData.opening_balance || ''} onChange={(e) => handleInputChange('opening_balance', e.target.value)} placeholder="0" className={MOBILE_INPUT_CLASS} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="domain" className="mt-0 space-y-4">
                        {domainFields.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 md:grid-cols-2">
                                {domainFields.map(field => {
                                    const key = normalizeKey(field);
                                    return (
                                        <DomainFieldRenderer
                                            key={field}
                                            field={key}
                                            value={formData.domain_data?.[key] || ''}
                                            onChange={(val) => setFormData({
                                                ...formData,
                                                domain_data: { ...formData.domain_data, [key]: val }
                                            })}
                                            category={category}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
                                No domain-specific fields for this category
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>

            <div className={cn(MOBILE_FORM_FOOTER, 'flex items-center justify-end gap-2')}>
                <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-gray-500">Cancel</Button>
                <Button type="button" onClick={handleSubmit} disabled={isLoading} className="h-9 bg-emerald-600 px-6 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Update Customer' : 'Add Customer')}
                </Button>
            </div>
        </Card>
    );
}
