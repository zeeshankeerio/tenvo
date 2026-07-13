'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { vendorAPI } from '@/lib/api/vendors';
import { isEntitlementError, getEntitlementErrorMessage, isEntitlementErrorHandled } from '@/lib/utils/subscriptionErrors';
import { useFormRegionalContext } from '@/lib/hooks/useFormRegionalContext';
import { formatPakistaniPhone, vendorSchema, validateForm } from '@/lib/validation';
import { FormError } from '@/components/ui/form-error';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { cn } from '@/lib/utils';
import { MOBILE_GRID_FIELDS, MOBILE_INPUT_CLASS, MOBILE_LABEL_CLASS, MOBILE_FORM_FOOTER } from '@/lib/utils/formMobileStyles';
import { showActionError, formatValidationErrors, isValidationError } from '@/lib/utils/formErrorHandler';

/** Format business NTN as 1234567-8 while typing (Pakistan). */
function formatBusinessNtn(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 7) return digits;
    return `${digits.slice(0, 7)}-${digits.slice(7)}`;
}

export function QuickVendorForm({ onSave, onCancel }) {
    const { business, isPakistanMarket, taxIdLabel, registry } = useFormRegionalContext();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        contact_person: '',
        ntn: '',
        address: '',
        city: business?.city || '',
        payment_terms: ''
    });

    const handleFillDemo = () => {
        setFormData({
            name: 'Quick Supplier ' + Math.floor(Math.random() * 1000),
            phone: isPakistanMarket ? '+92 300 1234567' : `${registry?.phoneCode || '+1'} 300 1234567`,
            email: `supplier${Math.floor(Math.random() * 1000)}@example.com`,
            contact_person: 'Manager Name',
            ntn: isPakistanMarket ? '1234567-8' : '',
            address: 'Industrial Area',
            city: business?.city || 'Karachi',
            payment_terms: 'COD'
        });
        setErrors({});
        toast.success('Demo data filled');
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handlePhoneChange = (e) => {
        const value = isPakistanMarket ? formatPakistaniPhone(e.target.value) : e.target.value;
        handleInputChange('phone', value);
    };

    const handleNTNChange = (e) => {
        const formatted = isPakistanMarket ? formatBusinessNtn(e.target.value) : e.target.value;
        handleInputChange('ntn', formatted);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!business?.id) {
            toast.error('Business context required');
            return;
        }

        const payload = {
            ...formData,
            name: (formData.name || '').trim(),
            contact_person: (formData.contact_person || '').trim() || null,
            email: (formData.email || '').trim() || '',
            phone: (formData.phone || '').trim() || '',
            ntn: (formData.ntn || '').trim() || '',
            srn: '',
            credit_limit: 0,
            opening_balance: 0,
        };

        const validation = validateForm(vendorSchema, payload);
        if (!validation.isValid) {
            setErrors(validation.errors);
            const first = Object.values(validation.errors)[0];
            toast.error(first || 'Please fix highlighted errors');
            return;
        }

        setIsLoading(true);
        try {
            const newVendor = await vendorAPI.create({
                ...payload,
                ntn: payload.ntn || null,
                business_id: business.id,
            });

            onSave?.(newVendor);
            toast.success('Vendor created');
        } catch (error) {
            console.error(error);
            if (isEntitlementError(error)) {
                if (!isEntitlementErrorHandled(error)) {
                    toast.error(getEntitlementErrorMessage(error, { action: 'create vendor' }));
                }
            } else if (error?.validationErrors) {
                setErrors(formatValidationErrors({ errors: error.validationErrors }));
                toast.error('Please fix highlighted errors');
            } else if (isValidationError(error)) {
                setErrors(formatValidationErrors(error));
                toast.error('Please fix highlighted errors');
            } else {
                showActionError({ success: false, error: error.message || 'Failed to create vendor' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fieldClass = (field) => cn(MOBILE_INPUT_CLASS, errors[field] ? 'border-red-500' : '');

    return (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                        <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="truncate">New Vendor</span>
                    </h3>
                    <p className="text-[11px] text-gray-500">Quick supplier entry for purchase orders</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleFillDemo} className="h-7 sm:h-8 shrink-0 text-[10px] sm:text-xs self-start">
                    <Sparkles className="mr-1 h-3 w-3" /> 
                    <span className="hidden xs:inline">Magic Fill</span>
                    <span className="xs:hidden">Fill</span>
                </Button>
            </div>

            {Object.keys(errors).length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 sm:p-3 text-sm text-red-700" role="alert">
                    <p className="font-semibold text-xs sm:text-sm">Please fix the following:</p>
                    <ul className="mt-1 list-inside list-disc text-[10px] sm:text-xs space-y-0.5">
                        {Object.entries(errors).map(([field, msg]) => (
                            <li key={field} className="truncate">{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={MOBILE_GRID_FIELDS}>
                <div className="col-span-full space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Company Name *</Label>
                    <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className={fieldClass('name')}
                        autoFocus
                    />
                    {errors.name && <FormError message={errors.name} />}
                </div>

                <div className="space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Phone</Label>
                    <Input
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder={`${registry?.phoneCode || '+1'} 3XX XXXXXXX`}
                        className={fieldClass('phone')}
                    />
                    {errors.phone && <FormError message={errors.phone} />}
                </div>

                <div className="space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Email</Label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="vendor@example.com"
                        className={fieldClass('email')}
                    />
                    {errors.email && <FormError message={errors.email} />}
                </div>

                <div className="space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Contact Person</Label>
                    <Input
                        value={formData.contact_person}
                        onChange={(e) => handleInputChange('contact_person', e.target.value)}
                        placeholder="Manager name"
                        className={fieldClass('contact_person')}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>{taxIdLabel} (Tax Number)</Label>
                    <Input
                        value={formData.ntn}
                        onChange={handleNTNChange}
                        placeholder="1234567-8"
                        className={cn(fieldClass('ntn'), 'font-mono')}
                    />
                    {errors.ntn && <FormError message={errors.ntn} />}
                </div>

                <div className="space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Payment Terms</Label>
                    <select
                        className={cn(MOBILE_INPUT_CLASS, 'w-full border border-input bg-white px-3')}
                        value={formData.payment_terms}
                        onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                    >
                        <option value="">Select Terms</option>
                        <option value="COD">Cash on Delivery</option>
                        <option value="Net 7">Net 7 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                    </select>
                </div>

                <div className="col-span-full space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>City</Label>
                    <CityAutocomplete
                        value={formData.city}
                        onChange={(val) => handleInputChange('city', val)}
                        required={false}
                    />
                    {errors.city && <FormError message={errors.city} />}
                </div>

                <div className="col-span-full space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Address</Label>
                    <Input
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Street address"
                        className={fieldClass('address')}
                    />
                </div>
            </div>

            <div className={cn(MOBILE_FORM_FOOTER, 'mt-3 sm:mt-4 flex flex-col-reverse sm:flex-row justify-end gap-2')}>
                <Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-xl text-xs sm:text-sm w-full sm:w-auto">Cancel</Button>
                <Button type="submit" disabled={isLoading} className="h-9 rounded-xl bg-emerald-600 px-4 sm:px-5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 w-full sm:w-auto">
                    {isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
                    ) : (
                        <>
                            <span className="hidden sm:inline">Create Vendor</span>
                            <span className="sm:hidden">Create</span>
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
