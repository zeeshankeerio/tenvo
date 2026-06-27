/**
 * Stats Cards - Client Island Component
 * Interactive stats cards with hover effects and animations
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, type CurrencyCode } from '@/lib/currency';
import { TrendingUp, Package, Users, DollarSign, ShoppingCart, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardsProps {
    stats: {
        totalRevenue: number;
        grossRevenue: number;
        totalOrders: number;
        totalProducts: number;
        totalCustomers: number;
        lowStockCount: number;
    };
    currency?: CurrencyCode;
    onQuickAction?: (actionId: string) => void;
}

export function StatsCards({ stats, currency = 'PKR', onQuickAction }: StatsCardsProps) {
    const cards = [
        {
            title: 'Paid Revenue',
            value: formatCurrency(stats.totalRevenue, currency),
            icon: DollarSign,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-500/10',
            action: 'sales',
            trend: '+12.5%'
        },
        {
            title: 'Gross Revenue',
            value: formatCurrency(stats.grossRevenue, currency),
            icon: TrendingUp,
            color: 'text-brand-primary',
            bgColor: 'bg-brand-50',
            action: 'analytics',
            trend: '+8.2%'
        },
        {
            title: 'Total Orders',
            value: stats.totalOrders.toString(),
            icon: ShoppingCart,
            color: 'text-brand-primary',
            bgColor: 'bg-brand-50',
            action: 'invoices',
            trend: '+4.1%'
        },
        {
            title: 'Active Inventory',
            value: stats.totalProducts.toString(),
            icon: Package,
            color: 'text-amber-600',
            bgColor: 'bg-amber-500/10',
            action: 'inventory'
        },
        {
            title: 'Total Customers',
            value: stats.totalCustomers.toString(),
            icon: Users,
            color: 'text-brand-primary-dark',
            bgColor: 'bg-brand-50',
            action: 'customers'
        },
        {
            title: 'Stock Alerts',
            value: stats.lowStockCount.toString(),
            icon: AlertTriangle,
            color: 'text-rose-600',
            bgColor: 'bg-rose-500/10',
            alert: stats.lowStockCount > 0,
            action: 'inventory'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {cards.map((card, index) => (
                <motion.div
                    key={card.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    whileHover={{ y: -2 }}
                    className="h-full"
                >
                    <Card
                        className={`h-full group hover:shadow-md transition-all cursor-pointer border-primary/5 bg-white/60 backdrop-blur-md hover:bg-white/90 ${card.alert ? 'border-rose-200 bg-rose-50/50' : ''}`}
                        onClick={() => onQuickAction?.(card.action)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                            <CardTitle className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                {card.title}
                            </CardTitle>
                            <div className={`p-1.5 rounded-md ${card.bgColor} transition-transform group-hover:scale-110`}>
                                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="text-lg font-semibold tracking-tight">{card.value}</div>
                            {card.trend && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <span className="text-emerald-600 font-bold">{card.trend}</span>
                                    <span>↑</span>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
