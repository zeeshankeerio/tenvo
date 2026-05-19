'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Phone, Mail, MapPin, Loader2, Sparkles, ShieldCheck, Wallet, FileText, CheckCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormError } from '@/components/ui/form-error';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { MarketLocationSelector } from '@/components/MarketLocationSelector';
import { FileUpload } from './FileUpload';
import { DomainFieldRenderer } from './domain/DomainFieldRenderer';
import { formatPakistaniPhone, vendorSchema, validateForm } from '@/lib/validation';
import { getDomainVendorFields, normalizeKey } from '@/lib/utils/domainHelpers';
import { getDomainColors } from '@/lib/domainColors';
import { useAppMode } from '@/lib/context/BusyModeContext';
import toast from 'react-hot-toast';
import { isEntitlementError, getEntitlementErrorMessage, isEntitlementErrorHandled } from '@/lib/utils/subscriptionErrors';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';

export function VendorForm({ initialData = null, onSave, onClose, onEntitlementError, category = 'retail-shop', business = null }) {
    const colors = getDomainColors(category);
    const { isEasyMode } = useAppMode();
    const [activeTab, setActiveTab] = useState('identity');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        ntn: '',
        address: '',
        city: business?.city || '',
        market_location: '',
        contact_person: '',
        srn: '',
        payment_terms: '',
        filer_status: 'none',
        opening_balance: 0,
        credit_limit: 0,
        certificate_url: '',
        domain_data: {}
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id,
                name: initialData.name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                ntn: initialData.ntn || '',
                address: initialData.address || '',
                city: initialData.city || '',
                contact_person: initialData.domain_data?.contact_person || initialData.contact_person || '',
                srn: initialData.srn || '',
                payment_terms: initialData.payment_terms || '',
                filer_status: initialData.filer_status || 'none',
                credit_limit: initialData.credit_limit || 0,
                outstanding_balance: initialData.outstanding_balance || 0,
                opening_balance: initialData.opening_balance || 0,
                certificate_url: initialData.certificate_url || '',
                domain_data: initialData.domain_data || {}
            });
        }
    }, [initialData]);

    const domainFields = getDomainVendorFields(category);

    const handleSave = async () => {
        const validation = validateForm(vendorSchema, formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            toast.error('Please resolve missing fields');
            if (activeTab === 'identity' && ['ntn', 'srn', 'credit_limit', 'payment_terms'].some(k => validation.errors[k])) {
                setActiveTab('tax');
            }
            return;
        }

        setIsLoading(true);
        try {
            if (onSave) {
                const result = await onSave(formData);
                
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
            }
            onClose?.();
        } catch (error) {
            console.error('Error saving vendor:', error);
            if (isEntitlementError(error)) {
                if (!isEntitlementErrorHandled(error)) {
                    toast.error(getEntitlementErrorMessage(error, { action: 'save vendor' }));
                }
                onEntitlementError?.(error);
            } else {
                toast.error('Failed to save vendor');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFillDemo = () => {
        const isTextile = category.includes('textile');
        const isPharmacy = category === 'pharmacy';
        const companies = ['Al-Noor Trading Co.', 'Indus Logistics PK', 'Habib & Sons', 'Zubair Chemicals', 'Standard Industrial Corp'];
        const cities = ['Karachi', 'Lahore', 'Faisalabad', 'Gujranwala', 'Sialkot'];

        const selectedName = companies[Math.floor(Math.random() * companies.length)] + (isTextile ? ' Textile' : '');

        const demoData = {
            name: selectedName,
            contactPerson: 'Demo Manager',
            phone: '+92 300 ' + Math.floor(1000000 + Math.random() * 9000000),
            email: `sales@${selectedName.toLowerCase().replace(/[^a-z0-9]/g, '')}.pk`,
            ntn: (Math.floor(Math.random() * 8999999) + 1000000) + '-' + Math.floor(Math.random() * 9),
            address: 'Plot ' + Math.floor(Math.random() * 100) + ', Industrial Area',
            city: cities[Math.floor(Math.random() * cities.length)],
            payment_terms: 'Net 30',
            filer_status: 'active',
            credit_limit: 500000,
            domain_data: {}
        };

        setFormData(prev => ({ ...prev, ...demoData }));
        toast.success(`Generated: ${selectedName}`);
    };

    return (
        <Card className="w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col" style={{ border: `1px solid ${colors.primary}20`, borderRadius: '24px' }}>
            <CardHeader className="flex-shrink-0" style={{ backgroundColor: `${colors.primary}05`, borderBottom: `1px solid ${colors.primary}10` }}>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2" style={{ color: colors.primary }}>
                        <Building2 className="w-5 h-5" />
                        {initialData ? 'Update Supplier Details' : 'Register New Supplier'}
                        {!initialData && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleFillDemo}
                                className="ml-2 h-7 px-2 text-[10px] font-black uppercase tracking-tighter border-wine/20 text-wine rounded-lg bg-wine/5 hover:bg-wine/10"
                            >
                                <Sparkles className="w-3 h-3 mr-1" /> Magic Fill
                            </Button>
                        )}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <span className="sr-only">Close</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>
                <CardDescription className="text-wine/60 font-medium">Add to your business procurement network with full tax details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 overflow-y-auto flex-grow px-8 max-h-[70vh]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn("grid w-full mb-8 bg-gray-100/50 p-1 rounded-xl", isEasyMode ? "grid-cols-1" : "grid-cols-4")}>
                        <TabsTrigger value="identity" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Identity
                            {['name', 'phone', 'email'].some(k => errors[k]) && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                        </TabsTrigger>
                        {!isEasyMode && (
                            <>
                                <TabsTrigger value="tax" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Tax & Finance
                                    {['ntn', 'srn', 'credit_limit'].some(k => errors[k]) && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="attachments" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    Attachments
                                </TabsTrigger>
                                <TabsTrigger value="domain" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                                    Expert Logic
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    <TabsContent value="identity" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest after:content-['*'] after:ml-0.5 after:text-red-500">Legal Business Name</Label>
                                <Input
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Allied Distributors"
                                    className="h-11 rounded-xl"
                                />
                                {errors?.name && <FormError message={errors.name} />}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Principal Contact</Label>
                                <Input
                                    value={formData.contact_person || ''}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Manager Name"
                                    className="h-11 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest after:content-['*'] after:ml-0.5 after:text-red-500">Official Phone</Label>
                                <Input
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: formatPakistaniPhone(e.target.value) })}
                                    placeholder="+92 300 1234567"
                                    className="h-11 rounded-xl"
                                />
                                {errors?.phone && <FormError message={errors.phone} />}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Business Email</Label>
                                <Input
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="sales@allied.pk"
                                    className="h-11 rounded-xl"
                                />
                                {errors?.email && <FormError message={errors.email} />}
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Head Office Address</Label>
                                <Input
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Warehouse/Office location"
                                    className="h-11 rounded-xl"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <CityAutocomplete
                                    value={formData.city}
                                    onChange={(val) => setFormData({ ...formData, city: val })}
                                    required={false}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <MarketLocationSelector
                                    value={formData.market_location}
                                    onChange={(val) => setFormData({ ...formData, market_location: val })}
                                    city={formData.city}
                                    required={false}
                                    language="en"
                                />
                            </div>
                        </div>
                        
                        {isEasyMode && (
                            <div className="mt-6 bg-wine/5 p-6 rounded-3xl border border-wine/10">
                                <h4 className="text-xs font-black text-wine uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" />
                                    Trade Credit & Terms
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Payment Cycle</Label>
                                        <select
                                            className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20"
                                            value={formData.payment_terms || ''}
                                            onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                        >
                                            <option value="">Standard Terms</option>
                                            <option value="Advanced">Advanced (100%)</option>
                                            <option value="COD">Cash on Delivery</option>
                                            <option value="Net 7">Net 7 Days</option>
                                            <option value="Net 15">Net 15 Days</option>
                                            <option value="Net 30">Net 30 Days</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Credit Limit</Label>
                                        <Input
                                            type="number"
                                            value={formData.credit_limit || 0}
                                            onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                                            placeholder="Maximum allowable credit"
                                            className="h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Opening Balance (Owed to Supplier)</Label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₨</span>
                                            <Input
                                                type="number"
                                                value={formData.opening_balance || 0}
                                                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                                                placeholder="Initial credit position"
                                                className="h-11 pl-12 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tax" className="space-y-6">
                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                FBR Compliance Profile
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">NTN Number</Label>
                                    <Input
                                        value={formData.ntn || ''}
                                        onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                                        placeholder="1234567-8"
                                        className="h-11 rounded-xl font-mono text-sm"
                                    />
                                    {errors?.ntn && <FormError message={errors.ntn} />}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">SRN Holder</Label>
                                    <Input
                                        value={formData.srn || ''}
                                        onChange={(e) => setFormData({ ...formData, srn: e.target.value })}
                                        placeholder="12-34-5678-910-11"
                                        className="h-11 rounded-xl font-mono text-sm"
                                    />
                                    {errors?.srn && <FormError message={errors.srn} />}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Filer Status</Label>
                                    <select
                                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 font-bold"
                                        value={formData.filer_status || 'none'}
                                        onChange={(e) => setFormData({ ...formData, filer_status: e.target.value })}
                                    >
                                        <option value="none">Choose Status</option>
                                        <option value="active">Active Filer</option>
                                        <option value="inactive">Non-Filer</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-wine/5 p-6 rounded-3xl border border-wine/10">
                            <h4 className="text-xs font-black text-wine uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Wallet className="w-4 h-4" />
                                Trade Credit & Terms
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Payment Cycle</Label>
                                    <select
                                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20"
                                        value={formData.payment_terms || ''}
                                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                    >
                                        <option value="">Standard Terms</option>
                                        <option value="Advanced">Advanced (100%)</option>
                                        <option value="COD">Cash on Delivery</option>
                                        <option value="Net 7">Net 7 Days</option>
                                        <option value="Net 15">Net 15 Days</option>
                                        <option value="Net 30">Net 30 Days</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Credit Limit</Label>
                                    <Input
                                        type="number"
                                        value={formData.credit_limit || 0}
                                        onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                                        placeholder="Maximum allowable credit"
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Opening Balance (Owed to Supplier)</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₨</span>
                                        <Input
                                            type="number"
                                            value={formData.opening_balance || 0}
                                            onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                                            placeholder="Initial credit position"
                                            className="h-11 pl-12 rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-wine/5 text-wine">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Supplier Credentials</h3>
                                    <p className="text-sm text-gray-500">Upload NTN certificates, ISO docs, or trade permits</p>
                                </div>
                            </div>

                            <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                                <FileUpload
                                    accept=".pdf,image/*"
                                    maxSize={5}
                                    onFileSelect={(file) => {
                                        toast.success('Document attached: ' + (file?.name || 'File'));
                                        if (file) setFormData({ ...formData, certificate_url: file.name });
                                    }}
                                />
                            </div>

                            {formData.certificate_url && (
                                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-semibold text-emerald-700 truncate max-w-[300px]">{formData.certificate_url}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => setFormData({ ...formData, certificate_url: '' })}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="domain" className="space-y-6">
                        {domainFields.length > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 rounded-lg bg-wine/5" style={{ color: colors.primary }}>
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Domain Specialized Data</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl bg-gray-50/50 border border-gray-100">
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
                            <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">Standard supplier profile applies to {category}</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-6 border-t font-bold sticky bottom-0 bg-white pb-6 z-10">
                    <Button variant="ghost" className="text-gray-400 hover:text-wine rounded-xl px-6" onClick={onClose}>Discard</Button>
                    <Button onClick={handleSave} disabled={isLoading} className="px-10 rounded-xl shadow-xl transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white" >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Save Changes' : 'Onboard Supplier')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
