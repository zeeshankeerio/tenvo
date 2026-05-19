'use client';

import { useState } from 'react';
import { Shield, Save, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

/**
 * ApprovalThresholdConfig Component
 * 
 * Allows businesses to configure approval threshold for stock adjustments
 * Stock adjustments exceeding this value require manager approval
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {number} props.currentThreshold - Current approval threshold amount
 * @param {Function} props.onUpdate - Callback after update
 */
export function ApprovalThresholdConfig({ businessId, currentThreshold = 10000, onUpdate }) {
    const [threshold, setThreshold] = useState(currentThreshold?.toString() || '10000');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleSave = async () => {
        if (!businessId) {
            toast.error('Business ID is required');
            return;
        }

        const thresholdValue = parseFloat(threshold);

        // Validation
        if (isNaN(thresholdValue) || thresholdValue < 0) {
            toast.error('Please enter a valid positive number');
            return;
        }

        if (thresholdValue === currentThreshold) {
            toast.info('No changes to save');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    approval_threshold_amount: thresholdValue,
                    updated_at: new Date().toISOString()
                })
                .eq('id', businessId);

            if (error) throw error;

            toast.success('Approval threshold updated successfully');
            onUpdate?.(thresholdValue);
        } catch (error) {
            console.error('Failed to update approval threshold:', error);
            toast.error('Failed to update approval threshold');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        // Allow only numbers and decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setThreshold(value);
        }
    };

    const formatThresholdDisplay = () => {
        const value = parseFloat(threshold);
        return isNaN(value) ? 'PKR 0' : formatCurrency(value, 'PKR');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-wine" />
                    Stock Adjustment Approval Threshold
                </CardTitle>
                <CardDescription>
                    Set the monetary value above which stock adjustments require manager approval
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Threshold Input */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="approvalThreshold">
                            Approval Threshold Amount (PKR)
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                PKR
                            </span>
                            <Input
                                id="approvalThreshold"
                                type="text"
                                value={threshold}
                                onChange={handleInputChange}
                                placeholder="10000"
                                className="pl-14 text-lg font-semibold"
                            />
                        </div>
                        <p className="text-sm text-gray-600">
                            Current threshold: <span className="font-bold text-wine">{formatThresholdDisplay()}</span>
                        </p>
                    </div>

                    {/* Visual Examples */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">How it works:</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-green-600 text-xs">✓</span>
                                </div>
                                <div>
                                    <p className="text-gray-700">
                                        <span className="font-semibold">Below threshold:</span> Adjustments are processed immediately
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Example: Adjustment value PKR {parseFloat(threshold || 0) > 0 ? (parseFloat(threshold) - 1000).toLocaleString() : '5,000'} → Auto-approved
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-orange-600 text-xs">!</span>
                                </div>
                                <div>
                                    <p className="text-gray-700">
                                        <span className="font-semibold">Above threshold:</span> Requires manager approval
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Example: Adjustment value PKR {parseFloat(threshold || 0) > 0 ? (parseFloat(threshold) + 5000).toLocaleString() : '15,000'} → Pending approval
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calculation Info */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-900">
                                <p className="font-semibold mb-2">Adjustment Value Calculation:</p>
                                <div className="space-y-1 text-blue-800">
                                    <p>Adjustment Value = Quantity Change × Product Cost Price</p>
                                    <p className="text-xs mt-2">
                                        Example: If you adjust stock by 50 units of a product with cost price PKR 200, 
                                        the adjustment value is PKR 10,000 (50 × 200)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Best Practices */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-900">
                                <p className="font-semibold mb-2">Best Practices:</p>
                                <ul className="space-y-1 text-amber-800 list-disc list-inside">
                                    <li>Set threshold based on your business size and risk tolerance</li>
                                    <li>Typical range: PKR 5,000 - PKR 50,000</li>
                                    <li>Lower threshold = More approvals (higher control)</li>
                                    <li>Higher threshold = Fewer approvals (faster operations)</li>
                                    <li>Review and adjust quarterly based on business needs</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                {parseFloat(threshold) !== currentThreshold && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setThreshold(currentThreshold?.toString() || '10000')}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className=" bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Saving...' : 'Save Threshold'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
