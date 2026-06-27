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
import { formatPakistaniPhone, formatNTN } from '@/lib/tax/pakistaniTax';
import { FormError } from '@/components/ui/form-error';
import { cn } from '@/lib/utils';
import { MOBILE_GRID_FIELDS, MOBILE_INPUT_CLASS, MOBILE_LABEL_CLASS, MOBILE_FORM_FOOTER } from '@/lib/utils/formMobileStyles';

export function QuickVendorForm({ onSave, onCancel }) {
    const { business, isPakistanMarket, taxIdLabel, registry } = useFormRegionalContext();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        contactPerson: '',
        ntn: '',
        strn: '',
        address: '',
        city: business?.city || '',
        payment_terms: ''
    });

    const handleFillDemo = () => {
        setFormData({
            name: 'Quick Supplier ' + Math.floor(Math.random() * 1000),
            phone: `${registry?.phoneCode || '+1'} 300 1234567`,
            email: `supplier${Math.floor(Math.random() * 1000)}@example.com`,
            contactPerson: 'Manager Name',
            ntn: '1234567-8',
            strn: '',
            address: 'Industrial Area',
            city: 'Karachi',
            payment_terms: 'COD'
        });
        toast.success('Demo data filled');
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handlePhoneChange = (e) => {
        const value = isPakistanMarket ? formatPakistaniPhone(e.target.value) : e.target.value;
        handleInputChange('phone', value);
    };

    const handleNTNChange = (e) => {
        const formatted = isPakistanMarket ? formatNTN(e.target.value) : e.target.value;
        handleInputChange('ntn', formatted);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Zod validation
        const validation = validateWithSchema(vendorSchema, formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            toast.error('Please fix highlighted errors');
            return;
        }

        setIsLoading(true);
        try {
            const newVendor = await vendorAPI.create({
                ...formData,
                business_id: business.id
            });

            onSave(newVendor);
            toast.success('Vendor created successfully');
        } catch (error) {
            console.error(error);
            if (isEntitlementError(error)) {
                if (!isEntitlementErrorHandled(error)) {
                    toast.error(getEntitlementErrorMessage(error, { action: 'create vendor' }));
                }
            } else {
                toast.error(error.message || 'Failed to create vendor');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-bold sm:text-base">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        New Vendor
                    </h3>
                    <p className="text-[11px] text-gray-500">Quick supplier entry</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleFillDemo} className="h-8 shrink-0 text-[10px]">
                    <Sparkles className="mr-1 h-3 w-3" /> Fill
                </Button>
            </div>

            <div className={MOBILE_GRID_FIELDS}>
                <div className="col-span-full space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>City</Label>
                    <CityAutocomplete
                        value={formData.city}
                        onChange={val => handleInputChange('city', val)}
                    />
                    {errors.city && <FormError message={errors.city} />}
                </div>

                <div className="col-span-full space-y-1.5">
                    <Label className={MOBILE_LABEL_CLASS}>Company Name *</Label>
                    <Input
                        value={formData.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className={cn(MOBILE_INPUT_CLASS, errors.name ? 'border-red-500' : '')}
                    />
                    {errors.name && <FormError message={errors.name} />}
                </div>

                <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder={`${registry?.phoneCode || '+1'} 3XX XXXXXXX`}
                        className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <FormError message={errors.phone} />}
                </div>

                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={e => handleInputChange('email', e.target.value)}
                        placeholder="vendor@example.com"
                        className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <FormError message={errors.email} />}
                </div>

                <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                        value={formData.contactPerson}
                        onChange={e => handleInputChange('contactPerson', e.target.value)}
                        placeholder="Manager name"
                    />
                </div>

                <div className="space-y-2">
                    <Label>{taxIdLabel} (Tax Number)</Label>
                    <Input
                        value={formData.ntn}
                        onChange={handleNTNChange}
                        placeholder="1234567-8"
                        className={errors.ntn ? 'border-red-500' : ''}
                    />
                    {errors.ntn && <FormError message={errors.ntn} />}
                </div>

                <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <select
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                        value={formData.payment_terms}
                        onChange={e => handleInputChange('payment_terms', e.target.value)}
                    >
                        <option value="">Select Terms</option>
                        <option value="COD">Cash on Delivery</option>
                        <option value="Net 7">Net 7 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                        value={formData.address}
                        onChange={e => handleInputChange('address', e.target.value)}
                        placeholder="Street address"
                    />
                </div>
            </div>

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    <p className="font-semibold">Please fix the following errors:</p>
                    <ul className="list-disc list-inside mt-1">
                        {Object.entries(errors).map(([field, msg]) => (
                            <li key={field}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={cn(MOBILE_FORM_FOOTER, 'mt-2 flex justify-end gap-2')}>
                <Button type="button" variant="outline" onClick={onCancel} className="h-9 rounded-xl text-xs">Cancel</Button>
                <Button type="submit" disabled={isLoading} className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Vendor'}
                </Button>
            </div>
        </form>
    );
}
