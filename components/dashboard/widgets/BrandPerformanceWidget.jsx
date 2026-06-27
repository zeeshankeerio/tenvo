'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * BrandPerformanceWidget Component
 * 
 * Dashboard widget showing brand performance metrics
 * Displays top brands by revenue with sales count and growth
 */
export function BrandPerformanceWidget({ businessId, currency = 'PKR', onViewDetails }) {
    const [brandData, setBrandData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language] || translations['en'] || {};

    useEffect(() => {
        async function loadBrandData() {
            if (!businessId) return;
            setLoading(true);
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                const { data: products, error } = await supabase
                    .from('products')
                    .select('id, name, custom_fields, selling_price')
                    .eq('business_id', businessId);

                if (error) throw error;

                const brandMap = new Map();
                (products || []).forEach(product => {
                    const brand = product.custom_fields?.brand || 'Unknown';
                    if (!brandMap.has(brand)) {
                        brandMap.set(brand, { name: brand, revenue: 0, count: 0 });
                    }
                    const brandInfo = brandMap.get(brand);
                    brandInfo.revenue += parseFloat(product.selling_price || 0);
                    brandInfo.count += 1;
                });

                const topBrands = Array.from(brandMap.values())
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);

                const totalRevenue = topBrands.reduce((sum, b) => sum + b.revenue, 0);

                setBrandData({ topBrands, totalRevenue });
            } catch (error) {
                console.error('Failed to load brand data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadBrandData();
    }, [businessId]);

    if (loading) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                </CardHeader>
                <CardContent>
                    <div className="h-8 bg-gray-200 rounded animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    if (!brandData || brandData.topBrands.length === 0) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-gray-500">{t.brand_performance || 'Brand Performance'}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <p className="text-xs text-gray-500">{t.no_brand_data || 'No brand data available'}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-card border-none hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails?.('brands')}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">{t.brand_performance || 'Brand Performance'}</CardTitle>
                        <CardDescription className="text-xs">{t.top_brands_by_revenue || 'Top brands by revenue'}</CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-yellow-50 border border-yellow-200 shadow-inner">
                        <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                    <div className="text-xs font-bold text-yellow-900 mb-1">{t.total_brand_value || 'Total Brand Value'}</div>
                    <div className="text-2xl font-semibold text-yellow-900">{formatCurrency(brandData.totalRevenue, currency)}</div>
                </div>

                <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t.top_brands || 'Top Brands'}</div>
                    {brandData.topBrands.map((brand, idx) => {
                        const percentage = brandData.totalRevenue > 0 ? Math.round((brand.revenue / brandData.totalRevenue) * 100) : 0;
                        return (
                            <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-gray-900 truncate">{brand.name}</div>
                                        <div className="text-[10px] text-gray-500">{brand.count} {t.products || 'products'}</div>
                                    </div>
                                    <div className="text-xs font-bold text-yellow-600 ml-2">{percentage}%</div>
                                </div>
                                <Progress value={percentage} className="h-1.5 bg-yellow-100" />
                                <div className="text-[10px] font-medium text-gray-600">{formatCurrency(brand.revenue, currency)}</div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
