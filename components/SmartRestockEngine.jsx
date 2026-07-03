import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, PackagePlus, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getDomainKnowledgeForBusiness } from '@/lib/utils/businessRegionalContext';
import { useBusiness } from '@/lib/context/BusinessContext';
import toast from 'react-hot-toast';
import { createBulkPurchaseOrdersAction } from '@/lib/actions/standard/purchase';
import { getAiRestockSuggestionsAction } from '@/lib/actions/premium/ai/ai';

export const SmartRestockEngine = memo(function SmartRestockEngine({
    products = [],
    invoices = [],
    vendors = [],
    locations = [],
    category = 'retail-shop',
    businessId,
    domainKnowledge: domainKnowledgeProp,
    refreshData
}) {
    const { business } = useBusiness();
    const domainKnowledge =
        domainKnowledgeProp ?? getDomainKnowledgeForBusiness(category, business);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [useAI, setUseAI] = useState(true);
    const effectiveBusinessId = businessId || products?.[0]?.business_id || null;

    const fetchAiSuggestions = useCallback(async () => {
        if (!effectiveBusinessId) {
            setAiSuggestions([]);
            return;
        }
        try {
            const result = await getAiRestockSuggestionsAction(effectiveBusinessId);
            if (result.success) {
                setAiSuggestions(result.suggestions || []);
            } else {
                setAiSuggestions([]);
            }
        } catch (error) {
            console.error("Failed to fetch AI suggestions:", error);
            setAiSuggestions([]);
        }
    }, [effectiveBusinessId]);

    useEffect(() => {
        if (useAI) fetchAiSuggestions();
    }, [useAI, fetchAiSuggestions]);

    // Helper to get monthly sales for a product (Last 6 months)
    const getProductSalesHistory = useCallback((productId) => {
        const history = [0, 0, 0, 0, 0, 0];
        const now = new Date();

        invoices.forEach(inv => {
            const invDate = new Date(inv.date);
            const monthDiff = (now.getFullYear() - invDate.getFullYear()) * 12 + (now.getMonth() - invDate.getMonth());

            if (monthDiff >= 0 && monthDiff < 6) {
                const items = inv.items || [];
                const productItem = items.find(item => item.product_id === productId);
                if (productItem) {
                    history[5 - monthDiff] += (Number(productItem.quantity) || 0);
                }
            }
        });
        return history;
    }, [invoices]);

    // Logic to calculate restock needs (Fallback/Standard)
    const standardSuggestions = useMemo(() => {
        if (!products || (useAI && aiSuggestions.length > 0)) return [];

        // Get domain intelligence
        const intelligence = domainKnowledge?.intelligence || {};
        const defaultLeadTime = intelligence.leadTime || 7;
        const volatility = intelligence.demandVolatility || 0.1;

        return products.map(p => {
            const historicalSales = getProductSalesHistory(p.id);

            // Apply volatility factor to WMA weights if high volatility
            let weights = [0.05, 0.1, 0.15, 0.2, 0.25, 0.25];
            if (volatility > 0.5) {
                weights = [0.0, 0.05, 0.1, 0.15, 0.3, 0.4];
            }

            const wma = historicalSales.reduce((acc, val, i) => acc + (val * weights[i]), 0);
            const leadTime = p.leadTime || defaultLeadTime;

            let safetyFactor = 1.5;
            if (intelligence.perishability === 'critical') safetyFactor = 1.1;
            if (intelligence.seasonality === 'high') safetyFactor = 2.0;

            const safetyStock = Math.ceil((wma / 30) * leadTime * safetyFactor);
            const recommended = Math.ceil(wma + safetyStock);
            const threshold = recommended * 0.8;

            if (p.stock >= threshold) return null;

            return {
                ...p,
                restockAmount: Math.max(10, recommended - p.stock),
                priority: p.stock < (recommended * 0.3) ? 'High' : 'Medium',
                reason: intelligence.perishability === 'critical' ? 'Just-in-Time (Perishable)' : 'Standard Restock'
            };
        }).filter(Boolean);
    }, [products, domainKnowledge, useAI, aiSuggestions, getProductSalesHistory]);

    const restockSuggestions = useAI && aiSuggestions.length > 0 ? aiSuggestions : standardSuggestions;

    const toggleItem = useCallback((id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleBulkRestock = useCallback(async () => {
        if (!effectiveBusinessId) {
            toast.error("Business context missing for order generation");
            return;
        }

        setIsGenerating(true);
        try {
            const defaultVendorId =
                vendors.find((v) => v?.id && v?.is_active !== false)?.id || vendors[0]?.id || null;
            const defaultWarehouseId = locations.find((l) => l?.id)?.id || null;

            if (!defaultVendorId) {
                toast.error('Add at least one active vendor before generating purchase orders.');
                setIsGenerating(false);
                return;
            }

            const ordersToCreate = selectedItems.map(id => {
                const item = restockSuggestions.find(s => s.id === id);
                if (!item) return null;
                const quantity = Number(item.restockAmount || item.forecast?.forecastedQuantity || 0);
                if (quantity <= 0) return null;
                const unitCost = Number(item.cost_price ?? item.costPrice ?? 0) || Number(item.price ?? 0) || 0;
                const lineTotal = quantity * unitCost;
                return {
                    product_id: item.id,
                    quantity,
                    unit_cost: unitCost,
                    subtotal: lineTotal,
                    total_amount: lineTotal,
                    vendor_id: defaultVendorId,
                    warehouse_id: defaultWarehouseId,
                    description: `Auto-restock: ${item.reason || item.forecast?.reasoning || 'Restock'}`,
                    notes: `Generated Priority: ${item.priority || 'Medium'}`
                };
            }).filter(Boolean);

            if (ordersToCreate.length === 0) {
                toast.error('No valid restock items selected');
                setIsGenerating(false);
                return;
            }

            const result = await createBulkPurchaseOrdersAction(effectiveBusinessId, ordersToCreate);

            if (result.success) {
                toast.success(result.message);
                setSelectedItems([]);
                if (refreshData) refreshData();
            } else {
                toast.error(result.error || "Failed to generate orders");
            }
        } catch (error) {
            console.error("Bulk restock error:", error);
            toast.error("An error occurred while generating orders");
        } finally {
            setIsGenerating(false);
        }
    }, [selectedItems, restockSuggestions, effectiveBusinessId, refreshData, vendors, locations]);

    return (
        <Card className="border-wine/20 shadow-md backdrop-blur-sm bg-white/90">
            <CardHeader className="bg-gradient-to-br from-wine/10 via-wine/5 to-transparent border-b border-wine/10 rounded-t-xl py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-wine text-white rounded-xl shadow-md rotate-3 hover:rotate-0 transition-transform">
                            {useAI ? <Sparkles className="w-5 h-5 animate-pulse" /> : <BrainCircuit className="w-5 h-5" />}
                        </div>
                        <div>
                            <CardTitle className="text-wine text-2xl font-bold tracking-tight">
                                {useAI ? 'AI Predictive Restock' : 'Intelligence Restock Engine'}
                            </CardTitle>
                            <CardDescription className="text-wine/70 text-sm font-medium">
                                {useAI ? '2026 AI-driven forecasting active' : 'Domain-aware automated purchase planning'}
                            </CardDescription>
                            {!effectiveBusinessId && (
                                <p className="text-xs text-red-600 font-semibold mt-1">Business context missing: connect a business to generate orders.</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="ai-mode" checked={useAI} onCheckedChange={setUseAI} />
                            <Label htmlFor="ai-mode" className="text-xs font-bold text-wine">AI MODE</Label>
                        </div>
                        <Badge variant="secondary" className="bg-wine/10 text-wine hover:bg-wine/20 border-wine/20 px-3 py-1">
                            {restockSuggestions.length} Suggestions
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-3">
                    {restockSuggestions.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <div className="p-3 bg-green-50 rounded-full w-fit mx-auto mb-3 border border-green-100">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="font-bold text-gray-900 text-base">Inventory is healthy!</p>
                            <p className="text-sm text-gray-500 max-w-[250px] mx-auto">All stock levels are optimal based on current domain-specific demand trends.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {restockSuggestions.map((item) => (
                                <div key={item.id} className="group flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-wine/30 hover:bg-wine/5 transition-all duration-300 bg-white/50">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <Checkbox
                                                checked={selectedItems.includes(item.id)}
                                                onCheckedChange={() => toggleItem(item.id)}
                                                className="data-[state=checked]:bg-wine data-[state=checked]:border-wine h-5 w-5 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 group-hover:text-wine transition-colors">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant={item.priority === 'High' ? 'destructive' : 'secondary'} className="text-[10px] uppercase font-bold tracking-wider">
                                                    {item.priority}
                                                </Badge>
                                                <span className="text-xs text-gray-500 font-medium">Stock: {item.stock}</span>
                                            </div>
                                            {useAI && item.forecast && (
                                                <p className="text-[10px] text-blue-600 font-italic mt-1">
                                                    Confidence: {(item.forecast.confidenceScore * 100).toFixed(0)}%
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1 text-wine font-semibold text-lg">
                                            <PackagePlus className="w-4 h-4" />
                                            +{item.restockAmount || item.forecast?.forecastedQuantity}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Order Recommendation</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
            {restockSuggestions.length > 0 && (
                <CardFooter className="bg-wine/[0.02] border-t border-wine/5 p-4">
                    <Button
                        className="w-full font-semibold h-10 shadow-md shadow-wine/20 rounded-xl group bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={selectedItems.length === 0 || isGenerating || !effectiveBusinessId}
                        onClick={handleBulkRestock}
                    >
                        {isGenerating ? "Generating..." : `Create ${selectedItems.length} Smart Purchase Orders`}
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
});
