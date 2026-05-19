'use client';

import { useState, useEffect } from 'react';
import { Shield, Save, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PakistaniTaxService } from '@/lib/services/PakistaniTaxService';
import { formatCurrency } from '@/lib/currency';
import toast from 'react-hot-toast';

/**
 * Pakistani Tax Configuration Panel
 * FBR/NTN compliance, Sales Tax, Withholding Tax
 */
export function PakistaniTaxConfig({ businessId, onConfigSaved }) {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    const [formData, setFormData] = useState({
        ntnNumber: '',
        srnNumber: '',
        filerStatus: 'Non-Filer',
        salesTaxRate: '17.00',
        provincialTaxRate: '0.00',
        withholdingTaxApplicable: false,
        withholdingTaxRate: '0.00',
        withholdingTaxCategory: '',
        gstNumber: '',
        gstRate: '0.00'
    });

    // Tax calculation preview
    const [previewAmount, setPreviewAmount] = useState('10000');
    const [taxPreview, setTaxPreview] = useState(null);

    useEffect(() => {
        loadConfig();
    }, [businessId]);

    useEffect(() => {
        // Update preview when form changes
        calculatePreview();
    }, [formData, previewAmount]);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await PakistaniTaxService.getTaxConfig(businessId);

            if (data) {
                setConfig(data);
                setFormData({
                    ntnNumber: data.ntn_number || '',
                    srnNumber: data.srn_number || '',
                    filerStatus: data.filer_status || 'Non-Filer',
                    salesTaxRate: data.sales_tax_rate?.toString() || '17.00',
                    provincialTaxRate: data.provincial_tax_rate?.toString() || '0.00',
                    withholdingTaxApplicable: data.withholding_tax_applicable || false,
                    withholdingTaxRate: data.withholding_tax_rate?.toString() || '0.00',
                    withholdingTaxCategory: data.withholding_tax_category || '',
                    gstNumber: data.gst_number || '',
                    gstRate: data.gst_rate?.toString() || '0.00'
                });
            }
        } catch (error) {
            console.error('Load tax config error:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculatePreview = () => {
        const amount = parseFloat(previewAmount) || 0;
        const taxConfig = {
            sales_tax_rate: parseFloat(formData.salesTaxRate) || 0,
            provincial_tax_rate: parseFloat(formData.provincialTaxRate) || 0,
            withholding_tax_applicable: formData.withholdingTaxApplicable,
            withholding_tax_rate: parseFloat(formData.withholdingTaxRate) || 0,
            filer_status: formData.filerStatus
        };

        const preview = PakistaniTaxService.calculateTotalTax(amount, taxConfig);
        setTaxPreview(preview);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate NTN format
        if (formData.ntnNumber && !PakistaniTaxService.validateNTN(formData.ntnNumber)) {
            toast.error('Invalid NTN format. Use format: 1234567-8');
            return;
        }

        try {
            setLoading(true);

            await PakistaniTaxService.configureTax({
                businessId,
                ntnNumber: formData.ntnNumber || null,
                srnNumber: formData.srnNumber || null,
                filerStatus: formData.filerStatus,
                salesTaxRate: parseFloat(formData.salesTaxRate),
                provincialTaxRate: parseFloat(formData.provincialTaxRate),
                withholdingTaxApplicable: formData.withholdingTaxApplicable,
                withholdingTaxRate: parseFloat(formData.withholdingTaxRate),
                withholdingTaxCategory: formData.withholdingTaxCategory || null,
                gstNumber: formData.gstNumber || null,
                gstRate: parseFloat(formData.gstRate) || null
            });

            toast.success('Tax configuration saved successfully');
            setHasChanges(false);
            loadConfig();
            onConfigSaved?.();

        } catch (error) {
            console.error('Save tax config error:', error);
            toast.error(error.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        setHasChanges(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Pakistani Tax Configuration</h3>
                    <p className="text-sm text-gray-600">FBR compliance and tax settings</p>
                </div>
                {config && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Configured
                    </Badge>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* FBR Registration Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-wine" />
                            FBR Registration Details
                        </CardTitle>
                        <CardDescription>
                            Federal Board of Revenue (FBR) registration information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="ntnNumber">
                                    NTN (National Tax Number)
                                    <span className="text-xs text-gray-500 ml-2">Format: 1234567-8</span>
                                </Label>
                                <Input
                                    id="ntnNumber"
                                    value={formData.ntnNumber}
                                    onChange={(e) => handleChange('ntnNumber', e.target.value)}
                                    placeholder="1234567-8"
                                    className="font-mono"
                                />
                                {formData.ntnNumber && !PakistaniTaxService.validateNTN(formData.ntnNumber) && (
                                    <p className="text-xs text-red-600 mt-1">Invalid NTN format</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="srnNumber">
                                    SRN (Sales Tax Registration Number)
                                </Label>
                                <Input
                                    id="srnNumber"
                                    value={formData.srnNumber}
                                    onChange={(e) => handleChange('srnNumber', e.target.value)}
                                    placeholder="SRN-123456"
                                    className="font-mono"
                                />
                            </div>

                            <div>
                                <Label htmlFor="filerStatus">Filer Status</Label>
                                <select
                                    id="filerStatus"
                                    value={formData.filerStatus}
                                    onChange={(e) => handleChange('filerStatus', e.target.value)}
                                    className="w-full h-10 px-3 border rounded-md"
                                >
                                    <option value="Filer">Filer</option>
                                    <option value="Non-Filer">Non-Filer</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.filerStatus === 'Filer'
                                        ? 'Standard tax rates apply'
                                        : 'Higher tax rates may apply for non-filers'}
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="gstNumber">
                                    GST Number (Optional)
                                </Label>
                                <Input
                                    id="gstNumber"
                                    value={formData.gstNumber}
                                    onChange={(e) => handleChange('gstNumber', e.target.value)}
                                    placeholder="GST-123456"
                                    className="font-mono"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tax Rates Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tax Rates</CardTitle>
                        <CardDescription>
                            Configure sales tax, provincial tax, and withholding tax rates
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="salesTaxRate">
                                    Federal Sales Tax Rate (%)
                                    <Badge variant="secondary" className="ml-2">Standard: 17%</Badge>
                                </Label>
                                <Input
                                    id="salesTaxRate"
                                    type="number"
                                    step="0.01"
                                    value={formData.salesTaxRate}
                                    onChange={(e) => handleChange('salesTaxRate', e.target.value)}
                                    placeholder="17.00"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Standard rate in Pakistan is 17%
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="provincialTaxRate">
                                    Provincial Sales Tax (%)
                                </Label>
                                <Input
                                    id="provincialTaxRate"
                                    type="number"
                                    step="0.01"
                                    value={formData.provincialTaxRate}
                                    onChange={(e) => handleChange('provincialTaxRate', e.target.value)}
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Additional provincial tax if applicable
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="gstRate">
                                    GST Rate (%) - Optional
                                </Label>
                                <Input
                                    id="gstRate"
                                    type="number"
                                    step="0.01"
                                    value={formData.gstRate}
                                    onChange={(e) => handleChange('gstRate', e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Withholding Tax */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="withholdingTaxApplicable"
                                    checked={formData.withholdingTaxApplicable}
                                    onChange={(e) => handleChange('withholdingTaxApplicable', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="withholdingTaxApplicable" className="cursor-pointer">
                                    Enable Withholding Tax (WHT)
                                </Label>
                            </div>

                            {formData.withholdingTaxApplicable && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                                    <div>
                                        <Label htmlFor="withholdingTaxRate">
                                            Withholding Tax Rate (%)
                                        </Label>
                                        <Input
                                            id="withholdingTaxRate"
                                            type="number"
                                            step="0.01"
                                            value={formData.withholdingTaxRate}
                                            onChange={(e) => handleChange('withholdingTaxRate', e.target.value)}
                                            placeholder="1.50"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="withholdingTaxCategory">
                                            WHT Category
                                        </Label>
                                        <select
                                            id="withholdingTaxCategory"
                                            value={formData.withholdingTaxCategory}
                                            onChange={(e) => handleChange('withholdingTaxCategory', e.target.value)}
                                            className="w-full h-10 px-3 border rounded-md"
                                        >
                                            <option value="">Select category</option>
                                            <option value="Goods">Goods</option>
                                            <option value="Services">Services</option>
                                            <option value="Contracts">Contracts</option>
                                            <option value="Commission">Commission</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Tax Calculation Preview */}
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                            <FileText className="w-5 h-5" />
                            Tax Calculation Preview
                        </CardTitle>
                        <CardDescription className="text-blue-700">
                            See how taxes will be calculated with current settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="previewAmount">Invoice Amount (PKR)</Label>
                            <Input
                                id="previewAmount"
                                type="number"
                                step="0.01"
                                value={previewAmount}
                                onChange={(e) => setPreviewAmount(e.target.value)}
                                placeholder="10000"
                                className="bg-white"
                            />
                        </div>

                        {taxPreview && (
                            <div className="bg-white rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-semibold">{formatCurrency(taxPreview.breakdown.subtotal, 'PKR')}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                        Sales Tax ({taxPreview.breakdown.salesTaxRate}%):
                                    </span>
                                    <span className="font-semibold text-blue-600">
                                        +{formatCurrency(taxPreview.salesTax, 'PKR')}
                                    </span>
                                </div>

                                {taxPreview.provincialTax > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            Provincial Tax ({taxPreview.breakdown.provincialTaxRate}%):
                                        </span>
                                        <span className="font-semibold text-blue-600">
                                            +{formatCurrency(taxPreview.provincialTax, 'PKR')}
                                        </span>
                                    </div>
                                )}

                                {taxPreview.withholdingTax > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            Withholding Tax ({taxPreview.breakdown.withholdingTaxRate}%):
                                        </span>
                                        <span className="font-semibold text-red-600">
                                            -{formatCurrency(taxPreview.withholdingTax, 'PKR')}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t pt-2 mt-2">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-900">Net Amount:</span>
                                        <span className="font-bold text-lg text-wine">
                                            {formatCurrency(taxPreview.netAmount, 'PKR')}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-500 mt-2">
                                    Filer Status: {taxPreview.breakdown.filerStatus}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Important Notes */}
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <CardTitle className="text-orange-900">Important Notes</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="text-sm text-orange-800 space-y-2">
                        <ul className="list-disc list-inside space-y-1">
                            <li>Ensure your NTN and SRN are valid and active with FBR</li>
                            <li>Standard sales tax rate in Pakistan is 17%</li>
                            <li>Non-filers may be subject to higher withholding tax rates</li>
                            <li>Provincial tax rates vary by province and product category</li>
                            <li>Consult with a tax professional for specific requirements</li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end gap-2">
                    <Button
                        type="submit"
                        disabled={loading || !hasChanges}
                        className=" bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
