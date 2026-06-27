'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Sparkles, ShieldCheck, Wallet, FileText, CheckCircle, Trash2, X } from 'lucide-react';
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
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';

const inputClass = 'h-9 rounded-lg border-gray-200 text-sm';
const labelClass = 'text-[11px] font-semibold text-slate-600';

export function VendorForm({
    initialData = null,
    onSave,
    onClose,
    onEntitlementError,
    category = 'retail-shop',
    business = null,
    embedded = false,
}) {
    const colors = getDomainColors(category);
    const { isPakistanMarket, taxIdLabel, registry } = useFormRegionalContext(category);
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
                market_location: initialData.market_location || '',
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
        const payload = {
            ...formData,
            credit_limit: Number(formData.credit_limit) || 0,
            opening_balance: Number(formData.opening_balance) || 0,
            srn: formData.srn || null,
            domain_data: formData.domain_data || {}
        };

        const validation = validateForm(vendorSchema, payload);
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
            }
            toast.success(initialData ? 'Supplier updated' : 'Supplier registered');
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
        const companies = ['Al-Noor Trading Co.', 'Indus Logistics PK', 'Habib & Sons'];
        const selectedName = companies[Math.floor(Math.random() * companies.length)];
        setFormData(prev => ({
            ...prev,
            name: selectedName,
            contact_person: 'Demo Manager',
            phone: `${registry?.phoneCode || '+1'} 300 ${Math.floor(1000000 + Math.random() * 9000000)}`,
            email: `sales@${selectedName.toLowerCase().replace(/[^a-z0-9]/g, '')}.pk`,
            ntn: (Math.floor(Math.random() * 8999999) + 1000000) + '-' + Math.floor(Math.random() * 9),
            address: 'Plot ' + Math.floor(Math.random() * 100) + ', Industrial Area',
            city: 'Karachi',
            payment_terms: 'Net 30',
            filer_status: 'active',
            credit_limit: 500000,
        }));
        toast.success(`Generated: ${selectedName}`);
    };

    const financeFields = (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
                <Label className={labelClass}>Payment Cycle</Label>
                <select className={cn(inputClass, 'w-full border border-input bg-white px-3')} value={formData.payment_terms || ''} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}>
                    <option value="">Standard Terms</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                </select>
            </div>
            <div className="space-y-1.5">
                <Label className={labelClass}>Credit Limit</Label>
                <Input type="number" value={formData.credit_limit || 0} onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })} className={inputClass} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
                <Label className={labelClass}>Opening Balance (Owed to Supplier)</Label>
                <Input type="number" value={formData.opening_balance || 0} onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })} className={inputClass} />
            </div>
        </div>
    );

    return (
        <Card
            className={cn(
                'flex w-full flex-col overflow-hidden shadow-xl',
                embedded ? 'border-none shadow-none rounded-none' : 'max-w-2xl rounded-2xl max-h-[min(88vh,820px)]'
            )}
            style={embedded ? undefined : { border: `1px solid ${colors.primary}20` }}
        >
            <CardHeader className="shrink-0 space-y-1 border-b px-3 py-3 sm:px-5 sm:py-4" style={{ backgroundColor: `${colors.primary}05`, borderColor: `${colors.primary}15` }}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold" style={{ color: colors.primary }}>
                            <Building2 className="h-4 w-4 shrink-0" />
                            {initialData ? 'Update Supplier' : 'Register New Supplier'}
                            {!initialData && (
                                <Button type="button" variant="outline" size="sm" onClick={handleFillDemo} className="h-7 px-2 text-[10px] font-semibold uppercase tracking-tight">
                                    <Sparkles className="mr-1 h-3 w-3" /> Magic Fill
                                </Button>
                            )}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500">
                            Procurement network with tax and trade terms
                        </CardDescription>
                    </div>
                    {onClose && (
                        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 rounded-lg hover:bg-red-50 hover:text-red-500" aria-label="Close">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn('mb-4 grid h-9 w-full bg-gray-100/80 p-0.5', isEasyMode ? 'grid-cols-1' : 'grid-cols-4')}>
                        <TabsTrigger value="identity" className="relative rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Identity
                            {['name', 'phone', 'email'].some(k => errors[k]) && (
                                <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                            )}
                        </TabsTrigger>
                        {!isEasyMode && (
                            <>
                                <TabsTrigger value="tax" className="relative rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Tax & Finance</TabsTrigger>
                                <TabsTrigger value="attachments" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Attachments</TabsTrigger>
                                <TabsTrigger value="domain" className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Expert</TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    <TabsContent value="identity" className="mt-0 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Legal Business Name *</Label>
                                <Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Allied Distributors" className={inputClass} />
                                {errors?.name && <FormError message={errors.name} />}
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Principal Contact</Label>
                                <Input value={formData.contact_person || ''} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="Manager Name" className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Official Phone *</Label>
                                <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: isPakistanMarket ? formatPakistaniPhone(e.target.value) : e.target.value })} placeholder={`${registry?.phoneCode || '+1'} 300 1234567`} className={inputClass} />
                                {errors?.phone && <FormError message={errors.phone} />}
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Business Email</Label>
                                <Input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="sales@allied.pk" className={inputClass} />
                                {errors?.email && <FormError message={errors.email} />}
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <Label className={labelClass}>Head Office Address</Label>
                                <Input value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Warehouse / office location" className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <CityAutocomplete value={formData.city} onChange={(val) => setFormData({ ...formData, city: val })} required={false} />
                            </div>
                            <div className="space-y-1.5">
                                <MarketLocationSelector value={formData.market_location} onChange={(val) => setFormData({ ...formData, market_location: val })} city={formData.city} required={false} language="en" />
                            </div>
                        </div>
                        {isEasyMode && (
                            <div className="rounded-xl border border-wine/10 bg-wine/[0.03] p-4">
                                <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-wine">
                                    <Wallet className="h-4 w-4" /> Trade Credit
                                </h4>
                                {financeFields}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tax" className="mt-0 space-y-4">
                        <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>{taxIdLabel} Number</Label>
                                <Input value={formData.ntn || ''} onChange={(e) => setFormData({ ...formData, ntn: e.target.value })} placeholder="1234567-8" className={cn(inputClass, 'font-mono')} />
                                {errors?.ntn && <FormError message={errors.ntn} />}
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>SRN</Label>
                                <Input value={formData.srn || ''} onChange={(e) => setFormData({ ...formData, srn: e.target.value })} placeholder="12-34-5678-910-11" className={cn(inputClass, 'font-mono')} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Filer Status</Label>
                                <select className={cn(inputClass, 'w-full border border-input bg-white px-3')} value={formData.filer_status || 'none'} onChange={(e) => setFormData({ ...formData, filer_status: e.target.value })}>
                                    <option value="none">Choose Status</option>
                                    <option value="active">Active Filer</option>
                                    <option value="inactive">Non-Filer</option>
                                </select>
                            </div>
                        </div>
                        <div className="rounded-xl border border-wine/10 bg-wine/[0.03] p-4">
                            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-wine">
                                <ShieldCheck className="h-4 w-4" /> Trade Credit & Terms
                            </h4>
                            {financeFields}
                        </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="mt-0 space-y-4">
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4">
                            <FileUpload accept=".pdf,image/*" maxSize={5} onFileSelect={(file) => {
                                toast.success('Document attached: ' + (file?.name || 'File'));
                                if (file) setFormData({ ...formData, certificate_url: file.name });
                            }} />
                        </div>
                        {formData.certificate_url && (
                            <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                    <span className="truncate text-sm font-medium text-emerald-700">{formData.certificate_url}</span>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => setFormData({ ...formData, certificate_url: '' })}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
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
                                Standard supplier profile applies to {category.replace(/-/g, ' ')}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3">
                <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-gray-500">Discard</Button>
                <Button type="button" onClick={handleSave} disabled={isLoading} className="h-9 bg-emerald-600 px-6 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Save Changes' : 'Onboard Supplier')}
                </Button>
            </div>
        </Card>
    );
}
