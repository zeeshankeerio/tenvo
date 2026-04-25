'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsersIcon, Loader2, Sparkles, Building2, Smartphone, Wallet, FileText, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDomainCustomerFields, normalizeKey } from '@/lib/utils/domainHelpers';
import { DomainFieldRenderer } from './domain/DomainFieldRenderer';
import { useBusiness } from '@/lib/context/BusinessContext';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { MarketLocationSelector } from '@/components/MarketLocationSelector';
import { validateNTN, formatNTN } from '@/lib/tax/pakistaniTax';
import { formatPakistaniPhone, isValidCNIC, isValidPakistaniPhone, customerSchema, validateForm } from '@/lib/validation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormError } from '@/components/ui/form-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isEntitlementError, getEntitlementErrorMessage, isEntitlementErrorHandled } from '@/lib/utils/subscriptionErrors';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';

const COUNTRY_CODES = [
    { code: '+92', label: 'PK (+92)' },
    { code: '+1', label: 'US (+1)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+966', label: 'SA (+966)' },
    { code: '+91', label: 'IN (+91)' },
    { code: '+86', label: 'CN (+86)' },
];

export function CustomerForm({
    onSave,
    onClose,
    onEntitlementError,
    initialData = null,
    category = 'retail-shop'
}) {
    const { business } = useBusiness();
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
        filer_status: 'none', // none, active, inactive
        domain_data: initialData?.domain_data || {},
        ...initialData
    });

    const [countryCode, setCountryCode] = useState('+92');
    const [localPhone, setLocalPhone] = useState('');

    // Initialize phone state from initialData or formData
    useEffect(() => {
        const phone = formData.phone || '';
        if (!phone) {
            setLocalPhone('');
            return;
        }

        // Try to match existing prefix
        const matcheCode = COUNTRY_CODES.find(c => phone.startsWith(c.code));
        if (matcheCode) {
            setCountryCode(matcheCode.code);
            setLocalPhone(phone.slice(matcheCode.code.length).trim());
        } else {
            // Default fallback if no match or manually entered differently
            setLocalPhone(phone);
        }
    }, [initialData]);

    // Sync to formData when parts change
    useEffect(() => {
        // Clean local phone of double spaces
        const cleanLocal = localPhone.replace(/\s+/g, ' ').trim();
        if (cleanLocal) {
            handleInputChange('phone', `${countryCode} ${cleanLocal}`);
        } else {
            handleInputChange('phone', '');
        }
    }, [countryCode, localPhone]);

    const handleLocalPhoneChange = (e) => {
        // Allow digits, spaces, dashes
        const val = e.target.value.replace(/[^\d\s-]/g, '');
        setLocalPhone(val);
    };

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
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Auto-formatters (removed handlePhoneChange as we use split input now)

    const handleCNICChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
        // Format: 42201-1234567-1
        if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
        if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
        if (val.length > 15) val = val.slice(0, 15);

        handleInputChange('cnic', val);
    };

    const handleNTNChange = (e) => {
        const val = e.target.value;
        handleInputChange('ntn', formatNTN(val));
    };

    const validateLocalInputs = () => {
        if (!formData.name) {
            toast.error('Customer name is required');
            return false;
        }

        // Lenient phone validation (just check minimum length)
        if (formData.phone && formData.phone.length < 8) {
            toast.error('Phone number seems too short');
            return false;
        }

        // CNIC Validation
        if (formData.cnic && !isValidCNIC(formData.cnic)) {
            toast.error('Invalid CNIC format (e.g. 42201-1234567-1)');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        // 1. Local basic checks
        if (!validateLocalInputs()) return;

        // 2. Schema validation (Zod)
        const validation = validateForm(customerSchema, formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            toast.error('Please fix highlighted errors');
            // If error is in tax fields but we are on basic tab, switch to tax tab
            if (activeTab === 'basic' && ['ntn', 'cnic', 'srn'].some(k => validation.errors[k])) {
                setActiveTab('tax');
            }
            return;
        }

        setIsLoading(true);
        try {
            // Transform formData to match schema expectations
            const payload = {
                ...formData,
                credit_limit: Number(formData.credit_limit) || 0,
                opening_balance: Number(formData.opening_balance) || 0,
                srn: formData.srn || null,
                domain_data: formData.domain_data || {}
            };
            
            const result = await onSave(payload);
            
            // Check if result indicates failure
            if (result && !result.success) {
                // Handle validation errors separately
                if (isValidationError(result)) {
                    const fieldErrors = formatValidationErrors(result);
                    setErrors(fieldErrors);
                    toast.error('Please fix highlighted errors');
                    return;
                }
                
                // Show user-friendly error message
                showActionError(result);
                return;
            }
            
            toast.success(`Customer ${initialData ? 'updated' : 'created'} successfully`);
        } catch (error) {
            console.error('Customer save error:', error);
            if (isEntitlementError(error)) {
                if (!isEntitlementErrorHandled(error)) {
                    toast.error(getEntitlementErrorMessage(error, { action: 'save customer' }));
                }
                onEntitlementError?.(error);
            } else {
                toast.error(error.message || 'Failed to save customer');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFillDemo = () => {
        const isTextile = category.includes('textile');
        const isPharmacy = category === 'pharmacy';

        const randomLocal = '3' + Math.floor(Math.random() * 90 + 10) + ' ' + Math.floor(Math.random() * 9000000 + 1000000);

        const demoData = {
            name: isTextile ? 'Zubair Fabrics & Sons' : (isPharmacy ? 'Al-Shifa Medicos' : 'Global Traders'),
            // phone is now handled via state sync, but we set it here for completeness if needed, 
            // though the effect will overwrite it based on countryCode/localPhone
            email: 'contact@' + (isTextile ? 'zubairfabrics' : 'demo-client') + '.com',
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
        };

        setCountryCode('+92');
        setLocalPhone(randomLocal);
        setFormData(prev => ({ ...prev, ...demoData }));
        toast.success('Generated realistic demo data');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-2xl border-wine/20 shadow-2xl animate-in slide-in-from-bottom-5 max-h-[90vh] overflow-y-auto">
                <CardHeader className="bg-wine/5 border-b border-wine/10 sticky top-0 bg-white z-10 backdrop-blur-md bg-opacity-90">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-wine flex items-center gap-2">
                            <UsersIcon className="w-5 h-5" />
                            {initialData ? 'Edit Customer' : 'Add New Customer'}
                            {!initialData && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFillDemo}
                                    className="ml-2 h-7 px-2 text-[10px] font-black uppercase tracking-tighter border-wine/20 text-wine hover:bg-wine/5 rounded-lg"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" /> Magic Fill
                                </Button>
                            )}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-red-50 hover:text-red-500 rounded-full h-8 w-8">
                            <span className="sr-only">Close</span>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>
                    <CardDescription className="text-wine/60 font-medium">
                        Manage client details and tax information
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100/50 p-1 rounded-xl">
                            <TabsTrigger value="basic" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:text-wine data-[state=active]:shadow-sm">
                                Basic Details
                                {['name', 'phone', 'city'].some(k => errors[k]) && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="tax" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:text-wine data-[state=active]:shadow-sm">
                                Financial & Tax
                                {['ntn', 'cnic', 'srn', 'credit_limit'].some(k => errors[k]) && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="domain" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:text-wine data-[state=active]:shadow-sm text-xs">
                                Domain Expert Info
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest after:content-['*'] after:ml-0.5 after:text-red-500">Customer Name</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="Full Name / Company"
                                        className="h-11 rounded-xl"
                                    />
                                    {errors?.name && <FormError message={errors.name} />}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest after:content-['*'] after:ml-0.5 after:text-red-500">Phone</Label>
                                    <div className="flex gap-2">
                                        <Select value={countryCode} onValueChange={setCountryCode}>
                                            <SelectTrigger className="w-[110px] h-11 rounded-xl bg-gray-50 border-gray-200">
                                                <SelectValue placeholder="Code" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COUNTRY_CODES.map((c) => (
                                                    <SelectItem key={c.code} value={c.code}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative flex-1">
                                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                value={localPhone}
                                                onChange={handleLocalPhoneChange}
                                                placeholder="300 1234567"
                                                className="h-11 rounded-xl pl-10"
                                            />
                                        </div>
                                    </div>
                                    {errors?.phone && <FormError message={errors.phone} />}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Email</Label>
                                    <Input
                                        value={formData.email || ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="customer@example.com"
                                        className="h-11 rounded-xl"
                                    />
                                    {errors?.email && <FormError message={errors.email} />}
                                </div>
                                <div className="space-y-2">
                                    <CityAutocomplete
                                        value={formData.city}
                                        onChange={(val) => handleInputChange('city', val)}
                                        required={true}
                                    />
                                    {errors?.city && <FormError message={errors.city} />}
                                </div>
                                <div className="space-y-2">
                                    <MarketLocationSelector
                                        value={formData.market_location}
                                        onChange={(val) => handleInputChange('market_location', val)}
                                        city={formData.city}
                                        required={false}
                                        language="en"
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Billing Address</Label>
                                    <Input
                                        value={formData.address || ''}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        placeholder="Complete Address (Shop #, Market, Area)"
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="tax" className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-6">
                                <div className="bg-gray-50/50 p-6 rounded-2xl border border-dashed border-gray-200">
                                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-wine" />
                                        Tax Compliance
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">CNIC (Individuals)</Label>
                                            <Input
                                                value={formData.cnic || ''}
                                                onChange={handleCNICChange}
                                                placeholder="42201-1234567-1"
                                                className="h-11 rounded-xl font-mono text-sm"
                                                maxLength={15}
                                            />
                                            {errors?.cnic && <FormError message={errors.cnic} />}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">NTN (Business)</Label>
                                            <Input
                                                value={formData.ntn || ''}
                                                onChange={handleNTNChange}
                                                placeholder="1234567-8"
                                                className="h-11 rounded-xl font-mono text-sm"
                                                maxLength={9}
                                            />
                                            {errors?.ntn && <FormError message={errors.ntn} />}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">SRN (Services)</Label>
                                            <Input
                                                value={formData.srn || ''}
                                                onChange={(e) => handleInputChange('srn', e.target.value)}
                                                placeholder="12-34-5678-910-1"
                                                className="h-11 rounded-xl font-mono text-sm"
                                            />
                                            {errors?.srn && <FormError message={errors.srn} />}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">FBR Filer Status</Label>
                                            <select
                                                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 font-bold"
                                                value={formData.filer_status || 'none'}
                                                onChange={(e) => handleInputChange('filer_status', e.target.value)}
                                                style={{ color: formData.filer_status === 'active' ? '#16a34a' : (formData.filer_status === 'inactive' ? '#dc2626' : 'inherit') }}
                                            >
                                                <option value="none">Not Verified</option>
                                                <option value="active">Active (Filer)</option>
                                                <option value="inactive">Inactive (Non-Filer)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-wine/5 p-6 rounded-2xl border border-wine/10">
                                    <h4 className="text-sm font-bold text-wine mb-4 flex items-center gap-2">
                                        <Wallet className="w-4 h-4" />
                                        Financial Settings
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Credit Limit (PKR)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">₨</span>
                                                <Input
                                                    type="number"
                                                    value={formData.credit_limit || ''}
                                                    onChange={(e) => handleInputChange('credit_limit', e.target.value)}
                                                    placeholder="0"
                                                    className="h-11 rounded-xl pl-8"
                                                />
                                            </div>
                                            {errors.credit_limit && <FormError message={errors.credit_limit} />}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Opening Balance (PKR)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">₨</span>
                                                <Input
                                                    type="number"
                                                    value={formData.opening_balance || ''}
                                                    onChange={(e) => handleInputChange('opening_balance', e.target.value)}
                                                    placeholder="0"
                                                    className="h-11 rounded-xl pl-8"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="domain" className="space-y-6 animate-in fade-in duration-300">
                            {domainFields.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-wine/5 text-wine">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 capitalize">
                                                {category.replace(/-/g, ' ')} Specialist Data
                                            </h4>
                                            <p className="text-sm text-gray-500 font-medium">Domain-specific attributes for accurate profiling</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gray-50/50 border border-gray-100">
                                        {domainFields.map(field => {
                                            const key = normalizeKey(field);
                                            return (
                                                <DomainFieldRenderer
                                                    key={field}
                                                    field={key}
                                                    value={formData.domain_data?.[key] || ''}
                                                    onChange={(val) => setFormData({
                                                        ...formData,
                                                        domain_data: {
                                                            ...formData.domain_data,
                                                            [key]: val
                                                        }
                                                    })}
                                                    category={category}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No domain-specific fields for {category.replace(/-/g, ' ')}</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-3 pt-6 border-t font-bold sticky bottom-0 bg-white pb-2 z-10">
                        <Button variant="ghost" className="text-gray-400 hover:text-wine hover:bg-wine/5 rounded-xl px-6" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isLoading} className="bg-wine hover:bg-wine/90 text-white px-10 rounded-xl shadow-lg shadow-wine/20 transition-all active:scale-95">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? 'Update Customer' : 'Confirm & Add Customer')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
