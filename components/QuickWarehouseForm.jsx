'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { warehouseAPI } from '@/lib/api/warehouse';
import { useBusiness } from '@/lib/context/BusinessContext';
import { Loader2, Building2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

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
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Location Name *</Label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="e.g. Main Warehouse, Shop Floor"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-11 pl-10 rounded-xl border-gray-200 focus:ring-blue-500 font-medium"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Address / Description</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Optional location details..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="h-11 pl-10 rounded-xl border-gray-200 focus:ring-blue-500 font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Location Type</Label>
                    <select
                        className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
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

            <div className="flex gap-3 pt-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1 h-11 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-11 rounded-xl font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
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
