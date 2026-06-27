'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/lib/context/LanguageContext';
import { translations } from '@/lib/translations';

/**
 * SerialWarrantyWidget Component
 * 
 * Dashboard widget showing serial numbers with expiring warranties
 * Displays warranty status and alerts for customer service
 * 
 * @param {Object} props
 * @param {string} props.businessId - Business ID
 * @param {Function} [props.onViewDetails] - Callback when user clicks to view details
 */
export function SerialWarrantyWidget({ businessId, onViewDetails }) {
    const [allSerials, setAllSerials] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const t = translations[language] || translations['en'] || {};

    // Fetch all serials with warranty info
    useEffect(() => {
        async function loadSerials() {
            if (!businessId) return;
            
            setLoading(true);
            try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                
                const { data, error } = await supabase
                    .from('product_serials')
                    .select(`
                        *,
                        products (
                            id,
                            name,
                            sku
                        ),
                        customers (
                            id,
                            name,
                            phone
                        )
                    `)
                    .eq('business_id', businessId)
                    .eq('status', 'sold')
                    .not('warranty_end_date', 'is', null)
                    .order('warranty_end_date', { ascending: true });

                if (error) throw error;

                // Enrich with warranty status
                const enriched = (data || []).map(serial => {
                    const daysUntilExpiry = Math.ceil(
                        (new Date(serial.warranty_end_date) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    
                    let warrantyStatus = 'active';
                    if (daysUntilExpiry < 0) warrantyStatus = 'expired';
                    else if (daysUntilExpiry <= 30) warrantyStatus = 'expiring_soon';

                    return {
                        ...serial,
                        daysUntilExpiry,
                        warrantyStatus,
                        product_name: serial.products?.name || 'Unknown',
                        product_sku: serial.products?.sku || '',
                        customer_name: serial.customers?.name || 'Unknown',
                        customer_phone: serial.customers?.phone || ''
                    };
                });

                setAllSerials(enriched);
            } catch (error) {
                console.error('Failed to load serials:', error);
            } finally {
                setLoading(false);
            }
        }

        loadSerials();
    }, [businessId]);

    // Calculate statistics
    const stats = useMemo(() => {
        const expiringSoon = allSerials.filter(s => 
            s.warrantyStatus === 'expiring_soon' && s.daysUntilExpiry >= 0
        );
        const expired = allSerials.filter(s => s.warrantyStatus === 'expired');
        const active = allSerials.filter(s => s.warrantyStatus === 'active');

        return {
            expiringSoon: expiringSoon.length,
            expired: expired.length,
            active: active.length,
            total: allSerials.length,
            topExpiring: expiringSoon.slice(0, 3),
            expiringPercentage: allSerials.length > 0 
                ? Math.round((expiringSoon.length / allSerials.length) * 100) 
                : 0
        };
    }, [allSerials]);

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
            onClick={() => onViewDetails?.('serials')}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-gray-900">
                            {t.warranty_expiring || 'Warranty Expiring'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t.serial_warranty_tracking || 'Serial warranty tracking'}
                        </CardDescription>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 shadow-inner">
                        <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Expiring Soon Alert */}
                {stats.expiringSoon > 0 && (
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-orange-600" />
                                <span className="text-xs font-bold text-orange-900">
                                    {stats.expiringSoon} {t.expiring_soon || 'Expiring Soon'}
                                </span>
                            </div>
                            <Badge className="bg-orange-600 text-white text-xs">
                                ≤30 {t.days || 'days'}
                            </Badge>
                        </div>
                        <Progress 
                            value={stats.expiringPercentage} 
                            className="h-1.5 bg-orange-100"
                        />
                    </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-green-50">
                        <div className="text-lg font-semibold text-green-600">{stats.active}</div>
                        <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide">
                            {t.active || 'Active'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-orange-50">
                        <div className="text-lg font-semibold text-orange-600">{stats.expiringSoon}</div>
                        <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                            {t.expiring || 'Expiring'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-lg font-semibold text-gray-600">{stats.expired}</div>
                        <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                            {t.expired || 'Expired'}
                        </div>
                    </div>
                </div>

                {/* Top Expiring Serials */}
                {stats.topExpiring.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {t.next_to_expire || 'Next to Expire'}
                        </div>
                        {stats.topExpiring.map((serial, idx) => (
                            <div key={serial.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-900 truncate">
                                        {serial.product_name}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {serial.serial_number} * {serial.customer_name}
                                    </div>
                                </div>
                                <Badge 
                                    className={`text-xs ml-2 ${
                                        serial.daysUntilExpiry <= 7 
                                            ? 'bg-red-600 text-white' 
                                            : 'bg-orange-100 text-orange-700'
                                    }`}
                                >
                                    {serial.daysUntilExpiry}d
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Alerts */}
                {stats.expiringSoon === 0 && stats.expired === 0 && stats.active > 0 && (
                    <div className="text-center py-4">
                        <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-green-700">
                            {t.all_warranties_healthy || 'All warranties healthy'}
                        </p>
                    </div>
                )}

                {/* No Serials */}
                {stats.total === 0 && (
                    <div className="text-center py-4">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-500">
                            {t.no_serial_tracking || 'No serial tracking'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
