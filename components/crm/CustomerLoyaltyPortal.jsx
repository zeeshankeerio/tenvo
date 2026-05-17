'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Star, Gift, Trophy, TrendingUp, CreditCard, Clock,
    ChevronRight, Sparkles, Crown, Shield, Zap, Award,
    ShoppingBag, ArrowUpRight, ArrowDownRight, Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TIERS = [
    { id: 'bronze', name: 'Bronze', minPoints: 0, icon: Shield, color: 'from-orange-700 to-amber-600', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { id: 'silver', name: 'Silver', minPoints: 500, icon: Star, color: 'from-gray-500 to-slate-400', textColor: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
    { id: 'gold', name: 'Gold', minPoints: 2000, icon: Crown, color: 'from-yellow-500 to-amber-400', textColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { id: 'platinum', name: 'Platinum', minPoints: 5000, icon: Sparkles, color: 'from-brand-primary to-brand-primary-dark', textColor: 'text-brand-primary', bgColor: 'bg-brand-50', borderColor: 'border-brand-100' },
];

const DEMO_REWARDS = [
    { id: 'rw1', name: '10% Off Next Order', points: 200, icon: Percent, category: 'discount' },
    { id: 'rw2', name: 'Free Delivery', points: 150, icon: ShoppingBag, category: 'perk' },
    { id: 'rw3', name: 'Rs. 500 Gift Card', points: 500, icon: Gift, category: 'gift' },
    { id: 'rw4', name: 'Priority Support', points: 300, icon: Zap, category: 'perk' },
    { id: 'rw5', name: 'Rs. 1000 Cashback', points: 1000, icon: CreditCard, category: 'cashback' },
    { id: 'rw6', name: 'Exclusive Access', points: 2000, icon: Crown, category: 'vip' },
];

const DEMO_TRANSACTIONS = [
    { id: 't1', type: 'earn', points: 120, description: 'Purchase -- Invoice #4521', date: '2026-02-20', total: 6000 },
    { id: 't2', type: 'earn', points: 85, description: 'Purchase -- Invoice #4518', date: '2026-02-18', total: 4250 },
    { id: 't3', type: 'redeem', points: -200, description: 'Redeemed -- 10% Off Coupon', date: '2026-02-15' },
    { id: 't4', type: 'earn', points: 250, description: 'Purchase -- Invoice #4501', date: '2026-02-10', total: 12500 },
    { id: 't5', type: 'earn', points: 60, description: 'Referral Bonus -- Ahmed K.', date: '2026-02-08' },
    { id: 't6', type: 'redeem', points: -150, description: 'Redeemed -- Free Delivery', date: '2026-02-05' },
    { id: 't7', type: 'earn', points: 180, description: 'Purchase -- Invoice #4490', date: '2026-02-01', total: 9000 },
];

export function CustomerLoyaltyPortal({ businessId, currency = 'Rs.' }) {
    const [selectedTab, setSelectedTab] = useState('overview'); // overview | rewards | history

    // Demo data
    const totalPoints = 1345;
    const lifetimePoints = 2895;
    const thisMonthEarned = 435;
    const redeemed = 350;

    const currentTier = useMemo(() => {
        return [...TIERS].reverse().find(t => lifetimePoints >= t.minPoints) || TIERS[0];
    }, [lifetimePoints]);

    const nextTier = useMemo(() => {
        const idx = TIERS.findIndex(t => t.id === currentTier.id);
        return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
    }, [currentTier]);

    const progressToNext = nextTier
        ? Math.min(100, ((lifetimePoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100)
        : 100;

    const TierIcon = currentTier.icon;

    return (
        <div className="space-y-6">
            {/* Hero Card -- Points Balance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl p-6 text-white"
                style={{ background: 'linear-gradient(135deg, #1738A5 0%, #2F5BFF 50%, #5F82FF 100%)' }}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-white/60 font-medium">Available Points</p>
                            <h2 className="text-5xl font-black mt-1 tracking-tight">{totalPoints.toLocaleString()}</h2>
                            <p className="text-sm text-white/50 mt-1">
                                Lifetime: {lifetimePoints.toLocaleString()} pts
                            </p>
                        </div>
                        <div className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20'
                        )}>
                            <TierIcon className="w-5 h-5" />
                            <span className="text-sm font-bold">{currentTier.name} Tier</span>
                        </div>
                    </div>

                    {/* Tier Progress */}
                    {nextTier && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                                <span>{currentTier.name}</span>
                                <span>{nextTier.name} -- {nextTier.minPoints - lifetimePoints} pts to go</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressToNext}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full bg-white/80 rounded-full"
                                />
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        {[
                            { label: 'This Month', value: `+${thisMonthEarned}`, icon: TrendingUp, sub: 'Earned' },
                            { label: 'Redeemed', value: redeemed, icon: Gift, sub: 'All time' },
                            { label: 'Transactions', value: DEMO_TRANSACTIONS.length, icon: CreditCard, sub: 'Recent' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <stat.icon className="w-3.5 h-3.5 text-white/50" />
                                    <span className="text-[10px] text-white/50 font-medium">{stat.label}</span>
                                </div>
                                <p className="text-lg font-black mt-1">{stat.value}</p>
                                <p className="text-[10px] text-white/40">{stat.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'overview', label: 'Overview', icon: Trophy },
                    { key: 'rewards', label: 'Rewards Catalog', icon: Gift },
                    { key: 'history', label: 'Transaction History', icon: Clock },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSelectedTab(tab.key)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all',
                            selectedTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview */}
            {selectedTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tier Progression */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold">Tier Progression</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {TIERS.map((tier, idx) => {
                                    const isActive = tier.id === currentTier.id;
                                    const isAchieved = lifetimePoints >= tier.minPoints;
                                    return (
                                        <div
                                            key={tier.id}
                                            className={cn(
                                                'flex items-center gap-3 p-3 rounded-xl transition-all',
                                                isActive ? `${tier.bgColor} ${tier.borderColor} border-2` : isAchieved ? 'bg-gray-50' : 'opacity-50'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                                                tier.color
                                            )}>
                                                <tier.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('text-sm font-bold', isActive ? tier.textColor : 'text-gray-700')}>
                                                        {tier.name}
                                                    </span>
                                                    {isActive && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-full text-brand-primary">
                                                            CURRENT
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {tier.minPoints === 0 ? 'Starting tier' : `${tier.minPoints.toLocaleString()} lifetime pts`}
                                                </p>
                                            </div>
                                            {isAchieved && (
                                                <Award className={cn('w-5 h-5', isActive ? tier.textColor : 'text-gray-300')} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {DEMO_TRANSACTIONS.slice(0, 5).map(tx => (
                                    <div key={tx.id}
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className={cn(
                                            'w-8 h-8 rounded-lg flex items-center justify-center',
                                            tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                        )}>
                                            {tx.type === 'earn'
                                                ? <ArrowUpRight className="w-4 h-4" />
                                                : <ArrowDownRight className="w-4 h-4" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{tx.description}</p>
                                            <p className="text-[10px] text-gray-400">{tx.date}</p>
                                        </div>
                                        <span className={cn(
                                            'text-sm font-black',
                                            tx.type === 'earn' ? 'text-emerald-600' : 'text-orange-600'
                                        )}>
                                            {tx.points > 0 ? '+' : ''}{tx.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Rewards Catalog */}
            {selectedTab === 'rewards' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DEMO_REWARDS.map(reward => {
                        const canRedeem = totalPoints >= reward.points;
                        return (
                            <motion.div
                                key={reward.id}
                                whileHover={{ y: -4 }}
                                className={cn(
                                    'group p-4 rounded-2xl border-2 transition-all',
                                    canRedeem
                                        ? 'bg-white border-gray-100 hover:border-brand-100 hover:shadow-lg'
                                        : 'bg-gray-50 border-gray-100 opacity-60'
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={cn(
                                        'w-12 h-12 rounded-xl flex items-center justify-center',
                                        canRedeem ? 'bg-brand-50 text-brand-primary' : 'bg-gray-100 text-gray-400'
                                    )}>
                                        <reward.icon className="w-6 h-6" />
                                    </div>
                                    <span className={cn(
                                        'text-xs font-black px-2.5 py-1 rounded-full',
                                        canRedeem ? 'bg-brand-100 text-brand-primary-dark' : 'bg-gray-200 text-gray-500'
                                    )}>
                                        {reward.points} pts
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 mt-3">{reward.name}</h4>
                                <p className="text-xs text-gray-400 mt-1 capitalize">{reward.category}</p>
                                <Button
                                    disabled={!canRedeem}
                                    className={cn(
                                        'w-full mt-4 h-9 text-xs font-bold rounded-xl',
                                        canRedeem
                                            ? 'bg-brand-primary hover:bg-brand-primary-dark'
                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    )}
                                >
                                    {canRedeem ? 'Redeem Now' : `Need ${reward.points - totalPoints} more pts`}
                                </Button>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Transaction History */}
            {selectedTab === 'history' && (
                <Card className="border-none shadow-sm">
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {DEMO_TRANSACTIONS.map(tx => (
                                <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center',
                                        tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                    )}>
                                        {tx.type === 'earn'
                                            ? <ArrowUpRight className="w-5 h-5" />
                                            : <ArrowDownRight className="w-5 h-5" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{tx.description}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                                    </div>
                                    {tx.total && (
                                        <span className="text-xs text-gray-400 font-medium">{currency} {tx.total.toLocaleString()}</span>
                                    )}
                                    <span className={cn(
                                        'text-sm font-black min-w-[60px] text-right',
                                        tx.type === 'earn' ? 'text-emerald-600' : 'text-orange-600'
                                    )}>
                                        {tx.points > 0 ? '+' : ''}{tx.points}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

