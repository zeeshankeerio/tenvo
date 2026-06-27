'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { warehouseAPI } from '@/lib/api/warehouse';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Loader2, Building2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { MOBILE_INPUT_CLASS, MOBILE_BTN_PRIMARY, MOBILE_BTN_SECONDARY } from '@/lib/utils/formMobileStyles';
import { cn } from '@/lib/utils';

export function QuickWarehouseForm({ onSave, onCancel }) {
    const { business } = useBusiness();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        type: 'warehouse'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return toast.error('Name is required');

        try {
            setIsSubmitting(true);
            const newLocation = await warehouseAPI.createLocation({
                ...formData,
                business_id: business.id
            });
            toast.success('Storage location created');
            onSave(newLocation);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to create location');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 sm:space-y-6 sm:pt-4">
            <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Location Name *</Label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="e.g. Main Warehouse, Shop Floor"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={cn(MOBILE_INPUT_CLASS, 'pl-10 font-medium')}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Address / Description</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Optional location details..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className={cn(MOBILE_INPUT_CLASS, 'pl-10 font-medium')}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Location Type</Label>
                    <select
                        className={cn(MOBILE_INPUT_CLASS, 'w-full border bg-white px-3 py-2 font-bold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500')}
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="warehouse">Main Warehouse / Godown</option>
                        <option value="retail">Retail Shop / Counter</option>
                        <option value="secondary">Back Store / Storage</option>
                        <option value="production">Production Unit</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-2 pt-2 sm:gap-3 sm:pt-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className={cn(MOBILE_BTN_SECONDARY, 'flex-1 font-bold text-gray-500 hover:bg-gray-100')}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(MOBILE_BTN_PRIMARY, 'flex-1 bg-emerald-600 font-bold text-white shadow-lg hover:bg-emerald-700')}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Location
                </Button>
            </div>

            <p className="text-[10px] text-center text-gray-400 font-medium italic">
                Inventory will be tracked at this specific location
            </p>
        </form>
    );
}
