'use client';

import { useMemo } from 'react';
import { Clock, RotateCcw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';

/**
 * SmartInvoiceSuggestions Component
 * Shows recently completed transactions for quick repeat billing
 * Perfect for recurring deliveries, subscriptions, regularly ordered items
 */
export function SmartInvoiceSuggestions({
    recentTransactions = [],
    onSelectSuggestion,
    currency = 'PKR',
    maxSuggestions = 5,
}) {
    // Group by customer  and item patterns
    const suggestions = useMemo(() => {
        // Find most recent transactions
        const sorted = [...(recentTransactions || [])]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20);

        // Find patterns (same customer + similar items)
        const patterns = {};
        sorted.forEach(inv => {
            const key = inv.customer?.id || inv.customer_id;
            if (!key) return;

            if (!patterns[key]) {
                patterns[key] = {
                    customerId: key,
                    customerName: inv.customer?.name || 'Unknown',
                    totalAmount: 0,
                    count: 0,
                    lastDate: inv.date,
                    itemSummary: {},
                };
            }

            patterns[key].totalAmount += Number(inv.grand_total || 0);
            patterns[key].count += 1;

            // Track item types
            inv.items?.forEach(item => {
                const itemKey = item.product_id;
                if (!patterns[key].itemSummary[itemKey]) {
                    patterns[key].itemSummary[itemKey] = {
                        name: item.name,
                        quantity: 0,
                        price: item.unit_price,
                    };
                }
                patterns[key].itemSummary[itemKey].quantity += item.quantity;
            });
        });

        // Score patterns by frequency and recency
        return Object.values(patterns)
            .filter(p => p.count >= 2) // Only recurring (2+ transactions)
            .sort((a, b) => b.count - a.count)
            .slice(0, maxSuggestions)
            .map(p => ({
                ...p,
                averageAmount: Math.round(p.totalAmount / p.count),
                items: Object.values(p.itemSummary),
                daysSinceLast: Math.floor((Date.now() - new Date(p.lastDate)) / (1000 * 60 * 60 * 24)),
            }));
    }, [recentTransactions, maxSuggestions]);

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <Card className="border-orange-100 bg-orange-50/50">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-sm font-bold">Repeat Orders</CardTitle>
                </div>
                <CardDescription className="text-xs">
                    Quick-repeat for regular customers (1 click) -- {suggestions.length} patterns found
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                    <button
                        key={suggestion.customerId}
                        onClick={() => onSelectSuggestion?.(suggestion)}
                        className="w-full text-left p-3 bg-white border border-orange-100 rounded-lg hover:border-orange-400 hover:bg-orange-50/50 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div className="font-semibold text-sm text-gray-900 group-hover:text-orange-700">
                                {suggestion.customerName}
                            </div>
                            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                                ×{suggestion.count}
                            </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1 mb-2">
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {suggestion.daysSinceLast}d ago * Avg: {formatCurrency(suggestion.averageAmount, currency)}
                            </div>
                            {suggestion.items.length > 0 && (
                                <div className="text-gray-500">
                                    {suggestion.items.slice(0, 2).map(i => i.name).join(', ')}
                                    {suggestion.items.length > 2 && ` +${suggestion.items.length - 2} more`}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                            <span>{suggestion.items.length} items</span>
                            <span className="text-orange-600">Use Template →</span>
                        </div>
                    </button>
                ))}
            </CardContent>
        </Card>
    );
}
