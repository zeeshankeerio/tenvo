'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Calendar, Package, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBatchTracking } from '@/lib/hooks/useBatchTracking';
import { formatCurrency } from '@/lib/currency';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * BatchExpiryWidget Component
 * 
 * Dashboard widget showing batches expiring soon with FEFO alerts
 * Displays critical (7 days), warning (30 days), and caution (90 days) batches
 * 
 * Features:
 * - Intelligent empty states
 * - Click to view details
 * - Real-time expiry calculations
 * - Multi-language support
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {string} [props.currency] - Currency code
 * @param {Function} [props.onViewDetails] - Callback when user clicks to view details
 */
export function BatchExpiryWidget({ businessId, currency = 'PKR', onViewDetails }) {
    const [allBatches, setAllBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language] || translations['en'] || {};

    // Fetch all batches across all products
    useEffect(() => {
        async function loadBatches() {
            if (!businessId) return;
            
            setLoading(true);
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                const { data, error } = await supabase
                    .from('product_batches')
                    .select(`
                        *,
                        products (
                            id,
                            name,
                            sku
                        ),
                        warehouses (
                            id,
                            name
                        )
                    `)
                    .eq('business_id', businessId)
                    .eq('status', 'active')
                    .not('expiry_date', 'is', null)
                    .order('expiry_date', { ascending: true });

                if (error) throw error;

                // Enrich with expiry status
                const enriched = (data || []).map(batch => {
                    const daysUntilExpiry = Math.ceil(
                        (new Date(batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    
                    let expiryStatus = 'healthy';
                    if (daysUntilExpiry < 0) expiryStatus = 'expired';
                    else if (daysUntilExpiry <= 7) expiryStatus = 'critical';
                    else if (daysUntilExpiry <= 30) expiryStatus = 'warning';
                    else if (daysUntilExpiry <= 90) expiryStatus = 'caution';

                    return {
                        ...batch,
                        daysUntilExpiry,
                        expiryStatus,
                        product_name: batch.products?.name || 'Unknown',
                        product_sku: batch.products?.sku || '',
                        warehouse_name: batch.warehouses?.name || 'Unknown'
                    };
                });

                setAllBatches(enriched);
            } catch (error) {
                console.error('Failed to load batches:', error);
            } finally {
                setLoading(false);
            }
        }

        loadBatches();
    }, [businessId]);

    // Calculate statistics
    const stats = useMemo(() => {
        const critical = allBatches.filter(b => b.expiryStatus === 'critical' && b.daysUntilExpiry >= 0);
        const warning = allBatches.filter(b => b.expiryStatus === 'warning');
        const caution = allBatches.filter(b => b.expiryStatus === 'caution');
        const expired = allBatches.filter(b => b.expiryStatus === 'expired');

        const criticalValue = critical.reduce((sum, b) => 
            sum + (parseFloat(b.quantity || 0) * parseFloat(b.cost_price || 0)), 0
        );

        return {
            critical: critical.length,
            warning: warning.length,
            caution: caution.length,
            expired: expired.length,
            criticalValue,
            topExpiring: critical.slice(0, 3)
        };
    }, [allBatches]);

    if (loading) {
        return (
            <Card className="glass-card border-none">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                        <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card 
            className="glass-card border-none hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onViewDetails?.('batches')}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">
                            {t.batch_expiry || 'Batch Expiry Alerts'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t.fefo_tracking || 'FEFO tracking & alerts'}
                        </CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-200 shadow-inner">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Critical Alert */}
                {stats.critical > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-xs font-bold text-red-900">
                                    {stats.critical} {t.critical_batches || 'Critical Batches'}
                                </span>
                            </div>
                            <Badge className="bg-red-600 text-white text-xs">
                                ≤7 {t.days || 'days'}
                            </Badge>
                        </div>
                        <p className="text-xs text-red-700 font-medium">
                            {t.value || 'Value'}: {formatCurrency(stats.criticalValue, currency)}
                        </p>
                    </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-orange-50">
                        <div className="text-lg font-black text-orange-600">{stats.warning}</div>
                        <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                            30 {t.days || 'Days'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-yellow-50">
                        <div className="text-lg font-black text-yellow-600">{stats.caution}</div>
                        <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">
                            90 {t.days || 'Days'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-lg font-black text-gray-600">{stats.expired}</div>
                        <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                            {t.expired || 'Expired'}
                        </div>
                    </div>
                </div>

                {/* Top Expiring Batches */}
                {stats.topExpiring.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {t.next_to_expire || 'Next to Expire'}
                        </div>
                        {stats.topExpiring.map((batch, idx) => (
                            <div key={batch.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-900 truncate">
                                        {batch.product_name}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {batch.batch_number} * {batch.warehouse_name}
                                    </div>
                                </div>
                                <Badge 
                                    className={`text-xs ml-2 ${
                                        batch.daysUntilExpiry <= 3 
                                            ? 'bg-red-600 text-white' 
                                            : 'bg-orange-100 text-orange-700'
                                    }`}
                                >
                                    {batch.daysUntilExpiry}d
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Alerts */}
                {stats.critical === 0 && stats.warning === 0 && stats.caution === 0 && (
                    <div className="text-center py-4">
                        <Package className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-green-700">
                            {t.all_batches_healthy || 'All batches healthy'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
