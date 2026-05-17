'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

/**
 * CostingMethodSelector Component
 * 
 * Allows businesses to select their inventory costing method
 * Supports FIFO, LIFO, and WAC (Weighted Average Cost)
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} props.currentMethod - Current costing method
 * @param {Function} props.onUpdate - Callback after update
 */
export function CostingMethodSelector({ businessId, currentMethod = 'FIFO', onUpdate }) {
    const [selectedMethod, setSelectedMethod] = useState(currentMethod);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const costingMethods = [
        {
            value: 'FIFO',
            label: 'FIFO (First In, First Out)',
            icon: TrendingUp,
            description: 'Oldest inventory is sold first. Best for perishable goods and inflation periods.',
            pros: [
                'Matches physical flow of goods',
                'Higher profits during inflation',
                'Better for perishable items',
                'FBR compliant in Pakistan'
            ],
            cons: [
                'Higher tax liability during inflation',
                'May not reflect current costs'
            ],
            color: 'bg-green-500',
            recommended: true
        },
        {
            value: 'LIFO',
            label: 'LIFO (Last In, First Out)',
            icon: Calculator,
            description: 'Newest inventory is sold first. Better matches current costs with revenue.',
            pros: [
                'Lower tax liability during inflation',
                'Matches current costs with revenue',
                'Better for non-perishable goods'
            ],
            cons: [
                'Not allowed in some countries',
                'May understate inventory value',
                'Complex to maintain'
            ],
            color: 'bg-blue-500',
            recommended: false
        },
        {
            value: 'WAC',
            label: 'WAC (Weighted Average Cost)',
            icon: DollarSign,
            description: 'Average cost of all inventory. Simplest method with smoothed costs.',
            pros: [
                'Simple to calculate',
                'Smooths out price fluctuations',
                'Easy to understand',
                'Good for similar items'
            ],
            cons: [
                'May not reflect actual costs',
                'Less precise than FIFO/LIFO'
            ],
            color: 'bg-wine-500',
            recommended: false
        }
    ];

    const handleSave = async () => {
        if (!businessId) {
            toast.error('Business ID is required');
            return;
        }

        if (selectedMethod === currentMethod) {
            toast.info('No changes to save');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    costing_method: selectedMethod,
                    updated_at: new Date().toISOString()
                })
                .eq('id', businessId);

            if (error) throw error;

            toast.success(`Costing method updated to ${selectedMethod}`);
            onUpdate?.(selectedMethod);
        } catch (error) {
            console.error('Failed to update costing method:', error);
            toast.error('Failed to update costing method');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-wine" />
                    Inventory Costing Method
                </CardTitle>
                <CardDescription>
                    Choose how your inventory costs are calculated for COGS and valuation
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Method Selection */}
                <div className="space-y-4">
                    {costingMethods.map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedMethod === method.value;

                        return (
                            <button
                                key={method.value}
                                onClick={() => setSelectedMethod(method.value)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
                                    ? 'border-wine bg-wine/5 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${method.color} bg-opacity-10`}>
                                            <Icon className={`w-5 h-5 ${method.color.replace('bg-', 'text-')}`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-900">{method.label}</h4>
                                                {method.recommended && (
                                                    <Badge className="bg-green-500 text-white text-xs">
                                                        Recommended
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-wine flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <p className="text-xs font-semibold text-green-700 mb-2">Advantages:</p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            {method.pros.map((pro, idx) => (
                                                <li key={idx} className="flex items-start gap-1">
                                                    <span className="text-green-500 mt-0.5">“</span>
                                                    <span>{pro}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-orange-700 mb-2">Considerations:</p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            {method.cons.map((con, idx) => (
                                                <li key={idx} className="flex items-start gap-1">
                                                    <span className="text-orange-500 mt-0.5">!</span>
                                                    <span>{con}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Important Notice */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-semibold mb-1">Important:</p>
                            <ul className="space-y-1 text-blue-800">
                                <li>Changing costing method affects future transactions only</li>
                                <li>Consult with your accountant before changing methods</li>
                                <li>FIFO is recommended for most Pakistani businesses</li>
                                <li>Method change may require FBR notification</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                {selectedMethod !== currentMethod && (
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedMethod(currentMethod)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-wine hover:bg-wine/90"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

